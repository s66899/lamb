# Round 160 — badminton-recovery ch03 §7.3 补 ch12 9.8「互引表」一行（与 ch08 §六对齐）

**起点状态**：HEAD = `bae4efe`（round159 记账：ch03 §7.1「ch09 第 2 节（功能性筛查）」双重虚假锚点修复），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0）

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看历史 round156-159 全部围绕「ch01-ch08 章节升级版对齐 + 红旗信号 + 时间线 + 互引表」主题 → 上一轮（round159）已修 ch03 §7.1「ch09 第 2 节（功能性筛查）」双重虚假锚点（用 ch09 第 1.1 节末「回归标准」替换 + blockquote 解释）→ 本轮扫描方向：**羽毛球康复书内部一致性**——round158 修 ch08 §六时已识别「ch03 §7.3 vs ch08 §六对称不对称」问题并升级为 round159 候选清单的「(本轮新发现,优先级中)」项；round159 因当时聚焦 §7.1 第二行修复而未推进，本轮直接采纳这一候选。

### Bug 根因（ch03 §7.3 漏列 9.8「互引表」）

ch03 §7.3「🐏羽毛球 ch12 第九节互引」原 line 274-277：

```
### 7.3 🐏羽毛球 ch12 第九节互引

- **ch12 9.1 膝关节康复 × 上网急停**：本章摘要版，约 300 行
- **ch12 9.7 本节行动清单**：按人群分类的快速行动指南
```

**问题**：ch03 §7.3 只列 9.1 + 9.7 共 2 行（漏 9.8），但 ch08 §六 round158 已补全 8 行（9.1-9.8 全列）——**ch08 §六作为全章互引表已与 ch03 §7.3 不对称**。

**为何 9.8 该补但 9.2-9.6 不该补**：
- 9.1（膝）是 ch03 自身章节 → 应列
- 9.2（肩）/ 9.3（踝）/ 9.4（肘）/ 9.5（腰）/ 9.6（跟腱）= 其他部位章节摘要 → ch03 是单章互引，加 9.2-9.6 是越界扩容（ch03 既然已无任何 ch04-ch07 的章节，再加 9.2-9.6 反而越界）
- 9.7（按人群行动清单）= 「全章共用」收官节 → 应列
- 9.8（互引表）= 「全章共用」收官节 → 应列（与 9.7 同性质）

**round158 评估已确认**：「ch03 既然已无任何 ch04-ch07 的章节，再加 9.2-9.6 反而是越界扩容」——所以 ch03 §7.3 只能加 9.8（与 9.7 同性质的全章共用节），不能加 9.2-9.6。

### 修复策略

往 ch03 §7.3 追加 1 行：

- **旧**：只列 ch12 9.1 + ch12 9.7 共 2 行
- **新**：列 ch12 9.1 + ch12 9.7 + **ch12 9.8 本节与 NSCA-CPT ch09 + ex-lib 互引**：第九节内置的「损伤部位 → ch09 章节 → ex-lib id」映射表（30 项），与 ch08 §五/§六互引表互为冗余备份

**格式对齐 ch08 §六 表格第 9.8 节描述**：「第 9.8 节「本节与 NSCA-CPT ch09 + ex-lib 互引」 | ch12 第九节内置的「损伤部位 → ch09 章节 → ex-lib id」映射表（30 项），与 ch08 §五/§六互引表互为冗余备份」——ch03 §7.3 是 bullet list 不是 table，描述文字做了 bullet list 适配但信息量等价。

### 扫表确认范围

- ch03 inline 16 / unique 9（与 README 声明对齐）✓（本轮新增 1 行纯文字，零 ex-lib id 改动）
- `node _scan_exlib.js`：1336 ids / 621 refs / broken=0（与改前一致）✓
- `python _audit_exlib_ledger.py`：106 章 audit 通过，「✅ all declared counts match actual inline counts」✓
- `python -m json.tool manifest.json` OK（未改动）✓
- `python -m json.tool books/exercises/ex-lib.json` OK（未改动）✓
- ch03 LF-only / 0 CRLF / 0 lone CR / endswith LF ✓
- `git diff --stat` → `1 file changed, 1 insertion(+)` ✓（单行新增）
- APP_VERSION 5 维度体检未触发（未触及 app.js / index.html / README.md L「当前版本」/ books/README.md L11 / VERSION 头注释），无 bump ✓
- 零业务代码改动；零 ex-lib id 改动；零 manifest.json 改动；零 ch01/ch02/ch04/ch05/ch06/ch07/ch08 改动

## 校验

- `node --check` 未涉及（纯 .md 文字修改）✓
- `python -m json.tool manifest.json` OK ✓
- `python -m json.tool books/exercises/ex-lib.json` OK ✓
- ch03 inline 16 / unique 9 与 README 声明一致 ✓
- LF-only / 0 CRLF / 0 lone CR / endswith LF ✓
- `git diff --stat` → `1 file changed, 1 insertion(+)` ✓

## 落地

