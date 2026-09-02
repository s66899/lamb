# Round 164 — 7 章 H1 与 manifest 标题对齐（兑现 v3.22.52 升级承诺）

**起点状态**：HEAD = `f8bd08b`（round163 记账），branch `book`，APP_VERSION = v3.22.63（drift 0/0）。前轮 push 落后 3 commit 已在本轮初 retry push 成功（`084c68d..f8bd08b  book -> book`）；本轮新 commit `4692da6` push 失败 4 次（curl 28 Failed to connect to github.com port 443 after 21s × 4），与 round160/161/162/163 间歇性网络不通同症，待下轮 retry。

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看 round157-163 主题（多为「版本号笔误」「互引表术语」「红旗升级」「农夫行走 id 错位」等）→ `git status --short` 显示 working tree 干净 → 探测方向：

1. **v3.XX.YY forward-ref 复扫**：grep `v3\.22\.[0-9]+` 全部 ch*.md → 仅 NSCA-CPT ch10 §7 末段 blockquote 内 v3.22.72/74 引用 5 处（已在该处 blockquote 显式声明为"非正式 changelog 合并留痕"），非 bug。
2. **ex-lib broken 复跑**：全项目 `[ex:NNNN]` 扫表 vs 库内 1336 合法 id → 0 broken；`_audit_exlib_ledger.py` 全 106 章 pass，零 drift。
3. **json/node 校验**：`python -m json.tool manifest.json` ✅；`node --check app.js` ✅。
4. **跨书章节互引**：grep `ch0X §Y.Z` / `ch0X 第N节` 全部命中真实存在的 H2 标题，零脱节。
5. **🎯 真实新发现：7 章 H1 与 manifest 标题脱节**：
   - v3.22.52（commit `084c68d`）把 6 章 chapter 副标题统一为 `Competition Psychology · 基础/专业级` / `Axial Loading · 入门/理论推导` / `Dynamics · 入门/专题` / `Memory · 教材版` 风格但**只动了 manifest.json**，未同步各章 H1。用户从 TOC 进入章节时看到「阅读器头部（来自 manifest）」与「文章内 H1（来自 .md H1）」两个不同标题，造成视觉重复 + 一致性失信。
   - drift 扫描脚本：遍历 manifest 97 章，每章提取 H1 + 与 manifest title 对比，定位 7 处脱节。

### 7 处 H1 脱节清单（manifest 标题 vs H1）

| 文件 | manifest title | H1 (脱节旧版) | H1 (新对齐) |
|------|---------------|---------------|-------------|
| `books/badminton/ch09-competition-psychology.md` | `Competition Psychology · 基础` | `比赛心理——如何在关键时刻保持最佳状态` | `第九章 Competition Psychology · 基础` |
| `books/badminton/ch10-competition-psychology.md` | `Competition Psychology · 专业级` | `比赛心理——专业级心理调控与竞技状态管理` | `第十章 Competition Psychology · 专业级` |
| `books/engineering-mechanics/ch02-axial-loading.md` | `Axial Loading · 入门` | `轴向拉伸与压缩——最简单的受力形式，最重要的分析起点` | `第二章 Axial Loading · 入门` |
| `books/engineering-mechanics/ch02-axial-loading-deep-dive.md` | `Axial Loading · 理论推导` | `配套：轴向拉伸与压缩（深度版）` | `第二章配套 Axial Loading · 理论推导` |
| `books/engineering-mechanics/ch09-dynamics.md` | `Dynamics · 入门` | `动力学——从运动到力，从力到运动` | `第九章 Dynamics · 入门` |
| `books/engineering-mechanics/ch10-dynamics.md` | `Dynamics · 专题` | `动力学基础——力与运动的关系` | `第十章 Dynamics · 专题` |
| `books/psychology/ch02-memory-textbook.md` | `Memory · 教材版` | `配套：记忆（教材版）` | `第二章配套 Memory · 教材版` |

### 修复策略

最小可独立回滚替换：**只动 H1 一行**，保留所有正文（含「你可能觉得...」「配套版说明」「主章 → 深度版引导」等所有解释文案），不动 H2+ 子段结构，不动 ex-lib id，不动 commit message 提到的所有「承诺」。7 个文件 × 1 行 = 7 处 +7/-7 行净变化。

