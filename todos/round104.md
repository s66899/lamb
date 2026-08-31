# Round 104 todos（保留给下一轮的 pending 候选）

**已完成 commit**：

- `dc54843` fix(badminton-ch12): 修复 manifest.json JSON 损坏 + manifest_data.js h2[2] 标题漂移 + markdown「## 二、」伪标题（round 104 ledger 候选 #1 兑现，drift +1→0）

**本轮做了**：

- 启动时 `git status --short` 发现工作区有未提交修改：`manifest.json` (modified, 435932→439302 bytes) + 3 个 untracked 脚本 `_round104_fix_ch12_manifest.py`、`_brace_check.py`、`_brace_check2.py`
- 溯源：上轮（round 103）遗留的脚本已运行但未提交，落地后的 manifest.json 实测 `python json.loads` 在 L3869 col 17 失败 — 双重语法错误：
  1. ch12 整个 chapter 内容块比 HEAD 多缩进 2 空格（应为 8/10，脚本写成 10/12）
  2. ch12 章节收尾 `},` 后缺失下一个章节的 `{` 开括号，紧跟 `"file": ch13...` 导致解析失败
- 修复 manifest.json：对 L3621..L3867 内容块做 -2 空格 dedent、补回缺失的 `{`、保留 CRLF；`python -m json.loads` 通过
- 同步 manifest_data.js：h2[2] 标题仍为旧版「二'、基础体能训练（原版内容 — 体能概述）」，单行替换为新版长标题（含 v3.22.6 复用说明 + 历史原版并行保留说明），与 manifest.json / markdown 对齐
- 修复 markdown：ch12 L128 h2[2] 标题末尾「「## 二、...」」误带 `##` 子串（疑似编辑器自动补全残留），删除为「「二、...」」
- 校验：9 books / 97 chapters / 100% 文件存在 / ch12 manifest ↔ markdown = 11 h2s / 0 title 漂移 / 全文扫表无其它 `## X` 伪标题反例 / `node --check manifest_data.js` 通过 / `git diff --stat` 只动 3 文件 1 行实质修改
- 推送到 GitHub Pages：`33d65af..dc54843 book → book`

**本轮新发现的事实**：

- 项目根的 `.gitattributes` L5 是 `* -text -merge -diff -lfs -lockable`——这就是为什么 manifest.json / manifest_data.js 在 `git diff` 里始终显示为 binary（Bin 435932 → 438817），但实际内容是纯文本 JSON/JS。本轮用 `python` 读 raw bytes 后 strip CRLF 拿到真 diff 验证了差异是合法的 JSON 内容增改
- 上轮 `_round104_fix_ch12_manifest.py` 脚本本身写得相对完整（A/B 缩进常量定义、ch12 span 查找、替换逻辑），但缺了「收尾 `},` 缩进回归 + 缺失 `{` 开括号」这两个 corner case——提示后续纯文本 JSON patch 脚本需要一个 lint step：写完后立刻 `python -m json.tool` 或 `json.loads` 自检
- 仓库有大量 untracked `_*.py` 脚本散落根目录（`_brace_check.py`、`_round104_fix_ch12_manifest.py` 等几十个），无 `.gitignore` 兜底但历史多轮均不提交——保持现状

**下轮候选**（继承 103 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级高)** badminton/ch12 markdown L970 之后可能有「本章小结」/「本章行动清单」类节与 h2 编号乱序风险（103 轮对 ch13 已做类似处理但没复查 ch12）。可用 `grep -nE "^## |^### " books/badminton/ch12-physical-training.md | head -50` 一次性扫表，单 commit。
2. **(继承 103 轮 #2, 优先级高)** yin-yang 5 章 manifest ↔ markdown 漂移（ch08/ch11/ch12/ch13/ch15 共 ≈28 处）：最小可做 1 处——给 ch12 补「本章小结」单 h2，10 行内。
3. **(继承 103 轮 #3, 优先级中)** badminton/ch05 manifest 缺 5 个 h3（每天 15 分钟 / 每周 2~3 次系统训练 / 训练顺序建议 / 三个月训练计划纲要 / 记住三条黄金法则），manifest 端 5 行 subs 补全。
4. **(本轮新发现, 优先级中)** 项目 `.gitattributes` L5 `* -text -merge -diff -lfs -lockable` 让 manifest.json / manifest_data.js 永远显示为 binary——本轮证明实质差异是纯文本修改。可改为只屏蔽真正需要 LFS 的后缀（如 `*.psd` / `*.zip`），其它 .md/.js/.html/.json 走默认 text，让未来 PR review 能直接看到 diff。
5. **(继承 103 轮 #5, 优先级中)** 用户偏好中「库里没有 foam roller」与事实不符——库里实际有 5202~5213 共 12 条 foam roller / 筋膜球条目。可考虑写一份「记忆更新」让后续轮次认知对齐；不动 SMR 内容本身。
6. **(继承 103 轮 #6, 优先级低)** nutrition ch01~ch07 各 400~1000 字偏短，可挑 1 章扩写。
7. **(继承 103 轮 #7, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失，78 轮记账未走 73~77/79~97 双写惯例。
8. **(继承 103 轮 #8, 优先级低)** manifest_data.js 第 4716 行 `{` 是 24 空格（同级用 12 空格），孤例 over-indent。
9. **(本轮新发现, 优先级低)** 根目录 `*.py` 散落 50+ 个无 `.gitignore` 兜底——可一次性补 `_*.py` 进 .gitignore 让 `git status` 更干净。

**本轮 commit hash**：`dc54843`

**本轮 push**：✅ 第 1 次成功（`33d65af..dc54843` book → book；GitHub Pages 自动部署中）

**本轮 drift 状态**：ch12 drift 1→0（manifest 与 markdown h2[2] 标题 + 缩进双对齐）；项目全局实际 drift 从 ≈32 → ≈31（修复了 ch12 单点）

**记账 push**：（本轮 ledger `round104.md` 已生成，下一轮 push）