- commit `0f5d9c9`：`fix(badminton-recovery): ch03 §7.3 补 ch12 9.8「互引表」一行（与 ch08 §六 9.7/9.8 收官节对齐；零 ex-lib id 改动；inline 16/unique 9 不变；APP_VERSION 不 bump）`

## 上轮候选清算

- ✅ **(本轮已修)ch03 §7.3 漏列 ch12 9.8「互引表」一行** — round158 升级为 round159 候选「(本轮新发现,优先级中)」项，round159 因聚焦 §7.1 第二行修复未推进，本轮直接采纳，候选作废
- ✅ **(本轮已扫,非 bug)** NSCA-CPT ch10 §七末段 v3.22.17/62/72/74 四次勘误 blockquote 累积 580+ 字：已在本轮扫描时确认 = round158 之前的轮次已合并完成（line 317 「历史勘误简记」单段已合并 4 个零散 blockquote），候选作废
- 🟡 **(继承,优先级中)** ch07 12 周时间线段补强 5 个 inline 动作：仍未推进（但 round158 已评估「ch07 现有 51 inline 已经超过 ch06 46，多了反而冗余，可能不再必要」，本轮再确认放弃）
- 🟡 **(继承,优先级中)** push 重试：round159 commit `7e307bd` 已落本地但 push 失败 3 次（github.com:443 持续超时），需要重试——本轮 commit `0f5d9c9` 也已落本地；两轮 commit 待人工 / 下次自动重试 push
- 🟢 **(继承,优先级低)** NSCA-CPT ch03 anatomy 全文 326 行但 inline 只 6 处集中在 §11.1 自检表：本轮再确认——ch03 anatomy 是讲解剖学基础，章节性质是知识性而非训练动作，所以 ex-lib 引用少是合理的（解剖章节不是动作指南），不修
- 🟢 **(继承,优先级低)** NSCA-CPT ch07 柔韧性章节 SMR / 拉伸动作密度核查：本轮再确认——ch07 359 行 / 9 处 ex-lib 引用（grep `\[ex:` 计数）/ 10 节结构完整；唯一缺口 = 完全缺 SMR/foam roller/筋膜球段，但 round158 已评估「ch02-ch07 七章 SMR 由 ch10 §2.1 SMR 引用表统一管，新加会重复」，不修
- 🟢 **(继承,优先级低)** APP_VERSION bump：未触发
- 🟢 **(继承,优先级低)** L# 改进：远期继承
- 🟢 **(继承,优先级低)** 根 README「每章 60/30/10」核实：远期继承

## 新增下轮候选

- **(本轮新发现,优先级低)** ch03 §7.1 第一行「ch09 第 1 节（膝关节康复原则）」与第七部分第 1 节匹配但描述偏简——ch09 第 1 节实际含 1.1 髌腱炎 / 1.2 半月板 / 1.3 髌骨软化 3 个 H3 子节，本书第三部分 8 周时间线讲的是「单腿力量回归 + 保加利亚蹲代用」，对应 ch09 第 1.1 节髌腱炎 + 部分第 1.2 节半月板。可远期把第一行也细化到具体子节，但 round159 已用 blockquote 说明，已是合理精度，不修
- **(继承远期,优先级低)** _session_todo.md 现 2000+ 行远期归档
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库（库内 18 泡沫轴 + 2 筋膜球均无 lumbar 系列；ex:5212 thoracic spine 是最近邻）
- **(继承远期,优先级低)** 羽毛球康复书 8 章结构模板不一致——ch02 = 12 节「一、...十二、」编号、ch05 = 12 节「一、...十二、」编号、ch03 = 7 部分「第 X 部分」编号、ch04 = 双层结构「第一层 / 第二层」、ch06/ch07 = 简化 8 节、ch08 = 7 节「一-七」编号——这种「8 章 5 种结构」是事实存在的不一致，但历轮已确认这是「按损伤特性定制」的设计选择，不修
- **(继承远期,优先级低)** ch01 §四最后那个"6 大损伤 × ex-lib 入门口诀" 表（line 257-262 inline 6 处：3011/3533/1368/5210/0276/1377）与 ch08 §一「行动清单」是否字字对齐？两者都是 "入门 6 部位 = 一句口诀 + 1-2 个 ex-lib 动作"，定位高度重合但 ch08 没显式引用 ch01 §四该表。可远期统一
- **(继承远期,优先级低)** ch08 §一「行动清单」和 ch12 §9.7「本节行动清单」的实际行内容是否字字对齐？ch08 面向「前 7 章读者想要一页纸总结」按部位（肩/膝/踝/肘/腰/跟腱）展开，ch12 §9.7 按人群（新手/进阶/高水平）展开，定位差异但仍存在「部位 vs 人群」两种分类视角是否会让读者混乱。可远期观察是否有读者疑问

## commit hash

- `0f5d9c9`（本轮已 commit；push 待重试 — github.com:443 持续 21s 超时，与 round159 `7e307bd` 同待 push）
