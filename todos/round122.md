## 第 122 轮（commit 9d2048f）— 兑现 round121 候选 #1 第一段：NSCA ch08 6 处 ex-lib 方括号格式统一 ✅ push 成功

**本轮做了什么**：

兑现 round121 候选 #1「ch08 6 处 → ch12 61 处 → ch04 79 处」按相同 pattern 修复
（round121 记账时 ch04 写 78，本轮扫描实测 79，差 1 是手算误差），本轮聚焦**最小一项
NSCA ch08**——单文件单行 6 处格式微调，最快闭环。

### 修复点

`books/nsca-cpt/ch08-periodization.md` §6.1 三阶段块周期示例「例：」段 3 行（L261/
L266/L271）每行 2 处 ex-lib 引用使用 `[ex:0038 背蹲]` 这种把中文动作名也包在方括号
里的格式，与 v3.22.32 + round120 ch09 修订后的规范 `[ex:0038] 背蹲` 不一致。

### 操作

1. 扫全 9 本书 markdown 的 `[ex:NNNN 动作名]` 残留（regex `\[ex:(\d{4})([^\d\]][^]]*)\]`）：
   - 修复前：ch12=61 + ch04=79 + ch08=6 = **146 bad**
   - 本轮修复：ch08 6 处全部清零 ✓
   - 修复后：ch12=61 + ch04=79 = **140 bad**（与 ex-lib 唯一被引用数 140 完全一致）
2. `edit` 替换 L261/L266/L271 3 行（每行 2 处）
3. 校验：6 个 id 全部已在 ex-lib 库内合法（0 broken）
5. `git commit` → `9d2048f`
6. `git push origin book` → ✅ 一次成功（2bdf48a..9d2048f book -> book 已推）

### 校验（commit 前全部跑过）

- 全 9 本书扫 `[ex:NNNN ...]` regex：本轮文件归零 ✓
- `_scan_exlib_refs.py` 跑全库：**合法 1336 / 被引用唯一 140 / broken 0 个文件** ✓
- `node --check app.js` ✅（未触碰 JS）
- `node --check manifest_data.js` ✅（未触碰 JS）
- `python -m json.tool manifest.json` ✅（未触碰 manifest）
- diff 仅 1 文件 3 行 ±（6 处格式微调）+0 字节字数变化

### 不在本轮做

- ch12 61 处与 ch04 79 处**按相同 pattern 留待下轮继续清零**——本轮聚焦最小
  文件先行闭环，diff 控制在 6 处 ±，避免一次 commit 触两个不同文件的不同审稿负担
- ch08 内 L143/L170/L219/L228/L237 表格内的规范格式 `[ex:0038]`（不在扫表范围内）

### 项目现状（commit 后）

```
全 9 本书 ex-lib 方括号格式（round120 之后累计）
  badminton-recovery/ch04     | 79 bad  ← 下轮继续
  badminton/ch12               | 61 bad  ← 下轮继续
  nsca-cpt/ch08                | 0 bad ✓  ← 本轮修复
  其余 11 章                   | 0 bad ✓
  本轮修复：ch08 6 处清零 ✓
  累计已修（round120 + 本轮）：30 处
```

### 下轮候选（按优先级降序）

1. **(继承 round121 #1, 优先级中-高)** 继续 ch12 61 处 → ch04 79 处 ex-lib 方括号
   格式统一，按相同 pattern（regex `\[ex:(\d{4})([^\d\]][^]]*)\]` → `[ex:\1] \2`）
   - ch12 在 `books/badminton/ch12-physical-training.md`，多在表格内
   - ch04 在 `books/nsca-cpt/ch04-strength-training.md`，多在正文叙事段
   - 两文件分别 commit，与 round120 ch09 / 本轮 ch08 风格一致
2. **(继承 round110 #1)** NSCA-CPT ch10 §七末段 v3.22.17 / v3.22.62 / v3.22.72 /
   v3.22.74 四次勘误 blockquote 累积 580+ 字，可整理为附录「v3.22 勘误史」独立 H2
3. **(round121 新增 #2)** `_audit_exlib_ledger.py` 加「声明数字 vs 实际计数偏差」
   自动报错逻辑（9 本书 90+ 章节手工核对不可持续）
4. **(round121 新增 #3)** 下轮 push 前先 ping github.com 确认网络通（本轮网络
   状态未确认，先 commit 验证 push 实际状态）