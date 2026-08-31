# Round 95 ledger — badminton-recovery/ch01 manifest 补「七、全书导航总览」h2（94 轮扫描新发现兑现）

**commit hash**：`429e771`
（`fix(badminton-recovery-ch01): manifest 补「七、全书导航总览」 h2 — 与 markdown 1:1 对齐（94 轮新发现）`）

**push 状态**：✅ 第 7 次重试成功（`2902365..429e771`，github.com:443 累计 sleep 累加 30+60+90+90+180+120+180 ≈ 12.5 分钟；中间一次 `curl 56 Recv failure: Connection was reset` 但最终 push 成功）

---

**本轮做了什么**：兑现 94 轮 ledger 扫描新发现——`books/badminton-recovery/ch01-introduction.md` markdown 有 8 个 h2（`本章导言 + 一~七`），但 `manifest.json` 与 `manifest_data.js` 都只有 7 个 h2（缺 `七、全书导航总览：6 大损伤 × 时间线 × 对应章节`）。ch01 是整本书「康复总论」入口，TOC 少一节会让读者读 sidebar 时困惑。

**bug 复盘**：
- markdown L7 `## 本章导言` + L18 `## 一、康复的三个核心原则` + L52 `## 二、康复时间线：4 周 / 8 周 / 12 周` + L82 `## 三、信号识别：六大损伤的早期警告` + L119 `## 四、回归球场的三道关` + L152 `## 五、本书使用指南` + L174 `## 六、本章核心要点` + **L197 `## 七、全书导航总览：6 大损伤 × 时间线 × 对应章节`**
- L197 这节是整本书最关键的一节之一——含 6 行导航表（肩/膝/踝/肘/腰/跟腱 6 大损伤 × 推荐时间线 × 对应章节）+ NSCA 阶段映射表 + 「章节间依赖关系」段
- manifest 当前缺这条 h2，sidebar/TOC 渲染时「七、全书导航总览」不显示——读者点不到这一节，**等于整本书最重要的导航表缺位**
- 与 86/87/88/89/90/91/92 轮 NSCA-CPT ch02 / finance-ch13 修复同型——manifest h2s 与 markdown 1:1 漂移

**修复落地**（与 92 轮 commit `ac37027` 「finance-ch13 合并重复 `## 十、` h2」+ 88 轮 commit `25a0bcd` 「finance-ch13 manifest 冗余本章小结条目清理」+ 87 轮 commit `6669b60` 「NSCA-CPT ch02 h2s 嵌套数组思考题重复条目清理」同型——纯 manifest 改动）：
- 双文件改动：`manifest.json` 第 12117 行 + `manifest_data.js` 第 12793 行 六、本章核心要点 的 h2s entry 之后插入新 entry
- 新 entry 结构：
  ```json
  {
    "title": "七、全书导航总览：6 大损伤 × 时间线 × 对应章节",
    "subs": [
      { "title": "第一层：普通人能看懂", "level": 3 },
      { "title": "第二层：专业人士参考", "level": 3 }
    ]
  }
  ```
- subs 镜像 markdown L199 `### 第一层：普通人能看懂` + L216 `### 第二层：专业人士参考` 两个 ### 子节
- 0 markdown 改动（ch01 markdown 端已完整，只需 manifest 同步）
- 0 ex-lib id 改动
- 0 业务代码改动
- 字节数：manifest.json 435290 → 435719（+429）/ manifest_data.js 457244 → 457673（+429）

**扫描新发现（ch08 同型 bug，留作下轮）**：
本轮除了修 ch01 还**重扫**出 `books/badminton-recovery/ch08-action-plan.md` 同型问题——
- markdown `本章导言 + 一~九`（10 个 h2），manifest 仅 `本章导言 + 一~八`（9 个 h2）
- manifest [4]~[8] 的 title 全部 off-by-one：manifest [4] 写「四、与 NSCA-CPT ch09 的互引表」但 md L143 是「四、回归球场的三道关（对应 ch01 §四）」，manifest 整段缺 md L143 这一节
- 修复需 5 个 title 重命名 + 1 个 missing entry = 6 处改动，scope 比本轮大，故**留作 96 轮候选 #1**

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- `node _scan_exlib.js` → 1336 ids / 581 refs / 0 broken（不变；仅动 manifests 不涉 ex-lib）✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变）✓
- `python _audit_exlib_ledger.py` 仍报 `badminton/ch12-physical-training.md inline=1 declared=66 list-section`，与本轮无关，沿用 92 轮 informational 标记 ✓
- 1:1 对齐校验：
  - markdown h2 数:8（`本章导言 + 一~七`）
  - manifest.json h2 数:7 → 8（添加 1 条）
  - manifest_data.js h2 数:7 → 8（添加 1 条）
  - 三个数据源 title 完全 1:1（去前缀 `## ` 后 `==` 验证 True）✓
- 新 entry subs 镜像 md 两个 ### 子节：第一层：普通人能看懂 + 第二层：专业人士参考（均 level 3）✓
- `git diff --text manifest.json` 真实差异：13 行新增（+1 个 h2 entry + 2 个 sub）
- CRLF 计数：manifest.json 14136 → 14143（+7） / manifest_data.js 14811 → 14818（+7）/ lone CR:0 / 0 ✓
- 两个 manifest 文件字节数：manifest.json 435290 → 435719（+429）/ manifest_data.js 457244 → 457673（+429），CRLF 行尾原状保留 ✓
- APP_VERSION `v3.22.62` 不 bump；app.js / style.css / index.html / VERSION 未触碰 ✓
- 零业务代码改动；零 ex-lib id 改动；零 markdown 改动
- 可独立回滚：`git revert 429e771` 即可恢复两个 manifest 的 h2s entry 缺失 ✓

