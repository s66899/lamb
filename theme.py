# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— iOS 风格设计系统。

把「颜色 / 圆角 / 间距 / 字体 / 动效」集中到一处,界面代码只引用语义名,
不再到处写死色值。

设计取向参考 iOS 17~18:
  · 暗色为主,层次靠**微妙的明度差**而不是分割线堆砌
  · 圆角大而统一,分组卡片浮在背景上
  · 强调色用系统蓝,状态色用系统绿/橙/红
  · 动效走弹簧曲线,不做线性插值
  · 字体用系统 UI 字族,标题重、正文轻、辅助信息小而淡
"""

from __future__ import annotations

import math
import tkinter as tk
from tkinter import ttk

# ==========================================================================
# 1. 色板
# ==========================================================================
# 层级:底 -> 卡片 -> 卡片抬升 -> 浮层。相邻层明度差控制在 4~8%,
#       靠色阶而不是靠边框来表达"谁在上面"。
BG = "#0A0C10"          # 窗口底色(接近纯黑,iOS 深色模式的底)
BG_GRAD_TOP = "#12161D"  # 顶部渐变,制造纵深
CARD = "#151A22"        # 常规卡片
CARD_HI = "#1C232E"     # 抬升卡片 / hover
CARD_LO = "#101419"     # 凹陷(输入框、代码区)
SHEET = "#1A212B"       # 浮层(弹窗、进度窗)
LINE = "#242C38"        # 极淡的分隔线
LINE_HI = "#2F3947"     # 强调分隔线

FG = "#F2F5F9"          # 主文字
FG2 = "#A8B3C2"         # 次要文字
FG3 = "#6B7787"         # 三级文字/占位

ACC = "#0A84FF"         # 系统蓝
ACC_HI = "#3D9BFF"      # hover
ACC_DIM = "#17304A"     # 蓝调高亮底(实色,Tk 不支持 alpha)
ACC_SOFT = "#12243A"    # 蓝色系的暗色底

# ★ 三个 DIM 底色**整体提亮了一档**。
#   原值(#13301C / #33260F / #331616)离背景色 CARD(#151A22)太近,
#   深色主题下「合格 / 不合格 / 返工」这几个标签看着像一团糊,本人说
#   「暗暗的不好看到」。现在底色明显比卡片亮一档、字色也换成高亮档,
#   扫一眼就能分出状态。
#   ⚠ Tk 不支持 8 位十六进制(带 alpha),只能靠实色分层近似 ——
#     所以改亮只能改实色本身,不能用半透明。
OK = "#5BE37F"
OK_DIM = "#1B5C36"
WARN = "#FFC24A"
WARN_DIM = "#6B4A0E"
BAD = "#FF7A70"
BAD_DIM = "#6B2028"
PURPLE = "#BF5AF2"
PURPLE_DIM = "#2A1836"
ORANGE = "#FF9F0A"

# Tk 不支持 #RRGGBBAA 的 8 位十六进制透明度(#0000003D 会直接报
# invalid color name),投影只能用实色分层模拟:底色越接近黑,
# 叠上去的深色越"透"。
SHADOW = "#05070A"
SHADOW_SOFT = "#0D1116"

# ==========================================================================
# 2. 字体
# ==========================================================================
# Windows 上没有 SF Pro。用系统 UI 字族回退:
#   "Segoe UI Variable"  Win11 自带,最接近 SF
#   "Microsoft YaHei UI"  中文系统自带,字形干净
UI_STACK = ("Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI",
            "PingFang SC", "Helvetica Neue", "Arial")
DISPLAY_STACK = ("Segoe UI Variable Display", "Segoe UI Semibold",
                 "Microsoft YaHei UI", "PingFang SC")
MONO_STACK = ("Cascadia Mono", "Consolas", "SF Mono", "Menlo",
              "Microsoft YaHei UI")

FONT = UI_STACK[2]                       # 兼容旧代码引用
UI = UI_STACK
DISPLAY = DISPLAY_STACK
MONO = MONO_STACK


def font(size=13, weight="regular", mono=False):
    """iOS 字阶。

    weight 接受 regular / medium / semibold / bold,内部归一到 Tk 认识的
    normal / bold —— Tk 遇到 "regular" 会直接报
    TclError: unknown font style "regular"。

    重要:Tk 的 font 选项**不接受字体栈列表**。传 ('A','B',13,'bold')
    会报 "expected integer but got a list"。中英混排靠 Tk 自己的字体
    回退(缺字形时自动换字体),所以只给一个名字,
    精确宽度交给 measure()。
    """
    stack = MONO if mono else UI
    w = {"regular": "normal", "normal": "normal", "book": "normal",
         "medium": "normal", "semibold": "bold", "bold": "bold",
         "heavy": "bold"}.get(str(weight).lower(), "normal")
    return (stack[0], size, w)


def display(size=28, weight="bold"):
    return font(size, weight)


_MEASURE_CV = []


def measure(widget, text, fnt):
    """量文字的真实渲染宽度。

    Canvas 没有 `font measure` 子命令,按字符数估算在混排下会少算 60%
    (实测 128 vs 真实 210),按钮文字就会溢出胶囊。
    可靠办法:借一个离屏 Canvas 画一次,读它的 bbox。
    """
    cv = None
    for c in _MEASURE_CV:
        try:
            if c.winfo_exists():
                cv = c
                break
        except tk.TclError:
            continue
    if cv is None:
        try:
            cv = tk.Canvas(widget.winfo_toplevel(), width=1, height=1)
            _MEASURE_CV.append(cv)
        except tk.TclError:
            return int(len(text) * 8)
    try:
        tid = cv.create_text(0, 0, text=text, font=fnt)
        bb = cv.bbox(tid)
        cv.delete(tid)
        if bb:
            return bb[2] - bb[0]
    except tk.TclError:
        pass
    return int(len(text) * 8)



# 字阶(对齐 iOS Dynamic Type 的常用档位)
T_TITLE = display(30, "bold")        # 大标题
T_H1 = display(22, "bold")          # 页面标题
T_H2 = display(17, "bold")          # 卡片标题
T_H3 = font(14, "bold")             # 分组标题
T_BODY = font(13)                   # 正文
T_BODY_STRONG = font(13, "bold")
T_CALL = font(12)                   # 次要
T_FOOT = font(11)                   # 辅助
T_FOOT_STRONG = font(11, "bold")
T_TINY = font(10)                   # 极小(角标)
T_MONO = font(12, mono=True)
T_NUM = display(19, "bold")         # 数字强调

# 短别名(界面里写起来顺一点)
TINY = T_TINY
FOOT = T_FOOT
BODY = T_BODY
H2F = T_H2
H3F = T_H3

# ==========================================================================
# 3. 尺寸
# ==========================================================================
R_SM = 8        # 小圆角(输入框、按钮)
R_MD = 12       # 中(小卡片)
R_LG = 16       # 大(分组卡片)
R_XL = 22       # 特大(弹窗、浮层)
R_PILL = 999    # 胶囊

S1, S2, S3, S4, S5, S6 = 4, 8, 12, 16, 20, 28
S7, S8 = 36, 48


# ==========================================================================
# 4. 动效
# ==========================================================================
# iOS 的手感来自弹簧(过冲后回稳),不是线性。
# Tk 没有动画框架,这里用 after 定时器做补间,帧率 60fps。

FPS = 60
FRAME_MS = int(1000 / FPS)


def ease_out_cubic(t: float) -> float:
    """减速缓出:起步快、收尾稳,iOS 大量使用。"""
    return 1 - (1 - t) ** 3


def ease_in_out(t: float) -> float:
    """两端慢中间快,用于页面切换。"""
    return 3 * t * t - 2 * t * t * t


def spring(t: float, damping: float = 0.62) -> float:
    """带轻微过冲的弹簧曲线。

    damping 越小回弹越明显。0.62 是 iOS 那种「刚好能看出来」的回弹,
    再小就会显得廉价。
    """
    if t >= 1.0:
        return 1.0
    # 阻尼谐振子闭式解,归一化到 t=1 时刚好收敛到 1
    return 1 - math.exp(-damping * 10 * t) * math.cos(2 * math.pi * 0.85 * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1: str, c2: str, t: float) -> str:
    """两个 #rrggbb 之间线性插值。"""
    r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
    r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
    r = round(lerp(r1, r2, t))
    g = round(lerp(g1, g2, t))
    b = round(lerp(b1, b2, t))
    return f"#{r:02x}{g:02x}{b:02x}"


