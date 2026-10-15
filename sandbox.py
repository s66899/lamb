# -*- coding: utf-8 -*-
"""测试脚手架:复制一个真实项目到沙箱里,专供自动化测试用。

绝不碰 `D:\\助手工程师\\项目\\` 下的真项目 —— 之前有一次调试直接把
正式看板覆盖了,测试自己完全没察觉。

用法:
    python sandbox.py            # 建/重建沙箱
    python sandbox.py --path X   # 只打印沙箱路径
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

APP = Path(r"D:\助手工程师")
REAL = APP / "项目" / "马桶项目改动零件加工"
BOX = APP / "_沙箱测试项目"
CHECK = "核对表.xlsx"


def _unregister() -> None:
    """把自己从项目清单里摘掉。

    `_run_build_locked()` 每跑一次构建都会 `registry_add(proj)`，
    所以只要跑过一次 `t14_all.py`，沙箱就会顶掉你项目列表里的一个位置，
    界面上多出一条「_沙箱测试项目」。测试工具不该在你常用的东西上留痕迹。
    """
    try:
        import json
        import sys
        sys.path.insert(0, str(APP))
        from engine import paths
        reg = paths.REGISTRY_FILE
        if not reg.is_file():
            return
        d = json.loads(reg.read_text(encoding="utf-8-sig"))
        ps = d.get("projects")
        if not isinstance(ps, list):
            return
        keep = [p for p in ps if BOX.name not in str(p.get("path", ""))]
        if len(keep) != len(ps):
            d["projects"] = keep
            reg.write_text(json.dumps(d, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    except Exception:
        pass        # 清理失败不该让测试跑不起来


def make(clean: bool = True) -> Path:
    _unregister()
    if clean and BOX.exists():
        shutil.rmtree(BOX)
    BOX.mkdir(parents=True)
    # 配置
    shutil.copy2(REAL / "项目配置.json", BOX / "项目配置.json")
    # 产出表(BOM)
    (BOX / "2_BOM表").mkdir()
    for f in (REAL / "2_BOM表").glob("*.xlsx"):
        if not f.name.startswith("~$"):
            shutil.copy2(f, BOX / "2_BOM表" / f.name)
    # 交付物:每个分类各取两个,够测匹配就够
    for sub, take in (("3_3D图", 2), ("4_2D图", 2)):
        for cat in sorted((REAL / sub).iterdir()) if (REAL / sub).is_dir() else []:
            if not cat.is_dir():
                continue
            dst = BOX / sub / cat.name
            dst.mkdir(parents=True)
            for f in sorted(cat.iterdir())[:take]:
                if f.is_file() and not f.name.startswith(("~$", ".")):
                    shutil.copy2(f, dst / f.name)
    # 图片不用单独拷:缩略图是**嵌在 xlsx 里的**(core.row_images 读
    # `ws._images`),所以只要有 2_BOM表/*.xlsx,图片就跟着过来了。
    # 真实项目里并没有 `_图片缓存` 目录 —— 之前这里去找它,拷了个空目录,
    # 让人误以为「沙箱里没图」。
    (BOX / "7_归档").mkdir()
    return BOX


if __name__ == "__main__":
    if "--path" in sys.argv:
        print(BOX)
    else:
        p = make()
        n_bom = len(list((p / "2_BOM表").glob("*.xlsx")))
        print(f"沙箱: {p}")
        print(f"  BOM 表 {n_bom} 张(图片就嵌在里面)")