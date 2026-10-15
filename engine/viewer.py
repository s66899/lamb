# -*- coding: utf-8 -*-
"""程序内查看器 —— 3D / PDF / 表格,全部在 exe 里直接看。

**只看,不能改**(本人明确要求)。所以这里:
  * 表格用 `ttk.Treeview`(本来就是只读的),不给任何编辑绑定
  * PDF 只渲染,没有导出/另存按钮
  * 3D 只转网格,没有改模型的入口
  * 想用 CAD/Excel/Acrobat 深加工,点「用本地软件打开」跳出去

为什么不用浏览器:
  本人要求「不要浏览器第三方跳转」。HTML 看板要靠浏览器内核才能跑,
  exe 里嵌一个 WebView 既是浏览器又要额外带运行时,
  所以**看板和交付物都改用原生 Tk 控件画**,不经过任何浏览器。
"""
from __future__ import annotations

import gc
import os
import queue
import subprocess
import sys
import threading
import time
import traceback
from pathlib import Path

import tkinter as tk
from tkinter import messagebox, ttk

from . import mesh3d, paths

try:
    import theme as T
    BG, CARD, LINE, FG, FG2, FG3 = T.BG, T.CARD, T.LINE, T.FG, T.FG2, T.FG3
    ACC, ACC_HI, ACC_DIM = T.ACC, T.ACC_HI, T.ACC_DIM
    OK, WARN, BAD = T.OK, T.WARN, T.BAD
    OK_DIM, WARN_DIM = T.OK_DIM, T.WARN_DIM
except Exception:                       # 没 theme 也能跑(测试里常见)
    BG = "#0A0C10"; CARD = "#151A22"; LINE = "#242C38"
    FG = "#F2F5F9"; FG2 = "#CBD5E1"; FG3 = "#94A3B8"
    ACC = "#0A84FF"; ACC_HI = "#3D9BFF"; ACC_DIM = "#17304A"
    OK, WARN, BAD = "#30D158", "#FF9F0A", "#FF453A"
    OK_DIM, WARN_DIM = "#13301C", "#33260F"

MESH_EXT = mesh3d.MESH_EXT
STEP_EXT = mesh3d.STEP_EXT
PDF_EXT = (".pdf",)
XLSX_EXT = (".xlsx", ".xlsm")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp")

# 程序内能看 / 只能跳外部,分开列出来 —— 本人要知道每个文件点「程序内」会怎样
NATIVE = set(MESH_EXT) | set(STEP_EXT) | set(PDF_EXT) | set(XLSX_EXT) | set(IMAGE_EXT)


def kind_of(path: Path) -> str:
    e = Path(path).suffix.lower()
    if e in STEP_EXT or e in MESH_EXT:
        return "3d"
    if e in PDF_EXT:
        return "pdf"
    if e in XLSX_EXT:
        return "table"
    if e in IMAGE_EXT:
        return "image"
    return "unknown"


def open_external(path: Path) -> tuple:
    """用系统关联程序打开。返回 (成功?, 说明)。失败必须说清楚。"""
    p = Path(path)
    if not p.is_file():
        return False, f"文件不在了:{p}"
    try:
        if os.name == "nt":
            os.startfile(str(p))            # noqa: S606
        elif sys.platform == "darwin":
            subprocess.run(["open", str(p)], check=False)
        else:
            subprocess.run(["xdg-open", str(p)], check=False)
        return True, "已交给系统默认程序"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


# ================================================================ PhotoImage 登记处
# ★★ 这是整个模块里最容易踩、也最难查的一处 Tk 线程陷阱,务必读完:
#
#   `ImageTk.PhotoImage.__del__` 里有一句
#       self.__photo.tk.call("image", "delete", name)
#   ——**析构时要调 Tk**。
#
#   而 PhotoImage 是**循环垃圾**(它 -> Tk 解释器 -> root -> 子控件 -> 回到它),
#   什么时候被回收由分代 GC 决定,**在哪个线程触发就在哪个线程 __del__**。
#   一旦在后台线程里被回收,那句 tk.call 就永远阻塞:
#   Tcl 在等主线程泵事件循环,而那个线程正卡在等它。
#
#   实测表现:后台的加载线程**无声无息地挂死**(还占着 CPU 0%),
#   界面永远停在「正在打开…」,不报错、不弹窗、日志里什么都没有。
#   连开几个窗之后必现,而且卡在哪个线程每次都不一样 ——
#   本以为是加载慢,实际是上一批窗口留下的 PhotoImage 恰好被这次 GC 收走。
#
#   修法:给每个 PhotoImage 一份**进程级强引用**。强引用住它就永远不是垃圾,
#   也就永远不会在后台线程里被 finalise。
#   释放改在 `destroy()` 里**主线程**显式做(先 delete 再摘引用),
#   所以不会变成「只增不减」的泄漏。
_PHOTOS = []
# `_PHOTOS` 会被后台线程读、被主线程改 -> 用锁保护,免得遍历时被打断
_PHOTOS_LOCK = threading.Lock()


# ================================================================ 后台线程的 GC 防护
# ★★ 第二个同类的 Tk 陷阱(和上面的 PhotoImage 一个病根):
#
#   任何 **Tk 对象的 `__del__`** 里都要调 Tcl(`tk.call`)。
#   而 Python 的**分代垃圾回收在哪个线程触发,就在哪个线程里跑 finalizer**。
#   一旦在后台线程里回收到一个 Tk 对象,那句 tk.call 就**永远阻塞** ——
#   Tcl 在等主线程泵事件循环,而主线程正卡在等这个后台任务。
#
#   实测踩到的:`Viewer` 的 `status = tk.StringVar(...)`。
#   窗口关掉后它成了循环垃圾;下一轮打开表格窗时,后台线程正好在
#   openpyxl 解析 XML(会触发一次分代 GC)就把它收了,于是
#   **加载线程无声无息挂死**,界面永远停在「正在打开…」,
#   不报错、不弹窗、日志全空,而且**每次卡的线程都不一样**。
#   (一开始会怀疑是「打开表格慢」,其实和表格一点关系都没有。)
#
#   对策:只要还有后台任务在跑,就 `gc.disable()` 关掉**循环**回收,
#   等后台任务全没了,回主线程再 `gc.enable()` + `gc.collect()` 一次性清完。
#   这样所有 Tk 对象的 finalizer 都保证发生在主线程。
#
#   注:引用计数回收不受影响,所以「非循环」的对象仍可能在后台线程里
#   被释放 —— 那是无 `__del__` 的普通对象才安全;带 `__del__` 的
#   Tk 对象我们一律在 `destroy()` 里于主线程显式丢引用。
_BG_N = 0
_BG_DISABLED = False
_BG_LOCK = threading.Lock()


