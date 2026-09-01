# Round 141 记账 — engineering-mechanics README 第三章 ch03 目录占位注明暂未创作

## 改动

`books/engineering-mechanics/README.md` L19 — 第三章（剪切与扭转）原被列为已存在章节，但全书实际只有 ch01/ch02（含深度版）/ch04~ch12 共 11 个文件，**ch03 文件完全缺失**。读者按目录点击第三章会落空。本轮把第三章改为目录占位 + 注明暂未创作 + 计划下一轮补 `ch03-shear-and-torsion.md`，对用户友好且诚实。

**为什么这是真问题**：

- README L19 原文：「**第三章**：剪切与扭转——力的另一种表达」（无任何暂未创作标记，与已存在的第一章/第二章同格式）
- 实际 `ls books/engineering-mechanics/ | grep ^ch` 只有 ch01/ch02/ch02-deep-dive/ch04~ch12 = 11 个文件
- GitHub Pages 部署后用户点 README 里的「第三章」无对应文件可读（manifest.json / manifest_data.js 也都没注册 ch03）
- 整本工程力学 README 章节结构对用户是一份「合同」——列了 12 章但只交付 11 章，会被读者视为烂尾或不完整

**为什么选「暂未创作」而非「删除第三章」**：

- 删除会抹去用户的目录计划（剪切与扭转本就是工程力学标准第二章后的下一章）
- 「暂未创作」+ 注明「计划下一轮补 ch03-shear-and-torsion.md」既保留计划又诚实告知进度
- 可独立回滚：下一轮真补出 ch03 文件时，仅需把本行「（**暂未创作**...）」附录删掉即可还原成已存在形态
- 与 v3.22.46/v3.22.55 同型「补齐缺失章节」策略一致

**为什么不补 ch03 真实文件**：本轮目标是单 commit 可独立回滚的小改进；写一章工程力学深度内容（剪切面/扭转切应力/剪切胡克定律/扭转角/组合切应力+动机心理学融合）属于大架构变更，违反「小改进」约束。留给后续轮次单独 commit。

**为什么不 bump APP_VERSION**：纯文档目录占位标注，对功能/数据/兼容性零影响，按 round139/140 同型处理，下一次内容实质改进再 bump。

## 校验

- `ls books/engineering-mechanics/ch03*` → `No such file or directory` ✓（确认 ch03 缺失）
- README 现在第十九行：「**第三章**：剪切与扭转——力的另一种表达（**暂未创作** · 目录占位 · 计划下一轮补 `ch03-shear-and-torsion.md`；本书目前实际有 ch01/ch02（含深度版）/ch04~ch12 共 11 章）」✓
- README 其他章节（第一/第二/第四~第十二）与实际文件仍 1:1 对齐 ✓
- `python -m json.tool manifest.json > /dev/null` ✅（未动 manifest）
- `node --check app.js` ✅（未动 JS）
- `node --check manifest_data.js` ✅（未动）
- ex-lib broken id 扫描：未触发（未引用任何 ex-lib），上轮 round139 已 PASS（0 broken / 1336 合法 id）
- CRLF 检查：README 全文 LF，无 `\r` 污染 ✓（git warning 说下次会被替换为 CRLF，但本次提交实际写入 LF，与仓库历史一致）

## 落地

- commit `2a133c8`：fix(engineering-mechanics): README 第三章 ch03 剪切与扭转目录占位注明暂未创作
- push `book`：5d084e8..2a133c8 ✅（GitHub Pages 自动部署）
- 改动行数：1 insertions(+) / 1 deletions(-) = 净 0 行
- 净业务代码改动：**0 行**
- ex-lib id 改动：**0 处**
- APP_VERSION 改动：**未 bump**（保持 v3.22.63）

## 本轮顺手发现的其它 README / 章节不对齐（留给后续轮次）

跑 `python` 扫了全 9 本书的「README 列出的章节数 vs 实际 ch 文件数」，发现：

| 书 | README 列 | 实际文件 | 不一致 |
|---|---|---|---|
| nsca-cpt | 1-10 | 1-10 | ✅ 一致 |
| badminton-recovery | 1-8 | 1-8 | ✅ 一致 |
| **engineering-mechanics** | **1-12** | **1,2,4-12** | **❌ README 误列 ch03**（本轮已修） |
| **psychology** | **1-10** | **1-12** | **❌ README 缺 ch11/12**（积极心理学 + 心理治疗） |
| **finance** | **1-10** | **1-13** | **❌ README 缺 ch11/12/13** |
| **nutrition** | **0（无目录段）** | **1-7** | **❌ README 缺整本目录** |
| **competition** | **0（无目录段）** | **1-6** | **❌ README 缺整本目录** |
| **badminton** | **1-10** | **1-13** | **❌ README 缺 ch11/12/13** |

## 留给下轮的下一项候选

1. **本轮顺手发现的 7 处 README 章节不对齐**（心理学/金融/营养/比赛策略/羽毛球各书 README 漏列实际章节）：可一次性扫表 + 补 README，每本书 1-3 行 commit，独立可回滚；优先级最高（与本轮工程力学同型）
2. **工程力学 ch03 实际创作**：剪切与扭转（含动机心理学融合），目标 ~250-400 行，参考 ch02 入门+深度版结构；完成后再删 README L19 「（**暂未创作**...）」附录
3. **NSCA-CPT ch09 双层结构补全候选**：ch09 546 行/59 ex-lib 引用，体量已足；但可扫一下 ch09 与 ch10 是否存在「4 周/8 周/12 周时间线」或「SMR 引用清单」等结构不一致，作为对照质量提升
4. **manifest.json chapter.id 字段全空**：97/97 章 `id=""`，影响后续编辑器的引用稳定性；可考虑统一填 `chXX` 格式 id（与 chapter.file 同步），但属较大改动，需评估对 `renderChapter` 等函数的影响
5. **manifest_data.js 与 README 标题不一致**（工程力学 ch02 README 称「轴向拉伸与压缩」/ manifest 称「Axial Loading · 入门」/ 文件 H1 称「第二章：轴向拉伸与压缩——最简单的受力形式」）：三处命名差异，是否统一待评估