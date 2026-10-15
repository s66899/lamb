# -*- coding: utf-8 -*-
"""原生看板 —— 不用浏览器的 Tk 版(P12)。

本人要求「看板也要能在 exe 里看,不要浏览器第三方跳转」。
HTML 看板必须靠浏览器内核,exe 里嵌 WebView 仍然是浏览器,
所以这里**用 Tk 控件重画一份**。

和 HTML 看板的区别(说清楚,别让人以为是同一份):
    HTML 版  能点缩略图看大图、有筛选/搜索/CSV、交付物列可在线编辑
    本版本   同样有缩略图、筛选/搜索/排序、交付物可直接点开 3D/工程图,
             并且**加工后核对 / 新购件核对**也能在程序里直接填 —— 
             写的是同一个 `2_BOM表/核对表.xlsx`,所以两边数据同步。

★ 为什么用「一行一个 Frame」而不是 ttk.Treeview:
    Treeview 的单元格**放不了图片**,也没有原生下拉框。
    而本地端这三件事都需要:缩略图(图示列)、核对状态下拉、
    可就地改的备注框。硬塞进 Treeview 只能靠 Canvas 浮层
    (跟着滚动条跑,一行几十个控件,一滚动就错位)。
    一行一个 Frame 没有这些问题,89 行的量级滚起来也不卡。
    代价是没有列头排序 —— 换成工具条上的「排序」下拉,反而更直观。

数据来源和 HTML 看板完全一样(`2_BOM表`),所以两边数字必然一致。
"""
from __future__ import annotations

import base64
import io
import tkinter as tk
import traceback
from pathlib import Path
from tkinter import messagebox, ttk

from . import config as C, core, paths
from . import viewer as V

try:
    import theme as T
    BG, CARD, CARD_HI, LINE = T.BG, T.CARD, T.CARD_HI, T.LINE
    FG, FG2, FG3 = T.FG, T.FG2, T.FG3
    ACC, OK, WARN, BAD = T.ACC, T.OK, T.WARN, T.BAD
    OK_DIM, WARN_DIM, BAD_DIM = T.OK_DIM, T.WARN_DIM, T.BAD_DIM
    SHEET = T.SHEET
except Exception:
    BG = "#0A0C10"; CARD = "#151A22"; CARD_HI = "#1C232E"; LINE = "#242C38"
    FG = "#F2F5F9"; FG2 = "#CBD5E1"; FG3 = "#94A3B8"
    ACC, OK, WARN, BAD = "#0A84FF", "#30D158", "#FF9F0A", "#FF453A"
    OK_DIM, WARN_DIM, BAD_DIM = "#13301C", "#33260F", "#331616"
    SHEET = "#1A212B"

THUMB_W, THUMB_H = 84, 58          # 缩略图尺寸(和网页版一致)
PLACEHOLDER = "无图"


def _cursor(name: str) -> str:
    """只有这几种光标在 Windows 的 Tk 里一定存在。

    ★ 这里踩过**两次**,两次都是同一个形状:光标名是「听起来该有的名字」,
      而不是 Tk 真认识的名字。
        ① `cursor="notallowed"` → `bad cursor spec`,画到第 15 行时抛,
           明细区只剩 14 行而统计卡按 89 件算 —— 表面看是
           「看板缺数据/缺图」,真正原因藏在 stderr 里。
        ② `cursor="text"` → 同样 `bad cursor spec`。**I 形光标在 Tk 里
           叫 `xterm`**,不叫 `text`。这次因为加了「一行画不出来就换红字」
           的兜底,89 行全部变成红字而不是 0 行,才当场暴露出来。

      任何新增光标都过这里,拿不准的一律退回箭头。
      别在别处直接写 `cursor=` —— 绕过这个函数就会重蹈覆辙。
    """
    return name if name in ("hand2", "hand", "xterm", "watch", "arrow",
                            "question_arrow", "sb_h_double_arrow") else "arrow"


def _is_num(v: str) -> bool:
    """数量的本地校验。服务端还会再挡一道,这里是为了**当场**告诉本人,
    不至于白等一次写盘往返。"""
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False


def _dl_kind(k: str) -> str:
    """交付物 key -> 显示用的大类。3D 和 2D 必须分开标,
    以前两列长得一模一样,用户根本不知道双击哪一列打开的是什么。"""
    return "3D" if k in ("step", "assy") else "2D"


