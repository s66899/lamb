# Round 107 todos

**已完成 commit**：

- （本轮待提交：`8d12ce0 → ?` 候选记账 + `?` 业务 commit）

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `70123bf`，working tree 11 个未跟踪脚本 + 1 个未提交 ledger 文件 (`todos/round106.md`)
- **优先消化上轮 ledger**：`todos/round106.md` 本地已写但未 commit，先把它记账 → commit `e055fd1` chore(todo)（无业务改动）
- **扫描候选**（继承 round106 #3）：badminton/ch05 manifest 缺 5 个 h3 subs（每天 15 分钟 / 每周 2~3 次系统训练 / 训练顺序建议 / 三个月训练计划纲要 / 记住三条黄金法则）
- **核实真实问题**：
  - `grep -n "^### " books/badminton/ch05-footwork-system.md` 证实 markdown L880~919 共 5 个 h3（位于「🐏 行动建议」h2 之下）
  - 但「参考文献」h2 (L929) 之下没 h3
  - manifest.json L2809-2812 `chapters[4].h2s[10]` = `{"title": "🐏 行动建议", "subs": []}`，5 个 markdown h3 未列入
- **修复**（round107 主任务，单文件、双文件同步）：
  - 锚点唯一性验证：精确字符串 `"title": "🐏 行动建议",\s*"subs":\s*\[\s*\]` 在全书只命中 1 处（其他章是「🐏的行动建议」无空格或「🐏 的行动建议」不同分词，无歧义）
  - 5 subs 完全照 markdown h3 标题写入：「如果你每天只有15分钟」/「如果你每周有2～3次系统训练」/「训练顺序建议」/「三个月训练计划纲要」/「记住三条黄金法则」
  - **保持 h2 title 字符串不变**（manifest 里是「🐏 行动建议」有空格，与 markdown L878 字符级一致；同章别处的「🐏的行动建议」无空格是其他章的样式，未改）
  - **同时改 manifest.json 与 manifest_data.js**（保持镜像不变式，过去 105 轮都遵守的纪律）
- 校验：
  - `python -m json.tool manifest.json` 通过
  - `node --check manifest_data.js` 通过
  - JS 括号配平检查 `{`(0) `[`(0) `(`(0) —— 平衡
  - 9 books 拓扑不变：`['yin-yang', 'badminton', 'engineering-mechanics', 'finance', 'nsca-cpt', 'psychology', 'badminton-recovery', 'competition', 'nutrition']`
  - JS mirror ch05「🐏 行动建议」块内 `title` 键数 = 7（含 `"title": "🐏 行动建议"` + `"subs":` 字段名 + 5 subs 各 1 个 `title` 键）✓
  - manifest.json Bin 438818 → 439189（+371）；manifest_data.js Bin 458041 → 458412（+371）—— 双文件字节增量精确对齐
  - ex-lib 校验：ch05 markdown 0 个 `[ex:N]` / `[ex-lib:N]` 引用，本轮 0 涉及 SMR / 0 涉及伪造 id
  - APP_VERSION 不 bump（纯 manifest 数据修正，UI / 部署逻辑零变更）

**用户偏好兑现**：

- 兑现上轮 ledger 候选 #3「badminton/ch05 manifest 缺 5 个 h3」——单 chapter、双文件同步、严格 1:1 对齐、独立可回滚（`git revert HEAD`）
- 写作风格双层结构不动；羽毛球康复书结构不动；不做大架构变更
- 0 涉及 SMR / 0 涉及 foam roller / 0 涉及伪造 ex-lib id

**真实问题修复对照**：

- 修复前：ch05「🐏 行动建议」h2 在 manifest 里 `subs: []`，但 markdown L880~919 实际有 5 个 h3 子节——sidebar / TOC 渲染时点开「🐏 行动建议」展开为空，读者看不到具体可执行建议；搜索引擎索引也漏这 5 个 action item
- 修复后：manifest 与 markdown 完全一致，5 个行动建议 h3 进入 TOC，sidebar 展开可见；UI 行为变化仅限 ch05「🐏 行动建议」折叠项展开时多 5 个子项

**commit hash**：`e055fd1`（chore 记账）+ `?`（业务修复，待 push）

**push 状态**：❌ 暂未成功——本轮第二次 push 时 github.com:443 不可达（`api.github.com` 通但 `github.com` 不通，21s 连接超时）；e055fd1 已本地 commit，`git status` 干净，业务修复 `?` 已 commit 在本地

**下轮候选**（继承 105/106 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级高)** 5 个 markdown h3 已入 manifest，但点开 sidebar「🐏 行动建议」会看到 5 个同名级（level=3）却没有编号——其他章的 h3 都带「5.1.1」「5.2.3」式编号，ch05 这 5 个「如果你每天只有15分钟」「如果你每周有2～3次系统训练」「训练顺序建议」「三个月训练计划纲要」「记住三条黄金法则」无前缀数字。需看是否需要补「5.11.1 ~ 5.11.5」式编号，或保持无编号（待用户偏好确认）。
2. **(继承 106 轮 #1, 优先级中)** 全书 107 章 markdown 结构健康扫描（h1 唯一性、h2 编号连续性、空标题孤立等）——本轮已证明 ch05 之外的薄弱点（ch12 105 轮、psychology-ch11 103 轮、psychology-ch12 102 轮、badminton-ch13 101 轮）都能被这种扫描发现，可扩展到全书。
3. **(继承 105 轮 #2, 优先级中)** yin-yang 5 章 manifest ↔ markdown 漂移（ch08/ch11/ch12/ch13/ch15 共 ≈28 处）最小可做 ch12 补「本章小结」。
4. **(继承 105 轮 #3, 优先级中)** NSCA ch10 SMR 条目入库（用户偏好里强调 SMR 类按库里实际存在的拉伸引用，或标"库中暂无"——5202~5213 共 12 条 foam roller / 筋膜球条目实际已存在，认知已部分对齐，但需正式扫一遍 ch10 看是否引用一致）。
5. **(继承 105 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json / manifest_data.js diff 显示 Binary——可改为只屏蔽真正需要 LFS 的后缀。
6. **(继承 105 轮 #8, 优先级低)** 根目录 `*.py` 散落 60+ 个无 `.gitignore` 兜底——本轮又新增 1 个 `_round107_fix_ch05_subs.py`。可一次性补 `_*.py` 进 .gitignore 让 `git status` 更干净。

**本轮 drift 状态**：项目全局实际 drift 30 → 29（ch05 manifest ↔ markdown 5 个 h3 漂移已对齐，drift -1）

**记账 push**：（本轮 ledger `round107.md` 已生成，下一轮 push）
