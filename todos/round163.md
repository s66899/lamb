# Round 163 — NSCA-CPT ch09 §4.2 高尔夫球肘 + ch04 / badminton ch12 农夫行走 ex-lib id 错位引用修复

**起点状态**：HEAD = `6cb6a53`（round162 记账），working tree 含未提交改动 `books/badminton-recovery/ch06-back.md`（dirty leftover from round162）与 `todos/round162.md`（未跟踪 ledger），branch `book`，APP_VERSION = v3.22.63（drift 0/0）。

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看 round157-162 主题（多为「版本号笔误」「互引表术语」「红旗升级」「§1.2 + 4 章 6 处版本号」等）→ `git status --short` 发现 working tree 含 ch06-back.md 修改（dirty leftover from round162）+ 未跟踪 `todos/round162.md` → 探测方向：

1. **v3.XX.YY 笔误复扫**：grep `v3\.22\.[0-9]+` 全部 ch*.md → 全部正本已对齐 v3.22.63，仅 NSCA-CPT ch10 §7 末段 blockquote 内 v3.22.72/74 作为历史叙事保留（已在该处 blockquote 显式声明为"非正式 changelog"）。零新笔误。
2. **ch06-back dirty leftover**：工作区 ch06-back.md L196 比 HEAD 多出 1 处冗余 `[ex:5207] upper back` 与 1 处冗余 `[ex:5208] latissimus` 在计数说明段（HEAD 46 → 实际 48 inline / 描述仍写"46 处 inline"已脱节）；同时清单段算术 `13+5+3+4=25` 自相矛盾（13+5+3+4=25 数字看似对，但分配项语义不可解 — "13 行表各 1 处" + "说明段 foam roller 邻近条目多次提及" + "历史勘误 1352 多次提及" + 第4项无意义）。**先把 working tree L196 还原到 HEAD 措辞**（清掉 round162 未完成的工作树残留），这样 ch06 仍 46 inline / 16 unique 与描述一致。
3. **ex-lib id drift 复跑**：`_audit_exlib_ledger.py` 全 106 章 pass，零 broken；项目 621 inline / 140 unique / 0 broken。
4. **跨书章节互引**：grep `ch0X §Y.Z` / `ch0X 第N节` 校验 recovery ch02/ch04/ch05/ch08 引用的 NSCA ch09 §X.Y + badminton ch12 9.X 全部命中真实存在的 H2 标题，零脱节。
5. **版本号 forward-ref 扫描**：grep `v3\.22\.[0-9]+` 在 ch10 §7 blockquote 找到 5 处 v3.22.72/74 引用 — 已在描述显式标记"非正式 changelog" + "本轮合并到本字段作为账本留痕"，不是 bug。
6. **🎯 真实新发现 #6：NSCA-CPT ch09 §4.2「高尔夫球肘（内上髁炎）」康复动作库 3 处 ex-lib id 与正文描述完全错位**：
   - "腕屈肌拉伸 + 离心训练（用 [ex:0054] barbell lunge 配套）" — `[ex:0054]` 库内真实条目 = `barbell lunge 杠铃弓步 | bp_zh=大腿 | mu_zh=quadriceps | tgt_zh=臀大肌`（**大腿训练**，不是腕屈肌）
   - "腕屈肌强化（[ex:0088] 坐姿杠铃提踵 配套变式）" — `[ex:0088]` 库内真实条目 = `坐姿杠铃提踵 | bp_zh=小腿 | tgt_zh=小腿`（**小腿训练**，不是腕屈肌）
   - "握力训练（保留 [ex:1421] dumbbell farmer's walk）" — `[ex:1421]` 库内真实条目 = `modified push up to lower arms | bp_zh=前臂 | mu_zh=肱三头肌 | tgt_zh=前臂`（**前臂 modified push-up**，不是农夫行走）
7. **🎯 真实新发现 #7：badminton ch12 L407 + nsca-cpt ch04 L267/L360 共 3 处"农夫行走"训练计划表行引用 `[ex:1421]`** — 同上 `[ex:1421]` 库内是前臂 modified push-up 而非农夫行走；真正农夫行走 id 是 `[ex:2133] farmers walk | bp_zh=大腿 | mu_zh=小腿 | tgt_zh=股四头肌`（quad grip endurance 主练，符合"农夫行走"功能）。
8. **ch02 §11.1 的 [ex:0994] 校验**：`band reverse wrist curl (前臂)` = **腕伸肌**离心训练，对应**网球肘（外上髁炎，腕伸肌起点微损伤）**——语义正确，**不在本轮修复范围**（与高尔夫球肘的腕屈肌康复互不冲突）。

### Bug 根因

**[ex:1421] / [ex:0054] / [ex:0088] 这三个 id 在多处被错误标注为 'dumbbell farmer's walk' / '腕屈肌拉伸 / 强化'**，与库内真实条目身体部位 / 动作名完全错位。读者点击这些 `[ex:NNNN]` 跳转时，会看到与正文描述毫不相关的演示视频（前臂 modified push-up / 大腿弓步 / 小腿提踵），严重误导康复动作库使用。属于内容质量而非 broken ref bug（ids 均库内合法，仅 id ↔ 正文描述失配）。

### 修复策略

最小可独立回滚替换，全部走真实动作库：