class DashView(tk.Toplevel):
    def __init__(self, master, proj, items=None):
        super().__init__(master)
        self.proj = proj
        self.title("改动零件看板(程序内)")
        self.geometry("1280x820+80+60")
        self.minsize(900, 560)
        self.configure(bg=BG)
        self._alive = True
        self._photos = []            # PhotoImage 强引用,见 viewer 的说明
        self._thumbs = {}           # (表,行号) -> PhotoImage,见 _thumb
        self.items = []
        self.dl = []
        self.cfg = None
        self._cat = [None]
        self._kw = [""]
        self._sort = [("图号", "pn")]
        self._rows = []              # 当前显示的 item
        self._debounce = None        # 搜索框防抖的 after id
        self._dirty = {}            # ((分类,行号), 字段) -> (item, 原值, 新值)
        self._editing = None         # 正在编辑的 Entry 的收尾函数
        self._row_refs = []          # 当前 pack 着的行(按显示顺序)
        self._rowcache = {}          # (表,行号) -> 行 Frame,复用不重建
        self._bad_rows = []          # 画不出来的行,写进状态栏
        self.protocol("WM_DELETE_WINDOW", self._close)
        self._build()
        self.after(80, self._load)

    # ---------------- 关闭 ----------------
    def _close(self):
        """先掐掉重绘循环,再在**主线程**里释放 PhotoImage,最后销毁。

        PhotoImage 的 `__del__` 要调 Tcl("image delete"),在工作线程里
        被 GC 回收就是死锁 —— 详细说明见 `engine/viewer.py` 顶部。

        ★ 所以这个方法**只能从主线程调**(Tk 回调)。现有两个调用点都满足:
          `WM_DELETE_WINDOW` 协议、`gui.py` 里构造看板的那段(也是 Tk 回调)。
          真要让它支持跨线程,得先判断线程再 `after()` 回主线程,
          不能就地 delete —— 那样只会挂死。
        """
        self._alive = False
        if self._debounce is not None:
            try:
                self.after_cancel(self._debounce)
            except Exception:
                pass
            self._debounce = None
        for ph in set(self._thumbs.values()) | set(self._photos):
            if ph is False:
                continue
            try:
                ph.__del__()          # 显式 delete,别等 GC
            except Exception:
                pass
        self._photos = []
        self._thumbs = {}
        self.items = []
        self._rows = []
        for r in (list(self._row_refs) +
                  [f for f in self._rowcache.values()
                   if f not in self._row_refs]):
            try:
                r.destroy()
            except Exception:
                pass
        self._row_refs = []
        self._rowcache = {}
        try:
            super().destroy()
        except Exception:
            pass

    def destroy(self):
        try:
            self._close()
        except Exception:
            pass

    # ---------------- 骨架 ----------------
    def _build(self):
        top = tk.Frame(self, bg=CARD, height=52)
        top.pack(fill="x", side="top")
        top.pack_propagate(False)
        tk.Label(top, text="改动零件看板", bg=CARD, fg=FG,
                 font=("Microsoft YaHei", 14, "bold")).pack(side="left", padx=16)
        tk.Label(top, text="程序内 · 不经过浏览器", bg=CARD, fg=FG3,
                 font=("Microsoft YaHei", 9)).pack(side="left")
        self._dbg = tk.StringVar(value="")
        tk.Label(top, textvariable=self._dbg, bg=CARD, fg=FG3,
                 font=("Microsoft YaHei", 9)).pack(side="right", padx=16)

        self.cards = tk.Frame(self, bg=BG)
        self.cards.pack(fill="x", padx=14, pady=(12, 6))

        # 工具条:分类 + 搜索 + 排序 + 视图说明
        bar = tk.Frame(self, bg=BG)
        bar.pack(fill="x", padx=14, pady=(0, 6))
        self.cbar = tk.Frame(bar, bg=BG)
        self.cbar.pack(side="left")
        self.sbar = tk.Frame(bar, bg=BG)
        self.sbar.pack(side="right")

        tk.Label(bar, text="点字段即可改 · 图示点一下看大图 · 交付物按钮直接打开",
                 bg=BG, fg=FG3, font=("Microsoft YaHei", 9)).pack(side="left",
                                                                  padx=12)
        # 编辑工具条。默认**收起来** —— 没有改动时占地方还没用。
        self.ebar = tk.Label(bar, text="", bg=BG, fg=WARN,
                             font=("Microsoft YaHei", 9, "bold"))
        self.ebar.pack(side="left", padx=(6, 8))
        self._ebtns = [
            self._chip(bar, "保存修改", self._save_edits),
            self._chip(bar, "放弃", self._undo_edits),
        ]
        for w in self._ebtns:
            w.pack_forget()

        # 明细区
        wrap = tk.Frame(self, bg=BG)
        wrap.pack(fill="both", expand=True, padx=14, pady=(0, 10))
        self.body = tk.Frame(wrap, bg=BG)
        self.body.pack(side="left", fill="both", expand=True)
        vs = ttk.Scrollbar(wrap, orient="vertical", command=self._yview)
        vs.pack(side="right", fill="y")
        self._row_refs = []
        self.status = tk.StringVar(value="正在读数据…")
        tk.Label(self, textvariable=self.status, bg=BG, fg=FG3, anchor="w",
                 font=("Microsoft YaHei", 9)).pack(fill="x", padx=16,
                                                   pady=(0, 6))

    def _yview(self, *a):
        for r in self._row_refs:
            try:
                r.yview(*a)
            except Exception:
                pass

    def _card(self, n, label, sub="", cls=ACC):
        f = tk.Frame(self.cards, bg=CARD, highlightthickness=0)
        f.pack(side="left", fill="x", expand=True, padx=(0, 8))
        tk.Frame(f, bg=cls, width=4).pack(side="left", fill="y")
        inner = tk.Frame(f, bg=CARD)
        inner.pack(side="left", fill="both", expand=True, padx=12, pady=10)
        tk.Label(inner, text=str(n), bg=CARD, fg=FG,
                 font=("Microsoft YaHei", 18, "bold")).pack(anchor="w")
        tk.Label(inner, text=label, bg=CARD, fg=FG2,
                 font=("Microsoft YaHei", 10)).pack(anchor="w")
        if sub:
            tk.Label(inner, text=sub, bg=CARD, fg=FG3,
                     font=("Microsoft YaHei", 9)).pack(anchor="w")

    def _chip(self, parent, text, cmd, on=False):
        b = tk.Label(parent, text=text, bg=ACC if on else SHEET,
                     fg="#fff" if on else FG2, font=("Microsoft YaHei", 10),
                     padx=12, pady=5, cursor="hand2")
        b.pack(side="left", padx=(0, 6))
        b.bind("<Button-1>", lambda e, f=cmd: f())
        b.bind("<Enter>", lambda e, o=b: o.configure(
            bg=ACC if on else CARD_HI, fg="#fff" if on else FG))
        b.bind("<Leave>", lambda e, o=b: o.configure(
            bg=ACC if on else SHEET, fg="#fff" if on else FG2))
        return b

    # ---------------- 读数据 ----------------
    def _load(self):
        try:
            if not self._alive:
                return
            cfg = C.with_defaults(C.load(self.proj))
            cfg["_proj_root"] = str(self.proj.root)
            items = core.read_items_from_tables(cfg, self.proj)
        except Exception as e:
            self.status.set(f"读数据失败:{e}")
            messagebox.showerror("读数据失败",
                                 f"{type(e).__name__}: {e}\n\n"
                                 + traceback.format_exc(limit=3))
            return
        if not items:
            self.status.set("没有读到零件 —— 先点「构建」")
            return
        # 数据重读了,旧的行控件全部作废(它们闭包引用的是老 item)。
        for f in self._rowcache.values():
            try:
                f.destroy()
            except Exception:
                pass
        self._rowcache = {}
        self._bad_rows = []
        for c in self.body.winfo_children():
            try:
                c.destroy()
            except Exception:
                pass
        self.items = items
        self.cfg = cfg
        self.dl = [k for k in cfg["deliverables"] if cfg["deliverables"][k].get("cats")]
        self._attach_check(items)          # 加工后核对 / 新购件核对
        self._stats()
        self._tools()
        # ★ 必须在这里调 _fill()。以前只填了统计卡和工具条就收工,
        #   明细区一直是空的 —— 得等本人在搜索框里敲一个字,
        #   键盘事件才会触发 _fill() 然后突然「有内容了」。
        #   看起来像「程序内看板没图 / 没数据」,其实是一行都没画。
        self._fill()
        self.status.set(f"{len(items)} 件已读入")

    def _attach_check(self, items):
        """把核对数据挂到每件零件上。读不到就全给「待核对」,
        绝不让这一层把看板整个读挂 —— 核对表是新东西,出问题
        也只该是「看不到核对结果」,不该是「看板打不开」。"""
        from . import checklist
        try:
            n = checklist.attach(cfg=self.cfg, proj=self.proj, items=items)
            self._dbg.set(f"核对表已读 · {n} 件有记录" if n else "")
        except Exception as e:
            for it in items:
                it.setdefault("chk", checklist.empty_for(it))
            self._dbg.set(f"核对表读取失败:{e}")

    # ---------------- 统计卡 ----------------
    def _stats(self):
        for c in self.cards.winfo_children():
            c.destroy()
        items, dl = self.items, self.dl
        cats = {c: sum(1 for i in items if i["cat"] == c)
                for c in self.cfg["categories"]["order"]}
        cats = {c: n for c, n in cats.items() if n}
        self._card(len(items), "零件总数", f"{len(cats)} 个分类")
        for k in dl:
            need = [i for i in items if i.get(k)]
            ok = sum(1 for i in need if i.get(k + "_exists"))
            miss = len(need) - ok
            self._card(f"{ok}/{len(need)}",
                       f"{self.cfg['deliverables'][k]['label']}到位",
                       f"缺 {miss}" if miss else "全齐",
                       OK if not miss else BAD)
        self._card(sum(1 for i in items if i.get("img")), "带图示", "源表图示")
        self._card(len(self.items) - sum(
            1 for i in self.items
            if any(i.get(k) and not i.get(k + "_exists") for k in dl)),
            "文件齐套", "两样都到位", OK)
        try:
            from . import checklist
            for kind, label in (("m", "加工后核对"), ("p", "新购件核对")):
                st = checklist.tally(self.items, kind)
                if not st["total"]:
                    continue
                # ★ 两栏的「有问题」不是一回事:自产件只有不合格,
                #   外购件除了型号不对,还可能是**到货数量不够**。
                #   以前共用一句「未核 N · 不合格 M」,采购那边数量少了
                #   根本不会显示出来 —— 而数量短恰恰是采购最常出事的地方。
                bad_n = st["bad"] + (st.get("short") or 0)
                sub = f"未核 {st['todo']} · 有问题 {bad_n}"
                if kind == "p" and st.get("short"):
                    sub = (f"未核 {st['todo']} · 型号不对 {st['bad']}"
                           f" · 数量不足 {st['short']}")
                elif kind == "p":
                    sub = f"未核 {st['todo']} · 型号不对 {st['bad']}"
                self._card(f"{st['done']}/{st['total']}", label, sub,
                           OK if not st["todo"] and not bad_n
                           else (BAD if bad_n else WARN))
        except Exception:
            pass

    # ---------------- 工具条 ----------------
    def _tools(self):
        for c in self.cbar.winfo_children():
            c.destroy()
        cats = {c: sum(1 for i in self.items if i["cat"] == c)
                for c in self.cfg["categories"]["order"]}
        cats = {c: n for c, n in cats.items() if n}
        self._chip(self.cbar, "全部", lambda: self._pick(None), on=True)
        for c, n in cats.items():
            self._chip(self.cbar, f"{c} {n}", lambda x=c: self._pick(x))

        for c in self.sbar.winfo_children():
            c.destroy()
        ent = tk.Entry(self.sbar, width=18, bg=SHEET, fg=FG, bd=0,
                       insertbackground=FG, font=("Microsoft YaHei", 10))
        ent.pack(side="left", padx=(0, 8))
        # ★ 搜索框要**防抖**。89 行 = 约 1000 个 Tk 控件,重画一次大约
        #   1 秒;每敲一个字就重画一遍的话,输一个 4 位图号会连卡 4 秒,
        #   中途的半截结果还会闪一下把人晃晕。停手 250 毫秒才重画。
        self._debounce = None

        def on_key(e, w=ent):
            self._kw[0] = w.get()
            if self._debounce is not None:
                try:
                    self.after_cancel(self._debounce)
                except Exception:
                    pass
            self._debounce = self.after(250, self._debounce_fire)

        ent.bind("<KeyRelease>", on_key)
        ent.bind("<Return>", lambda e: self._debounce_fire())
        ent.bind("<Escape>", lambda e: (ent.delete(0, "end"),
                                        on_key(e)))
        # 同一个函数再挂一份,给测试用。
        # 测试里 `ent.event_generate("<KeyRelease>")` 走的是**真实焦点** ——
        # 根窗口 withdraw 之后焦点经常落不到 Entry 上,事件被 Tk 丢掉,
        # 于是「搜索词生效」这类断言有时候过、有时候不过(实测 4 次挂 2 次)。
        # 挂出来是为了让测试在拿不到焦点时能走**完全同一条**代码路径,
        # 而不是把断言改成「跳过」。
        self._on_search_key = on_key
        tk.Label(self.sbar, text="搜索图号/名称", bg=BG, fg=FG3,
                 font=("Microsoft YaHei", 9)).pack(side="left", padx=(0, 10))
        sorts = [("按图号", "pn"), ("按分类", "cat"),
                 ("按缺件优先", "_miss"), ("按未核对优先", "_chk")]
        cur = dict(sorts).get(self._sort[0][0], "pn")
        var = tk.StringVar(value=self._sort[0][0])
        dd = ttk.Combobox(self.sbar, textvariable=var, width=10, state="readonly",
                         values=[s[0] for s in sorts], font=("Microsoft YaHei", 10))
        dd.pack(side="left", padx=(0, 6))
        dd.bind("<<ComboboxSelected>>", lambda e: self._set_sort(var.get(), sorts))
        _ = cur

    def _set_sort(self, label, sorts):
        for name, key in sorts:
            if name == label:
                self._sort = [(name, key)]
                break
        self._fill()

    # ---------------- 明细行 ----------------
    def _visible(self):
        cat, kw = self._cat[0], self._kw[0].strip().lower()
        out = []
        for i in self.items:
            if cat and i["cat"] != cat:
                continue
            if kw and kw not in (str(i.get("pn") or "") +
                                 str(i.get("nm") or "")).lower():
                continue
            out.append(i)
        key = dict((n, k) for n, k in
                   [("按图号", "pn"), ("按分类", "cat"),
                    ("按缺件优先", "_miss"), ("按未核对优先", "_chk")]
                   ).get(self._sort[0][0], "pn")

        def sort_key(i):
            if key == "cat":
                return (self.cfg["categories"]["order"].index(i["cat"])
                        if i["cat"] in self.cfg["categories"]["order"] else 99,
                        str(i.get("pn") or ""))
            if key == "_miss":
                n = sum(1 for k in self.dl
                        if i.get(k) and not i.get(k + "_exists"))
                return (-n, str(i.get("pn") or ""))
            if key == "_chk":
                from . import checklist
                todo = 0 if checklist.done(i) else 1
                return (todo, str(i.get("pn") or ""))
            return str(i.get(key) or "")
        out.sort(key=sort_key)
        return out

    def _fill(self):
        """按当前筛选/排序重排。

        ★ 行控件**建一次、复用**,不每次 destroy 重建。
          89 行 = 约 1000 个 Tk 控件,全量重建一次要 0.9 秒;
          搜索、换排序、切分类全走这条路 —— 每次都重建的话,
          敲一下搜索框就卡一秒。这里只做 pack_forget / pack,
          排序也只是重新 pack 的先后顺序,不碰控件本身。

          代价是行底色不能跟着「第几行」变(控件是原来那个)。
          所以底色改成**跟零件走**:缺交付物的行标红,其余同色,
          行间用一条分隔线。原来那个奇偶相间的斑马纹在排序后会
          整片错位,反而更难看。
        """
        from . import checklist
        self._rows = self._visible()
        if not self._rows:
            # 控件改成复用之后,搜索收窄到 0 件时所有行只是 pack_forget,
            # 屏幕上会**一片空白** —— 本人只会以为程序卡死。必须说清楚。
            for f in self._rowcache.values():
                try:
                    f.pack_forget()
                except Exception:
                    pass
            self._row_refs = []
            self._empty_label().pack(pady=40)
            self.status.set(f"显示 0 / {len(self.items)} 件"
                            + (f" · 搜索「{self._kw[0]}」"
                               if self._kw[0].strip() else ""))
            return
        if getattr(self, "_empty", None):
            self._empty.pack_forget()
        keep = set()
        for item in self._rows:
            keep.add(checklist.key_of(item))
        # 数据重读后已经不存在的行,顺手销毁,别让缓存越滚越大
        for k in [k for k in self._rowcache if k not in keep]:
            try:
                self._rowcache.pop(k).destroy()
            except Exception:
                self._rowcache.pop(k, None)
        for f in self._rowcache.values():
            try:
                f.pack_forget()
            except Exception:
                pass
        for item in self._rows:
            k = checklist.key_of(item)
            f = self._rowcache.get(k)
            if f is None:
                # ★ 一行画不出来,不能让**整张表**停在那儿。
                #   以前 `_row()` 在第 15 行抛(光标名写错),循环直接中断,
                #   89 件只画出来 14 件,而统计卡照旧按 89 件算 ——
                #   表面看是「看板缺数据/缺图」,真正原因藏在 stderr 里。
                #   这里把坏行换成一行红字,并在状态栏说明。
                try:
                    f = self._row(item)
                    self._rowcache[k] = f
                except Exception as e:
                    f = self._bad_row(item, e)
                    self._rowcache[k] = f
                    self._bad_rows.append(f"{item.get('pn')}"
                                          f"({type(e).__name__})")
            f.pack(fill="x", pady=1)
        self._row_refs = [self._rowcache[k] for k in
                          (checklist.key_of(i) for i in self._rows)]
        miss = sum(1 for i in self._rows
                   if any(i.get(k) and not i.get(k + "_exists") for k in self.dl))
        self.status.set(
            f"显示 {len(self._rows)} / {len(self.items)} 件"
            f" · 缺交付物 {miss} 件"
            + (f" · 搜索「{self._kw[0]}」" if self._kw[0].strip() else "")
            + (f" · **{len(self._bad_rows)} 行画不出来:"
               + ",".join(self._bad_rows[:3]) if self._bad_rows else "")
            + " · 点图示看大图,点交付物按钮直接打开")

    def _empty_label(self):
        if not getattr(self, "_empty", None):
            self._empty = tk.Label(self.body, text="没有匹配的零件", bg=BG,
                                   fg=FG3, font=("Microsoft YaHei", 12))
        return self._empty

    def _bad_row(self, it, e):
        f = tk.Frame(self.body, bg=BAD_DIM)
        tk.Label(f, text=f"{it.get('pn') or '—'} {it.get('nm') or ''}",
                 bg=BAD_DIM, fg=FG, font=("Microsoft YaHei", 10, "bold")
                 ).pack(side="left", padx=10, pady=6)
        tk.Label(f, text=f"这一行显示不出来:{type(e).__name__}",
                 bg=BAD_DIM, fg=BAD, font=("Microsoft YaHei", 9)
                 ).pack(side="left")
        return f

    def _debounce_fire(self):
        """防抖到点了就重画。cancel 掉排队的那个,免得连着画两遍。"""
        self._debounce = None
        if self._alive:
            self._fill()

    def _pick(self, cat):
        self._cat = [cat]
        for b in self.cbar.winfo_children():
            t = b.cget("text")
            on = (cat is None and t == "全部") or (cat and t.startswith(cat))
            b.configure(bg=ACC if on else SHEET, fg="#fff" if on else FG2)
        self._fill()

    def _row(self, it):
        # 底色只跟「这件缺不缺交付物」走,不跟第几行走 —— 控件是复用的,
        # 换排序时行底色跟着位置变会整片错位(见 _fill 的说明)。
        miss = any(it.get(k) and not it.get(k + "_exists") for k in self.dl)
        bg = BAD_DIM if miss else CARD
        # 1px 描边当行分隔线,代替原来那个奇偶斑马纹 —— 控件是复用的,
        # 斑马纹跟着「第几行」变,换排序之后会整片错位。
        f = tk.Frame(self.body, bg=bg, highlightthickness=1,
                     highlightbackground=LINE, highlightcolor=LINE)

        # ---- 图示 ----
        box = tk.Frame(f, bg=bg, width=THUMB_W + 8, height=THUMB_H + 8)
        box.pack(side="left", padx=(8, 4), pady=4)
        box.pack_propagate(False)
        ph = self._thumb(it, box)
        if ph is not None:
            box.bind("<Button-1>", lambda e, x=it: self._zoom(x))
            for c in box.winfo_children():
                c.bind("<Button-1>", lambda e, x=it: self._zoom(x))

