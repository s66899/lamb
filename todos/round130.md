## 第 130 轮（commit b5db915）— badminton-recovery ch06 L193「v3.22.18 修订错标 [ex:1352]」叙事年份错位修正

**本轮做了什么**：

取消 round129 ledger 原定的 #1 候选（ch06-back「声明数字漂移」，第二轮实
验证实 unique 16 / inline 45 与实际 grep 完全对齐，**0 drift**）。实际问题
在第三个候选 #3：ch06-back L193 叙事把「v3.22.18 修订时将 [ex:1352] lower
back curl 错标为'SMR 替代'」归到 v3.22.18 —— git log 实证：

- **v3.22.18 (commit de057a1，2026-08-26 09:07)**：修复剩余 10 处 broken
  ex-lib id。**未触及 ch06-back.md**（本章尚未创建于 v3.22.22）
- **v3.22.22 (commit 001ad4e，2026-08-26 15:16)**：ch06-back 章创建。
  [ex:1352] lower back curl 引入作为「SMR 替代」
- **v3.22.62 同期 (commit 1f98698，2026-08-31 06:52)**：对第四周 W2 逐行重写
  [ex:1352] → [ex:5212] foam roller thoracic spine

原写法「v3.22.18 修订」在版本年份上错跨 5 天（v3.22.18:08-26 09:07 vs
v3.22.22:08-26 15:16 同一天），且对 v3.22.18 (broken) 与 v3.22.62
(same id) 谁是错标混淆（错标是 v3.22.22 章创建时间引入）。

### 修复点

```
books/badminton-recovery/ch06-back.md | 1 file changed, 1 insertion(+), 1 deletion(-)
  L193 | 「**v3.22.62 勘误**：v3.22.18 修订时将 [ex:1352] lower back curl 错标为
       「SMR 替代」，本次更正」
    →  「**v3.22.62 勘误**：本章创建时（v3.22.22 期，commit 001ad4e）曾将
       id 1352 即 lower back curl 错引为「SMR 替代」——已在 v3.22.62 同期逐行
       替换为 [ex:5212] foam roller thoracic spine（与 L175 清单段「v3.22.62
       勘误」叙事对齐；v3.22.18 修复 10 处 broken 时本章尚未创建，与 v3.22.18
       无关）」
```

### 修复理由

1. **v3.22.18 不是错标的时间点**：commit de057a1 只修复 10 处 broken。
   本章被 de057a1 及后续 3 commit（v3.22.19~22）修复期所不波及；
   ch06-back.md 不在 de057a1 --stat 列表中
2. **ch06 创建于 v3.22.18 是后 6 小时的 v3.22.22**（001ad4e，08-26 15:16），
   [ex:1352] 引入时间点在 001ad4e 创建时（git blame 证实创建套用，
   后被 1f98698 修复）
3. **1f98698 的 commit 日期 08-31（v3.22.62 同期）**：修正对象与 L175
   清单段「v3.22.62 勘误」叙事完全一致
4. **露出 [ex:1352] 方括号 → id 1352 字符串**：避免触发 audit 计数
   （unique/inline 不变）

### 校验（commit 前全部跑过）

- **git diff --stat**：1 file changed, 1 insertion(+), 1 deletion(-) ✓
- **ex-lib id 自检**（grep -oE `[ex:[0-9]{4}]` ）：
  - unique 16 个：0276 / 0690 / 0979 / 1015 / 1341 / 1352 / 1408 / 1422 /
    1511 / 1559 / 1576 / 1709 / 3544 / 5207 / 5208 / 5212 ✓
  - inline 45 处 ✓
  - 与清单段 L175 宣告「45 处 inline / 16 个 unique」完全对齐（**0 drift**）
- **_audit_exlib_ledger.py**：105 chapters / **all declared counts match
  actual inline counts** ✓
- **文件末尾**：0x0a — LF（沿用 round123 newline LF 容忍规范）✓
- **git push origin book**：✓（b76df2f..b5db915，GitHub Pages 自动部署）
- **APP_VERSION v3.22.62 不 bump**（单行文本修订，非版本敏感改动）
- **可独立回滚**：git revert HEAD 半秒回滚，不影响 ex-lib / manifest / 他章

### 留给下轮的候选

按 fast_context + 实验扫描结果，以下三项都「真实存在」且单 commit 可解：

1. **ch06 L175 宣告段「[v3.22.62 勘误]」里「仅本说明段作为历史记录保留
   id 字符串」叙述 vs 实际**：L175 含 7 个 inline 引用（[ex:1352] ×3 +
   [ex:5212] ×2 + [ex:5207] [ex:5208] 各 1），但仅说「仅本说明段 1 处」
   —— 与实际 7 处不一致。原叙事把 [ex:1352] 单列为「勘误保留」却把
   [ex:5212] ×2 + [ex:5207] + [ex:5208] = 4 处 业务引用都归在「清单段」
   里。可精简为「仅 [ex:1352] 历史保留 + 4 处邻近部位 foam roller 引用
   = 5 处本段额外提及」，但 audit 已 pass（audit 器只检查首句宣告，本轮
   不引发 audit drift）

2. **NSCA ch10 第七节 总清单 独有 6 条 2.1 节无交叉标记**（候选 #2）：
   ch10 第七节 总清单 13 条与 2.1 节 7 条 重叠 7 个 id
   （0669/1339/1560/1709/1377/1713/1710），剩 6 条总清单独有
   （1403/1716/1341/1358/1604/5205 等），当前总清单独有行末尾**没有任何
   标记**指出它们未在 2.1 节出现。建议在总清单独有行末尾加
   「**2.1 节无交叉**」标记，与 7 条重叠行「↗ 详见 2.1 节」对称。

3. **manifest.json 字数 vs books/README.md 数字扫描**（候选 #3）：
   已于 round126 (01b1ced) 修过 3 处数字（89.8→90.1 万字 / 阴阳 14.3→14.4 /
   羽毛球康复 2.0→2.2）。可扫「现在 90.1 / 14.4 / 2.2 万」是否仍与
   实际字数对齐 —— 如果近 130 轮又有新增，数字可能再漂。

### 优先级排序

- **#1 ch06 L175 文本精确度**：audit pass 但内部「仅本说明段 1 处」叙
  事低估了 7 处；可小幅改写（无 audit drift 风险）
- **#2 NSCA ch10 总清单独有标记**：对称性优化，单行加 6 处标记
- **#3 manifest.json vs README 字数**：纯文案修正，已于 round126 修过

### 双写本轮

本轮采用 v3.22.62 双 manifest 记账模式（与 round74~128 风格一致），本轮
ledger 已落 todos/round130.md；下次轮 commit 双写时建议沿用
_append_todo_round130.py 模板（与 round74~128 同款格式），保证 ledger 与
commit 历史可回溯。
