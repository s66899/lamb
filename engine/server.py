# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 实时监听 + 本地服务(SSE 推送)。

监听策略:
  源表变动   -> 全量重建(BOM 表 + 看板)
  交付物变动 -> 增量重建(只刷看板,亚秒级)
去抖:文件大小与修改时间稳定 debounce 秒后才动手,避免复制大文件时读到半截。
推送:Server-Sent Events,看板局部感知,不用整页轮询。
"""

from __future__ import annotations

import json
import os
import queue
import socket
import threading
import time
import traceback
import webbrowser
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

from . import config as C
from . import paths


# --------------------------------------------------------------------------
# SSE 广播
# --------------------------------------------------------------------------
class Hub:
    def __init__(self):
        self._q: list = []
        self._lock = threading.Lock()

    def add(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=50)
        with self._lock:
            self._q.append(q)
        return q

    def remove(self, q):
        with self._lock:
            if q in self._q:
                self._q.remove(q)

    def send(self, payload: dict):
        msg = f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
        with self._lock:
            targets = list(self._q)
        for q in targets:
            try:
                q.put_nowait(msg)
            except queue.Full:
                pass


HUB = Hub()


# --------------------------------------------------------------------------
# 变动检测
# --------------------------------------------------------------------------
def signature(cfg, proj) -> tuple:
    """源表 + 受监控目录的指纹集合。"""
    base = Path(cfg["project"].get("baseDir") or ".")
    parts = []
    # sources **和 bomSources 都要扫**。
    # 以前只扫 sources,可「导入已完工项目」时源表全登记在 bomSources 里
    # ——于是改了 BOM 表,监听开着也检测不到,看板永远不更新。
    # 这是真 bug,不是理论风险:导入的项目 100% 落在 bomSources。
    for s in list(cfg.get("sources") or []) + list(cfg.get("bomSources") or []):
        raw = s.get("path") if isinstance(s, dict) else s
        if not raw:
            continue
        p = Path(raw)
        if not p.is_absolute():
            p = base / p
        try:
            st = p.stat()
            parts.append(("src", str(p), st.st_mtime_ns, st.st_size))
        except OSError:
            parts.append(("src", str(p), 0, 0))
    dirkey = {"step": "step", "2d": "2d", "bom": "bom", "dash": "dash"}
    for k in cfg["watch"].get("watchDirs", []):
        d = dirkey.get(k)
        if not d:
            continue
        base_dir = proj.d(d)
        if not base_dir.is_dir():
            continue
        for f in base_dir.rglob("*"):
            if f.is_file() and not f.name.startswith(("~$", ".")):
                try:
                    st = f.stat()
                    parts.append(("del", f.relative_to(proj.root).as_posix(),
                                  st.st_mtime_ns, st.st_size))
                except OSError:
                    pass
    return tuple(sorted(parts))


def is_source_change(prev, cur) -> bool:
    a = sorted(x for x in prev if x[0] == "src")
    b = sorted(x for x in cur if x[0] == "src")
    return a != b


# --------------------------------------------------------------------------
# 本地服务
# --------------------------------------------------------------------------
def free_port(start: int = 8800) -> int:
    for p in range(start, start + 60):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    return start


class Handler(SimpleHTTPRequestHandler):
    hub = HUB
    dash_name = "index.html"
    dash_url = "index.html"
    short = "/看板"

    def log_message(self, *a):        # 静音访问日志
        pass

    def handle_one_request(self):
        """吞掉「对方把连接掐了」这一类异常。

        浏览器随时会掐掉一个请求:关掉标签页、刷新、SSE 断线重连、
        图片加载到一半滚走了。这些都会在 `copyfile` 写到一半时抛
        ConnectionAbortedError / ConnectionResetError,并被 socketserver
        打印成**十几行 traceback**。

        那是正常现象,不是故障 —— 但用户看到了会以为程序坏了,也可能
        把它当成「某个功能出错」到处找。只有真正没预料到的异常才往上抛。
        """
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError,
                BrokenPipeError):
            self.close_connection = True
        except TimeoutError:
            self.close_connection = True

    def _sse(self):
        q = self.hub.add()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            hello = json.dumps({"type": "ping",
                                "at": datetime.now().strftime("%H:%M:%S")},
                               ensure_ascii=False)
            self.wfile.write(f"data: {hello}\n\n".encode())
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                except queue.Empty:
                    msg = 'data: {"type":"ping"}\n\n'
                self.wfile.write(msg.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            self.hub.remove(q)

    # 看板上的「刷新」按钮打这里。只接本机、只跑扫描+重建,
    # 不接受任何路径参数 —— 免得变成一个能在磁盘上乱跑的执行入口。
    scan_proj = None

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def do_POST(self):
        p = self.path.split("?")[0].rstrip("/")
        if p in ("/api/scan", "/api/scan/"):
            return self._api_scan()
        if p in ("/api/edit", "/api/edit/"):
            return self._api_edit()
        if p in ("/api/check", "/api/check/"):
            return self._api_check()
        if p in ("/api/open", "/api/open/"):
            return self._api_open()
        self._json({"error": "not found"}, 404)

    # 允许「用系统程序打开」的扩展名。**白名单,不是黑名单** ——
    # 新的类型出来之前一律不开,而不是默认放行再靠后缀挡。
    OPEN_EXT = (".step", ".stp", ".igs", ".iges", ".sldprt", ".x_t", ".sat",
                ".pdf", ".png", ".jpg", ".jpeg", ".stl", ".obj")

    def _api_open(self):
        """用系统关联程序打开 5_总装图 里的文件(P11)。

        浏览器拿到 .step 只会**下载**,不会交给 CAD 打开 —— 点一下
        存到下载目录,还得自己再双击一次,等于没做这个按钮。

        安全上和 /api/scan 一个思路:这个接口是能在磁盘上动手的,
        所以**只认文件名**,不接受任何路径;文件名拼出来后 resolve,
        必须落在 `5_总装图` 里面;扩展名还要在白名单里。三道都过才动手。
        """
        body = self._read_json(limit=64 * 1024)
        if body is None:
            return
        proj = getattr(self, "scan_proj", None)
        if proj is None:
            return self._json({"error": "未绑定项目"}, 400)
        name = str((body or {}).get("name", "")).strip()
        if not name or "/" in name or "\\" in name or ".." in name:
            return self._json({"error": f"文件名不合法:{name!r}"}, 400)
        if Path(name).suffix.lower() not in self.OPEN_EXT:
            return self._json({"error": f"不允许打开这种类型:{Path(name).suffix}"},
                              400)
        try:
            assy = (Path(proj.root) / paths.LAYOUT["assy"]).resolve()
            f = (assy / name).resolve()
            f.relative_to(assy)          # 越界会抛 ValueError
        except (ValueError, OSError):
            return self._json({"error": "只允许打开 5_总装图 里的文件"}, 400)
        if not f.is_file():
            return self._json({"error": f"文件不在了:{name}"}, 404)
        try:
            if os.name == "nt":
                os.startfile(str(f))          # noqa: S606
            else:
                import webbrowser
                webbrowser.open(f.as_uri())
        except Exception as e:
            return self._json({"error": f"调起系统程序失败:{e}"}, 500)
        return self._json({"ok": True, "name": f.name})

    def _read_json(self, limit=4 * 1024 * 1024):
        """读 JSON 请求体。坏输入必须报错,不能当成空体糊弄过去。"""
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except (TypeError, ValueError):
            self._json({"error": "Content-Length 不合法"}, 400)
            return None
        if n <= 0:
            self._json({"error": "空请求体"}, 400)
            return None
        if n > limit:
            # 不读走:请求体留在 socket 里,keep-alive 下下一个请求会串包。
            self.close_connection = True
            self._json({"error": f"请求体过大({n} > {limit})"}, 413)
            return None
        try:
            raw = self.rfile.read(n)
            return json.loads(raw.decode("utf-8"))
        except (OSError, UnicodeDecodeError) as e:
            self.close_connection = True
            self._json({"error": f"读请求体失败:{e}"}, 400)
            return None
        except json.JSONDecodeError as e:
            self._json({"error": f"不是合法 JSON:{e}"}, 400)
            return None

    def _api_edit(self):
        """看板在线编辑。两段式:先预览(不动盘),确认后才真写。"""
        proj = getattr(self, "scan_proj", None)
        if proj is None:
            return self._json({"error": "未绑定项目"}, 400)
        body = self._read_json()
        if body is None:
            return
        if not isinstance(body, dict):
            return self._json({"error": "请求体必须是对象"}, 400)
        edits = body.get("edits")
        confirm = bool(body.get("confirm"))
        try:
            cfg = C.with_defaults(C.load(proj))
            from engine import edit as _edit
            if not confirm:
                # 第一段:只列清单。本人要求「提交前弹窗列清单,确认后才写盘」。
                return self._json(_edit.preview_edits(cfg, proj, edits))
            # 第二段:真写。走 build_lock —— 监听进程可能正在重建同一批表,
            # 两边同时开同一个 xlsx,结果就是「表被清空」或「另存为」。
            from build_core import build_lock
            lines = []

            def lg(m):
                lines.append(str(m))

            with build_lock(proj, log=lg):
                r = _edit.apply_edits(cfg, proj, edits, log=lg)
            if not r.get("written"):
                r["note"] = "没有任何内容真的改变,未写盘"
            for m in lines:
                log(proj, m)
            self._rebuild_after_write("edit", r.get("written", 0))
            return self._json(r)
        except _edit.EditError as e:
            # 校验类的错是「本人改错了」,不是服务器故障 —— 400 + 原话,
            # 让人看得懂自己错在哪(比如哪一行的图号变了)。
            return self._json({"error": str(e)}, 400)
        except Exception as e:
            import traceback as _tb
            try:
                Path(paths.LOG_DIR / "api_edit_错误.log").write_text(
                    _tb.format_exc(), encoding="utf-8")
            except Exception:
                pass
            return self._json({"error": f"{type(e).__name__}: {e}"}, 500)

    def _api_check(self):
        """加工后核对 / 新购件核对(P14)。和 /api/edit 一样两段式。

        ★ 单独一个接口、而不是复用 /api/edit:
          /api/edit 的落盘目标是**按分类的物料表**,而且列号来自
          `cfg["extract"]`;核对表是**另一个文件、另一套列**。
          硬塞进同一个接口就得在 payload 里加一堆"写到哪张表"的分支,
          而分支一多,哪天写错分支就是**把核对结果写进物料表**——
          那是命数据,一次就毁。所以这里从 URL 上就分开。
        """
        proj = getattr(self, "scan_proj", None)
        if proj is None:
            return self._json({"error": "未绑定项目"}, 400)
        body = self._read_json()
        if body is None:
            return
        if not isinstance(body, dict):
            return self._json({"error": "请求体必须是对象"}, 400)
        edits = body.get("edits")
        confirm = bool(body.get("confirm"))
        try:
            from engine import checklist as CL
            cfg = C.with_defaults(C.load(proj))
            if not confirm:
                return self._json(CL.preview(cfg, proj, edits))
            from build_core import build_lock
            lines = []

            def lg(m):
                lines.append(str(m))

            with build_lock(proj, log=lg):
                r = CL.apply(cfg, proj, edits, log=lg)
            if not r.get("written"):
                r["note"] = "没有任何内容真的改变,未写盘"
            for m in lines:
                log(proj, m)
            self._rebuild_after_write("check", r.get("written", 0))
            return self._json(r)
        except CL.CheckError as e:
            return self._json({"error": str(e)}, 400)
        except Exception as e:
            import traceback as _tb
            try:
                Path(paths.LOG_DIR / "api_check_错误.log").write_text(
                    _tb.format_exc(), encoding="utf-8")
            except Exception:
                pass
            return self._json({"error": f"{type(e).__name__}: {e}"}, 500)

    def _rebuild_after_write(self, kind: str, n: int):
        """写盘之后**自己**把看板重出一遍,然后广播 `done`。

        ★ 为什么必须自己重建,不能靠监听器:
          `watchDirs` 里**故意没有** 2_BOM表(config.py 写得很清楚:
          「那是工具自己的输出,会触发无限重建循环」)。而核对表和
          物料表都在 2_BOM表 下 —— 于是写完之后没有任何东西会通知看板
          重新生成。以前页面上是 `setTimeout(location.reload(),600)`,
          重载回来的还是**写盘前那份快照**:数据确实存进去了,
          可看板上显示的还是旧值,表现就是「保存成功、刷新一下又变回
          原样」。这个坑不报错,最难查。

          重建只刷看板(full=False),不重生成物料表 —— 那是命数据,
          不该因为改了一格备注就整个重来一遍。
        """
        proj = getattr(self, "scan_proj", None)
        HUB.send({"type": kind, "n": n,
                  "at": datetime.now().strftime("%H:%M:%S")})
        if proj is None:
            return
        ok, err = True, ""
        try:
            from build_core import run_build
            def lg(m):
                log(proj, m, console=lambda _x: None)
            run_build(proj, log=lg, full=False, live=True)
        except Exception as e:
            ok, err = False, f"{type(e).__name__}: {e}"
            log(proj, f"[重建失败] {err}")
        # 前端只认 `done` 作为「可以重载了」的信号。
        HUB.send({"type": "done", "ok": ok, "err": err,
                  "mode": "增量(只刷看板)",
                  "at": datetime.now().strftime("%H:%M:%S")})

    def _api_scan(self):
        # 读掉请求体(即使不用也要读,否则 keep-alive 下会串包)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n:
                self.rfile.read(n)
        except (TypeError, ValueError, OSError):
            pass
        proj = getattr(self, "scan_proj", None)
        if proj is None:
            return self._json({"error": "未绑定项目"}, 400)
        # 扫描要读磁盘、可能重建,耗时可观。放到线程里,
        # 否则这段时间整个服务都拒新连接 —— 页面上的按钮看着像卡死。
        import threading as _th

        box = {}

        def job():
            wlog = getattr(self, "scan_log", None) or print
            try:
                from build_core import run_scan
                from engine import scan as _scan
                d, rebuilt = run_scan(proj, apply_change=True, log=wlog)
                box["r"] = {"any": d.get("any", False), "rebuilt": rebuilt,
                            "summary": _scan.summarize(d)}
            except Exception as e:
                import traceback as _tb
                # traceback 写文件而不是走 wlog —— wlog 本身就可能是
                # 出错的原因,再用它报错会连真正的栈一起丢掉。
                try:
                    tb = _tb.format_exc()
                    Path(paths.LOG_DIR / "api_scan_错误.log").write_text(
                        tb, encoding="utf-8")
                except Exception:
                    pass
                box["r"] = {"error": f"{type(e).__name__}: {e}"}

        t = _th.Thread(target=job, daemon=True)
        t.start()
        t.join(180)
        if "r" not in box:
            return self._json({"error": "超时"}, 504)
        return self._json(box["r"])

    def do_GET(self):
        raw = self.path.split("?")[0]
        if raw == "/events":
            return self._sse()
        # 路径先规范化再比对。中文短链接有两种到达方式:
        #   a) 程序生成 → 已经是 %E7%9C%8B%E6%9D%BF
        #   b) 地址栏手输 → 裸 UTF-8 字节
        # unquote() 只解 %XX,处理不了 (b);而 HTTP 请求行是 latin-1,
        # 裸 UTF-8 字节必须先按 latin-1 取回字节、再按 utf-8 解码。
        # 两种都不兜住的表现都是「点了打不开」—— 之前就是只做了 (a)。
        p = raw
        if "%" in raw:
            p = unquote(raw, errors="replace")
        else:
            try:
                p = unquote(raw.encode("latin-1").decode("utf-8"),
                            errors="replace")
            except (UnicodeEncodeError, UnicodeDecodeError):
                p = raw
        if p in ("/", "/index.html", self.short, "/" + self.short):
            # HTTP 头是 latin-1 编码,中文路径必须先 URL 编码,否则抛
            # UnicodeEncodeError 且响应头缓冲不会 flush,表现为「空响应」
            self.send_response(302)
            self.send_header("Location", "/" + self.dash_url)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        return super().do_GET()


def start_server(proj, port=0, open_browser=True):
    """以项目根目录为 web 根:看板在 6_看板 下,交付物可直接预览。"""
    from urllib.parse import quote
    proj.root.mkdir(parents=True, exist_ok=True)
    dash = proj.html
    rel = dash.relative_to(proj.root).as_posix()

    class H(Handler):
        pass

    H.hub = HUB
    H.dash_name = dash.name
    H.dash_url = quote(rel)          # 已经是 URL 编码后的相对路径
    # 看板「刷新」按钮要用:POST /api/scan 会扫目录并重建。
    # 只传项目对象,不接受任何外部路径 —— 否则等于开了个能在磁盘上
    # 任意跑扫描的入口。
    H.scan_proj = proj
    # log() 的签名是 log(proj, msg, console=...),要包成单参回调。
    #
    # **必须用 staticmethod 包。** 普通函数(含 lambda)赋给类属性后就是描述符,
    # `getattr(self, "scan_log")` 拿到的是**绑定方法**,调用时 Python 会把
    # self 当第一个参数自动塞进去 —— 于是「传 1 个参数」变成「传 2 个」,
    # 报 `lambda() takes 1 positional argument but 2 were given`。
    # 这个坑极具迷惑性:lambda 明明写着单参,调用处也只传了一个,
    # 光看代码根本看不出来。
    H.scan_log = staticmethod(lambda m: log(proj, m))
    # SimpleHTTPRequestHandler 默认以 CWD 为根,必须显式传 directory
    handler = partial(H, directory=str(proj.root))
    p = port or free_port()
    httpd = ThreadingHTTPServer(("127.0.0.1", p), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{p}/" + quote(rel)
    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    return httpd, p, url


# --------------------------------------------------------------------------
# 监听主循环
# --------------------------------------------------------------------------
def log(proj, msg: str, console=print):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    console(line)
    try:
        proj.logs.mkdir(parents=True, exist_ok=True)
        f = proj.logs / "更新.log"
        with f.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def watch_loop(proj, cfg, build_fn, interval=2, debounce=1.5,
               first=True, console=print):
    paths.LOG_DIR.mkdir(parents=True, exist_ok=True)
    paths.atomic_write_text(paths.PID_FILE,
                            f"{os.getpid()}\n{proj.root}\n")
    try:
        if first:
            console("首次构建…")
            build_fn(full=True, console=console)
        else:
            build_fn(full=False, console=console)
        log(proj, f"监听中 (间隔 {interval}s)  源表 {len(cfg['sources'])} 个", console)
        last = signature(cfg, proj)
        stable = last
        since = time.time()
        hist: list = []          # 最近几次重建时间戳,用于识别「重建风暴」
        # P6:暂停只喊一次,不能每轮都喊 —— 暂停一晚会刷出几千行同样的日志,
        # 真正的变动反而被埋掉。
        announced_pause = False
        while True:
            time.sleep(interval)
            cur = signature(cfg, proj)
            # ---- P6:导出定档期间不自动检测 ----
            # 标记是项目里的一个文件(见 Project.pause_file),导出时写,
            # 本人点「开始检测」时删。
            #
            # 关键:**暂停期间绝不能推进 `last`**。
            # 我一开始在这里写了 `last = signature(...)` 想「刷新基准,
            # 免得恢复时一次性补一堆」—— 结果正好相反:基准被推到了最新,
            # 于是暂停期间发生的变动**被当成没发生过,永远补不上**。
            # 而点「开始检测」本来就会补扫一次,两处叠加就等于丢数据。
            # 静默丢变动是最糟的,所以这里只 `continue`,一个基准都不动。
            # 恢复后 debounce + 「重建后刷新基准」保证只补一次,不会补成一片。
            if proj.is_paused():
                hist.clear()
                if not announced_pause:
                    info = proj.pause_info()
                    why = info.get("reason") or info.get("error") or ""
                    log(proj, f"⏸ 自动检测已暂停({why})。恢复请点「开始检测」。",
                        console)
                    announced_pause = True
                continue
            if announced_pause:
                log(proj, "▶ 自动检测已恢复,继续监听", console)
                announced_pause = False
            if cur == last:
                stable, since = cur, time.time()
                continue
            if cur != stable:
                # 指纹还在抖(文件可能正在复制/写入),继续等
                stable, since = cur, time.time()
                continue
            if time.time() - since < debounce:
                continue                      # 已稳定但还没到 debounce 时长
            # 保险:60 秒内超过 6 次就是异常(多半是工具自己的输出在触发)
            now = time.time()
            hist = [t for t in hist if now - t < 60]
            if len(hist) >= 6:
                log(proj, "⚠ 60 秒内重建 6 次以上,判定为异常循环,已暂停监听。"
                          "请检查是否有程序在反复改这些目录,或确认 watchDirs "
                          "里没有包含 2_BOM表 / 6_看板。", console)
                hist.clear()
                time.sleep(30)
                last = stable = signature(cfg, proj)
                since = time.time()
                continue
            hist.append(now)
            prev, last = last, cur
            src = is_source_change(prev, cur)
            mode = "全量(BOM表+看板)" if src else "增量(只刷看板)"
            log(proj, f"检测到变动 → 重建 {mode}", console)
            HUB.send({"type": "build", "mode": mode,
                      "at": datetime.now().strftime("%H:%M:%S")})
            try:
                build_fn(full=src, console=console)
                ok, err = True, ""
            except Exception as e:
                ok, err = False, f"{type(e).__name__}: {e}"
                log(proj, f"重建失败: {e}", console)
                console(traceback.format_exc())
            # ★ 重建**跑完**之后要再报一次。`build` 那条是开工前发的,
            #   看板页面收到它就 setTimeout(reload,700) —— 89 件零件的看板
            #   重新生成远不止 700 毫秒,于是页面读到的还是**旧文件**,
            #   表面看「保存成功、刷新一下又变回原样」,其实数据写进去了。
            #   `done` 才是「可以重载了」的信号;定时器只留作兜底。
            HUB.send({"type": "done", "ok": ok, "err": err, "mode": mode,
                      "at": datetime.now().strftime("%H:%M:%S")})
            # 关键:重建会写出新文件,必须重新取一次指纹当作新基准,
            # 否则工具自己的输出会被当成「外部变动」,形成无限重建循环。
            last = signature(cfg, proj)
            stable, since = last, time.time()
    except KeyboardInterrupt:
        log(proj, "监听已停止", console)
    finally:
        try:
            if paths.PID_FILE.is_file() and \
                    paths.PID_FILE.read_text(encoding="utf-8").split()[0] == str(os.getpid()):
                paths.PID_FILE.unlink()
        except Exception:
            pass