- **ch09 §4.2 高尔夫球肘康复动作库**：
  - "腕屈肌拉伸 + 离心训练" → `[ex:0721] side wrist pull stretch (前臂, mu=wrists, tgt=forearms)` — 真正的前臂静态拉伸
  - "腕屈肌强化" → `[ex:1016] band wrist curl (前臂, mu=肱二头肌, tgt=前臂)` — 真正的弹力带腕弯举（掌向上 = 腕屈肌发力）
  - "握力训练（农夫行走）" → `[ex:2133] farmers walk (大腿, mu=小腿, tgt=股四头肌)` — 真正的农夫行走
- **nsca-cpt ch04 L267 / L360**：农夫行走 2 处 `[ex:1421]` → `[ex:2133]`
- **badminton ch12 L407**：农夫行走 1 处 `[ex:1421]` → `[ex:2133]`

## 校验

- `node --check app.js` ✅（未触碰）
- `node --check manifest_data.js` ✅（未触碰）
- `python -m json.tool manifest.json` ✅（未触碰）
- `python -m json.tool books/exercises/ex-lib.json` ✅（未触碰）
- 全项目 inline 621 / unique 140 / broken 0（HEAD 同 — 因 1:1 替换净变化 = -1421 + 0721 + 0+0（1016/2133 HEAD 已存在）= 0）
- NSCA ch09 §4.2 局部：60 inline / 25 unique（HEAD 60 / 23 — 新增 0721 + 1016 + 2133 中 1016/2133 已在 ch09 其他节用过，只 0721 是 ch09 新 global unique；移除 1421 后净 +2 unique）
- NSCA ch04：79 inline / 39 unique（HEAD 同 — 1421 被替换为 2133 都已是全局 unique）
- Badminton ch12：62 inline / 41 unique（HEAD 同）
- ch06-back.md：仍 46 inline / 16 unique（HEAD 同 — 已还原 dirty leftover）
- `_audit_exlib_ledger.py` 报 `✅ all declared counts match actual inline counts`（106 章全过）
- 所有替换 id 均库内合法（0721 / 1016 / 2133 全部在 books/exercises/ex-lib.json 1336 个合法 id 列表内）
- APP_VERSION 不 bump（仅 4 处 4 位 id 文字替换 + 1 处 ch06-back dirty leftover 还原，未触及任何代码 / 样式 / 埋点）
- LF 行尾 ch09/ch04/ch12 dirty warning 仅提示下次 git 触碰会替换，未实际污染文件（HEAD 已存在同样 warning）

## push 状态

⚠️ **失败 ×1**：commit `bfb81b5` 已落本地 ahead 1，但 `git push origin book` 报 `curl 28 Failed to connect to github.com port 443 after 21058 ms: Could not connect to server`（与 round160/161/162 同症，间歇性网络不通）。待下轮自动 retry 或人工 `git push origin book` 触发 GH Pages 部署。

## 文件落点

- `books/nsca-cpt/ch09-injury-prevention.md` — §4.2 高尔夫球肘康复动作库 3 行 id 替换（+3 / -3）
- `books/nsca-cpt/ch04-strength-training.md` — 农夫行走 L267 + L360 两处 id 替换（+2 / -2）
- `books/badminton/ch12-physical-training.md` — 农夫行走 L407 一处 id 替换（+1 / -1）
- `books/badminton-recovery/ch06-back.md` — dirty leftover L196 还原到 HEAD 措辞（0 净变化，纯清理）

## 留给下一轮（候选队列）

按优先级排：

1. 🥇 **本轮继承**：仍有 `[ex:0054] barbell lunge` / `[ex:0088] 坐姿杠铃提踵` 在 ch09 / ch04 / ch12 / ch03 recovery 等多处按正确语义（"杠铃弓步" / "坐姿提踵"）引用 — **本轮未误触**，仅 §4.2 高尔夫球肘这一节内上下文明显为"腕屈肌"的 3 处误用被替换。下轮可扫是否有其他类似 id ↔ 正文描述失配但语义相对模糊的位置（如 [ex:0054] 在 ch03 §1.1 膝康复用作"半蹲前置动作"是否合适？需要详查上下文才能判断，不应批量替换）。
2. 🥈 **继承 round162 候选 #3（低优）**：NSCA-CPT ch10 §7 末段 580+ 字 4 次勘误 blockquote 整理为附录「v3.22 勘误史」独立 H2 — 历史叙事保留方案非 bug，仅为格式整理。
3. 🥉 **继承 round162 候选 #4**：`_session_todo.md` 78 轮双写 `_append_todo_round78.{py,md}` 在 HEAD 缺失。
4. **本轮新发现**：badminton ch12 §8.4 「本章 ex-lib 引用清单（按类别）」L1004 末段提到 "康复专项段 30 行内去重 24 个去重 / 30 项" — 数字声明可能需要与 ch12 实际 ex-lib 引用对齐复测（ch12 现在 62 inline / 41 unique 与该声明的"43 个去重 id"差 2，可能是 §8.4 描述与正文 inline 之间存在"按类别清单 vs 实际 inline 引用"两套口径，需进一步审）。

## round162 ledger 文件（todos/round162.md）

本轮发现 round162 实际已通过 commit `6cb6a53` 完成 ch02 §9 + ch05 §10 互引表桥接措辞修复，但 round162.md ledger 文件未跟踪进 git。**本轮与 round163 ledger 一并 commit 进 todos/ 目录**，确保历史完整。