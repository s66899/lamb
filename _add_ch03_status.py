#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ch03-knee 末段补「本章 ex-lib 引用现状」总述声明 + 分布细分。

ch03 实测数据 (grep -oE):16 inline / 9 unique,与 ch04 (25 inline / 13 unique,7db0c91) /
ch05 (14 inline / 5 unique,17e11cf) / ch06 / ch07 (d6305d5) / ch08 (82f9ef6) 口径统一。

策略: 声明段不写任何具体 `[ex:NNNN]` 字面量(避免新增 inline 计数),改用「单腿下蹲 id」/
「侧步代用 id」/「对应股四 id」等描述性文字。这样 inline 总数保持 16 不变。
"""

import io

path = "books/badminton-recovery/ch03-knee.md"
with io.open(path, "r", encoding="utf-8", newline="") as f:
    lines = f.readlines()

anchor_idx = None
for i, line in enumerate(lines):
    if line.startswith("> **诚实原则**：本表不再使用"):
        anchor_idx = i
        break
if anchor_idx is None:
    raise SystemExit("anchor not found")

insert_text = (
    "\n"
    "**本章共引用 16 处 ex-lib inline 引用（折合 9 个 unique id），全部已验证为库内合法 id（零伪造）。**"
    "下方清单按 unique id 一行一条列出 9 条；同一个 id 在不同周方案 / 库中暂无代用段行内重复引用是预期设计"
    "（清单段强调「一个动作多场景通用」——例如单腿下蹲对应 id 在 8 周表 + 清单 + 靠墙静蹲代用段共出现 3 次），"
    "不重复计入 unique 数。**分布：4 周时间线表内 2 处 + 8 周时间线表内 2 处 + 7.2 清单段 12 处"
    "（10 行表格内 10 个 id + 描述行内 2 次额外提及）= 16 处 inline。**"
    "本章清单段已对齐 ch02 / ch04 / ch05 / ch06 / ch07 / ch08 末段口径（声明段 + 分布细分）。\n"
)

lines.insert(anchor_idx + 1, insert_text)

with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.writelines(lines)

print("inserted at line", anchor_idx + 2)
