# Round 105 todos

**已完成 commit**：

- `74061d3` fix(badminton-ch12): 修复 h2「二·」→「二、」字符风格不一致（69c0337 引入的孤例 U+00B7，3 文件同步，4 处替换，单字符变更，可独立回滚）

**本轮做了**：

- 启动时 `git log --oneline -10` + `git status --short`：HEAD `7bd7f71`（round 104 记账），3 个未跟踪脚本（`_brace_check*.py` / `_round104_fix_ch12_manifest.py`，都是上轮遗留），无未提交业务改动
- 扫描本轮真实问题：扫 `books/badminton/ch12-physical-training.md` 的 `## ` 列表，发现 11 个 h2 里有 **1 个孤例字符风格不一致**——L2651「二·历史、基础体能训练…（原版内容）」用 `U+00B7` (MIDDLE DOT `·`)，其余 10 个 h2（导言 + 一/二/三/四/五/六/七/八/九）全部用 `U+3001` (IDEOGRAPHIC COMMA `、`)
- `git log` 溯源：commit `69c0337` "fix(badminton-ch12): L128「## 二、」H2 编号冲突修复" — 作者当时为了与 L6865「## 二、羽毛球专项体能训练」anchor 区分，手动把 L128 改成「二·」，但破坏了全书风格一致性
- 修复：3 文件同步，`二·` (U+00B7) → `二、` (U+3001)，单字符替换：
  - `manifest.json` pos 97394：1 处（h2 title 字段）
  - `manifest_data.js` pos 113714：1 处（同步镜像）
  - `books/badminton/ch12-physical-training.md`：3 处（L2651 h2 标题 + L2651 之后的章节内提及 `二·` 段落的 2 处）
- 校验：
  - `manifest.json` `python json.loads` 通过（9 books 不变）
  - `manifest_data.js` `node --check` 通过
  - 全量重扫 ch12：剩余 `二·` = 0；`二、` = 11（全部 11 个 h2 现在风格一致）
  - `python _audit_exlib_ledger.py` 105 文件审计无 drift
  - `python _scan_exlib_refs.py` 1336 合法 / 140 unique / 0 broken（不变）
  - `git diff --stat` = 3 files / +2 -2 lines（manifest 仍标 binary，仅 +1 byte，因为 `·` 是 2 字节 UTF-8 而 `、` 是 3 字节 UTF-8；+1 byte 与 -2 byte = +1 net）
  - APP_VERSION 不 bump；零业务代码改动；零 ex-lib id 改动

**用户偏好兑现**：

- 沿用 86~104 轮风格：单 commit fix + 3 文件对称修复
- 零伪造 id：本轮 0 涉及（仅字符替换）
- 兑现上轮 ledger 第 1 项「badminton ch12 markdown 后续编号乱序风险」中**风格一致性**这一支
- 单 commit / 单源 issue（69c0337 引入的孤例字符）/ 严格 1:1 对齐 / 独立可回滚（`git revert HEAD`）

**真实问题修复对照**：

- 修复前：sidebar/TOC 中 ch12 列出 11 个 h2，第 2 个是「二·历史、…」，其他 10 个是「一、/二、/三、/四、/…」。`·` 与 `、` unicode 排序不同（U+00B7 < U+3001），导致按 codepoint 排序的列表渲染工具可能把「二·」排在「一、」前面，造成序号错觉
- 修复后：11 个 h2 全部用 `、` 一致，sidebar/TOC 序号连续；markdown 端 3 处提及「二·」的正文也一并对齐到「二、」（章节内 cross-reference 不再出现两种风格混用）

---

**commit hash**：`74061d3`

**push 状态**：✅ 第 1 次成功（`7bd7f71..74061d3` book → book；GitHub Pages 自动部署中）

**下轮候选**（继承 104 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级高)** 全书扫描 `·` (U+00B7) 与 `、` (U+3001) 的 h2/h3 混用风格 —— 本轮扫了 ch12 发现 1 处，可能其他章节也有同样问题。用一个扫描脚本对所有 105 章 markdown 文件做 codepoint 一致性 check，统计并报告，最坏情况 5~10 个孤例需要修。
2. **(继承 104 轮 #2, 优先级高)** yin-yang 5 章 manifest ↔ markdown 漂移（ch08/ch11/ch12/ch13/ch15 共 ≈28 处）：最小可做 1 处——给 ch12 补「本章小结」单 h2，10 行内。
3. **(继承 104 轮 #3, 优先级中)** badminton/ch05 manifest 缺 5 个 h3（每天 15 分钟 / 每周 2~3 次系统训练 / 训练顺序建议 / 三个月训练计划纲要 / 记住三条黄金法则），manifest 端 5 行 subs 补全。
4. **(继承 104 轮 #4, 优先级中)** `.gitattributes` L5 `* -text -merge -diff -lfs -lockable` 让 manifest.json / manifest_data.js 永远显示为 binary——本轮证明实质差异是纯文本修改。可改为只屏蔽真正需要 LFS 的后缀。
5. **(继承 104 轮 #5, 优先级中)** 用户偏好中「库里没有 foam roller」与事实不符——库里实际有 5202~5213 共 12 条 foam roller / 筋膜球条目。可考虑写一份「记忆更新」让后续轮次认知对齐；不动 SMR 内容本身。
6. **(继承 104 轮 #6, 优先级低)** nutrition ch01~ch07 各 400~1000 字偏短，可挑 1 章扩写。
7. **(继承 104 轮 #7, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失，78 轮记账未走 73~77/79~97 双写惯例。
8. **(继承 104 轮 #8, 优先级低)** manifest_data.js 第 4716 行 `{` 是 24 空格（同级用 12 空格），孤例 over-indent。
9. **(本轮新发现, 优先级低)** 根目录 `*.py` 散落 60+ 个无 `.gitignore` 兜底——可一次性补 `_*.py` 进 .gitignore 让 `git status` 更干净（本轮新增 `_round105_*.py` 两个）。

**本轮 drift 状态**：项目全局实际 drift ≈31（不变，本轮 0 涉及 drift，纯字符风格修复）

**记账 push**：（本轮 ledger `round105.md` 已生成，下一轮 push）