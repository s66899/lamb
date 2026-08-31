# Round 98 ledger (companion to _append_todo_round98.py)

## Round 98 — commit f081edd — badminton-recovery/ch03-knee + ch04-ankle manifest 与 markdown 1:1 漂移修复（96/97 轮 ledger 候选 #3 兑现）

### 修复内容
1. **ch03-knee.md h2[2,3,4] 6 个 sub 标题在 manifest 端被省略前缀**
   - markdown: `### 2.1 第一层：普通人能看懂` 等 6 个完整双层结构副标题
   - manifest: `2.1 普通人能看懂` 等 6 个简写
   - 修复: 在 manifest 端补齐 `第一层：`/`第二层：` 前缀，与 markdown 严格 1:1

2. **ch04-ankle.md h2[0]「本章导言」phantom sub「损伤分级」移除**
   - markdown: `## 本章导言` block (L7-L22) 内无任何 `### 损伤分级` 标题
   - 原 manifest: 把「**损伤分级速查**」的加粗前缀误识别成 sub
   - 修复: 移除 phantom sub `"损伤分级"`，`subs: []` 与 markdown 一致

### 文件改动
- manifest.json: 6 sub prefix 增补 + 1 phantom sub 移除 = 净 7 处字面量改动；CRLF 14160→14155；size 436357→436301 (-56)
- manifest_data.js: 对称同上；CRLF 14835→14830；size 458311→458255 (-56)；LF-only=0
- 零 markdown 内容改动；零 ex-lib id 改动；零 JS/CSS/APP_VERSION 改动

### 校验通过
- json.tool / node --check OK
- badminton-recovery 8 章 h2/h3 与 markdown 0 diff（ch01/02/03/04/05/06/07/08 全 OK）
- ex-lib ledger: 合法 1336 / 唯一 140 / broken 0（不变）

### 下轮候选（重点）
1. **badminton ch12 markdown 与 manifest 严重漂移**（98 轮扫全仓时新发现）——  11 h2 vs 7 h2 计数差 + h2#2/h2#3 编号错位（"二·历史原版内容" 和 "二、羽毛球专项体能训练（ex-lib 动作版）" 共存）+ 后续 h2 全部下沉一位 + sub 5 vs 11 count 漂移。markdown 内自带"原版/新版并行保留"的设计意图，需要先 grep 一遍 markdown 与 manifest 的 h2/subs，对齐成一张 diff 表，再决定方向（动 md 还是动 mn）。
2. **yin-yang 5 章 manifest 与 markdown 漂移**（98 轮同次扫发现）—— ch08-palmistry（COUNT 6 vs 7）/ ch11-fingerprints（12 vs 6）/ ch12-bazi（12 vs 6）/ ch13-comprehensive-reading（12 vs 6）/ ch15-modern-applications（15 vs 7）。其中 ch08 主要是 h2 title drift（8.x 编号错位），其余 4 章是 manifest 后段截断（"全书结语/本章小结" 提前出现，遗漏中间 6+ 个 h2）。结构性问题，需要逐章审视。
3. (继承 96/97 轮) badminton ch13 markdown h2 编号撞号 + 跳号（DUPLICATE 十二 / 跳号 十五 / 回退 十三）。manifest 镜像同样错乱。
4. (继承 96/97 轮) psychology ch12 markdown 编号错位 + 空 `## ` 行。
5. (继承 97 轮) engineering-mechanics 其他章节（ch04/ch05/ch06/ch07/ch08）manifest h2s 与 markdown 1:1 校验 —— 97 轮专注 ch12 时未扫其他章节。
6. (继承 91/95 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短，可远期挑 1 章扩写。
7. (继承 91/95 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失，可远期补一份。
8. (继承 91/95 轮, 优先级低) `.gitattributes` 把 .json/.js 当 binary，可远期改成只屏蔽真正需要 lfs 的扩展名。

### 备注
- 本轮完成了 96/97 轮 ledger 候选 #3（badminton-recovery ch02~ch07 sweep）的大部分目标 —— ch02/05/06/07 已 OK，发现了 ch03/04 的实际漂移并修复。
- 与 86~97 轮同型：manifest 与 markdown 1:1 漂移修复，对称 2 manifest 文件，单 commit，可独立回滚。
- 98 轮发现的全仓 sweep 揭示了比预期更大的漂移面（badminton ch12 + yin-yang 5 章），需要后续多轮分批处理，**不能一锅端**（单 commit 改动面过大违反"小改动可回滚"原则）。
