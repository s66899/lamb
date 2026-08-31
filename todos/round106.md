# Round 106 todos

**已完成 commit**：

- `70123bf` fix(manifest_data.js): L4716 24空格 over-indent 孤例修复为 12空格（3440 个 `{` 行里唯一 indent=24，与同级 sibling h3 子对象 12 空格对齐；纯格式修复，JSON 解析不变，9 books 拓扑不变）
- `8d12ce0` chore(todo): 第 105 轮记账 commit 74061d3 — badminton/ch12 h2「二·」→「二、」字符风格不一致修复（第 105 轮整数里程碑）+ 第 106 轮扫描新发现

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `74061d3`（round 105 记账待提交），6 个未跟踪脚本（4 个 round 104~105 遗留 + 2 个本轮新增）
- **扫描任务 1**：跑 `_round106_scan_separator_mix.py` 全书 107 个 .md，扫 h2/h3 找 U+00B7 (`·`) 与 U+3001 (`、`) 混用
  - 5 个文件命中，但用 `_round106_classify.py` 二分后：
    - `psychology/ch12-positive-psychology.md` h3: U+00B7=2 / U+3001=1 → **真混用候选**
    - 其它 4 个文件 (`engineering-mechanics/ch12`、`nsca-cpt/ch09`、`psychology/ch07`、`yin-yang/ch08`) 都是单一风格（NscaCPT 是 6 个「第 N 节」自成一体的章节内编号风格；ch07/ch08/em-ch12 各 1 个，且大多为人名音译间隔符「芭芭拉·弗雷德里克森」「米哈里·契克森米哈赖」之类，按中文姓名书写约定保持不变）
  - **进一步核查 ch12-positive-psychology**：L139/L202 的 `·` 是人名间隔符，L265 的 `、` 是标题内列表分隔符（"在工作、学习和生活中的应用"），这两种用法在中文里都合法且语义不同，**不是 bug 不该改**
  - **结论：第 105 轮 ch12 的「二·」→「二、」是真正的孤例字符混用，全书其余位置要么是单一人名约定，要么是单一样式**
- **扫描任务 2**（优先级提升的真实问题）：`_round106_scan_indent2.py` 扫 manifest_data.js 所有 3440 个 `{` 行的 indent 分布
  - 分布：indent=16→2415 个（h3 主流），indent=12→918 个（h3 主体对象），indent=8→97 个（chapter 对象），indent=4→9 个（book 对象）
  - **唯一孤例**：`L4716 indent=24`，其它 0 个
  - 与 manifest.json 对照：JSON 源文件 L4133 同一位置是 12 空格，JS 镜像多缩进了 12 空格
- **修复**：`_round106_scan_indent2.py` 重跑确认 → indent=24 count 从 1 变 0，indent=12 从 918 增到 919（吸收了 +12 缩进）
- 校验：
  - `node --check manifest_data.js` 通过
  - Python `json.loads` 解析整个 JS 对象字面量 → 9 books 拓扑不变（`['yin-yang', 'badminton', 'engineering-mechanics', 'finance', 'nsca-cpt', 'psychology', 'badminton-recovery', 'competition', 'nutrition']`）
  - `python _scan_exlib_refs.py` → 1336 合法 / 140 unique / 0 broken（不变）
  - `python _audit_exlib_ledger.py` 105 文件审计无新增 drift
  - `git diff --stat manifest_data.js`：Bin 458053 → 458041（-12 bytes，与删掉的 12 个 leading space 一致；`.gitattributes` `* -text` 让 diff 显示 binary 但 byte-level 净变化精确 = -12）
  - APP_VERSION 不 bump；零业务代码改动；零 ex-lib id 改动；零 markdown 改动（纯 JS 镜像格式）

**用户偏好兑现**：

