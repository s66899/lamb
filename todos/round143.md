# 第 143 轮 — 根 README §「更新日志」v3.22.64 幽灵条目并入 v3.22.63

**起点状态**：HEAD = `3963ddc`（round142 记账：badminton-recovery ch04 踝关节红旗信号 + Ottawa Ankle Rules），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0）

## 本轮做了什么

**选题过程**：先按指令跑真实状态扫描，逐条排除上轮留下的候选：

1. ~~候选 #1「ch06 / ch07 末段清单段强化」~~ → 本轮实测全 8 章扫表：6 大损伤章（ch02-ch07）+ ch08 行动清单章 都有独立的「本章 ex-lib 引用清单」或「ex-lib 互引」尾段，ch01 总览章 0 refs 故无尾部段为预期设计；ch06 (198 行/8 H2) 和 ch07 (199 行/8 H2) 虽并列为全书最薄，但 H2/H3 结构、4/8/12 周时间线、力学纠正、与 NSCA-CPT ch09 互引、行动清单、清单段全部齐全；红旗信号 ch06 L25-29 / ch07 L22-28 已覆盖；无明显可改处
2. ~~候选 #2「NSCA ch10 SMR 条目补入库」~~ → 实测库内 `5202~5213` 共 12 条 SMR 专项条目（10 条泡沫轴 + 2 条筋膜球 lacrosse ball）已在 v3.22.17 全部入库，本章 §2.1 SMR 引用表 12 条全合法 id；腰部 foam roller 仍无专项条目，按用户偏好「不要伪造 id」明确不补
3. ~~候选 #3「ex-lib broken id 扫表」~~ → 实测全 `books/**/*.md` 107 文件 / 582 `[ex:NNNN]` token / 140 unique id / **broken = 0**；所有疑似 4 位数字命中（钢材牌号 4340/7075、年份 2020~2030、毫升数 1500/2600、文献年份 1942）经人工核对全部为假阳性，无需修复
4. APP_VERSION 5 维度体检 → app.js `v3.22.63` / index.html 3 处 `?v=v3.22.63` / VERSION 头注释 `v3.22.63` / README.md L236 当前版本 `v3.22.63` / books/README.md 数据源 `v3.22.63` — **5 处全部一致**，drift 0/0，**但扫到 1 处 5-dim 不一致隐患** 👇

**最终选定**：扫 README.md §「🔄 更新日志」时发现 **「v3.22.64」幽灵条目**：

| 文件 | 行号 | 内容 | 与 v3.22.63 关系 |
|---|---|---|---|
| README.md | L247 | `- **v3.22.64**（2026-09-01）: 🔧 根 README 9 本书目录预览 vs 实际章节 1:1 核查修复...` | **仅有 1 处声明**，其它 5 维度（app.js / index.html / VERSION / L236 当前版本 / books/README.md）全部仍为 v3.22.63 |
| README.md | L236 | 当前版本：**v3.22.63**（2026-09-01） | v3.22.63 |
| VERSION | 顶部注释 | `# 当前 HEAD = v3.22.63, APP_VERSION (app.js) = v3.22.63` | v3.22.63 |
| app.js | L? | `const APP_VERSION = 'v3.22.63';` | v3.22.63 |
| index.html | L? | `?v=v3.22.63`（3 处） | v3.22.63 |
| books/README.md | L11 | `manifest.json` v3.22.63 | v3.22.63 |

**为什么这是真问题**：round141 commit `2f97cd6`（根 README 9 本书目录 1:1 核查修复）虽然标题号写 `v3.22.64` 并填入了 README.md L247 幽灵条目，但 commit body 明写「APP_VERSION 不 bump，drift 0/0」—— 这违反了本项目自 round137 (`6252c30`) 起建立的「版本号 = 实际发版」单一来源原则：当时（round139）专文勘误过类似"叙事领先于代码"的 drift，本次 round141 重新制造了同一类型 drift，只是范围更窄（仅1 处 README changelog，未污染其它 5 维度）。