def bg_enter():
    """起后台任务前调用(主线程)。"""
    global _BG_DISABLED, _BG_N
    with _BG_LOCK:
        if _BG_N == 0 and not _BG_DISABLED:
            gc.disable()
            _BG_DISABLED = True
        _BG_N += 1


def bg_exit():
    """后台任务结束时调用(**工作线程里**)。只改计数,恢复交给主线程。"""
    global _BG_N
    with _BG_LOCK:
        if _BG_N > 0:
            _BG_N -= 1


def bg_tick_main():
    """主线程定期调用:没有后台任务了就把 GC 还回去并清一次垃圾。"""
    global _BG_DISABLED
    with _BG_LOCK:
        if _BG_N or not _BG_DISABLED:
            return
        _BG_DISABLED = False
    gc.enable()
    gc.collect()


def spawn(target):
    """起一个受保护的后台线程(自动带上 GC 防护)。"""
    bg_enter()

    def wrap():
        try:
            target()
        finally:
            bg_exit()

    threading.Thread(target=wrap, daemon=True).start()


# watchdog 挂在 **root** 上,而不是各个 Viewer 的 Toplevel 上。
# 否则「最后一个查看窗口一关」,就再没人把 GC 还回去,整个程序余生都
# 处在 `gc.disable()` 状态 —— 循环垃圾永远不清,内存只涨不掉。
_WATCHDOG_ON = set()


def ensure_bg_watchdog(root):
    """在 root 上挂一条周期 tick:后台任务清空后把 GC 还回去。"""
    try:
        key = str(root)
        if key in _WATCHDOG_ON:
            return
        _WATCHDOG_ON.add(key)
    except Exception:
        return

    def tick():
        try:
            bg_tick_main()
        except Exception:
            pass
        try:
            if root.winfo_exists():
                root.after(200, tick)
            else:
                _WATCHDOG_ON.discard(key)
        except Exception:
            _WATCHDOG_ON.discard(key)

    try:
        root.after(200, tick)
    except Exception:
        _WATCHDOG_ON.discard(key)


def new_photo(pil):
    """建一个受管的 PhotoImage(登记进 `_PHOTOS`,不立刻析构)。"""
    from PIL import ImageTk
    ph = ImageTk.PhotoImage(pil)
    with _PHOTOS_LOCK:
        _PHOTOS.append(ph)
    return ph


def drop_photo(ph):
    """**在主线程**里释放一个 PhotoImage:先让 Tk 删图,再摘引用。"""
    if ph is None:
        return
    with _PHOTOS_LOCK:
        try:
            _PHOTOS.remove(ph)
        except ValueError:
            pass
    try:
        ph.__del__()                 # 真正通知 Tk 删除图像
    except Exception:
        pass
    # 局部变量放开后引用计数归零;若 __del__ 已被上面调用过,这里是无害的二次调用
    del ph


