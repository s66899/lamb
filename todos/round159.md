# Round 159 — badminton-recovery ch03 §7.1 第二行「ch09 第 2 节（功能性筛查）」双重虚假锚点修复

**起点状态**：HEAD = `127afec`（round158 记账：ch08 §六互引表补 ch12 9.7+9.8 收官节两行），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0）

## 本轮做了什么

**选题过程**：按指令跑真实状态扫描 → `git log --oneline -10` 看历史 round153-158 全部围绕「ch01-ch08 章节升级版对齐 + 红旗信号 + 时间线 + 互引表 + 占位符清理」主题 → 上一轮（round158）已修 ch08 §六羽毛球 ch12 第九节互引表漏列 9.7+9.8 收官节 + round157 已修 ch06/ch07 与 NSCA-CPT ch09 互引表虚假 5.3/5.4/6.2/6.3/6.4 子节引用 → 本轮扫描方向：**ch03 §7.1 NSCA-CPT ch09 互引表锚点是否真实**。

### Bug 根因（ch03 §7.1 第二行双重虚假锚点）

ch03 §7.1 NSCA-CPT ch09 互引表原 line 251：

```
- **ch09 第 2 节**（功能性筛查）：本书第五部分的 8 周检验标准对应
```

**双重事实错误**：

1. **ch09 第 2 节实际是「肩关节康复」**（不是功能性筛查，更跟膝关节无关）：
   - `books/nsca-cpt/ch09-injury-prevention.md` L189-242 实际结构是「第 1 节·膝关节康复 / 第 2 节·肩关节康复 / 第 3 节·踝关节康复 / 第 4 节·肘关节康复 / 第 5 节·腰部康复 / 第 6 节·跟腱康复」共 6 大损伤节——**没有「功能性筛查」独立节**。
2. **「功能性筛查 / FMS / functional movement screen」在 NSCA-CPT 全 10 章中不存在**——grep 全库只在 ch01 line 12 出现「功能性训练、矫正训练」一次（NASM-CPT 对比表里），NSCA-CPT 自身未引入 FMS 术语。

ch03 §7.1 第二行意图是说「本书第五部分『羽毛球专项回归检验』的 8 周检验标准 ↔ ch09 内某处回归测试段落」，但写成了「ch09 第 2 节（功能性筛查）」——既锚错章节又虚构术语。ch09 第 1.1 节末段（line 121-123）已真实存在「回归标准：VISA-P 问卷 ≥ 80/100 + 单腿跳跃测试双侧差异 < 10% + 专项跳跃测试双侧差异 < 15%」，正好对应 ch03 第五部分 4/8/12 周检验标准。

### 修复策略

往 ch03 §7.1 替换第 2 行：

- **旧**：`ch09 第 2 节（功能性筛查）：本书第五部分的 8 周检验标准对应`
- **新**：`ch09 第 1.1 节末「回归标准」（VISA-P 问卷 ≥ 80/100 + 单腿跳跃测试双侧差异 < 10% + 专项跳跃测试双侧差异 < 15%）：本书第五部分「羽毛球专项回归检验」的 4 / 8 / 12 周检验标准对应` + 末尾 blockquote 解释（与 ch06/ch07 上一轮占位符清理一致——ch06 清理 5.3/5.4 虚构 + ch07 清理 6.2/6.3/6.4 虚构均在 round157 修复；ch03 本轮清理 2.0 节虚构）

### 扫表确认范围

- `node _scan_exlib.js`：1336 ids / 621 refs / broken=0（与改前一致）✓
- `python _audit_exlib_ledger.py`：106 章 audit 通过，"✅ all declared counts match actual inline counts" ✓
- `python -m json.tool manifest.json` OK（未改动）✓
- `python -m json.tool books/exercises/ex-lib.json` OK（未改动）✓
- ch03 LF-only / 0 CRLF / 0 lone CR / endswith LF ✓
- `git diff --stat` → `1 file changed, 1 insertion(+), 1 deletion(-)` ✓（单行替换）
- ch03 inline 16 / unique 9 / broken 0 不变 ✓（与 README 声明对齐）
- APP_VERSION 5 维度体检未触发（未触及 app.js / index.html / README.md L「当前版本」/ books/README.md L11 / VERSION 头注释），无 bump ✓
- 零业务代码改动；零 ex-lib id 改动；零 manifest.json 改动；零 ch01/ch02/ch04/ch05/ch06/ch07/ch08 改动

## 校验

- `node --check` 未涉及（纯 .md 文字修改）✓
- `python -m json.tool manifest.json` OK ✓
- `python -m json.tool books/exercises/ex-lib.json` OK ✓
- ch03 inline 16 / unique 9 / broken 0 与 README 声明一致 ✓
- LF-only / 0 CRLF / 0 lone CR / endswith LF ✓
- `git diff --stat` → `1 file changed, 1 insertion(+), 1 deletion(-)` ✓

