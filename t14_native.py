# -*- coding: utf-8 -*-
"""P14 —— 加工后核对 / 新购件核对:原生看板(程序内)测试(共 3 轮,这是第 3 轮)。

跑法:
    python t14_checklist.py            # 第 1 轮:数据层
    python t14_api.py                  # 第 2 轮:接口层
    python t14_native.py               # 第 3 轮:原生看板(本文件)

**全程只碰沙箱项目 `_沙箱测试项目`,绝不碰真项目。**

这一轮要盯的是 Tk 那边特有的坑:
  * PhotoImage 的 `__del__` 要在**主线程**里放 —— 放到后台/GC 里会死锁;
  * `ttk.Combobox` 在高 DPI / 窄窗口下会被挤没;
  * 行数多时每次重画都得把旧控件 destroy 干净,不然越滚越卡。
"""
from __future__ import annotations

import sys
import tkinter as tk
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import sandbox                                    # noqa: E402

import engine.checklist as CL                     # noqa: E402
import engine.config as C                         # noqa: E402
import engine.core as core                        # noqa: E402
import engine.paths as paths                      # noqa: E402

BOX = Path(r"D:\助手工程师\_沙箱测试项目")
FAILS: list[str] = []
N = [0]


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)


def pump(root: tk.Misc, ms: int = 260):
    """把 Tk 事件队列转完。`update()` 会跑 idle 回调和 after 定时器,
    这正是 DashView 用 `after(80, self._load)` 延迟加载所依赖的。"""
    root.update_idletasks()
    root.update()
    import time
    end = time.time() + ms / 1000
    while time.time() < end:
        root.update_idletasks()
        root.update()
        time.sleep(0.01)


def labels_in(w: tk.Misc) -> list[str]:
    out = []
    for c in w.winfo_children():
        try:
            t = c.cget("text")
            out.append(str(t))
        except Exception:
            pass
        out.extend(labels_in(c))
    return out


def widgets(w: tk.Misc, cls) -> int:
    n = 0
    for c in w.winfo_children():
        if isinstance(c, cls):
            n += 1
        n += widgets(c, cls)
    return n