class Tween:
    """在 Tk 主线程里跑的补间动画。

    用法:
        Tween(win, 300, on_step, start=0.0, end=1.0).start(ease_out_cubic)

    窗口被销毁时自动停止,不会抛 "invalid command name"。
    """

    def __init__(self, widget, duration_ms, on_step, start=0.0, end=1.0,
                 ease=ease_out_cubic, on_done=None):
        self.w = widget
        self.dur = max(1, int(duration_ms))
        self.on_step = on_step
        self.a, self.b = start, end
        self.ease = ease
        self.on_done = on_done
        self.t0 = 0
        self.alive = True

    def _tick(self):
        if not self.alive:
            return
        try:
            if not self.w.winfo_exists():
                self.alive = False
                return
            import time
            now = int(time.time() * 1000)
            if not self.t0:
                self.t0 = now
            raw = (now - self.t0) / self.dur
            if raw >= 1.0:
                raw = 1.0
            try:
                self.on_step(self.ease(raw), raw)
            except tk.TclError:
                self.alive = False
                return
            if raw >= 1.0:
                self.alive = False
                if self.on_done:
                    try:
                        self.on_done()
                    except tk.TclError:
                        pass
                return
            self.w.after(FRAME_MS, self._tick)
        except tk.TclError:
            self.alive = False

    def start(self, ease=None):
        if ease is not None:
            self.ease = ease
        try:
            self.w.after(FRAME_MS, self._tick)
        except tk.TclError:
            self.alive = False
        return self

    def cancel(self):
        self.alive = False


