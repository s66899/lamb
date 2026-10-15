# -*- coding: utf-8 -*-
"""`build_core.bom_tables()` 的分类解析 —— 单测。

单��拎出来,是因为这里出过一个大问题:

    早先的写法是「只要有任何一个 bomSources,就整个用外部的 BOM 表」,
    和它自己 docstring 写的「项目自己的 2_BOM表 优先」正好相反。
    真实项目上外部那份 `BOM表\\` 少了一张 `外购件物料表.xlsx`,
    于是**外购件整类 48 件从看板上消失**(89 变 41),
    而且**一页构建日志都没提这件事** —— `excel.build` 也不再生成
    那张产出表,越重建越少。

    这对「加工后核对 / 新购件核对」是致命的:一半的零件(外购件)
    在任何一次构建之后都从看板上消失,那一半的「新购件核对」根本没法填。

跑法:
    python t14_bomtables.py
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import sandbox                                    # noqa: E402

import build_core as B                            # noqa: E402
import engine.config as C                         # noqa: E402
import engine.paths as paths                      # noqa: E402

BOX = Path(r"D:\助手工程师\_沙箱测试项目")
REAL = Path(r"D:\助手工程师\项目\马桶项目改动零件加工")
FAILS: list[str] = []
N = [0]


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)


def cfg_of(root: Path):
    proj = paths.Project(root)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(root)
    return proj, cfg


def main() -> int:
    print("\n=== 1. 沙箱:5 个分类一个都不能少 ===")
    sandbox.make()
    proj, cfg = cfg_of(BOX)
    msgs = []
    tabs = B.bom_tables(cfg, proj, log=msgs.append)
    cats = [c for _, c, _ in tabs]
    ck("取到 5 个分类", len(cats) == 5, str(cats))
    ck("外购件在内", "外购件" in cats, str(cats))
    ck("没有「两边都没有」的提醒", not msgs, str(msgs))
    items, src = B.read_items(cfg, proj, log=lambda m: None)
    ck("读出 89 件", len(items) == 89, f"{len(items)}")
    ck("外购件那 48 件都在", sum(1 for i in items if i["cat"] == "外购件") == 48,
       str(sum(1 for i in items if i["cat"] == "外购件")))
    ck("来源说明写全了分类", "外购件" in src, src)

    print("\n=== 2. ★ 项目自己的 2_BOM表 优先于外部 BOM 表 ===")
    # 沙箱没有 3D打印件物料表.xlsx(真实项目也没有),它必须回退到
    # 外部那份 —— 这正是「按分类取」的意义:一个分类缺了,
    # 不能把**其他四个**也跟着丢掉。
    src_dir = {}
    for p, c, _ in tabs:
        src_dir.setdefault(c, set()).add(p.parent.name)
    ck("3D打印件 回退到外部 BOM 表",
       src_dir.get("3D打印件") == {"BOM表"}, str(src_dir.get("3D打印件")))
    ck("外购件 用项目自己的 2_BOM表",
       src_dir.get("外购件") == {"2_BOM表"}, str(src_dir.get("外购件")))

    print("\n=== 3. 回退与告警 ===")
    # (a) 某一类只在外部有 —— 必须能回退取到。
    #     我第一版是「把项目自己那份删掉」,结果这一类两边都没了,
    #     断言「应能取到」当然失败。真实情况是**外部那份也不存在**
    #     (那正是原 bug 的根因),所以得先造一个「只在外部有」的分类。
    tmp_ext = BOX / "外部BOM表"
    tmp_ext.mkdir(exist_ok=True)
    only_ext = tmp_ext / "3D打印件物料表.xlsx"
    if not only_ext.is_file():
        shutil.copy2(REAL / "2_BOM表" / "塑胶件物料表.xlsx", only_ext)
    cfg2 = C.with_defaults(C.load(paths.Project(BOX)))
    cfg2["_proj_root"] = str(BOX)
    cfg2["bomSources"] = [s for s in (cfg2.get("bomSources") or [])
                          if s.get("cat") != "3D打印件"]
    cfg2["bomSources"].append({"cat": "3D打印件",
                               "path": str(only_ext), "sheet": None})
    own = paths.Project(BOX).bom_file("3D打印件")
    had_own = own.is_file()
    saved = own.read_bytes() if had_own else None
    try:
        if had_own:
            own.unlink()
        got = []
        tabs2 = B.bom_tables(cfg2, paths.Project(BOX), log=got.append)
        cats2 = [c for _, c, _ in tabs2]
        ck("只在外部有的分类仍能取到(回退生效)", "3D打印件" in cats2, str(cats2))
        ck("取的是外部那份",
           any(c == "3D打印件" and p.parent.name == "外部BOM表"
               for p, c, _ in tabs2),
           str([(c, p.parent.name) for p, c, _ in tabs2]))
        ck("回退不算「缺失」,不喊", not any("3D打印件" in m for m in got), str(got))
    finally:
        if had_own and saved is not None:
            own.write_bytes(saved)
        shutil.rmtree(tmp_ext, ignore_errors=True)

    # (b) 某一类两边都没有 —— 必须跳过**并且**喊出来。
    cfg3 = C.with_defaults(C.load(paths.Project(BOX)))
    cfg3["_proj_root"] = str(BOX)
    for s in cfg3.get("bomSources") or []:
        if s.get("cat") == "外购件":
            s["path"] = str(BOX / "不存在的目录" / "外购件物料表.xlsx")
    own2 = paths.Project(BOX).bom_file("外购件")
    saved2 = own2.read_bytes()
    try:
        own2.unlink()
        got2 = []
        tabs3 = B.bom_tables(cfg3, paths.Project(BOX), log=got2.append)
        cats3 = [c for _, c, _ in tabs3]
        ck("两边都没有时该分类被跳过", "外购件" not in cats3, str(cats3))
        ck("并且**在日志里喊出来了**", any("外购件" in m for m in got2), str(got2))
        ck("喊出来的话说明了后果",
           any("不会出现在看板上" in m for m in got2), str(got2))
        ck("其它四个分类不受影响", len(cats3) == 4, str(cats3))
    finally:
        own2.write_bytes(saved2)

    print("\n=== 4. 真实项目:89 件,四张物料表都在 ===")
    if REAL.is_dir():
        rproj, rcfg = cfg_of(REAL)
        rt = B.bom_tables(rcfg, rproj, log=lambda m: None)
        rcats = [c for _, c, _ in rt]
        ck("真项目 5 个分类齐", len(rcats) == 5, str(rcats))
        ritems, rsrc = B.read_items(rcfg, rproj, log=lambda m: None)
        ck("真项目读出 89 件", len(ritems) == 89, f"{len(ritems)}")
        ck("真项目外购件 48 件",
           sum(1 for i in ritems if i["cat"] == "外购件") == 48,
           str(sum(1 for i in ritems if i["cat"] == "外购件")))
        ck("真项目的产出表没被动过(测试不写盘)",
           len(list((REAL / "2_BOM表").glob("*物料表.xlsx"))) == 4,
           str([p.name for p in (REAL / "2_BOM表").glob("*物料表.xlsx")]))
    else:
        ck("真实项目在", False, str(REAL))

    print("\n" + "=" * 54)
    if FAILS:
        print(f"bom_tables 测试:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"bom_tables 测试全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())