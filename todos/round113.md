# Round 113 todos

**上一轮 HEAD**：`0c790e3`（round112 — `books/README.md` 2 处字数计数 ↔ manifest.json `totalWords` 对齐；github.com:443 不可达，未 push）。

**本轮 HEAD**：`5825260`（chore: round113 记账记账 amend = `b2afa5f` → `a1dc768` → `bceb996` → `5825260`）。下面 ledger 中「本轮 HEAD」与「commit hash」最终值以 `5825260` 为准。

## 本轮真实 bug

ch07-achilles 12 周时间线「第二层：专业人士参考」是整本书最薄的二级章节：

- 8 行内容 / 3 行表格（**0 个 ex-lib 引用**）
- 第 4 周 / 第 8 周对应的「第二层」分别有 6/5 个 [ex:XXXX] inline 引用，12 周这一节空缺
- 但本章末尾的「本章 ex-lib 引用清单」速查表里，却明确把 4 个 id（`[ex:1407]` `[ex:1398]` `[ex:1390]` `[ex:1708]`）的「本章用途」列写作「12 周辅助拉伸」—— 这 4 个 id 在整章正文中**没有任何一处**实际 inlined
- 12 周居家场景的「靠墙 / 坐姿 / 卧位」渐进辅助拉伸动作 / 拉伸与离心的「练 vs 养」次序，全文未说
- 第 172 行 ex-lib 表格首列末尾「**息者**卧位」—— 错别字（应为「患者卧位」）

事实：
- `books/badminton-recovery/ch07-achilles.md` 12 周「第二层」整段（重 413 bytes / 0 [ex:]）相比 4 周「第二层」（767 bytes / 5 [ex:]）和 8 周「第二层」（501 bytes / 5 [ex:]）明显单薄
- 末尾 ex-lib summary table 把 4 个 stretch id 全部标作「12 周辅助拉伸」用途，但 12 周整段 + 落地缓冲段 + 行动清单段全部不引用它们
- 本章末 `## 本章 ex-lib 引用清单` 表头声明 32 处 inline / 14 unique，与改正后 48 处 inline / 14 unique 实际数对不上（声明 stale）

## 本轮修复

**文件**：`books/badminton-recovery/ch07-achilles.md`（1 file，21 行 + / 6 行 −，字节 +3.3 KB）

**修复点**：

1. **12 周「第一层」**：新增 H3 内嵌子节「**居家每天 15 分钟辅助伸展**」（4 行 actionable 阶梯），依次 inlines `[ex:1407]` `calf push stretch with hands against wall` → `[ex:1398]` `standing calves calf stretch` → `[ex:1390]` `seated calf stretch (male)` → `[ex:1708]` `assisted lying calves stretch`。这 4 个 id 现在由第一层正文显式 inlined，落实「拉伸 ≠ 离心」「拉伸放床头/睡前，离心放中午」「两类不要紧接」的关键教育点。
2. **12 周「第二层」**：原表 3 行（0 [ex:]）改为 3 行加 5 处 inline 引用：`1-4 周`加入 `[ex:1490]` / `[ex:1373]` / `[ex:0999]` / `[ex:1000]` 四处方括号提及；`5-8 周`加入 `[ex:1377]` 离心热身；`9-12 周`加入 `[ex:1374]` 落地缓冲专项。表后再加一节「**拉伸运动处方的临床要点**」明示「拉伸 ≠ 离心训练」「拉伸与离心各自进度 / 时段」「至少留 1 天休息日」的「拉伸 — 联合运动处方」三要点。
3. **ex-lib summary table**：更新「[ex:1377] 本章用途」列从「8 周离心热身穿插」补成「8 周离心热身穿插 + 12 周 5-8 周热身」；更正「[ex:1708] 本章用途」列中「**息者**卧位」为「**患者**卧位」借手指字。
4. **本章首段声明**：原文「**32 处** inline / **14 unique id**」 → 改正后「**48 处** inline / **14 unique id**」（分布段同步刷新：4周 6 + 8 周 5 + 12 周 16 + 落地 1 + NSCA 0 + 行动清单 0 + 清单段 20 = 48）。补完的 4 个 id 都是上一版末尾速查表已经列出但仅作为 12 周辅助拉伸「标的」提及的，全部在库内实证存在（json.load 验证），未创造任何伪造 id。

## 验证

- `python3 -m json.tool manifest.json`：通过（未触碰）
- `node --check manifest_data.js`：通过（未触碰）
- `node --check app.js`：通过（未触碰）
- **markdown 渲染**：ch07 H2 × 8 不变（H1 不变；H2 序列：还是「本章导言 / 4 / 8 / 12周 / 杀球落地缓冲训 / NSCA-CPT 关系 / 本章行动清单 / 本章 ex-lib 引用清单」）→ manifest.json + manifest_data.js 镜像不变（均未触碰）→ 9 books × 97 chapters 拓扑不变
- **ex-lib 完整性**：re.findall 出 [ex:XXXX] = 48 条 inline 引用 × 14 个 unique id，全部在库中实证存在 (json.load) → broken = 0
- **字数计数**：原本变 5.991 KB，自现 9.426 KB，增加 +3.435 KB（+57%）

## 用户偏好兑现

- **写作双层**：12 周「第一层」中加入 4 个普通人能看懂的「居家伙助伸展」行动项；「第二层」补充 Alfredson 离心与其他动作的阶梯、与拉伸几个要点 → 双层结构在 12 周补完后真正与 4 / 8 周对齐
- **不伪造 1 个 id**：4 个本轮补进来的 [ex:1407] / [ex:1398] / [ex:1390] / [ex:1708] 都是末尾 ex-lib table 原本就许诺的 id
- **单 commit / 可独立回滚**：动手仅 1 个 ch07-achilles.md · 21+/6- 行

## commit hash

`5825260`（含 fix + ledger 记账补完）

## push 状态

github.com:443 不可达（与 round107/108/110/111/112 同问题），留待网络恢复后重试

## 下轮候选（继承 round108-112 + 本轮新发现，优先级降序）

1. **(本轮新发现, 优先级低)** ch07 第 119 行 `"[ex:1407] → [ex:1398] → [ex:1390] → [ex:1708]"` 是「拉伸梯度」议论段里把 4 个 id 全部 inlined 一次；本章总 inline count 因此 48 处；如果认为「纯议论中提及」不应计入 inline 引用 (40 处)，下轮可把这段拆为「其他 id」的写法
2. **(继承 108 轮 #4, 优先级低)** `.gitattributes` L5 `* -text` 让 manifest.json diff 显示 Binary（`1 file changed, 0 insertions(+), 0 deletions(-)`）—— 本轮走的是 markdown 不受影响
3. **(继承 108 轮 #2, 优先级低)** 7 章「English · 中文」双语 manifest 标题——是否设计意图仍未确认
4. **(继承 108 轮 #3, 优先级低)** NSCA ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2
5. **(继承 111 轮 #1, 优先级低)** 根目录 *.py 散落 75+ 个无 .gitignore 兜底——一次性补 _*.py / _*.json / _*.txt / round*.py 进 .gitignore
6. **(继承 111 轮 #3, 优先级低)** todos/round110.md 文件缺失：HEAD `2ac306b` commit message 自称「第 110 轮记账」但 ledger 文件不存在——下轮可考虑 round110 ledger 补建
7. **(继承 109 轮 #6, 优先级低)** round109/110/111/112/113 工作流暴露：扫描 manifest vs markdown 对齐需要稳定脚本——可写一个 `_drift_scan.py` 入库（不入 git），统一 `_roundNNN_*.py` 命名规范
