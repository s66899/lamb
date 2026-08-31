# Round 111 todos

**已完成 commit**：`30bb048`

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `2ac306b`（上一轮遗留的"round110 ledger 内容"commit，但 todos/round110.md 文件不存在——ledger 节奏在前轮断了），working tree 24 个未跟踪临时扫描脚本 + 1 个未提交 ledger 文件（todos/round109.md）
- **扫描真实 bug**：
  - 全书 107 章做 manifest title ↔ markdown h2/h3 漂移扫描
  - 找到 5 个 yin-yang chapter 有 drift：ch08 mirror=True（round109 已修 ✓），剩 ch11/ch12/ch13/ch15 mirror=False
  - **ch11**: mj_h2=6 / mdj_h2=12（md_h2=12 一致）/ mj_subs=16 / mdj_subs=35（md_subs=35 一致）
  - **ch12**: mj_h2=6 / mdj_h2=12 / mj_subs=16 / mdj_subs=44
  - **ch13**: mj_h2=6 / mdj_h2=12 / mj_subs=14 / mdj_subs=48
  - **ch15**: mj_h2=7 / mdj_h2=15 / mj_subs=18 / mdj_subs=52；额外：mj 有 1 个 EXTRA h2「全章小结」已被 manifest_data.js 移除（manifest_data.js 已正确，markdown 实际是 h2[14]「15.15 全章总结」）
  - 即 manifest_data.js 已与 markdown 1:1 一致，**manifest.json 还停在 v1.0.1 旧版**——manifest.json ↔ manifest_data.js 镜像不变式违反（过去 109 轮反复强调的硬不变式）
- **核实其他不变式**（无 drift）：
  - 9 books 拓扑不变
  - APP_VERSION = `v3.22.62` 5 埋点（app.js / index.html 3 处 ?v= / README.md / books/README）一致
  - ex-lib 1336 合法 id 全覆盖，本轮 0 涉及 SMR / 0 涉及伪造 id
  - markdown 渲染异常 / JSON 损坏 / APP_VERSION drift：均 0
- **修复**（round111 主任务，4 章 h2 + subs 块替换，1 个文件 1 个 commit）：
  - **目标**：让 manifest.json yin-yang ch11/ch12/ch13/ch15 的 `"h2s": [...]` 块与 manifest_data.js 1:1 一致
  - **方案**：从 manifest_data.js 解析对应章节的 h2s 对象，用与 manifest.json 现有风格一致的缩进（indent=2、单 key/line、UTF-8 中文直出）生成替换块，**精确替换** manifest.json 中 4 个 chapter 的 `"h2s": [...]` 文本块（不重写整个文件，不影响其他 93 章和 8 本书）
  - **实施细节**（值得记录）：
    - 第一版脚本生成 `' ' * 10 + '"h2s": ['` 作为首行 → 替换后 `"h2s":` 前累积 20 空格（10+10），缩进溢出
    - 修后首行改为 `'"h2s": ['`（无 prefix），保持替换范围 [h2s_open:h2s_end] 不变 ✓
    - 第二版 bug：dump_h2_block 在 subs array close 处错误加 `,` (`],`) 紧跟 h2 close `}` 形成 trailing comma `...,},` → Python json.loads 报 "Illegal trailing comma before end of object"
    - 修后：subs array close `]` 永远不带 comma（h2 对象的 trailing comma 由 h2 自身的 `}` 或 `},` 决定），符合 JSON 规范
  - **结果**：JSON 解析通过；manifest.json 4 章 h2 + subs 全 mirror manifest_data.js
- 校验：
  - `python -m json.tool manifest.json` 通过
  - `node --check manifest_data.js` 通过（未触碰）
  - dict-level compare：yin-yang 4 目标章节内容完全变化（按预期），其他 11 yin-yang chapter + 8 本书 84 chapter（共 93 chapter）dict 完全相等 ✓
  - 4 章 h2/subs 数：
    - ch11 h2 6 → 12，subs 16 → 35（+6 h2, +19 subs）
    - ch12 h2 6 → 12，subs 16 → 44（+6 h2, +28 subs）
    - ch13 h2 6 → 12，subs 14 → 48（+6 h2, +34 subs）
    - ch15 h2 7 → 15，subs 18 → 52（+8 h2, +34 subs）
  - 总新增：+26 h2 对象 + 115 subs 对象
  - 字节变化：Bin 439083 → 457944（+18861 bytes JSON 字面量）
  - **镜像不变式恢复**：yin-yang 5 章（ch08 上一轮 + ch11/12/13/15 本轮）全部 manifest.json ↔ manifest_data.js 1:1 一致
  - APP_VERSION 不 bump（纯目录元数据修正，UI / 部署逻辑零变更）
  - 0 个 broken ex-lib id；0 个 manifest JSON 损坏；0 个 markdown 渲染异常

