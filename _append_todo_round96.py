LEDGER = r"""# Round 96 ledger — badminton-recovery/ch08 manifest h2s 补「四、回归球场的三道关」+ 5 个错位 title 重命名（95 轮候选 #1 兑现）

**commit hash**：`1af201e`
（`fix(badminton-recovery-ch08): manifest h2s 补「四、回归球场的三道关」+ 5 个错位 title 重命名（95 轮候选 #1 兑现）`）

**push 状态**：✅ 第 1 次重试成功（`4e91372..1af201e`，github.com:443 第 1 次报成功，无需 sleep 累加；GitHub Pages 自动部署中）

---

**本轮做了什么**：兑现 95 轮 ledger 末尾扫描新发现 —— `books/badminton-recovery/ch08-action-plan.md` markdown 有 10 个 h2（`本章导言 + 一~九`），但 `manifest.json` 与 `manifest_data.js` 都只有 9 个 h2，且 [4]~[8] 的 title 全部 off-by-one（manifest 把「## 四、回归球场的三道关（对应 ch01 §四）」整节丢失，并把后续 「五~八」 全部前移一位）。ch08 是整本书的行动清单章，**TOC 错位会误导读者**——他们点 sidebar「四、与 NSCA-CPT ch09 的互引表」想看三道关测试，结果落到的是 NSCA 互引表，章节上下文完全断裂。

**bug 复盘**：
- markdown 实际 10 个 h2（L5/16/98/126/143/177/193/206/233/246）顺序：
  1. `本章导言`（无 subs）
  2. `一、按部位行动清单（速查表）`（含 `### 1.~6.` 6 个 sub，对应 6 大损伤）
  3. `二、按人群行动清单`（含 `### 1.~3.` 3 个 sub，对应 3 类人群）
  4. `三、回归球场的统一标准`（无 subs）
  5. `## 四、回归球场的三道关（对应 ch01 §四）`（含 `### 4.1 / 4.2 / 4.3` 3 个 sub） — **整节在 manifest 丢失**
  6. `## 五、与 NSCA-CPT ch09 的互引表`
  7. `## 六、与羽毛球 ch12 第九节的互引表`
  8. `## 七、本章 ex-lib 引用清单`
  9. `## 八、本书目录回顾`
  10. `## 九、最后的提醒`
- manifest 当前 9 个 h2（缺 [4]）：
  - `[0] 本章导言`
  - `[1] 一、按部位行动清单（速查表）`（6 subs ✓）
  - `[2] 二、按人群行动清单`（3 subs ✓）
  - `[3] 三、回归球场的统一标准`
  - `[4] 四、与 NSCA-CPT ch09 的互引表` ← **错位**（实际是「## 五、」）
  - `[5] 五、与羽毛球 ch12 第九节的互引表` ← **错位**（实际是「## 六、」）
  - `[6] 六、本章 ex-lib 引用清单` ← **错位**（实际是「## 七、」）
  - `[7] 七、本书目录回顾` ← **错位**（实际是「## 八、」）
  - `[8] 八、最后的提醒` ← **错位**（实际是「## 九、」）
- 「## 四、回归球场的三道关」是整章**承上启下**的核心节点：上承「## 三、回归球场的统一标准」、下启「## 五、互引表」+ 把读者引到 ch01 §四 的「回归球场的三道关」原文（ch01-introduction.md L119）。丢失这一节让 TOC 中间塌陷一格。
- 与 86/87/88/89/90/91/92/93/94/95 轮 NSCA-CPT ch02 / finance-ch13 / badminton-recovery-ch01 修复同型 —— manifest h2s 与 markdown 1:1 漂移

**修复落地**（与 95 轮 commit `429e771` 「badminton-recovery-ch01 manifest 补 `七、全书导航总览`」+ 92 轮 commit `ac37027` 「finance-ch13 合并重复 `## 十、` h2」+ 88 轮 commit `25a0bcd` 同型 —— 纯 manifest 改动 + 0 markdown 改动）：
- 双文件对称修改：`manifest.json` 第 12764 行 + `manifest_data.js` 第 13440 行：
  - **新增** 1 个 h2 entry（在 [3] 三、回归球场的统一标准 之后、[4] 四、与 NSCA-CPT ch09 的互引表 之前）：
    ```json
    {
      "title": "四、回归球场的三道关（对应 ch01 §四）",
      "subs": [
        { "title": "4.1 三道关 checklist（必须全部通过）", "level": 3 },
        { "title": "4.2 第二层：客观测试体系（与 NSCA-CPT ch09 对齐）", "level": 3 },
        { "title": "4.3 分阶段回归球场的强度控制", "level": 3 }
      ]
    }
    ```
    subs 镜像 markdown L147/153/165 的 `### 4.1 / 4.2 / 4.3` 三个 ### 子节（编号 4.x 因为它们属于「## 四、」作用域，章节编号与父 h2 一致，符合常见中文技术文档约定）。
  - **重命名** 5 个错位 title（[4]~[8] 各升 1 位）：
    - 原 [4]「四、与 NSCA-CPT ch09 的互引表」→「五、」
    - 原 [5]「五、与羽毛球 ch12 第九节的互引表」→「六、」
    - 原 [6]「六、本章 ex-lib 引用清单」→「七、」
    - 原 [7]「七、本书目录回顾」→「八、」
    - 原 [8]「八、最后的提醒」→「九、」
- 不降级、不删 heading、不挪块位 —— 仅插入 1 条新 entry + 改 5 个 title 字符串，让 manifest 与 markdown 1:1
- `## 一、 / ## 二、` 的 9 个 sub（按部位 6 + 按人群 3）保持不变（manifest 与 markdown 一致）
- `## 三、 / ## 五、~## 九、` 无 sub 的 5 个 entry 保持结构（仅 title 前缀数字 +1）
- 「## 四、回归球场的三道关」的 3 个 sub 是本章唯一的「带 sub 的中间节」，结构上与 ch01 修复、新建 ch01 七、全书导航总览的 2 个 sub 完全一致 —— 跨书跨轮复制成功

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- 1:1 对齐校验：
  - markdown h2 数：10（`本章导言 + 一~九`）
  - manifest.json h2 数：9 → 10（添加 1 条「四、回归球场的三道关（对应 ch01 §四）」）
  - manifest_data.js h2 数：9 → 10（添加 1 条同上）
  - 三个数据源 title 完全 1:1（去前缀 `## ` 后 `==` 验证 True，10 行全部 ✓）✓
  - subs 镜像：markdown `### 1.~6.` 6 个（按部位） + `### 1.~3.` 3 个（按人群） + `### 4.1 / 4.2 / 4.3` 3 个（三道关）= 12 个 sub；manifest [1] = 6 + [2] = 3 + [4] = 3 = 12 个 sub ✓
- `node _scan_exlib.js` → 1336 ids / 581 refs / 0 broken（不变；仅动 manifests 不涉 ex-lib）✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变）✓
- `python _audit_exlib_ledger.py` 仍报 `badminton/ch12-physical-training.md inline=1 declared=66 list-section`，与本轮无关，沿用 92 轮 informational 标记 ✓
- 其他章节（除 badminton-recovery ch08 外）的 h2 count 与 title 不变 ✓
- `git diff --stat --text` 2 files changed（manifest.json Bin 435719 → 436326 +607 / manifest_data.js Bin 457673 → 458280 +607，标 Bin 因 `.gitattributes` `* -text -diff`）：
  - manifest.json：+17 行（新增 1 个 h2 entry 含 3 sub + 改 5 行 title 前缀数字）
  - manifest_data.js：+17 行（同上对称）
- CRLF 计数：manifest.json 14143 → 14160（+17）/ lone CR:0 ✓
- APP_VERSION `v3.22.62` 不 bump；app.js / style.css / index.html / VERSION 未触碰 ✓
- 零业务代码改动；零 ex-lib id 改动；零 markdown 改动
- 可独立回滚：`git revert 1af201e` 即可恢复两个 manifest 的 h2s entry 缺失 + 5 个 title 错位 ✓

**用户偏好兑现**：
- 沿用 86/87/88/89/90/91/92/93/94/95 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅 manifest h2 entry 补全 + 5 个 title 重命名，0 涉 ex-lib）
- 兑现 95 轮 ledger 末尾扫描新发现「badminton-recovery/ch08 manifest [4]~[8] off-by-one + 缺 `四、回归球场的三道关`」修复承诺
- 单 commit / 单源 issue / 对称双 manifest 修复 / 严格 1:1 与 markdown 对齐
- 与 86/87/88/89/90/91/92/93/94/95 轮 NSCA-CPT ch02 / finance-ch13 / badminton-recovery-ch01 修复同型（manifest h2s 与 markdown 1:1 对齐），跨书跨轮复制成功

**真实问题修复对照**：
- 修复前：sidebar/TOC 渲染时「## 四、回归球场的三道关」整节不显示，读者点不到这一节 —— **整章承上启下的核心节点丢失**；同时点击侧边栏「四、与 NSCA-CPT ch09 的互引表」时落地到的是 NSCA 互引表（应为五），**章节上下文完全错位 1 格**
- 修复后：sidebar/TOC 完整显示 `本章导言 + 一~九` 共 10 个 h2，「四、回归球场的三道关（对应 ch01 §四）」正常展示且可点击（带 4.1/4.2/4.3 三个 sub）；后续 五~九 title 数字与 markdown 严格 1:1 对齐；12 个 ### subs 完整映射

---

**下轮候选**（继承 95 轮 + 本轮新发现，优先级降序）：
1. **(继承 92/94 轮, 优先级中)** badminton ch13 markdown 数字编号乱序 —— L754 `## 十二、双打比赛的体能要求` + L808 `## 十二、双打比赛的体能储备与伤病预防`（DUPLICATE 十二）+ L857 `## 十五、` (跳号) + L991 `## 十三、` (回退) + L1082 `## 十四、`. manifest 镜像混乱。建议下一轮：先 grep 一遍 markdown 与 manifest 当前所有 h2 标题，对齐成一张 diff 表，然后只改 manifest（不动 markdown）或者只改 markdown（保持原 numbered list 风格）。单 commit 可独立回滚。
2. **(继承 92/94 轮, 优先级中)** psychology ch12 markdown 数字编号乱序 + 空 `## ` 行 —— L525 `## 十一、积极心理学的应用与日常练习` + L895 `## `（空标题）+ L952 `## 十、积极心理学的争议`（十 出现在 十一 之后）+ L988 `## 十一、积极心理学的日常实践指南`（DUPLICATE 十一）。manifest 镜像混乱。建议下一轮：先 grep 比对 markdown 与 manifest 的 h2 list，做最小补丁把 manifest 与 markdown 对齐。
3. **(继承 92/94 轮, 优先级低)** engineering-mechanics ch12 markdown L585 `## 十一、` 跳号 + L1013 `## ʮ`（乱码字符空标题）+ L1067/L1135 重复 `## 十一/十二、`. manifest 镜像混乱。可远期处理。
4. **(继承 94/95 轮, 优先级低)** finance ch13 manifest `words: 12992` 未与 markdown 删除同步 —— 全仓 97/100 章都有 drift（仅 ±几百到 ±上万字不等），约定不明，本轮不动继续留。
5. **(继承 91 轮, 优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补。
6. **(继承 91 轮, 优先级低)** 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观。
7. **(继承 91/95 轮, 优先级低)** NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2。
8. **(继承 91/95 轮, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~96 轮双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~96 双写系列保持连续。
9. **(继承 91/95 轮, 优先级低)** `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置，本轮 96 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被 git 标 binary，但 `git diff --text` 仍能拿到 +607/+607 字节真实差异。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff。
10. **(本轮新发现, 优先级低)** `badminton-recovery/ch07-achilles.md` manifest h2s 待 1:1 校验 —— 96 轮专注 ch08 修复时未做 ch07 校验，可远期一次扫描整本 badminton-recovery 8 个章节的 manifest h2s 1:1 漂移（ch01 + ch08 已修，剩 ch02~ch07 待扫）。

---

**本轮 commit hash**：`1af201e`

**本轮 push**：✅ 第 1 次重试成功（`4e91372..1af201e` book → book，github.com:443 第 1 次报成功，无需 sleep 累加）
"""


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(LEDGER)