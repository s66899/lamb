# -*- coding: utf-8 -*-
import re

with open('D:/openclaw/workspace/worm-gear-lift-platform/books/finance/ch05-stock-valuation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all section number issues systematically

# First, fix the incomplete narrative trap section
old_trap = '### 5.6.6 侥幸叙事陷阱（Narrative Trap）\n\n投资者常常被一个\n□'
new_trap = '''### 5.6.6 侥幸叙事陷阱（Narrative Trap）

投资者常常被一个精彩的故事打动，而忽视数字。**"这家公司将成为下一个特斯拉"、"这个技术将颠覆整个行业"**——叙事（Narrative）本身不是问题，问题是当叙事取代了严谨的估值分析。

**典型表现：** 瑞幸咖啡2020年暴跌前，市场对其"数字化咖啡新零售"的叙事十分买账，P/S估值超过10x，尽管公司持续亏损。故事的吸引力掩盖了财务造假的风险。

**应对方法：**
- 区分"好故事"和"好投资"——好故事需要经得起数字的检验
- 用估值框架反向测试叙事：即使故事完全成真，当前价格是否合理？
- 始终问自己：如果这个故事不成立，亏损的上限是多少？

### 5.6.7 估值陷阱汇总清单

以下清单请在每次估值前逐一检查：

□'''

content = content.replace(old_trap, new_trap, 1)

# Fix EVA section numbering (currently 5.9.x due to over-renumbering, should be 5.5.x)
for wrong_num, correct_num in [('5.9.', '5.5.'), ('5.8.', '5.5.')]:
    # Only fix subsections under EVA section context
    pass  # We'll use a more targeted approach

# Let me just fix all wrong numbers via targeted replacements
# EVA section (currently under ## 5.5 but subsections got messed up)
fixes = {
    '### 5.9.1 EVA的基本概念': '### 5.5.1 EVA的基本概念',
    '### 5.9.2 EVA与市场增加值（MVA）的关系': '### 5.5.2 EVA与市场增加值（MVA）的关系',
    '### 5.9.3 EVA模型的估值公式': '### 5.5.3 EVA模型的估值公式',
    '### 5.9.4 EVA与DCF的比较': '### 5.5.4 EVA与DCF的比较',
    '### 5.9.5 EVA模型的实战应用': '### 5.5.5 EVA模型的实战应用',
    '### 5.6.6 EVA模型的局限': '### 5.5.6 EVA模型的局限',
}

for old_sub, new_sub in fixes.items():
    content = content.replace(old_sub, new_sub, 1)

# Fix valuation traps subsections (should be 5.6.x)
traps_fixes = {
    '### 5.9.1 锚定效应（Anchoring）': '### 5.6.1 锚定效应（Anchoring）',
    '### 5.9.2 生存偏差（Survivorship Bias）': '### 5.6.2 生存偏差（Survivorship Bias）',
    '### 5.9.3 确认偏差（Confirmation Bias）': '### 5.6.3 确认偏差（Confirmation Bias）',
    '### 5.9.4 过度外推（Over-extrapolation）': '### 5.6.4 过度外推（Over-extrapolation）',
    '### 5.9.5 伪精确（False Precision）': '### 5.6.5 伪精确（False Precision）',
}
for old_sub, new_sub in traps_fixes.items():
    if old_sub in content:
        content = content.replace(old_sub, new_sub, 1)

# Fix A股 section subsections (currently 5.9.x, should be 5.7.x)
agu_fixes = {
    '### 5.9.1 政策驱动与估值波动': '### 5.7.1 政策驱动与估值波动',
    '### 5.9.2 散户主导与情绪溢价': '### 5.7.2 散户主导与情绪溢价',
    '### 5.9.3 同股不同价：A/H股溢价': '### 5.7.3 同股不同价：A/H股溢价',
    '### 5.9.4 特殊股权结构的影响': '### 5.7.4 特殊股权结构的影响',
    '### 5.9.5 A股估值的"四大背离"现象': '### 5.7.5 A股估值的"四大背离"现象',
}
for old_sub, new_sub in agu_fixes.items():
    if old_sub in content:
        content = content.replace(old_sub, new_sub, 1)

# Fix case study subsections (currently 5.9.x, should be 5.8.x)
case_fixes = {
    '### 5.9.1 案例一：贵州茅台（600519.SH）——消费龙头估值分析': '### 5.8.1 案例一：贵州茅台（600519.SH）——消费龙头估值分析',
    '### 5.9.2 案例二：宁德时代（300750.SZ）——高成长公司估值': '### 5.8.2 案例二：宁德时代（300750.SZ）——高成长公司估值',
    '### 5.9.3 案例三：工商银行（601398.SH）——低估值价值陷阱': '### 5.8.3 案例三：工商银行（601398.SH）——低估值价值陷阱',
}
for old_sub, new_sub in case_fixes.items():
    if old_sub in content:
        content = content.replace(old_sub, new_sub, 1)

# Also fix 行动建议 subsections
action_fixes = {
    '### 5.6.7 估值框架构建原则': '### 5.9.1 估值框架构建原则',
    '### 5.6.8 不同投资者的估值策略建议': '### 5.9.2 不同投资者的估值策略建议',
    '### 5.6.9 实操清单：每次估值前问自己': '### 5.9.3 实操清单：每次估值前问自己',
    '### 5.6.10 最后的忠告': '### 5.9.4 最后的忠告',
}
for old_sub, new_sub in action_fixes.items():
    if old_sub in content:
        content = content.replace(old_sub, new_sub, 1)

# Verify by extracting all headers
with open('D:/openclaw/workspace/worm-gear-lift-platform/books/finance/ch05-stock-valuation.md', 'w', encoding='utf-8') as f:
    f.write(content)

cn = re.findall(r'[\u4e00-\u9fff]', content)
print(f'Chinese characters: {len(cn)}')
print(f'Total characters: {len(content)}')