# ================================================================ 主窗口
class Viewer(tk.Toplevel):
    """一个文件一个窗口。传进来的 path 决定用哪种查看器。"""

    def __init__(self, master, path, title=None, on_error=None):
        super().__init__(master)
        self.path = Path(path)
        self.kind = kind_of(self.path)
        self.on_error = on_error
        # 所有 PhotoImage 放这个列表,关窗时在**主线程**里逐个释放
        # (see new_photo / drop_photo 的说明:背景线程 GC 掉 PhotoImage 会卡死)
        self._imgs = []
        # 渲染/取结果的循环靠 after 反复排程,窗口关掉后那些回调还会来。
        # 不置这个标志的话,回调里 `self.winfo_exists()` 会对已销毁的
        # Toplevel 抛 TclError,而它是在 Tk 事件循环里执行的 ——
        # **能把整个程序带崩**,而且窗口已经关了、什么提示都没有。
        self._alive = True
        self._qmsg = queue.Queue()          # 工作线程 -> 主线程 的进度消息
        self.title(title or f"查看 — {self.path.name}")
        self.configure(bg=BG)
        self.geometry("1080x760+160+90")
        self.minsize(720, 520)
        self._build()
        self.after(40, self._drainmsg)        # 进度消息泵(全程在主线程跑)
        # GC 的 watchdog 挂在 root 上,保证「关掉最后一个查看窗」之后
        # 仍然有人把 GC 还回去(见 ensure_bg_watchdog 的说明)。
        try:
            ensure_bg_watchdog(self.master)
        except Exception:
            pass
        self._load_async()

    def destroy(self):
        """先掐掉渲染循环,再在**主线程**里释放资源,然后销毁。"""
        self._alive = False
        # 先叫停常驻渲染线程。它正在渲染时 self.cv / self._r 就要被拆掉了,
        # 留着不管不会立刻崩,但会算出一张没人要的图再白占一次 CPU。
        # 用 Event 而不是线程的 is_alive / join —— join 会**卡住主线程**
        # 等一整帧(~100ms),关窗会明显一顿。
        _ev = getattr(self, "_r3d_stop", None)
        if _ev is not None:
            try:
                _ev.set()
            except Exception:
                pass
        # ★ PhotoImage 必须在主线程释放:它的 `__del__` 要调 Tk
        #   ("image delete"),在后台线程里就是死锁 —— 见 new_photo 的说明。
        #   这里本来就是在主线程(Tk 的 destroy 回调),位置刚好。
        for ph in getattr(self, "_imgs", []):
            drop_photo(ph)
        self._imgs = []
        # StringVar 的 `__del__` 也要调 Tk。在**主线程**里显式丢引用,
        # 不让它去等分代 GC。否则它可能在后台线程被回收 → 那个线程卡死。
        sv = getattr(self, "status", None)
        if sv is not None:
            self.status = None
            del sv
        # pdfium 的 PdfDocument 持有 C++ 侧内存,靠 Python GC 回收的顺序
        # 不可靠(页对象可能还指着它)。显式关掉,别赌。
        #
        # ★ 但**必须先拿到渲染那把锁**,否则后台线程可能正拿着
        #   FPDF_BITMAP 在用这块内存,这里一 close 就是堆损坏。
        #   拿不到锁就不关 —— 宁可交给 GC,也不能在渲染中途 free。
        doc = getattr(self, "_doc", None)
        lock = getattr(self, "_pdf_lock", None)
        if doc is not None:
            got = False
            try:
                got = lock.acquire(timeout=5.0) if lock else True
            except Exception:
                got = False
            if got:
                try:
                    doc.close()
                except Exception:
                    pass
                self._doc = None
            if got and lock:
                try:
                    lock.release()
                except Exception:
                    pass
        try:
            super().destroy()
        except Exception:
            pass

    def _ok(self) -> bool:
        """窗口还能安全操作吗。

        渲染回调是 `after` 反复排程的,窗口随时可能已经关了。
        连 `winfo_exists()` 本身都可能抛(Tk 已回收该控件),
        所以这一步也要包起来 —— 在 Tk 事件循环里抛出的异常会
        **中断整个事件循环**,表现是「窗口看着正常,点哪儿都没反应」。
        """
        if not getattr(self, "_alive", False):
            return False
        try:
            return bool(self.winfo_exists())
        except Exception:
            return False

    # ---------------- 界面骨架 ----------------
    def _toolbar(self, parent, items, hint=""):
        """一行工具条,**窄窗口自动收紧**,保证每个按钮都完整可见。

        以前每个查看器各 pack 各 的,窗口一窄右边就被切掉一截 ——
        「适应窗口 / 放大 / PDF 下一页」这些正好在右边,
        表现是「点不到 / 看不全」,而窗口本身是能拖宽的,
        所以没人会觉得是布局问题。

        做法:按可用宽度三级降档(正常 → 收紧内边距并缩小字号 → 收起提示语),
        再不够就隐藏文件名后缀。**永远不裁按钮**。
        """
        bar = tk.Frame(parent, bg=BG)
        bar.pack(fill="x", pady=(0, 8))
        labels = []
        for it in items:
            txt, fn = it[0], it[1]
            tip = it[2] if len(it) > 2 else ""
            b = tk.Label(bar, text=txt, bg=sheet_bg(), fg=FG2, bd=0,
                         padx=11, pady=5, cursor="hand2",
                         font=("Microsoft YaHei", 10))
            b.pack(side="left", padx=(0, 6))
            b.bind("<Button-1>", lambda e, f=fn: f())
            if tip:
                b.bind("<Enter>", lambda e, t=tip: self.status.set(t))
                b.bind("<Leave>",
                       lambda e: self.status.set(getattr(self, "_hint0", "")))
            labels.append(b)
        hint_lbl = None
        if hint:
            hint_lbl = tk.Label(bar, text=hint, bg=BG, fg=FG3,
                                font=("Microsoft YaHei", 9))
            hint_lbl.pack(side="right")

        def fit(_e=None):
            w = bar.winfo_width() or parent.winfo_width() or 900
            need = sum(l.winfo_reqwidth() for l in labels)
            if need + 80 <= w:
                px, fs = 11, 10
            elif need + 40 <= w:
                px, fs = 6, 9
            else:
                px, fs = 4, 9
            for l in labels:
                l.configure(padx=px, font=("Microsoft YaHei", fs))
            if hint_lbl is not None:
                need2 = sum(l.winfo_reqwidth() for l in labels)
                hint_lbl.configure(text=hint if need2 + 300 <= w else "")
        self._toolbar_fits = getattr(self, "_toolbar_fits", [])
        self._toolbar_fits.append(fit)
        bar.bind("<Configure>", fit)
        bar.after(60, fit)
        return bar

    def _build(self):
        top = tk.Frame(self, bg=CARD, height=46)
        top.pack(fill="x", side="top")
        top.pack_propagate(False)
        self._name_lbl = tk.Label(top, text=self.path.name, bg=CARD, fg=FG,
                                  font=("Microsoft YaHei", 12, "bold"))
        self._name_lbl.pack(side="left", padx=14)
        self._sub_lbl = tk.Label(top, text=self._sub(), bg=CARD, fg=FG3,
                                 font=("Microsoft YaHei", 9))
        self._sub_lbl.pack(side="left")
        tk.Label(top, text="只读查看", bg=WARN_DIM, fg=WARN,
                 font=("Microsoft YaHei", 9)).pack(side="left", padx=12)

        btns = tk.Frame(top, bg=CARD)
        btns.pack(side="right", padx=12)
        top_btns = []
        for txt, fn in (("用本地软件打开", self.act_external),
                        ("复制路径", self.act_copy),
                        ("刷新", self._load_async)):
            b = tk.Label(btns, text=txt, bg=sheet_bg(), fg=FG2, bd=0,
                         padx=12, pady=6, cursor="hand2",
                         font=("Microsoft YaHei", 10))
            b.pack(side="left", padx=4)
            b.bind("<Button-1>", lambda e, f=fn: f())
            top_btns.append(b)

        def top_fit(_e=None):
            """窗口窄了就先藏文件名后缀,再收紧右上角按钮 —— 保证按钮全在。"""
            w = top.winfo_width() or 900
            need = sum(b.winfo_reqwidth() for b in top_btns)
            left = self._name_lbl.winfo_reqwidth() + 40
            self._sub_lbl.configure(
                text=self._sub() if left + need + 260 <= w else "")
            px = 12 if need + left + 200 <= w else 5
            for b in top_btns:
                b.configure(padx=px)
        top.bind("<Configure>", top_fit)
        top.after(80, top_fit)

        self.body = tk.Frame(self, bg=BG)
        self.body.pack(fill="both", expand=True, padx=10, pady=10)
        self.status = tk.StringVar(value="正在打开…")
        tk.Label(self, textvariable=self.status, bg=BG, fg=FG3,
                 font=("Microsoft YaHei", 9), anchor="w").pack(
            fill="x", padx=14, pady=(0, 6))

    def _sub(self) -> str:
        try:
            n = self.path.stat().st_size
            sz = f"{n/1048576:.1f} MB" if n >= 1048576 else f"{n/1024:.0f} KB"
        except OSError:
            sz = "?"
        return f"{self.path.suffix.lower()}  ·  {sz}  ·  {self.path.parent.name}"

    def act_external(self):
        ok, msg = open_external(self.path)
        if not ok:
            messagebox.showerror("打不开", f"{self.path}\n\n{msg}")

    def act_copy(self):
        try:
            self.clipboard_clear()
            self.clipboard_append(str(self.path))
            self.status.set(f"已复制路径:{self.path}")
        except Exception as e:
            messagebox.showerror("复制失败", str(e))

    # ---------------- 后台加载 ----------------
    def _load_async(self):
        for c in self.body.winfo_children():
            c.destroy()
        # 代次标记:连点「刷新」会起多个线程,老线程可能后完成,
        # 把**上一次的**结果覆盖到界面上(比如换了个文件却显示旧的)。
        # 线程只认自己那代的标记,认不上就自己丢掉结果,不去抢界面。
        self._gen = getattr(self, "_gen", 0) + 1
        gen = self._gen
        self._done = None
        spawn(lambda: self._load(gen))
        self.after(60, self._poll)

    def _set_done(self, gen, payload):
        """只有当前代的结果才准进界面。"""
        if getattr(self, "_gen", 0) == gen:
            self._done = payload

    def _poll(self):
        d = getattr(self, "_done", None)
        if d is None:
            if self._ok():
                self.after(80, self._poll)
            return
        self._done = None
        if not self._ok():
            return
        if d.get("error"):
            self._fail(d["error"])
            return
        try:
            getattr(self, f"_view_{d['kind']}")(**d.get("kw", {}))
        except Exception as e:
            self._fail(f"{type(e).__name__}: {e}\n{traceback.format_exc(limit=3)}")

    def _fail(self, msg):
        for c in self.body.winfo_children():
            c.destroy()
        tk.Label(self.body, text="这个文件打不开", bg=BG, fg=BAD,
                 font=("Microsoft YaHei", 15, "bold")).pack(pady=(60, 6))
        tk.Label(self.body, text=msg, bg=BG, fg=FG3, justify="left",
                 wraplength=760, font=("Consolas", 9)).pack(padx=60)
        t = tk.Label(self.body, text="也可以点右上角「用本地软件打开」",
                     bg=BG, fg=FG2, font=("Microsoft YaHei", 10))
        t.pack(pady=14)
        t.bind("<Button-1>", lambda e: self.act_external())
        t.configure(cursor="hand2")
        self.status.set("打开失败")

    def _load(self, gen=None):
        if gen is None:
            gen = getattr(self, "_gen", 0)
        try:
            k = self.kind
            if k == "3d":
                tris, info = load_3d(self.path, self._say)
                self._set_done(gen, {"kind": "3d",
                                     "kw": {"tris": tris, "info": info}})
            elif k == "pdf":
                doc, info = load_pdf(self.path, self._say)
                self._set_done(gen, {"kind": "pdf",
                                     "kw": {"doc": doc, "info": info}})
            elif k == "table":
                # 数据放 self,不塞进 kw —— `load_table` 返回的 dict 里有
                # 一个 "title"(表头行),而 _poll 是把 kw **展开**传给
                # _view_table 的,于是 `title` 变成了关键字参数 ->
                # 「unexpected keyword argument 'title'」。
                # (这个 bug 是靠失败提示页直接报出来的才定位到,
                #   那页要是静默吞掉,就只能看到「表格窗是空的」。)
                self._tdata = load_table(self.path)
                self._set_done(gen, {"kind": "table", "kw": {}})
            elif k == "image":
                self._set_done(gen, {"kind": "image",
                                     "kw": {"p": str(self.path.resolve())}})
            else:
                self._set_done(gen, {
                    "error":
                    f"这个类型程序内看不了:{self.path.suffix}\n"
                    "点右上角「用本地软件打开」用本地软件看。"})
        except Exception as e:
            self._set_done(gen, {"error": f"{type(e).__name__}: {e}"})

    def _say(self, m):
        """工作线程报进度 —— 只能**往队列里丢**,不能碰 Tk。

        ★ 之前这里是 `self.after(0, lambda: self.status.set(m))`。
        `after` 不是线程安全的:Tk 的事件队列只在主线程被泵动,
        从工作线程调它,轻则状态栏永远不更新,重则抛
        `RuntimeError: main thread is not in main loop`。
        而且这个 except 一包,异常就**彻底消失**了 ——
        转换 STEP 失败时状态栏停在「正在打开…」,像卡死一样。
        """
        try:
            self._qmsg.put_nowait(str(m))
        except Exception:
            pass

    def _drainmsg(self):
        """主线程侧:把进度消息刷到状态栏。"""
        if not hasattr(self, "_qmsg") or not self._ok():
            return
        changed = False
        while True:
            try:
                self.status.set(self._qmsg.get_nowait())
                changed = True
            except queue.Empty:
                break
            except Exception:
                break
        del changed
        # 没了后台任务就把 GC 还回去,并在主线程把积压的循环垃圾清掉
        bg_tick_main()
        self.after(40, self._drainmsg)

    # ================================ 3D
    def _view_3d(self, tris, info):
        import numpy as np
        from PIL import Image, ImageTk
        self._r = mesh3d.Raster(np.asarray(tris, dtype=np.float32))
        self._np = np
        self._Image = Image
        self._ImageTk = ImageTk

        # 「适应窗口 / 放大 / 缩小」必须有**按钮**。
        # 只有滚轮一条路时,没有滚轮的设备(某些触摸板、遥控鼠标)
        # 就等于完全不能缩放 —— 本人说「不能放大」指的就是这个。
        self._hint0 = f"3D 预览 · {info.get('src','?')}  三角面 {len(tris):,}"
        self._toolbar(self.body, (
            ("复位", self._r3d_reset, "回到默认斜视角并摆满窗口"),
            ("适应窗口", self._r3d_fit, "按当前视角重新摆满"),
            ("＋", lambda: self._r3d_zoom(1 / 1.25), "放大"),
            ("－", lambda: self._r3d_zoom(1.25), "缩小"),
            ("俯视", lambda: self._r3d_set(0.0, 0.0), "从上看"),
            ("前视", lambda: self._r3d_set(0.0, 1.5708), "正面"),
            ("侧视", lambda: self._r3d_set(1.5708, 0.0), "侧面"),
        ), hint="左键拖动旋转 · 滚轮缩放 · 右键拖动平移")

        self.cv = tk.Canvas(self.body, bg="#101B2B", highlightthickness=0,
                            bd=0)
        self.cv.pack(fill="both", expand=True)
        self.cv.bind("<Configure>", lambda e: self._r3d_draw())
        self.cv.bind("<Button-1>", lambda e: self._drag(e, "rot"))
        self.cv.bind("<Button-3>", lambda e: self._drag(e, "pan"))
        self.cv.bind("<B2-Motion>",
                     lambda e: self._drag(e, "rot"))
        self.cv.bind("<B3-Motion>",
                     lambda e: self._drag(e, "pan"))
        self.cv.bind("<MouseWheel>", self._wheel)
        self.cv.configure(cursor="fleur")
        self._btn = None
        self._q3d = queue.Queue()
        # 渲染线程的生死信号。必须是纯 threading 的东西 ——
        # 在渲染线程里问 Tk「窗口还在吗」会死锁(见 _r3d_worker 的说明)。
        self._r3d_stop = threading.Event()
        self._r3d_ev = threading.Event()
        self._r3d_req = None
        self._r3d_thr = threading.Thread(target=self._r3d_worker, daemon=True)
        self._r3d_thr.start()
        self.after(40, self._r3d_first)
        self.after(30, self._drain3d)          # 主线程定时取渲染结果
        src = info.get("src", "?")
        n = len(tris)
        more = f"  三角面 {n:,}"
        if info.get("faces"):
            more += f"  面 {info['faces']}"
        if info.get("cached"):
            more += "  (用了缓存)"
        self.status.set(f"3D 预览 · {src}{more}")

    def _r3d_first(self):
        if not self._ok():
            return
        self._r3d_fit()
        self._r3d_draw()

    def _r3d_fit(self):
        w = max(64, self.cv.winfo_width())
        h = max(64, self.cv.winfo_height())
        self._r.fit(w, h)
        self._r3d_draw()

    def _r3d_zoom(self, f):
        """按钮放大/缩小。zoom 是倍率,夹在一个合理范围内 ——
        不夹的话连点几下就把模型缩成一个点,再点「适应窗口」才回得来,
        而那一瞬间的画面和「坏了」一模一样。"""
        if not hasattr(self, "_r"):
            return
        self._r.zoom = max(0.02, min(50.0, self._r.zoom * f))
        self._r.pan[:] = 0
        self._r3d_draw()

    def _r3d_reset(self):
        self._r.reset()
        self._r3d_fit()

    def _r3d_set(self, rx, ry):
        self._r.rx, self._r.ry = rx, ry
        self._r3d_draw()

    def _r3d_draw(self):
        """把光栅化结果贴到 Canvas。

        计算放后台线程(1 万多三角面一帧 ~100ms,主线程会卡成「未响应」),
        **但绝不能在工作线程里碰 Tk**。

        ★ `self.after()` 不是线程安全的 —— Tk 的事件队列只在主线程
        被泵动,从别的线程调它轻则丢事件、重则直接抛
        `RuntimeError: main thread is not in main loop`。
        之前就是把绘制结果用 `self.after(0, put)` 从工作线程送回来的,
          结果画布永远是空的,而异常发生在工作线程里、界面上**一点提示都没有**。
        正确做法:工作线程只往队列里丢,主线程用 `after` 定时取。

        ★★ 而且**每一次鼠标移动都 spawn 一个新线程**是不行的。
           `_drag` 在拖动时每 5~10ms 来一次事件,一帧要 ~100ms,
           于是拖到第 10 个事件时后台已经有 10 个线程在抢 CPU,
           每个都分配一张 w×h×3 的数组 —— 越拖越卡,最后**看着像完全不动**。
           本人说「3D 能看但转不动」,一半的原因在这儿。
           改成:**一个常驻渲染线程 + 一个「最新请求」槽位**。
           忙的时候后来的请求直接覆盖前面的(反正中间那些帧没人要看),
           排队长度恒等于 1,CPU 只跑一帧。
        """
        if not hasattr(self, "_r") or not self._ok():
            return
        w = max(64, self.cv.winfo_width())
        h = max(64, self.cv.winfo_height())
        tok = object()
        self._tok = tok
        # 视角在**主线程这边先快照**再交给工作线程。
        # 否则拖动时主线程正在改 rx/ry/zoom,工作线程同时在读,
        # 一帧可能用「新角度配旧缩放」,看着像渲染错乱 —— 这种
        # 「数据不对但不报错」的竞态比崩掉更难查。
        view = (self._r.rx, self._r.ry, self._r.zoom,
                float(self._r.pan[0]), float(self._r.pan[1]))
        self._r3d_req = (w, h, view, tok)      # 覆盖式:只保留最新一帧
        self._r3d_wake()

    def _r3d_worker(self):
        """常驻渲染线程。一次只算一帧,算完立刻看有没有新的。

        ★ 这个线程里**绝对不能调 `self._ok()`** —— 它内部是
        `winfo_exists()`,那是 Tk 调用,只有主线程能碰。
          在工作线程里调 Tk 的后果不是报错,是 Tcl 队列互相等死
          (和 _say 里那个 `after` 的坑同源,见文件头 PhotoImage 的说明)。
          线程的生死用一个**纯 threading 的 Event** 管,
          由主线程在 destroy() 里置位。
        """
        q, r = self._q3d, self._r
        stop, wake = self._r3d_stop, self._r3d_ev
        while not stop.is_set():
            wake.wait(0.1)
            if stop.is_set():
                break
            wake.clear()
            req = getattr(self, "_r3d_req", None)
            if req is None:
                continue
            self._r3d_req = None
            w, h, view, tok = req
            try:
                r.rx, r.ry, r.zoom = view[0], view[1], view[2]
                r.pan[0], r.pan[1] = view[3], view[4]
                img = r.render(w, h)
            except Exception:
                continue
            try:
                q.put_nowait((tok, "img", img))
            except Exception:
                pass

    def _r3d_wake(self):
        """把「有新帧」的信号递给渲染线程。线程在 _view_3d 里就起了。"""
        try:
            self._r3d_ev.set()
        except Exception:
            pass

    def _drain3d(self):
        """主线程侧:取渲染结果贴上去。"""
        if not hasattr(self, "_q3d") or not self._ok():
            return
        while True:
            try:
                tok, kind, payload = self._q3d.get_nowait()
            except queue.Empty:
                break
            if getattr(self, "_tok", None) is not tok:
                continue                      # 已经有更新的请求了,这次作废
            try:
                pil = self._Image.fromarray(payload)
                # 旧图先在主线程释放、再换新的 —— 反序就会让旧图
                # 在这一行被 GC 回收,而新图才刚贴上画布。
                if self._imgs:
                    drop_photo(self._imgs.pop())
                self._imgs.append(new_photo(pil))
                w = max(64, self.cv.winfo_width())
                h = max(64, self.cv.winfo_height())
                self.cv.delete("mesh")
                self.cv.create_image(w // 2, h // 2,
                                     image=self._imgs[-1],
                                     anchor="c", tags="mesh")
            except Exception as e:
                self.status.set(f"贴图失败:{e}")
        # ★ 必须**自续期**。原来只 after 一次,30ms 之后再也不跑了 ——
        #   第一帧恰好赶上就显示,赶不上就永远空白,而界面毫无异样。
        #   表现是「有时能看有时不能看」,最难复现的一类。
        if self._ok():
            self.after(30, self._drain3d)

    def _drag(self, e, mode):
        if not hasattr(self, "_r"):
            return
        if self._btn is None:
            self._btn = (e.x, e.y, mode)
            return
        x0, y0, m = self._btn
        dx, dy = e.x - x0, e.y - y0
        self._btn = (e.x, e.y, mode)
        if m == "pan":
            self._r.pan[0] += dx
            self._r.pan[1] += dy
        else:
            self._r.ry += dx * 0.011
            self._r.rx += dy * 0.011
        self._r3d_draw()

    def _wheel(self, e):
        if not hasattr(self, "_r"):
            return
        f = 1.12 if e.delta < 0 else (1 / 1.12)
        self._r.zoom = max(0.05, min(40.0, self._r.zoom * f))
        self._r3d_draw()

    # ================================ PDF
    def _view_pdf(self, doc, info):
        import pypdfium2 as pdfium
        from PIL import Image, ImageTk
        self._doc = doc
        self._page = 0
        self._scale = 1.0
        self._Image, self._ImageTk = Image, ImageTk
        # pdfium 侧所有操作(取页/渲染/关文档)共用这一把锁,
        # 见 _pdf_draw 的说明:并发就是 C++ use-after-free。
        self._pdf_lock = threading.RLock()

        self._pg = tk.StringVar(value=f"1 / {len(doc)}")
        self._hint0 = f"工程图 · {len(doc)} 页"
        bar = self._toolbar(self.body, (
            ("◀ 上一页", lambda: self._pdf_go(-1), "上一页"),
            ("下一页 ▶", lambda: self._pdf_go(1), "下一页"),
            ("放大", lambda: self._pdf_zoom(1.25), "放大 25%"),
            ("缩小", lambda: self._pdf_zoom(1 / 1.25), "缩小 25%"),
            ("适应宽度", self._pdf_fitw, "按窗口宽度铺满"),
            ("100%", lambda: self._pdf_set(1.0), "按 1:1 显示"),
        ), hint="滚轮上下翻页 · Ctrl+滚轮缩放 · 左键拖动平移")
        self._pg_lbl = tk.Label(bar, textvariable=self._pg, bg=BG, fg=FG3,
                                font=("Microsoft YaHei", 10))
        self._pg_lbl.pack(side="left", padx=8)

        self.cv = tk.Canvas(self.body, bg="#0B1220", highlightthickness=0, bd=0)
        self.cv.pack(fill="both", expand=True)
        self.cv.bind("<Configure>", lambda e: self._pdf_draw())
        self.cv.bind("<MouseWheel>", self._pdf_wheel)
        self.cv.bind("<ButtonPress-1>", lambda e: setattr(self, "_mx", e.x))
        self.cv.bind("<B1-Motion>", self._pdf_drag)
        self._pan = [0.0, 0.0]
        self._mx = None
        self._qpdf = queue.Queue()
        self.after(30, self._drainpdf)
        self.after(60, self._pdf_first)
        self.status.set(f"工程图 · 共 {len(doc)} 页")

    def _pdf_first(self):
        if not self._ok():
            return
        self._pdf_fitw()
        self._pdf_draw()

    def _pdf_go(self, d):
        try:
            with self._pdf_lock:
                n = len(self._doc)
        except Exception:
            n = 1
        self._page = max(0, min(n - 1, self._page + d))
        self._pan = [0.0, 0.0]
        self._pg.set(f"{self._page + 1} / {n}")
        self._pdf_draw()

    def _pdf_zoom(self, f):
        self._scale = max(0.1, min(8.0, self._scale * f))
        self._pdf_draw()

    def _pdf_set(self, s):
        self._scale = s
        self._pdf_draw()

    def _pdf_fitw(self):
        w = max(64, self.cv.winfo_width())
        # ★ 这里也是碰 pdfium(取页 + 读页宽),必须走同一把锁,
        #   否则会和后台线程的 render() 抢同一个 FPDF_DOCUMENT。
        try:
            with self._pdf_lock:
                pg = self._doc[self._page]
                pw = pg.get_width() or 800
        except Exception:
            pw = 800
        self._scale = (w - 24) / pw
        self._pan = [0.0, 0.0]
        self._pdf_draw()

    def _pdf_wheel(self, e):
        if e.state & 0x0004:               # Ctrl
            self._pdf_zoom(1.12 if e.delta < 0 else 1 / 1.12)
        else:
            self._pdf_go(1 if e.delta < 0 else -1)

    def _pdf_drag(self, e):
        if self._mx is None:
            return
        self._pan[0] += e.x - self._mx
        self._pan[1] += e.y - getattr(self, "_my", e.y)
        self._mx = e.x
        self._my = e.y
        self._pdf_draw()

    def _pdf_draw(self):
        """PDF 渲染:后台线程算,主线程贴(after 不能跨线程)。

        ★ pdfium **不是线程安全的**,而这里有两处会碰它:
          1) 后台线程 `page.render()` 拿 FPDF_BITMAP
          2) 主线程 `destroy()` 里的 `doc.close()`
        两者一旦并发就是 C++ 侧 use-after-free,结果是
        **0xC0000374 堆损坏硬崩**(无 Python 异常、无 stderr、退出码十六进制)。

        而且崩溃点必然出现在「关窗之后」,跟渲染没关系,看起来像
        「偶发的莫名其妙退出」—— 这正是之前查了半天的原因:
        单开一个 PDF 窗全过,连着开几个才炸。

        修法两件事一起做:
          a. 取页 `doc[page]` 也放进工作线程 —— 否则主线程可能已经
             把文档关了,工作线程拿着一个悬空的 PdfPage 去渲染。
          b. 用同一把锁把渲染和 close() **串行化**;关窗时拿不到锁
             就不关(宁可交给 GC,也不能在渲染中途 free)。
        """
        if not hasattr(self, "_doc") or not self._ok():
            return
        page = self._page
        s = self._scale
        tok = object()
        self._ptok = tok
        q = self._qpdf
        lock = self._pdf_lock

        def work():
            try:
                with lock:
                    doc = self._doc
                    # ★ 这里只能用 `self._alive`,**不能**用 `self._ok()`。
                    #   `_ok()` 内部调 `winfo_exists()`,那是 Tk 调用,
                    #   而这里是后台线程 —— Tk 不是线程安全的。
                    #   踩过一次:`_ok()` 返回 False 就直接 return,
                    #   PDF 窗于是永远空白,而状态栏也不报错。
                    if doc is None or not getattr(self, "_alive", False):
                        return
                    pil = render_pdf_page(doc[page], s)
            except Exception as e:
                try:
                    q.put_nowait((tok, "err", str(e)))
                except Exception:
                    pass
                return
            try:
                q.put_nowait((tok, "pil", pil))
            except Exception:
                pass

        spawn(work)
        # 像素的拷贝为何必须断开别处,见 render_pdf_page()。

    def _drainpdf(self):
        """主线程侧:把渲染好的 PDF 页贴到画布。

        整个方法都在主线程跑(是 `after` 回调),所以这里碰 Tk 是安全的;
        工作线程那边只往 `self._qpdf` 里丢 (tok, kind, payload)。

        令牌机制:连点「下一页」会连发好几次渲染,后发的不一定后到。
        用 `tok` 认领,只有**最后一次**请求的结果会被贴上去,
        否则会出现「翻到第 3 页却显示第 1 页」。
        """
        if not hasattr(self, "_qpdf") or not self._ok():
            return
        while True:
            try:
                tok, kind, payload = self._qpdf.get_nowait()
            except queue.Empty:
                break
            except Exception:
                break
            if getattr(self, "_ptok", None) is not tok:
                continue                      # 已经有更新的请求了,这次作废
            if kind == "err":
                self.status.set(f"这一页渲染失败:{payload}")
                continue
            try:
                if self._imgs:
                    drop_photo(self._imgs.pop())
                self._imgs.append(new_photo(payload))
                w = max(64, self.cv.winfo_width())
                h = max(64, self.cv.winfo_height())
                self.cv.delete("pg")
                self.cv.create_image(
                    w // 2 + int(self._pan[0]), h // 2 + int(self._pan[1]),
                    image=self._imgs[-1], anchor="c", tags="pg")
            except Exception as e:
                self.status.set(f"贴图失败:{e}")
        # ★ 必须自续期。原来只 after 一次,30ms 之后再也不跑了 ——
        #   第一帧恰好赶上就显示,赶不上就永远空白,而界面毫无异样,
        #   表现是「有时能看有时不能看」,最难复现的一类。
        if self._ok():
            self.after(30, self._drainpdf)

    def _view_table(self):
        d = self._tdata
        top = tk.Frame(self.body, bg=BG)
        top.pack(fill="x", pady=(0, 6))
        q = tk.StringVar()
        # 这个输入框只是**筛选**,不写盘、不回写源表 —— 与「只看不能改」不冲突。
        tk.Entry(top, textvariable=q, bg=CARD, fg=FG, insertbackground=FG,
                 relief="flat", font=("Microsoft YaHei", 10)
                 ).pack(side="left", fill="x", expand=True, ipady=5)
        # Treeview 本身就是**只读**控件;不给它挂任何编辑绑定。
        cols = [f"c{i}" for i in range(len(d["title"]))]
        self._head = d["title"]
        self._all = d["rows"]
        w = max(100, self.winfo_width() - 40)
        cw = max(70, int(w / max(1, len(cols))))
        tv = ttk.Treeview(self.body, columns=cols, show="headings",
                          selectmode="browse")
        for i, c in enumerate(cols):
            tv.heading(c, text=self._head[i] if i < len(self._head) else c)
            tv.column(c, width=cw, minwidth=50, stretch=(i < 3), anchor="w")
        vs = ttk.Scrollbar(self.body, orient="vertical", command=tv.yview)
        tv.configure(yscrollcommand=vs.set)
        tv.pack(side="left", fill="both", expand=True)
        vs.pack(side="right", fill="y")
        self._tv = tv
        self._fill("")
        q.trace_add("write", lambda *a: self._fill(q.get()))
        self._q = q
        self.status.set(
            f"表格(只读)· {d['sheet']} · {len(self._all)} 行 × {len(cols)} 列")

    def _fill(self, kw):
        if not hasattr(self, "_tv") or not self._ok():
            return
        tv = self._tv
        tv.delete(*tv.get_children())
        kw = (kw or "").strip().lower()
        n = 0
        for r in self._all:
            if kw and not any(kw in str(c).lower() for c in r):
                continue
            tv.insert("", "end", values=[str(c)[:400] for c in r])
            n += 1
        self.status.set(f"表格(只读)· 显示 {n} / {len(self._all)} 行"
                        + (f" · 过滤「{kw}」" if kw else ""))

    def _view_image(self, p):
        from PIL import Image, ImageTk
        im = Image.open(p)
        w0, h0 = im.size
        sc = min(1.0, 1000 / max(1, w0))
        if sc != 1.0:
            im = im.resize((int(w0 * sc), int(h0 * sc)))
        self._imgs.append(new_photo(im))
        lbl = tk.Label(self.body, bg="#0B1220", image=self._imgs[-1])
        lbl.pack(expand=True)
        self.status.set(f"图片 · {w0}×{h0}")
