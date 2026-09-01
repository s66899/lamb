## 第 120 轮 — NSCA-CPT ch09 24 处 ex-lib 方括号格式统一

**commit**: `849c3e6` fix(nsca-ch09): 24 处 ex-lib 引用方括号格式统一为 [ex:NNNN] 动作名（v3.22.32 修订漏扫部分）
**push**: ✅ `7b6d40b..849c3e6 book -> book`（第 2 次重试成功，第 1 次 github.com:443 超时与 round118 同源网络波动）

### 本轮做了什么

#### 触发

round119 已完成 manifest yin-yang totalWords 修复，剩余优先级队列里最大的一项是"羽毛球康复书内容深化 / NSCA ch10 SMR 入库 / 其他薄弱章节校对"。本轮扫全 9 本书发现一个**真实存在但未被发现**的格式质量问题：

全项目 9 本书扫描 `[ex:NNNN]` 方括号格式不统一的存量：

| 文件 | good 规范格式 | bad 不规范格式 |
|------|--------------|----------------|
| nsca-cpt/ch04-strength-training.md | 0 | **78** |
| badminton/ch12-physical-training.md | 1 | **61** |
| nsca-cpt/ch09-injury-prevention.md | 36 | **24** |
| nsca-cpt/ch08-periodization.md | 28 | 6 |
| **合计** | | **169** |

羽毛球康复书 8 章 + NSCA-CPT ch05/06/07/10 已 100% 规范（v3.22.32 那次修订"ch10 三处 ex-lib 表格统一"覆盖了 ch10，但漏扫了其他章节里同样问题更严重的文件）。典型 bad pattern：

```
旧: | 单腿罗马尼亚硬拉 | [ex:0980 band bent-over hip extension] | ...
新: | 单腿罗马尼亚硬拉 | [ex:0980] band bent-over hip extension | ...
```

#### 选型理由

候选清单：

1. **NSCA-CPT ch09 24 处 ex-lib 方括号格式统一** —— **本轮选**
2. NSCA-CPT ch04 (78 处) / badminton/ch12 (61 处) / NSCA-CPT ch08 (6 处) 同样问题但量更大 —— 留作下轮
3. badminton-recovery 各章内容深化（双层结构继续细化） —— 大改动
4. NSCA-CPT ch10 SMR 条目入库 —— 已完成（v3.22.17），无新需求

选 1 的原因：
- **粒度可控**：24 行纯格式微调，单文件单字段，单 commit 可独立回滚
- **真问题**：用户点击 `[ex:0980 band bent-over hip extension]` 这种方括号连动作名一起包的引用时，app.js 的 `\[ex:(\d{4})\]` 正则识别不出，跳转逻辑失效 → 用户看不到动作详情
- **可自动校验**：`grep -E '\[ex:[0-9]{4}\s+[^\]]+\]'` 一行命令能扫出所有 bad-format
- **零内容风险**：diff 是 24 insertions / 24 deletions（纯空格 + 方括号位置调整），行内其他文字（包括 '(轻负荷)' '（温和）' '（负重）' 等中文括号注释）原位置完整保留

#### 操作

1. 扫全 9 本书 → 169 处 bad-format，本轮先清 ch09（24 处）
2. Python 正则批量替换：`\[ex:(\d{4})\s+([^\]]+)\]` → `[ex:$1] $2`
3. 校验：unique id 全部已在库内合法（23 unique / 0 broken）、§5/§7/§8 已是规范格式未动、24 行 diff 全为格式微调零内容变更
4. `git commit` → `849c3e6`
5. `git push origin book` → `7b6d40b..849c3e6 book -> book`（第 2 次重试成功）

#### 替换清单（按章节段）

- §1 膝关节康复表 5 行（L95-99）
- §1.2 半月板损伤阶段表 4 行（L150-153）
- §2 肩关节康复阶段表 4 行（L213-216）
- §3 踝关节康复阶段表 3 行（L272/274/275）
- §4 肘关节康复表 1 行（L334）
- §4 文字段 3 行（L365-367）
- §6 跟腱康复表 5 行（L448-452）

#### 校验（commit 前全部跑过）

- ex-lib unique id 全部已在库内合法（23 unique / 0 broken）
- `\[ex:(\d{4})\]` 规范格式：36 → **60**（+24）
- `\[ex:(\d{4})\s+[^\]]+\]` 不规范格式：24 → **0**（-24）
- §5 表格（已经是规范的）、§7 损伤预防训练模板（已经是规范的）、§8 与 ch12 互引表（已经是规范的）零变更
- 所有 24 行的中文括号注释（(轻负荷) / （温和） / （负重） 等）原位置完整保留
- 章节中文字数 ±0（纯格式微调）
- manifest.json / manifest_data.js / app.js 均未触碰（diff 仅 ch09 一个文件）
- `python -m json.tool manifest.json` VALID
- `node --check app.js` OK
- `node --check manifest_data.js` OK
- 其他 8 本书 145 处 bad-format 残留未动（按相同 pattern 留待下轮）

### 项目现状（commit 后）

```
羽毛球康复书 8 章         | 0 bad-format ✓
badminton/ch12            | 61 bad  ← 下轮候选
nsca-cpt/ch04             | 78 bad  ← 下轮候选
nsca-cpt/ch05/06/07/10    | 0 bad ✓
nsca-cpt/ch08             | 6 bad   ← 下轮候选（顺手清即可）
nsca-cpt/ch09（本轮清完）  | 0 bad ✓
```

### 下轮候选（按优先级降序）

1. **(本轮观察, 优先级中)** NSCA-CPT ch04 78 处 + badminton/ch12 61 处 + NSCA-CPT ch08 6 处 = **145 处 ex-lib 方括号格式不统一**（v3.22.32 修订漏扫的 ch04/ch08/ch09/ch12，与本轮 ch09 同 pattern）。三处文件分别处理即可，每处都是单文件单 commit 可独立回滚。最优顺序：ch08 (6 处最小，先清) → ch12 (61 处) → ch04 (78 处最多留专项)。
2. **(继承 round119 #1, 优先级低)** 4 本书 chapter-level declared vs actual_zh drift 0.28-0.67 是否需要在 manifest schema 加"声明 vs 实际 zh 偏差 ≤N%"的稳态定义注释 — 防 round117 类事故复发的根本措施。
3. **(本轮新观察, 优先级低)** 羽毛球康复书 ch02 §八"按人群行动清单" vs ch08 §二"按人群行动清单"存在部分重叠 — 是否需要在 ch02 加一句"完整版见 ch08 §二"指引避免用户困惑。
4. **(本轮新观察, 优先级低)** ch08 §一.1 肩关节速查表"8 周方案：弹力带外旋（[ex:0864] dumbbell upright shoulder external rotation，无器械可用弹力带）"——ex:0864 实为哑铃 90/90 外旋动作，与"弹力带外旋"措辞略不匹配，但作为"代用描述"勉强说得通，建议下轮把 ex:0864 替换为更贴近早期弹力带外旋的 [ex:0235] cable standing shoulder external rotation。