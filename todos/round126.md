## 第 126 轮（commit 5020ac5）— books/README.md 3 处数字与 manifest.json 实时对齐

**本轮做了什么**：

兑现 round125 候选 #4（新发现 #2）的子集——扫所有"元数字"声明与 manifest.json 是否漂移。
现扫到 `books/README.md` 共 **3 处**轻微漂移，单文件单 commit 修复：

| 位置 | 原文 | 改后 | 漂移来源 |
|---|---|---|---|
| L11 总数 | `9 本书 / 97 章 / 89.8 万字` | `9 本书 / 97 章 / 90.1 万字` | 三本书字数累积上溢 0.3 万 |
| L19 阴阳 | `14.3 万` | `14.4 万` | 143788 字四舍五入 |
| L21 羽毛球康复 | `2.0 万` | `2.2 万` | 21701 字四舍五入 |

### 真实 bug 来源

`books/README.md` 是 9 本书的**对外目录页**（GitHub 项目根 / `https://s66899.github.io/lamb/`
二级入口），数字必须与 manifest.json 严格对齐，否则读者打开 manifest 与 README 一对比
会误判字数虚标 / 缩水。本轮实测：

- `python3 -m json.tool manifest.json` 全 9 本书 totalWords 累加 = **900518 字 = 90.1 万**
- README 累加声明值 = `89.8 万` —— 漂移 +0.3 万 ≈ +0.33%

按 README 自身的舍入精度（保留 1 位小数），总数字必须 1 位精对齐，单本书同样 1 位精对齐。

### 校验（commit 前全部跑过）

- 单文件单 commit 改动（3 insertions / 3 deletions；字节数 2041 不变）
- `python3 -m json.tool manifest.json` ✅（未触碰 manifest）
- LF 行尾保持：57 LF / 0 CR ✓（沿用 round124 newline LF 容忍规范）
- `git diff --stat` 仅 books/README.md 1 文件 6 行 ±（3 处替换）✓
- 三处数字与 manifest.json `totalWords` 字段四舍五入到 0.1 万完全一致
- Git warning `LF will be replaced by CRLF`：预期，沿用现状

### push 状态 — ✅

- `git push origin book` → ✅ 成功
- `6a7105d..5020ac5 book -> book`
- GitHub Pages 端**已触发自动部署**，3 处新数字上线

### 不在本轮做

- **round125 候选 #2 / #3**：NSCA ch10 §七末段 v3.22 勘误史整理为附录 +
  `_audit_exlib_ledger.py` 加声明数字 vs 实际计数自动报错——前者内容性大改，
  后者脚本扩展，两项沿用留观
- **羽毛球康复书内容深化**（round119 #1）——内容性大改动
- **round125 #1** 「把 round124 / round125 push 成功 fact 补回 round124 todo」
  ——这是 ledger 元数据二次返工，相对增量信息有限，留观

### 项目现状（commit + push 后）

```
版本同步     | app.js/manifest_data.js/index.html APP_VERSION 一致 v3.22.62 ✓
ex-lib 健康  | 597 处引用 / 0 broken id ✓
跨链健康     | 0 broken ✓
manifest 健康| 9 本书 / 9 注册 / 14 章 chXX 文件全对齐 ✓
chXX 文件注册| 0 unregistered ✓
chXX hardcode| app.js 0 / index.html 0 / manifest_data.js 94 (全对) ✓
books/README 数字对齐 | 3 数字 0 漂移 ✓  ← 本轮修复
```

### 下轮候选（按优先级降序）

1. **(新发现) 全站扫「章数/字数」类元数字声明**——除 books/README.md 外，
   是否还有别处（如 badges / app.js 启动 banner / 章节内 H2 计数声明）出现
   累积漂移；可作下轮脚本自动化扫描候选
2. **(继承 round125 #2)** NSCA-CPT ch10 §七末段 v3.22.17 / v3.22.62 /
   v3.22.72 / v3.22.74 四次勘误 blockquote 累积 580+ 字 → 整理为附录
   「v3.22 勘误史」独立 H2
3. **(继承 round125 #3)** `_audit_exlib_ledger.py` 加「声明数字 vs 实际
   计数偏差」自动报错逻辑（9 本书 14 章 + 90+ unique id 持续可校验化）
4. **(继承 round119 #1)** 羽毛球康复书内容深化（6 大损伤 + 4/8/12 周
   时间线）——内容性大改动，留观
5. **(新发现)** books/badminton-recovery/ 8 章全部内链已正确指向 chXX 文件
   （round125 ch01 L212 已统一），但 ch01 L201「本书的 6 大损伤」+ L233
   仍保留「映射表说明」等措辞——可统一精简为单一规范行