def sheet_bg():
    """表头/次级按钮用的底色。没有 theme 也能跑。"""
    try:
        import theme as T
        return T.SHEET
    except Exception:
        return CARD


def project_root_of(path):
    """从文件往上找项目根(有 `项目配置.json` 的那一层)。

    转发给 mesh3d —— 缓存目录/键的规则只留一份,免得两边各写一遍
    然后慢慢分叉(分叉了就会出现「A 处认为命中缓存、B 处认为过期」)。
    """
    from . import mesh3d
    return mesh3d.project_root_of(path)


def mesh_cache_dir(proj_root):
    """网格缓存目录。见 mesh3d.mesh_cache_dir 的说明。"""
    from . import mesh3d
    return mesh3d.mesh_cache_dir(proj_root)


def load_3d(path, say=None):
    """STEP / STL / OBJ / PLY -> (三角面数组, 说明)。

    STEP 先找缓存 `_网格缓存/`;没有就现转,并一定写缓存
    (STL 比 STEP 小 1~2 个数量级,实测 1.8MB STEP -> 570KB STL)。
    """
    from . import mesh3d
    p = Path(path)
    e = p.suffix.lower()
    if e in STEP_EXT:
        # div 传 0 = 用 mesh3d.PREVIEW_DIV(粗网格)。以前这里写死 60,
        # 一个上万面的零件每帧要光栅化 100ms,拖起来像卡死。
        stl, info = mesh3d.ensure_step_mesh(p, div=0, log=say)
        if stl is None:
            raise mesh3d.MeshError(info)
        return mesh3d.load_mesh(stl), {"src": "STEP", "stl": stl, **info}
    if say:
        say("读取网格…")
    t = mesh3d.load_mesh(p)
    return t, {"src": e.lstrip(".").upper(), "cached": False, "stl": None}