def pulse(widget, colors=(CARD, CARD_HI), duration=240, steps=12):
    """控件 hover 时的一次性背景过渡(比 iOS 的按下回弹更克制)。"""

    def step(e, _raw):
        try:
            widget.configure(bg=mix(colors[0], colors[1], e))
        except tk.TclError:
            pass

    return Tween(widget, duration, step).start()


def fade_in(widget, duration=320, start_alpha=0.0, step_alpha=None):
    """淡入 + 轻微上移,页面切换的标准进出场。

    Tk 不支持真透明,这里对背景色做插值来近似"淡入"
    (界面底色固定,所以从底色渐变到目标色 = 视觉上的淡入)。
    """
    try:
        parent_bg = widget.master.cget("bg")
    except tk.TclError:
        parent_bg = BG
    try:
        target = widget.cget("bg")
    except tk.TclError:
        target = CARD

    def step(e, raw):
        try:
            if step_alpha:
                step_alpha(e)
            dy = int(round(10 * (1 - e)))
            widget.place_configure(y=dy) if widget.winfo_manager() == "place" \
                else None
            widget.configure(bg=mix(parent_bg, target, e))
        except tk.TclError:
            pass

    return Tween(widget, duration, step).start()


# ==========================================================================
# 5. 控件工厂
# ==========================================================================
def style(root: tk.Misc):
    """把 ttk 主题刷成 iOS 观感。"""
    s = ttk.Style(root)
    try:
        s.theme_use("clam")
    except tk.TclError:
        pass
    s.configure(".", background=BG, foreground=FG, fieldbackground=CARD_LO,
                bordercolor=LINE, lightcolor=CARD, darkcolor=CARD,
                focuscolor=ACC, font=T_BODY, borderwidth=0,
                relief="flat", anchor="w")

    s.configure("TFrame", background=BG)
    s.configure("Card.TFrame", background=CARD)
    s.configure("Sheet.TFrame", background=SHEET)

    s.configure("TLabel", background=BG, foreground=FG, font=T_BODY)
    s.configure("Title.TLabel", background=BG, foreground=FG, font=T_TITLE)
    s.configure("H1.TLabel", background=BG, foreground=FG, font=T_H1)
    s.configure("H2.TLabel", background=BG, foreground=FG, font=T_H2)
    s.configure("H3.TLabel", background=BG, foreground=FG, font=T_H3)
    s.configure("Sub.TLabel", background=BG, foreground=FG2, font=T_CALL)
    s.configure("Foot.TLabel", background=BG, foreground=FG2, font=T_FOOT)
    s.configure("Dim.TLabel", background=BG, foreground=FG2, font=T_FOOT)
    s.configure("Tiny.TLabel", background=BG, foreground=FG3, font=T_TINY)
    s.configure("Num.TLabel", background=BG, foreground=FG, font=T_NUM)
    s.configure("Acc.TLabel", background=BG, foreground=ACC, font=T_BODY_STRONG)
    s.configure("Ok.TLabel", background=BG, foreground=OK, font=T_BODY_STRONG)
    s.configure("Warn.TLabel", background=BG, foreground=WARN, font=T_BODY_STRONG)
    s.configure("Bad.TLabel", background=BG, foreground=BAD, font=T_BODY_STRONG)

    # 卡片内的标签要跟卡片同色
    for st in ("Title", "H1", "H2", "H3", "Sub", "Foot", "Dim", "Num",
               "Acc", "Ok", "Warn", "Bad", "Tiny"):
        s.configure(f"{st}.Card.TLabel", background=CARD, foreground=FG)
    for st, col in (("Sub", FG2), ("Foot", FG2), ("Dim", FG2), ("Tiny", FG3)):
        s.configure(f"{st}.Card.TLabel", background=CARD, foreground=col)
    s.configure("Acc.Card.TLabel", background=CARD, foreground=ACC)
    s.configure("Ok.Card.TLabel", background=CARD, foreground=OK)
    s.configure("Warn.Card.TLabel", background=CARD, foreground=WARN)
    s.configure("Bad.Card.TLabel", background=CARD, foreground=BAD)

    # 按钮:扁平方角 + 悬停变亮(不做 iOS 那种大圆角胶囊,
    # 因为 Windows 上圆角按钮要靠 canvas 自绘,ttk 这层保持克制更稳)
    s.configure("TButton", background=CARD_HI, foreground=FG,
                borderwidth=0, focusthickness=0, relief="flat",
                padding=(14, 8), font=T_BODY)
    s.map("TButton",
          background=[("pressed", LINE_HI), ("active", ACC_SOFT),
                      ("disabled", CARD_LO)],
          foreground=[("disabled", FG3)])
    s.configure("Accent.TButton", background=ACC, foreground="#FFFFFF",
                padding=(16, 9), font=T_BODY_STRONG)
    s.map("Accent.TButton",
          background=[("pressed", "#0060DF"), ("active", ACC_HI),
                      ("disabled", CARD_LO)],
          foreground=[("disabled", FG3)])
    s.configure("Ghost.TButton", background=CARD, foreground=FG2,
                padding=(13, 8))
    s.map("Ghost.TButton",
          background=[("pressed", LINE), ("active", CARD_HI)],
          foreground=[("active", FG), ("disabled", FG3)])
    s.configure("Quiet.TButton", background=BG, foreground=ACC, padding=(8, 4))
    s.map("Quiet.TButton",
          background=[("pressed", BG), ("active", ACC_DIM)],
          foreground=[("active", ACC_HI)])

    s.configure("Treeview", background=CARD, fieldbackground=CARD,
                foreground=FG, rowheight=30, borderwidth=0,
                font=T_BODY)
    s.configure("Treeview.Heading", background=BG, foreground=FG2,
                font=T_FOOT_STRONG, relief="flat", padding=(8, 8),
                borderwidth=0)
    s.map("Treeview.Heading", background=[("active", CARD_HI)])
    s.map("Treeview", background=[("selected", ACC_SOFT)],
          foreground=[("selected", FG)])
    s.configure("Treeview.Browse", background=CARD)

    s.configure("TEntry", fieldbackground=CARD_LO, foreground=FG,
                insertcolor=FG, bordercolor=LINE, lightcolor=LINE,
                darkcolor=LINE, borderwidth=1, relief="flat",
                padding=(10, 8), font=T_BODY)
    s.map("TEntry", bordercolor=[("focus", ACC)])

    s.configure("TProgressbar", background=ACC, troughcolor=CARD_LO,
                bordercolor=CARD_LO, lightcolor=ACC, darkcolor=ACC,
                borderwidth=0, thickness=4)
    s.configure("Horizontal.TProgressbar", background=ACC,
                troughcolor=CARD_LO, borderwidth=0, thickness=4)
    s.configure("Vertical.TProgressbar", background=ACC,
                troughcolor=CARD_LO, borderwidth=0, thickness=4)

    s.configure("TSeparator", background=LINE)
    s.configure("TScrollbar", background=CARD_HI, troughcolor=BG,
                bordercolor=BG, arrowcolor=FG3, borderwidth=0,
                arrowsize=12)
    s.map("TScrollbar", background=[("active", LINE_HI)])

    s.configure("TCheckbutton", background=CARD, foreground=FG,
                font=T_BODY, focuscolor=ACC)
    s.configure("TRadiobutton", background=CARD, foreground=FG,
                font=T_BODY, focuscolor=ACC)
    return s