**用户偏好兑现**：
- 沿用 86/87/88/89/90/91/92/93/94 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅 manifest h2 entry 补全，0 涉 ex-lib）
- 兑现 94 轮扫描发现的「badminton-recovery/ch01 manifest 缺 七、全书导航总览」修复承诺
- 单 commit / 单源 issue / 对称双 manifest 修复 / 严格 1:1 与 markdown 对齐
- 与 86/87/88/89/90/91/92/93/94 轮 NSCA-CPT ch02 / finance-ch13 修复同型（manifest h2s 与 markdown 1:1 对齐），跨书跨轮复制成功

**真实问题修复对照**：
- 修复前：sidebar/TOC 渲染时「七、全书导航总览」不显示，读者点不到这一节——**整本书最重要的 6 大损伤导航表缺位**
- 修复后：sidebar/TOC 完整显示「本章导言 + 一~七」共 8 个 h2，「七、全书导航总览」正常展示且可点击

---

**下轮候选**（继承 94 轮 + 本轮新发现，优先级降序）：
1. **(本轮新发现, 优先级高)** `badminton-recovery/ch08-action-plan.md` manifest h2s 严重错位 + 缺 entry：
   - markdown `本章导言 + 一~九`（10 个 h2，含 `## 一、按部位行动清单` L16 / `## 二、按人群行动清单` L98 / `## 三、回归球场的统一标准` L126 / `## 四、回归球场的三道关（对应 ch01 §四）` L143 / `## 五、与 NSCA-CPT ch09 的互引表` L177 / `## 六、与羽毛球 ch12 第九节的互引表` L193 / `## 七、本章 ex-lib 引用清单` L206 / `## 八、本书目录回顾` L233 / `## 九、最后的提醒` L246）
   - manifest 当前 `[3] 三、回归球场的统一标准` / `[4] 四、与 NSCA-CPT ch09 的互引表` / `[5] 五、与羽毛球 ch12 第九节的互引表` / `[6] 六、本章 ex-lib 引用清单` / `[7] 七、本书目录回顾` / `[8] 八、最后的提醒`
   - **错位分析**：manifest 缺 `## 四、回归球场的三道关（对应 ch01 §四）`（md L143），且 [4]~[8] 全部 title 错位（应是「五、与 NSCA / 六、与羽毛球 ch12 / 七、本章 ex-lib / 八、本书目录回顾 / 九、最后的提醒」），共 5 个 title 重命名 + 1 个 missing entry = 6 处改动
   - 修复策略：纯 manifest 改动 + 0 markdown 改动 + 0 ex-lib 改动 + 0 APP_VERSION 改动，可独立 commit 回滚（96 轮候选 #1）
2. **(继承 94 轮 #1, 优先级中)** badminton ch13 markdown 数字编号乱序 —— L754 `## 十二、双打比赛的体能要求` + L808 `## 十二、双打比赛的体能储备与伤病预防`（DUPLICATE 十二）+ L857 `## 十五、` (跳号) + L991 `## 十三、` (回退) + L1082 `## 十四、`. manifest 镜像混乱。建议下一轮：先 grep 一遍 markdown 与 manifest 当前所有 h2 标题，对齐成一张 diff 表，然后只改 manifest（不动 markdown）或者只改 markdown（保持原 numbered list 风格）。单 commit 可独立回滚。
3. **(继承 94 轮 #2, 优先级中)** psychology ch12 markdown 数字编号乱序 + 空 `## ` 行 —— L525 `## 十一、积极心理学的应用与日常练习` + L895 `## `（空标题）+ L952 `## 十、积极心理学的争议`（十 出现在 十一 之后）+ L988 `## 十一、积极心理学的日常实践指南`（DUPLICATE 十一）。manifest 镜像混乱。建议下一轮：先 grep 比对 markdown 与 manifest 的 h2 list，做最小补丁把 manifest 与 markdown 对齐。
4. **(继承 94 轮 #3, 优先级低)** engineering-mechanics ch12 markdown L585 `## 十一、` 跳号 + L1013 `## ʮ`（乱码字符空标题）+ L1067/L1135 重复 `## 十一/十二、`. manifest 镜像混乱。可远期处理。
5. **(继承 94 轮 #4, 优先级低)** finance ch13 manifest `words: 12992` 未与 markdown 删除同步 —— 全仓 97/100 章都有 drift（仅 ±几百到 ±上万字不等），约定不明，本轮不动继续留。
6. **(继承 94 轮 #5, 优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补。
7. **(继承 94 轮 #6, 优先级低)** 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观。
8. **(继承 94 轮 #7, 优先级低)** NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2。
9. **(继承 94 轮 #8, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~94 轮双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~95 双写系列保持连续。
10. **(继承 94 轮 #9, 优先级低)** `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置，本轮 95 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被 git 标 binary，但 `git diff --text` 仍能拿到 13 行真实差异。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff。

---

**本轮 commit hash**：`429e771`

**本轮 push**：✅ 第 7 次重试成功（`2902365..429e771` book → book，github.com:443 累计 sleep 累加 ≈ 12.5 分钟）

