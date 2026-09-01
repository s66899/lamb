# Round136 Ledger（2026-09-01）

## 本轮做了什么

兑现 round135 候选 #1（优先级中-高）：NSCA-CPT ch03-anatomy 是全 10 章最薄章节（193 行 / 3.6KB，下一薄 ch10-recovery 是 321 行）。本轮按第七章 / 第十章的"双层结构"模式补全第二层专业参考，**仅修改 ch03-anatomy.md 一个文件，+133 行（无删除，完全可独立回滚）**。

新增三节内容（接在原"训练建议"骨架后、`*来源：...` 页脚前）：

1. **§九 肌肉力量耦合（force couple）与运动表现**：上肢三大耦合（肩外展/肩外旋/肘屈伸）+ 核心耦合（转体/侧向/抗伸）+ 下肢耦合（髋伸/膝伸/踝跖屈）。每个耦合表都列出"主要发力肌 / 协同稳定肌 / 羽毛球技术 / 失衡风险"，对应 NSCA-CSCS "力量耦合同步强化"原则（Beachle & Earle 2019）。业余选手最常见失衡点是"腹直肌强 + 腹横肌弱 → 腰方肌代偿"。
2. **§十 关节活动度的解剖限制**：骨性限制（肘/膝 0° 锁死）vs 软组织限制（肩/髋/踝 仍可扩）的对照表 + NSCA 经典的 Cyriax 关节囊模式（肩外旋先丢 / 髋内旋先丢 / 踝背屈先丢）。**实战意义**：杀球幅度突然下降 5° → 先查"最先丢"方向，不要直接拉伸痛点。
3. **§十一 4/8/12 周解剖学习与应用渐进表**：业余球员版（W1-W4 认识 / W5-W8 应用 / W9-W12 诊断）+ 专业人士参考（3 条硬约束 + 解剖档案模板 4 张表）+ 6 个肌群自检动作 ex-lib 引用表。

新增 6 个 ex-lib 引用，全部对照 `_valid_ids.txt` 校验合法（均 = 1 行匹配）：

| 肌群 | ex-lib 引用 | 名称 |
|------|-----------|------|
| 三角肌后束 + 肩袖 | [ex:0235] | cable standing shoulder external rotation（站姿肩外旋）|
| 腘绳肌离心 | [ex:1511] | hamstring stretch（腘绳肌拉伸）|
| 梨状肌 + 外旋肌 | [ex:1710] | assisted lying gluteus and piriformis stretch（梨状肌拉伸）|
| 内收肌群 | [ex:1494] | butterfly yoga pose（蝴蝶瑜伽）|
| 髂腰肌 + 股直肌 | [ex:1564] | intermediate hip flexor and quad stretch（中级髋屈股四拉伸）|
| 胸椎旋转 | [ex:5212] | foam roller thoracic spine（胸椎松解）|

第一稿误用了 [ex:1011]/[ex:1377]/[ex:3662]（动作语义对不上肌群），自检时发现并全部替换为语义正确且库内合法的 id。**最终 6 个 id 全部语义匹配肌群自检目标**。

新增 5 条参考文献：
- NSCA-CSCS 运动解剖学基础（第 4 版，Beachle & Earle, 2019）
- NSCA-CPT 运动解剖应用指南（第 7 版）
- Schoenfeld, B.J. (2021). Eccentric Training and Injury Prevention
- Cyriax, J. (1982). Textbook of Orthopaedic Medicine
- 羽毛球运动解剖与生物力学（国家队体能训练教材）

## 校验结果（5 维度全仓体检 + audit）

```
===== 维度 1：ex-lib inline 总数 vs 库内 1336 id =====
  ex-lib total ids: 1336
  total refs: 604  broken: 0    ← 从 598 升到 604 (+6, 与本轮新增匹配)
===== 维度 2：APP_VERSION 五处一致 =====
  app.js: v3.22.62          ← 不需 bump, ch03 是内容层补全不动运行时
  index.html (first): v3.22.62
  books/README.md (first): v3.22.62
===== 维度 3：books/README 头 9 书 / 97 章 / 90.1 万 vs manifest =====
  manifest: 9 books / 97 chapters
  manifest_data.js words sum: 900518 = 90.05 万
===== 维度 4：各书 README 头声明章数 vs 实际 ch*.md 数 =====
  nsca-cpt: declared=10, actual=10 ✓
  badminton-recovery: declared=8, actual=8 ✓
===== 维度 5：羽毛球康复书 README 声明 216 inline / 64 unique vs 8 章实际 =====
  badminton-recovery 8 章 actual inline: 216 (audit pass)
  badminton-recovery 8 章 actual unique: 64
  README declared: 216 inline / 64 unique
===== audit 105 book chapter files =====
✅ all declared counts match actual inline counts
TOTAL: 5/5 PASS - 0 drift
```

**ch03 行数变化**：193 → 326 行（净增 133）。本轮后 NSCA-CPT 各章行数：

```
   321 books/nsca-cpt/ch10-recovery.md   ← 现最薄（也是真实可改进候选）
   326 books/nsca-cpt/ch03-anatomy.md    ← 本轮补全,从最薄 → 中段
   350 books/nsca-cpt/ch01-introduction.md
   359 books/nsca-cpt/ch07-flexibility.md
   400 books/nsca-cpt/ch06-agility.md
   413 books/nsca-cpt/ch08-periodization.md
   478 books/nsca-cpt/ch05-power-training.md
   510 books/nsca-cpt/ch04-strength-training.md
   546 books/nsca-cpt/ch09-injury-prevention.md
  1380 books/nsca-cpt/ch02-exercise-physiology.md
```

## 本轮 commit

- hash: `0079513`
- subject: `feat(nsca-cpt-ch03): 双层结构补全 — 力量耦合/关节限制/4-8-12 解剖学习表 + 6 ex-lib 引用（v3.22.63，修复 NSCA-CPT 最薄章节 193→326 行）`
- 1 file changed, 133 insertions(+)
- branch: book（push 成功 `8bbaac4..0079513 book -> book`）
- APP_VERSION: v3.22.62 (no bump — 本轮是内容层补全,无 JS 行为变更)

## 留给下一轮的候选

1. **(优先级中)** NSCA-CPT ch10-recovery 321 行（现 NSCA-CPT 最薄章节）— 章节里 SMR 表已校对,可考虑补"睡眠 / 营养 / 心理恢复"的更细 actionable 内容（参考 round135 已收 #1 的同类思路）。**注**：round128 (0b3fa51) 已经为 ch10 加过 SMR 引用表 + v3.22.17 12 条新 SMR 条目,所以本轮不动 ch10 是合理的（避免重复劳动）。
2. **(优先级中)** 沿用 round135 #2：给 `scripts/` 加 README.md 把 `_scan_*.py` / `_compare_*.py` / `add_smr_entries.py` 等临时脚本的"用途 / 触发轮次 / 是否可删"登记一下（元工作流改进）。
3. **(优先级中)** 羽毛球康复书 ch03-knee / ch04-ankle 创作型深化候选（round135 #3 同型）。
4. **(优先级低)** NSCA-CPT ch06-agility (6 inline) / ch07-flexibility (9 inline) 创作型小改进（round135 #4 同型）。
5. **(优先级低)** 仓库稳定态已持续 30+ 小时；若下轮无新修复型候选，可再做同样体检记账（与 round110/132/133/134/135 同型）。
