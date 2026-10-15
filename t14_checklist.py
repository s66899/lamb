# -*- coding: utf-8 -*-
"""P14 —— 加工后核对 / 新购件核对:数据层测试(共 3 轮,这是第 1 轮)。

跑法:
    python t14_checklist.py            # 第 1 轮:数据层(本文件)
    python t14_api.py                  # 第 2 轮:接口层
    python t14_native.py               # 第 3 轮:原生看板

**全程只碰沙箱项目 `_沙箱测试项目`,绝不碰真项目。**
真项目里那 4 张物料表是命数据,一次写错就没法恢复。
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.argv = [sys.argv[0]]

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


def md5(p: Path) -> str:
    return hashlib.md5(p.read_bytes()).hexdigest()


def bom_files() -> list[Path]:
    return sorted((BOX / "2_BOM表").glob("*物料表.xlsx"))


def row_count(p: Path) -> int:
    from openpyxl import load_workbook
    wb = load_workbook(p, read_only=True)
    try:
        ws = wb.active
        return sum(1 for r in ws.iter_rows(min_row=CL.FIRST_DATA_ROW,
                                          values_only=True)
                   if r and r[0])
    finally:
        wb.close()


def E(it, kind="m", st="ok", note="", qty=None):
    """造一条 payload。

    qty 只有外购件用得上 —— 本人原话:「采购件的核对是核对数量和型号」。
    """
    return {"cat": it["cat"], "src": it["src"], "row": it["xrow"],
            "pn": it["pn"], "nm": it["nm"], "kind": kind, "st": st,
            "note": note, "qty": qty}


def main() -> int:
    from openpyxl import load_workbook

    sandbox.make()
    proj = paths.Project(BOX)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(BOX)
    chk_file = CL.check_path(proj)

    print("\n=== 1. 起始状态 ===")
    ck("核对表还不存在", not chk_file.exists())
    items = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    ck("零件读到 89 件", len(items) == 89, f"{len(items)}")
    ck("每件都挂了 chk", all(i.get("chk") for i in items))
    t_m, t_p = CL.tally(items, "m"), CL.tally(items, "p")
    ck("加工后核对只统计自产件", t_m["total"] == 41, f"{t_m}")
    ck("新购件核对只统计外购件", t_p["total"] == 48, f"{t_p}")
    ck("起始全是待核对", t_m["done"] == 0 and t_p["done"] == 0)

    print("\n=== 2. ★ 主键必须是 (表,行号),不是图号 ===")
    # 真实数据里有 22 个「杯头螺钉」(M8*12 / M2*8 / M2*6 …)共用一个图号,
    # 还有 14 行图号是空的 —— 89 件只有 53 个不同的图号。
    # 这一条是整套东西的地基:主键选错,改一个标合格,
    # 看板上另外 21 个会**同时**变成合格,而且不报错。
    from collections import Counter
    by_pn = Counter((i["cat"], i["pn"]) for i in items)
    ck("确实有图号重复(证明这条断言有意义)", len(by_pn) < len(items),
       f"{len(items)} 件只有 {len(by_pn)} 个图号")
    keys = Counter(CL.key_of(i) for i in items)
    ck("(表,行号) 89 件全不重", len(keys) == 89, f"{len(keys)} 个")
    screw = [i for i in items if i["pn"] == "杯头螺钉"]
    ck("22 个杯头螺钉分得开", len(screw) == 22
       and len({CL.key_of(x) for x in screw}) == 22, str(len(screw)))
    CL.set_one(proj, CL._norm_rec(screw[0]["cat"], screw[0]["src"],
                                  screw[0]["xrow"], screw[0]["pn"],
                                  screw[0]["nm"], "p", "ok", "只有 M8*12 合格"))
    items2 = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    st = {i["pn"] + "/" + i["nm"]: CL.get(i)["st"] for i in items2
          if i["pn"] == "杯头螺钉"}
    ck("只有 M8*12 变合格", st.get("杯头螺钉/M8*12") == "ok", str(st.get("杯头螺钉/M8*12")))
    ck("别的 21 个仍是待核对",
       all(v == "todo" for k, v in st.items() if k != "杯头螺钉/M8*12"),
       str([k for k, v in st.items() if v != "todo"]))
    # 清掉,免得后面的计数受影响
    for s in screw:
        CL.set_one(proj, CL._norm_rec(s["cat"], s["src"], s["xrow"], s["pn"],
                                      s["nm"], "p", "todo", ""))
    chk_file.unlink()

    print("\n=== 3. 写一条 / 读回来 ===")
    it = next(i for i in items if CL.kind_of(i) == "m")
    CL.set_one(proj, CL._norm_rec(it["cat"], it["src"], it["xrow"], it["pn"],
                                   it["nm"], "m", "ok", "尺寸全对,首件合格"))
    ck("核对表文件生成了", chk_file.is_file(), f"{chk_file.name}")
    data = CL.read(proj)
    rec = data.get(CL.key_of(it))
    ck("按(表,行号)读得到", rec is not None, f"{CL.key_of(it)}")
    ck("状态是合格", rec["m"]["st"] == "ok", rec["m"]["st"])
    ck("备注完整", rec["m"]["note"] == "尺寸全对,首件合格", rec["m"]["note"])
    ck("另一栏仍是待核对", rec["p"]["st"] == "todo")

    print("\n=== 4. 再写同一行 -> 不产生重复 ===")
    CL.set_one(proj, CL._norm_rec(it["cat"], it["src"], it["xrow"], it["pn"],
                                   it["nm"], "m", "bad", "孔径超差 0.05"))
    ck("同一(表,行号)只有一行", row_count(chk_file) == 1, f"{row_count(chk_file)} 行")
    data = CL.read(proj)
    ck("状态被改成不合格", data[CL.key_of(it)]["m"]["st"] == "bad")
    ck("备注被更新", data[CL.key_of(it)]["m"]["note"] == "孔径超差 0.05")

    print("\n=== 5. ★ 行号漂了要拒绝,不能写到别的零件上 ===")
    # 模拟 BOM 表重建:第 42 行现在是另一个零件了。
    # 只按行号写会把「涡轮轴」的核对结果写到「底板垫块」上,还不报错。
    other = next(i for i in items if CL.key_of(i) != CL.key_of(it))
    # 模拟 BOM 表重建:同一个(表,行号)现在换成了别的零件。
    # 图号要传**新的那个**,校验才比对得出不一致 —— 我第一版传了
    # 它["pn"](和盘上一模一样),于是校验通过、真的写进去了,
    # 后面几条断言全被带崩。测「拒绝」必须真的构造出不一致。
    rec_bad = CL._norm_rec(other["cat"], it["src"], it["xrow"], other["pn"],
                           other["nm"], "m", "ok", "写到别人头上")
    try:
        CL.set_one(proj, rec_bad)
        ck("行号上的图号变了 -> 拒绝", False, "居然写进去了")
    except CL.CheckError as e:
        ck("行号上的图号变了 -> 拒绝", True, str(e)[:50])
        ck("拒绝时说清了是哪一行", it["src"] in str(e) and str(it["xrow"]) in str(e))
    ck("被拒绝后原值没变",
       CL.read(proj)[CL.key_of(it)]["m"]["note"] == "孔径超差 0.05")

    print("\n=== 6. 备份 + 原子写 ===")
    arch = sorted((BOX / "7_归档").glob("核对表改前备份_*"))
    ck("写前有备份", bool(arch), f"{len(arch)} 个")
    tmp = sorted(BOX.glob("2_BOM表/*.tmp*.xlsx"))
    ck("没留下临时文件", not tmp, f"{[t.name for t in tmp]}")

    print("\n=== 7. 两段式:预览不改盘 ===")
    before = md5(chk_file)
    it2 = next(i for i in items if CL.kind_of(i) == "p")
    onfile = CL.read(proj)[CL.key_of(it)]["m"]
    edits = [E(it2, "p", "ok", "202 张,外观完好", qty="202"),
             E(it, "m", onfile["st"], onfile["note"])]  # 和盘上一致 -> 应被剔除
    r = CL.preview(cfg, proj, edits)
    ck("预览返回 1 条(没真变的不列)", r["total"] == 1, f"total={r['total']}")
    ck("预览没改盘", md5(chk_file) == before)
    ck("清单里能看出是哪一件", r["rows"][0]["pn"] == it2["pn"])
    ck("清单带表和行", r["rows"][0]["src"] == it2["src"]
       and str(r["rows"][0]["row"]) == str(it2["xrow"]))
    ck("清单带旧值", "待核对" in r["rows"][0]["was"], r["rows"][0]["was"])
    ck("清单带新值", "型号正确" in r["rows"][0]["now"], r["rows"][0]["now"])
    ck("外购件的清单也带到货数量",
       "到货 202" in r["rows"][0]["now"], r["rows"][0]["now"])
    ck("清单不含内部字段",
       not any(k.startswith("_") for k in r["rows"][0]), str(sorted(r["rows"][0])))

    print("\n=== 8. 确认后才写盘 ===")
    CL.apply(cfg, proj, edits, log=lambda m: None)
    data = CL.read(proj)
    ck("写入生效", data[CL.key_of(it2)]["p"]["st"] == "ok")
    ck("文件确实变了", md5(chk_file) != before)

    print("\n=== 9. 统计 ===")
    items2 = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    t_m2, t_p2 = CL.tally(items2, "m"), CL.tally(items2, "p")
    ck("加工后核对:1 已核 / 40 未核", (t_m2["done"], t_m2["todo"]) == (1, 40),
       f"{t_m2}")
    ck("新购件核对:1 已核 / 47 未核", (t_p2["done"], t_p2["todo"]) == (1, 47),
       f"{t_p2}")
    ck("不合格被单独计数", (t_m2["bad"], t_m2["done"]) == (1, 1), f"{t_m2}")

    print("\n=== 10. 绝不能碰物料表 ===")
    names = [p.name for p in bom_files()]
    ck("物料表数量没变", len(names) == 4, f"{names}")
    ck("核对表不在物料表里", CL.FILE_NAME not in names)

    print("\n=== 11. 校验 ===")
    def expect(fn, msg):
        try:
            fn()
            ck(msg, False, "居然没报错")
        except CL.CheckError as e:
            ck(msg, True, str(e)[:52])
        except Exception as e:
            ck(msg, False, f"抛的不是 CheckError:{type(e).__name__}")
    N8 = CL._norm_rec
    expect(lambda: N8("", it["src"], it["xrow"], it["pn"], it["nm"], "m", "ok", ""),
           "空分类被拒")
    expect(lambda: N8(it["cat"], "", it["xrow"], it["pn"], it["nm"], "m", "ok", ""),
           "空表名被拒")
    expect(lambda: N8(it["cat"], it["src"], "", it["pn"], it["nm"], "m", "ok", ""),
           "空行号被拒")
    expect(lambda: N8(it["cat"], it["src"], it["xrow"], it["pn"], it["nm"],
                      "m", "瞎写", ""), "不存在的状态被拒")
    expect(lambda: N8(it["cat"], it["src"], it["xrow"], it["pn"], it["nm"],
                      "x", "ok", ""), "不认识的核对栏被拒")
    expect(lambda: CL.set_one(proj, N8(it["cat"], it["src"], it["xrow"],
                                       it["pn"], it["nm"], "x", "ok", "")),
           "set_one 也拒(本地端 UI 直接调它)")
    expect(lambda: CL.preview(cfg, proj, []), "空修改被拒")
    expect(lambda: CL.preview(cfg, proj, [{"cat": "机加工件"}]), "缺字段被拒")
    long_note = N8(it["cat"], it["src"], it["xrow"], it["pn"], it["nm"], "m",
                   "ok", "长" * 900)
    ck("超长备注被截到 500", len(long_note["note"]) == CL.MAX_NOTE,
       str(len(long_note["note"])))

    print("\n=== 12. 表头被改过就停手,不能悄悄重建 ===")
    wb = load_workbook(chk_file)
    ws = wb.active
    ws.cell(CL.HEADER_ROW, CL.COL_PN, "改名了")
    wb.save(chk_file)
    wb.close()
    before12 = chk_file.read_bytes()
    try:
        CL.set_one(proj, CL._norm_rec(it2["cat"], it2["src"], it2["xrow"],
                                       it2["pn"], it2["nm"], "p", "ok",
                                       "重开过一次"))
        ck("表头不对 -> 拒绝写入", False, "居然写进去了")
    except CL.CheckError as e:
        ck("表头不对 -> 拒绝写入", True, str(e)[:46])
        ck("说清了要怎么处置", "没有写入" in str(e) and "图号" in str(e))
    # ★ 这一条是关键:拒绝之后**老记录一条都不能少**。
    #   早先的版本是「表头不对就建一张空表接着写」—— 看着成功,
    #   实际上把整份核对记录清空了,日志只有一行「重建一份」。
    ck("拒绝后原来的记录一条没少",
       CL.read(proj)[CL.key_of(it2)]["p"]["st"] == "ok",
       str(CL.read(proj).get(CL.key_of(it2), {}).get("p")))
    ck("拒绝后文件没被动过", chk_file.read_bytes() == before12)

    print("\n=== 13. 核对表坏了也不能把看板读挂 ===")
    good = chk_file.read_bytes()
    chk_file.write_bytes("这不是 xlsx,是个坏文件".encode("utf-8"))
    items3 = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    ck("零件照样读得到", len(items3) == 89, f"{len(items3)}")
    ck("核对栏退回待核对", CL.tally(items3, "m")["done"] == 0)
    ck("读函数自己也不抛", CL.read(proj) == {})
    chk_file.write_bytes(good)
    # 表头这会儿还是「改名了」那个状态,所以读是读不出内容的 ——
    # 这正是第 12 节要拦住的事。把它改回来再验「修好后能读」。
    wb = load_workbook(chk_file)
    wb.active.cell(CL.HEADER_ROW, CL.COL_PN, "图号")
    wb.save(chk_file)
    wb.close()
    ck("修好后又能读到",
       CL.tally(core.read_items_from_tables(cfg, proj,
                                            log=lambda m: None), "m")["done"] == 1)

    print("\n=== 14. ★ 采购件核的是「数量和型号」,不是「合格/不合格」 ===")
    # 本人原话:「采购件的核对是核对数量和型号」。
    # 自产件问「做得对不对」,外购件问「型号对不对、数量够不够」——
    # 这两件事塞进同一套「合格/不合格」里等于把最常出问题的两项盖掉了。
    ck("外购件没有「返工」了", [c for c, _ in CL.P_STATUSES] == ["todo", "ok", "bad"],
       str(CL.P_STATUSES))
    ck("外购件的状态词是型号", "型号正确" in [n for _, n in CL.P_STATUSES])
    ck("自产件还留着「返工」", "返工" in [n for _, n in CL.M_STATUSES])
    ck("两套状态互不串", "返工" not in [n for _, n in CL.P_STATUSES]
       and "合格" not in [n for _, n in CL.P_STATUSES])

    # 外购件的 qty 和 st 各写各的,不能互相顶掉
    buy = next(i for i in items if CL.kind_of(i) == "p" and CL.need_qty(i))
    # ★ 到货数量故意**记少一个**,后面要靠它验「数量不足」能被统计出来。
    #   早先随手填了个 100,而需求量可能不到 100,short 自然是 0,
    #   下面那条断言就这么白挂了。
    _need0 = CL.need_qty(buy)
    _got = int(_need0) - 1 if float(_need0).is_integer() else _need0 - 0.5
    CL.set_one(proj, CL._norm_rec(buy["cat"], buy["src"], buy["xrow"],
                                   buy["pn"], buy["nm"], "p", "ok",
                                   "型号对的", qty=str(_got)))
    r1 = CL.read(proj)[CL.key_of(buy)]["p"]
    ck("型号正确 + 记了到货数量", (r1["st"], r1["qty"]) == ("ok", str(_got)),
       str(r1))
    # 只改型号,不带 qty -> 数量不能被清掉
    CL.set_one(proj, CL._norm_rec(buy["cat"], buy["src"], buy["xrow"],
                                   buy["pn"], buy["nm"], "p", "bad", "型号不对"))
    r2 = CL.read(proj)[CL.key_of(buy)]["p"]
    ck("只改型号时数量还在", (r2["st"], r2["qty"]) == ("bad", str(_got)), str(r2))

    # 数量短缺要能被认出来 —— 这是采购最常出事的地方
    need = CL.need_qty(buy)
    ck("需求量读得出来", need is not None and need > 0, str(need))
    short = int(need) - 1 if float(need).is_integer() else need - 0.5
    fake = dict(buy, chk={"p": {"st": "ok", "note": "", "qty": str(short)}})
    ck("数量少了要报短缺", CL.short_of(fake, str(short)) == need - short,
       f"need={need} got={short}")
    ck("数量够了不算短缺", CL.short_of(fake, str(need)) == 0)
    ck("没填到货数量不算短缺", CL.short_of(fake, None) == 0)
    ck("型号不对 + 数量够 = 有问题", CL.bad_of(fake) is True)
    full = dict(buy, chk={"p": {"st": "ok", "note": "", "qty": str(need)}})
    ck("型号正确 + 数量够 = 没问题", CL.bad_of(full) is False)
    # 只填数量、型号没核 -> 数量短了也得报出来,不能只看型号
    notype = dict(buy, chk={"p": {"st": "todo", "note": "", "qty": str(short)}})
    ck("型号没核但数量短缺 -> 仍算有问题", CL.bad_of(notype) is True)
    ck("型号没核、数量也没填 -> 不算有问题", CL.bad_of(dict(
        buy, chk={"p": {"st": "todo", "note": "", "qty": None}})) is False)

    # 到货数量必须是数字,留空表示「还没记到货」而不是「记了 0 个」
    ck("留空 = 没记到货", CL._norm_qty("") is None and CL._norm_qty(None) is None)
    ck("纯数字收下", CL._norm_qty("98") == "98")
    ck("小数也收下", CL._norm_qty("2.5") == "2.5")
    try:
        CL._norm_qty("来了好多")
        ck("非数字被拒", False, "居然收下了")
    except CL.CheckError as e:
        ck("非数字被拒", "数字" in str(e), str(e)[:40])

    # 统计里要单列「数量不足」
    it3 = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    tp = CL.tally(it3, "p")
    ck("统计带 short 字段", "short" in tp and tp["short"] >= 1, str(tp))
    ck("型号不对被算成 bad", tp["bad"] >= 1, str(tp))

    print("\n" + "=" * 54)
    if FAILS:
        print(f"第 1 轮:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"第 1 轮全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())