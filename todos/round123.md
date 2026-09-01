## 第 123 轮（commit 37eb56b）— 兑现 round121 候选 #1 第二段：badminton ch12 61 处 ex-lib 方括号格式统一 ✅ push 成功

**本轮做了什么**：

兑现 round121 候选 #1「ch08 6 处 → ch12 61 处 → ch04 79 处 ex-lib 方括号格式统一」
按相同 pattern 修复。第122轮已闭环 ch08 6 处，本轮聚焦**ch12 61 处**——单文件
60 行 ± 单 commit 内可完成，文件总字符数零变化（`]` 位置对称 ASCII 1 字节净增 0）。

### 修复点

`books/badminton/ch12-physical-training.md` 表格内 36 处 + 表格外列表项 25 处
共 61 处 `[ex:NNNN 动作名]`（动作名中英文都有：「barbell back squat」/「杠铃卧推」
/「帕洛夫推举」等）→ 统一为 `[ex:NNNN] 动作名` 规范格式（与 v3.22.32 + round120
ch09 / round122 ch08 修订后的规范一致）。

### 模式分布

- **36 处表格内**：单元格首格，如 `| [ex:0038 barbell back squat] | 杠铃背蹲 | ... |`
- **25 处表格外**：有序列表项，如 `1. [ex:1685 squat to overhead reach] 3×12`
- **50 种唯一前缀**：除 1 处原规范 `[ex:NNNN]` 外，全部为 `[ex:NNNN 空格 文本]` 模式
- **0 处后跟 ex 引用/紧跟 `]` 嵌套**：模式高度统一，无替换歧义风险

### 校验（commit 前全部跑过）

- 文件内 `[ex:NNNN] ` 规范数：1 → 62；`[ex:NNNN 文本]` bad 数：61 → 0 ✓
- 文件总字符数：65138 字节（替换前=替换后，因为 `]` 移动对称 ASCII 1 字节净增 0）
- LF 行尾保持：1336 LF / 0 CR（重要！详见下方「陷阱说明」）
- 62 处引用 / 41 unique id / 0 broken（全部 id 在 ex-lib.json 1336 条内合法）✓
- §8.4 L1004 头注「43 unique / 66 处」声明仍一致（声明数引用次数不计方括号格式，
  替换前后 §8.4 raw 引用数完全一致 = 66）✓
- `node --check app.js` ✅（未触碰 JS）
- `node --check manifest_data.js` ✅（未触碰 JS）
- `python3 -m json.tool manifest.json` ✅（未触碰 manifest）
- diff 仅 1 文件 60 行 ±（61 处格式微调）+0 字节字数变化 + 0 行尾变化

### 陷阱说明（本轮踩到后已修）

**第一次替换把整文件从 LF 改成 CRLF** —— Python `open(path, 'w', encoding='utf-8')`
在 Windows 上默认会把 `\n` 替换为 `\r\n`。立即从备份恢复，改用 `newline=''` 重写
后字节数与行尾完全一致。这是 round118 _normalize_lf.py / round120 之后所有改 markdown
文件操作的隐形陷阱——**未来所有 markdown 修改都需 `newline=''`**。

### 操作

1. `cp` 备份原文件（意外发现 Git 在 Windows 上**默认会**用 CRLF 提交 markdown，
   本环境之前提交流程可能已经容忍了这一点，但本轮为了精确最小 diff，主动强制 LF）
2. `python3 -X utf8` 脚本：re.subn 替换 + 校验前后字节数 / 行尾 / 计数
3. 第一次替换→文件变 CRLF→立即 cp 备份还原→重写（用 `newline=''`）
4. 校验 60 行 ± diff / 0 字节变化 / 0 broken / LF 保留
5. `git commit` → `37eb56b`
6. `git push origin book` → 第 5 次重试成功（816c14d..37eb56b book -> book）
   （前 4 次 github.com:443 持续 21 秒超时失败，与 round121 同源环境网络波动）

### 不在本轮做

- **ch04 79 处** 按相同 pattern 留待下轮继续清零——本轮聚焦 ch12 单文件先行闭环
- `_audit_exlib_ledger.py` 加声明数字 vs 实际计数自动报错（round121 候选 #3）——脚本扩展属
  「加大改动」类，沿用 round122 评估标准继续留观
- NSCA ch10 §七末段 v3.22 勘误史整理为附录（round121 候选 #2）——内容性改动，沿用留观

### 项目现状（commit 后）

```
全 9 本书 ex-lib 方括号格式（round120 之后累计）
  nsca-cpt/ch04            | 79 bad  ← 下轮继续
  badminton/ch12           | 0 bad ✓ ← 本轮修复
  nsca-cpt/ch08            | 0 bad ✓
  其余 11 章               | 0 bad ✓
  本轮修复：ch12 61 处清零 ✓
  累计已修（round120 + round122 + 本轮）：91 处
```

### 下轮候选（按优先级降序）

1. **(继承 round121 #1, 优先级高)** ch04 79 处 ex-lib 方括号格式统一，按相同 pattern
   （regex `\[ex:(\d{4})([^\d\]][^]]*)\]` → `[ex:\1]\2`，用 `newline=''`）
   - ch04 在 `books/nsca-cpt/ch04-strength-training.md`，正文叙事段
   - ch08 / ch12 / ch04 三件套完成后，9 本书 14 章 ex-lib 方括号格式全归零
2. **(继承 round110 #1)** NSCA-CPT ch10 §七末段 v3.22.17 / v3.22.62 / v3.22.72 /
   v3.22.74 四次勘误 blockquote 累积 580+ 字 → 整理为附录「v3.22 勘误史」独立 H2
3. **(round121 新增 #2)** `_audit_exlib_ledger.py` 加「声明数字 vs 实际计数偏差」
   自动报错逻辑（9 本书 90+ 章节手工核对不可持续）
4. **(本轮新观察, 优先级低)** Python 写入 markdown 文件**必须**用 `newline=''` 保留
   LF —— round118 _normalize_lf.py 已 normalize 过大部分文件，但**任何重新写入**
   都需重新小心。后续可建一次性检查脚本扫所有 `*.md` 是否 LF 一致（已知 ch04 也是 LF，
   现状下没问题），但属于 infra 级需求，沿用留观