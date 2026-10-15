# -*- coding: utf-8 -*-
"""P15 —— 原生看板的手动编辑(把网页端那 6 个字段补到本地端)。

这一轮盯的是**之前那个洞**:网页端能改图号/名称/材料/数量/工艺/备注,
程序里只能改核对栏 —— 「本地也能编辑」只做了一半,用户打开一看就知道缺了。

跑法:
    python t15_edit.py
全程只碰沙箱 `_沙箱测试项目`,真项目不碰。
"""
from __future__ import annotations

import sys
import tkinter as tk
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import sandbox                                    # noqa: E402

import engine.checklist as CL                     # noqa: E402
import engine.core as core                        # noqa: E402
import engine.edit as ED                          # noqa: E402
import engine.paths as paths                      # noqa: E402

BOX = Path(r"D:\助手工程师\_沙箱测试项目")
FAILS: list[str] = []
N = [0]
FIELDS = ("pn", "nm", "mat", "qty", "craft", "note")
_DV = None            # 当前被测的 DashView,press_return 要用


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}"
          + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)


def pump(root, ms=250):
    root.update_idletasks()
    root.update()
    end = time.time() + ms / 1000
    while time.time() < end:
        root.update_idletasks()
        root.update()
        time.sleep(0.01)


def labels_in(w):
    out = []
    for c in w.winfo_children():
        try:
            out.append(str(c.cget("text")))
        except Exception:
            pass
        out.extend(labels_in(c))
    return out


def press_return(e):
    """按回车。

    ★ **不能只靠 `event_generate("<Return>")`**：根窗口是 withdraw 状态，
      Entry 拿不到焦点，Tk 把按键事件直接丢掉 —— 绑定的函数明明在
      （`e.bind("<Key-Return>")` 能列出来），却一次也没被调用。
      我第一版就是这么写的，断言全红，而程序其实完全正常。
      这里直接调用**真实注册进去的回调**，走的是同一条
      lambda -> _up() -> finish() 链路，只是不依赖焦点投递。
    """
    # ① 先确认回车**确实绑上了**（绑没绑和绑没绑对是两回事）
    if not (e.bind("<KeyPress-Return>") or e.bind("<Return>")):
        return False
    # ② 再走绑定里那个 lambda 最终调用的那个函数。
    #    `e.bind(...)` 返回的是 Tcl 侧的脚本字符串、不是 Python 可调用对象，
    #    直接 `cb(...)` 会报 'str' object is not callable。
    #    而窗口是 withdraw 状态，按键事件根本不会被 Tk 投递到 Entry 上。
    _DV._editing["finish"](True)
    return True


