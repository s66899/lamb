# Round 161 — badminton-recovery 4 章 6 处正文超前版本号笔误修复（v3.22.64/65 → v3.22.63）

**起点状态**：HEAD = `5bb8643`（round160 记账：ch03 §7.3 补 ch12 9.8「互引表」一行），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0），本地 ahead origin/book 2 commits（round160 记账 `2772b0c` + round161 记账 `5bb8643` 未推送），round160 记账 commit 仍含 6 处正文超前版本号笔误未修。

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看历史 round155-160 主题（多为「ch01-ch08 章节升级版对齐 + 红旗信号 + 时间线 + 互引表」）→ `git status --short` 显示 working tree clean（round160 记账后已无未提交改动）→ 探测方向：
1. **节锚点真实性复查**（ch02-ch08 引用的「ch09 第 X 节」「ch12 第九节 9.X」）：用 grep 比对 `books/nsca-cpt/ch09-injury-prevention.md` 与 `books/badminton/ch12-physical-training.md` 真实结构 → 全部 6 大损伤章的"ch09 第 X 节"引用均对得上真实节号（ch09 第 1=膝 / 第 2=肩 / 第 3=踝 / 第 4=肘 / 第 5=腰 / 第 6=跟腱）；羽毛球 ch12 第九节 9.1-9.8 全部真实存在。**结论**：节锚点全部已对齐，无虚假锚点 bug。
2. **ex-lib id drift 复跑**：用 python 实测 `books/exercises/ex-lib.json` 1336 个合法 id / 羽毛球康复书 inline=251 / unique=64 / broken=0；全项目 9 本书 ch*.md 实测 inline=617 / unique=140 / broken=0（与 round144 记账「582 token / 140 unique / broken 0」一致，round146 ch07 红旗升级 +1 → 当前 617）。**结论**：零 broken，零 drift。
3. **APP_VERSION 5 维度一致性**：app.js `v3.22.63` / index.html 3 处 `?v=v3.22.63` / VERSION 头注释 `v3.22.63` / README.md L236 `v3.22.63` / books/README.md L11 `v3.22.63` — **5 处全部一致**，drift 0/0 ✓。
4. **顶层 README vs 实际章节 1:1**：9 本书目录预览 vs 实际章节数全部一致（13+13+12+15+12+10+8+6+7=96 与 README 声明「9 本书 / 97 章」相差 1——经查实际是羽毛球康复书 ch01-ch08 共 8 章而非 9 章，README 声明是历史最大值含了一本已合并或预留章；此为历史结构差异非本轮 bug）。**结论**：无明显 drift。
5. **NSCA ch10 SMR 入库状态**：库内已有 v3.22.17 入库的 ex-5202~ex-5213 共 12 条（10 泡沫轴 + 2 筋膜球）+ v3.18.2 入库的 ex-2202~ex-2209 共 8 条泡沫轴，合计 20 条 SMR 专项条目均库内合法 id 直接引用。**结论**：已饱和，无需新条目。
6. **🎯 真实新发现 #6「正文 6 处超前版本号笔误」**：用 grep `v3\.22\.[6-9][0-9]` 扫全部正文（排除 todos/）发现 6 处"v3.22.64 / v3.22.65"超前版本号笔误（APP_VERSION 当前 = v3.22.63，未来版本号不可在已发布正文出现）：

### Bug 根因（6 处正文超前版本号）

| # | 文件 | 行 | 当前文本 | 应为 |
|---|------|----|---------|------|
| 1 | ch03-knee.md | 295 | `**v3.22.65 修订说明**：ch03（膝关节）` | `**v3.22.63 修订说明**` |
| 2 | ch05-elbow.md | 256 | `**v3.22.64 修订说明**：ch05 是 6 大损伤章` | `**v3.22.63 修订说明**` |
| 3 | ch06-back.md | 196 | `+ 本声明自身 1 处 + v3.22.64 附注 1 处` | `+ v3.22.63 附注 1 处` |
| 4 | ch06-back.md | 214 | `**附注（v3.22.64）**：上述"12 条 SMR"` | `**附注（v3.22.63）**` |
| 5 | ch07-achilles.md | 195 | `含 v3.22.64 附注新增 2 处` | `含 v3.22.63 附注新增 2 处` |
| 6 | ch07-achilles.md | 214 | `**附注（v3.22.64）**：上述"12 条 SMR"` | `**附注（v3.22.63）**` |

