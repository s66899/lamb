# -*- coding: utf-8 -*-
"""P14 —— 加工后核对 / 新购件核对:接口层测试(共 3 轮,这是第 2 轮)。

跑法:
    python t14_checklist.py            # 第 1 轮:数据层
    python t14_checklist.py 2          # 第 2 轮:接口层(本文件)
    python t14_checklist.py 3          # 第 3 轮:端到端

**全程只碰沙箱项目 `_沙箱测试项目`,绝不碰真项目。**
真项目里那 4 张物料表是命数据,一次写错就没法恢复。
"""
from __future__ import annotations

import json
import shutil
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import sandbox                                    # noqa: E402

import engine.checklist as CL                     # noqa: E402
import engine.config as C                         # noqa: E402
import engine.core as core                        # noqa: E402
import engine.paths as paths                      # noqa: E402
import engine.server as S                         # noqa: E402

BOX = Path(r"D:\助手工程师\_沙箱测试项目")
PORT = 8917
BASE = f"http://127.0.0.1:{PORT}"
FAILS: list[str] = []
N = [0]


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)


def post(path: str, body: dict):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def E(it, kind="m", st="ok", note="", qty=None):
    return {"cat": it["cat"], "src": it["src"], "row": it["xrow"],
            "pn": it["pn"], "nm": it["nm"], "kind": kind, "st": st,
            "note": note, "qty": qty}


def bom_md5() -> dict:
    import hashlib
    return {p.name: hashlib.md5(p.read_bytes()).hexdigest()
            for p in sorted((BOX / "2_BOM表").glob("*物料表.xlsx"))}


