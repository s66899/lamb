## 第 127 轮（commit af29468）— badminton ch12 8.4 L1004 措辞审计漂移修复

**本轮做了什么**：

### 修复点（单文件单 commit）

`books/badminton/ch12-physical-training.md` L1004 章节 8.4 头部声明句措辞重写，
让 `_audit_exlib_ledger.py` 不再误读 bare-id 查表入口为 body [ex:NNNN] inline 声明数。

| 原 | 改 |
|---|---|
| 本节列表共 **43 unique id / 66 处列表项**，含训练类 4 段合计 **35 unique / 36 处** [...] + 康复专项段 30 行内去重 **24 unique / 30 处**，两块跨段去重 **43 unique** | 本节列表为 bare-id 查表入口，**不计入 body 内 [ex:NNNN] inline 计数**，与 §2 + §8 节实际 inline 引用分开计；本节列表共 **43 个去重 id / 66 项条目**，含训练类 4 段合计 **35 个去重 / 36 项** [...] + 康复专项段 30 行内去重 **24 个去重 / 30 项**，两块跨段去重 **43 个去重 id** |

### 真实 bug 来源

L1004 措辞里 "**43 unique id**" + "**66 处列表项**" 被 audit 锚点
`本章 ex-lib 引用清单` 命中，触发 INLINE_RE `(\d+)\s*(?:处\s*(?:ex-lib\s*|ex\s+)?inline\s*引用?|个\s*(?:ex-lib\s*|ex\s+)?inline|处\s*引用|处\s*列表项)`
匹配出 "66"，触发 UNIQUE_RE `(\d+)\s*(?:(?:ex-lib\s*|ex\s+)?unique\s*id|...)` 匹配出 "43"，
于是 audit 报：declared=66 inline / 43 unique vs actual=62 inline / 41 unique —— **declared 是
8.4 bare-id 列表的项数（66 个 4 位数字），actual 是 body 内 [ex:NNNN] 字符串计数（62 处），
两件事根本不应该被 audit 当成同一指标对比**。

但 8.4 列表 (66 个 bare-id) 和 body inline (62 处 [ex:NNNN]) 实际上覆盖了**完全不同的 41 个
vs 43 个去重 id 集合**——L1004 内已明示 "康复专项中部分 ID 与力量/爆发力重合（如 0054、0085、
0038 等）"。原措辞因用了 audit 关键词，把这件事搞混了。

### 校验（commit 前全部跑过）

- 单文件单 commit 改动（1 文件 1 行 ±；+24 字节 -24 字节）
- 8.4 列表实际计数（手算 + 脚本双向核对）：
  - 训练类 4 段：力量 17 + 爆发力 11 + 敏捷 1 + 柔韧 7 = 36 项；段内去重 35 个（敏捷 3543 与爆发力重复）
  - 康复专项 6 部位：膝 7 + 肩 6 + 踝 4 + 肘 3 + 腰 5 + 跟腱 5 = 30 项；段内去重 24 个
  - 跨段（训练+康复）合并去重：**43 个去重 id**（与原声明一致）
  - 跨段重合：15 个 id 在两块都出现（0054/0085/0038 等，与原声明一致）
  - 总列表项数：36 + 30 = **66 项**（与原声明一致）
- body [ex:NNNN] inline 计数：62 处 / 41 个唯一 id / 0 broken（与原值一致，零变更）
- ex-lib 校验：所有 id (inline 41 unique + 8.4 bare 50 unique 含 6 个 v3.22.46 已移除的注释引用)
  仍 1336 合法集合零 broken
- `_audit_exlib_ledger.py` 漂移修复前后对比：
  - 修前：`❌ inline: declared=66 actual=62 | ❌ unique: declared=43 actual=41 (mentions=1)`
  - 修后：`✅ all declared counts match actual inline counts`（105 chapters 全清）
- `node --check app.js` ✅（未触碰 JS）
- `node --check manifest_data.js` ✅（未触碰 JS）
- `python3 -m json.tool manifest.json` ✅（未触碰 manifest）
- LF 行尾保持：1336 LF / 0 CR ✓（沿用 round124 newline LF 容忍规范）
- `git diff --stat` 仅 books/badminton/ch12-physical-training.md 1 文件 2 行 ±（1 处替换）✓
- Git warning `LF will be replaced by CRLF`：预期，沿用 round125 autoCRLF 容忍现状

### push 状态 — ✅

- `git push origin book` → ✅ 成功
- `01b1ced..af29468 book -> book`
- GitHub Pages 端**已触发自动部署**

### 不在本轮做

- **round124 todo 落地补 commit**（遗留 `_append_todo_round124.py` + `todos/round124.md` 未跟踪）——
  round124 todo 内容含 "⏳ push 重试中" 旧状态，与 round125 ledger 已记录的 "round124 push 阻塞 #1 兑现 ✅"
  矛盾，追溯性差；可直接放弃（信息已在 round125/126 ledger 沉淀）或后续单开一轮「清理 1 个未跟踪
  ledger 文件」小活
- **round125/126 候选 #2 / #3**：NSCA ch10 §七末段 v3.22 勘误史整理为附录 + audit 脚本扩展——
  脚本扩展沿用留观；ch10 勘误史内容性大改动，沿用留观
- **羽毛球康复书内容深化**（round119 #1）——内容性大改动
- **ch07 末尾 SMR 条目说明**（用户偏好曾标注"库内暂无 foam roller / 筋膜球专项条目"）——
  用户偏好已**陈旧**（v3.22.17 已入库 ex-5202~ex-5213 共 12 条 SMR），ch07 当前说法正确反映
  库内实际状态；本轮**未触碰**，但下轮可能需要在系统层面与用户确认偏好是否需更新

### 项目现状（commit + push 后）

- 9 本书 / 97 章 / 90.1 万字（与 books/README + manifest.json 一致，round126 已对齐）
- ex-lib 1336 合法 id / 140 unique 引用 / 0 broken
- audit 105 chapters 全清零漂移 ✅
- APP_VERSION v3.22.62 / APP_DATE 2026-08-31（content-only fix 不 bump 沿用）
- 最近 4 轮 commit（dc1d002 + ea8f89f + 5020ac5 + af29468）连成 ex-lib 引用规范 + 元数字对齐 +
  审计漂移清理的小步快跑