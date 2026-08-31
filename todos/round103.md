# Round 103 todos（保留给下一轮的 pending 候选）

**已完成 commit**：

- `6a6ff2b` fix(psychology-ch11): manifest §一孤立空标题补全（本轮主 commit，drift +1→0）
- （本轮记账 commit 占位，下一轮生成）

**本轮做了**：

- 跑完整 9 本书的 markdown ↔ manifest 1:1 扫描，发现 102 轮 ledger「drift 7→6」遗留的 psychology/ch11 §一 在 manifest 端残留空标题 `一、`
- 这是 100 轮 commit `8fcf73c` 的尾巴：100 轮只修了 markdown 端 L20，没动 manifest，留下 manifest 端 `一、` 孤立
- 修复：manifest.json L11599 + manifest_data.js L12275 `一、` → `一、心理治疗的基本概念与精神动力学疗法`
- psychology/ch11 全章 h2 现在 markdown ↔ manifest 严格 1:1 对齐（drift=0）
- 副产品：本轮全量扫描发现项目总 drift 还有 ≈33 处（ledger 报的「6 处」只覆盖前几轮可见范围，未扫 yin-yang 5 章与 badminton/ch12），所以后续可做的真实问题清单比 102 轮 ledger 写的更丰富

**本轮新发现的事实**：

- 用户偏好里写的「库里**没有 foam roller / 筋膜球专项条目**」是**过期认知**——库里实际有 5202~5213 全部 12 条 foam roller / 筋膜球专项 id（已验证：5202=foam roller quadriceps，5203=foam roller hamstrings，…，5210=lacrosse ball forearm extensors，5211=lacrosse ball plantar fascia，…，5213=foam roller adductors）。NSCA-CPT ch10 §2.1 SMR 引用表的 12 条 `[ex:5202~5213]` 是**正确合法**的引用。
- 这个事实发现意味着：此前几轮 ledger 里把「NSCA ch10 SMR 补 id」列为候选时没用，是因为当时认错了库状态。本轮没动 SMR 段（保留下次做），但要更新这个认知。
- 本轮没有擅自改写用户偏好——把事实摆出来留给下轮决定。

**下轮候选**（继承 102 轮 + 本轮新发现，优先级降序）：

1. **(本轮新发现, 优先级高)** badminton/ch12 markdown ↔ manifest 严重漂移 4 处：
   - markdown L<查> `## 二·历史、基础体能训练（原版内容 — 体能概述；v3.22.6 起被同号「## 二、羽毛球专项体能训练（ex-lib 动作版）」复用，本节作...)`（这是个超长行，前面有内容被截断）
   - `## 二、羽毛球专项体能训练（ex-lib 动作版）` (Duplicate 二)
   - `## 八、训练日志模板 + NSCA-CPT 互引表`
   - `## 九、损伤康复的羽毛球专项落地（联动 NSCA-CPT ch09）`
   - manifest 缺这 4 个 h2（manifest 后段截断 + 原版/新版编号错位）。建议下一轮：先 grep diff 表确认 markdown 是不是真有「九、损伤康复」章节，还是被旧版本带过来的乱章，再决定动 md 还是动 mn。单 commit。
2. **(本轮新发现, 优先级中)** yin-yang 5 章 manifest ↔ markdown 漂移（总 28 处）：
   - ch08 L<查>「手掌区域ASCII示意」manifest 有 md 无
   - ch11 缺 11.6~11.10 五节 + 「本章小结（扩展）」
   - ch12 缺 12.7~12.11 + 「本章小结」
   - ch13 缺 13.6~13.11
   - ch15 缺 15.7~15.15 + 「全书结语」（manifest 端也有一个孤儿「全书结语」）
   - 99 轮完成 1 章 + 99 轮 ledger 已记，但 5 章还没完全推动。下一轮可挑 1 章最小修复（建议先 ch11~ch15 中号数小的那一两个独立节，例如补 ch12 的「本章小结」单行 manifest）。
3. **(本轮新发现, 优先级中)** badminton/ch05 manifest 缺 5 个 h3：
   - markdown 有「如果你每天只有15分钟」「如果你每周有2～3次系统训练」「训练顺序建议」「三个月训练计划纲要」「记住三条黄金法则」
   - manifest 缺这 5 个 h3。最小修复：manifest 端 5 行 subs 补全，单 commit。
4. **(继承 102 轮, 优先级低)** psychology ch12 §八 之后编号乱序（11→9→10→11）+ 「十一」重复两次，102 轮只补空 h2，未整编号顺序。可远期。
5. **(本轮新发现, 优先级低)** 用户偏好「库里没有 foam roller」与事实不符——库里有 5202~5213 共 12 条 foam roller / 筋膜球条目。如果要做 NSCA-CPT ch10 §2.1 SMR 引用表的进一步扩充（如加 [ex:5212] 胸椎 [ex:5213] 内收肌到「训练后 24 小时必做动作」表里），都是合法引用，不再受「库里没有 foam roller」误认限制。
6. **(继承 102 轮, 优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架），可远期挑 1 章扩写。
7. **(继承 102 轮, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失——78 轮记账写在 `_session_todo.md` 末尾但未生成 73~77/79~97 轮双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~97 双写系列保持连续。
8. **(继承 102 轮, 优先级低)** `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置——本轮 `git diff` 显示 manifest 文件被 git 标 binary，但 `git diff --text` 仍能拿到 +51 字节真实差异。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md/.js/.html/.json 走默认 text 改善协作 diff。
9. **(本轮新发现, 优先级低)** manifest_data.js 第 4716 行 `{` 是 24 空格（其他同级用 12 空格），孤例 over-indent。本轮已留意但未触碰（避免无关清理）。可远期一次性整理所有 manifest_data.js 缩进怪异点。

**本轮 commit hash**：`6a6ff2b`

**本轮 push**：✅ 第 1 次成功（`3bc3f0c..6a6ff2b` book → book；GitHub Pages 自动部署中）

**本轮 drift 状态**：33 → 32（psychology/ch11 drift 1→0；项目全局实际 drift 从 ≈33 → ≈32，因为 ledger「drift 6」和本轮全量扫描「drift 33」是不同口径，92~102 轮可见范围只算若干本书若干章，未覆盖 yin-yang 5 章与 badminton/ch05/ch12）

**记账 push**：（下一轮生成）