def checkbox(parent, text, var, bg=CARD, **kw):
    """ttk.Checkbutton 不支持自定义底色,这里用 tk 版并画成 iOS 的小方块。"""
    return tk.Checkbutton(parent, text=text, variable=var, bg=bg, fg=FG,
                          activebackground=bg, activeforeground=FG,
                          selectcolor=bg, anchor="w", highlightthickness=0,
                          bd=0, font=T_BODY, **kw)


def radio(parent, text, var, value, bg=CARD, **kw):
    return tk.Radiobutton(parent, text=text, variable=var, value=value, bg=bg,
                          fg=FG, activebackground=bg, activeforeground=FG,
                          selectcolor=bg, anchor="w", highlightthickness=0,
                          bd=0, font=T_BODY, **kw)


# ==========================================================================
# 6. 自绘组件
# ==========================================================================
class Card(tk.Canvas):
    """圆角 + 描边的容器。用 Canvas 自绘,因为 Tk 原生没有圆角。

    背景色通过一个内嵌 Frame 承载子控件,Canvas 只画壳。
    """

    def __init__(self, parent, bg=CARD, radius=R_LG, border=LINE,
                 shadow=False, auto_height=True, **kw):
        kw.pop("height", None)
        kw.pop("width", None)
        super().__init__(parent, bg=parent.cget("bg"), highlightthickness=0,
                         bd=0, height=60, **kw)
        self._bg = bg
        self._radius = radius
        self._border = border
        self._shadow = shadow
        self._pad = shadow and 10 or 0
        self._auto_h = auto_height
        self._fixed_h = 0
        self._shell = []            # 壳图形的 item id,重绘时按 id 删,避免叠加
        self.body = tk.Frame(self, bg=bg)
        self._body_win = self.create_window(
            self._pad, self._pad, anchor="nw", window=self.body,
            width=0, height=0, tags="body")
        self.bind("<Configure>", self._on_resize, add="+")
        # 内容变高时卡片跟着长高,否则文字会被裁掉(旧版 height=96 写死就踩过)
        self.body.bind("<Configure>", self._fit_height, add="+")
        self._on_resize()

    def _fit_height(self, _e=None):
        if not self._auto_h:
            return
        try:
            need = self.body.winfo_reqheight() + 2 * self._pad
            cur = self.winfo_height()
            if cur > 1 and abs(need - cur) > 1:
                self.configure(height=need)
        except tk.TclError:
            pass

    def set_bg(self, color):
        """改卡片底色(动效每帧调一次)。"""
        self._bg = color
        try:
            self.body.configure(bg=color)
        except tk.TclError:
            pass
        self._on_resize()

    def _clear_shell(self):
        for i in self._shell:
            try:
                self.delete(i)
            except tk.TclError:
                pass
        self._shell = []

    def _on_resize(self, event=None):
        w = max(1, self.winfo_width())
        if self._auto_h:
            try:
                h = max(self.body.winfo_reqheight() + 2 * self._pad,
                        self.winfo_height())
            except tk.TclError:
                h = max(1, self.winfo_height())
        else:
            h = max(1, self.winfo_height())
        self._clear_shell()
        r = min(self._radius, w // 2, h // 2)
        pad = self._pad

        if self._shadow:
            # 两层错位的圆角矩形近似投影:iOS 的阴影很柔很淡
            for off, col in ((7, SHADOW_SOFT), (3, SHADOW)):
                it = self.create_rounded(
                    pad + off * 0.4, pad + off, w - 2 * pad, h - 2 * pad,
                    r, fill=col, outline="")
                if it:
                    self._shell.append(it)

        it = self.create_rounded(pad, pad, w - 2 * pad, h - 2 * pad, r,
                                 fill=self._bg, outline=self._border or "")
        if it:
            self._shell.append(it)
        self.tag_lower("body")
        try:
            self.itemconfigure(self._body_win, width=w - 2 * pad,
                               height=h - 2 * pad)
        except tk.TclError:
            pass

    def create_rounded(self, x, y, w, h, r, fill="", outline=""):
        """圆角矩形(用平滑多边形近似)。"""
        pts = rounded_points(x, y, w, h, r)
        if not pts:
            return
        return self.create_polygon(pts, fill=fill, outline=outline,
                                   width=1 if outline else 0)


class ScrollArea(tk.Frame):
    """纵向可滚动容器。内容放 `.body`,高度超出就滚。

    为什么需要:列表类内容如果直接 pack 进定高容器,项目一多,
    行会被 pack 挤扁而不是被裁掉 —— 实测项目列表到 20 个项目时,
    行高从 107px 掉到 59px、指标行只剩 32px,文字直接被切,
    而且行还在那儿显示着,用户完全不知道为什么点不中。

    滚轮用 bind_all + 命中检测:Tk 的事件不会自动冒泡到父控件,
    只绑自身的话,鼠标停在列表里任何一个子控件上滚都滚不动。
    命中检测保证不影响窗口里其他可滚动区域。
    """

    def __init__(self, parent, bg=CARD, height=200, **kw):
        kw.pop("width", None)
        super().__init__(parent, bg=bg, **kw)
        self._cv = tk.Canvas(self, bg=bg, highlightthickness=0, bd=0,
                             width=1, height=height)
        self._cv.pack(side="left", fill="both", expand=True)
        self._sb = tk.Scrollbar(self, orient="vertical",
                                command=self._cv.yview, width=11,
                                troughcolor=bg, bg=CARD_HI,
                                activebackground=LINE_HI, relief="flat",
                                bd=0, highlightthickness=0)
        self.body = tk.Frame(self._cv, bg=bg)
        self._win = self._cv.create_window((0, 0), window=self.body,
                                           anchor="nw")
        self._cv.configure(yscrollcommand=self._sync_sb)
        self.body.bind("<Configure>", self._on_body)
        self._cv.bind("<Configure>", self._on_cv)
        for w in (self, self._cv, self.body):
            w.bind("<MouseWheel>", self._on_wheel)
            w.bind("<Button-4>", lambda e: self.scroll(-1))
            w.bind("<Button-5>", lambda e: self.scroll(1))
        self.bind_all("<MouseWheel>", self._on_wheel_all, add="+")
        self.bind("<Destroy>", self._unbind_all)

    def _unbind_all(self, _=None):
        try:
            self.unbind_all("<MouseWheel>")
        except tk.TclError:
            pass

    def _sync_sb(self, first, last):
        """滚不动的时候把滚动条收起来 —— 常驻一条永远用不上的滚动条很碍眼。"""
        try:
            need = not (float(first) <= 0.0 and float(last) >= 1.0)
            if need and not self._sb.winfo_ismapped():
                self._sb.pack(side="right", fill="y", before=self._cv)
            elif not need and self._sb.winfo_ismapped():
                self._sb.pack_forget()
            self._sb.set(first, last)
        except tk.TclError:
            pass

    def _on_body(self, _=None):
        try:
            self._cv.configure(scrollregion=self._cv.bbox("all"))
        except tk.TclError:
            pass
        self.after_idle(self._sync_width)

    def _on_cv(self, _=None):
        self._sync_width()

    def _sync_width(self):
        """内容宽度跟着可视宽度走,否则横向会出现白边/被裁。

        必须先比再设:设了窗口项宽度 -> 内嵌 body 尺寸变 -> 触发 body 的
        <Configure> -> 又 after_idle 排一次自己。这么转下去是死循环,
        after_idle 队列永远排不空,界面卡死、主循环再也回不来。
        """
        try:
            if not self._cv.winfo_exists():
                return
            want = self._cv.winfo_width()
            if int(self._cv.itemcget(self._win, "width")) == want:
                return
            self._cv.itemconfigure(self._win, width=want)
        except (tk.TclError, ValueError):
            pass

    def scroll(self, n):
        try:
            self._cv.yview_scroll(n, "units")
        except tk.TclError:
            pass

    def _on_wheel(self, e):
        self.scroll(self._wheel_units(e))

    def _on_wheel_all(self, e):
        """全局兜底:只有指针真在本区域内才响应,别抢别的滚动区。"""
        try:
            if not self.winfo_exists():
                return
            w = self.winfo_containing(e.x_root, e.y_root)
            if w is None:
                return
            path = str(w)
            if not (path == str(self) or path.startswith(str(self) + ".")):
                return
        except tk.TclError:
            return
        self.scroll(self._wheel_units(e))

    @staticmethod
    def _wheel_units(e):
        d = getattr(e, "delta", 0)
        n = int(-d / 120) if d else 0
        if n == 0:
            n = -1 if (d < 0 or getattr(e, "num", 5) == 4) else 1
        return n if n else 1


def rounded_points(x, y, w, h, r, steps=8, corners=(180, 270, 0, 90)):
    """圆角矩形的顶点列表(左上/右上/右下/左下)。

    所有坐标取整 —— Canvas 的多边形不接受 float 混排,
    早期版本就是因此崩在 "syntax error in item" 上。
    """
    if w <= 0 or h <= 0:
        return []
    r = max(0.0, min(float(r), w / 2.0, h / 2.0))
    if r <= 0.5:
        return [round(x), round(y), round(x + w), round(y),
                round(x + w), round(y + h), round(x), round(y + h)]
    centers = ((x + r, y + r), (x + w - r, y + r),
               (x + w - r, y + h - r), (x + r, y + h - r))
    pts = []
    for (cx, cy), a0 in zip(centers, corners):
        for i in range(steps + 1):
            a = math.radians(a0 + 90 * i / steps)
            pts.append(round(cx + r * math.cos(a)))
            pts.append(round(cy + r * math.sin(a)))
    return pts


def capsule_points(x, y, w, h, steps=12):
    """胶囊顶点:左半圆(90°→270°)接右半圆(270°→90°)。

    两段必须朝相反方向绕,否则多边形会自交 —— 早期版本两个半圆都从
    180° 画到 360°,画出来是个朝上的怪blob而不是胶囊。
    """
    if w <= 0 or h <= 0:
        return []
    r = min(h / 2.0, w / 2.0)
    cy = y + h / 2.0
    pts = []
    # 左半圆:从底部(90°)绕左侧到顶部(270°)
    for i in range(steps + 1):
        a = math.radians(90 + 180 * i / steps)
        pts.append(round(x + r + r * math.cos(a)))
        pts.append(round(cy + r * math.sin(a)))
    # 右半圆:从顶部(270°)绕右侧回到底部(90°)
    for i in range(steps + 1):
        a = math.radians(270 + 180 * i / steps)
        pts.append(round(x + w - r + r * math.cos(a)))
        pts.append(round(cy + r * math.sin(a)))
    return pts


def draw_rounded(canvas, x, y, w, h, r, fill="", outline="", steps=8):
    pts = rounded_points(x, y, w, h, r, steps)
    if not pts:
        return None
    return canvas.create_polygon(pts, fill=fill, outline=outline,
                                 width=1 if outline else 0)


def draw_capsule(canvas, x, y, w, h, fill=""):
    pts = capsule_points(x, y, w, h)
    if not pts:
        return None
    return canvas.create_polygon(pts, fill=fill, outline="")


class Pill(tk.Canvas):
    """胶囊按钮。iOS 的标志性控件。

    圆角拉到高度的一半就是胶囊。带悬停渐变和按下回缩。
    """

    def __init__(self, parent, text, command=None, bg=ACC, fg="#FFFFFF",
                 font_=T_BODY_STRONG, pad_x=18, pad_y=9, radius=R_PILL,
                 hover=None, parent_bg=None, width=None, height=None, **kw):
        pb = parent_bg or parent.cget("bg")
        # 注意:width/height 只作为初始值传给 Canvas,
        # 之后由 _draw() 按文字内容覆写,不能重复传。
        kw.pop("width", None)
        kw.pop("height", None)
        super().__init__(parent, bg=pb, highlightthickness=0, bd=0,
                         width=width or 120, height=height or 38, **kw)
        self._drawing = False
        self._text = text
        self._cmd = command
        self._bg = bg
        self._hover_bg = hover or self._lighten(bg, 0.18)
        self._press_bg = self._darken(bg, 0.14)
        self._fg = fg
        self._font = font_
        self._radius = radius
        self._cur = bg
        self._hover = False
        self._pressed = False
        self._pad_x = pad_x
        self._w_fixed = width

        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)
        self.bind("<ButtonPress-1>", self._on_press)
        self.bind("<ButtonRelease-1>", self._on_release)
        self.bind("<Configure>", lambda e: self._draw())
        self.after_idle(self._draw)

    @property
    def text(self) -> str:
        """按钮文字。Canvas 没有 text 属性,外部(诊断脚本 / 自动化测试)
        要认出这是哪个按钮只能靠它。"""
        return self._text

    @property
    def command(self):
        return self._cmd

    def invoke(self):
        """按一次按钮。tk.Button / ttk.Button 都有这个方法。

        没有它的话,自动化测试只能去造 ButtonPress/Release 事件,
        绕一大圈还测不准(按下位置、焦点、动画都会干扰)。
        """
        if self._cmd:
            self._cmd()

    # -- 颜色工具 --
    @staticmethod
    def _lighten(c, amt):
        return _shift(c, amt)

    @staticmethod
    def _darken(c, amt):
        return _shift(c, -amt)

    def _target(self):
        if self._pressed:
            return self._press_bg
        return self._hover_bg if self._hover else self._bg

    def _on_enter(self, _=None):
        self._hover = True
        Tween(self, 160, lambda e, r: self._draw(ease_out_cubic(e))).start()

    def _on_leave(self, _=None):
        self._hover = False
        self._pressed = False
        Tween(self, 200, lambda e, r: self._draw(ease_out_cubic(e))).start()

    def _on_press(self, _=None):
        self._pressed = True
        self._draw(1.0)

    def _on_release(self, e):
        was = self._pressed
        self._pressed = False
        Tween(self, 200, lambda t, r: self._draw(ease_out_cubic(t))).start()
        if was and 0 <= e.x <= self.winfo_width() and \
                0 <= e.y <= self.winfo_height():
            if self._cmd:
                try:
                    self._cmd()
                except tk.TclError:
                    pass

    def _draw(self, t=1.0):
        try:
            if not self.winfo_exists():
                return
            if getattr(self, "_drawing", False):
                return          # configure(width) 会触发 <Configure> 递归回来
            self._drawing = True
            try:
                self._cur = mix(self._cur, self._target(), max(0.35, t))
                h = self.winfo_height()
                if h <= 1:
                    h = int(self["height"] or 34)
                # 宽度按真实字体量,别用 len(text)*8 猜 ——
                # 中英文混排时差很多,猜窄了文字就溢出到胶囊外面
                need = self._text_w() + self._pad_x * 2
                w = max(self._w_fixed or 0, need, self.winfo_width())
                if w != self.winfo_width():
                    self.configure(width=w)
                if h != self.winfo_height():
                    self.configure(height=h)
                self.delete("all")
                draw_capsule(self, 0, 0, w, h, fill=self._cur)
                # 按下时整体缩 2%,iOS 的触感来自这种极小的形变
                if self._pressed:
                    self.scale("all", w / 2, h / 2, 0.98, 0.98)
                self.create_text(w / 2, h / 2, text=self._text,
                                 fill=self._fg, font=self._font,
                                 anchor="center")
            finally:
                self._drawing = False
        except tk.TclError:
            pass

    def _text_w(self):
        return measure(self, self._text, self._font)

    def set_text(self, t):
        self._text = t
        self._draw()


