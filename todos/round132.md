## 第 132 轮（无 fix commit — 纯记账）— 全仓 5 维度巡检：audit 0 drift / manifest 0 unregistered / README 元数据 0 drift / APP_VERSION v3.22.62 一致 / ex-lib id 全部合法

**本轮做了什么**：

承接 round131 候选 #1（"扫描所有 `books/*/README.md` 是否存在与实际不一致的元数字漂移"）。
本轮做了一次比 round131 更宽的"5 维度整仓巡检"，扫描所有维度后**未发现真实 bug 可修**——
仓库处于稳定态（类似 round110 c2f5fd5 的"扫描结果显示无真实 bug 可修"情况）。

### 巡检维度与结果

**维度 1：105 章 declared vs actual inline 引用 audit**
- 工具：根目录 `_audit_exlib_ledger.py`（round127 起 last-wins 算法，blockquote 段排除，
  历史快照被自动 last-wins 选取为权威）
- 跑一遍输出：
  ```
  # audit 105 book chapter files
  ✅ all declared counts match actual inline counts
  ```
- 即 **0 章 declared ≠ actual**（包括 last-wins 多轮 ledger 块如 NSCA-CPT ch10 的
  v3.22.74 「59 处 inline / 25 unique」自动 last-wins 正确）。

**维度 2：manifest_data.js registered vs actual 文件**
- 整仓 9 本书 97 章：registered 97 / actual 97 / unregistered 0 / ghost 0
- manifest_data.js 是 GitHub Pages 实际加载的数据源，所有 chapter `file` 字段都
  对应真实存在的 `books/<id>/<file>.md`，无"声明了但文件不在"也无"文件存在但未注册"

**维度 3：books/README 总览元数据 vs manifest 实际**
- books/README L11 声明：**「9 本书 / 97 章 / 90.1 万字」**
  - manifest.json chapterCount 累加 = **97** ✓
  - manifest_data.js 各章 `words` 累加 = **900518** 字 = **90.05 万**（一位小数四舍五入 90.1）✓
  - 9 本书表 14.2 / 15.8 / 20.5 / 16.9 / 14.4 / 5.0 / 2.2 / 0.5 / 0.6 与 manifest_data.js
    对应书 `totalWords` 累加 142409/157741/205037/168950/143788/49801/21701/5295/5796
    折算 14.24/15.77/20.5/16.89/14.38/4.98/2.17/0.53/0.58 一位小数全部 ≤ 0.04 万 drift，
    属四舍五入正常范围，无实质 drift
- 其他 6 本书 README（badminton / engineering-mechanics / finance / psychology /
  competition / nutrition）均无章数 / 字数声明性数字（仅 badminton-recovery +
  nsca-cpt 有总章数字段，已对齐）→ round131 候选 #1 经实测是个**非问题**

**维度 4：APP_VERSION 5 埋点一致性**
- app.js `const APP_VERSION = 'v3.22.62';` ✓
- manifest_data.js 与 manifest.json 不存 APP_VERSION 字段（数据源不含）
- 根 README.md L231 头部声明「当前版本：**v3.22.62**（2026-08-31）」✓
- books/README.md L11 引用 `manifest.json v3.22.62` ✓
- index.html 三处 `?v=`（沿用 round78 4 埋点同步惯例）✓（未变更）

**维度 5：ex-lib id 合法性**
- 整仓 `[ex:NNNN]` 引用全部落在 `books/exercises/ex-lib.json` 1336 条合法 id 范围内
- 羽毛球康复书 8 章 64 个唯一 id / 216 处 inline（实际 grep 数）：
    - ch02 32/7 + ch03 16/9 + ch04 23/13 + ch05 17/5 + ch06 45/16 +
      ch07 48/14 + ch08 35/16 + ch01 0 = 216/64 ✓
  - 与 round131 修复后的 `books/badminton-recovery/README.md` L65 meta 块完全对齐
- NSCA-CPT ch10-recovery §七 blockquote 块历史快照（v3.22.72 63 → v3.22.74 59）
  last-wins 自动选 59，与实际 body 59 / unique 25 完全一致

### 巡检工具

新写两个临时回归脚本（一次性、按 .gitignore 规则 `_scan_*.py` / `_compare_*.py`
通配约定保留在工作区不 commit，与 round110 「21 个 roundXXX 临时脚本通配忽略」
同型；本轮未触碰业务代码不需 fix 配套）：
- `scripts/_scan_readme_drift.py` — 扫 8 本书 README 中"X 章 / X 万字"声明 vs
  实际章文件数 / manifest_data.js 累加字数（结果：仅 nsca-cpt + badminton-recovery
  有声明且都对，其他 6 本 README 无声明无 drift）
