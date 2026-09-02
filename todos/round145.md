# Round 145 记账 — 2026-09-02

## 本轮干了什么
**修复**：badminton-recovery ch01 补「六大损伤第 1 天起步动作」速查 §八 + 章末 ex-lib 引用清单 §九

### 真实问题（扫表发现）
全仓扫表证实 badminton-recovery 全书 8 章中 ch01 是唯一 0 处 ex-lib inline 引用的章节（ch02 32 / ch03 16 / ch04 23 / ch05 17 / ch06 46 / ch07 50 / ch08 35，ch01 为 0）。ch01 作为总论章，前两轮已经修过脚踝红旗信号（round142 aff759f）、图书目录一致性（round141 2f97cd6/70d773c）等缺口，但「读完全书原则之后读者最想问的那句话——『那我今天能做什么？』」这一缺口始终没填。该缺口是真实存在的质量问题，不是营销/文案层面的吹毛求疵。

### 落地动作（ch01 末尾新增两节）
- §八 第一层：6 大损伤各 1 个最低门槛的起步动作表（部位 / 动作 / 器材 / 做法要点 / 详见章节链接），全部 beginner 级、徒手或筋膜球器材；附「务必读完再动」红旗前置条件（静息痛、关节变形、神经症状、肌力骤降、外伤后无法承重 → 先就医不要照做）
- §八 第二层：entry-point prescription 分诊逻辑定位（给尚未完成评估的自主训练者的低风险切入动作而非完整处方）；三条选择标准（动作模式优先于负荷 / 可自我分级连续变量 / SMR 仅作镇痛与耐受窗口通道其后必接离心力量训练）；与各章 4/8/12 周时间线的转出阈值（VAS 静息 ≤ 2、日常 ≤ 4 即转出本表）
- §九 章末 ex-lib 引用清单表，与其余 7 章末「本章 ex-lib 引用清单」体例保持一致

### 严格遵守 ex-lib 纪律
新增的 9 个 unique id 全部为库内合法条目，且每一个都已在对应损伤章中实际使用：
- [ex:3011] incline scapula push up → ch02-shoulder（×6）
- [ex:3533] quads 股四头肌激活 → ch03-knee（×3）
- [ex:1368] ankle circles 踝绕环 → ch04-ankle（×2）/ ch07-achilles（×3）
- [ex:1377] calf stretch with hands against wall → ch04-ankle（×1）/ ch07-achilles（×3）
- [ex:5210] lacrosse ball forearm 筋膜球前臂松解 → ch05-elbow（×8）
- [ex:0994] band reverse wrist curl → ch05-elbow（×4）
- [ex:0276] dead bug 死虫式 → ch06-back（×4）
- [ex:5212] foam roller thoracic spine → ch06-back（×7）
- [ex:5205] foam roller calves → ch07-achilles（×4）

故全书 unique 总数 64 不变，未伪造任何 foam roller / 筋膜球专项编号。§八 第二层显式写明「库内 SMR 集中于泡沫轴与筋膜球两类，不要自行编造库中不存在的 SMR 编号」——给后续可能扩展本表的编辑设了一道护栏。

## 校验

| 项目 | 结果 |
|------|------|
| 本轮新增 inline | 29 处（ch01 0→29） |
| 本轮新增 unique id | 9 个 |
| 全书 unique 总数 | 64 不变（89 sum-of-chapter-unique − 25 dup = 64） |
| 全书 inline 合计 | 219 → 248 |
| 全仓 ex-lib 引用总数 | 587 → 616 |
| broken refs | 0 |
| ch01 同级链接 | 37 条全部命中真实文件（missing 0；2 处 no-H2-match 为叙述性导航标签非锚点） |
| markdown 表格列数 | 一致（6 / 7 pipes） |
| ch01 H2 编号 | 一→九连续 |
| README 账本 | 顶层 248/64/0 + inline 分布行 1:1 与实际对齐 |
| APP_VERSION 5 埋点 drift | 0/0（app.js / index.html / manifest.json / VERSION 头 / books/README） |
| 业务代码改动 | 0（app.js / manifest.json / index.html 未触碰） |

## commit
- `d4c1479` feat(badminton-recovery): ch01 补「六大损伤第 1 天起步动作」速查 §八 + 章末 ex-lib 引用清单 §九
- 2 files changed / 47 insertions(+) / 1 deletion(-)

## push 状态
**⚠️ push 失败：HTTPS 443 连接 GitHub 持续 21s 超时**（ping 20.205.243.166 正常 48ms；DNS 解析正常）。commit 已落本地（`## book...origin/book [ahead 1]`），待网络恢复后用 `git push origin book` 触发 GitHub Pages 自动部署。本轮不重试，遵循「不把网络失败当阻塞问题反复打」的工程习惯。

## 留给下轮的候选
1. **push d4c1479**：本次遗留，push 一次即触发 GH Pages 部署；建议下一轮第一步即 `git push origin book`
2. **NSCA-CPT ch10 SMR 条目入库**：优先级队列中的最后一个「专业优化」项——兑现 ch10 既有 v3.22.31 承诺，补足库内尚未单独入库的专项条目（写作前需先核库内现有 5202~5213 + 2202~2209 是否真没覆盖到的细分场景，避免重复入库）
3. **9 本书其他薄弱章节校对**：上一次 9 本书目录预览核查（round141）只查了章节存在性，未查章节内部字数/结构均衡。可扫表找字数 < 5000 字或 H2 < 5 的章节排第二轮校
4. **ch08 行动清单与互引表收口**：ch08 是全书终点章节但 ex-lib 引用 35 处仅居中位，可对照 ch06/ch07 时间线补「返回球场前最后一公里」的检验动作表