def audit_colors():
    """自检:所有色板常量必须是 #rrggbb(6 位十六进制)。

    8 位(含 alpha)会被 Tk 拒掉并抛 invalid color name。
    """
    import re as _re
    named = {"BG", "BG_GRAD_TOP", "CARD", "CARD_HI", "CARD_LO", "SHEET",
             "LINE", "LINE_HI", "FG", "FG2", "FG3", "ACC", "ACC_HI",
             "ACC_DIM", "ACC_SOFT", "OK", "OK_DIM", "WARN", "WARN_DIM",
             "BAD", "BAD_DIM", "PURPLE", "PURPLE_DIM", "ORANGE",
             "SHADOW", "SHADOW_SOFT"}
    bad = [f"{k}={globals()[k]}" for k in sorted(named)
           if not _re.fullmatch(r"#[0-9a-fA-F]{6}", str(globals()[k]))]
    return bad


def _shift(c: str, amt: float) -> str:
    """把颜色整体调亮(+amt)或调暗(-amt)。"""
    r, g, b = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16))
    if amt >= 0:
        f = lambda v: round(v + (255 - v) * amt)
    else:
        f = lambda v: round(v * (1 + amt))
    parts = []
    for v in (r, g, b):
        parts.append(f"{max(0, min(255, int(f(v)))):02x}")
    return "#" + "".join(parts)


