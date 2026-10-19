# -*- coding: utf-8 -*-
with open('D:/openclaw/workspace/worm-gear-lift-platform/books/finance/ch05-stock-valuation.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the cut-off EVA section and renumber the old sections
old = '传统的会计利润混淆了两个截然不同的概念——\n\n### 5.5.1 锚定效应（Anchoring）'

new_content = (
    "传统的会计利润混淆了两个截然不同的概念——会计利润只扣除了债务资本成本（利息），完全没有考虑股权资本成本。"
    "从经济学角度看，股权资本不是免费的——股东投入资金同样要求回报。\n\n"
    "$$EVA = NOPAT - IC \\times WACC$$\n\n"
    "其中：\n"
    "- $NOPAT$ = 税后净营业利润 = EBIT × (1 - t)\n"
    "- $IC$ = 投入资本（Invested Capital）= 总资产 - 无息流动负债\n"
    "- $WACC$ = 加权平均资本成本\n\n"
    "EVA可以视为**经济利润（Economic Profit）**的一种度量。当EVA > 0时，公司不仅赚回了债务成本，还赚回了股东要求的回报——这才是真正的价值创造。\n\n"
    "### 5.5.2 EVA与市场增加值（MVA）的关系\n\n"
    "市场增加值（Market Value Added，MVA）是公司市场价值与投入资本的差额：\n\n"
    "$$MVA = \\text{公司市值} - IC$$\n\n"
    "MVA与EVA之间存在如下关系：**MVA等于未来所有EVA的现值之和**。\n\n"
    "$$MVA = \\sum_{t=1}^{\\infty} \\frac{EVA_t}{(1+WACC)^t}$$\n\n"
    "这意味着：市场溢价（即MVA）完全来源于市场对公司未来创造超额经济利润的预期。"
    "一家公司的市值超过其账面投入资本的幅度，取决于其持续创造EVA的能力。\n\n"
    "### 5.5.3 EVA模型的估值公式\n\n"
    "基于EVA的估值公式为：\n\n"
    "$$\\text{公司价值} = IC_0 + \\sum_{t=1}^{\\infty} \\frac{EVA_t}{(1+WACC)^t}$$\n\n"
    "这等价于DCF模型，但提供了一个不同的视角：**公司价值等于已投入资本（历史成本）加上未来超额收益的折现值。** 当预测期分为两阶段时：\n\n"
    "$$\\text{公司价值} = IC_0 + \\sum_{t=1}^{m} \\frac{EVA_t}{(1+WACC)^t} + \\frac{EVA_{m+1}/(WACC - g)}{(1+WACC)^m}$$\n\n"
    "### 5.5.4 EVA与DCF的比较\n\n"
    "| 维度 | DCF模型 | EVA模型 |\n"
    "|:----:|:------:|:-------:|\n"
    "| 价值来源 | FCFF折现 | 投入资本 + 超额收益折现 |\n"
    "| 直观性 | 直接给出价值数值 | 拆解为资本投入和超额收益两部分 |\n"
    "| 对ROE的呈现 | 隐含在FCFF增长中 | 显式表达：EVA = (ROIC - WACC) × IC |\n"
    "| 绩效评价 | 难以评价单期绩效 | EVA可直接作为绩效考核工具 |\n"
    "| 适用性 | 适用于所有企业 | 在ROIC与WACC差异显著时更有洞察力 |\n\n"
    "**关键公式的另一种表达：**\n\n"
    "$$EVA = (ROIC - WACC) \\times IC$$\n\n"
    "这种表达方式清晰地表明：价值创造的核心驱动因素有两个——投资资本回报率（ROIC）相对于资本成本的差距，以及投入资本的规模。\n\n"
    "### 5.5.5 EVA模型的实战应用\n\n"
    "以贵州茅台为例（2024年数据）：\n\n"
    "- IC（投入资本）= 净资产 + 有息负债 ≈ 2,200亿元（茅台几乎没有有息负债）\n"
    "- NOPAT ≈ 855 × (1 - 0.25) ≈ 641亿元\n"
    "- ROIC = 641 / 2,200 ≈ 29.1%\n"
    "- WACC ≈ 9.0%\n"
    "- EVA = (29.1% - 9.0%) × 2,200 = 442亿元\n\n"
    "茅台的EVA极高（每年创造442亿经济利润），这解释了其高MVA——市场愿意支付大幅超过账面资本的溢价来获取这份超额收益能力。\n\n"
    "**EVA对估值的启示：**\n"
    "- 高EVA/高ROIC企业具备护城河特征，应享有溢价\n"
    "- EVA长期由正转负是价值毁灭的核心信号\n"
    "- 并非所有成长都是好成长——若新投资ROIC < WACC，增长反而在毁灭价值\n\n"
    "### 5.5.6 EVA模型的局限\n\n"
    "1. **会计调整的复杂性：** 标准的EVA计算需要对会计报表进行大量调整（约160多项潜在调整），实际操作中通常仅调整关键项目（研发费用资本化、重组费用、商誉摊销等）。\n"
    "2. **历史成本偏差：** IC基于账面价值，对于无形资产密集的企业（如品牌、专利），IC可能严重低估实际投入。\n"
    "3. **短期行为风险：** 若将EVA作为考核工具，管理层可能削减对未来增长必要的投资（如研发、营销）以美化短期EVA。\n\n"
    "---\n\n"
    "## 5.6 估值中的常见陷阱"
)

content = content.replace(old, new_content, 1)

# Renumber the old subsections
renumbering = [
    ('### 5.5.1 ', '### 5.6.1 '),
    ('### 5.5.2 ', '### 5.6.2 '),
    ('### 5.5.3 ', '### 5.6.3 '),
    ('### 5.5.4 ', '### 5.6.4 '),
    ('### 5.5.5 ', '### 5.6.5 '),
    ('### 5.5.6 ', '### 5.6.6 '),
]
for old_sub, new_sub in renumbering:
    content = content.replace(old_sub, new_sub)

# Also renumber A股 market section and beyond
content = content.replace('## 5.6 中国A股市场的估值特点', '## 5.7 中国A股市场的估值特点')
content = content.replace('## 5.7 实战案例分析', '## 5.8 实战案例分析')
content = content.replace('## 5.8 🐏的行动建议', '## 5.9 🐏的行动建议')

# A股 section subsections
for old_num, new_num in [('5.6.', '5.7.'), ('5.7.', '5.8.'), ('5.8.', '5.9.')]:
    content = content.replace(f'### {old_num}1 ', f'### {new_num}1 ')
    content = content.replace(f'### {old_num}2 ', f'### {new_num}2 ')
    content = content.replace(f'### {old_num}3 ', f'### {new_num}3 ')
    content = content.replace(f'### {old_num}4 ', f'### {new_num}4 ')
    content = content.replace(f'### {old_num}5 ', f'### {new_num}5 ')

with open('D:/openclaw/workspace/worm-gear-lift-platform/books/finance/ch05-stock-valuation.md', 'w', encoding='utf-8') as f:
    f.write(content)

# Count characters again
import re
cn = re.findall(r'[\u4e00-\u9fff]', content)
print(f'Chinese characters: {len(cn)}')
print(f'Total characters: {len(content)}')
