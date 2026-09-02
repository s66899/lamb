# Round 157 — badminton-recovery ch06 + ch07 §与 NSCA-CPT ch09 关系映射表虚假子节引用修复

**起点状态**：HEAD = `9a75ae8`（round156 记账：README 顶层汇总行 inline 计数 drift 修复），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0）

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看历史 round156/155/154/153/152 全部围绕「ch01-ch08 章节升级版对齐 + 红旗信号 + 时间线」主题 → `ls books/badminton-recovery/` 8 章 + `wc -l` 发现 ch06/ch07 最短（均 217 行）→ 用 `grep "ch09 第 [0-9]\.[0-9] 节"` 扫全 8 章的 NSCA-CPT ch09 子节引用 → **真实交叉引用 bug 发现**：

### Bug 根因

ch06 §与 NSCA-CPT ch09 第 5 节的关系映射表引用了「ch09 第 5.3 节」和「ch09 第 5.4 节」——但 NSCA-CPT ch09 第 5 节（腰部康复）实际**只含两个 H3 子节**：
- `### 5.1 非特异性腰肌劳损（最常见）`（line 373）
- `### 5.2 椎间盘突出`（line 420）

不存在 5.3 / 5.4。**原映射表把 4 / 8 / 12 周时间线机械对应到 5.1/5.2/5.3/5.4 四个子节，但 ch09 §5 实际只有 2 个子节，5.3 / 5.4 是占位用的虚构锚点。**

ch07 §与 NSCA-CPT ch09 第 6 节的关系映射表引用了「ch09 第 6.2 节 / 第 6.3 节 / 第 6.4 节」——但 ch09 第 6 节（跟腱康复）实际**只有一个 H3 子节**：
- `### 6.1 跟腱炎 / 跟腱病`（line 428）

不存在 6.2 / 6.3 / 6.4。**更糟的是，ch09 §6.1 内部已经包含了 4 / 8 / 12 周时间线段落**（line 466-469 的「4 周：离心训练 + 冰敷 + NSAIDs / 8 周：力量耐力建立 / 12 周：可开始专项羽毛球训练 / 6 个月：完全恢复」），原映射表的 4 行全部指向不存在的位置，读者点击 ch07 跳到 ch09 后找不到对应小节。

### 扫表确认其他章节干净

- **ch05 §十互引表**（line 273-281）引用 ch09 第 4.1 节 / 第 4.2 节 — 实际 ch09 §4 有 `4.1 网球肘`（line 309） + `4.2 高尔夫球肘`（line 360）**两个子节都存在** ✓
- **ch04 §互引表**（line 232-244）仅用「ch09 §3 踝关节康复」H2 级引用 + §3.1 / 3.2 不存在具体编号 → **未涉及 4 位子节编号虚假引用** ✓
- **ch08 §五** 与 **§六** 的 NSCA ch09 + 羽毛球 ch12 互引表只到 H2/H3 编号（如 ch09 第 5 节 / ch12 9.5 节）— 不涉及 4 位虚假子节引用 ✓

**结论**：bug 局限在 ch06 + ch07 两个 mapping 表，5 处虚假子节引用。

### 修复策略

**ch06 §与 NSCA-CPT ch09 第 5 节的关系**（腰部）：
- 信号识别行：原 `ch09 第 5.1 节` → 改 `ch09 第 5 节首段（5.1 腰肌劳损 + 5.2 椎间盘）`
- 4 周时间线行：原 `ch09 第 5.2 节` → 改 `ch09 第 5.1 节（非特异性腰肌劳损）`（轻症肌肉劳损对应 5.1）
- 8 周时间线行：原 `ch09 第 5.3 节`（虚假）→ 改 `ch09 第 5.2 节（椎间盘突出）`（椎间盘膨出对应 5.2）
- 12 周时间线行：原 `ch09 第 5.4 节`（虚假）→ 改 `ch09 第 5.2 节（椎间盘突出）`（重度椎间盘突出对应 5.2）

**ch07 §与 NSCA-CPT ch09 第 6 节的关系**（跟腱）：
- 信号识别行：原 `ch09 第 6.1 节` → 改 `ch09 第 6 节首段（6.1 跟腱炎 / 跟腱病）`
- 4 周时间线行：原 `ch09 第 6.2 节`（虚假）→ 改 `ch09 第 6.1 节"4 周：离心训练 + 冰敷 + NSAIDs"`（引用 §6.1 内已有 4 周时间线段落）
- 8 周时间线行：原 `ch09 第 6.3 节`（虚假）→ 改 `ch09 第 6.1 节"8 周：力量耐力建立，可恢复日常活动"`（引用 §6.1 内已有 8 周时间线段落）
- 12 周时间线行：原 `ch09 第 6.4 节`（虚假）→ 改 `ch09 第 6.1 节"12 周：可开始专项羽毛球训练（轻量）"`（引用 §6.1 内已有 12 周时间线段落）

