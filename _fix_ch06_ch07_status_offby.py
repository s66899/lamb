#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复羽毛球康复书 ch06 / ch07 末段 ex-lib 引用总数声明 off-by-N bug:
- ch06 声明 35 处 inline, 实际 36 处(差 +1 — 状态行内嵌 [ex:1352] × 1)
- ch07 声明 29 处 inline, 实际 33 处(差 +4 — 状态行内嵌 4 个 id × 1)
两者都是「状态行内嵌 id」未计入总数。

修复策略:在原声明行尾追加"含本声明句同 N 个 id 各 1 处内嵌,合计 X 处 inline"澄清项,
**不新增 [ex:XXXX] 语法**(否则会让 inline 总数继续增长,fix 失去意义);
原说明段 / 清单段的 [ex:XXXX] 全部保留,口径不变。

输入: books/badminton-recovery/ch06-back.md, books/badminton-recovery/ch07-achilles.md
输出: 原地写入(diff 干净,全角标点保留,LF 保持)
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent
CH06 = ROOT / "books" / "badminton-recovery" / "ch06-back.md"
CH07 = ROOT / "books" / "badminton-recovery" / "ch07-achilles.md"


def patch_ch06():
    text = CH06.read_text(encoding="utf-8")
    old = (
        "分布：4 周时间线 4 处 + 8 周时间线 9 处 + 12 周时间线 4 处 + 后场力学纠正 4 处 + 下方清单 13 unique + 说明段 1 处（[ex:1352] 再引）= 35 处 inline。"
    )
    new = (
        "分布：4 周时间线 4 处 + 8 周时间线 9 处 + 12 周时间线 4 处 + 后场力学纠正 4 处 + 下方清单 13 unique + 说明段 1 处（[ex:1352] 再引）= 35 处 inline（含本声明句同 1352 这 1 个 id 内嵌 1 次，合计 36 处 inline）。"
    )
    if old not in text:
        print("ERROR: ch06 anchor not found", file=sys.stderr)
        return False
    text = text.replace(old, new, 1)
    CH06.write_text(text, encoding="utf-8", newline="")
    return True


def patch_ch07():
    text = CH07.read_text(encoding="utf-8")
    old = (
        "分布：4 周时间线 6 处 + 8 周时间线 5 处 + 12 周时间线 0 处 + 杀球落地缓冲训练 1 处 + 下方清单 13 unique + 说明段 4 处（[ex:5211] / [ex:1373] / [ex:1490] / [ex:1368]）= 29 处 inline。"
    )
    new = (
        "分布：4 周时间线 6 处 + 8 周时间线 5 处 + 12 周时间线 0 处 + 杀球落地缓冲训练 1 处 + 下方清单 13 unique + 说明段 4 处（[ex:5211] / [ex:1373] / [ex:1490] / [ex:1368]）= 29 处 inline（含本声明句同 5211 / 1373 / 1490 / 1368 这 4 个 id 各内嵌 1 次，合计 33 处 inline）。"
    )
    if old not in text:
        print("ERROR: ch07 anchor not found", file=sys.stderr)
        return False
    text = text.replace(old, new, 1)
    CH07.write_text(text, encoding="utf-8", newline="")
    return True


if __name__ == "__main__":
    ok6 = patch_ch06()
    ok7 = patch_ch07()
    print("ch06 patched:", ok6)
    print("ch07 patched:", ok7)
    sys.exit(0 if (ok6 and ok7) else 1)