def load_pdf(path, say=None):
    """PDF -> pypdfium2 文档。按页现渲染,不在这里预渲染。"""
    try:
        import pypdfium2 as pdfium
    except ImportError as e:
        raise RuntimeError(
            "缺少 pypdfium2(渲染 PDF 用),程序内看不了工程图。\n"
            "点右上角「用本地软件打开」用本地软件看。\n"
            f"原始错误:{e}")
    if say:
        say("打开 PDF…")
    doc = pdfium.PdfDocument(str(path))
    return doc, {"pages": len(doc)}


def render_pdf_page(page, scale):
    """把一页安全渲染成**自有内存**的 PIL 图像。

    ★★ 这个 `.copy()` **绝对不能省**:

    pypdfium2 的 `PdfBitmap.to_pil()` 内部是
    `PIL.Image.frombuffer(..., self.buffer, ...)`,它自己的 docstring
    写着:「PIL is supposed to **share memory** with the original buffer,
    so changes to the buffer should be reflected in the image」,
    还会把 `image.readonly` 设成 False —— 等于把 pdfium 的堆内存
    直接交给 PIL 读写。

    `page.render()` 返回的 bitmap 是临时对象,`to_pil()` 一返回它就没
    引用了 -> pdfium 立刻 free 掉那块内存,PIL 图像的像素还指着它。
    后面 PhotoImage 一读,就是**读已释放的堆**。

    后果不是报错,是 0xC0000374 STATUS_HEAP_CORRUPTION 硬崩:
    无 Python 异常、无 stderr、退出码是个十六进制数。
    而且只在连开几个窗之后才炸,单开一个全过。

    抽成函数就是为了**只有这一处**碰 pdfium 的像素,
    以后谁再写渲染代码都绕不开这个坑。
    """
    bm = None
    try:
        bm = page.render(scale=float(scale))
        return bm.to_pil().copy()
    finally:
        try:
            if bm is not None:
                bm.close()
        except Exception:
            pass


def load_table(path):
    """xlsx -> 标题行 + 数据行。**只读**,不提供任何写回。"""
    from openpyxl import load_workbook
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb.active
    rows = []
    for r in ws.iter_rows(values_only=True):
        if all(v is None for v in r):
            continue
        rows.append(["" if v is None else str(v) for v in r])
    wb.close()
    return {"title": rows[0] if rows else "",
            "rows": rows[1:] if len(rows) > 1 else [],
            "sheet": Path(path).stem}
