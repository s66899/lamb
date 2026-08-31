## 第 91 轮（commit ca4557e）— finance ch13 `### 10.5` 空标题补全（90 轮候选 #8 兑现）

**本轮做了什么**：90 轮 ledger 候选 #8 — `books/finance/ch13-international-finance.md`
L743 标题写作 `### 10.5 `（末尾空格、subject 缺失），且 L745 紧跟一行独立内容
`国际资产配置的实战步骤` 作为正文标题过渡。原作者本意把这一行作为标题 subject，
但误开为独立段落，导致 markdown 渲染时 H3 heading 显示为「### 10.5 」（无 subject
文字，依赖盲读 L745 才知道主题）。manifest.json 与 manifest_data.js 的
h2s 嵌套数组 sub 条目同样为 `"title": "10.5"`（无 subject），与 markdown 一致地
处于「空标题」状态。

**修复策略**：把 L743 + L745 合并为单一行 H3 heading，与同章节 10.1-10.4 风格统一：

1. **markdown 合并**：删除 L743 后的空行 + L745 独立标题段，改为单行
   `### 10.5 国际资产配置的实战步骤` 后接原 L747 `**第一步**` 之间的空行；
   净 1 +/2 -（去掉 2 行内容，新增 1 行 heading），字节数 48117 → 48115（-2）
2. **manifest.json 同步**：`"title": "10.5"` → `"title": "10.5 国际资产配置的实战步骤"`
3. **manifest_data.js 同步**：同上位置（L8963）

为什么不降级或挪位置（与 90 轮候选对比）：
- 降级方案（如 89 轮候选 #1 提议的 L817 降级为 `### 10.6`）会破坏编号语义
- 挪位置不影响此问题（标题仍空着）
- 本轮选「补全 subject」最小代价 — 1 处 heading 字面量补全，0 编号改动，0 块 MOVE

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- finance ch13 h2 count：16（不变，与 markdown 16 个 ## 严格 1:1）✓
- finance ch13 subs count：5/10 不变（10.1~10.5 在「## 十」作用域、10.6~10.10
  在「## 十...补充」作用域）；仅 sub[4] 的 title 字面量从 "10.5" 扩展为
  "10.5 国际资产配置的实战步骤" ✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变，零 ex-lib id
  改动）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变）✓
- `git diff --text --stat` → 1 +/2 -（markdown 净 -1 行）；manifest.json / manifest_data.js
  被 `.gitattributes` 标 binary，git diff --stat 显示「Bin 435425 -> 435459 bytes」/
  「Bin 457379 -> 457413 bytes」（各 +34 字节，与 subject UTF-8 长度一致）✓
- markdown 字节数：48117 → 48115（-2 字节，符合预期：去掉 1 行内容 + 1 空行
  共 2 个 `\r\n`，新增 heading 末尾追加 subject 0 字节变化；line count 1138 → 1137，
  与字节数变化一致）✓
- markdown CRLF count：1138 → 1137（不变规则：每行末 `\r\n` 数量与行数 1:1）✓
- manifest.json / manifest_data.js CRLF 计数不变（仅单行 title 字面量扩展，不动
  行结构）✓
- `git log -1 --format=%H` → `ca4557e` ✓
- APP_VERSION `v3.22.62` 不 bump；APP_DATE 不变；app.js 未触碰 ✓
- 可独立回滚：`git revert HEAD` 即可恢复 3 文件的字面量改动 ✓
- `git push origin book` 成功（ca1db57..ca4557e）✓

**用户偏好兑现**：
- 沿用 73~90 轮风格：单 commit fix + 后续双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅字面量补全，0 涉 ex-lib）
- 兑现 90 轮 ledger 候选 #8 的 finance/ch13 `### 10.5` 空标题补全承诺
- 单 commit / 单源 issue / 对称三文件（md + 2 manifests）修复 / 严格 1:1 与 markdown 对齐
- 与 86/87/88/89/90 轮 NSCA-CPT ch02 / finance-ch13 修复同型，跨轮复制成功
- 严格 CRLF 行尾保留（实测 3 文件均为 CRLF，binary 写入保护 `\r\n` 不被破坏）

**commit hash**：`ca4557e`
（`fix(finance-ch13): ### 10.5 空标题补全为「国际资产配置的实战步骤」(90 轮候选 #8 兑现)`）

**push 状态**：成功（ca1db57..ca4557e）

**下轮候选**：
1. (继承 90 轮, 优先级低) finance ch13 「## 参考文献 + ## 致谢」在 L725 / L740 错放在
   ## 十 作用域内（位于 10.4 内容之后、### 10.5 之前）— 按惯例应挪到 chapter-end
   （## 十二 之后）。影响范围：1 个 markdown 改动 + manifest 可能需同步调整 entries
2. (继承 71~91 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 +
   公式 + 表），如需扩写可挑 1 章做小补
3. (继承 71~91 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 /
   unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观
4. (继承 72~91 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 /
   v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
5. (继承 80~91 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失 ——
   78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成
   73~77/79~91 双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~91 双写系列
   保持连续
6. (继承 85~91 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`
   全文件禁用 diff 配置 — 本轮 91 轮确认 manifest.json 实际是 CRLF（14135 个 `\r\n`）
   而非前几轮 todo 误标的 LF，`.gitattributes` 把 manifest 标 binary 隐藏了真实行尾
   状态。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），
   而其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff
7. (新增, 91 轮发现) finance ch13 L743 修复后整段 `### 10.5 国际资产配置的实战步骤`
   下「**第一步**」~「**第三步**」+「**第四步**」+「**第五步**」共 5 步，未配 H4
   子标题，与同章节 10.1-10.4 内部风格一致（10.1/10.2/10.3 内部也无 H4，靠加粗段做
   步骤分隔），所以本轮不动。优先级低，留观
8. (新增, 91 轮发现) manifest.json 实际是 **CRLF** 行尾（14135 个 `\r\n`），
   manifest_data.js 也是 CRLF（14810 个），与 markdown 一致。前几轮 todo ledger
   （73~90 轮）把它们标 LF 是事实错误。本轮在 _session_todo.md 末尾记账段如实标注
   CRLF；可远期补一轮「CRLF 状态勘误」把这几个文件名前几轮 ledger 里的 LF 标记
   改正确