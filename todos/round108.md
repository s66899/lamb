# Round 108 todos

**已完成 commit**：`5056aee`

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `e8e5242`（round107 ledger），working tree 12 个未跟踪临时扫描脚本
- **扫描候选**（不重复上轮已记账 #1~#6）：
  - 全书 107 章做 manifest title 与 markdown h1 字符级一致性扫描（99 章前缀差异 + 8 章设计性双语 + 9 章纯字符串找不到）
  - 前缀差异「第N章/第N章配套」是 manifest 设计（标题不带前缀）——非 bug
  - 7 章 `English · 中文` 是 manifest 设计意图（sidebar 简略双语标题）——非 bug
  - 2 章真正"manifest title 字符串在 markdown 中完全不存在"：
    - `nutrition/ch01-tdee.md`：manifest = `TDEE 每日总能耗计算`（多 1 空格），markdown h1 = `TDEE每日总能耗计算`（无空格）
    - `yin-yang/ch11-fingerprints-palm-color.md`：manifest = `手相指纹掌色与掌形`（无顿号），markdown h1 = `手相指纹、掌色与掌形`（有顿号）
- **修复**（round108 主任务，2 字符串 × 2 文件 = 4 替换）：
  - manifest.json L13486 + manifest_data.js L14069: `TDEE 每日` → `TDEE每日`（nutrition/ch01 减 1 字节）
  - manifest.json L1407 + manifest_data.js L1403: `手相指纹掌色` → `手相指纹、掌色`（yin-yang/ch11 加 1 字节）
  - 锚点字符串在各自文件唯一（grep -c 确认 1:1）
  - **保持 manifest.json ↔ manifest_data.js 镜像不变式**（过去 107 轮都遵守）
- 校验：
  - `python -m json.tool manifest.json` 通过
  - `node --check manifest_data.js` 通过
  - 新值双文件 1:1 命中；旧值双文件 0 命中
  - manifest.json Bin 439189 → 439191（+2 字节 = -1+3 UTF-8 字节变化）；manifest_data.js Bin 458412 → 458414（+2 字节）——双文件字节增量精确对齐
  - 9 books 拓扑不变
  - ex-lib 引用：两章 markdown 都不引用 ex-lib id，本轮 0 涉及 SMR / 0 涉及伪造 id
  - 修复后"manifest title 在 markdown 不存在"章数：9 → 7（剩 7 个是设计性双语，不算 bug）
  - APP_VERSION 不 bump（纯字符串修正，UI/部署逻辑零变更）

**用户偏好兑现**：

- 不做与现有功能重复的大改动——本轮只修 2 字符串、4 替换、单 commit
- ex-lib 库里没有 foam roller / 筋膜球专项条目——本轮 0 涉及 SMR / 0 涉及伪造 id
- 写作风格双层结构不动；羽毛球康复书结构不动
- 镜像不变式维持：manifest.json ↔ manifest_data.js 1:1 同步
- 单字符 / 单标点级修复：可独立回滚（`git revert HEAD`）

**真实问题修复对照**：

- 修复前：sidebar/TOC 上「TDEE 每日总能耗计算」「手相指纹掌色与掌形」与读者点击进入页面看到的 markdown h1 不完全相同——TOC 与内容有微小文字差，影响搜索索引和导航体验
- 修复后：nutrition/ch01 sidebar 与 h1 完全一致「TDEE每日总能耗计算」；yin-yang/ch11 sidebar 与 h1 完全一致「手相指纹、掌色与掌形」

**commit hash**：`5056aee`

**push 状态**：❌ 本轮 push 失败（github.com:443 不可达，21s 连接超时，107 轮记账同样问题）；`5056aee` 已本地 commit，下一轮重试 push

**下轮候选**（继承 107/108 轮 + 本轮新发现，优先级降序）：

1. **(继承 107 轮 #2, 优先级高)** yin-yang 5 章 manifest ↔ markdown 大漂移（ch08/ch11/ch12/ch13/ch15 共 ≈28 处）——本轮已证明 ch11 还有字符级小漂移（已修），剩余结构性漂移（h2 数差 6、h3 数差 16~48）适合分章逐个修（每章一次 commit）。**下轮可先做 ch08**（manifest h2=7 vs md=6，h3=1 vs 2，差距最小最稳）。
2. **(本轮新发现, 优先级中)** 7 章「English · 中文」双语 manifest 标题（如 `Competition Psychology · 基础`、`Axial Loading · 入门`、`Memory · 教材版`）——是设计意图还是历史遗留？需确认是否在 markdown 里加一行英文小标题以让搜索索引能匹配，或保持现状。
3. **(继承 107 轮 #3, 优先级中)** NSCA ch10 SMR 条目入库——用户偏好强调 SMR 类按库里实际存在的拉伸引用，或标"库中暂无"——需正式扫一遍 ch10 看引用一致性。
4. **(继承 107 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json / manifest_data.js diff 显示 Binary——可改为只屏蔽真正需要 LFS 的后缀（让本类 manifest 改动 diff 可见可审）。
5. **(继承 107 轮 #5, 优先级低)** 根目录 `*.py` 散落 60+ 个无 `.gitignore` 兜底——本轮新增 0 个（用 inline python -c 完成所有校验），但历史脚本仍 untracked。可一次性补 `_*.py` / `round*.py` 进 .gitignore。
6. **(本轮新发现, 优先级低)** `git status` 显示 `* -text` 影响下，本类纯字符串小修复 commit message 写"4 处替换"但 git diff stat 显示 `2 files changed, 0 insertions(+), 0 deletions(-)`（因为按 Bin 处理）——是否要修 `.gitattributes` 让 diff 真实可见（与候选 #4 同源）。

**本轮 drift 状态**：项目全局实际 drift 29 → 29（ch01 nutrition 和 ch11 yin-yang manifest ↔ markdown 字符级对齐已修复，但因两章原本已"substring 找不到"被计入 drift 库而非结构性 drift 库——具体数字记录在扫描脚本，全局未单独建台账；项目纯字符串 drift 计数 9 → 7）

**记账 push**：（本轮 ledger `round108.md` 已生成，下一轮 push）