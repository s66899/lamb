# Round 134 记账 — 首页 3 处过时「X大模块」文案对齐 TRAIN_MODULES.length=7

## 改动

`app.js` L87 + `index.html` L34 + `index.html` L107 三处过时静态文案对齐 `TRAIN_MODULES.length` 实际值 = 7：

1. **app.js L87**：`// ─── 5大训练模块 ───` → `// ─── 7大训练模块（含教练系统 + 个人专项） ───`
2. **index.html L34 splash**（首屏加载 4 chip 之一）：`<span>🎯 6大模块</span>` → `<span>🎯 7大模块</span>`
3. **index.html L107**（主面板「训练模块」section 上方注释）：`<!-- 🎯 5大训练模块 -->` → `<!-- 🎯 7大训练模块（含教练系统） -->`

**为什么这是真问题**：

`TRAIN_MODULES` 数组实测 7 条 id（`badminton-tech` / `strength` / `psychology` / `nutrition` / `competition` / `coach` / `personal`），其中：
- `sModules` DOM 元素（首页 hero 第 1 个 stat-box）由 `$('sModules').textContent = TRAIN_MODULES.length`（app.js L2453）动态输出 **7**
- `$('heroSub').textContent = \`${TRAIN_MODULES.length}大训练模块 · 融合心理学…\``（app.js L2456）动态输出 **7大训练模块**
- `moduleSection` 渲染（app.js L2541）= 1 教练系统 card + `TRAIN_MODULES.filter(m=>m.id!=='coach').map(...)` = 1 + 6 = **7 张卡片**

**但三处遗留静态文案未同步**：
- `app.js L87` 注释「5大训练模块」从 v3.0.0（80a09f8 / 0e4d3b5）起未动过，跨越 coach 模块（v3.5.0 ec0f8c1）、personal 模块（v3.14.0 37c5477）两次模块数变更均未更新
- `index.html L34` splash chip「6大模块」从 v3.16.0 UI 优化（5c78e41 时期）起硬编码，未随 personal 模块入 v3.14.0 同步刷新
- `index.html L107` 主面板 section 注释「5大训练模块」从初版即写错，亦未随模块数变更

**结果**：用户首屏 splash 看到「6大模块」、首屏 dashboard 数字看到「7」、section 注释开发读代码看到「5」——三方口径不一致，对外营销文案与实际功能不一致。

**为什么不修 `/6` 分母（app.js L2121 + L2123）**：那个 `Math.min(1, visited / 6)` 是有意为之——用户可见的训练模块（sidebar `renderTrainingItems` filter 排除 coach）= 6 条，分母 6 与 sidebar 用户可见模块数对齐正确；如果改成 7 会让 6 个全访问还差 14% 才能 100%，与现有用户进度数据脱钩。本轮仅修静态文案，不动行为参数。

## 校验

- `node --check app.js` ✅
- `python -m json.tool manifest.json > /dev/null` ✅（未动）
- `python _audit_exlib_ledger.py` ✅ 0 drift / 0 broken（未触 book chapter，本轮纯 home UI 注释对齐）
- `grep -nE '5大训练模块|5大模块|6大模块' app.js index.html` → 空（无残留过时字符串）
- `grep -nE '7大训练模块|7大模块' app.js index.html` → 3 行命中（全部新文案就位）
- `git diff --stat`：app.js | 2 +- ; index.html | 4 ++--（3 insertions / 3 deletions）
- `git status --short` 推前仅 `M app.js / M index.html` 两条；推后干净
- LF / CRLF：沿用 round123 newline LF 容忍规范，未触发转换
- 可独立回滚：`git revert 312280f`
- APP_VERSION v3.22.62 不 bump（纯文案对齐，无功能性变化）

## 仓库稳定性结论

本轮「单点小修复」轮次，未做 5 维度体检（与 round133 错峰）：
- 0 declared vs actual inline drift（沿用 round133 体检结论）
- 0 unregistered / 0 ghost chapter（沿用）
- 0 APP_VERSION 埋点 drift（沿用）
- 0 broken ex-lib id（沿用）
- 修复 1 处「静态 UI 文案 vs 动态代码输出」三方口径不一致

## 本轮 commit

- `312280f` fix(home): 3 处过时「X大模块」文案对齐 TRAIN_MODULES.length=7
- 推送：`346f386..312280f  book -> book`

## 给下一轮的候选

1. **(优先级中)** 同型「过时文案对齐」候选——继续扫前端可见文案与实际行为不一致：
   - `_session_todo.md` 内大量 commit hash 仍标「hash 待 git commit 后回填」——查实际 hash 回填（沿用 round131 bd0545e 同型 README 字数对齐思路）
   - 扫 `app.js` L2400~L2500 的 hero 渲染区域是否有其他过时数字（如 `sCycle='3yr'` 是否仍准确）
2. **(优先级低)** `_compare_readme_vs_manifest.py` / `_scan_readme_drift.py` 临时脚本登记（沿用 round133 候选 #1c）——给 `scripts/` 加 README.md 把每个 `_*.py` 临时脚本的「用途 / 触发轮次 / 是否可删」登记一下
3. **(优先级低-中)** 羽毛球康复书内容深化（沿用 round133 候选 #2）：ch03-knee 16 inline / ch04-ankle 23 inline 创作型小改进
4. **(优先级低)** NSCA-CPT ch06-agility 6 inline + ch07-flexibility 9 inline 加 inline 充实候选（创作型）
5. **(优先级低)** 仓库稳定态已持续 24+ 小时；下轮若无修复型候选，可再次做同样体检记账