**额外加 blockquote 互引表说明**：每章末补一段「互引表说明」block quote，解释为何原编号不存在 + 列出 ch04/ch06/ch07 三章的子节密度（3.1/3.2 / 5.1/5.2 / 6.1）形成统一基线，便于未来读者交叉对照。

## 校验

- `node _scan_exlib.js` → `ex-lib total ids: 1336 / total refs = 621 / broken = 0` ✓（与改前一致，零 ex-lib id 改动）
- `python _audit_exlib_ledger.py` → `# audit 106 book chapter files / ✅ all declared counts match actual inline counts` ✓（106 章声明 vs 实际 inline 0 drift）
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK（未改动）✓
- `node --check` 未涉及（纯 .md 文字修改）✓
- ch06 inline 46 / unique 16 不变；ch07 inline 51 / unique 14 不变；README.md 顶层「251 inline / 64 unique / 0 broken」声明仍成立 ✓
- LF-only / 0 CRLF / 0 lone CR / endswith LF ✓（注意：本轮 edit 工具首次写入时被 Windows git autocrlf 警告「LF will be replaced by CRLF」，Python 校验发现 CRLF=219 处，已用 `raw.replace(b'\r\n', b'\n')` 一次性修复，最终字节级校验 0 CRLF；沿用 round144+ 同型教训）
- `git diff --stat` → `2 files changed, 12 insertions(+), 8 deletions(-)` ✓
- APP_VERSION 5 维度体检：app.js `v3.22.63` / index.html 三处 `?v=v3.22.63` / README.md / books/README.md / VERSION 头注释全部一致，**drift 0/0**，无需 bump ✓
- 零业务代码改动；零 ex-lib id 改动；零 manifest.json 改动；零 ch02-ch05 / ch08 改动

## 落地

- commit `3dc613a`：`fix(badminton-recovery): ch06 + ch07 §与 NSCA-CPT ch09 关系映射表虚假 5.3/5.4/6.2/6.3/6.4 节引用修复`
- push `book`：`9a75ae8..3dc613a` ✅（首次直连成功）

## 上轮候选清算（本轮重扫）

- ✅ **(本轮已修)ch06 + ch07 §NSCA-CPT ch09 互引表虚假子节引用** — 扫表发现的真实交叉引用 bug，候选作废
- ✅ **(继承远期,优先级低)** NSCA-CPT ch03 anatomy 全文 326 行但 inline 只 6 处集中在 §11.1 自检表：仍未推进
- ✅ **(继承远期,优先级低)** NSCA-CPT ch07 柔韧性章节 SMR / 拉伸动作密度核查：仍未推进
- ✅ **(继承远期,优先级低)** 羽毛球 README.md / 书籍封面 ch01 红旗升级后引言段：仍未推进
- ✅ **(继承远期,优先级低)** APP_VERSION bump：远期继承
- ✅ **(继承远期,优先级低)** L# 改进：远期继承
- ✅ **(继承远期,优先级低)** 根 README「每章 60/30/10」核实：远期继承

## 新增下轮候选

- **(本轮新发现,优先级低)** ch08 §五「与 NSCA-CPT ch09 的互引表」只到 H2 级「ch09 第 2 节 / 第 1 节 / 第 3 节 / 第 4 节 / 第 5 节 / 第 6 节」，无虚假子节编号 ✓（扫表干净）；ch08 §六「与羽毛球 ch12 第九节的互引表」指向 9.1-9.6 实际存在 ✓（扫表干净）—— ch08 互引表完整无 bug，无需修
- **(本轮新发现,优先级低)** 其他书的「与 NSCA-CPT ch09 互引表」是否也有虚假子节编号？目前只扫了羽毛球康复书 8 章 + NSCA-CPT 10 章自身 + 羽毛球 ch12 第九节；其他书（finance / yin-yang / psychology / competition / engineering-mechanics / nutrition）的 ch09 互引情况未扫 — 优先级低，可远期处理
- **(本轮新发现,优先级低)** 羽毛球 ch12 §9 互引表（line 1002 / 1037-1040 / 1052-1057）虽然「9.1-9.6 损伤康复专项」等 H3 都真实存在，但里面写的「REST → LOAD → PLAY 三阶段 → 9.1-9.6 康复时间线」映射与 ch09 §3.1 原文是否字字对齐？ch09 §3 实际是踝关节康复而非 REST/LOAD/PLAY 三阶段（REST/LOAD/PLAY 在 §0 总论 line 57）—— ch12 §9 的该行可能存在章节归属错位；优先级低，可远期处理
- **(继承远期,优先级低)** _session_todo.md 现 2000+ 行远期归档
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库

## commit hash

- `3dc613a`（本轮已 commit，已 push `9a75ae8..3dc613a`）
