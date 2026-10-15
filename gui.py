# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 图形界面。

启动先进入「欢迎页」:必须选择
    [ 添加文件夹 ]  导入已有的 BOM 表目录
    [ 新建项目  ]  从零开始建一个项目
二者之一,才能进入项目工作台。
"""

from __future__ import annotations

import os
import queue
import re
import subprocess
import sys
import threading
import time
import traceback
import webbrowser
from datetime import datetime
from pathlib import Path

try:
    import inspect
except ImportError:                      # 打包环境极少缺失,兜底即可
    inspect = None

try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
except ImportError:
    sys.exit("缺少 tkinter。标准 Python 自带,若报错请重装带 tk 的 Python。")

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from engine import config as C          # noqa: E402
from engine import core, dashboard, excel, paths, probe, server  # noqa: E402
import build_core                        # noqa: E402  构建/读取逻辑的唯一入口
import theme as T                        # noqa: E402  iOS 设计系统

# 冻结成 exe 后必须用 exe 所在目录,而不是解包出来的 _internal
APP_DIR = paths.APP_DIR

TAG = "🐑 助手工程师"
OPEN_PROJECT = None          # 由 sheep gui <项目> 设置,启动后直接进工作台

# 视觉全部来自 theme.py(iOS 设计系统)。这里保留旧名做别名,
# 是为了让下面大量既有代码不用逐个改;新代码请直接用 T.xxx。
import theme as _T
BG = _T.BG
PANEL = _T.CARD
PANEL2 = _T.CARD_HI
LINE = _T.LINE
FG = _T.FG
DIM = _T.FG2
ACC = _T.ACC
OK = _T.OK
WARN = _T.WARN
BAD = _T.BAD
FONT = _T.FONT


def _py():
    """冻结成 exe 后仍能调用本解释器跑后台监听。"""
    if getattr(sys, "frozen", False):
        return sys.executable
    return sys.executable


def _cb(parent, text, var, bg=PANEL, **kw):
    """ttk.Checkbutton 不支持 background/activebackground,统一用 tk 版。

    font 走 setdefault —— 之前这里硬编码 font= 再加 **kw,
    调用处一传 font= 就报 "got multiple values for keyword argument 'font'"
    (旧版 ImportWindow 顶部标题就是这么炸的)。
    """
    kw.setdefault("font", (FONT, 9))
    return tk.Checkbutton(parent, text=text, variable=var, bg=bg, fg=FG,
                          activebackground=bg, activeforeground=FG,
                          selectcolor=bg, anchor="w", highlightthickness=0,
                          bd=0, **kw)


def _call_on_done(fn, result=None):
    """调用收尾函数,兼容「要结果」和「不要结果」两种写法。

    大部分收尾不需要参数(刷新状态、弹提示),但「导出核对版 HTML」
    的收尾要知道导到哪儿了才能打开浏览器。以前统一按无参调用,
    结果导出跑完必崩:missing 1 required positional argument: 'out'。

    按签名判断,不用 try/except TypeError —— 后者会把收尾函数内部的
    真实 TypeError 误当成签名不匹配,然后拿错参数再跑一遍。
    """
    if fn is None:
        return
    want = 0
    if inspect is not None:
        try:
            ps = list(inspect.signature(fn).parameters.values())
            want = len([p for p in ps if p.kind in (p.POSITIONAL_ONLY,
                                                     p.POSITIONAL_OR_KEYWORD)])
            if any(p.kind == p.VAR_POSITIONAL for p in ps):
                want = 1
        except (TypeError, ValueError):
            want = 0
    fn(result) if want else fn()


def present(win, modal=True, parent=None):
    """把 Toplevel 真正显示到屏幕上。

    之前各窗口的 show() 直接 deiconify/lift/focus_force/grab_set 一路走,
    其中任何一步抛 TclError 都会**中断后面的步骤**,留下一个
    state=withdrawn、尺寸 1x1、屏幕上什么都看不见的窗口;
    而 grab_set() 如果已经挂上了,整个界面还会失去响应 ——
    表现就是「点完了没反应,也不报错」。

    这里改成:逐步尝试 + 失败降级 + 最后验收「窗口确实可见」,
    不可见就把真实原因抛出来,而不是默默吞掉。
    """
    # 1) 解除上一个窗口遗留的 grab(关掉的窗口有时不会自动释放)
    try:
        cur = win.tk.call("grab", "current")
        if cur:
            win.tk.call("grab", "release", cur)
    except tk.TclError:
        pass
    # 2) transient 必须在 deiconify 之后设,否则窗口可能映射不出来
    if parent is not None:
        try:
            win.transient(parent)
        except tk.TclError:
            pass
    # 3) 尺寸要在窗口可见前定好,否则会停在 1x1
    try:
        win.update_idletasks()
        if win.winfo_width() <= 1:
            pass                      # 已有 geometry 的话 update 后就该有值
    except tk.TclError:
        pass
    # 4) 显示
    try:
        win.deiconify()
    except tk.TclError:
        pass
    try:
        win.lift()
    except tk.TclError:
        pass
    # 5) 抢焦点:失败无所谓,窗口能看见、能点就行
    try:
        win.focus_force()
    except tk.TclError:
        pass
    # 6) 模态是「锦上添花」,抢不到就算了,绝不能因此让窗口不可用
    if modal:
        try:
            win.grab_set()
        except tk.TclError:
            pass
    # 7) 再走一遍事件循环,让窗口真正完成映射
    try:
        win.update_idletasks()
        win.update()
    except tk.TclError:
        pass

    # 8) 验收:不可见就必须让调用方知道,不能闷声吞掉
    try:
        ok = (win.winfo_ismapped()
              and win.winfo_width() > 1
              and win.winfo_height() > 1)
    except tk.TclError:
        ok = False
    if not ok:
        try:
            st = win.state()
        except Exception:
            st = "?"
        try:
            ttl = win.title()
        except Exception:
            ttl = "?"
        try:
            ww, wh = win.winfo_width(), win.winfo_height()
        except Exception:
            ww = wh = -1
        try:
            win.destroy()
        except tk.TclError:
            pass
        raise RuntimeError(
            f"窗口「{ttl}」无法显示"
            f"(state={st}, {ww}x{wh})。"
            f"通常是父窗口还没显示,或系统资源不足。")
    return win


BAD_PROJ_NAMES = {"源表", "新表", "表格", "bom", "BOM", "表", "xlsx",
                  "新建文件夹", "sheet", "Sheet", "1", "test", "Test"}


def _guess_proj_name(found, src: Path):
    """猜一个像样的项目名。

    优先级:表名里的项目标识 > 去掉通用后缀的目录名 > 目录名。
    目录叫「源表」这类名字当项目名毫无意义,能不用就不用。
    """
    # 1) 表名里带项目标识:抽「xx项目」「xx工程」这类
    for p in found or []:
        n = str(p.get("name") or "")
        for pat in (r"([\u4e00-\u9fa5A-Za-z0-9]{2,12}?)\s*项目",
                    r"([\u4e00-\u9fa5A-Za-z0-9]{2,12}?)\s*工程",
                    r"([\u4e00-\u9fa5A-Za-z0-9]{2,12}?)\s*加工包"):
            m = re.search(pat, n)
            if m:
                return m.group(1) + ("项目" if "项目" in pat else
                                     "工程" if "工程" in pat else "加工包")
    # 2) 目录名去掉「源表 / BOM表 / 物料」等后缀
    base = src.name if src else ""
    for suf in ("源表", "源数据", "BOM表", "bom表", "物料表", "物料",
                "表格", "表"):
        if base.endswith(suf) and len(base) > len(suf):
            base = base[:-len(suf)]
            break
    base = base.strip()
    # 单字或通用名都没信息量,不如用表名
    if len(base) >= 2 and base.lower() not in BAD_PROJ_NAMES:
        return base
    # 3) 兜底:第一张表的名字去掉扩展名和常见后缀
    if found:
        stem = Path(str(found[0].get("name") or "")).stem
        # 去掉「(样机A）」「(A)」「-A」这类样机标记
        stem = re.sub(r"[（(【\[]?\s*样机\s*[A-Za-z0-9一二三四]+\s*[)）】\]]?",
                      "", stem)
        for suf in ("物料表", "物料", "BOM表", "bom", "清单", "结构"):
            if stem.endswith(suf) and len(stem) > len(suf):
                stem = stem[:-len(suf)]
                break
        stem = re.sub(r"[\d\-_（）()\s]+$", "", stem).strip()
        if len(stem) >= 2:
            return stem[:24]
    return "新项目"


def _ellipsis(s, n):
    """中间省略,保留头尾 —— 路径这种「头是盘符、尾是项目名」的必须留两头。"""
    s = str(s)
    if len(s) <= n:
        return s
    if n <= 6:
        return s[:n]
    keep = n - 3
    head = keep // 2
    return s[:head] + "…" + s[-(keep - head):]


def open_window(cls, *args, **kw):
    """安全构造 Toplevel 子类。

    Tk 窗口的 __init__ 里如果中途抛异常,Tkinter 不会回收那个半成品窗口 ——
    它就留在屏幕上,控件建了一半,点不动也关不掉,只能杀进程。
    这里保证失败时把窗口销毁掉,再把异常抛给调用方。

    用法: open_window(ImportWindow, app, src, found, cb)
    """
    win = cls.__new__(cls)
    try:
        win.__init__(*args, **kw)
    except BaseException:
        for kill in (lambda: tk.Toplevel.destroy(win),
                     lambda: win.destroy()):
            try:
                kill()
                break
            except BaseException:
                continue
        raise
    return win


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(TAG)
        self.geometry("1000x720")
        self.minsize(900, 640)
        self.configure(bg=BG)
        self.option_add("*Font", (FONT, 10))
        self._style()
        self._install_excepthook()
        self._closing = False
        self._ui_q = queue.Queue()          # 跨线程投递泵的队列
        self._ui_pump_alive = True
        self.after(100, self._tick)  # 常驻心跳,必须从主线程起
        self.show_welcome()

    # ---------------- 异常兜底 ----------------
    def _install_excepthook(self):
        """回调异常必须让人看见。

        旧版没装这个钩子,Tkinter 只往 stderr 打一行,窗口留在屏幕上、
        按钮点了没反应 —— 用户看到的正是「卡死,关不掉」。
        """
        def hook(exc, val, tb):
            if issubclass(exc, KeyboardInterrupt):
                sys.__excepthook__(exc, val, tb)
                return
            text = "".join(traceback.format_exception(exc, val, tb))
            try:
                self._log_crash(text)
            except Exception:
                pass
            try:
                messagebox.showerror(
                    "出错了(已记录,可继续使用)",
                    f"{exc.__name__}: {val}\n\n"
                    f"详情已写入:\n{self._crash_log}\n\n"
                    "界面还能用,可以继续操作或重开这个窗口。")
            except Exception:
                pass

        sys.excepthook = hook
        self._crash_log = APP_DIR / "日志" / "崩溃.log"
        self._crash_log.parent.mkdir(parents=True, exist_ok=True)

    def _log_crash(self, text):
        with open(self._crash_log, "a", encoding="utf-8") as fh:
            fh.write(f"\n===== {datetime.now():%Y-%m-%d %H:%M:%S} =====\n")
            fh.write(text)

    def _on_quit(self):
        """关主窗:后台任务全部是 daemon 线程,直接退即可。

        刻意不去等后台线程 —— 等一个卡住的任务就是「关不掉」。
        """
        self._closing = True
        try:
            self.destroy()
        except tk.TclError:
            pass

    # ---------------- 样式 ----------------
    def _style(self):
        """整个界面的观感都来自 theme.py,这里只做一次挂载。"""
        self._ttk = T.style(self)
        # 窗口底色用一层 Canvas 做竖向渐变,iOS 深色模式那种
        # 「顶部略亮、底部沉下去」的纵深感
        self._bg_grad = tk.Canvas(self, bg=BG, highlightthickness=0, bd=0)
        self._bg_grad.place(x=0, y=0, relwidth=1, relheight=1)
        self._bg_grad.bind("<Configure>", self._paint_bg)

    def _paint_bg(self, _e=None):
        c = self._bg_grad
        try:
            c.delete("grad")
            w = max(1, c.winfo_width())
            h = max(1, c.winfo_height())
            bands = 48
            for i in range(bands):
                t = i / (bands - 1)
                col = T.mix(T.BG_GRAD_TOP, T.BG, t ** 0.85)
                y0 = h * i / bands
                y1 = h * (i + 1) / bands + 1
                c.create_rectangle(0, y0, w, y1, fill=col, outline="",
                                   tags="grad")
            c.tag_lower("grad")
        except tk.TclError:
            pass

    def _clear(self):
        for w in self.winfo_children():
            if w is self._bg_grad:
                continue
            try:
                w.destroy()
            except tk.TclError:
                pass

    def _lift_page(self, holder):
        """把内容层提到背景层之上(Tk 的 place 是后创建的在上面,
        但页面反复重建后顺序不一定稳,这里显式抬一次)。"""
        try:
            holder.place_configure(x=0, y=holder.winfo_y(), relwidth=1,
                                   relheight=1)
            holder.lift()
            self._bg_grad.lower()
        except tk.TclError:
            pass

    # ================= 页面切换 =================
    def _page(self, fade=True):
        """开始一个新页面:重建内容层,并做 iOS 式淡入上移。

        背景渐变层用 place 常驻最底;内容层也必须用 place,
        但**内容层内部一律用 pack/grid** —— Tk 里 place 的父容器
        不做几何传播,子控件混用会出现位置错乱。
        """
        self._clear()
        holder = tk.Frame(self, bg=BG)
        holder.place(x=0, y=0, relwidth=1, relheight=1)
        self._page_holder = holder
        if fade:
            holder.place_configure(y=14)
            T.Tween(holder, 320,
                    lambda e, r: holder.place_configure(
                        y=int(round(14 * (1 - e)))),
                    ease=T.ease_out_cubic).start()
        return holder

    # ================= 欢迎页 =================
    def show_welcome(self):
        holder = self._page()
        self.proj = None
        reg = paths.registry_list(with_stat=True)
        n_exist = len([r for r in reg if r["exists"]])

        # --- 顶部:iOS 大标题 ---
        top = tk.Frame(holder, bg=BG)
        top.pack(fill="x", padx=40, pady=(34, 0))
        ttk.Label(top, text="助手工程师", style="Title.TLabel").pack(anchor="w")
        ttk.Label(top, text="BOM 加工包 · 跟进看板 · 变动自动更新",
                  style="Sub.TLabel").pack(anchor="w", pady=(6, 0))

        body = tk.Frame(holder, bg=BG)
        body.pack(fill="both", expand=True, padx=40, pady=(26, 0))
        left = tk.Frame(body, bg=BG)
        left.pack(side="left", fill="both", expand=True)
        # 项目列表的宽度是算出来的,不是拍脑袋:
        #   文字列最宽的一项 ≈ 200px(路径 30 字 / 指标「源表 N · 零件 N ·
        #   待补 N · 看板已生成」),按钮列 ≈ 140px,左右内边距 34px。
        # 定 330px 时徽章和指标尾巴会被裁掉,项目名旁边那颗状态点看不见,
        # 整行就失去了「这个项目能不能用」的第一眼提示。
        right = tk.Frame(body, bg=BG, width=400)
        right.pack(side="right", fill="y", padx=(26, 0))
        right.pack_propagate(False)

        ttk.Label(left, style="H3.TLabel",
                  text=(f"继续已有项目,或添加一个新的"
                        if n_exist else "你还没有项目。选择一种方式开始:")
                  ).pack(anchor="w", pady=(0, 14))

        self._entry_card(left, "\U0001F4C1", "添加文件夹",
                         "导入已有的 BOM 表目录,自动识别表结构",
                         self.pick_folder)
        self._entry_card(left, "\u2728", "新建项目",
                         "从零开始,建一个空的项目文件夹",
                         self.new_project)
        ttk.Label(left, style="Tiny.TLabel",
                  text="上面两步是必选的 —— 完成后才能进入项目工作台。"
                  ).pack(anchor="w", pady=(12, 0))

        # --- 帮助入口(P10)---
        # 文档是打进 exe 里的,换了机器、源码不在手边时,
        # 界面上的这个按钮是唯一能找到「怎么用」的路。
        ttk.Label(left, style="H3.TLabel",
                  text="帮助").pack(anchor="w", pady=(22, 8))
        for icon, title, desc, path in (
                ("\U0001F4D6", "使用说明书", "怎么用：从导入到导出", paths.MANUAL_MD),
                ("\U0001F9F0", "标准 BOM 模板说明",
                 "自己建表时的红线清单", paths.BOM_TPL_MD),
                ("\U0001F4E6", "备份位置说明", "东西不见了去哪找", paths.BACKUP_MD),
        ):
            self._entry_card(left, icon, title, desc,
                             lambda p=path: self.open_doc(p))
        ttk.Label(left, style="Tiny.TLabel",
                  text="架构文档和开发计划在程序目录里，给改代码的人看。"
                  ).pack(anchor="w", pady=(10, 0))

        # --- 右侧:项目列表卡片 ---
        head = tk.Frame(right, bg=BG)
        head.pack(fill="x", pady=(0, 10))
        ttk.Label(head, style="H3.TLabel",
                  text="我的项目").pack(side="left")
        # 数量徽章
        bd = tk.Label(head, text=str(n_exist), bg=T.OK_DIM if n_exist
                      else T.SHEET, fg=T.OK if n_exist else T.FG3,
                      font=T.T_TINY, padx=8, pady=2)
        bd.pack(side="left", padx=(10, 0))

        # 刷新。项目行的「源表 N / 零件 N / 待补 N / 看板已生成」是打开
        # 欢迎页那一刻取的快照 —— 用户在别处导入了源表、或者用命令行
        # 跑了一次 build,回到这一页看到的还是旧数字,会以为工具没生效。
        T.Pill(head, "刷新", command=self.show_welcome,
               bg=T.SHEET, fg=T.FG2, parent_bg=BG, font_=T.font(12, "bold"),
               pad_x=12, pad_y=5).pack(side="right")

        # 卡片定高 + 内部滚动。
        # auto_height 的卡片会一直长到内容高度,项目一多就把右栏撑爆,
        # 行被 pack 挤扁(实测 20 个项目时行高 107px -> 59px,指标行 32px,
        # 文字被切),而且行看上去还在那儿 —— 用户只会觉得点不中。
        card = T.Card(right, bg=T.CARD, radius=T.R_LG, border=T.LINE,
                      shadow=True, auto_height=False, height=300)
        card.pack(fill="both", expand=True)
        if not reg:
            inner = card.body
            empty = tk.Frame(inner, bg=T.CARD)
            empty.pack(fill="both", expand=True)
            ttk.Label(empty, text="暂无项目", style="H3.Card.TLabel").pack(
                pady=(44, 6))
            ttk.Label(empty, text="导入或新建后会显示在这里",
                      style="Tiny.Card.TLabel").pack()
        else:
            sc = T.ScrollArea(card.body, bg=T.CARD)
            sc.pack(fill="both", expand=True, padx=2, pady=2)
            inner = sc.body
            for i, r in enumerate(reg):
                self._project_row(inner, r, last=(i == len(reg) - 1))

        foot = tk.Frame(holder, bg=BG)
        foot.pack(fill="x", padx=40, pady=(10, 22))
        ttk.Label(foot, style="Tiny.TLabel",
                  text=f"程序目录  {APP_DIR}").pack(anchor="w")

    def _project_row(self, parent, r, last=False):
        """项目列表里的一行。

        整行都是热区(点哪儿都能打开),右侧按钮只是提示 ——
        旧版把「打开」做成 tk.Label,实际只有 1x1 像素,
        肉眼根本点不到,用户完全不知道从哪儿进项目。
        """
        okx = bool(r["exists"])
        name = r["name"]
        stat = r.get("stat") or {}

        row = tk.Frame(parent, bg=T.CARD, cursor="hand2")
        row.pack(fill="x", padx=2)
        inner = tk.Frame(row, bg=T.CARD, cursor="hand2")
        inner.pack(fill="x", padx=12, pady=11)

        # 按钮列必须先 pack。
        # pack 是先来先得:文字列如果先 pack 且 expand=True,会把整行宽度吃光,
        # 右边按钮分不到宽度就被挤没了 —— 窗口稍窄一点(比如列表出现滚动条,
        # 少 11px)按钮就整排消失,用户连进项目的路都没有。
        btns = tk.Frame(inner, bg=T.CARD)
        btns.pack(side="right", padx=(10, 0))

        col = tk.Frame(inner, bg=T.CARD, cursor="hand2")
        col.pack(side="left", fill="x", expand=True)

        # 第一行:状态点 + 名称 + 徽章
        t1 = tk.Frame(col, bg=T.CARD, cursor="hand2")
        t1.pack(fill="x")
        dot = "●" if okx else "○"
        tk.Label(t1, text=f"{dot}  {name}", bg=T.CARD,
                 fg=T.FG if okx else T.FG3,
                 font=T.font(14, "bold"), cursor="hand2").pack(side="left")
        if not okx:
            chip, cbg, cfg_ = "配置丢失", T.BAD_DIM, T.BAD
        elif stat.get("n_src"):
            # 只有 BOM 表的项目也要算「就绪」—— 它已经能构建了。
            # 以前这里只看零件表数,导入已完工项目会被标成「待导入源表」,
            # 用户明明导了 5 张表,看着像没导入成功。
            chip, cbg, cfg_ = "就绪", T.OK_DIM, T.OK
        else:
            chip, cbg, cfg_ = "待导入源表", T.WARN_DIM, T.WARN
        tk.Label(t1, text=chip, bg=cbg, fg=cfg_, font=T.T_TINY,
                 padx=7, pady=1, cursor="hand2").pack(side="left",
                                                        padx=(9, 0))

        # 第二行:项目路径。省略长度按「列表最窄时也放得下按钮」来定,
        # 留 30 字 —— Tk 的 Label 不会自己省略号,超宽就直接被裁掉,
        # 裁掉一半路径比短一点更难认。
        tk.Label(col, text=_ellipsis(r["path"], 30), bg=T.CARD, fg=T.FG3,
                 font=T.font(10), anchor="w",
                 cursor="hand2").pack(anchor="w", pady=(4, 0))
        if okx and stat:
            bits = []
            # 分开说「源表 N」和「BOM 表 N」—— 两者的作用完全不同:
            # 零件表要靠「新改动」标记筛,BOM 表已经是核对过的最终表。
            # 混成一句「源表 5」会让人以为还要再导一次。
            if stat.get("n_src_only"):
                bits.append(f"源表 {stat['n_src_only']}")
            if stat.get("n_bom"):
                bits.append(f"BOM 表 {stat['n_bom']}")
            if stat.get("n_part"):
                bits.append(f"零件 {stat['n_part']}")
            if stat.get("n_miss"):
                bits.append(f"待补 {stat['n_miss']}")
            if stat.get("has_dash"):
                bits.append("看板已生成")
            if bits:
                # 分隔符用「 · 」而不是「   ·   」:三个空格在 10pt 下
                # 一项就多占 6px,四项加起来把「看板已生成」挤出可视区。
                tk.Label(col, text=" · ".join(bits), bg=T.CARD,
                         fg=T.FG2, font=T.font(10), anchor="w",
                         cursor="hand2").pack(anchor="w", pady=(3, 0))

        # 右侧:真实按钮(Pill 有实际宽高,能点得到)
        # btns 已在前面 pack 过,这里只往里放按钮
        for txt, fn, primary in (("移除", lambda: self.drop_project(name), False),
                                 ("打开", lambda: self.open_project(name),
                                  okx)):
            p = T.Pill(btns, txt, command=fn,
                       bg=T.ACC if primary else T.CARD_HI,
                       fg="#FFFFFF" if primary else T.FG2,
                       parent_bg=T.CARD, font_=T.font(12, "bold"),
                       pad_x=14, pad_y=6)
            p.pack(side="left", padx=(6, 0))

        # 分隔线必须先建,再统一绑定。
        # 放在绑定循环之后的话,它就成了行里唯一点不动的控件。
        if not last:
            T.hline(inner, color=T.LINE)

        # 整行热区:点到哪儿都是打开。
        # 必须递归绑到每个后代 —— 早先只绑了 row/inner/col/t1 和 col 的直接子控件,
        # 结果状态徽章(就在项目名旁边)和文字列与按钮列之间的空白都点不动。
        # 用户看到一整行像按钮,唯独那几个位置没反应,比整行都不能点更让人火大。
        def descendants(w, out=None):
            out = [] if out is None else out
            try:
                kids = w.winfo_children()
            except tk.TclError:
                return out
            for c in kids:
                out.append(c)
                descendants(c, out)
            return out

        # 按钮区不吃整行点击,免得点「移除」变成「打开」。
        #
        # 做法是**在 click 里判断来源**,不是给按钮绑一个空处理器。
        # Tk 的事件不会冒泡到父控件,所以点按钮本来就不会触发整行的 click,
        # 那个空绑定纯属多余 —— 而且有害:
        # `<Button-1>` 和 `<ButtonPress-1>` 是**同一个绑定槽**,
        # 给 Pill 绑 `lambda e: e` 会把 Pill 自己的 `_on_press` 顶掉,
        # 于是 _pressed 恒为 False,_on_release 里 `if was and ...` 不成立,
        # 命令永远不执行 —— 按钮看起来完全正常,就是点不动。
        btn_paths = tuple(str(x) for x in [btns] + descendants(btns))

        def in_btns(e):
            if e is None:
                return False
            try:
                p = str(e.widget)
            except Exception:
                return False
            return any(p == b or p.startswith(b + ".") for b in btn_paths)

        def click(e=None, n=name):
            if in_btns(e):
                return
            self.open_project(n)

        skip = {id(w) for w in [btns] + descendants(btns)}

        def recolor(bg):
            for w in [row] + descendants(row):
                if id(w) in skip:
                    continue
                try:
                    w.configure(bg=bg)
                except tk.TclError:
                    pass          # Canvas 按钮之类不支持 bg,忽略

        def on_in(_=None):
            recolor(T.CARD_HI)

        def on_out(_=None):
            recolor(T.CARD)

        for w in [row] + descendants(row):
            # 按钮子树必须整个跳过。Pill 自己绑的是 <ButtonPress-1>,
            # 而 <Button-1> 就是同一个槽 —— 在按钮上再绑一次整行 click,
            # 会把 Pill 的按下/松开处理器顶掉,按钮直接变成点不动。
            if id(w) in skip:
                continue
            w.bind("<Button-1>", click)
            w.bind("<Enter>", on_in)
            w.bind("<Leave>", on_out)

    def _entry_card(self, parent, icon, title, desc, cmd):
        """入口卡片:iOS 的分组卡片 + 悬停浮起 + 整行可点。"""
        card = T.Card(parent, bg=T.CARD, radius=T.R_LG, border=T.LINE,
                      shadow=True)
        card.pack(fill="x", pady=(0, 14))

        inner = tk.Frame(card.body, bg=T.CARD)
        inner.pack(fill="both", expand=True, padx=20, pady=18)

        ic = tk.Label(inner, text=icon, bg=T.ACC_SOFT, fg=T.ACC,
                      font=("Segoe UI Emoji", 17), width=3, height=1,
                      pady=6)
        ic.pack(side="left", fill="y", padx=(0, 18))

        col = tk.Frame(inner, bg=T.CARD)
        col.pack(side="left", fill="both", expand=True)
        tk.Label(col, text=title, bg=T.CARD, fg=T.FG,
                 font=T.font(17, "bold")).pack(anchor="w")
        tk.Label(col, text=desc, bg=T.CARD, fg=T.FG2,
                 font=T.font(12)).pack(anchor="w", pady=(5, 0))

        arrow = tk.Label(inner, text="›", bg=T.CARD, fg=T.FG3,
                         font=T.font(26), cursor="hand2")
        arrow.pack(side="right", fill="y")

        def click(_=None, c=cmd):
            c()

        def on_in(_=None):
            T.Tween(card, 180,
                    lambda e, r: card.set_bg(T.mix(T.CARD, T.CARD_HI, e)),
                    ease=T.ease_out_cubic).start()
            arrow.configure(fg=T.FG2)

        def on_out(_=None):
            T.Tween(card, 220,
                    lambda e, r: card.set_bg(T.mix(T.CARD_HI, T.CARD, e)),
                    ease=T.ease_out_cubic).start()
            arrow.configure(fg=T.FG3)

        for w in (card, inner, ic, col, arrow):
            w.bind("<Enter>", on_in)
            w.bind("<Leave>", on_out)
            w.bind("<Button-1>", click)
            w.configure(cursor="hand2")
        for lb in col.winfo_children():
            lb.bind("<Button-1>", click)
        return card

    # ================= 入口 1:添加文件夹 =================
    def pick_folder(self):
        d = filedialog.askdirectory(
            title="选择包含 BOM 表(xlsx)的文件夹")
        if not d:
            return
        src = Path(d)
        box = []

        def job(log):
            log(f"正在探测 {src} …")
            box.append(probe.discover(src))
            log(f"探测到 {len(box[0])} 个可用表。")

        def done():
            if not box[0]:
                messagebox.showwarning(
                    "没找到可用的 BOM 表",
                    f"{src}\n\n没有找到含「图号/名称」表头且有红底色标记的 xlsx。\n"
                    "文件名可用正则筛选,例如含「物料」「清单」「BOM」。")
                return
            open_window(ImportWindow, self, src, box[0], self._after_import).show()

        self._run_bg("读取文件夹", job, on_done=done)

    def _after_import(self, name, root):
        self.show_welcome()
        self.open_project(name)

    # ================= 入口 2:新建项目 =================
    def new_project(self):
        dlg = tk.Toplevel(self)
        dlg.title("新建项目")
        dlg.configure(bg=BG)
        dlg.transient(self)
        dlg.resizable(False, False)
        f = ttk.Frame(dlg, padding=22)
        f.pack(fill="both", expand=True)
        ttk.Label(f, text="✨ 新建项目", style="H2.TLabel").grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 14))
        ttk.Label(f, text="项目名称", style="Dim.TLabel").grid(
            row=1, column=0, sticky="w", pady=4)
        name_var = tk.StringVar()
        ttk.Entry(f, textvariable=name_var, width=34).grid(
            row=1, column=1, sticky="ew", pady=4)
        ttk.Label(f, text="存放位置", style="Dim.TLabel").grid(
            row=2, column=0, sticky="w", pady=4)

        def default_dir():
            return str(APP_DIR / "项目")

        path_var = tk.StringVar(value=default_dir())
        row = ttk.Frame(f)
        row.grid(row=2, column=1, sticky="ew", pady=4)
        ttk.Entry(row, textvariable=path_var, width=26).pack(side="left")
        ttk.Button(row, text="…", width=3,
                   command=lambda: _ask_dir(path_var)).pack(side="left", padx=(4, 0))
        ttk.Label(f, text="项目文件夹会自动建在「存放位置\\项目名」下",
                  style="Dim.TLabel", font=(FONT, 8)).grid(
            row=3, column=0, columnspan=2, sticky="w", pady=(2, 12))
        ttk.Label(f, text="建好后:把 BOM 表(xlsx)放进项目的 1_源数据 文件夹,\n"
                          "再点「扫描源数据」即可自动导入。",
                  style="Dim.TLabel", font=(FONT, 9), justify="left").grid(
            row=4, column=0, columnspan=2, sticky="w", pady=(0, 14))
        btns = ttk.Frame(f)
        btns.grid(row=5, column=0, columnspan=2, sticky="e")

        def create():
            name = name_var.get().strip()
            base = path_var.get().strip()
            if not name:
                messagebox.showwarning("缺少名称", "请填项目名称", parent=dlg)
                return
            if re.search(r'[<>:"/\\|?*]', name):
                messagebox.showwarning("名称不合法",
                                       "不能包含 \\ / : * ? \" < > |", parent=dlg)
                return
            root = Path(base) / name
            if (root / paths.LAYOUT["config"]).is_file():
                if not messagebox.askyesno("已存在",
                                           f"{root}\n\n项目已存在,要打开它吗?",
                                           parent=dlg):
                    return
            else:
                cfg = json_deepcopy(C.DEFAULT)
                cfg["project"]["name"] = name
                cfg["project"]["description"] = f"{name} · 改动零件外发加工"
                proj = paths.Project(root)
                cfg["project"]["baseDir"] = str(proj.source)
                cfg["sources"] = []
                proj.save(cfg)
                proj.ensure_dirs()
                paths.registry_add(proj, name)
            dlg.destroy()
            self.show_welcome()
            self.open_project(name)

        ttk.Button(btns, text="取消", style="Ghost.TButton",
                   command=dlg.destroy).pack(side="right", padx=(6, 0))
        ttk.Button(btns, text="创建", style="Accent.TButton",
                   command=create).pack(side="right")
        dlg.bind("<Return>", lambda e: create())
        name_var.set("我的项目")
        present(dlg, modal=True, parent=self)

    # ================= 项目工作台 =================
    def open_project(self, name):
        try:
            proj = paths.find_project(name)
        except FileNotFoundError as e:
            # 列表里还在、目录却没了 —— 报「找不到项目」会让人以为是名字打错,
            # 实际上是文件夹被移走或删了。行上已经标了「配置丢失」,这里要说同样的话。
            gone = [r for r in paths.registry_list()
                    if r["name"] == name and not r["exists"]]
            if gone:
                messagebox.showwarning(
                    "项目文件夹不在了",
                    f"「{name}」还在项目列表里,但这个文件夹已经找不到了:\n\n"
                    f"  {gone[0]['path']}\n\n"
                    f"整个文件夹可能被移动或删除了。\n"
                    f"如果只是换了位置,把文件夹放回去就能继续用;\n"
                    f"确认不要了,点这一行右边的「移除」把它从列表里去掉。")
            else:
                messagebox.showerror("打不开", str(e))
            return
        except Exception as e:
            messagebox.showerror("打不开", str(e))
            return
        self.proj = proj
        self.show_workspace()

    def drop_project(self, name):
        if not messagebox.askyesno(
                "移除项目",
                f"从列表移除「{name}」?\n\n只从列表移除,不会删除任何文件。"):
            return
        try:
            paths.registry_remove(paths.find_project(name))
        except Exception as e:
            messagebox.showerror("失败", str(e))
            return
        self.show_welcome()

    def show_workspace(self):
        holder = self._page()
        proj = self.proj
        cfg = C.with_defaults(C.load(proj))

        # ---------- 顶部:大标题 + 返回 ----------
        top = tk.Frame(holder, bg=BG)
        top.pack(fill="x", padx=32, pady=(26, 0))
        back = tk.Label(top, text="‹  项目列表", bg=BG, fg=T.ACC,
                        font=T.font(13), cursor="hand2")
        back.pack(side="right")
        back.bind("<Button-1>", lambda e: self.show_welcome())
        back.bind("<Enter>", lambda e: back.configure(fg=T.ACC_HI))
        back.bind("<Leave>", lambda e: back.configure(fg=T.ACC))
        tk.Label(top, text=proj.name, bg=BG, fg=T.FG,
                 font=T.font(26, "bold")).pack(side="left")
        # 表数要算 BOM 表。只数 sources 的话,导入「已完工项目」
        # (只有 BOM 表)会显示「0 个源表」,而实际上有 5 张表。
        _ntab = build_core.table_count(cfg)
        _what = ("BOM 表" if cfg.get("bomSources") and not cfg["sources"]
                 else "源表")
        tk.Label(top, text=f"  {_ntab} 个{_what}", bg=BG,
                 fg=T.FG3, font=T.font(13)).pack(side="left", pady=(6, 0))

        # ---------- 主操作:药丸按钮 ----------
        # 关键:用 grid 且列号显式递增。Pill 会自己 configure(width),
        # 若用 pack 或共享一个会重置的属性,相邻按钮会全部叠在同一列。
        acts = tk.Frame(holder, bg=BG)
        acts.pack(fill="x", padx=32, pady=(18, 0))
        col = {"n": 0}

        def pill(text, cmd, primary=False, icon=""):
            b = T.Pill(acts, f"{icon}  {text}".strip(), command=cmd,
                       bg=T.ACC if primary else T.CARD_HI,
                       fg="#FFFFFF" if primary else T.FG,
                       parent_bg=BG, font_=T.font(13, "bold"),
                       pad_x=20, pad_y=10)
            b.grid(row=0, column=col["n"], padx=(0, 10), sticky="w")
            col["n"] += 1
            return b

        pill("构建 BOM 表 + 看板", self.act_build, primary=True, icon="①")
        pill("实时监听", self.act_watch, icon="②")
        pill("打开看板", self.act_open_dash, icon="③")
        pill("导出核对版 HTML", self.act_export_html, icon="④")
        pill("程序内看板", self.act_dash_native, icon="⑤")
        pill("查看交付物", self.act_view_files, icon="⑥")

        # ---------- 次级操作 ----------
        subs = tk.Frame(holder, bg=BG)
        subs.pack(fill="x", padx=32, pady=(14, 0))
        for i, (txt, cmd) in enumerate(
                (("开始检测", self.act_detect),
                 ("取 BOM 模板", self.act_template),
                 ("扫描源数据", self.act_rescan),
                 ("添加文件夹", self.pick_folder),
                 ("新建项目", self.new_project),
                 ("分类规则", self.act_rules),
                 ("打包交付", self.act_export),
                 ("环境自检", self.act_doctor))):
            b = tk.Label(subs, text=txt, bg=T.CARD, fg=T.FG2,
                         font=T.font(12), padx=14, pady=7, cursor="hand2")
            b.grid(row=0, column=i, padx=(0, 8), sticky="w")
            b.bind("<Button-1>", lambda e, f=cmd: f())
            b.bind("<Enter>", lambda e, o=b: o.configure(bg=T.CARD_HI,
                                                        fg=T.FG))
            b.bind("<Leave>", lambda e, o=b: o.configure(bg=T.CARD,
                                                        fg=T.FG2))

        # ---------- 内容:左零件总览 / 右最近更新 ----------
        content = tk.Frame(holder, bg=BG)
        content.pack(fill="both", expand=True, padx=32, pady=(20, 26))
        left = tk.Frame(content, bg=BG)
        left.pack(side="left", fill="both", expand=True)
        right = tk.Frame(content, bg=BG, width=360)
        right.pack(side="right", fill="y", padx=(22, 0))
        right.pack_propagate(False)

        # 左:零件总览(卡片包裹)
        card = T.Card(left, bg=T.CARD, radius=T.R_LG, border=T.LINE,
                      auto_height=False)
        card.pack(fill="both", expand=True)
        body = tk.Frame(card.body, bg=T.CARD)
        body.pack(fill="both", expand=True, padx=16, pady=14)
        ttk.Label(body, text="零件总览", style="H3.Card.TLabel").pack(
            anchor="w", pady=(0, 10))

        cols = ("cat", "n", "miss", "step", "2d")
        self.tree = ttk.Treeview(body, columns=cols, show="headings",
                                 height=9, selectmode="browse")
        for cid, title, w, anchor in [
                ("cat", "分类", 150, "w"), ("n", "零件数", 90, "e"),
                ("miss", "缺件", 80, "e"),
                ("step", "3D图(STEP)", 110, "e"),
                ("2d", "2D图(工程图)", 130, "e")]:
            self.tree.heading(cid, text=title)
            self.tree.column(cid, width=w, anchor=anchor)
        self.tree.pack(fill="both", expand=True)
        # 空态:盖一层居中提示,盖住空白表格,免得像加载失败
        self.tree_empty = tk.Label(body, text="", bg=T.CARD, fg=T.FG3,
                                   font=T.font(13))
        self.tree_empty.place(relx=0.5, rely=0.45, anchor="center")

        self.warn = ttk.Label(body, text="", style="Warn.Card.TLabel",
                              font=T.font(11), wraplength=560,
                              justify="left")
        self.warn.pack(anchor="w", pady=(12, 0))

        # 右:最近更新(代码块观感)
        ttk.Label(right, text="最近更新", style="H3.TLabel").pack(
            anchor="w", pady=(0, 10))
        logcard = T.Card(right, bg=T.CARD_LO, radius=T.R_LG, border=T.LINE,
                         auto_height=False)
        logcard.pack(fill="both", expand=True)
        self.logbox = tk.Text(logcard.body, bg=T.CARD_LO, fg=T.FG2,
                              insertbackground=T.FG, relief="flat",
                              highlightthickness=0, bd=0,
                              font=T.font(10, mono=True), wrap="word",
                              padx=14, pady=12, spacing1=1, spacing3=3)
        self.logbox.pack(fill="both", expand=True)
        self.logbox.configure(state="disabled")

        self._fill_log()
        self.refresh_status()

    def _set_tree_empty(self, text="", breathe=False):
        """显示/隐藏空态提示(用 place 叠在 tree 上)。

        breathe=True 时做一次呼吸动画,表示"正在加载"。
        """
        lbl = getattr(self, "tree_empty", None)
        if lbl is None:
            return
        if getattr(self, "_empty_anim", None):
            self._empty_anim.cancel()
            self._empty_anim = None
        try:
            if text:
                lbl.configure(text=text, fg=T.FG3 if not breathe else T.FG2)
                lbl.place(relx=0.5, rely=0.45, anchor="center")
                lbl.lift()
                if breathe:
                    holder = {"t": 0.0}

                    def step(e, raw):
                        holder["t"] = raw
                        try:
                            lbl.configure(
                                fg=T.mix(T.FG3, T.FG, abs(e * 2 % 2.0 - 1.0)))
                        except tk.TclError:
                            pass

                    self._empty_anim = T.Tween(lbl, 1100, step,
                                               ease=T.ease_in_out).start()
            else:
                lbl.place_forget()
        except tk.TclError:
            pass

    # ---------------- 状态刷新 ----------------
    def _fill_log(self):
        f = self.proj.logs / "更新.log"
        self.logbox.configure(state="normal")
        self.logbox.delete("1.0", "end")
        if f.is_file():
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()[-14:]
            self.logbox.insert("1.0", "\n".join(lines) or "(暂无记录)")
        else:
            self.logbox.insert("1.0", "(暂无记录,构建或启动监听后会写在这里)")
        self.logbox.configure(state="disabled")

    def refresh_status(self):
        """读源表算状态。较慢,放后台线程,算完回主线程刷 UI。

        旧版在 UI 线程直接读全部 xlsx,每次进工作台/构建完都白屏卡一下,
        大项目上等于「没反应」。
        """
        proj = self.proj
        tree = getattr(self, "tree", None)
        if proj is None or tree is None:
            return
        token = object()
        self._rs_token = token                      # 旧的回调回来就被丢弃
        tree.delete(*tree.get_children())
        # 用骨架屏式的呼吸提示,而不是往表格里插一行「正在读取」——
        # 后者看起来像数据,前者才是明确的"在加载"。
        self._set_tree_empty("正在读取源表…", breathe=True)
        self.warn.config(text="", foreground=WARN)

        def scan():
            try:
                cfg = C.with_defaults(C.load(proj))
                cfg["_proj_root"] = str(proj.root)
                # 必须走 build_core.read_items —— 和构建同一套读取逻辑。
                # 这里以前自己写了一份只认 cfg["sources"] 的,结果导入
                # BOM 表的项目:构建能出看板,工作台却空空如也,
                # 标题还写着「0 个源表」。
                items, _src = build_core.read_items(cfg, proj)
                if not items:
                    payload = ("none", None)
                else:
                    issues = [i for i in core.check_items(cfg, items)
                              if i["level"] != "miss"]
                    rows = []
                    dlv = (["step", "2d"]
                           if any(i.get("2d") for i in items) else ["step"])
                    for c in cfg["categories"]["order"]:
                        g = [i for i in items if i["cat"] == c]
                        if not g:
                            continue
                        vals = [c, len(g)]
                        for k in dlv:
                            need = [i for i in g if i.get(k)]
                            ok = sum(1 for i in need
                                     if i.get(k + "_exists"))
                            vals.append(f"{ok}/{len(need)}" if need else "—")
                        while len(vals) < 5:
                            vals.append("—")
                        rows.append(vals)
                    payload = ("rows", (rows, len(issues)))
            except Exception as e:
                payload = ("fail", e)
            # 关键:后台线程绝对不能碰 self.after / 任何 tk 调用。
            # 那样会抛 RuntimeError: main thread is not in main loop,
            # 状态表就永远停在「正在读取…」。
            self.post_ui(lambda: self._apply_status(token, payload))

        threading.Thread(target=scan, daemon=True).start()

    def _ensure_ui_pump(self):
        """(仅主线程)确保心跳泵在跑。__init__ 里已常驻启动,这里是兜底。"""
        if getattr(self, "_ui_pump_alive", False):
            return
        self._ui_pump_alive = True
        try:
            self.after(100, self._tick)
        except tk.TclError:
            self._ui_pump_alive = False

    def post_ui(self, fn):
        """从任意线程把 fn 安全排到主线程执行。

        只碰 queue.Queue —— 任何 tkinter 调用都必须留在主线程,
        包括 after / createcommand。这是 Tkinter 的硬约束。
        """
        def run():
            if getattr(self, "_closing", False):
                return
            try:
                fn()
            except tk.TclError:
                pass
            except Exception as e:
                self._log_crash(traceback.format_exc())
                try:
                    messagebox.showerror("出错了", f"{e}")
                except Exception:
                    pass

        self._ui_q.put(run)

    def _tick(self):
        """常驻心跳泵:每 100ms 排空一次 UI 队列。

        必须是常驻的,不能「空了就停」—— 后台线程可能几秒后才投递,
        泵一停就再也没人接手,界面就永远停在占位状态(旧版正是这个 bug)。
        """
        if getattr(self, "_closing", False):
            return
        for _ in range(200):                     # 一轮别排太多,免得界面卡
            try:
                run = self._ui_q.get_nowait()
            except queue.Empty:
                break
            run()
        try:
            self.after(100, self._tick)
        except tk.TclError:
            pass

    def _apply_status(self, token, payload):
        """refresh_status 的主线程回调。"""
        if getattr(self, "_closing", False):
            return                                    # 已退出
        if getattr(self, "_rs_token", None) is not token:
            return                                    # 已被更新的请求取代
        if getattr(self, "tree", None) is None:
            return                                    # 已离开工作台
        kind, data = payload
        tree = self.tree
        tree.delete(*tree.get_children())
        if kind == "none":
            self._set_tree_empty("还没有源表\n\n点「添加文件夹」导入,"
                                 "或把 xlsx 放进 1_源数据 后点「扫描源数据」")
            self.warn.config(text="")
        elif kind == "fail":
            self._set_tree_empty(f"读取失败\n{data}")
            self.warn.config(text="", foreground=BAD)
        else:
            rows, n_issue = data
            if rows:
                self._set_tree_empty("")
                for vals in rows:
                    tree.insert("", "end", values=vals)
            else:
                self._set_tree_empty("没有标红的新改动件\n\n"
                                     "确认源表里的「新改动」标记列选对了")
            self.warn.config(
                text=f"数据待补 {n_issue} 项"
                     + ("   · 手动修改冲突报告:_报告/手动修改冲突.txt"
                        if self.proj.conflict_txt.is_file() else ""),
                foreground=WARN)
        try:
            self._fill_log()
        except tk.TclError:
            pass

    # ---------------- 动作 ----------------
    def _run_bg(self, title, fn, on_done=None, modal=False):
        """后台跑耗时任务,界面不卡。

        三条铁律(都是踩过的坑):
        1. 输出走 queue,主线程 after 轮询 —— 跨线程直接调 win.after 不安全。
        2. 收尾写在 worker 的 finally / except BaseException 里 ——
           只 catch Exception 时,BaseException 或 log() 自身抛错会让进度条
           永远转下去(旧版就是这个 bug)。
        3. 关闭窗口永远可用:关掉只是不看输出,任务照常跑完。旧版把
           WM_DELETE_WINDOW 绑成 lambda: None,任务一挂窗口就再也关不掉。
        """
        win = tk.Toplevel(self)
        win.title(title)
        win.configure(bg=T.SHEET)
        win.resizable(False, False)

        f = tk.Frame(win, bg=T.SHEET, padx=26, pady=22)
        f.pack(fill="both", expand=True)
        head = tk.Frame(f, bg=T.SHEET)
        head.pack(fill="x")
        # 动态岛式的状态点:干活时呼吸,结束变绿/红
        dot = tk.Canvas(head, width=12, height=12, bg=T.SHEET,
                        highlightthickness=0, bd=0)
        dot.pack(side="left", pady=(6, 0))
        tk.Label(head, text=title, bg=T.SHEET, fg=T.FG,
                 font=T.font(15, "bold")).pack(side="left", padx=(10, 0))
        state = tk.Label(head, text="运行中", bg=T.SHEET, fg=T.FG2,
                         font=T.font(12))
        state.pack(side="right", pady=(4, 0))

        # 自绘进度条:一段来回扫的高光
        track = tk.Canvas(f, height=4, bg=T.SHEET, highlightthickness=0,
                          bd=0)
        track.pack(fill="x", pady=(16, 4))

        out = tk.Text(f, width=52, height=17, bg=T.CARD_LO, fg=T.FG2,
                      insertbackground=T.FG, relief="flat",
                      highlightthickness=0, font=T.font(10, mono=True),
                      wrap="word", padx=14, pady=12, spacing1=1, spacing3=3)
        out.pack(fill="both", expand=True)

        q = queue.Queue()
        live = {"win": True}

        def detach():
            """关掉输出窗口,任务继续跑完。"""
            live["win"] = False
            try:
                win.destroy()
            except tk.TclError:
                pass

        win.protocol("WM_DELETE_WINDOW", detach)
        btns = tk.Frame(f, bg=T.SHEET)
        btns.pack(fill="x", pady=(14, 0))
        tk.Label(btns, text="关闭窗口不会中断任务", bg=T.SHEET, fg=T.FG3,
                 font=T.font(10)).pack(side="left")
        tk.Label(btns, text="后台运行", bg=T.SHEET, fg=T.ACC,
                 font=T.font(11), cursor="hand2").pack(side="right")
        btns.winfo_children()[1].bind("<Button-1>", lambda e: detach())

        # ---- 扫光动画 ----
        sweep = {"x": 0.0, "on": True}

        def anim():
            if not live["win"]:
                return
            try:
                w = max(1, track.winfo_width())
                if w > 4:
                    track.delete("all")
                    T.draw_rounded(track, 0, 0, w, 4, 2, fill=T.LINE_HI)
                    sweep["x"] = (sweep["x"] + 0.022) % 1.0
                    seg = max(28, w // 4)
                    x0 = sweep["x"] * (w + seg) - seg
                    T.draw_rounded(track, x0, 0, seg, 4, 2, fill=T.ACC)
                    # 状态点
                    dot.delete("d")
                    pulse = 0.5 + 0.5 * abs(
                        (sweep["x"] * 2) % 2.0 - 1.0)
                    dot.create_oval(1, 1, 11, 11,
                                    fill=T.mix(T.ACC, T.CARD_LO, pulse),
                                    outline="")
                win.after(28, anim)
            except tk.TclError:
                live["win"] = False

        def worker():
            def log(m):
                self.post_ui(lambda m=m: _append(m))
            try:
                try:
                    res = fn(log)
                except BaseException as e:          # 含 SystemExit 等
                    log(f"\n出错: {e}")
                    log(traceback.format_exc())
                    q.put(("err", e))
                else:
                    # 结果要带出去:「导出核对版 HTML」的收尾要知道
                    # 导到哪儿了才能打开浏览器。以前这里直接丢成 None,
                    # 于是导出跑完必然抛 missing 1 required positional
                    # argument: 'out'。
                    q.put(("ok", res))
            finally:
                # 收尾同样走 post_ui:这样即使窗口被关掉,
                # on_done / refresh_status 依然会执行(旧版直接 return 跳过了)。
                q.put(("end", None))
                self.post_ui(lambda: _finish(q))

        threading.Thread(target=worker, daemon=True).start()

        def _append(text):
            if not live["win"]:
                return
            try:
                out.insert("end", text + "\n")
                out.see("end")
            except tk.TclError:
                live["win"] = False

        def _finish(qq):
            err = None
            res = None
            while True:
                try:
                    kind, payload = qq.get_nowait()
                except queue.Empty:
                    break
                if kind == "err":
                    err = payload
                elif kind == "ok":
                    res = payload
            live["win"] = False
            if err is not None:
                try:
                    state.configure(text="出错", fg=T.BAD)
                    dot.delete("d")
                    dot.create_oval(1, 1, 11, 11, fill=T.BAD, outline="")
                    win.title(f"{title} — 出错")
                    messagebox.showerror(title, f"{err}")
                except tk.TclError:
                    pass
            else:
                try:
                    state.configure(text="完成", fg=T.OK)
                    dot.delete("d")
                    dot.create_oval(1, 1, 11, 11, fill=T.OK, outline="")
                    win.title(f"{title} — 完成")
                except tk.TclError:
                    pass

            # 关键:on_done 常会弹新窗口(如导入向导)。
            # 进度窗还开着、transient 指向主窗、还可能占着 grab,
            # 新窗口会抢不到 grab 而抛 TclError,变成「点了没反应」。
            # 所以先把进度窗收干净,再执行 on_done。
            detach()
            try:
                _call_on_done(on_done, res)
            except Exception as e:
                self._log_crash(traceback.format_exc())
                try:
                    messagebox.showerror(title, f"收尾失败: {e}")
                except tk.TclError:
                    pass

        anim()
        if modal:
            try:
                win.grab_set()
            except tk.TclError:
                pass        # 抢不到就算了,不能因此让进度窗打不开
        return win

    def act_build(self):
        def job(log):
            from build_core import run_build
            run_build(self.proj, log=log)
        self._run_bg("构建中", job)

    def act_watch(self):
        existing = read_watch_pid()
        if existing:
            if messagebox.askyesno("监听已在运行",
                                   f"已有监听进程(PID {existing})。\n\n要停止它吗?"):
                self._run_bg("停止监听", lambda log: stop_watch(log))
            return
        # 启动 + 等待都放后台:旧版在 UI 线程 sleep,窗口直接「未响应」
        def job(log):
            start_watch(self.proj)
            log("监听进程已派生。")
            for i in range(20):
                time.sleep(0.15)
                if read_watch_pid():
                    log(f"监听已就绪(PID {read_watch_pid()})。")
                    return
            log("⚠ 3 秒内没检测到监听进程,请看 项目/日志/更新.log")
        self._run_bg("启动监听", job, on_done=lambda: None)
        messagebox.showinfo(
            "监听已启动",
            "看板地址已用默认浏览器打开。\n\n"
            "之后你把 STEP / 工程图放进对应目录,\n"
            "或修改源表,看板都会自动更新。\n\n"
            f"日志: {self.proj.logs / '更新.log'}\n"
            "停止: 在本界面再点一次「实时监听」即可")

    def act_open_dash(self):
        """打开看板。

        ★ 以前这里在「监听没开」时走 `webbrowser.open(html.as_uri())`,
          也就是 **file://**。而浏览器禁止 file:// 页面读本地文件
          (fetch 一律被拦),于是看板里的 3D 预览、在线编辑、P7 接口
          **全都用不了** —— 表现为「点 3D 预览是一片空白 / 没反应」。
          监听没开时以前是「反正看不上,双击也能看」,现在改成
          **顺手把服务起起来**(只起服务、不开监听、不重新构建),
          然后一律走 http://127.0.0.1:8900/。

          双击 HTML 文件这条路仍然保留给「发给加工厂」的单文件看板,
          但那条路上 3D 预览本来就不可能工作(没有服务端也没有内嵌网格)。
        """
        html = self.proj.html
        if not html.is_file():
            if not messagebox.askyesno("还没有看板", "现在构建一份?"):
                return
            self.act_build()
            return
        if read_watch_pid():
            webbrowser.open(f"http://127.0.0.1:8900/")
            return
        # 没在监听:后台起一个「只服务不监听」的进程
        def job(log):
            import socket
            from engine import server as SRV
            # 8900 可能还热着(上次的服务没退干净)—— 能连上就直接用
            s = socket.socket()
            try:
                s.connect(("127.0.0.1", 8900))
                s.close()
                log("本地服务已在运行。")
                return
            except OSError:
                s.close()
            try:
                httpd, port, url = SRV.start_server(self.proj, port=8900,
                                                    open_browser=False)
            except OSError:
                # 8900 被别的东西占了,退到 8800 起的第一个空端口
                httpd, port, url = SRV.start_server(self.proj, port=0,
                                                    open_browser=False)
                log(f"8900 被占用,改用 {port}。")
            log("看板地址:" + url)
            # 这个后台任务本来就要一直挂着(server_forever 在线程里),
            # 进度窗的完成回调在这儿永远不会跑 —— 没关系,
            # 服务本来就是「一直开着的」。
            while True:
                time.sleep(3600)
        self._run_bg("打开看板", job, on_done=lambda: None)
        threading.Timer(1.5, lambda: webbrowser.open(
            "http://127.0.0.1:8900/")).start()

    def act_rescan(self):
        d = self.proj.source
        if not d.is_dir():
            messagebox.showerror("没有源数据", f"{d} 不存在")
            return
        files = [p for p in d.glob("*.xls*") if not p.name.startswith("~$")]
        if not files:
            messagebox.showwarning(
                "1_源数据 里没有表",
                f"{d}\n\n请把 BOM 表(xlsx)放进去,再点一次「扫描源数据」。")
            return
        # discover 会逐个打开 xlsx 探测,同步跑会卡住界面
        box = []

        def job(log):
            log(f"正在探测 {len(files)} 个表…")
            box.append(probe.discover(d))
            log(f"探测到 {len(box[0])} 个可用表。")

        def done():
            found = box[0] if box else []
            if not found:
                messagebox.showwarning(
                    "没找到可用的表",
                    "表里需要含「图号/名称」表头,且有红底色标记。")
                return
            open_window(ImportWindow, self, d, found, self._after_import,
                        existing_root=self.proj.root).show()

        self._run_bg("扫描源数据", job, on_done=done)

    # ================= 程序内查看(P12)=================
    def act_view_files(self):
        """挑一个交付物/表格,在**程序内**看。

        本人要求:STEP、工程图、表格都要能在 exe 里直接看,不跳浏览器、
        也不强制调外部软件。同时保留「用本地软件打开」作为可选项。
        """
        from tkinter import filedialog
        from engine import viewer as V
        proj = self.proj
        if proj is None:
            messagebox.showinfo("还没选项目", "先选一个项目。")
            return
        f = filedialog.askopenfilename(
            title="选一个文件在程序内查看",
            initialdir=str(proj.root),
            filetypes=[("能程序内看的", "*.step *.stp *.stl *.obj *.ply *.pdf *.xlsx"),
                       ("3D 模型", "*.step *.stp *.stl *.obj *.ply"),
                       ("工程图 PDF", "*.pdf"),
                       ("表格", "*.xlsx"),
                       ("全部文件", "*.*")])
        if not f:
            return
        V.Viewer(self, f)

    def act_dash_native(self):
        """原生看板 —— **完全不经过浏览器**(本人要求)。

        HTML 看板必须靠浏览器内核才能跑,而 exe 里嵌一个 WebView
        等于还是「在浏览器里看」。所以这里用 Tk 控件重画一份:
        统计卡 + 零件表 + 缺失清单,**只读**。
        """
        from engine import dashview
        proj = self.proj
        if proj is None:
            messagebox.showinfo("还没选项目", "先选一个项目。")
            return
        try:
            dashview.DashView(self, proj)
        except Exception as e:
            import traceback
            messagebox.showerror(
                "看板打不开",
                f"{type(e).__name__}: {e}\n\n"
                f"项目:{proj.root}\n\n"
                "如果刚改过源表,先点「开始检测」再试。\n\n"
                + traceback.format_exc(limit=3))

    def open_doc(self, path):
        """打开一份内置文档。

        Markdown 用系统默认程序打开。**打不开就明说** ——
        静默失败的话,本人在别人机器上点「说明书」什么反应都没有,
        只会以为这个功能坏了。
        """
        p = Path(path)
        if not p.is_file():
            # 打包后资源可能落在 _internal,再兜一层
            for alt in (paths.RES_DIR, paths.TPL_DIR, paths.APP_DIR):
                q = Path(alt) / p.name
                if q.is_file():
                    p = q
                    break
        if not p.is_file():
            messagebox.showerror(
                "找不到文档",
                f"{Path(path).name} 不在程序目录里。\n\n"
                f"查找位置:\n  {Path(path).parent}\n\n"
                "源码运行时应在 D:\\助手工程师\\ ;"
                "打包后应在 exe 同级目录下。")
            return
        try:
            if os.name == "nt":
                os.startfile(str(p))          # noqa: S606
            else:
                import webbrowser
                webbrowser.open(p.as_uri())
        except Exception as e:
            messagebox.showerror("打不开", f"{p}\n\n{e}")

    def act_template(self):
        """取标准 BOM 模板。放到桌面,双击就能填。"""
        import shutil as _sh
        src = paths.BOM_TPL
        if not src.is_file():
            messagebox.showerror(
                "找不到模板",
                f"{src}\n\n源码运行时应在 D:\\助手工程师\\templates\\ ;"
                "打包后应在 exe 同级目录下。")
            return
        # ★ 桌面**不一定在 C 盘**。本人的桌面在 D:\Desktop,
        #   `Path.home()/"Desktop"` 会落到 C:\Users\Administrator\Desktop
        #   —— 一个他平时根本看不到的目录,文件存进去等于丢了。
        #   一律走 paths.desktop_dir(),它问注册表要真实路径。
        dst_dir = paths.desktop_dir()
        if not dst_dir.is_dir():
            dst_dir = Path.cwd()
        dst = dst_dir / src.name
        try:
            _sh.copy2(src, dst)
        except OSError as e:
            messagebox.showerror("复制失败", f"{e}")
            return
        extra = ""
        if paths.BOM_TPL_MD.is_file():
            try:
                _sh.copy2(paths.BOM_TPL_MD,
                          dst_dir / paths.BOM_TPL_MD.name)
                extra = f"\n说明书也一起放好了:{paths.BOM_TPL_MD.name}"
            except OSError:
                pass
        messagebox.showinfo(
            "模板已取出",
            f"{dst}\n\n"
            "填的时候注意:\n"
            "· 文件名要带分类名(如 机加工件物料表.xlsx)\n"
            "· 数据从第 4 行开始,不要删列、不要调列序\n"
            "· 交付物两列的表头文字不能改\n"
            "· 填了交付物文件名 = 需要(计入齐套率);留空 = 不需要" + extra)

    def act_detect(self):
        """开始检测 —— 恢复自动检测 + 扫一遍文件夹,增量识别变更。

        「扫描源数据」是给**还没导入过的项目**用的(要去选表);
        这里是给**已经导入过**的项目用的:你把新 STEP 丢进源目录、
        或者改了源表,点一下就能识别并重建,不用重新走一遍导入。

        P6:导出定档后自动检测是暂停的,这个按钮同时负责恢复。
        故意不另做一个「恢复」按钮 —— 两个按钮干一件事,
        迟早只记得点其中一个,另一个就永远停在那儿了。
        """
        proj = self.proj
        cfg = C.with_defaults(C.load(proj))
        n_src = len(cfg.get("sources") or []) + len(cfg.get("bomSources") or [])
        if not n_src:
            messagebox.showwarning(
                "还没有源表",
                "这个项目还没导入过任何表。\n\n"
                "请先点「扫描源数据」完成第一次导入。")
            return
        if proj.is_paused():
            info = proj.pause_info()
            proj.set_paused(False, log=lambda m: None)

        box = {}
        was_paused = False

        def job(log):
            nonlocal was_paused
            # 恢复必须在**扫描之前**做。顺序反了的话:扫描时还处于暂停,
            # 万一这期间有变动,会被当成「本来就这样」而永远补不上。
            if proj.is_paused():
                was_paused = True
                info = proj.pause_info()
                log(f"恢复自动检测(暂停于 {info.get('at', '?')}"
                    + (f",原因:{info.get('reason')}" if info.get("reason") else "")
                    + ")")
                proj.set_paused(False, log=log)
            log(f"正在扫描 {proj.root} …")
            d, rebuilt = build_core.run_scan(proj, apply_change=True, log=log)
            box["d"] = d
            box["rebuilt"] = rebuilt

        def done():
            d = box.get("d") or {}
            rebuilt = box.get("rebuilt")
            self.refresh_status()
            if not d.get("any"):
                extra = "\n\n自动检测已恢复。" if was_paused else ""
                messagebox.showinfo("没有变化",
                                    "源表和交付物都没有变动,已跳过重建。" + extra)
                return
            # 变更明细 —— 让人敢点「重建」。只说「变了」没人知道变了什么。
            lines = []
            if d["src_changed"]:
                lines.append("源表改动:")
                lines += [f"  · {n}  —  {w}" for n, w in d["src_changed"][:10]]
                if len(d["src_changed"]) > 10:
                    lines.append(f"  … 还有 {len(d['src_changed']) - 10} 张")
            if d["src_renamed"]:
                lines.append("源表改名:")
                lines += [f"  · {a} → {b}" for a, b in d["src_renamed"][:10]]
            for key, lab in (("del_added", "新增交付物"),
                             ("del_updated", "内容已更新"),
                             ("del_removed", "已移出")):
                if d[key]:
                    lines.append(f"{lab}({len(d[key])}):")
                    lines += [f"  · {r}" for r in d[key][:8]]
                    if len(d[key]) > 8:
                        lines.append(f"  … 还有 {len(d[key]) - 8} 个")
            body = "\n".join(lines)
            tail = ("\n\n已完成重建。" if rebuilt else "\n\n(未重建)")
            dlg = tk.Toplevel(self)
            dlg.title("检测结果")
            dlg.configure(bg=BG)
            dlg.transient(self)
            dlg.geometry("700x480")
            dlg.minsize(540, 320)
            f = ttk.Frame(dlg, padding=20)
            f.pack(fill="both", expand=True)
            ttk.Label(f, text="🔍 检测文件夹变更", style="H2.TLabel").pack(
                anchor="w", pady=(0, 10))
            from tkinter import scrolledtext
            box2 = scrolledtext.ScrolledText(
                f, height=18, wrap="word", bg=T.CARD, fg=T.FG,
                insertbackground=T.FG, relief="flat", bd=0)
            box2.pack(fill="both", expand=True)
            box2.insert("1.0", body + tail)
            box2.configure(state="disabled")
            ttk.Button(f, text="关闭", style="Accent.TButton",
                       command=dlg.destroy).pack(pady=(12, 0))

        self._run_bg("检测文件夹变更", job, on_done=done)

    def act_rules(self):
        open_window(RulesWindow, self, self.proj, self.refresh_status).show()

    def act_export_html(self):
        """人工核对完成后,导出可外发的单文件 HTML。"""
        proj = self.proj
        if not any(proj.bom.glob("*.xlsx")):
            messagebox.showinfo("还没有表", "请先点「① 构建 BOM 表 + 看板」。")
            return
        dlg = tk.Toplevel(self)
        dlg.title("导出核对版 HTML")
        dlg.configure(bg=BG)
        dlg.transient(self)
        dlg.resizable(False, False)
        f = ttk.Frame(dlg, padding=22)
        f.pack(fill="both", expand=True)
        ttk.Label(f, text="导出核对版 HTML", style="H2.TLabel").pack(anchor="w")
        ttk.Label(f, text="从 2_BOM表 里读取你核对完的最终内容 —— "
                          "手动改过的材料/数量/备注/图号都会如实反映。",
                  style="Dim.TLabel", font=(FONT, 9), wraplength=420,
                  justify="left").pack(anchor="w", pady=(4, 14))
        n_tbl = len(list(proj.bom.glob("*.xlsx")))
        ttk.Label(f, text=f"将读取 {n_tbl} 张表", style="Dim.TLabel").pack(anchor="w")
        opt = ttk.Frame(f)
        opt.pack(anchor="w", pady=10)
        self.x_open = tk.BooleanVar(value=True)
        _cb(opt, "导出后立刻用浏览器打开", self.x_open, bg=BG).pack(anchor="w")
        self.x_copy = tk.BooleanVar(value=False)
        _cb(opt, "另存到桌面(方便发给别人)", self.x_copy, bg=BG).pack(anchor="w")
        btns = ttk.Frame(f)
        btns.pack(anchor="e", pady=(12, 0))

        def go():
            from build_core import run_export_html
            # 同上:桌面要问注册台要,不能拿 home 拼。
            dest = paths.desktop_dir() if self.x_copy.get() else None
            want_open = self.x_open.get()
            dlg.destroy()                      # 先关对话框,再开进度窗

            def done(out):
                if out and want_open:
                    webbrowser.open(Path(out).as_uri())
                self.refresh_status()

            self._run_bg("导出核对版 HTML",
                         lambda log: run_export_html(proj, dest, log),
                         on_done=done)

        ttk.Button(btns, text="取消", style="Ghost.TButton",
                   command=dlg.destroy).pack(side="right", padx=(6, 0))
        ttk.Button(btns, text="开始导出", style="Accent.TButton",
                   command=go).pack(side="right")
        present(dlg, modal=True, parent=self)

    def act_export(self):
        proj = self.proj
        dest = filedialog.asksaveasfilename(
            title="打包交付", defaultextension=".zip",
            initialfile=f"{proj.name}_加工包_{datetime.now():%Y%m%d}.zip",
            filetypes=[("zip", "*.zip")])
        if not dest:
            return

        def job(log):
            from build_core import run_export
            run_export(proj, Path(dest), log=log)

        # 打包几十 MB 会明显卡顿,必须放后台
        self._run_bg("打包交付", job,
                     on_done=lambda: messagebox.showinfo(
                         "打包完成", f"{dest}\n\n看板请单独发送:\n{proj.html}"))

    def act_doctor(self):
        from build_core import run_doctor
        self._run_bg("环境自检", run_doctor)


# ==========================================================================
# 导入向导
# ==========================================================================
class ImportWindow(tk.Toplevel):
    def __init__(self, app, src: Path, found: list, on_done, existing_root=None):
        super().__init__(app)
        self.app, self.src, self.found = app, src, found
        self.on_done = on_done
        self.existing_root = existing_root
        self.vars = [tk.BooleanVar(value=True) for _ in found]
        self.red_vars = {}          # {序号: StringVar} 选中的标记列字母
        self.title("导入 BOM 表")
        self.configure(bg=BG)
        self.geometry("880x620")
        self.minsize(760, 480)
        self.transient(app)
        f = ttk.Frame(self, padding=18)
        f.pack(fill="both", expand=True)
        ttk.Label(f, text="导入 BOM 表", style="H2.TLabel").pack(anchor="w")
        ttk.Label(f, text=f"来源目录: {src}", style="Dim.TLabel",
                  font=(FONT, 9)).pack(anchor="w", pady=(2, 0))
        ttk.Label(f, text=f"自动探测到 {len(found)} 个可用表 —— 取消不需要的:",
                  style="Dim.TLabel").pack(anchor="w", pady=(10, 0))

        body = ttk.Frame(f)
        body.pack(fill="both", expand=True, pady=6)
        scroll = ttk.Scrollbar(body, orient="vertical")
        scroll.pack(side="right", fill="y")
        inner = ttk.Frame(body)
        inner.pack(side="left", fill="both", expand=True)
        for i, p in enumerate(found):
            card = ttk.Frame(inner, style="Card.TFrame", padding=1)
            card.pack(fill="x", pady=3)
            box = ttk.Frame(card, style="Card.TFrame", padding=(12, 8))
            box.pack(fill="x")
            top = ttk.Frame(box, style="Card.TFrame")
            top.pack(fill="x")
            _cb(top, f"[{p.get('tag') or '?'}] {p['name']}", self.vars[i],
                font=(FONT, 10, "bold")).pack(side="left")
            ttk.Label(top, text=f"图片 {'有' if p['cellImages'] else '无'}",
                      style="Dim.TLabel", font=(FONT, 8)).pack(side="right")
            ttk.Label(box, text="列: " + "  ".join(
                f"{k}={v}" for k, v in p["columns"].items()),
                style="Dim.TLabel", font=(FONT, 8)).pack(anchor="w")
            secs = list(dict.fromkeys(p.get("sectionList", [])))[:10]
            if secs:
                ttk.Label(box, text="分类段: " + " / ".join(secs),
                          style="Dim.TLabel", font=(FONT, 8)).pack(anchor="w")

            # 「新改动」标记列:有多个候选时必须让人明确选
            allc = p.get("redAllColumns") or {}
            if allc:
                line = ttk.Frame(box, style="Card.TFrame")
                line.pack(fill="x", pady=(3, 0))
                ttk.Label(line, text="「新改动」标记列:",
                          style="Dim.TLabel", font=(FONT, 8)).pack(side="left")
                var = self.red_vars.setdefault(i, tk.StringVar())
                if not var.get():
                    var.set(str(p.get("redColumn") or ""))
                for colname, cnt in allc.items():
                    mark = " ★" if p.get("redAmbiguous") and \
                        colname == p.get("redColumn") else ""
                    # 必须用 tk 版:ttk.Radiobutton 不接受
                    # background / activebackground / selectcolor,
                    # 传了直接 TclError: unknown option "-background"
                    tk.Radiobutton(
                        line, text=f"{colname}({cnt}){mark}", variable=var,
                        value=colname, bg=PANEL, fg=FG,
                        activebackground=PANEL, activeforeground=FG,
                        selectcolor=PANEL, anchor="w", highlightthickness=0,
                        bd=0, font=(FONT, 8)).pack(side="left", padx=(6, 0))
            if p.get("redAmbiguous"):
                ttk.Label(box, text="⚠ 多列红底数量接近,请确认哪一列是「新改动」标记",
                          style="Dim.TLabel", font=(FONT, 8),
                          foreground=WARN).pack(anchor="w")
            if p.get("notes"):
                ttk.Label(box, text="注意: " + "; ".join(p["notes"]),
                          style="Dim.TLabel", font=(FONT, 8),
                          foreground=WARN).pack(anchor="w")

        foot = ttk.Frame(f)
        foot.pack(fill="x", pady=(8, 0))
        ttk.Label(foot, text="项目名", style="Dim.TLabel").pack(side="left")
        # 默认名优先从表名推断,比用目录名靠谱 ——
        # 目录多半叫「源表」「新表」「BOM」这类没信息量的名字。
        default = existing_root.name if existing_root else _guess_proj_name(
            found, src)
        self.name_var = tk.StringVar(value=default)
        ttk.Entry(foot, textvariable=self.name_var, width=26).pack(
            side="left", padx=(6, 10))
        self.copy_var = tk.BooleanVar(value=True)
        _cb(foot, "把源表复制进项目", self.copy_var, bg=BG).pack(side="left")
        ttk.Button(foot, text="取消", style="Ghost.TButton",
                   command=self.destroy).pack(side="right", padx=(6, 0))
        self._btn_import = ttk.Button(foot, text="导入并继续",
                                      style="Accent.TButton",
                                      command=self._do)
        self._btn_import.pack(side="right")

    def show(self):
        """置顶 + 抢焦点 + 模态。

        旧版根本没有这个方法,调用即 AttributeError —— 窗口已经建出来,
        却是个点不动、按钮全无反应的壳。
        """
        present(self, modal=True, parent=self.app)
        return self

    def _do(self):
        chosen = [p for i, p in enumerate(self.found) if self.vars[i].get()]
        if not chosen:
            messagebox.showwarning("没有选择", "至少选一个表", parent=self)
            return
        name = self.name_var.get().strip()
        if not name:
            messagebox.showwarning("缺少项目名", "请填项目名", parent=self)
            return
        root = self.existing_root or (APP_DIR / "项目" / name)
        if (root / paths.LAYOUT["config"]).is_file() and not self.existing_root:
            if not messagebox.askyesno("项目已存在",
                                       f"{root}\n\n要合并进这个项目吗?",
                                       parent=self):
                return
        from build_core import do_import
        # 先把界面上选的标记列写回探测结果
        for i, p in enumerate(chosen):
            var = self.red_vars.get(i)
            if var and var.get():
                p["redColumn"] = col_to_num(var.get())
        proj = paths.Project(root)
        pname, on_done, src, chosen2 = proj.name, self.on_done, self.src, chosen
        do_copy = self.copy_var.get()
        # 导入要复制 xlsx + 解析,放后台跑,本窗口立刻关掉,界面不会僵住。
        # 注意 _run_bg 定义在 App 上,这里是 Toplevel —— 必须走 self.app。
        # 旧版误写成 self._run_bg,一点「导入并继续」就抛
        # AttributeError,异常被兜底钩子吞进日志,界面看起来"点了没反应"。
        try:
            self.app._run_bg("导入中",
                             lambda log: do_import(proj, pname, src, chosen2,
                                                   copy=do_copy, log=log),
                             on_done=lambda: on_done(pname, root))
        except Exception as e:
            # 进度窗起不来就别把导入窗口也关掉,至少让用户看见原因
            self.app._log_crash(traceback.format_exc())
            messagebox.showerror("导入失败", str(e), parent=self)
            return
        self.destroy()


# ==========================================================================
# 分类规则窗口
# ==========================================================================
class RulesWindow(tk.Toplevel):
    def __init__(self, app, proj, on_change):
        super().__init__(app)
        self.app, self.proj, self.on_change = app, proj, on_change
        self.title("分类规则")
        self.configure(bg=BG)
        self.geometry("900x640")
        self.transient(app)
        self._built = False
        self._build()

    def _build(self):
        if self._built:
            return
        self._built = True
        f = ttk.Frame(self, padding=18)
        f.pack(fill="both", expand=True)
        ttk.Label(f, text="分类规则", style="H2.TLabel").pack(anchor="w")
        ttk.Label(f, text="开放段(如「机加件」)里加工件和标准件混在一起,"
                          "靠下面两条规则细分。",
                  style="Dim.TLabel").pack(anchor="w", pady=(2, 8))
        self._frame = f

        cfg = C.with_defaults(C.load(self.proj))
        cfg["_proj_root"] = str(self.proj.root)
        self.cfg = cfg
        cats = cfg["categories"]
        if not cfg["sources"]:
            # 这个项目只有 BOM 表(按分类拆好的最终表),没有零件表。
            # 开放段细分规则只对零件表有意义,这里必须说清楚,
            # 否则用户看到「共 0 行」会以为规则被清空了。
            ttk.Label(f, style="Dim.TLabel", foreground=WARN,
                      text="这个项目只有 BOM 表,没有零件表。"
                           "开放段细分只对零件表生效,"
                           "导入零件表后这里才会有内容。"
                      ).pack(anchor="w", pady=(0, 10))
            return
        recs = core.extract(cfg, log=lambda m: None)
        opens = set(cats.get("openSections") or [])
        pool = [r for r in recs if r.get("section") in opens] if opens \
            else [r for r in recs if r["cat"] == cats["unmatchedCategory"]]

        ttk.Label(f, text=f"开放段 {sorted(opens) or '(未设置)'} 共 {len(pool)} 行",
                  style="Dim.TLabel").pack(anchor="w")

        frm = ttk.Frame(f)
        frm.pack(fill="both", expand=True, pady=8)
        cols = ttk.Frame(frm)
        cols.pack(fill="both", expand=True)

        # 左:前缀 (ttk.LabelFrame 不支持 background 参数,改用 tk.LabelFrame)
        lf = tk.LabelFrame(cols, text="图号前缀 → 加工件", bg=PANEL, fg=ACC,
                           font=(FONT, 10, "bold"), bd=1, relief="flat",
                           highlightthickness=1, highlightbackground=LINE)
        lf.pack(side="left", fill="both", expand=True, padx=(0, 6))
        groups = {}
        for r in pool:
            pn = r["pn"]
            if not pn:
                continue
            g = next((pn[:n] for n in (4, 3, 2)
                      if pn[:n].replace("_", "").replace("-", "").isalnum()), pn[:2])
            groups.setdefault(g, []).append(r)
        self.pre_vars = {}
        cur = {x.lower() for x in cats["machinedPrefixes"]}
        for g, rs in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:40]:
            v = tk.BooleanVar(value=g.lower() in cur)
            self.pre_vars[g] = v
            _cb(lf, f"{g}   ({len(rs)})  "
                     f"{sorted({x['nm'] for x in rs if x['nm']})[:1]}",
                v).pack(anchor="w", fill="x")
        self.pre_text = tk.Text(lf, height=6, bg=T.CARD_LO, fg=FG, relief="flat",
                                font=("Consolas", 9), wrap="char")
        self.pre_text.pack(fill="x", pady=(6, 0))
        self.pre_text.insert("1.0", ", ".join(cats["machinedPrefixes"]))

        # 右:关键字
        rf = tk.LabelFrame(cols, text="名称/图号关键字 → 外购件", bg=PANEL, fg=ACC,
                           font=(FONT, 10, "bold"), bd=1, relief="flat",
                           highlightthickness=1, highlightbackground=LINE)
        rf.pack(side="left", fill="both", expand=True, padx=(6, 0))
        hits = {}
        for w in C.COMMON_PURCHASE_WORDS:
            n = sum(1 for r in pool if w in f'{r["pn"]} {r["nm"]}')
            if n:
                hits[w] = n
        self.kw_vars = {}
        kcur = {x.lower() for x in cats["purchaseKeywords"]}
        for w, n in sorted(hits.items(), key=lambda kv: -kv[1])[:30]:
            v = tk.BooleanVar(value=w.lower() in kcur)
            self.kw_vars[w] = v
            _cb(rf, f"{w}   ({n})", v).pack(anchor="w", fill="x")
        self.kw_text = tk.Text(rf, height=6, bg=T.CARD_LO, fg=FG, relief="flat",
                               font=("Consolas", 9), wrap="char")
        self.kw_text.pack(fill="x", pady=(6, 0))
        self.kw_text.insert("1.0", ", ".join(cats["purchaseKeywords"]))

        btns = ttk.Frame(f)
        btns.pack(fill="x")
        ttk.Button(btns, text="全部前缀", style="Ghost.TButton",
                   command=lambda: self._bulk(self.pre_vars, True)).pack(
            side="left", padx=(0, 4))
        ttk.Button(btns, text="清空前缀", style="Ghost.TButton",
                   command=lambda: self._bulk(self.pre_vars, False)).pack(
            side="left", padx=(0, 10))
        ttk.Button(btns, text="全部关键字", style="Ghost.TButton",
                   command=lambda: self._bulk(self.kw_vars, True)).pack(
            side="left", padx=(0, 4))
        ttk.Button(btns, text="清空关键字", style="Ghost.TButton",
                   command=lambda: self._bulk(self.kw_vars, False)).pack(
            side="left")
        ttk.Button(btns, text="保存并重建", style="Accent.TButton",
                   command=self._save).pack(side="right")

    def show(self):
        """置顶 + 抢焦点 + 模态。旧版没有这个方法,调用即 AttributeError。"""
        present(self, modal=True, parent=self.app)
        return self

    def _bulk(self, d, val):
        for v in d.values():
            v.set(val)

    def _save(self):
        from build_core import run_build
        cats = self.cfg["categories"]
        picked = [g for g, v in self.pre_vars.items() if v.get()]
        manual = self.pre_text.get("1.0", "end").replace("\n", " ").strip()
        if manual:
            picked += [x.strip() for x in manual.replace("，", ",").split(",")
                       if x.strip()]
        cats["machinedPrefixes"] = sorted(set(picked))
        kw = [w for w, v in self.kw_vars.items() if v.get()]
        manual2 = self.kw_text.get("1.0", "end").replace("\n", " ").strip()
        if manual2:
            kw += [x.strip() for x in manual2.replace("，", ",").split(",")
                   if x.strip()]
        cats["purchaseKeywords"] = sorted(set(kw))
        self.proj.save(self.cfg)
        self.on_change()
        # grab_set 过的窗口 destroy 时会释放 grab,但若此时有模态框会打架 ——
        # 先放掉再关,避免留下抓不到鼠标的「幽灵窗口」。
        try:
            self.grab_release()
        except tk.TclError:
            pass
        self.destroy()
        self.app._run_bg("按新规则重建", lambda log: run_build(self.proj, log=log))


# ==========================================================================
# 辅助
# ==========================================================================
def json_deepcopy(obj):
    import copy
    return copy.deepcopy(obj)


def _ask_dir(var):
    d = filedialog.askdirectory(title="选择存放位置", initialdir=var.get())
    if d:
        var.set(d)


def col_to_num(letter: str) -> int:
    """列字母 -> 列号,如 'H' -> 8"""
    from openpyxl.utils import column_index_from_string
    try:
        return column_index_from_string(letter.strip().upper())
    except Exception:
        return 0


def read_watch_pid():
    try:
        from stop_watch import read_pid
        return read_pid()
    except Exception:
        return None


def start_watch(proj):
    """派生后台监听。冻结成 exe 后靠参数而非脚本路径。"""
    if paths.is_frozen():
        args = [sys.executable, "watch", str(proj.root), "--serve"]
    else:
        args = [sys.executable, str(APP_DIR / "sheep.py"), "watch",
                str(proj.root), "--serve"]
    return subprocess.Popen(args, creationflags=0x00000008 | 0x00000200)


def stop_watch(log=print):
    """停掉监听。

    subprocess.run 必须给 timeout —— 监听进程要是卡死,没有超时的 run
    会把界面线程一起锁死,表现就是「点了没反应 + 关不掉」。
    """
    if paths.is_frozen():
        args = [sys.executable, "bg-stop"]
    else:
        args = [sys.executable, str(APP_DIR / "sheep.py"), "bg-stop"]
    try:
        r = subprocess.run(args, capture_output=True, timeout=15)
        log(f"停止监听(退出码 {r.returncode})")
        return True
    except subprocess.TimeoutExpired:
        log("⚠ 停止监听超时(15s),进程可能已卡死。"
            "可手动结束:任务管理器里找 python/助手工程师 进程。")
        return False
    except Exception as e:
        log(f"停止监听失败: {e}")
        return False


def server_alive():
    return read_watch_pid()


def main():
    app = App()
    app.protocol("WM_DELETE_WINDOW", app._on_quit)
    if OPEN_PROJECT:
        try:
            app.open_project(OPEN_PROJECT)
        except Exception:
            pass
    try:
        app.mainloop()
    finally:
        # 后台线程还在跑时 after 回调会打到已销毁的窗口上,
        # 这里统一收干净,避免关窗时报一串 TclError。
        try:
            app._closing = True
        except Exception:
            pass


if __name__ == "__main__":
    main()