# ---- 文本块 ----
        # ★ 这一块**全部可编辑**(P15)。以前只有核对栏能改,
        #   图号/名称/材料/数量/工艺/备注 只能去 Excel 里改 ——
        #   于是「程序内看板能改」这件事只做了一半,用户打开一看就知道缺了。
        #   做法和网页端一致:点一下开始改,失焦或回车算一次提交,
        #   Esc 取消;改完先进 DIRTY,点「保存修改」弹清单确认后才落盘。
        t = tk.Frame(f, bg=bg)
        t.pack(side="left", fill="both", expand=True, pady=6)
        l1 = tk.Frame(t, bg=bg)
        l1.pack(fill="x")
        self._cell(l1, it, "pn", bg, fn=11, bold=True, fg=FG)
        self._cell(l1, it, "qty", bg, fn=10, fg=FG3, pre="×", width=3)
        self._cell(l1, it, "nm", bg, fn=10, fg=FG2)
        catcol = {"机加工件": "#c4b5fd", "塑胶件": "#67e8f9",
                  "钣金件": "#cbd5e1", "外购件": "#86efac",
                  "3D打印件": "#fdba74"}.get(it["cat"], FG3)
        tk.Label(l1, text=it["cat"], bg=bg, fg=catcol,
                 font=("Microsoft YaHei", 9)).pack(side="left", padx=6)
        l2 = tk.Frame(t, bg=bg)
        l2.pack(fill="x", pady=(2, 0))
        self._cell(l2, it, "mat", bg, fn=9, fg=FG3)
        tk.Label(l2, text="·", bg=bg, fg=FG3,
                 font=("Microsoft YaHei", 9)).pack(side="left")
        self._cell(l2, it, "craft", bg, fn=9, fg=FG3)
        self._cell(l2, it, "note", bg, fn=9, fg=WARN, prefix="备注:",
                   width=40)
        proto = str(it.get("proto") or "")
        if proto:
            tk.Label(l2, text=proto, bg=bg, fg=FG3,
                     font=("Microsoft YaHei", 9)).pack(side="left", padx=6)
        # ---- 交付物按钮(按 3D / 2D 标出来) ----
        d = tk.Frame(f, bg=bg)
        d.pack(side="left", padx=6)
        for k in self.dl:
            lab = _dl_kind(k)
            spec = self.cfg["deliverables"][k]
            if not it.get(k):
                b = tk.Label(d, text=f"{lab} —", bg=SHEET, fg=FG3,
                             font=("Microsoft YaHei", 9), padx=8, pady=4)
                b.pack(side="left", padx=2)
                b.bind("<Button-1>", lambda e, x=it, kk=k:
                       messagebox.showinfo(
                           "这一件不需要",
                           f"{x.get('pn')}\n{spec['label']} 不需要。"))
                continue
            p = self._real_file(it, k)
            ok = bool(p)
            b = tk.Label(d, text=f"{lab} {'✓' if ok else '✗'}",
                         bg=OK_DIM if ok else BAD_DIM, fg=OK if ok else BAD,
                         font=("Microsoft YaHei", 9, "bold"),
                         padx=8, pady=4, cursor=_cursor("hand2" if ok else "arrow"))
            b.pack(side="left", padx=2)
            tip = (f"{spec['label']}\n{it.get(k)}\n" +
                   (str(p) if ok else "文件不在"))
            b.bind("<Enter>", lambda e, s=tip: self.status.set(s))
            b.bind("<Button-1>", lambda e, x=it, kk=k: self._open(x, kk))

        # ---- 核对栏 ----
        self._check_ui(f, bg, it)
        return f

