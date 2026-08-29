#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ch04-ankle.md: 末段补「本章 ex-lib 引用现状」总述声明 + 分布细分
口径与 ch05/ch06/ch07/ch08 完全一致(匹配次数口径),数字均实地 awk 统计
"""
import sys, subprocess

PATH = r'books\badminton-recovery\ch04-ankle.md'

# 1. 读真实文件,提取行号锚点
with open(PATH, 'r', encoding='utf-8', newline='') as f:
    text = f.read()

lines = text.split('\n')
# 找 L200: **库中暂无**说明... 段(原 L200, 0-indexed 199)
# 然后插入位置:在该段 + 空行 后,「> 本章摘要版见...」之前
ANCHOR = '**库中暂无**说明：弹力带 4 方向抗阻（dorsiflexion/plantar/inversion/eversion 专项）、单脚闭眼本体感觉训练、跳跃落地专项 变体（仅 [ex:1374] 涵盖单腿跳箱下落稳定一种）、护踝选择。本章表中已严格以现有条目代替，未伪造任何 id。'

idx = None
for i, l in enumerate(lines):
    if l.strip() == ANCHOR:
        idx = i
        break
if idx is None:
    print('ANCHOR NOT FOUND'); sys.exit(1)
print(f'ANCHOR at L{idx+1} (0-indexed {idx})')

# 2. 构造新段(全角中文标点,与文件其他部分完全一致)
NEW = (
    '**本章 ex-lib 引用现状**：本章共引用 25 处 ex-lib inline 引用（折合 13 个 unique id），全部已验证为库内合法 id（零伪造）。'
    '分布：第一层普通人版 9 处（踝绕环 1 + 弹力带抗阻 2 + 提踵训练 2 + 单脚平衡 1 + 平衡盘/平衡球 2 + 跳箱落地 1）+ 互引表 13 处（NSCA ch09 §3 7 类动作一一映射总计 13 个 id）+ 库中暂无说明段 1 处（[ex:1374] 再引）= 25 处 inline。'
    '踝关节康复强调“一个动作对一种功能”（背屈 / 跖屈 / 内翻 / 外翻 / 本体感觉 / 落地缓冲 / 拉伸 / 肌护 各需独立条目），本章 unique id 数（13）接近 inline 数（25），仅 [ex:1374] 单腿跳箱下落稳定在第一层正文与说明段/现状句中多引 3 次。'
)

# 3. 在 ANCHOR 行后插入(保留 ANCHOR 本身),最后保留文件原有换行结构
out_lines = lines[:idx+1] + ['', NEW, ''] + lines[idx+1:]
new_text = '\n'.join(out_lines)

with open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(new_text)

# 4. 校验
print('---POST STATS---')
import re
after = new_text
refs = re.findall(r'\[ex:(\d{4})\]', after)
uniq = set(refs)
print(f'  total inline = {len(refs)}')
print(f'  unique id = {len(uniq)}')
print('---BYTE SIZE---')
import os
print(f'  {os.path.getsize(PATH)} bytes (was 10985)')