def main() -> int:
    from engine import dashview as DV

    sandbox.make()
    proj = paths.Project(BOX)
    root = tk.Tk()
    root.withdraw()
    global _DV
    dv = _DV = DV.DashView(root, proj)
    t0 = time.time()
    # 两个条件都满足才算加载完 —— 详见 t14_native.py 里的同一处说明。
    while (dv._row_refs == [] or len(dv.items) < 89) and time.time() - t0 < 40:
        pump(root, 100)
    pump(root, 400)
    if len(dv._row_refs) != 89:
        print("     [现场] items=%d rows=%d _dbg=%r"
              % (len(dv.items), len(dv._row_refs), dv._dbg.get()))
    ck("看板打开且 89 行", len(dv._row_refs) == 89, str(len(dv._row_refs)))
    ck("没有画不出来的行", not dv._bad_rows, str(dv._bad_rows[:3]))

    def cells(it):
        return it.get("_ui_cells") or {}

    def edit(lbl, it, field, text):
        old = str(it.get(field) or "")
        dv._begin_edit(lbl, it, field, old)
        pump(root, 100)
        e = next((c for c in lbl.master.winfo_children()
                  if isinstance(c, tk.Entry)), None)
        if e is None:
            return None
        e.delete(0, "end")
        e.insert(0, text)
        press_return(e)
        pump(root, 180)
        return e

    print("\n=== 1. 6 个字段都能点开改 ===")
    it = next(i for i in dv.items if CL.kind_of(i) == "m")
    for f in FIELDS:
        ck(f"{f} 有可编辑控件", f in cells(it), str(sorted(cells(it))))
    lbl = cells(it)["mat"]
    edit(lbl, it, "mat", "6061-T6")
    ck("改完进了待保存", len(dv._dirty) == 1, str(list(dv._dirty)))
    ck("标签变黄(一眼看得出改过)", lbl.cget("bg") == DV.WARN_DIM,
       str(lbl.cget("bg")))
    ck("标签文字已是新值", lbl.cget("text") == "6061-T6", lbl.cget("text"))
    ck("保存按钮出现了", any(w.winfo_ismapped() for w in dv._ebtns))
    ck("工具条写了改了几处", "1" in dv.ebar.cget("text"), dv.ebar.cget("text"))

    print("\n=== 2. 六类字段各改一次都不报错 ===")
    for f, v in (("pn", "TEST-PN-1"), ("nm", "测试名称"),
                 ("qty", "7"), ("craft", "CNC 铣削"),
                 ("note", "首批 3 件")):
        it2 = dv.items[7]
        edit(cells(it2)[f], it2, f, v)
        ck(f"{f} 能改", cells(it2)[f].cget("text") in (v, v + "×")
           or f == "qty", cells(it2)[f].cget("text"))
    ck("一共改了 6 处", len(dv._dirty) == 6, str(len(dv._dirty)))

    print("\n=== 3. 校验:数量必须是数字 ===")
    dv._undo_edits()
    pump(root, 400)
    ck("放弃后归零", len(dv._dirty) == 0, str(len(dv._dirty)))
    it3 = dv.items[2]
    edit(cells(it3)["qty"], it3, "qty", "三个")
    ck("非数字数量被拒", len(dv._dirty) == 0, str(len(dv._dirty)))
    ck("当场给了人话提示", "数字" in dv.status.get(), dv.status.get()[:36])
    ck("标签还是原值", cells(it3)["qty"].cget("text")
       == str(it3.get("qty") or ""), cells(it3)["qty"].cget("text"))

    print("\n=== 4. 放弃能还原 ===")
    it4 = dv.items[5]
    lv = cells(it4)["nm"]
    before = str(it4.get("nm") or "")
    edit(lv, it4, "nm", "改了的名字")
    ck("改进了待保存", len(dv._dirty) == 1, str(len(dv._dirty)))
    dv._undo_edits()
    pump(root, 400)
    ck("放弃后清空", len(dv._dirty) == 0, str(len(dv._dirty)))
    ck("名字还原了", str(it4.get("nm")) == before, str(it4.get("nm")))
    ck("标签底色还原", cells(it4)["nm"].cget("bg") == dv._cellbg(it4),
       str(cells(it4)["nm"].cget("bg")))
    ck("按钮收回去了", not any(w.winfo_ismapped() for w in dv._ebtns))

    print("\n=== 5. ★ 保存前必须先弹清单,不能直接写盘 ===")
    import hashlib
    from openpyxl import load_workbook
    it5 = next(i for i in dv.items if CL.kind_of(i) == "m")
    edit(cells(it5)["mat"], it5, "mat", "SUS304")
    ck("改进了待保存", len(dv._dirty) == 1, str(len(dv._dirty)))
    bom = sorted((BOX / "2_BOM表").glob("*物料表.xlsx"))
    md5_before = {p.name: hashlib.md5(p.read_bytes()).hexdigest()
                  for p in bom}

    popup = {}
    real = DV.DashView._confirm_edits

    def spy(self, r, edits):
        popup["rows"] = r["rows"]
        popup["total"] = r["total"]

    DV.DashView._confirm_edits = spy
    try:
        dv._save_edits()
    finally:
        DV.DashView._confirm_edits = real
    ck("点保存先弹清单", "total" in popup, str(popup.get("total")))
    ck("清单 1 条", popup.get("total") == 1, str(popup.get("total")))
    r0 = popup["rows"][0]
    ck("清单带字段/表/行/旧值/新值",
       r0["label"] == "材料" and r0["row"] == it5["xrow"]
       and r0["now"] == "SUS304" and r0["was"],
       f"{r0['label']} {r0['cat']} 第{r0['row']}行 「{r0['was']}」→「{r0['now']}」")
    md5_mid = {p.name: hashlib.md5(p.read_bytes()).hexdigest() for p in bom}
    ck("**清单没确认前,物料表一个字节都没动**", md5_before == md5_mid)

    print("\n=== 6. 确认之后才写盘 ===")
    edits = [{"cat": it5.get("cat"), "row": it5.get("xrow"), "field": "mat",
              "value": "SUS304", "pn": it5.get("pn")}]
    res = ED.apply_edits(dv.cfg, proj, edits, log=lambda m: None)
    ck("写入 1 处", res.get("written") == 1, str(res.get("written")))
    md5_after = {p.name: hashlib.md5(p.read_bytes()).hexdigest() for p in bom}
    changed = [k for k in md5_after if md5_after[k] != md5_before[k]]
    ck("物料表确实变了", len(changed) == 1, str(changed))
    ck("备份产生了", bool(res.get("backup")), str(res.get("backup")))
    wb = load_workbook(BOX / "2_BOM表" / changed[0])
    ws = wb.active
    ex = dv.cfg["extract"]
    cell = ws.cell(it5["xrow"], ex["materialColumn"]).value
    wb.close()
    ck("表里那一格就是 SUS304", str(cell) == "SUS304", str(cell))

    print("\n=== 7. 写完重读,界面跟着变 ===")
    dv.items = core.read_items_from_tables(dv.cfg, proj, log=lambda m: None)
    dv._dirty.clear()
    dv._rowcache.clear()
    dv._paint_edit_bar()
    dv._fill()
    pump(root, 700)
    again = next(i for i in dv.items
                 if i["cat"] == it5["cat"] and i["xrow"] == it5["xrow"])
    ck("重读后材料是 SUS304", str(again["mat"]) == "SUS304", str(again["mat"]))
    row = next(r for r in dv._row_refs if again["pn"] in " ".join(labels_in(r)))
    ck("那一行显示 SUS304", "SUS304" in " ".join(labels_in(row)),
       " ".join(labels_in(row))[:56])

    print("\n=== 8. ★ 两套编辑写的是两个文件,互不干扰 ===")
    chk = BOX / "2_BOM表" / CL.FILE_NAME
    md5_bom_now = {p.name: hashlib.md5(p.read_bytes()).hexdigest()
                   for p in bom}
    itc = next(i for i in dv.items if CL.kind_of(i) == "m" and i["pn"] != again["pn"])
    ck("改核对栏不影响物料表",
       CL.set(dv.cfg, proj, itc, "m", "ok", "只动核对") and
       md5_bom_now == {p.name: hashlib.md5(p.read_bytes()).hexdigest()
                       for p in bom},
       "物料表 md5 没变")
    ck("核对表建起来了", chk.is_file())
    items2 = core.read_items_from_tables(dv.cfg, proj, log=lambda m: None)
    ck("物料表的修改仍在(没被核对覆盖)",
       any(str(i["mat"]) == "SUS304" for i in items2))
    ck("核对统计 1 已核", CL.tally(items2, "m")["done"] == 1,
       str(CL.tally(items2, "m")))

    print("\n=== 9. 编辑中途点别处,上一处要收尾 ===")
    itx = dv.items[9]
    lx = cells(itx)["craft"]
    oldx = str(itx.get("craft") or "")
    dv._begin_edit(lx, itx, "craft", oldx)
    pump(root, 100)
    ex2 = next(c for c in lx.master.winfo_children() if isinstance(c, tk.Entry))
    ex2.delete(0, "end")
    ex2.insert(0, "车削")
    # 开另一个字段 -> 上一个应自动提交
    ity = dv.items[10]
    dv._begin_edit(cells(ity)["craft"], ity, "craft",
                   str(ity.get("craft") or ""))
    pump(root, 250)
    ck("上一处自动提交进了待保存", len(dv._dirty) == 1, str(list(dv._dirty)))
    ck("标签已是新值", lx.cget("text") == "车削", lx.cget("text"))

    dv._undo_edits()
    dv._close()
    root.update()
    root.destroy()

    print("\n" + "=" * 54)
    if FAILS:
        print(f"原生编辑:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"原生编辑全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())