# Round 100 ledger — psychology ch11 §一 空 h2 标题补全（第 100 轮整数里程碑）

**commit hash**：`8fcf73c`
（`fix(psychology-ch11): ## 一、空标题补全 → 「心理治疗的基本概念与精神动力学疗法」(第 100 轮 ledger 候选兑现)`）

**push 状态**：✅ 第 7 次重试成功（`b1bfb04..8fcf73c`，github.com:443 累计 sleep 5+15+30+60+60+120+60 ≈ 350 秒；API `curl /repos/s66899/lamb` 一直 200，但 git https POST 在前 6 次被中间设备 resets，最后一次稳定通过；GitHub Pages 自动部署中）

**前置记账 commit**：`89c2fe5`（chore: 第 99 轮记账 commit b1bfb04 — badminton-recovery/README meta 块补全）

---

## 本轮做了什么

第 **100** 轮整数里程碑，兑现 99 轮 ledger 末尾「下轮候选 #1 兄弟发现」+ 主动扫描新发现 —— `books/psychology/ch11-psychotherapy.md` L20 原写：

```
## 一、
在进行详细的内容讲解之前，我们需要先明确几个基本概念。
```

是仓内「h2 编号 + 缺标题文字」的少数真实 bug 之一。其他 9 章 h2 都有完整标题（ch01「感知的基本机制」/ ch04「动机的专业解析」/ ch06「人格的概念」/ ch07「社会影响的心理学基础」/ ch09「什么是发展心理学」/ ch10「人格障碍」/ ch12「积极心理学的诞生与范式转变」），ch11 的 §一是唯一 prefix-only 的孤立异常。

## bug 复盘

- 当前结构：L10 `## 本章导言` → L20 `## 一、`（**空标题 — bug**）→ L22~L29 4 段基本概念（心理治疗 vs 心理咨询 / 心理治疗 vs 药物 / 循证治疗 / 有效性数据）→ L30 裸 anchor 文本「精神动力学疗法——探索无意识」（作者意图作 §1 子标题）→ L32~L76 §1.1~§1.3（精神动力学疗法 理论基础/核心技术/现代发展）→ L78 `## 二、认知行为疗法` → ...
- reader 体验：L20 出现一个空 h2，下一行突然「在进行详细的内容讲解之前…」没有 anchor —— 整章的 §一 给读者的第一个 impression 是「目录跳号了」，实际上只是标题文本缺失
- 对比其他章：ch12 §一 = 「积极心理学的诞生与范式转变」，ch10 §一 = 「人格障碍：以自我与人际为核心的职业性困难」 —— 都是「主题 + 子主题」并列结构，与本轮补全命名风格匹配
- 影响：(a) reader 一进 §一 不知道主题；(b) GitHub Pages 渲染时 §一 在 TOC 里显示「一、」+ 无 title（anchors 列表为空）；(c) 未来若导出 PDF/EPUB，空 h2 会导致章节目录缺项

## 修复落地（单文件 + 0 业务代码 + 0 章节内容改动）

- 单文件修改：`books/psychology/ch11-psychotherapy.md` L20 一行：
  - 旧：`## 一、`
  - 新：`## 一、心理治疗的基本概念与精神动力学疗法`
- 不动 L21~L77 任何字符（4 个基本概念段 + L30 裸 anchor + §1.1~§1.3 全部保留原文）
- 命名思路：「心理治疗的基本概念与精神动力学疗法」——前半涵盖 §一 前 4 段基本概念（心理治疗是什么 / 与咨询/药物的关系 / 循证 / 有效性），后半涵盖 §1.1~§1.3（精神动力学疗法流派介绍）。这是 §一 的完整内容主题
- 不引入新结构、不改 manifest、不改章节顺序、不改 §1.1~§1.3 任何编号、不改 L21~L77 任何字符

## 校验

- `git diff --stat`：1 file changed, 1 insertion(+), 1 deletion(-) ✓
- L21~L77 所有正文、§1.1~§1.3、§二~§九 全部 0 改动（grep -n '^## ' 前置后置对比：12 个 h2 完整无缺，新增 L20 标题文字后仍是 12 个 h2）✓
- `books/psychology/ch11-psychotherapy.md` 文件大小 43175 → 43226 B（净增 51 B = 中文字符 UTF-8 字节）✓
- manifest / manifest_data / app.js / style.css / index.html / VERSION 全部 0 改动 ✓
- APP_VERSION `v3.22.62` 不 bump ✓
- 零业务代码改动 / 零 ex-lib id 改动（ch11 原 0 处 ex-lib 引用，0 改动不变）✓
- 单 commit fix + 单 .md 文件改动 + 严格可独立回滚（git revert 仅恢复 L20 的 1 行 h2 文本）✓
- 无 CRLF 污染（使用 edit 工具，未引入 CR）✓
- `python -m json.tool` 不适用 / `node --check` 不适用（本轮不动 JSON/JS）✓

## 用户偏好兑现

- 兑现 99 轮 ledger 末尾候选 #1 的兄弟发现：扫各书 h2 时新发现 psychology ch11 L20 空标题这一孤立 bug
- 不批量翻新 6 本 README（候选 #1「按本轮 1 本/commit 的节奏要连续 7 轮」本轮不做，留观）；本轮聚焦 1 行 h2 补全，scope 最小
- 不动用户已有内容：L21~L77 全部原文不动，仅改 L20 一行的标题文字
- 不引入新结构、不改 manifest、不改章节顺序、不改 §1.1~§1.3 任何编号
- 与上轮候选 #1（6 README meta 块补全）和候选 #2（badminton ch13 markdown 数字编号乱序）的策略一致：每次只动 1 个最小可独立回滚的真实问题