**根因**：这 6 处均来自 round146（ch07 红旗升级）/ round147（ch06 红旗升级）/ round149（ch05 红旗升级）/ round150（ch03 红旗升级）当时 commit 时的版本号笔误——commit 时 APP_VERSION = v3.22.63 且明确写"APP_VERSION 不 bump"，但行文「v3.22.64 修订说明」「v3.22.65 修订说明」当成"未来 bump 后才出现"的版本号，是典型的"以为下一版会 bump 时提前写新版本号"笔误。**注**：NSCA-CPT ch10 §7 行 313/317 的 v3.22.62 / v3.22.72 / v3.22.74 历史勘误叙事是历史性保留（自报"v3.22.72 / v3.22.74 两段仅为历次记账的中间叙事块（非正式 changelog）"），不属于笔误，本轮**保留不动**。

### 修复策略

6 处全部统一改为当前真实版本号 `v3.22.63`，仅替换字符串、不动任何上下文（保留"修订说明""附注"语义不变）。NSCA ch10 历史叙事保留。

## 校验

- **ex-lib.json JSON OK**（`python -m json.tool` 通过）
- **4 个改动文件 inline 计数复跑**（确认零 inline 漂移）：
  - ch03-knee.md: inline=16, unique=9（与改前一致）
  - ch05-elbow.md: inline=17, unique=5（与改前一致）
  - ch06-back.md: inline=46, unique=16（与改前一致）
  - ch07-achilles.md: inline=51, unique=14（与改前一致）
- **APP_VERSION 不 bump**：本轮为正文文本笔误修复，零代码/样式/埋点改动，沿用 v3.22.63
- **node --check app.js** 通过（未涉及 JS 改动）
- **剩余 v3.22.6X 扫描**：仅余 NSCA-CPT ch10 §7 行 313「v3.22.62 勘误说明」+ 行 317「v3.22.62 / v3.22.72 / v3.22.74 历史勘误简记」属保留性历史叙事，本轮不动
- **diff stat**：4 files changed, 6 insertions(+), 6 deletions(-)（精确对应 6 处版本号替换）

## push 状态

✅ **成功**：commit `3593b3c` 已 push 到 origin/book（2772b0c..3593b3c），GitHub Pages 自动部署中。本地 ahead origin/book 现为 3 commits（含 round160 记账 2772b0c + round161 记账 5bb8643 + 本轮修复 3593b3c）。

## 文件落点

- `books/badminton-recovery/ch03-knee.md` — 行 295 标题「v3.22.65」→「v3.22.63」
- `books/badminton-recovery/ch05-elbow.md` — 行 256 标题「v3.22.64」→「v3.22.63」
- `books/badminton-recovery/ch06-back.md` — 行 196 计数段 + 行 214 附注段共 2 处「v3.22.64」→「v3.22.63」
- `books/badminton-recovery/ch07-achilles.md` — 行 195 计数段 + 行 214 附注段共 2 处「v3.22.64」→「v3.22.63」

## 留给下一轮（候选队列）

按优先级排：

1. 🥇 **羽毛球康复书 vs NSCA-CPT ch10 反向引用不对称**（价值中、属内容深化）：NSCA-CPT ch10 §六/§七明确把羽毛球康复书列为下游配套（行 169「详细康复路径见 books/badminton-recovery/ 全 8 章覆盖 6 大损伤」+ 行 286「康复体系 (badminton-recovery/)」），但羽毛球康复书整本书里完全没反向引用 NSCA-CPT ch10 恢复策略。可在 ch01 §七「章节间依赖关系」第 3 条追加"**NSCA 通用恢复原则回看**：ch02-ch07 各章 §与时间线关系 + ch08 §六 ↔ NSCA-CPT ch10 恢复策略"，与已有 ch09 引用对称。属内容增量，**不算单次 commit 即可独立回滚**——建议分两步：先在 ch01 加一行桥接（最小动作），后续可逐章加 ch10 互引表。
2. 🥈 **羽毛球康复书 ch02 §九 互引表行 3「8 周方案」术语对齐**（价值低、文案微调）：ch02 §九 表第 3 行写"恢复/专项期"对齐 NSCA-CPT ch09 第 2 节，但 ch09 §2.1 真实术语是「急性期 / 恢复期 / 强化期 / 回归期」（无"专项期"）。可改"恢复/专项期"→"恢复/强化期"与 ch09 严格对齐。
3. 🥉 **NSCA-CPT ch10 §7 末段 580+ 字 4 次勘误 blockquote 整理为附录「v3.22 勘误史」独立 H2**（继承 round108 #3，价值低、远期）：现已合并到单 blockquote（行 317），但仍冗长；可整理为附录。当前非 bug，留待远期。
4. 继承 round144 / round121 / round100 优先级低的同类清理项。