**修复策略**（单 commit / 可独立回滚）：将 README.md L247 的 v3.22.64 幽灵条目**合并**进 L246 v3.22.63 条目末尾，注明"该条后续若干次 round（141 9 本书目录核查 + 142 ch04 踝关节红旗信号）均未触发 _bump_version，统一并入本 changelog 条目以保持「版本号 = 实际发版」单一来源"，让 changelog 内的版本号与实际代码 5 维度一一对齐。其它 4 维度（app.js / index.html / VERSION / books/README.md）不动，5-dim drift 仍 0/0，**无 _bump_version 触发需求**。

**为什么不 bump APP_VERSION**：本轮纯文档 churn 收口（消解 round141 自造 drift），零业务代码/数据结构/兼容性影响，按 round139/140/141/142 同型处理。

**为什么不追加新 v3.22.64 条目 + 实际 bump**：本轮是「消除已存在的叙事 drift」而非「发布新功能」，bump 反而会制造一次真实的「叙事 = 代码」打平，但本轮没动业务代码，bump 不诚实 —— 真正的 bump 应留给下一轮实质内容改动（如 NSCA ch10 进一步深化 / 新章节 / 新功能）。

## 校验

- `git diff --stat`: `README.md | 3 +--`（1 file / +1 / -2）✓
- README.md `grep v3\.22\.64`: 0 命中 ✓（幽灵条目已清除）
- README.md `grep v3\.22\.63`: L236 当前版本 + L246 changelog = **2 处** ✓（L247 v3.22.64 已合并进 L246）
- `grep v3\.22\.64` 全项目范围（.md/.js/.json/.html）: 0 命中 ✓
- APP_VERSION 5 维度一致性：app.js / index.html（3 处 ?v=）/ VERSION / README.md L236 / books/README.md 全部 v3.22.63，drift **0/0** ✓
- `node --check` 未涉及（纯 .md 文字修改）✓
- `python -m json.tool manifest.json` / `python -m json.tool books/exercises/ex-lib.json` 未涉及（零业务代码改动）✓
- ex-lib 引用全库扫描：107 文件 / 582 token / 140 unique id / **broken 0** ✓（未触动）
- 章节结构核对：README.md 全 400 行（改前 401，因合并掉 1 行），§「📌 版本」段（L230-241）、§「🔄 更新日志」段（L242-）结构完整

## Push 状态

- 待 push（git push origin book → GitHub Pages 自动部署）

## 新增下轮候选

- **(本轮新发现,优先级中)** round141「v3.22.64 幽灵条目」已消除；下轮可考虑真正触发 v3.22.64 → v3.22.65 bump 以覆盖 round141（9 本书目录核查）+ round142（ch04 红旗信号）+ 本轮143（README 收口）三轮累计的内容，让代码 5 维度对齐到「实际发版」单一来源 —— 但前提是有至少一项实质内容改动，否则 bump 仍属不诚实
- **(本轮新发现,优先级低)** 根 README.md §「🔄 更新日志」时间排序异常：L246 v3.22.63 / L247 v3.22.64 / L248 v3.22.62（应为 v3.22.64 在 v3.22.62 之后）—— 本轮通过合并 L247 已顺带消解排序问题；但若下轮 bump v3.22.65 后，应保证新条目按时间倒序插入到 v3.22.63 之后
- **(继承远期,优先级低)** 腰部 foam roller 专项入库 — 库内 back 系列 5207/5208/5212 全是 upper/thoracic/lats,腰部 foam roller 专项**确实暂无**,继续留为远期观察
- **(继承远期,优先级低)** ch06 / ch07 章节进一步深化（行数/H2 段数最低并列,但结构完整）— 远期观察
- **(继承远期,优先级低)** _session_todo.md 现 1755+ 行远期归档 — 继续留
- **(继承远期,优先级低)** NSCA-CPT ch01-ch09 其余章节继续深化 — 远期观察