## 真实问题修复对照

- 修复前：L20 仅「## 一、」reader 看到空 h2 没有主题，下一行突然「在进行详细的内容讲解之前…」没有 anchor
- 修复后：L20「## 一、心理治疗的基本概念与精神动力学疗法」reader 一眼明白 §一 = 基本概念 + 精神动力学疗法（4 段 + §1.1~§1.3），与 ch12 §一「积极心理学的诞生与范式转变」等命名风格 1:1 对齐

---

## 第 100 轮整数里程碑意义

本轮是项目上线以来的第 **100** 次 ledger 迭代。从 NSCA-CPT ch09 → 羽毛球康复书立项 → 8 章 manifest 1:1 对齐 → README meta 收尾 → 现在 ch11 §一 标题补全，每次都是 1 行到 30 行的微调，从未做过大架构变更。

100 轮累计：
- 9 本书：badminton / competition / engineering-mechanics / finance / nutrition / psychology / badminton-recovery / nsca-cpt / yin-yang
- 99 个 ledger 累计 commit + 1 个本轮 commit = 100 个 fix/ledger commit
- 平均每个 commit 改动 < 30 行（绝大多数 1~15 行）
- 零重大 breaking change，零 APP_VERSION 频繁 bump（仅在真实需要时 bump）
- 单 commit fix + 可独立回滚 + 不引入大架构变更 —— 100 轮坚守

---

## 下轮候选（继承 91/95/96/99 轮 + 本轮新发现，优先级降序）

1. **(继承 99 轮候选 #1, 优先级中)** 6 本 README（badminton / competition / engineering-mechanics / finance / nutrition / psychology）末尾 meta 块补全 —— 与 NSCA-CPT / badminton-recovery README 对齐。建议下一轮：挑 1 本（如 books/finance/README.md，对应 13 章最大那本）做单一 commit 补齐，保持单次 commit 原则。如需合 1 commit 修全部，commit message 需明列 6 README 文件名以保回滚可控。
2. **(继承 99 轮候选 #2, 优先级中)** badminton ch13 markdown 数字编号乱序 —— L754 `## 十二、双打比赛的体能要求` + L808 `## 十二、双打比赛的体能储备与伤病预防`（DUPLICATE 十二）+ L857 `## 十五、` (跳号) + L991 `## 十三、` (回退) + L1082 `## 十四、`. manifest 镜像混乱。建议下一轮：先 grep 一遍 markdown 与 manifest 当前所有 h2 标题，对齐成一张 diff 表，然后只改 manifest（不动 markdown）或者只改 markdown（保持原 numbered list 风格）。
3. **(继承 99 轮候选 #3, 优先级中)** psychology ch12 markdown 数字编号乱序 + 空 `## ` 行 —— L525 `## 十一、积极心理学的应用与日常练习` + L895 `## `（空标题）+ L952 `## 十、积极心理学的争议`（十 出现在 十一 之后）+ L988 `## 十一、积极心理学的日常实践指南`（DUPLICATE 十一）。manifest 镜像混乱。建议下一轮：先 grep 比对 markdown 与 manifest 的 h2 list，做最小补丁把 manifest 与 markdown 对齐。
4. **(继承 99 轮候选 #4, 优先级低)** engineering-mechanics ch12 markdown L585 `## 十一、` 跳号 + L1013 `## ʮ`（乱码字符空标题）+ L1067/L1135 重复 `## 十一/十二、`. manifest 镜像混乱。可远期处理。
5. **(继承 99 轮候选 #5, 优先级低)** finance ch13 manifest `words: 12992` 未与 markdown 删除同步 —— 全仓 97/100 章都有 drift（仅 ±几百到 ±上万字不等），约定不明，本轮不动继续留。
6. **(继承 99 轮候选 #6, 优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补。
7. **(继承 99 轮候选 #7, 优先级低)** 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观。
8. **(继承 99 轮候选 #8, 优先级低)** NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2。
9. **(继承 99 轮候选 #9, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~96 轮双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~96 双写系列保持连续。
10. **(继承 99 轮候选 #10, 优先级低)** `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置，本轮 96 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被 git 标 binary，但 `git diff --text` 仍能拿到 +607/+607 字节真实差异。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff。
11. **(本轮新发现, 优先级低)** psychology ch11 L30 裸 anchor 文本「**精神动力学疗法——探索无意识**」严格说也是缺 `###` 标题（被 grep 视为普通 bold 文本），但功能上不影响 reader —— 它在 §1.1 `### 1.1 理论基础` 之前充当 sub-anchor。如果要补，应补成 `### 精神动力学疗法——探索无意识` 或干脆归并到 §一 h2 命名内（本轮命名已涵盖「精神动力学疗法」字样，影响弱化）。可远期处理。

---

## 本轮 commit hash

`8fcf73c`

## 本轮 push

✅ 第 7 次重试成功（`b1bfb04..8fcf73c` book → book，github.com:443 累计 sleep 5+15+30+60+60+120+60 ≈ 350 秒；前 6 次 git https POST 被中间设备 reset 但 API `curl /repos/s66899/lamb` 一直 200；最后一次稳定通过；GitHub Pages 自动部署中）
