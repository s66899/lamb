# Round 165 — ch07 §杀球落地缓冲训练 单/双脚落地+每次/每周次数措辞对齐

**起点状态**：HEAD = `f2ddc05`（round164 记账），branch `book`，APP_VERSION = v3.22.63（drift 0/0），working tree 干净。round164 push 失败 4 次的积压 `4692da6` + `f2ddc05` 在本轮初自动 retry push 成功（`f2ddc05..` 推到远端）；本轮新 commit `6e6a94f` push 一次到位（`f2ddc05..6e6a94f  book -> book`）。

## 本轮做了什么

按指令跑真实状态扫描 → `git log --oneline -10` 看 round157-164 主题（多为「版本号笔误」「互引表术语」「红旗升级」「农夫行走 id 错位」「7 章 H1 与 manifest 对齐」等）→ `git status --short` 显示 working tree 干净 → 探测方向：

1. **v3.XX.YY forward-ref 复扫**：grep `v3\.22\.[0-9]+` 全部 ch*.md → 0 笔误。
3. **ex-lib broken 复跑**：全项目 `[ex:NNNN]` 621 处扫表 vs 库内 1336 合法 id → **0 broken**；ch07 51 处 inline / 14 unique id / 0 broken。
4. **json/node 校验**：`python -m json.tool manifest.json` ✅；`node --check _update_manifest.js` ✅；`python -m json.tool books/exercises/ex-lib.json` ✅。
5. **🎯 真实新发现：ch07 §杀球落地缓冲训练 节内部 3 处真实数字打架**：
   - 第 1 项「30cm 跳箱落地 ... **单脚落地**」 vs 进阶表「第 1-4 周：**双脚**落地 50 次」直接矛盾（同一节内）
   - 第 4 项「每周 3 次，**每次 50 次**落地」 vs 进阶表「第 1-4 周：双脚落地 **50 次**」单位歧义（次/周 vs 次/次）
   - 进阶表三行仅「X 次/脚」，未与「每周 3 次」频次对齐——读者无法判断「次」是「每次训练」还是「每周合计」

### 修复策略

最小可独立回滚替换：**只动 §杀球落地缓冲训练 节 5 行**（1 + 4 + 进阶表头 + 进阶三行），保留所有正文、所有 ex-lib 引用、所有 H1/H2、所有时间线（4 / 8 / 12 周）、所有 NSCA-CPT 互引表。**单文件 1 节 6 处 +6/-6 净变化**。

### 改动对照

| 位置 | 旧 | 新 |
|------|----|----|
| 第 1 项 | 从 30cm 高跳箱跳下，**单脚落地**，主动屈膝屈踝缓冲 | 从 30cm 高跳箱跳下，**双脚落地起步、逐步过渡到单脚**（详见下方「进阶」时间表），主动屈膝屈踝缓冲 |
| 第 4 项 | **每周 3 次**，每次 50 次落地 | **频次：每周 3 次**；每次次数与单/双脚安排见下方「进阶」时间表 |
| 进阶表头 | **进阶**： | **进阶**（每周 3 次，落地次数指每次训练）： |
| 进阶 W1-4 | 双脚落地 50 次 | 双脚落地 **50 次/次** |
| 进阶 W5-8 | 单脚落地 25 次/脚 | 单脚落地 **25 次/脚·次** |
| 进阶 W9-12 | 单脚落地 50 次/脚 + 加入方向变化 | 单脚落地 **50 次/脚·次** + 加入方向变化 |

## 校验

- `node --check _update_manifest.js` ✅（未触碰）
- `python -m json.tool manifest.json` ✅（未触碰）
- `python -m json.tool books/exercises/ex-lib.json` ✅（未触碰）
- ch07 ex-lib 引用：inline 51 / unique 14 / broken 0（不变）
- 全项目 inline 621 / unique 140 / broken 0（不变）
- 3 处数字打架全部消除（节内 vs 进阶表频次/单双脚语义全部对齐）
- APP_VERSION 不 bump（仅 1 章 1 节 5 行文字细节对齐）

## push 状态

✅ **成功**：本轮新 commit `6e6a94f` 一次 push 成功（`f2ddc05..6e6a94f  book -> book`），与前几轮 push 失败的间歇网络问题本轮未再现。

## 文件落点

- `books/badminton-recovery/ch07-achilles.md` — §杀球落地缓冲训练 节 5 行替换（+6/-6）

## 留给下一轮（候选队列）

按优先级排：

1. 🥇 **本轮遗留 #1**：ch07 章末「## 本章 ex-lib 引用清单」段 inline 计数声明「本章共引用 **51 处** ex-lib inline 引用（折合 **14 个 unique id** ... ）」与节内实际 inline 51/unique 14 一致 ✅；但**「分布（按段计）」细分项中「红旗信号段 1 处」**需复扫确认——ch07 红旗信号段没有 `[ex:XXXX]` 引用（实际位于 §杀球落地缓冲训练 内「[ex:1374]」提了一次），需校对声明细分计数。这是声明文字 vs 实际分布的内部对齐问题。
2. 🥈 **本轮遗留 #2**：round164 候选 #3「badminton ch12 §8.4 L1004 末段 描述'43 个去重 id'与 ch12 实际 41 unique 差 2」— 需查 §8.4「按类别清单」与正文 inline 是否两套口径，若失准则补 ledger 块修正。
3. 🥉 **本轮新发现**：badminton-recovery ch04-ankle.md（2499 字）虽然结构清晰，但「第二层：专业人士参考」节只有 6 个 H3 子节，与 ch03-knee.md（2732 字）7 个 H3、ch05-elbow.md（2651 字）11 个 H3、ch07-achilles.md（2897 字）5 个 H3 比，**H3 子节数偏少**；可考虑补「踝关节扭伤流行病学数据」或「Ottawa Rules 应用限制详解」作为子节深化。但这是内容扩写型工作，不属于「修复 bug/质量问题」，下轮不动。
4. **本轮新发现 #2**：ch06-back.md「## 4 周时间线（轻症 / 肌肉劳损）」直接进入 H2，没有 H3「第一层：普通人能看懂」「第二层：专业人士参考」双层结构子节——ch03/ch05/ch07 都有双层结构，**ch06 缺双层结构**。但改动会引入大结构变更（违反「不引入大架构变更」原则），建议留作 v4.0 全书统一升级。
5. **本轮新发现 #3**：competition/nutrition/yin-yang 三本旧式格式书仍全 6/7/15 章无 nav link、无 double-layer 结构。round164 已记，下轮不动。

## 备注

- LF 行尾 dirty warning 仍存（HEAD 同），不属于本轮修复范围
- `_session_todo.md` 78 轮双写遗留仍未修复（低优）
- 全项目 9 本书 97 章 manifest-H1 drift = 0（保持，round164 已对齐）
- ch07 是 ch01-ch08 里字数排第 2 的厚章节（2897 字），仅 ch01（2891）/ ch07（2897）相当；本轮修复属于薄章节之外的厚章节细节对齐——目标是「让节内数字打架归零」，不增字