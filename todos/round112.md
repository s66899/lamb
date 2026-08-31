# Round 112 todos

**已完成 commit**：`0c790e3`

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `f444175`（上一轮 ledger + fix `30bb048` 仍未 push，github.com:443 不可达沿袭 107/108/110/111 轮问题），working tree 24 个未跟踪临时扫描脚本 + 1 个未提交 ledger 文件（todos/round111.md）
- **扫描真实 bug**（覆盖：APP_VERSION 5 埋点、manifest.json ↔ manifest_data.js、manifest_data.js ↔ markdown、ex-lib 引用、markdown 渲染异常、JS 语法、JSON 完整性、章节标题字符级、ch07 12 周内容）：
  - APP_VERSION = `v3.22.62` 5 埋点（app.js / index.html 3 处 ?v= / README.md / books/README）一致 ✓
  - 9 books × 97 chapters 拓扑不变 ✓
  - ex-lib 1336 合法 id 全覆盖，本轮 0 涉及 SMR / 0 涉及伪造 id ✓
  - 全仓 markdown [ex:XXXX] 引用 broken 计数 = 0 ✓
  - manifest.json ↔ manifest_data.js 9 本书 97 章 h2 drift 计数 = 0（round111 已完成 5 章镜像修复 ✓）
  - badminton-recovery 8 章 manifest_data.js ↔ markdown h2 标题 1:1 ✓
  - markdown 渲染异常 / JSON 损坏 / JS 语法：均 0 ✓
  - **唯一新发现真实 bug**：`books/README.md` 2 处字数计数与 manifest.json `totalWords` 不一致（drift 持续自 v3.22.51 上次 manifest 同步后的内容增量未回流 README）
- **修复**（round112 主任务，1 个文件 2 处文案，1 个 commit）：
  - **目标**：让 books/README.md 的字数声明与 manifest.json `totalWords` 字段 1:1 对齐
  - **方案**：python 算 9 本书 totalWords + sum → round(/10000, 1) → 校对声明文案
  - **具体 drift**：
    - 顶部 `9 本书 / 97 章 / 89.9 万字` → `9 本书 / 97 章 / 89.8 万字`
      - 实际：897927 字 → 897927/10000 = 89.7927 → `round(_, 1) = 89.8`（Python 默认 banker's rounding 也给 89.8）
    - 羽毛球康复指南行 `8 | 2.1 万` → `8 | 2.0 万`
      - 实际：20073 字 → 20073/10000 = 2.0073 → `round(_, 1) = 2.0`
  - **未改动**：其余 7 本书 per-book 计数（14.2/15.8/20.5/16.9/14.3/5.0/0.5/0.6 万）与 round(_, 1) 已一致
  - **结果**：books/README.md 9 本书 per-book + 顶部总数全部与 manifest.json totalWords 字段 1:1
- 校验：
  - `python -m json.tool manifest.json` 通过（未触碰）
  - `node --check manifest_data.js` 通过（未触碰）
  - `node --check app.js` 通过（未触碰）
  - dict-level compare：manifest.json + manifest_data.js 完全不变
  - 字节变化：books/README.md -2 bytes（`89.9`→`89.8` -1 char + `2.1`→`2.0` -1 char）
  - APP_VERSION 不 bump（纯顶层 README 文案修正，UI / 部署逻辑零变更）

**用户偏好兑现**：

- 不做与现有功能重复的大改动——本轮只修复 books/README.md 2 处字数文案、1 文件、1 commit
- ex-lib 库里没有 foam roller / 筋膜球专项条目——本轮 0 涉及 SMR / 0 涉及伪造 id
- 写作风格双层结构不动；羽毛球康复书结构不动
- 单文案字符级修复：可独立回滚（`git revert HEAD`）

**真实问题修复对照**：

- 修复前：books/README.md 顶部声称 `89.9 万字` 但 manifest.json 实际 897927 → 89.79 万字（差 1100 字 ≈ 1.2%）；康复指南行声称 `2.1 万` 但实际 20073 → 2.0 万字（差 1000 字 ≈ 5%）；README 自称「数据源：manifest.json」但与数据源自身不一致
- 修复后：books/README.md 9 本书 per-book + 顶部总数 10 个字数数字与 manifest.json `totalWords` 字段 1:1 对齐；`数据源：manifest.json` 声明真正可信

**commit hash**：`0c790e3`

**push 状态**：github.com:443 不可达（`RPC failed; curl 28 Recv failure: Connection was reset`），与 round107/108/110/111 同问题，留待网络恢复后重试

**下轮候选**（继承 108/109/110/111/112 轮 + 本轮新发现，优先级降序）：

1. **(继承 111 轮 #3, 优先级低)** 根目录 `*.py` 散落 75+ 个无 `.gitignore` 兜底（本轮新增 `_manifest_backup_round110.json` / `_manifest_new_round110.json` 2 个 + 之前 24 个扫描脚本）——可一次性补 `_*.py` / `_*.json` / `_*.txt` / `round*.py` 进 .gitignore
2. **(继承 108 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json diff 显示 Binary（`1 file changed, 0 insertions(+), 0 deletions(-)`）——本轮 commit `0c790e3` 走的是 books/README.md 非 manifest 故不受影响，但根 manifest 改动仍 diff 不可读
3. **(继承 108 轮 #2, 优先级低)** 7 章「English · 中文」双语 manifest 标题——是否设计意图仍未确认
4. **(继承 108 轮 #3, 优先级低)** NSCA ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2
5. **(本轮新发现, 优先级低)** README.md（根）vs books/README.md 数据声明不对称：根 README 仅 L231「v3.22.62」版本号 + L248 changelog，无字数声明；books/README.md 有完整字数声明。如果用户期望统一展示，需要在根 README 也补同样声明（目前不算 bug，仅是结构差异）
6. **(继承 111 轮 #1, 优先级低)** todos/round110.md 文件缺失：HEAD `2ac306b` commit message 自称「第 110 轮记账」但 ledger 文件不存在——本轮以 round112 命名延续节奏，下轮可考虑 round110 ledger 补建
7. **(继承 109 轮 #6, 优先级低)** round109/110/111/112 工作流暴露：扫描 manifest vs markdown 对齐需要稳定脚本——可写一个 `_drift_scan.py` 入库（不入 git），统一 `_roundNNN_*.py` 命名规范

**本轮 drift 状态**：

- books/README.md 2 处字数计数：已修 ✓
- 全局 drift 计数：2 → 0
- 9 本书 per-book + 顶部总数 10 个字数数字与 manifest.json totalWords 字段 1:1 对齐

**记账 push**：（本轮 ledger `round112.md` 已生成，下一轮 push 时与 fix `0c790e3` 一起带上）