def main() -> int:
    sandbox.make()
    chk_file = BOX / "2_BOM表" / CL.FILE_NAME

    print("\n=== 1. 先出一份看板,再起一个真服务(不是 mock) ===")
    proj = paths.Project(BOX)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(BOX)
    items = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    # 直接 render,**不走 build_core** —— build 会重写物料表,
    # 沙箱里无所谓,但会让「物料表一个字节都没动」这条断言失去意义。
    import engine.dashboard as D
    D.render(cfg, proj, items, issues=[], conflicts=[], live=True,
             out=proj.html, log=lambda m: None)
    ck("看板生成了", proj.html.is_file(), proj.html.name)

    httpd, port, _url = S.start_server(proj, port=PORT, open_browser=False)
    ck("服务端口对得上", port == PORT, str(port))
    try:
        with urllib.request.urlopen(BASE + "/", timeout=15) as r:
            ck("首页能打开", r.status == 200)
    except Exception as e:
        ck("首页能打开", False, str(e))
        return 1

    m_it = next(i for i in items if CL.kind_of(i) == "m")
    p_it = next(i for i in items if CL.kind_of(i) == "p")

    print("\n=== 2. 两段式:先预览,不动盘 ===")
    st, j = post("/api/check", {"edits": [E(m_it, "m", "ok", "接口写的")]})
    ck("预览返回 200", st == 200, str(st))
    ck("预览列出 1 条", j.get("total") == 1, str(j.get("total")))
    ck("预览**没有**写盘", not chk_file.exists(), "核对表不该存在")
    ck("清单带核对栏名", j["rows"][0]["label"] == "加工后核对", j["rows"][0]["label"])
    ck("清单带零件", j["rows"][0]["pn"] == m_it["pn"])
    ck("清单带表和行(前端要靠它定位)", j["rows"][0]["src"] == m_it["src"]
       and str(j["rows"][0]["row"]) == str(m_it["xrow"]),
       f'{j["rows"][0]["src"]} 第 {j["rows"][0]["row"]} 行')
    ck("清单**不含**内部字段", not any(k.startswith("_") for k in j["rows"][0]),
       str(sorted(j["rows"][0])))

    print("\n=== 3. 确认后才写盘 ===")
    before = bom_md5()
    st, j = post("/api/check", {"edits": [E(m_it, "m", "ok", "接口写的")],
                                "confirm": True})
    ck("写入返回 200", st == 200, str(st))
    ck("写了 1 处", j.get("written") == 1, str(j.get("written")))
    ck("核对表落盘", chk_file.is_file())
    ck("物料表一个字节都没动", bom_md5() == before)

    print("\n=== 4. 内容对得上(不能显示 A 存成 B)===")
    got = CL.read(paths.Project(BOX))[CL.key_of(m_it)]["m"]
    ck("状态 ok", got["st"] == "ok", got["st"])
    ck("备注逐字一致", got["note"] == "接口写的", got["note"])
    ck("另一栏没被碰",
       CL.read(paths.Project(BOX))[CL.key_of(m_it)]["p"]["st"] == "todo")

    print("\n=== 5. 备注里带括号 / 换行 / 引号 —— 显示和落盘必须一致 ===")
    # 这条是**专门**盯 apply() 那个坑的:以前落盘是把给人看的字符串
    # `合格（孔径±0.05）` 再拆回状态码和备注。备注里只要带个括号,
    # 拆出来就全错,而且不报错。
    tricky = "外径 ±0.02(实测 20.03)\n批次 A/\"首件\";复核 √"
    st, j = post("/api/check", {"edits": [E(p_it, "p", "bad", tricky)],
                                "confirm": True})
    ck("写入 200", st == 200, str(st))
    got = CL.read(paths.Project(BOX))[CL.key_of(p_it)]["p"]
    ck("状态正确", got["st"] == "bad", got["st"])
    ck("备注一字不差(含括号/换行/引号)", got["note"] == tricky, repr(got["note"]))

    print("\n=== 5a. ★ 采购件的核对 = 型号 + 到货数量(接口)===")
    # 本人原话:「采购件的核对是核对数量和型号」。
    # 网页端外购件那栏送两条:型号状态(st) 和 到货数量(qty)。
    # 两样都必须原样落盘,而且**改一样不能把另一样清掉**。
    # ★ 必须**躲开 p_it**:第 5 节刚往它身上写了那条带引号换行的 tricky 备注,
    #   第 9 节还要拿那条备注去看板产物里验「原样进去了」。
    #   挑的时候不排除 p_it,这里一写就把 tricky 冲掉了,那条断言跟着挂 ——
    #   而挂的原因跟备注转义毫无关系,纯属自己踩自己。
    _pkey = CL.key_of(p_it)
    q_it = next(i for i in items
                if CL.kind_of(i) == "p" and CL.need_qty(i)
                and CL.key_of(i) != _pkey)
    need = CL.need_qty(q_it)
    got = int(need) - 1 if float(need).is_integer() else need - 0.5
    st, j = post("/api/check", {"edits": [
        E(q_it, "p", "ok", "型号对的", qty=str(got))], "confirm": True})
    ck("型号 + 数量一起写 200", st == 200, str(st))
    rec = CL.read(paths.Project(BOX))[CL.key_of(q_it)]["p"]
    ck("型号落盘", rec["st"] == "ok", rec["st"])
    ck("到货数量落盘", rec["qty"] == str(got), str(rec["qty"]))
    ck("数量短缺被认出来",
       CL.short_of(dict(q_it, chk={"p": rec}), str(got)) == need - got)

    # 只改备注,不带 qty -> 数量还在
    st, j = post("/api/check", {"edits": [
        E(q_it, "p", "ok", "只改备注")], "confirm": True})
    ck("只改备注 200", st == 200, str(st))
    ck("只改备注不碰数量",
       CL.read(paths.Project(BOX))[CL.key_of(q_it)]["p"]["qty"] == str(got))

    # 预览清单里要能看出到货数量
    st, j = post("/api/check", {"edits": [
        E(q_it, "p", "bad", "拿错型号", qty=str(got))]})
    ck("预览 200", st == 200, str(st))
    ck("清单带新到货数量", "到货 " + str(got) in j["rows"][0]["now"],
       j["rows"][0]["now"])
    ck("清单写的是型号不是合格",
       "型号不对" in j["rows"][0]["now"] and "合格" not in j["rows"][0]["now"],
       j["rows"][0]["now"])
    ck("清单带旧到货数量", "到货 " + str(got) in j["rows"][0]["was"],
       j["rows"][0]["was"])

    # 数量填非数字要挡下来
    st, j = post("/api/check", {"edits": [
        E(q_it, "p", "ok", "", qty="来了好多")]})
    ck("到货数量非数字 -> 4xx", 400 <= st < 500, str(st))
    ck("没写盘",
       CL.read(paths.Project(BOX))[CL.key_of(q_it)]["p"]["st"] == "ok")

    print("\n=== 5b. ★ 22 个共用图号的「杯头螺钉」要能分开记 ===")
    # 这是整套东西最容易出事的地方:外购件里 22 行图号都叫「杯头螺钉」,
    # 名字是 M8*12 / M2*8 / …。接口如果按图号定位,改一个就全变。
    screw = [i for i in items if i["pn"] == "杯头螺钉"]
    ck("沙箱里确实有 22 个杯头螺钉", len(screw) == 22, str(len(screw)))
    st, j = post("/api/check", {"edits": [
        E(screw[0], "p", "ok", "M8*12 到货合格"),
        E(screw[1], "p", "bad", "M2*8 螺纹滑牙")], "confirm": True})
    ck("两条都写成功", st == 200 and j.get("written") == 2, str(j.get("written")))
    got = CL.read(paths.Project(BOX))
    ck("M8*12 是合格", got[CL.key_of(screw[0])]["p"]["st"] == "ok")
    ck("M2*8 是不合格",
       got[CL.key_of(screw[1])]["p"]["st"] == "bad")
    ck("剩下的 20 个没被牵连",
       all((got.get(CL.key_of(s)) or {}).get("p", {}).get("st", "todo") == "todo"
           for s in screw[2:]),
       str([s["nm"] for s in screw[2:]
            if (got.get(CL.key_of(s)) or {}).get("p", {}).get("st", "todo")
            != "todo"]))

    print("\n=== 6. 校验类的错 = 400,而且是人话 ===")
    bad_src = dict(E(p_it, "p", "ok"), src="")
    bad_row = dict(E(p_it, "p", "ok"), row="")
    bad_kind = dict(E(p_it, "p", "ok"), kind="x")
    bad_st = dict(E(p_it, "p", "瞎写"))
    bad_cat = dict(E(p_it, "p", "ok"), cat="")
    for name, body in [
        ("空 edits", {"edits": []}),
        ("状态瞎写", {"edits": [bad_st]}),
        ("核对栏不认识", {"edits": [bad_kind]}),
        ("表名是空的", {"edits": [bad_src]}),
        ("行号是空的", {"edits": [bad_row]}),
        ("分类是空的", {"edits": [bad_cat]}),
    ]:
        st, j = post("/api/check", body)
        ck(name + " -> 400", st == 400, f"status={st}")
        ck(name + " -> 有中文说明", bool(j.get("error")) and
           not j["error"].startswith("Traceback"), str(j.get("error"))[:44])

    print("\n=== 7. 坏请求体也不能把服务搞挂 ===")
    for name, raw in [("不是 JSON", "{这不是json".encode("utf-8")),
                      ("数组不是对象", b"[1,2,3]"),
                      ("空体", b"")]:
        req = urllib.request.Request(BASE + "/api/check", data=raw,
                                     headers={"Content-Type": "application/json"},
                                     method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                code = r.status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:
            code = f"抛异常 {type(e).__name__}"
        ck(name + " -> 4xx", isinstance(code, int) and 400 <= code < 500, str(code))
    # 服务还活着吗
    try:
        with urllib.request.urlopen(BASE + "/", timeout=15) as r:
            ck("服务还活着", r.status == 200)
    except Exception as e:
        ck("服务还活着", False, str(e))

    print("\n=== 8. /api/check 和 /api/edit 必须是两个接口 ===")
    # ★ 这条测的是「不能互相写」。拿核对的 payload 打 /api/edit,
    #   必须被拒;反过来也一样 —— 两边一旦串了,后果就是
    #   把「加工后核对」的结果写进物料表的数量列里,那是命数据。
    import hashlib
    chk_md5 = hashlib.md5(chk_file.read_bytes()).hexdigest()
    ck_payload = {"edits": [E(p_it, "p", "ok", "串门")]}
    st, j = post("/api/edit", dict(ck_payload, confirm=True))
    ck("/api/edit 拒收核对格式(带 confirm 也拒) -> 4xx",
       isinstance(st, int) and 400 <= st < 500, f"status={st} {str(j)[:60]}")
    ck("核对表一个字节都没被 /api/edit 改动",
       hashlib.md5(chk_file.read_bytes()).hexdigest() == chk_md5)
    st, j = post("/api/check", {"edits": [
        {"cat": p_it["cat"], "row": p_it["xrow"], "field": "qty",
         "value": "999", "pn": p_it["pn"]}], "confirm": True})
    ck("/api/check 拒收物料表格式(带 confirm 也拒) -> 4xx",
       isinstance(st, int) and 400 <= st < 500, f"status={st} {str(j)[:60]}")
    ck("物料表数量还是 4", len(bom_md5()) == 4, str(list(bom_md5())))
    ck("核对表还是没被动",
       hashlib.md5(chk_file.read_bytes()).hexdigest() == chk_md5)

    print("\n=== 9. 看板里能看到核对数据 ===")
    # ★ 必须**重新 render**。看板 HTML 是构建那一刻的快照,写完核对表
    #   之后它不会自己变 —— 不重出就断言「页面里有那条备注」,
    #   验的其实是写之前那一份,等于没验。
    items2 = core.read_items_from_tables(cfg, proj, log=lambda m: None)
    D.render(cfg, proj, items2, issues=[], conflicts=[], live=True,
             out=proj.html, log=lambda m: None)
    ck("重读后统计跟着变",
       CL.tally(items2, "m")["done"] == 1, str(CL.tally(items2, "m")))
    with urllib.request.urlopen(BASE + "/6_%E7%9C%8B%E6%9D%BF/"
                                 "%E6%94%B9%E5%8A%A8%E9%9B%B6%E4%BB%B6"
                                 "%E7%9C%8B%E6%9D%BF.html", timeout=40) as r:
        html = r.read().decode("utf-8")
    ck("看板里没有残留的 __CHK_META__", "__CHK_META__" not in html)
    # `@CKHEAD@` **本来就会**留在产物里 —— 它是浏览器运行时用 headOf(cat)
    # 替换的,Python 那边不碰。所以不能断言「不存在」。产物里应该正好
    # 两处:HEAD_T 的字符串字面量里一处、headOf() 的 replace 参数一处。
    # 多于两处说明它泄漏到了别处(比如被塞进了表头里),表头就会显示成
    # `@CKHEAD@` 死列。真的渲染结果由第 3 轮在浏览器里验。
    ck("占位标记恰好 2 处(两处都是 JS 源码里的合法用法)",
       html.count("@CKHEAD@") == 2, str(html.count("@CKHEAD@")))
    ck("headOf 在产物里", "function headOf(cat)" in html)
    ck("看板里出现了加工后核对字样", "加工后核对" in html)
    ck("看板里出现了新购件核对字样", "新购件核对" in html)
    # 备注里带了换行和引号,它在 HTML 里是 **JSON 转义后**的样子,
    # 直接拿原文去 `in` 一定不中 —— 断言要对着转义后的形式,
    # 否则这条永远失败,改的人只会去改代码。
    esc_tricky = json.dumps(tricky, ensure_ascii=False)[1:-1]
    ck("接口写的那条备注原样进了看板", esc_tricky in html, repr(esc_tricky[:30]))
    ck("核对统计卡在页面上", "还剩" in html or "全部已核" in html)
    # 下拉框是**浏览器里**才生成的,所以这里只能数数据里的 chk 字段。
    # (我第一版去数 `class="cks st-`,数出来是 1 —— 那是模板源码里的
    #  字符串拼接式,不是渲染结果,断言的是完全不相干的东西。)
    ck("89 件都带了核对数据", html.count('"chk":') == 89,
       str(html.count('"chk":')))
    ck("外购件那一栏状态是 bad", '"st": "bad"' in html)
    ck("两条杯头螺钉的记录分别进了数据",
       'M8*12 到货合格' in html and 'M2*8 螺纹滑牙' in html)

    print("\n=== 10. 页面能认对 22 个杯头螺钉 ===")
    # 光看数据对不上还不够:前端渲染时也要分开。
    # 这里数一下看板上到底出了几个「杯头螺钉」的核对格。
    n_screw = html.count("杯头螺钉")
    ck("杯头螺钉在数据里出现多次(说明 22 行都在)", n_screw >= 22, str(n_screw))

    httpd.shutdown()
    print("\n" + "=" * 54)
    if FAILS:
        print(f"第 2 轮:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"第 2 轮全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())