**用户偏好兑现**：

- 不做与现有功能重复的大改动——本轮只修复 4 章节 h2s 块、1 文件、1 commit；其他 93 chapter dict 完全不动
- ex-lib 库里没有 foam roller / 筋膜球专项条目——本轮 0 涉及 SMR / 0 涉及伪造 id
- 写作风格双层结构不动；羽毛球康复书结构不动
- **镜像不变式恢复**（过去 109 轮反复强调）——本轮修复 ch11/12/13/15 共 4 处镜像回归
- 单 chapter 块级修复：可独立回滚（`git revert HEAD`）

**真实问题修复对照**：

- 修复前：任何同时读 manifest.json 和 manifest_data.js 的代码（搜索、爬虫、CI 校验、侧栏 TOC 重建脚本）看到 yin-yang 4 章完全不同的目录树——manifest.json 给出 6-7 个 h2 的精简导航，manifest_data.js 给出 12-15 个 h2 的完整目录树，两份数据源不一致导致侧栏可能渲染错误 / 搜索结果重复 / CI 校验误报
- 修复后：manifest.json 与 manifest_data.js 在 yin-yang 全部 15 章 1:1 一致（ch08 上一轮 + ch11/12/13/15 本轮），侧栏/TOC 锚点统一，搜索引擎与 CI 校验看到的目录树唯一

**commit hash**：`30bb048`

**push 状态**：见 commit 后尝试结果（沿袭 107/108 轮 github.com:443 不可达问题，下轮继续重试）

**下轮候选**（继承 108/109/110/111 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级中)** todos/round110.md 文件缺失：HEAD `2ac306b` commit message 自称"第 110 轮记账"但 ledger 文件不存在——ledger commit 节奏在前轮断了；本轮以 round111 命名延续节奏，下轮可考虑 round110 ledger 补建（作为孤儿 commit message 的追溯账本）或彻底弃用 round110 命名
2. **(继承 108 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json diff 显示 Binary（`1 file changed, 0 insertions(+), 0 deletions(-)`）——本轮再次触发此问题（commit `30bb048` 也是 0 insertions）。可改为只屏蔽真正需要 LFS 的后缀，让本类 manifest 改动 diff 可见可审
3. **(继承 108 轮 #5, 优先级低)** 根目录 `*.py` 散落 70+ 个无 `.gitignore` 兜底（本轮新增 `_manifest_backup_round110.json` / `_manifest_new_round110.json` 2 个 + 之前 24 个扫描脚本）——可一次性补 `_*.py` / `_*.json` / `_*.txt` / `round*.py` 进 .gitignore
4. **(继承 108 轮 #2, 优先级低)** 7 章「English · 中文」双语 manifest 标题——是否设计意图仍未确认
5. **(继承 108 轮 #3, 优先级低)** NSCA ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2
6. **(继承 109 轮 #6, 优先级低)** round109/110/111 工作流暴露：扫描 manifest vs markdown 对齐需要稳定脚本——可写一个 `_drift_scan.py` 入库（不入 git），统一 `_roundNNN_*.py` 命名规范

**本轮 drift 状态**：

- yin-yang 5 章 manifest ↔ markdown 大漂移：ch11/ch12/ch13/ch15 已修 ✓（共 +26 h2, +115 subs, Bin +18861 bytes）；ch08 上一轮已修 ✓
- 全局 drift 计数：5 → 0（项目所有 manifest ↔ markdown 漂移已全部消除，yin-yang 15 章 manifest ↔ md ↔ manifest_data.js 三方 1:1 一致）

**记账 push**：（本轮 ledger `round111.md` 已生成，下一轮 push 时与 fix `30bb048` 一起带上）