## 落地

- commit `7e307bd`：`fix(badminton-recovery): ch03 §7.1 第二行「ch09 第 2 节（功能性筛查）」双重虚假锚点修复（改为 ch09 第 1.1 节末「回归标准」+ blockquote 解释；与 ch06/ch07 占位符清理一致；零 ex-lib id 改动；ch03 inline 16/unique 9/broken 0 不变；APP_VERSION 不 bump）`
- push `book`：**第 1/2/3 次 push 均失败**（github.com:443 连接超时 21s × 3），commit 已落本地仓库 `7e307bd`，待网络恢复后重试 `git push origin book` 完成远端同步

## 上轮候选清算

- ✅ **(本轮已修)ch03 §7.1 第二行「ch09 第 2 节（功能性筛查）」双重虚假锚点** — 候选作废
- 🟡 **(继承,优先级中)** NSCA-CPT ch10 §七末段 v3.22.17/62/72/74 四次勘误 blockquote 累积 580+ 字：仍未推进
- 🟡 **(继承,优先级中)** ch07 12 周时间线段补强 5 个 inline 动作：仍未推进（但 ch07 现有 51 inline 已经超过 ch06 46，多了反而冗余，可能不再必要）
- 🟡 **(继承,优先级中)** push 重试：本轮 commit `7e307bd` 已落本地但 push 失败 3 次（github.com:443 持续超时），需要重试
- 🟢 **(继承,优先级低)** NSCA-CPT ch03 anatomy 全文 326 行但 inline 只 6 处集中在 §11.1 自检表：仍未推进
- 🟢 **(继承,优先级低)** NSCA-CPT ch07 柔韧性章节 SMR / 拉伸动作密度核查：仍未推进（本轮确认 ch07 359 行 / 10 节结构完整 / 关联 ex-lib 引用 11 处，唯一缺口 = 完全缺 SMR/foam roller/筋膜球段，但本轮主张不在 ch07 加入 SMR 段，因为 ch02-ch07 七章 SMR 由 ch10 §2.1 SMR 引用表统一管，新加会重复）
- 🟢 **(继承,优先级低)** APP_VERSION bump：未触发
- 🟢 **(继承,优先级低)** L# 改进：远期继承
- 🟢 **(继承,优先级低)** 根 README「每章 60/30/10」核实：远期继承

## 新增下轮候选

- **(本轮新发现,优先级中)** ch03 §7.3 现只列出「ch12 9.1 + ch12 9.7」两行——ch08 §六已补 9.8「互引表」，ch03 §7.3 仍漏 9.8——这是 round158 已识别的「ch03 vs ch08 对称不对称」的延续问题。本轮没动是因为 round158 评估「ch03 既然已无任何 ch04-ch07 的章节，再加 9.2-9.6 反而是越界扩容」；但**ch03 §7.3 漏 9.8 是不同问题**——9.8 互引表是「全章共用」，与 ch03 第一节「ch12 9.1 膝关节康复」配对（「膝章节摘要 + 互引表导航」），与 9.2-9.6（其他部位摘要）性质不同。下轮可单独补 1 行（ch12 9.8 本节与 NSCA-CPT ch09 + ex-lib 互引），保持 ch03 §7.3 与 ch08 §六「全章共用」两行完全对称。
- **(本轮新发现,优先级低)** ch03 §7.1 第一行「ch09 第 1 节（膝关节康复原则）」与第七部分第 1 节匹配但描述偏简——ch09 第 1 节实际含 1.1 髌腱炎 / 1.2 半月板 / 1.3 髌骨软化 3 个 H3 子节，本书第三部分 8 周时间线讲的是「单腿力量回归 + 保加利亚蹲代用」，对应 ch09 第 1.1 节髌腱炎 + 部分第 1.2 节半月板。可远期把第一行也细化到具体子节，但本轮已用 blockquote 说明，已是合理精度。
- **(本轮新发现,优先级低)** 羽毛球康复书 8 章「与 NSCA-CPT ch09 关系」互引表存在 5 种不同的颗粒度（ch02 = 仅 1 句概述 / ch03 = §7.1 两条 bullet / ch04 = 表格 + 库内暂无说明 / ch05 = 表格 8 行 / ch06 = 表格 + 占位符清理 blockquote / ch07 = 表格 + 占位符清理 blockquote / ch08 = §五+§六两张总表）——结构差异是事实存在，但历轮已确认这是「按损伤特性定制」的设计选择，不修。
- **(继承远期,优先级低)** _session_todo.md 现 2000+ 行远期归档
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库（库内 18 泡沫轴 + 2 筋膜球均无 lumbar 系列；ex:5212 thoracic spine 是最近邻）

## commit hash

- `7e307bd`（本轮已 commit；push 待重试 — github.com:443 持续 21s 超时 ×3）
