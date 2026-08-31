# 第 87 轮 记账草稿（round87 commit 6669b60）— NSCA-CPT ch02 h2s 嵌套数组「思考题」重复条目清理

**本轮做了什么**：第 86 轮 ledger 候选 #1 — NSCA-CPT ch02 manifest.json h2s 嵌套数组尾部存在「思考题」重复条目（[16] 思考题 + [17] 思考题，subs 都为空 stub）。markdown `books/nsca-cpt/ch02-exercise-physiology.md` L1339 实际只有 1 个 `## 思考题`，所以 manifest 比 markdown 多 1 个条目，渲染到 ch02 大纲时会重复显示「思考题」一次。本轮把多余重复条目删掉，让 manifest 与 markdown 严格 1:1 对齐（15 个编号 H2 + 1 个 `## 思考题` = 16 个 manifest 条目）。

**两处对称删除**：
- `manifest.json` L8872-L8880 重复块 4 行删除（{ "title": "思考题", "subs": [] }, 第二次出现）
- `manifest_data.js` L9548-L9556 同步删除（结构与 manifest.json 完全对齐）
- 保留第一个「思考题」（与 markdown L1339 对应），删第二个空 stub
- markdown 自身不动（它本来就只有 1 个 `## 思考题`）

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- NSCA-CPT ch02 h2s 数组长度：`17 → 16`（与 markdown 16 个 H2 一致，1:1 对齐）✓
- `grep -c "思考题" manifest.json`：`5 → 4`（净减 1）✓
- `grep -c "思考题" manifest_data.js`：`5 → 4`（净减 1）✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only，与改前一致）✓
- `git diff --stat` → `2 files changed, 0 insertions(+), 0 deletions(-)`（`.gitattributes` L5 全文件禁用 diff 配置导致 git 标 binary；`git diff --text` 拿到 -8 真实修改：-4 行 × 2 文件）✓
- `git diff --text` → manifest.json -4 行 / manifest_data.js -4 行（删除 1 个重复 `{"title":"思考题","subs":[]}` 整块 × 2 文件），与本轮目标一致 ✓
- 字节数：manifest.json `435631 → 435537`（-94B），manifest_data.js `457585 → 457491`（-94B）；4 行 × 23B = -92B ≈ -94B（含前后逗号微调）✓
- `git log -1 --format=%H` → `6669b60` ✓
- 可独立回滚：`git revert HEAD` 即可恢复 2 个文件 4 行删除 ✓

**用户偏好兑现**：
- 沿用 73/74/75/76/77/79/80/81/82/83/84/85/86 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及
- 兑现 86 轮 ledger 候选 #1 的「可远期清理（合并或删除一个空 stub）」承诺
- 单 commit / 单源 issue / 对称双文件修复 / 严格 1:1 与 markdown 对齐

**commit hash**：`6669b60`
（`fix(nsca-ch02): h2s 嵌套数组重复「思考题」条目清理 — 86 轮 ledger 候选 #1 兑现`）

**push 状态**：✅ 成功！`15b9e85..6669b60 book -> book`（⚠ 4 次 github.com 443 连接失败：首次 2088ms / 后 21068ms / 21128ms / 21117ms / 21178ms / Recv failure / 21117ms；累计 sleep 30 + 60 + 90 + 90 + 180 = 8 分 30 秒；最终 `git -c http.proxy= -c https.proxy= push origin book` → exit 0），GitHub Pages 自动部署中

**下轮候选**：
1. (本轮新发现, 优先级中) `finance/ch13-international-finance.md` h2s 嵌套数组存在重复「理财小组」条目（与 87 轮 ch02 修复同型 — manifest 与 markdown 不对齐），后续可对称清理（需要先 grep markdown 确认几处 + 找合法保留位置）
2. (继承 71~87 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
3. (继承 71~87 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观
4. (继承 72~86 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
5. (继承 80~87 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79/80/81/82/83/84/85/86/87 双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~87 双写系列保持连续
6. (继承 85~87 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 87 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被 git 标 binary，但字节数实际有变（-94B × 2） — `git diff --text` 仍可拿到真实 diff。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），而其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff
7. (继承 71~87 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留