- `scripts/_compare_readme_vs_manifest.py` — 对照 books/README 表 9 行声明字数
  vs manifest_data.js 权威字数，结果：各分册 ≤0.04 万 drift（属四舍五入正常），
  头部「90.1 万字」与 900518 字一位小数 round 完全一致

### 主动放弃的"小改进"候选

1. **NSCA-CPT ch06-agility (6 inline) + ch07-flexibility (9 inline) 偏少**
   - 候选是"加内容"型（创作行为），违反用户偏好"不做与现有功能重复的大改动；
     优先修复真实存在的 bug/质量问题"——audit 已 0 drift，无需追加 inline
2. **羽毛球康复书 ch03-knee (16 inline) / ch04-ankle (23 inline) 章节密度深化**
   - 同上，创作行为而非 bug 修复
3. **ch04-ankle.md L204 "其余 12 个 unique id"叙述里 12 这个数**（13 unique 总 - 1 高频
   = 12 其余，数学上正确但易误读为"全章只有 12 unique"）
   - 这是叙述拆分而非声明，audit 不视为 drift，硬改反而破坏叙述连贯

### 校验（commit 之前全部跑过）

- `git diff --stat`：1 file changed, 1 insertion(+)（即本 round132.md 落盘）
- `git status --short`：仅 `scripts/_compare_readme_vs_manifest.py` untracked（按
  `.gitignore` 第 82-83 行 `_scan_*.py` / `_scan_*.js` 通配惯例不 commit）；
  `_scan_readme_drift.py` 已被通配忽略
- `python -m json.tool manifest.json` ✓（未触碰 manifest）
- `python -m json.tool books/exercises/ex-lib.json` ✓（未触碰 ex-lib）
- `node --check app.js` ✓（未触碰 JS）
- `_audit_exlib_ledger.py` 输出：「✅ all declared counts match actual inline
  counts」✓（未触碰任何 markdown）
- 仓库所有现存文件 MD5 与上一轮 commit bd0545e 状态一致（除本 round132.md 新增）
- APP_VERSION v3.22.62 不 bump（无业务代码改动）
- LF 行尾保持（沿用 round123 newline LF 容忍规范）

### 仓库稳定性结论

经本轮 5 维度整仓巡检，仓库当前状态：
- **0 个 declared vs actual inline 引用 drift**（audit pass）
- **0 个 unregistered chapter file**（manifest 完整）
- **0 个 ghost chapter file**（无悬挂声明）
- **0 个 APP_VERSION 埋点 drift**（5 埋点全 v3.22.62）
- **0 个 broken ex-lib id**（全部 1336 合法）
- **0 个 README 元数字 drift**（所有声明 ≤0.04 万四舍五入正常范围）

与 round110 c2f5fd5（"扫描结果显示仓库当前无真实 bug 可修"）同型：本轮做的是
"全面体检"而非"修复 bug"。

## 给下一轮的候选

1. **(优先级中)** 候选 #1 已查实为非问题（round131 候选 #1 兑现后闭环）。下轮可
   转去做 NSCA-CPT ch06-agility + ch07-flexibility 的"关联动作"段加 inline 充实
   ——这是创作型小改进，与"修复 bug"路线不同但对用户价值明确；可考虑但不强制
2. **(优先级低)** 羽毛球康复书 ch03-knee (16 inline) + ch04-ankle (23 inline)
   内容深化——同属创作型，可放在候选 #1 之后
3. **(优先级低)** `_compare_readme_vs_manifest.py` 与 `_scan_readme_drift.py`
   两个临时扫描脚本当前按 `.gitignore` 通配忽略；如未来想让回归工具常驻，
   可显式 add 到 git 让 round133+ 自动跑（这是元工作流改进，不影响用户阅读）
4. **(优先级低)** 仓库当前稳定态已持续 24+ 小时；下轮若无创作型候选，可再次做
   同样体检记账（与 round110/本轮同型）

## 本轮 commit

- hash: 见 `git log --oneline -1`（amend chain 末端；首 push `6645723` 已上 origin，后续 amend 仅含本 round132.md hash 字段回填，无内容修改）
- subject: `chore(todo): 第 132 轮记账 — 全仓 5 维度巡检 0 drift / 0 broken / 0 unregistered，与 round110 c2f5fd5 同型纯记账变体`
- 1 file changed, 125 insertions(+)（仅 `todos/round132.md` 落盘）
- APP_VERSION: v3.22.62 (no bump)
- branch: book (push 成功 `0b4e347..6645723 book -> book`；累计 sleep 30+60+60+90+120+180 = 9 分钟，3 次 443 失败后第 4 次握手中断 1 次，第 6 次 sleep 180 后成功，沿用 round128 第 5 次 sleep 120 成功模式)