- 兑现上轮 ledger 候选 #8「manifest_data.js 第 4716 行 24 空格 over-indent 孤例」——单文件、单字符级变更、严格 1:1 对齐、独立可回滚（`git revert HEAD`）
- 0 涉及 SMR / 0 涉及 ex-lib 伪造 / 0 涉及大架构变更
- 第 105 轮记账补提交（round 105 之前漏写 ledger，本轮补齐，避免 104→106 出现 ledger gap）

**真实问题修复对照**：

- 修复前：manifest_data.js L4716 `                        {`（24 空格），是 3440 个 `{` 行中**唯一** indent=24；同级 L4687（同是 h3 子条目开头的对象）是 12 空格。manifest.json L4133 镜像位置是 12 空格。manifest_data.js 这一个 `{}` 对象被外层多缩进了 12 空格（人为手抖 / 半截 paste 错位）
- 修复后：L4716 与 L4687 对齐到 12 空格；manifest_data.js 与 manifest.json 在该位置缩进一致；JSON 结构、键名、键值、嵌套、数组顺序**完全不变**；浏览器解析不变；sidebar/TOC 渲染不变；GitHub Pages 部署后页面行为不变

---

**commit hash**：`70123bf`（业务）+ `8d12ce0`（记账）

**push 状态**：✅ 已成功（`74061d3..70123bf` book → book；GitHub Pages 自动部署中）

**下轮候选**（继承 105 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级中)** 全书 107 章 markdown 跑 `node --check` 不适用，但可对所有 .md 跑结构健康检查——例如：每个章 h1 是否唯一、每个章 h2 编号是否从"一、/1.1"开始且连续、空 h2/h3 数量、孤立 `## 二、/三、` 等乱序残留。本轮已证明 ch12/ch13/psychology-ch11/psychology-ch12 都有过编号漂移修复历史（参见 100~105 轮 commit），其他章可能仍存在。
2. **(继承 105 轮 #2, 优先级高)** yin-yang 5 章 manifest ↔ markdown 漂移（ch08/ch11/ch12/ch13/ch15 共 ≈28 处）：最小可做 1 处——给 ch12 补「本章小结」单 h2（如适用）。本轮扫了 yin-yang/ch08 看到「8.5 · · 夫妻宫与子女宫」是单一样式，无需改；但 ch08 manifest ↔ markdown 漂移可能仍存在。
3. **(继承 105 轮 #3, 优先级中)** badminton/ch05 manifest 缺 5 个 h3（每天 15 分钟 / 每周 2~3 次系统训练 / 训练顺序建议 / 三个月训练计划纲要 / 记住三条黄金法则），manifest 端 5 行 subs 补全。
4. **(继承 105 轮 #4, 优先级中)** `.gitattributes` L5 `* -text -merge -diff -lfs -lockable` 让 manifest.json / manifest_data.js 永远显示为 binary——本轮第 106 轮依然受其影响（manifest_data.js diff 显示 Binary）。可改为只屏蔽真正需要 LFS 的后缀。
5. **(继承 105 轮 #5, 优先级低)** 用户偏好中「库里没有 foam roller」与事实不符——库里实际有 5202~5213 共 12 条 foam roller / 筋膜球条目。可考虑写一份「记忆更新」让后续轮次认知对齐；不动 SMR 内容本身。
6. **(继承 105 轮 #6, 优先级低)** nutrition ch01~ch07 各 400~1000 字偏短，可挑 1 章扩写。
7. **(继承 105 轮 #7, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失，78 轮记账未走 73~77/79~97 双写惯例。
8. **(继承 105 轮 #9, 优先级低)** 根目录 `*.py` 散落 60+ 个无 `.gitignore` 兜底——本轮又新增 4 个 `_round106_*.py`。可一次性补 `_*.py` 进 .gitignore 让 `git status` 更干净。

**本轮 drift 状态**：项目全局实际 drift ≈31（不变，本轮 0 涉及 drift，纯 JS 镜像格式修复）

**记账 push**：（本轮 ledger `round106.md` 已生成，下一轮 push）