**保留 `第二章配套` / `第二章` / `第九章` / `第十章` 等「章次标记」**：manifest 标题不含章次（H1 原文也用冒号），但 manifest 章节排序已隐含章次；保留 H1 章次 + manifest 副标题的组合形式，避免章次信息在文章首行丢失（用户在下载 .md 离线阅读时仍能看到「第 X 章」章次）。

## 校验

- `node --check app.js` ✅（未触碰）
- `python -m json.tool manifest.json` ✅（未触碰）
- `python _audit_exlib_ledger.py` 报 `✅ all declared counts match actual inline counts`（106 章全过）
- 7 章 H1 与 manifest title 重新扫描：drift = 0
- 全项目 inline 621 / unique 140 / broken 0（不变，仅 H1 文字替换）
- APP_VERSION 不 bump（仅 7 处 H1 标题文字，不触及任何代码 / 样式 / 埋点）
- LF 行尾 ch12 dirty warning：仅提示下次 git 触碰会替换，未实际污染（HEAD 已有同样 warning）

## push 状态

⚠️ **失败 ×4**：commit `4692da6` 已落本地 ahead 1，但 `git push origin book` ×4 报 `curl 28 Failed to connect to github.com port 443 after 21058~21130 ms`（与 round160/161/162/163 同症，间歇性网络不通）。前轮 push 成功（round162-163 已 push 上去），本轮新增 commit 等下轮自动 retry 或人工 `git push origin book` 触发 GH Pages 部署。

## 文件落点

- `books/badminton/ch09-competition-psychology.md` — H1 替换（+1/-1）
- `books/badminton/ch10-competition-psychology.md` — H1 替换（+1/-1）
- `books/engineering-mechanics/ch02-axial-loading.md` — H1 替换（+1/-1）
- `books/engineering-mechanics/ch02-axial-loading-deep-dive.md` — H1 替换（+1/-1）
- `books/engineering-mechanics/ch09-dynamics.md` — H1 替换（+1/-1）
- `books/engineering-mechanics/ch10-dynamics.md` — H1 替换（+1/-1）
- `books/psychology/ch02-memory-textbook.md` — H1 替换（+1/-1）

合计 7 文件 / +7 / -7 行 / 0 字节真实内容变化（H1 缩短 + 重新加入「章次 + 副标题」结构后实际略减字节）。

## 留给下一轮（候选队列）

按优先级排：

1. 🥇 **本轮 push 待 retry**：本轮新 commit `4692da6` push 失败 4 次（curl 28 间歇性网络），下轮首件事 retry `git push origin book`。
2. 🥈 **本轮继承 #1（高优）**：round163 留下「ch03 / ch04 / ch09 / ch12 仍有 [ex:0054] barbell lunge / [ex:0088] 坐姿杠铃提踵 等在某些位置可能语义欠贴」— 需详查上下文才能判断，**不应批量替换**。下轮可重点扫 [ex:0054] / [ex:0088] / [ex:1421]（已被部分替换）/ [ex:2133]（农夫行走替代品）在全项目的引用是否语义对齐。
3. 🥉 **本轮继承 #2（中优）**：round163 候选 #4「badminton ch12 §8.4 L1004 末段 描述'43 个去重 id'与 ch12 实际 41 unique 差 2」— 需查 §8.4「按类别清单」与正文 inline 是否两套口径，若失准则补 ledger 块修正。
4. **本轮新发现 #1**：competitor book ch01-ch06 6 章（比赛策略模块）仍全部使用旧式「# 第X章：xxx」格式无 nav link、无 double-layer 结构，与本书「双层结构」承诺不一致。但该书 6 章全部使用统一旧格式，**改 1 章会破一致性，全部改是大改动**（违反"不做与现有功能重复的大改动"原则）。建议留作全 v4.0 改版时统一升级，下轮不动。
5. **本轮新发现 #2**：nutrition 7 章（营养模块）同样使用旧式格式无 nav link、无 double-layer 结构。同上，与本书双层结构承诺不一致；同样建议留作全 v4.0 改版。
6. **本轮新发现 #3**：yin-yang 15 章（阴阳模块）同样使用旧式格式。同上。

## 备注

- 7 章 H1 改完后，全项目 9 本书 97 章 manifest-H1 drift = 0（除旧式 6/7/15 本书按整本书格式统一保留外，rename 风格的 7 章已 100% 对齐）
- LF 行尾 dirty warning 仍存（HEAD 同），不属于本轮修复范围
- `_session_todo.md` 78 轮双写遗留仍未修复（round162 候选 #3 低优）