def main() -> int:
    from engine import dashview as DV

    sandbox.make()
    proj = paths.Project(BOX)
    root = tk.Tk()
    root.withdraw()

    print("\n=== 1. 打开原生看板(不经过浏览器)===")
    import time
    t_open = time.time()
    try:
        dv = DV.DashView(root, proj)
    except Exception as e:
        import traceback
        traceback.print_exc()
        ck("打开看板", False, f"{type(e).__name__}: {e}")
        return 1
    # ★ 只等 `_row_refs` 出来是不够的:列表是先于内容填的,
    #   机器上一忙(刚跑过截图/开过浏览器)就会在断言「读到了 89 件」
    #   的时候还差几件 —— **同一个代码连跑一次过、下一次挂**。
    #   两个条件都满足才算加载完。
    while (dv._row_refs == [] or len(dv.items) < 89) \
            and time.time() - t_open < 40:
        pump(root, 100)
    dt_open = time.time() - t_open
    pump(root, 400)
    ck("看板开出来了", dv.winfo_exists() == 1)
    if len(dv.items) != 89:
        # 加载没完/出过错时把现场留下来,免得下次只能说「有时候会挂」
        print("     [现场] items=%d rows=%d _dbg=%r"
              % (len(dv.items), len(dv._row_refs), dv._dbg.get()))
    ck("读到了 89 件", len(dv.items) == 89, str(len(dv.items)))
    # 89 件 = 约 1000 个 Tk 控件 + 89 张 PhotoImage。超过 8 秒就该怀疑
    # 哪里退化了(缩略图缓存失效、菜单改成一次性建之类)。
    ck("打开到能看不超过 8 秒", dt_open < 8, f"{dt_open:.2f}s")

    print("\n=== 2. 图示(以前本地端是没有图的)===")
    ck("有缩略图", widgets(dv, tk.Label) > 89,
       f"Label {widgets(dv, tk.Label)} 个")
    n_ph = len([v for v in dv._thumbs.values() if v])
    ck("89 张缩略图都渲染出来了(每件各一张)", n_ph == 89, str(n_ph))
    # ★ 本轮抓到的真 bug:缩略图缓存原来按 (分类,图号) 做 key,而外购件里
    #   22 行图号都叫「杯头螺钉」,**每件配的图不一样**。结果是 89 件
    #   只缓存了 53 张,M8*12 的图贴到了 M2*8 那行上,两件不同的零件
    #   在看板上长得一模一样。断言得盯住「89 件 → 89 个不同的 key」。
    ck("图号重复的那 22 件也各有各的缓存",
       len(dv._thumbs) == 89, str(len(dv._thumbs)))
    ck("共用图号的螺丝拿到的是不同 PhotoImage",
       len({id(v) for v in dv._thumbs.values()}) == 89,
       str(len({id(v) for v in dv._thumbs.values()})))
    # 找第一行的图示框,确认它有图而不是「无图」
    row0 = dv._row_refs[0]
    labs = [str(c.cget("text")) for c in row0.winfo_children()
            if isinstance(c, tk.Label) and c.cget("text")]
    ck("第一行没有出现「无图」占位", "无图" not in labs, str(labs[:3]))

    print("\n=== 3. 交付物按钮按 3D / 2D 标出来 ===")
    txt = " ".join(labels_in(dv))
    ck("有 3D 按钮", "3D ✓" in txt or "3D ✗" in txt, "")
    ck("有 2D 按钮", "2D ✓" in txt or "2D ✗" in txt, "")
    ck("交付物按钮带达标/缺标", "✓" in txt and "✗" in txt)

    print("\n=== 4. 核对栏:按分类自动分 ===")
    n_m = sum(1 for r in dv._row_refs
              if "加工后核对" in " ".join(labels_in(r)))
    n_p = sum(1 for r in dv._row_refs
              if "新购件核对" in " ".join(labels_in(r)))
    ck("41 行显示「加工后核对」", n_m == 41, str(n_m))
    ck("48 行显示「新购件核对」", n_p == 48, str(n_p))
    ck("没有一行同时显示两栏", n_m + n_p == len(dv._row_refs),
       f"{n_m}+{n_p} vs {len(dv._row_refs)}")

    print("\n=== 5. 统计卡里有核对进度 ===")
    cards = " ".join(labels_in(dv.cards))
    ck("有「加工后核对」卡", "加工后核对" in cards, "")
    ck("有「新购件核对」卡", "新购件核对" in cards, "")
    ck("卡片写了还剩几件", "未核" in cards, cards[:60])

    print("\n=== 6. 改状态 -> 界面跟着变(并且落盘)===")
    it = next(i for i in dv.items if CL.kind_of(i) == "m")
    dv._set_chk(it, "m", "ok", "首件合格")
    pump(root, 600)
    got = CL.read(proj)[CL.key_of(it)]["m"]
    ck("落盘是合格", got["st"] == "ok", got["st"])
    ck("备注落盘了", got["note"] == "首件合格", got["note"])
    row = next(r for r in dv._row_refs
               if it["pn"] in " ".join(labels_in(r)))
    ck("那一行显示「加工后核对 合格」",
       "加工后核对 合格" in " ".join(labels_in(row)),
       " ".join(labels_in(row))[:70])

    print("\n=== 7. 写错核对栏要被挡住 ===")
    # _set_chk 自己吃掉异常并弹窗(弹窗在无头测试里会卡住,
    # 所以先把 showerror 换掉),靠**返回值**判断成败 ——
    # 这正是它以前缺的:返回值恒为 None,「被拒」和「没反应」分不开。
    import engine.dashview as _dvmod
    real_err = _dvmod.messagebox.showerror
    shown = []
    _dvmod.messagebox.showerror = lambda *a, **k: shown.append(a)
    try:
        ok = dv._set_chk(it, "x", "ok", "")
        ck("写错核对栏返回 False", ok is False, repr(ok))
        ck("弹了窗告诉本人", bool(shown), str(shown[:1]))
        ck("状态栏留下痕迹", "保存失败" in dv._dbg.get(), dv._dbg.get()[:40])
        ck("失败后界面没崩", dv.winfo_exists() == 1)
        ck("失败时没有落盘",
           CL.read(proj)[CL.key_of(it)]["m"]["note"] == "首件合格")
    finally:
        _dvmod.messagebox.showerror = real_err

    print("\n=== 7b. ★ 采购件核的是型号和数量(本地端)===")
    # 本人原话:「采购件的核对是核对数量和型号」。
    # 界面上必须能看出来:外购件那栏写的是「型号正确」,而且**多一格到货数量**,
    # 数量少了直接把差额标红。早先两栏共用「合格/不合格/返工」,
    # 点开菜单看到的是「返工」—— 外购件根本没有返工这回事。
    buy = next(i for i in dv.items
               if CL.kind_of(i) == "p" and CL.need_qty(i))
    brow = next(r for r in dv._row_refs
                if buy["pn"] in " ".join(labels_in(r))
                and buy["nm"] in " ".join(labels_in(r)))
    btxt = " ".join(labels_in(brow))
    ck("外购件那栏写「新购件核对」", "新购件核对" in btxt, btxt[:80])
    ck("状态词是「待核对」不是「待核」", "待核对" in btxt, btxt[:80])
    ck("不出现「返工」", "返工" not in btxt, btxt[:80])
    ck("有「到货」那一格", "到货" in btxt, btxt[:90])
    ck("到货那格把需求量摆出来", "需" in btxt, btxt[:90])
    ck("还没记到货时显示「—」", "—" in btxt, btxt[:90])

    need = CL.need_qty(buy)
    got = int(need) - 1 if float(need).is_integer() else need - 0.5
    ok = dv._set_chk(buy, "p", "ok", "型号对的", qty=str(got))
    ck("写型号 + 到货数量返回 True", ok is True, repr(ok))
    pump(root, 500)
    rec = CL.read(proj)[CL.key_of(buy)]["p"]
    ck("型号落盘成 ok", rec["st"] == "ok", rec["st"])
    ck("到货数量落盘", rec["qty"] == str(got), str(rec["qty"]))
    brow = next(r for r in dv._row_refs
                if buy["pn"] in " ".join(labels_in(r))
                and buy["nm"] in " ".join(labels_in(r)))
    btxt = " ".join(labels_in(brow))
    ck("那行显示「型号正确」", "型号正确" in btxt, btxt[:90])
    ck("数量短缺直接标出「差」", "差" in btxt, btxt[:100])

    # 只改型号,不带 qty —— 数量不能被顺手清掉。
    # 这是最容易出的一个坑:_set_chk 以前压根没有 qty 参数,
    # 现在多了一条写路径,不带就是「不动它」,不是「置空」。
    dv._set_chk(buy, "p", "bad", "拿错型号了")
    pump(root, 400)
    rec = CL.read(proj)[CL.key_of(buy)]["p"]
    ck("只改型号时到货数量没被清掉", rec["qty"] == str(got), str(rec["qty"]))
    ck("型号改成不对", rec["st"] == "bad", rec["st"])

    # 数量不能填非数字
    _dvmod.messagebox.showerror = lambda *a, **k: shown.append(a)
    try:
        ok = dv._set_chk(buy, "p", "ok", "", qty="来了好多")
        ck("到货数量填非数字返回 False", ok is False, repr(ok))
        ck("填错的数没落盘",
           CL.read(proj)[CL.key_of(buy)]["p"]["qty"] == str(got))
    finally:
        _dvmod.messagebox.showerror = real_err

    print("\n=== 8. 筛选 / 搜索 / 排序 ===")
    dv._pick("外购件")
    pump(root, 300)
    ck("按分类筛只剩外购件", len(dv._rows) == 48, str(len(dv._rows)))
    ck("筛选后核对栏也跟着换",
       all("新购件核对" in " ".join(labels_in(r)) for r in dv._row_refs[:3]))
    dv._pick(None)
    pump(root, 300)
    ck("回到全部", len(dv._rows) == 89, str(len(dv._rows)))
    first_pn = dv._rows[0]["pn"]
    dv._kw = ["不存在ZZZ"]
    dv._fill()
    pump(root, 300)
    ck("搜不到时有提示",
       "没有匹配的零件" in " ".join(labels_in(dv.body)),
       " ".join(labels_in(dv.body))[:40])
    dv._kw = [""]
    dv._fill()
    pump(root, 300)
    ck("清空搜索后恢复", len(dv._rows) == 89, str(len(dv._rows)))
    dv._sort = [("按未核对优先", "_chk")]
    dv._fill()
    pump(root, 400)
    ck("按未核对排序后仍是 89 行", len(dv._rows) == 89, str(len(dv._rows)))
    ck("排序没有丢零件", sorted(r["pn"] for r in dv._rows)
       == sorted(r["pn"] for r in dv.items))

    print("\n=== 9. 反复重画不泄漏、不变慢 ===")
    import time
    # 第一次重画含建 89 张 PhotoImage(冷启动);之后都走缓存。
    # 真人感受到的是**第二遍以后**的速度 —— 搜一下、换排序、切分类
    # 全是热路径。所以分别量,不混成一个数字。
    t0 = time.time()
    dv._fill()
    cold = time.time() - t0
    t0 = time.time()
    for _ in range(5):
        dv._fill()
    warm = (time.time() - t0) / 5
    pump(root, 200)
    ck("重画后行数还是 89", len(dv._row_refs) == 89, str(len(dv._row_refs)))
    ck("冷启动(含建 89 张缩略图)不超过 4s", cold < 4, f"{cold:.2f}s")
    ck("热重画不超过 0.5s(这才是敲搜索框时的手感)", warm < 0.5,
       f"每次 {warm:.2f}s")
    ck("PhotoImage 只按零件数缓存,不随重画增长",
       len(dv._thumbs) <= 89, str(len(dv._thumbs)))
    ck("第一张图还在(缓存没被清掉)", CL.key_of(dv.items[0]) in dv._thumbs)

    print("\n=== 9b. 搜索框防抖 ===")
    # 每敲一个字就重画 89 行 = 每字卡一秒,输个 4 位图号卡 4 秒,
    # 中途的半截结果还会闪一下。防抖之后:连敲 4 下只重画一次。
    ent = next(c for c in dv.sbar.winfo_children() if isinstance(c, tk.Entry))
    n_fill = [0]
    real_fill = dv._fill

    def counting():
        n_fill[0] += 1
        real_fill()

    dv._fill = counting
    # ★ `event_generate` 投给的是**焦点所在控件**。根窗口 withdraw 之后
    #   焦点经常落不到 Entry 上,事件被 Tk 静默丢掉 ——
    #   表现就是「搜索词生效」「补画 1 次」这类断言时过时不过
    #   (实测连跑 4 次挂 2 次)。拿不到焦点就改走同一个函数,
    #   走的仍然是真实代码路径,不是把断言跳过去。
    ent.focus_set()
    dv.focus_force()
    pump(root, 80)
    real_events = root.focus_get() is ent
    print("     [现场] 搜索框拿到焦点 =", real_events)
    for ch in "Amt-":
        ent.insert("end", ch)
        if real_events:
            ent.event_generate("<KeyRelease>", when="now")
        else:
            dv._on_search_key(None)
        pump(root, 30)
    mid = n_fill[0]
    pump(root, 600)                      # 等防抖到点
    after = n_fill[0]
    dv._fill = real_fill
    ck("敲 4 个字期间没有立刻重画", mid == 0, f"敲完已重画 {mid} 次")
    ck("停手之后补画 1 次", after - mid == 1, f"补画 {after - mid} 次")
    ck("搜索词生效", dv._kw[0] == "Amt-", dv._kw[0])
    ck("搜出来的是零星几件(不是 89 件)",
       len(dv._rows) < 89 and len(dv._rows) > 0, str(len(dv._rows)))
    dv._kw = [""]
    dv._fill()
    pump(root, 200)

    print("\n=== 10. 关闭要干净(PhotoImage 的老坑)===")
    # 必须在**主线程**关。Tk 不支持跨线程操作,PhotoImage.__del__ 要调
    # Tcl —— 从工作线程 delete 一定挂死。这是 Tk 的硬限制,不是 bug,
    # 所以关键是保证关闭这条路**永远在主线程**:
    #   `WM_DELETE_WINDOW` 协议(Tk 回调)、gui.py 里的构造(Tk 回调)。
    # 我第一版这条测试故意开线程去关,结果 8 秒超时 —— 测的不是产品,
    # 测的是 Tk 的一条基本规则,测出来只会让人以为代码有 bug。
    import time
    t0 = time.time()
    try:
        dv._close()
        ok = True
    except Exception as e:
        ok, err = False, f"{type(e).__name__}: {e}"
    ck("关闭能返回(主线程)", ok, f"{time.time() - t0:.2f}s")
    ck("销毁之后 widgets 全清空", len(dv._row_refs) == 0, str(len(dv._row_refs)))
    ck("PhotoImage 引用已清空", len(dv._thumbs) == 0, str(len(dv._thumbs)))
    root.update()
    root.destroy()
    ck("根窗口销毁成功", True)

    print("\n" + "=" * 54)
    if FAILS:
        print(f"第 3 轮:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"第 3 轮全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())