# ---------------- 单元格编辑(P15)----------------
    def _cell(self, parent, it, field, bg, fn=10, fg=None, bold=False,
              prefix="", pre="", width=0):
        """一个可编辑的字段(Label 平时看,双击变 Entry)。

        为什么不直接摆 6 个 Entry:
            89 行 x 6 个字段 = 534 个 Entry,每个都带边框和光标,
            平时就像一张全是输入框的表 —— **一眼看不出哪些能改**。
            网页端就是用 contentEditable 做的「平时像普通单元格、
            点一下才变输入框」,这里照搬同一套手感。
        """
        from . import edit as _ed
        fg = fg or FG
        font = ("Microsoft YaHei", fn, "bold") if bold \
            else ("Microsoft YaHei", fn)
        wrap = tk.Frame(parent, bg=bg)
        wrap.pack(side="left", padx=(2, 6))
        if pre:
            tk.Label(wrap, text=pre, bg=bg, fg=FG3, font=font
                     ).pack(side="left")
        if prefix:
            tk.Label(wrap, text=prefix, bg=bg, fg=fg, font=font
                     ).pack(side="left")

        key = (str(it.get("cat") or ""), str(it.get("xrow") or ""))
        dirty = self._dirty.get((key, field))
        val = dirty if dirty is not None else str(it.get(field) or "")

        lbl = tk.Label(wrap, text=val or ("—" if field in ("pn", "nm") else ""),
                       bg=bg, fg=fg, font=font, bd=0,
                       padx=2, cursor=_cursor("xterm"))
        # ★ 字体存成 Python 属性,**不要事后 `cget("font")` 再传给 Entry**。
        #   Tk 会把字体元组规范化成字符串,`cget` 拿回来的是
        #   `"Microsoft YaHei 9 bold"`,直接当 font= 传下去就报
        #   `expected integer but got "M"` —— 而这行代码看���去完全正常。
        lbl._font = font
        lbl.pack(side="left")
        if width:
            lbl.configure(width=width, anchor="w")
        if dirty is not None:
            lbl.configure(bg=WARN_DIM, fg="#FDE68A")
        lbl.bind("<Double-Button-1>", lambda e: self._begin_edit(lbl, it,
                                                                 field, val))
        # 单击也能进:双击在 Tk 里要等两次按下,新手常常以为没反应。
        lbl.bind("<Button-1>", lambda e: self._begin_edit(lbl, it, field, val))
        wrap._cell_label = lbl
        wrap._cell_field = field
        wrap._cell_key = key
        it["_ui_cells"] = getattr(it, "_ui_cells", None) or it.setdefault(
            "_ui_cells", {})
        it["_ui_cells"][field] = lbl
        return lbl

    def _begin_edit(self, lbl, it, field, old):
        """把 Label 换成 Entry 开始改。Esc 取消,回车/失焦算一次提交。"""
        # ★ 这里是**提交**,不是取消。
        #   上一处调的是 `finish(False)`,于是「改到一半点去别处」等于丢弃
        #   你刚打的字 —— 和浏览器里点下一个格子会**自动提交**完全相反,
        #   本人会以为程序吞了输入。
        #   和 `<FocusOut>` 保持同一套语义:走的时候按提交算。
        if self._editing is not None:
            self._editing["finish"](True)
        parent = lbl.master
        font = getattr(lbl, "_font", ("Microsoft YaHei", 10))
        e = tk.Entry(parent, bg=SHEET, fg=FG, bd=0, insertbackground=FG,
                     font=font, justify="left")
        # 直接占住 Label 的位置:Label 是 `_cell` 里**最后**一个 pack 的,
        # 所以摘掉它之后新 pack 的 Entry 正好落在同一个位置。
        # ★ 别去重排其它兄弟控件 —— pack 的顺序是「第一次 pack 时定的」,
        #   之后 `pack_info()` 对没 pack 的控件会抛
        #   `window "..." isn't packed`。想让位置稳,就在构造时排好序。
        lbl.pack_forget()
        e.pack(side="left", padx=2)
        e.focus_set()
        e.select_range(0, "end")
        # ★ `handled` 和 `finish` **必须是两个键**。
        #   早先只留一个 `done["finish"]`,既当「已处理」的标志、
        #   又当交给 `self._editing` 的回调句柄 —— 于是在 `_begin_edit`
        #   结尾写下 `done["finish"] = finish` 之后,**每一次** `finish()`
        #   开头那句「已经处理过就返回」都会命中,第一次提交就被丢掉。
        #   表现是「点开能改字,一按回车就弹回去,永远存不进去」。
        #   两处都用同一个 dict 的不同键,才互不干扰。
        done = {"handled": False, "finish": None}

        def finish(ok):
            if done["handled"]:
                return
            done["handled"] = True
            # ★ 这里统一把 `self._editing` 清掉,而不是靠调用方。
            #   以前只在 `_up()` 里清 —— 于是任何**绕过 `_up`** 的调用
            #   (测试直接调、或者以后再加一种触发方式)都会留下一个指向
            #   **已被 destroy 的 Entry** 的句柄,下一次点开别的字段时
            #   `e.get()` 直接抛 `invalid command name "...entry"`,
            #   整个看板跟着崩。Entry 的生死归 finish 管,句柄就归 finish 清。
            self._editing = None
            try:
                v = e.get().strip()
            except Exception:
                # Entry 已经被销毁(切窗口、窗口最小化等)—— 放弃这次改动。
                try:
                    lbl.pack(side="left", padx=2)
                except Exception:
                    pass
                return
            def _back():
                try:
                    e.destroy()
                except Exception:
                    pass
                try:
                    lbl.pack(side="left", padx=2)
                except Exception:
                    pass

            if not ok or v == old:
                _back()
                return
            if len(v) > 500:
                self.status.set("这一格太长了(最多 500 字),没改。")
                _back()
                return
            if field == "qty" and v and not _is_num(v):
                self.status.set(f"数量得是数字,「{v}」没改。")
                _back()
                return
            _back()
            lbl.configure(text=v or ("—" if field in ("pn", "nm") else ""),
                          bg=WARN_DIM, fg="#FDE68A")
            lbl.pack(side="left", padx=2)
            self._mark_dirty(it, field, old, v)

        def _up(ok):
            # 存在的原因只是 `lambda` 不能赋值(`self._editing = None`
            # 在 lambda 体里是语法错误)。清句柄的活交给 finish。
            finish(ok)

        done["finish"] = finish
        self._editing = done
        e.bind("<Return>", lambda ev: _up(True))
        e.bind("<Escape>", lambda ev: _up(False))
        e.bind("<FocusOut>", lambda ev: _up(True))

    def _mark_dirty(self, it, field, was, now):
        self._dirty[((str(it.get("cat") or ""), str(it.get("xrow") or "")),
                    field)] = (it, was, now)
        self._paint_edit_bar()

    def _paint_edit_bar(self):
        if self._dirty:
            self.ebar.configure(
                text=f"已改 {len(self._dirty)} 处")
            for w in self._ebtns:
                w.pack(side="left", padx=(0, 6))
        else:
            self.ebar.configure(text="")
            for w in self._ebtns:
                w.pack_forget()

    def _undo_edits(self):
        for (key, field), (it, was, _now) in list(self._dirty.items()):
            it[field] = was
            lbl = (it.get("_ui_cells") or {}).get(field)
            if lbl is not None:
                lbl.configure(text=str(was or "—"), bg=self._cellbg(it))
        self._dirty.clear()
        self._paint_edit_bar()
        self._fill()

    def _cellbg(self, it):
        miss = any(it.get(k) and not it.get(k + "_exists") for k in self.dl)
        return BAD_DIM if miss else CARD

    # ---------------- 保存:两段式,确认后才写盘 ----------------
    def _save_edits(self):
        """和网页端 P7 一样:先 preview 列清单,确认后才 apply_edits。

        五道防线全在 `engine/edit.py` 里(路径白名单 / 字段白名单 /
        行号+图号双校验 / 预览不写盘 / 原子写+先备份),
        这里**不重复实现** —— 两端共用一份才不会出现「网页能改、
        程序里不能」或者反过来。
        """
        from . import edit as _ed
        edits = [{"cat": it.get("cat"), "row": it.get("xrow"),
                  "field": f, "value": now, "pn": it.get("pn")}
                 for (_k, f), (it, _was, now) in self._dirty.items()]
        if not edits:
            return
        try:
            r = _ed.preview_edits(self.cfg, self.proj, edits)
        except _ed.EditError as e:
            messagebox.showerror("改不了", str(e))
            return
        if not r.get("total"):
            self.status.set("内容其实没变,没有写入。")
            self._undo_edits()
            return
        self._confirm_edits(r, edits)

    def _confirm_edits(self, r, edits):
        from . import edit as _ed
        dlg = tk.Toplevel(self)
        dlg.title(f"确认这 {r['total']} 处修改?")
        dlg.configure(bg=CARD)
        dlg.transient(self)
        dlg.geometry("760x520")
        f = tk.Frame(dlg, bg=CARD)
        f.pack(fill="both", expand=True, padx=14, pady=12)
        tk.Label(f, text=f"共 {r['total']} 处,写到:{'、'.join(r['cats'])}",
                 bg=CARD, fg=FG, font=("Microsoft YaHei", 11, "bold")
                 ).pack(anchor="w", pady=(0, 8))
        box = tk.Text(f, bg=SHEET, fg=FG, bd=0, insertbackground=FG,
                      font=("Consolas", 10), wrap="none")
        box.pack(fill="both", expand=True)
        box.insert("1.0", "\n".join(
            f"  {x['label']:<4} {x['cat']} 第{x['row']}行  "
            f"{(x['pn'] or '')[:16]:<16} "
            f"{(x['nm'] or '')[:18]:<18} "
            f"「{x['was'] or '空'}」 → 「{x['now'] or '空'}」"
            for x in r["rows"]))
        box.configure(state="disabled")
        tk.Label(f, text="只写 2_BOM表 里的产出表,源表一个字节都不动;"
                         "写入前会自动备份。",
                 bg=CARD, fg=WARN, font=("Microsoft YaHei", 9)
                 ).pack(anchor="w", pady=(10, 0))

        def yes():
            dlg.destroy()
            try:
                res = _ed.apply_edits(self.cfg, self.proj, edits,
                                      log=lambda m: self.status.set(m))
            except _ed.EditError as e:
                messagebox.showerror("没能保存", str(e))
                return
            except Exception as e:
                messagebox.showerror("没能保存", f"{type(e).__name__}: {e}")
                return
            n = res.get("written", 0)
            # ★ 写完必须重读,否则界面显示的还是改前的值 —— 而数据其实变了。
            from . import core as _core
            self.items = _core.read_items_from_tables(self.cfg, self.proj,
                                                      log=lambda m: None)
            self._dirty.clear()
            self._rowcache.clear()
            self._paint_edit_bar()
            self._stats()
            self._fill()
            messagebox.showinfo("保存完成",
                                f"已写入 {n} 处"
                                + (f"(跳过 {res.get('skipped', 0)} 处没真变的)"
                                   if res.get("skipped") else "")
                                + "\n\n物料表已更新,看板下次刷新即生效。")

        tk.Button(f, text="取消", command=dlg.destroy, bg=SHEET, fg=FG2,
                  bd=0, padx=16, pady=6).pack(side="left", pady=(10, 0))
        tk.Button(f, text="确认写入", command=yes, bg=ACC, fg="#fff", bd=0,
                  padx=18, pady=6).pack(side="left", padx=8, pady=(10, 0))

    # ---- 缩略图 ----    # ---- 缩略图 ----
    def _thumb(self, it, box):
        """items[i]['img'] 是 base64 data URI(嵌在源表里的图)。
        没有图就画一个占位框 —— **不能留空**,空着的话那一列
        整列消失,用户根本不知道「本来应该有图」。

        ★ PhotoImage 按 (表,行号) **缓存**。`ImageTk.PhotoImage` 本身就很贵
          (89 件 ≈ 1.7 秒),而 `_fill()` 每搜一个字、每换一个排序都要
          重画一遍 —— 不缓存的话每敲一下键盘卡 1.7 秒。
          缓存同时解决了内存涨的问题:以前 `self._photos` 只加不减,
          筛 10 次就攒下上千个 PhotoImage。

          ★ key **不能**用图号。外购件里 22 行图号都叫「杯头螺钉」
            (M8*12 / M2*8 / M2*6 …),**每件配的图都不一样** ——
            按图号缓存会把 M8*12 的图贴到 M2*8 那行上,看板上
            两件不同的零件长得一模一样。跟核对表一样用 (表, 行号),
            89 件全不重。
        """
        raw = it.get("img")
        if not raw:
            tk.Label(box, text=PLACEHOLDER, bg=SHEET, fg=FG3,
                     font=("Microsoft YaHei", 8)).pack(expand=True, fill="both")
            return None
        from . import checklist
        ck = checklist.key_of(it)
        ph = self._thumbs.get(ck)
        if ph is None:
            ph = self._make_thumb(raw)
            # 失败的也记一笔:空的 PhotoImage 不会被重复重试。
            self._thumbs[ck] = ph or False
            ph = ph or None
        if ph is None:
            tk.Label(box, text="图坏了", bg=SHEET, fg=WARN,
                     font=("Microsoft YaHei", 8)).pack(expand=True)
            return None
        lbl = tk.Label(box, image=ph, bg="#0B1220", bd=0)
        lbl.pack(expand=True, fill="both")
        lbl.image = ph
        box.bind("<Button-1>", lambda e, x=it: self._zoom(x))
        return ph

    def _make_thumb(self, raw):
        from PIL import Image, ImageTk
        try:
            b = raw.split(",", 1)[1]
            im = Image.open(io.BytesIO(base64.b64decode(b)))
            im.thumbnail((THUMB_W, THUMB_H))
            im = im.convert("RGBA")
            # ★ 必须是「contain」不是「cover」:零件图有宽有窄,
            #   cover 会把窄图两边裁掉,看到的是缺了一块的形状。
            cv = Image.new("RGB", (THUMB_W, THUMB_H), (11, 18, 32))
            cv.paste(im, ((THUMB_W - im.width) // 2, (THUMB_H - im.height) // 2))
            return ImageTk.PhotoImage(cv)
        except Exception:
            return None

    def _zoom(self, it):
        """点缩略图看大图。写临时 png 再交给程序内查看器 —— 顺便验证
        「程序内看图」这条路是通的,不用跳外部看图程序。"""
        raw = it.get("img")
        if not raw:
            messagebox.showinfo("没有图", f"{it.get('pn')}\n源表这一行没有图。")
            return
        try:
            import tempfile
            from PIL import Image
            b = raw.split(",", 1)[1]
            d = Path(tempfile.mkdtemp(prefix="dash_zoom_"))
            p = d / f"{it.get('pn') or 'part'}.png"
            Image.open(io.BytesIO(base64.b64decode(b))).convert("RGB").save(p)
            V.Viewer(self, p)
        except Exception as e:
            messagebox.showerror("看不了大图", f"{type(e).__name__}: {e}")

    # ---- 交付物打开 ----
    def _real_file(self, row, k):
        """真正命中的文件。必须用 `_real_path`:`_path` 是按 BOM 表里的
        文件名推的,前缀匹配时那个路径根本不存在。"""
        for suf in ("_real_path", "_path"):
            p = row.get(k + suf)
            if p and Path(p).is_file():
                return Path(p)
        return None

    def _open(self, row, k):
        p = self._real_file(row, k)
        if not p:
            messagebox.showinfo("文件不在",
                                f"{row.get('pn')}\n找不到 {row.get(k)}")
            return
        try:
            V.Viewer(self, p)
        except Exception as e:
            messagebox.showerror("打不开", f"{p}\n\n{e}")

    # ---- 核对栏(实现见 engine/checklist.py)----
    def _check_ui(self, parent, bg, it):
        from . import checklist
        kind = checklist.kind_of(it)
        if not kind:
            return
        # ★ 整栏给一个比卡片亮一档的底色。
        #   以前它跟着行底色走,而行底色只有 CARD / BAD_DIM 两档,
        #   89 行里核对栏混在里面,横向扫视时**根本看不出这一栏在哪**。
        cbg = "#101C30" if bg != BAD_DIM else "#241520"
        box = tk.Frame(parent, bg=cbg)
        box.pack(side="left", padx=(6, 10), fill="y")
        cur = checklist.get(it)
        label = checklist.LABELS[kind]
        # ★ 两栏的**状态词不一样**。自产件问「做得对不对」,外购件问
        #   「型号对不对」(本人原话:采购件的核对是核对数量和型号)。
        #   早先这里写死 checklist.STATUSES(自产件那套),外购件点开菜单
        #   看到的是「合格/不合格/返工」—— 和要核的东西根本对不上。
        colors = {"todo": ("#22304A", "#C6D3E6", "待核对"),
                  "ok": (OK_DIM, OK, "合格"),
                  "bad": (BAD_DIM, BAD, "不合格"),
                  "redo": (WARN_DIM, WARN, "返工")}
        bgc, fgc = colors[cur["st"]][0], colors[cur["st"]][1]
        txt = checklist.st_name(kind, cur["st"])
        # 分两行:上面栏名(淡),下面状态(亮)。
        # 「加工后核对 合格」七个字挤在 9 号字里糊成一团 —— 本人说
        # 「暗暗的不好看到」。分行 + 字号加大才看得清。
        col = tk.Frame(box, bg=cbg)
        col.pack(side="left", padx=(0, 4))
        tk.Label(col, text=label, bg=cbg, fg=FG3,
                 font=("Microsoft YaHei", 8)).pack(anchor="w")
        st = tk.Label(col, text=txt, bg=bgc, fg=fgc,
                      font=("Microsoft YaHei", 11, "bold"),
                      padx=12, pady=3, cursor=_cursor("hand2"))
        st.pack(anchor="w")

        # ---- 外购件:到货数量(本人要核的第二件事)----
        if kind == "p":
            need = checklist.need_qty(it)
            got = cur.get("qty")
            less = checklist.short_of(it, got)
            qcol = tk.Frame(box, bg=cbg)
            qcol.pack(side="left", padx=(0, 4))
            tk.Label(qcol, text="到货", bg=cbg, fg=FG3,
                     font=("Microsoft YaHei", 8)).pack(anchor="w")
            qtxt = "—" if got is None else str(got)
            if need is not None:
                qtxt += " / 需 " + ("%g" % need)
            qb = tk.Label(qcol, text=qtxt,
                          bg=(BAD_DIM if less else "#1C2740"),
                          fg=("#FFA9A9" if less else "#C6D3E6"),
                          font=("Microsoft YaHei", 10, "bold"),
                          padx=10, pady=5, cursor=_cursor("hand2"))
            qb.pack(anchor="w")
            qb.bind("<Button-1>", lambda e, x=it: self._qty(x))
            if less:
                tk.Label(qcol, text="差 %g" % less, bg=cbg, fg=BAD,
                         font=("Microsoft YaHei", 8, "bold")).pack(anchor="w")

        # 菜单**按需建**:一行一个 tk.Menu,89 行就 89 个菜单对象,
        # 每个还带 5 条命令 —— 光建这些就要好几秒。
        # 改成点开的时候才建、用完就扔,启动快了十倍以上。
        def open_menu(e):
            m = tk.Menu(self, tearoff=0)
            for code, name in checklist.statuses_of(kind):
                m.add_command(label=name, command=lambda c=code, x=it, k=kind:
                              self._set_chk(x, k, c, x_chk.get("note", "")))
            m.add_separator()
            m.add_command(label="写备注…", command=lambda x=it, k=kind:
                          self._note(x, k))
            try:
                m.tk_popup(e.x_root, e.y_root)
            finally:
                m.grab_release()
                m.destroy()

        x_chk = cur
        st.bind("<Button-1>", open_menu)
        rem = cur.get("note") or ""
        tk.Label(box, text=("备注" if not rem else rem[:24]), bg=cbg,
                 fg=(FG3 if not rem else WARN),
                 font=("Microsoft YaHei", 9)).pack(side="left", padx=(8, 0))

    def _qty(self, it):
        """填「到货数量」。留空 = 还没记到货(不是记了 0 个)。

        为什么不直接摆个常驻 Entry:89 行外购件就有 48 行,一摆就是
        48 个输入框,启动慢、而且和平时的只读单元格长得一样,分不清
        哪些能敲。这里点一下弹窗,和「写备注」一个路数。
        """
        from . import checklist
        cur = checklist.get(it)
        need = checklist.need_qty(it)
        dlg = tk.Toplevel(self)
        dlg.title(f"到货数量 — {it.get('pn')}")
        dlg.configure(bg=CARD)
        dlg.transient(self)
        f = tk.Frame(dlg, bg=CARD)
        f.pack(fill="both", expand=True, padx=14, pady=12)
        tk.Label(f, text=f"{it.get('pn')} {it.get('nm')}",
                 bg=CARD, fg=FG, font=("Microsoft YaHei", 11, "bold")).pack(
            anchor="w")
        tk.Label(f, text=("需求量 %g" % need) if need is not None
                 else "这张表里没有需求量,只能自己看着填",
                 bg=CARD, fg=FG2, font=("Microsoft YaHei", 9)).pack(
            anchor="w", pady=(2, 8))
        e = tk.Entry(f, font=("Microsoft YaHei", 13), bg=SHEET, fg=FG,
                     bd=0, insertbackground=FG, width=14,
                     justify="center")
        e.pack(anchor="w")
        e.insert(0, "" if cur.get("qty") is None else str(cur["qty"]))
        e.focus_set()
        e.select_range(0, "end")
        hint = tk.Label(f, text="", bg=CARD, fg=BAD,
                        font=("Microsoft YaHei", 9))

        def save():
            val = e.get().strip()
            if val:
                try:
                    float(val)
                except ValueError:
                    hint.set(f"「{val}」得是数字,或者留空(还没记到货)")
                    return
            dlg.destroy()
            self._set_chk(it, "p", cur["st"], cur.get("note", ""), qty=val)

        def on_return(ev):
            save()

        e.bind("<Return>", on_return)
        tk.Button(f, text="保存", command=save, bg=ACC, fg="#fff", bd=0,
                  padx=14, pady=5).pack(side="left", pady=(12, 0))
        tk.Button(f, text="取消", command=dlg.destroy, bg=SHEET, fg=FG2,
                  bd=0, padx=14, pady=5).pack(side="left", padx=8, pady=(12, 0))

    def _set_chk(self, it, kind, code, note, qty=None):
        """改核对结果。**返回 True / False**,别只看有没有弹窗。

        以前这里是 `except: showerror(...)` 然后就结束了,返回值
        永远是 None —— 于是「写错了核对栏」这件事在调用方看来
        和「点了一下没反应」一模一样。现在把失败**记进状态栏**,
        弹窗关掉以后界面上还留着痕迹。
        """
        from . import checklist
        try:
            # qty=None 表示「这次不动到货数量」—— 改型号/改备注时不该
            # 顺手把数量清掉。UI 手上没有当前值时宁可查一遍也不猜。
            if qty is None and kind == "p":
                qty = checklist.get(it).get("qty")
            checklist.set(self.cfg, self.proj, it, kind, code, note, qty=qty)
        except Exception as e:
            msg = f"{it.get('pn') or ''} 保存失败:{e}"
            self._dbg.set(msg)
            self.status.set(msg)
            messagebox.showerror("保存失败", f"{type(e).__name__}: {e}")
            return False
        self._dbg.set("")
        self._after_save()
        return True

    def _note(self, it, kind):
        from . import checklist
        cur = checklist.get(it)
        dlg = tk.Toplevel(self)
        dlg.title(f"核对备注 — {it.get('pn')}")
        dlg.configure(bg=CARD)
        dlg.transient(self)
        f = tk.Frame(dlg, bg=CARD)
        f.pack(fill="both", expand=True, padx=14, pady=12)
        tk.Label(f, text=f"{it.get('pn')} {it.get('nm')}",
                 bg=CARD, fg=FG, font=("Microsoft YaHei", 11, "bold")).pack(
            anchor="w", pady=(0, 8))
        txt = tk.Text(f, height=6, width=52, bg=SHEET, fg=FG, bd=0,
                      insertbackground=FG, font=("Microsoft YaHei", 10),
                      wrap="word")
        txt.pack(fill="both", expand=True)
        txt.insert("1.0", cur.get("note") or "")

        def save():
            val = txt.get("1.0", "end").strip()
            dlg.destroy()
            self._set_chk(it, kind, cur["st"], val,
                          qty=cur.get("qty") if kind == "p" else None)

        tk.Button(f, text="保存", command=save, bg=ACC, fg="#fff", bd=0,
                  padx=14, pady=5).pack(side="left", pady=(10, 0))
        tk.Button(f, text="取消", command=dlg.destroy, bg=SHEET, fg=FG2,
                  bd=0, padx=14, pady=5).pack(side="left", padx=8, pady=(10, 0))

    def _after_save(self):
        """保存后重画 + 重算统计卡。两端数据同源(同一个 核对表.xlsx),
        所以网页端下次刷新看到的就是同一个值。

        ★ 行控件是复用的(见 _fill),所以保存之后**必须**把缓存丢掉
          重画 —— 只重算统计卡的话,数据变成「合格」了,而界面上那一行
          还挂着复用前的「待核对」。看着像保存没生效,其实已经存了。
          保存是低频动作,重画一次的成本可以接受。
        """
        from . import checklist
        try:
            checklist.attach(cfg=self.cfg, proj=self.proj, items=self.items)
        except Exception as e:
            self._dbg.set(f"核对表读取失败:{e}")
        for f in self._rowcache.values():
            try:
                f.destroy()
            except Exception:
                pass
        self._rowcache = {}
        self._bad_rows = []
        self._stats()
        self._fill()