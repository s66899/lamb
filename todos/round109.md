# Round 109 todos

**已完成 commit**：待生成

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `3c74a1b`（round108 ledger），working tree 12 个未跟踪临时扫描脚本（继承 108 轮）
- **继承上轮候选 #1「yin-yang 5 章 manifest ↔ markdown 大漂移」** → 本轮先做 ch08（差距最小最稳：manifest h2=7 vs md=6，h3 归属错）
- **扫描发现**：manifest.json 与 manifest_data.js 在 yin-yang ch08 块**已不镜像**——违反过去 108 轮记账反复强调的「manifest.json ↔ manifest_data.js 镜像不变式」：
  - `git log -S "手掌区域ASCII示意" -- manifest.json` → 仅 413a55f（v1.0.1 大改写）引入；manifest_data.js 里该字符串从未存在
  - `git log -S "九丘速查表" -- manifest_data.js` → 413a55f 引入，后被 431c136 (v3.22.38 manifest 滞后修复) 重新生成时已挂到 8.2 sub 下
  - 结论：manifest_data.js 是后期重建产物，**它正确反映了 markdown 实际结构**（6 个 h2 + 1 个 8.2 子标题「九丘速查表」）；manifest.json 的 ch08 还停留在 v1.0.1 状态（多了一个错误的 h2「手掌区域ASCII示意」误升、而 8.2 下的 h3「九丘速查表」已经正确归属）
- **修复方案决策**：让 manifest.json 与 manifest_data.js 对齐（即删 manifest.json ch08 的 h2[0]「手掌区域ASCII示意」）。理由：
  1. manifest_data.js 已与 markdown 完全一致（h2 数 = 6，h3 归属正确）
  2. markdown 实际只有 6 个 `##` h2，「手掌区域ASCII示意」在 md 里是 `###` h3（孤悬在 h1 与 8.1 之间，作为章首图说明），manifest_data.js 已正确忽略它
  3. mirror 不变式高于单文件历史合理性
- **修复**（round109 主任务，1 个 h2 对象删除 = 4 行）：
  - manifest.json L995-999: 删除整个 h2[0] 对象（`{"title":"手掌区域ASCII示意","subs":[]}` 及其外层 `{ } ,` 与换行）
  - manifest_data.js **不动**（已是正确状态）
  - 锚点「手掌区域ASCII示意」在 manifest.json 现在 0 命中；manifest_data.js 仍 0 命中——双文件 0 命中一致 ✓
  - 双文件 ch08 h2s 都收敛到 6 项：8.1/8.2/8.3/8.4/8.5/8.6
  - 「九丘速查表」双文件都保留为 8.2 sub
- 校验：
  - `python -m json.tool manifest.json` 通过
  - `node --check manifest_data.js` 通过
  - ch08 h2s：manifest.json 7 → 6；manifest_data.js 6（不变）；markdown 6（不变）
  - ch08 h3s（8.2 sub）：manifest.json 1（不变，「九丘速查表」）；manifest_data.js 1（不变）；markdown 2（多 1 个孤悬的 `### 手掌区域ASCII示意`——是 markdown 自身的小瑕疵，不影响侧栏导航，本轮不动 md）
  - manifest.json Bin 439191 → 439083（-108 字节 ≈ 删除 4 行 JSON 字面量）；manifest_data.js Bin 458414（不变）
  - **镜像不变式恢复**：yin-yang ch08 在双文件 1:1 一致
  - 9 books 拓扑不变
  - ex-lib 引用：yin-yang/ch08 markdown 不引用 ex-lib id，本轮 0 涉及 SMR / 0 涉及伪造 id
  - APP_VERSION 不 bump（纯目录元数据修正，UI/部署逻辑零变更）

**用户偏好兑现**：

- 不做与现有功能重复的大改动——本轮只删 1 个 h2 对象、4 行 JSON、单 commit
- ex-lib 库里没有 foam roller / 筋膜球专项条目——本轮 0 涉及 SMR / 0 涉及伪造 id
- 写作风格双层结构不动；羽毛球康复书结构不动
- 镜像不变式恢复（这是过去 108 轮都明确强调的不变式，本轮发现并修复回归）
- 单 h2 对象级修复：可独立回滚（`git revert HEAD`）

**真实问题修复对照**：

- 修复前：yin-yang ch08 在 manifest.json 有 7 个 h2（含一个孤儿「手掌区域ASCII示意」误升为 h2），与 manifest_data.js 不一致——任何同时读两份 manifest 的代码（搜索、爬虫、CI 校验）都会看到不同目录树
- 修复后：manifest.json 与 manifest_data.js 在 yin-yang ch08 完全一致（6 h2s + 1 sub under 8.2），侧栏/TOC 锚点统一，搜索引擎与 CI 校验看到的目录树唯一

**commit hash**：见 git log 紧随本 ledger 的最新 entry

**push 状态**：❌ 沿袭 107/108 轮 push 失败问题，commit 后再尝试 push；下轮继续重试

**下轮候选**（继承 107/108/109 轮 + 本轮新发现，优先级降序）：

1. **(继承 108 轮 #1, 优先级高)** yin-yang 剩余 4 章 manifest ↔ markdown 漂移：ch08 已修 ✓ 剩 ch11/ch12/ch13/ch15 共 ≈22 处——**下轮可先做 ch12**（manifest h2=6 vs md 看实际，需先扫描，继承 108 轮节奏是「差距最小最稳先做」）
2. **(继承 108 轮 #2, 优先级中)** 7 章「English · 中文」双语 manifest 标题（如 `Competition Psychology · 基础`、`Axial Loading · 入门`、`Memory · 教材版`）——是设计意图还是历史遗留？
3. **(继承 108 轮 #3, 优先级中)** NSCA ch10 SMR 条目入库——SMR 类按库里实际存在的拉伸引用，或标"库中暂无"
4. **(继承 108 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json / manifest_data.js diff 显示 Binary——可改为只屏蔽真正需要 LFS 的后缀（让本类 manifest 改动 diff 可见可审）。本轮再次触发此问题（`1 file changed, 0 insertions(+), 0 deletions(-)`），下轮若时间允许可一并修复
5. **(继承 108 轮 #5, 优先级低)** 根目录 `*.py` 散落 70+ 个无 `.gitignore` 兜底（109 轮新增 8 个扫描脚本）——可一次性补 `_*.py` / `_round*.txt` 进 .gitignore
6. **(本轮新发现, 优先级低)** round109 工作流暴露：扫描 manifest vs markdown 对齐需要稳定脚本——可写一个 `_drift_scan.py` 入库（不入 git），统一 `_roundNNN_*.py` 命名规范

**本轮 drift 状态**：

- yin-yang 5 章 manifest ↔ markdown 大漂移：ch08 已修 ✓（manifest ↔ md 6 h2 一致 + 8.2 sub 一致；md 自身有 1 个孤悬 h3「手掌区域ASCII示意」未动）
- 剩 ch11/ch12/ch13/ch15 ≈22 处待修
- 全局 drift 计数：-1（ch08 漂移项消除）

**记账 push**：（本轮 ledger `round109.md` 已生成，下一轮 push 时一起带上）