class Segmented(tk.Canvas):
    """iOS 分段控件。带滑动指示块。"""

    def __init__(self, parent, items, command=None, bg=CARD_LO,
                 parent_bg=None, font_=T_FOOT_STRONG, height=32,
                 width=None, **kw):
        pb = parent_bg or parent.cget("bg")
        kw.pop("width", None)
        kw.pop("height", None)
        super().__init__(parent, bg=pb, highlightthickness=0, bd=0,
                         width=width or 40, height=height, **kw)
        self._items = list(items)
        self._cmd = command
        self._bg = bg
        self._sel = 0
        self._font = font_
        self._ch = height
        self._anim = None
        self.bind("<Configure>", lambda e: self._draw())
        self.after_idle(self._draw)
        self.bind("<Button-1>", self._click)

    def _seg_w(self):
        return max(1, (self.winfo_width() - 8) // max(1, len(self._items)))

    def _draw(self, xoff=None):
        try:
            if not self.winfo_exists():
                return
            w, h = self.winfo_width(), self.winfo_height()
            if w <= 1:
                return
            self.delete("all")
            sw = self._seg_w()
            draw_rounded(self, 4, 3, w - 4, h - 6, (h - 6) / 2, fill=self._bg)
            ind = self._sel * sw + (4 if xoff is None else xoff)
            draw_rounded(self, 4 + (ind - 4), 3, sw, h - 6, (h - 6) / 2,
                         fill=CARD_HI, outline=LINE_HI)
            for i, it in enumerate(self._items):
                cx = 4 + i * sw + sw / 2
                self.create_text(cx, h / 2, text=it,
                                 fill=FG if i == self._sel else FG2,
                                 font=self._font, anchor="center")
        except tk.TclError:
            pass

    def _click(self, e):
        sw = self._seg_w()
        i = int((e.x - 4) // sw) if sw else 0
        if 0 <= i < len(self._items) and i != self._sel:
            old = self._sel
            self._sel = i
            from0, to0 = old * sw, i * sw
            holder = {"x": from0}

            def step(e2, r):
                holder["x"] = lerp(from0, to0, e2)
                self._draw(holder["x"])
            self._anim = Tween(self, 260, step, ease=ease_out_cubic).start()
            if self._cmd:
                try:
                    self._cmd(i)
                except tk.TclError:
                    pass
        else:
            self._draw()

    def select(self, i):
        self._sel = i
        self._draw()


class Switch(tk.Canvas):
    """iOS 开关。"""

    def __init__(self, parent, var, bg=CARD, width=44, height=26,
                 on_color=OK, off_color=CARD_LO, parent_bg=None, **kw):
        pb = parent_bg or parent.cget("bg")
        kw.pop("width", None)
        kw.pop("height", None)
        super().__init__(parent, bg=pb, highlightthickness=0, bd=0,
                         width=width, height=height, **kw)
        self.var = var
        self._cw, self._ch = width, height
        self._anim = None
        self._on = on_color
        self._off = off_color
        self._x = 1.0 if _truthy(var) else 0.0
        self.bind("<Button-1>", self.toggle)
        self.after_idle(self._draw)

    def _draw(self, t=None):
        try:
            if not self.winfo_exists():
                return
            if t is None:
                t = self._x
            w, h = self._cw, self._ch
            r = h / 2
            self.delete("all")
            draw_capsule(self, 0, 0, w, h,
                         fill=mix(self._off, self._on, t))
            kx = lerp(r + 2, w - r - 2, t)
            kr = r - 3
            self.create_oval(round(kx - kr), round(h / 2 - kr),
                             round(kx + kr), round(h / 2 + kr),
                             fill="#FFFFFF", outline="")
        except tk.TclError:
            pass

    def toggle(self, _=None):
        val = not _truthy(self.var)
        self.var.set(val)
        frm, to = self._x, (1.0 if val else 0.0)

        def step(e, _raw):
            self._x = lerp(frm, to, e)      # 必须写回,否则动画位置永远停在起点
            self._draw(self._x)

        self._anim = Tween(self, 240, step, ease=spring).start()

    def sync(self):
        self._x = 1.0 if _truthy(self.var) else 0.0
        self._draw()


def _truthy(var):
    try:
        return bool(var.get())
    except Exception:
        return False


class SkeletonLine(tk.Canvas):
    """加载骨架屏。一条会呼吸的微光。"""

    def __init__(self, parent, width=160, height=12, bg=CARD_LO, radius=6,
                 **kw):
        kw.pop("width", None)
        kw.pop("height", None)
        super().__init__(parent, bg=parent.cget("bg"), highlightthickness=0,
                         bd=0, width=width, height=height + 2, **kw)
        self._cw, self._ch = width, height
        self._bg = bg
        self.bind("<Configure>", lambda e: self._draw())
        self.after(30, self._draw)
        self._phase = 0

    def _draw(self):
        try:
            if not self.winfo_exists():
                return
            w = self.winfo_width()
            h = self.winfo_height()
            if w <= 1:
                return
            self.delete("all")
            bw = min(self._cw, w)
            draw_rounded(self, 0, 1, bw, h - 2, (h - 2) / 2, fill=self._bg)
            # 呼吸微光
            self._phase = (self._phase + 0.04) % 1.0
            gx = self._phase * (w + bw) - bw
            self.create_rectangle(max(0, gx), 1, min(w, gx + bw / 2), h - 1,
                                 fill=mix(self._bg, CARD_HI, 0.5), outline="")
            self.after(45, self._draw)
        except tk.TclError:
            pass


def hline(parent, color=LINE, pady=0):
    f = tk.Frame(parent, bg=color, height=1)
    if pady:
        f.pack(fill="x", pady=pady)
    else:
        f.pack(fill="x")
    return f


def apply_window_chrome(win, title=None):
    """统一的窗口观感:深色标题栏 + 合适的最小尺寸。"""
    try:
        win.configure(bg=BG)
        win.option_add("*Font", UI)
    except tk.TclError:
        pass
    if title:
        try:
            win.title(title)
        except tk.TclError:
            pass