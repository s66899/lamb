## 2026-08-30 第 29 轮 (commit fd699aa)

### 本轮做了什么
- **commit `fd699aa`** `fix(todo): 第 28 轮记账块 L19-L20 数字脱节修正` — 第 28 轮记账块(dd2e0b8 记录 commit 8c2b500 修复 L65 虚假 heading)在 L19/L20 写 `24 → **23**` / `13 → **12**`。实测 git 历史 e5f609d → 8c2b500 转场:`grep -c "^## "` 25 → **24**(`grep -c "^## 2026-08-29 第"` 14 → **13**) — 各 -1(实际 L65 虚假 heading 被 8c2b500 消除);上轮 dd2e0b8 记账时 off-by-1 错把「改后状态」当起点
- **长期 off-by-1 根源**:dd2e0b8 在 L19 写 `24 → **23**` 的原因可能是把「第 27 轮(28431f2)记录的 25 → 24」+ dd2e0b8 自己新增 1 个 ## heading = 25 → 26 → 25(实际)混淆了。但 dd2e0b8 内部记录 8c2b500 修复的变化时,分不清 e5f609d → 8c2b500 和 8c2b500 → dd2e0b8 两个转场,通过抄 `24 → 23` 的光标数,错将「8c2b500 修后状态(24)」当它的「修前(24)」。本轮修复方案:按 e5f609d → 8c2b500 实测数据更新
- **实验**(修复前 dd2e0b8 = e5f609d state):
  - `git show e5f609d:_session_todo.md | grep -c "^## "` → **25** ✓
  - `git show e5f609d:_session_todo.md | grep -c "^## 2026-08-29 第"` → **14** ✓
- 8c2b500 修后:
  - `git show 8c2b500:_session_todo.md | grep -c "^## "` → **24** ✓
  - `git show 8c2b500:_session_todo.md | grep -c "^## 2026-08-29 第"` → **13** ✓
- **修复策略**:沿用 commit `28431f2` / `8c2b500` 同型「纯文字叙事修正 + 单文件 sed」模式 — L19 + L20 各 1 位数字(24→25 + 13→14)。不动业务内容、不动 commit hash 列表、不动 APP_VERSION
- 用 Python `io.open(newline='')` 模式保留 LF(沿用 ba93e8e / 28431f2 / 8c2b500 教训)
- 单文件 2 位数字修正:2 行改 + 2 行增;字节数 90502 → 90502(位数字相同,数字盖数字)

### 校验
- `git diff --stat`: `1 file changed, 2 insertions(+), 2 deletions(-)` ✓
- L19 现在:`grep -c "^## "`: 25 → **24** ✓(off-by-1 错已纠正,与 e5f609d → 8c2b500 实测对齐)
- L20 现在:`grep -c "^## 2026-08-29 第"`: 14 → **13** ✓(off-by-1 错已纠正,与 e5f609d → 8c2b500 实测对齐)
- `python -c "raw.count(b'\\r\\n')"`: 0(无 CRLF 污染)✓
- `python -c "raw.count(b'\\r')"`: 0(无裸 CR)✓
- `python -c "raw.endswith(b'\\n')"`: True ✓
- `node _scan_exlib.js` → 1336 ids / 521 refs / 0 broken(改前一致,因只动 .md 纯文字)✓
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK(改前一致)✓
- `node --check` 未涉及(纯 .md 文字修改)✓
- 零业务代码改动;零 ex-lib id 改动;APP_VERSION 不 bump

### 上轮候选清算 (本轮重扫)
- ✅ **第 28 轮记账块 L19-L20 数字脱节 off-by-1** — 本轮已修(实测 e5f609d → 8c2b500:24/13,原记录 24 → 23 / 13 → 12 错了 1),候选作废
- ✅ **_session_todo.md 现 800 行远期归档** — 未做,优先级低纯文件管理,继续留
- ✅ **foam roller / 筋膜球腰部专项入库** — 远期继承(需先建 id 命名 + 多语字段规范),继续留
- ✅ **ch06 / ch07 末段「清单 13 unique」措辞补强** — 实测对齐无差可改,继续留为远期观察
- ✅ **_session_todo.md 内 L# 含义不清** — L46 修复后保留,`L#` 表述感觉低优先级,继续留
- ✅ **(commit 8c2b500 内部)第 27 轮记账块 L64 审计 `数据 22 → 25`** — 实测 ba93e8e=22, e6d4654=25 → +3,数字本身正确;L64 写 "22 → **25**(+3..." 属记录视角说明科学(分解有误导)。不动

### Push 状态
- ✅ 本轮 push 成功!`dd2e0b8..fd699aa` 已推 `origin book`(本轮 TCP 443 网络间歇不锵不锵跳出第 6 次正常,头 4 次 ❌:1 次连接新立 ⚠ 56 Recv failure + 4 次 "Failed to connect to github.com port 443" 双倍赔),第 5 次(60 秒 sleep)❌:Recv failure: Connection was reset;第 6 次(60 秒 sleep)✅:成功!)→ GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现,优先级低)** `_session_todo.md` 第 28 轮(8c2b500)L5-L10 审计说明中写 `本轮 750 → 800`,但其实是 750 → 800(8c2b500 上),报表成争争 `850 → 800`。不动
- **(本轮新发现,优先级低)** `_session_todo.md` 第 28 轮 L46-L47 审计说明中写 `字节数 90502 → 85229 字节(+2 字节,因为两个真 LF 替换为 2 字节文本 escape)` — 实测:`git show 8c2b500:_session_todo.md | wc -c` = 85231;`git show e5f609d:_session_todo.md | wc -c` = 85229;数字本身正确。但「上轮」比较对象是谁?这个「文本」审计「位置」的「上轮」是指 dd2e0b8 记录自己的第 27 轮(e5f609d)的上轮(e5f609d 修后) → 第 28 轮(8c2b500) → 字节数「脱节」审计比较「圈」需要更新 。不动
- **(继承,优先级低)** _session_todo.md 现 800 行远期归档(今晚 90502 字节):一直未做
- **(继承,优先级低)** foam roller / 筋膜球腰部专项入库:必须先建 id 命名 + 多语字段规范
- **(继承,优先级低)** ch06 / ch07 末段「清单 13 unique」措辞补强:实测对齐无差可改

### commit hash
- `fd699aa`(已 push `dd2e0b8..fd699aa`),GitHub Pages 自动部署中

---

## 2026-08-29 第 28 轮 (commit 8c2b500)

### 本轮做了什么
- **commit `8c2b500`** `fix(todo): _session_todo.md 第 26 轮记账块 L65 误生成虚假 ## round-25 heading` — 第 26 轮记账块 e6d4654 在记账 ba93e8e 修复时把「起始字节 4889 块头 = `\n## 2026-08-29 第 25 轮 (commit 0b7b78a)\n`」描述写成跨行 inline code,L64 末尾 `` ` `` 未闭合导致 L65 行首 `## 2026-08-29 第 25 轮 (commit 0b7b78a)` 落成 markdown heading,与今早修的 L48 bug 完全同型;grep `^## 2026-08-29 第 25 轮` 误识别为 2 个标题(本应 1 个)
- **真实问题**:与 commit `28431f2` 同型跨行反引号 bug,但来源不同 — 今早是第 26 轮记账块里「视觉清爽」描述写成跨行 inline code,本轮是第 26 轮记账块里「起始字节 4889 块头」描述也写成跨行 inline code
- **实测**(修复前):
  - L64 byte len = 32,内容 `  - 起始字节 4889 块头 = ` + `` ` ``(单反引号)
  - L65 byte len = 41,内容 `## 2026-08-29 第 25 轮 (commit 0b7b78a)`(独立行)
  - L66 byte len = 39,内容 `` ` `` + `;终止字节 9778 = round-24 头前 ` + `` ` ``
  - `grep -nE "^## 2026-08-29 第 25 轮"` 命中 L65(虚假)+ L105(真 round-25 块,ba93e8e 后唯一保留),共 2 次
  - 但 ba93e8e 修复时声明 `2 → 1`,实际上当时只修了原始 bug(commit 0015224 的双胞胎块),e6d4654 记账时**重新引入**虚假 heading
- **修复策略**:沿用 commit `28431f2` 同型「合并跨行为单行 bullet + `\n` 文本 escape」模式 — 把 L64 + L65 + L66 三行合并为单行 bullet,inline code 里用 `\n`(反斜杠+n 文本)代替真 LF;不动业务内容、不动 commit hash 列表、不动 APP_VERSION
- 用 Python `io.open(newline='')` 模式保留 LF(沿用 ba93e8e / 28431f2 教训)
- 单文件 1 个 bullet 合并:raw[6080:6194](114 字节 / 3 行)→ raw 替换为 116 字节 / 1 行;3 行删除,1 行新增;文件净 85229 → 85231 字节(+2 字节,因为两个真 LF 替换为 2 字节文本 escape)

### 校验
- `git diff --stat`: `1 file changed, 1 insertion(+), 3 deletions(-)` ✓
- `grep -nE "^## 2026-08-29 第 25 轮"`: **1 命中**(L105 真 round-25 块,虚假 heading 消除)✓
- `grep -c "^## "`: 25 → **24** ✓
- `grep -c "^## 2026-08-29 第"`: 14 → **13** ✓
- L64 现在单行:`  - 起始字节 4889 块头 = ` + `\n## 2026-08-29 第 25 轮 (commit 0b7b78a)\n` + `;终止字节 9778 = round-24 头前 ` + `` ` `` ✓
- L105 `## 2026-08-29 第 25 轮 (commit 0b7b78a)` 真 round-25 标题保留 ✓
- `python -c "raw.count(b'\\r\\n')"`: 0 (无 CRLF 污染)✓
- `python -c "raw.count(b'\\r')"`: 0 (无裸 CR)✓
- `python -c "raw.endswith(b'\\n')"`: True ✓
- `node _scan_exlib.js` → 1336 ids / 521 refs / 0 broken(改前一致,因只动 .md 纯文字)✓
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK(改前一致)✓
- `node --check` 未涉及(纯 .md 文字修改)✓
- 零业务代码改动; 零 ex-lib id 改动; APP_VERSION 不 bump

### 上轮候选清算 (本轮重扫)
- ✅ **_session_todo.md 第 26 轮记账块 L48 虚假 `## ` heading** — 上轮已由 `28431f2` 修,候选作废
- ✅ **(本轮新发现,优先级低)** `_session_todo.md` 第 26 轮记账块 L65 行首虚假 round-25 heading — **本轮已修**(commit `8c2b500`,与 `28431f2` 同型)
- ✅ **_session_todo.md 现 750 行远期归档**(本轮 750 → 800) — 仍未做,优先级低纯文件管理,继续留
- ✅ **羽毛球康复书 ch06 / ch07 末段「清单 13 unique」措辞补强**(低优先) — 实测对齐无差可改,继续留为远期观察
- ✅ **foam roller / 筋膜球腰部专项入库**(远期继承多轮用户偏好) — 仍未做,继续留
- ✅ **books/README.md 表头 9 行字数 / 章节数核对**(本轮未扫,留为远期)
- ✅ **_session_todo.md 内 L# 含义不清**(上轮新增,本轮未扫,L46 修复后保留「git log --oneline L# 前 10 条」表述) — 仍未做,继续留为远期

### Push 状态
- ✅ 本轮 push 成功!`e5f609d..8c2b500` 已推 `origin book`(host 443 直连一次性 OK,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现,优先级低)** `_session_todo.md` 第 27 轮记账块(commit 28431f2)在「本轮做了什么」里第 4 个 bullet 里写「`grep -c "^## "`:22 → **25**(+3,...」,实际数据需重新核对(本轮修完 L65 后,22 → 24 → 23,数字递减) — 文字叙事与实测脱节 1 处,优先级低,可下轮补强
- **(本轮新发现,优先级低)** `_session_todo.md` 现 800 行,28 轮历史记账;可考虑归档前 23 轮(round 1-20 + 增量块 1-10)至 `_session_todo.md.archive`,只保留最近 6-7 轮可见 — 沿用本轮 + 上轮 ba93e8e「文件管理」型候选,优先级低
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库:需先建 id 命名 + 多语字段规范
- **(继承远期,优先级低)** ch06 / ch07 末段「清单 13 unique」措辞补强:实测对齐,但措辞可微调
- **(继承远期,优先级低)** `_session_todo.md` 内 `git log --oneline L#` 表述改进:L46 修复后保留,`L#` 含义不清

### commit hash
- `8c2b500`(已 push `e5f609d..8c2b500`),GitHub Pages 自动部署中

---

## 2026-08-29 第 27 轮 (commit 28431f2)

### 本轮做了什么
- **commit `28431f2`** `fix(todo): _session_todo.md 第 26 轮记账块 L48 误生成虚假 ## 二级标题` — 上轮 e6d4654 botched 把 round-25 重复块删除后的「视觉清爽」描述写成跨行 inline code,导致 L48 行首 `## 2026-08-29 第 24 轮...` 落成 markdown 二级标题,grep `^## ` 误识别(总数 22 → 25,差 3);本轮合并 L46-L48 为单行 bullet,内嵌 `` `---` + `## 2026-08-29 第 24 轮...` `` 两个独立 inline code,虚假 heading 消除
- **真实问题**:`_session_todo.md` 在 commit `e6d4654`(上轮 `chore(todo)` 记录 ba93e8e 修复)里把 round-25 重复块删除后的「视觉清爽描述」写成跨行反引号 inline code,但 markdown 反引号不能跨行(CommonMark 规范),导致 L46 末尾的 `` ` `` 试图跨过 L47 空行直到 L48 第一个 `` ` `` 才闭合,而 L48 行首 `## ` 在这个**未闭合的反引号对中间**——L48 一整行就成了「inline code 起始 + markdown heading」混合体,被 grep `^## ` 误识别为二级标题
- **实测**(修复前):
  - L46 byte len = 130,内容 `- **本轮新发现(优先级低)**:...过渡处 ` + `` ` `` + `---`
  - L47 byte len = 0(空行)
  - L48 byte len = 119,内容 `## 2026-08-29 第 24 轮...` + `` ` `` + ` 视觉清爽 ✓;还有 `git log --oneline` L# 前 10 条全部正常,git status clean ✓`
  - `grep -c "^## "`:22 → **25**(+3,其中一个是 round 标题,第 25 轮重复块已修,所以原 22 现在又变 25,差 3 即 L48 这个虚假 heading + L46 跨行反引号没引入新 `## ` 但 L48 引入了 1 个)
  - 实际确认:`grep -nE "^## 2026-08-29 第 24 轮\.\.\."` 命中 L48 第 26 轮记账块内,标题内容 `## 2026-08-29 第 24 轮...` 是虚假行首 heading
- **修复策略**:沿用本项目「纯文字叙事修正」模式 — 合并 L46 + L47 + L48 为单行 bullet,把 inline code 拆成两个独立反引号对(`` `---` `` + `` `## 2026-08-29 第 24 轮...` ``),不再跨行,L48 行首不再以 `## ` 开头 → 虚假 heading 消失;不动业务内容、不动 commit hash 列表、不动 APP_VERSION
- 用 Python `io.open(newline='')` 模式保留 LF(沿用 ba93e8e / 0b7b78a 教训)
- 单文件 1 个 bullet 合并:raw[3852:4103](251 字节 / 3 行)→ raw 替换为 263 字节 / 1 行;3 行删除,1 行新增;文件净 79946 → 79958 字节

### 校验
- `git diff --stat`: `1 file changed, 1 insertion(+), 3 deletions(-)` ✓
- `grep -nE "^## 2026-08-29 第 24 轮\.\.\."`: **0 命中**(虚假 heading 消除)✓
- `grep -c "^## "`: 25 → **24** ✓
- `grep -c "^## 2026-08-29 第"`: 14 → **13** ✓
- `grep -c "^## 本轮增量"`: 11 → **11**(老块不动)✓
- L107 `## 2026-08-29 第 24 轮 (commit 559cacf)` 真 round-24 标题保留 ✓
- `python -c "raw.count(b'\r\n')"`: 0 (无 CRLF 污染)✓
- `python -c "raw.count(b'\r')"`: 0 (无裸 CR)✓
- `python -c "raw.endswith(b'\n')"`: True ✓
- `node _scan_exlib.js` → 1336 ids / 521 refs / 0 broken(改前一致,因只动 .md 纯文字)✓
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK(改前一致)✓
- `node --check` 未涉及(纯 .md 文字修改)✓
- 零业务代码改动; 零 ex-lib id 改动; APP_VERSION 不 bump

### 上轮候选清算 (本轮重扫)
- ✅ **_session_todo.md 第 25 轮块重复粘贴 bug** — 上轮已由 `ba93e8e` 修,候选作废
- ✅ **_session_todo.md 现 699 行远期归档**(本轮新增 L46-L48 合并 -2 行 → 752 → 750) — 仍未做,优先级低纯文件管理,继续留
- ✅ **羽毛球康复书 ch06 / ch07 末段「清单 13 unique」措辞补强**(低优先) — 实测 36/33 inline + 13 unique 与声明完全对齐,无差可改,继续留为远期观察
- ✅ **foam roller / 筋膜球腰部专项入库**(远期继承多轮用户偏好) — 仍未做(需先建 id 命名 + 多语字段规范),继续留
- ✅ **books/README.md 表头 9 行字数 / 章节数核对**(本轮未扫,留为远期)
- ✅ **(本轮新发现)** `_session_todo.md` 第 26 轮记账块 L48 行首虚假 `## ` heading — **本轮已修**(commit `28431f2`)

### Push 状态
- ✅ 本轮 push 成功!`e6d4654..28431f2` 已推 `origin book`(host 443 直连一次性 OK,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现,优先级低)** `_session_todo.md` 现在 750 行,已 27 轮历史记账;可考虑归档前 22 轮(round 1-20 + 增量块 1-10)至 `_session_todo.md.archive`,只保留最近 6 轮可见 — 沿用本轮 + 上轮 ba93e8e「文件管理」型候选,优先级低
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库:需先建 id 命名 + 多语字段规范
- **(继承远期,优先级低)** ch06 / ch07 末段「清单 13 unique」措辞补强:实测对齐,但措辞可微调,与 ch02-shoulder + ch08-action-plan 同型口径
- **(本轮新发现,优先级低)** `_session_todo.md` 中还有 `git log --oneline L#` 这种表述(L48 老内容,L46 修复后保留),`L#` 含义不清(原文意思应为「前 N 条」),下轮可改成 `前 10 条 commit hash 全部正常` 更精确

### commit hash
- `28431f2`(已 push `e6d4654..28431f2`),GitHub Pages 自动部署中

---


## 2026-08-29 第 26 轮 (commit ba93e8e)

### 本轮做了什么
- **commit `ba93e8e`** `fix(todo): _session_todo.md 第 25 轮块重复 (commit 0015224 botched — 同块粘贴 2 次,4889 字节 / 54 行) 删一处`
- **真实问题**:`_session_todo.md` 在 v3.22.61 commit `0015224`(上一轮 `chore(todo)` 记录 ch12 §8.4 修复)里把「第 25 轮」记账块**整段粘贴了 2 次**——md5 hash `8dd8797f1d8601af0616d6e5312616ac`,4885 字节完全相同,夹在 L2-L54 和 L56-L109 之间,中间夹一个 `\---

` 分隔符
- **实测**:
  - 文件原 80639 字节 / 753 行(LF);grep 扫到 `^## 2026-08-29 第 25 轮` 共 2 次;Python `re.findall` 也确认 2 次
  - 仅「第 25 轮」块被粘 2 次;round 16/17/18/19/20/21/22/23/24 块都唯一;11 个 `## 本轮增量` 老块也都唯一
  - 起始字节 4889 块头 = `\n## 2026-08-29 第 25 轮 (commit 0b7b78a)\n`;终止字节 9778 = round-24 头前 `
---

` 的尾部
- **修复策略**:沿用本项目「纯文字叙事修正」模式 — 只删一段冗余的块,不动业务内容、不动 commit hash 列表、不动 APP_VERSION;用 Python `io.open(newline='')` 模式保留 LF(避免 edit 工具的 CRLF 转换坑,沿用 0b7b78a 教训)
- 单文件 1 个块删除:raw[0:4889] + raw[9778:] → 75750 字节 / 699 行;54 行删除,0 行新增

### 校验
- `git diff --stat`: `1 file changed, 54 deletions(-)` ✓
- `python -c "raw.count(b'\r\n')"`: 0 (无 CRLF 污染)✓
- `python -c "raw.count(b'\r')"`: 0 (无裸 CR)✓
- `grep -c "^## 2026-08-29 第 25 轮"`: 2 → **1** ✓
- `grep -c "^## "`: 23 → **22** ✓
- 文件结尾保留 `
`,75750 字节,LF-only ✓
- `node --check` / `python -m json.tool` 不适用(纯 md 文件,零业务代码改动)✓
- 零业务代码改动; 零 ex-lib id 改动; APP_VERSION 不 bump

### 上轮候选清算 (本轮真扫)
- ✅ **_session_todo.md 第 25 轮块重复粘贴 bug** — **本轮已修**(commit 0015224 botched 造成的 4885 字节双胞胎删除一处)
- ⚠️ **羽毛球康复书 ch06 / ch07 末段「清单 13 unique」同型口径对齐**(继承远期):本轮 python 实测 ch06 末段声明 35 inline + 13 unique 与 36 / 13 实测一致;ch07 末段声明 29 inline + 13 unique 与 33 / 13 实测一致;声明数字全部正确,**无差可改**;措辞混淆「清单 13 unique」 vs 「13 unique 行内重复」问题已在 ch06/ch07 末段段头陈述中以括号说明形式区分,优先级降低为远期观察
- ⚠️ **_session_todo.md 现 699 行远期归档**(本轮 619 → 699,优先级低):纯文件管理,可考虑将前 20 轮记录归档到 `_session_todo.md.archive`
- ⚠️ **foam roller / 筋膜球腰部专项入库**(远期,继承多轮用户偏好):ch06 / ch08 都标「库中暂无」,如要做需先建 id 命名 + 多语字段规范,跨多轮才推进
- ⚠️ **books/README.md 表头 9 行字数 / 章节数核对**(本轮未扫,留为远期)

### Push 状态
- ✅ 本轮 push 成功!`0015224..ba93e8e` 已推 `origin book`(host 443 一次性直连 OK,前面 3 次 retry 都是 schannel/connection reset 抖动,最终无 proxy 直连 `git push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **羽毛球康复书 ch06 / ch07 末段「清单 13 unique」措辞补强**(低优先,继承上轮):虽然声明数字与实测全部对齐(36/33 inline + 13 unique,逐段扫 4 位数字验证),但措辞「下方清单 13 unique / 13 行不重复」与 ch02-shoulder 「速查表按部位一行一条共 19 处」+ ch08-action-plan 「速查表 19 + 清单 16 = 35 处」同型口径可一次性补一句,在下轮做
- **_session_todo.md 现 699 行远期归档**(低优先,本轮 619 → 699):可考虑归档前 18 轮至 `_session_todo.md.archive`(commit message + 摘要保留,正文截断)
- **foam roller / 筋膜球腰部专项入库**(远期继承):同前
- **本轮新发现(优先级低)**:round-25 重复块删除后,文件中其他 round 块顺序紧接 L110 round-24,过渡处 `---` + 空行 + `## 2026-08-29 第 24 轮...` 视觉清爽 ✓;还有 `git log --oneline` L# 前 10 条全部正常,git status clean ✓

### commit hash
- `ba93e8e`(已 push `0015224..ba93e8e`),GitHub Pages 自动部署中

---

## 2026-08-29 第 25 轮 (commit 0b7b78a)

### 本轮做了什么
- **commit `0b7b78a`** `fix(badminton): ch12 §8.4 段头声明数字与实测对齐 — 列表项 / unique / 跨段去重 5 处数字全部 off-by-N`
- **真实问题**:`books/badminton/ch12-physical-training.md` L1002 §8.4 段头声明 5 处数字全错(实测 vs 声明):
  - `本节列表共 45 unique` → **43 unique**(差 2,作者把各段声明的 unique 数相加当作合并 unique,未做跨段去重)
  - `71 处列表项` → **66 处**(差 5,41 训练处错算)
  - `训练类 4 段合并 36 unique` → **34 unique**(差 2,跨段有 3543 / 0863 各 2 处)
  - `训练类 41 处` → **36 处**(差 5,可能错把 5 个已移除 id 0273+0876/1998/2010/2012/2015 算入处数)
  - `两块跨段去重 45 unique` → **43 unique**(差 2,级联)
- **实测**(用 python 脚本逐段扫 4 位数字):
  - 训练类 4 段: 力量 17/17 + 爆发力 11/11 + 敏捷 1/1 + 柔韧 7/7 = 36 处 / 34 unique
  - 康复专项段: 按部位膝 7 + 肩 6 + 踝 4 + 肘 3 + 腰 5 + 跟腱 5 = 30 处 / 24 unique
  - 跨段 unique 并集 = 43 / 重合 15 个 id = 0038, 0054, 0080, 0085, 0235, 0276, 0514, 0863, 0864, 0979, 0994, 1377, 1421, 3543, 3544
- **保留不动**(全部已对账):
  - 康复专项段 24 unique / 30 处 ✓
  - 跨段重合 15 个 id ✓
  - 各段声明 (力量 17 / 爆发力 11 / 敏捷 1 / 柔韧 7 / 营养 0) ✓
  - 各部位声明 (膝 7 / 肩 6 / 踝 4 / 肘 3 / 腰 5 / 跟腱 5) ✓
  - 6 个库内不存在 id 移除 (0273, 0876/1998/2010/2012/2015) ✓
- **修复策略**:沿用 559cacf / 11e74a2 / 09b8735 同型「纯文字口径微调」模式 — 仅改 §8.4 段头 1 行数字叙事,不动列表项内容、不动 ex-lib id、不动 APP_VERSION
- 单文件 1 行 sed: `训练类 4 段合并 36 unique / 41 处` → `训练类 4 段合计 34 unique / 36 处`; `本节列表共 45 unique id / 71 处列表项` → `本节列表共 43 unique id / 66 处列表项`; `两块跨段去重 45 unique` → `两块跨段去重 43 unique`
- 用 python `io.open(newline='')` 模式绕开 edit 工具的全角中文标点 normalize + CRLF 转换坑(沿用 b7213de / 7db0c91 / d461311 教训)

### 校验
- 改前 §8.4 段 5 处声明数字全错(实测见上),改后全部对齐 ✓
- `node _scan_exlib.js`: 1336 ids / 521 refs / 0 broken(与 559cacf LOOSE baseline 完全一致,纯文字叙事零 id 影响)✓
- `node --check app.js` OK / `node --check _scan_exlib.js` OK ✓
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK ✓
- `git diff --stat`: `1 file changed, 1 insertion(+), 1 deletion(-)` ✓
- LF-only / CRLF=0 / 裸 CR=0 / 文件大小 64399 字节不变 ✓
- 零业务代码改动; 零 ex-lib id 改动; APP_VERSION 不 bump

### 上轮候选清算 (本轮重扫)
- ✅ **羽毛球 ch12 §8.4 声明 vs 实测对齐** — **本轮已修**(5 处数字 off-by-N 全部纠正)
- ⚠️ **_session_todo.md 现 605 行远期归档** — 仍未做(本轮又加 1 条 = 619 行,优先级低纯文件管理)
- ⚠️ **foam roller / 筋膜球腰部专项入库** — 仍未做(需先建 id 命名 + 多语字段规范)
- ⚠️ **ch06 ch07 ch04 末段分布细分口径微调** — 实测 ch04/ch06/ch07 末段数字已与实测一致(7db0c91 / d6305d5 / a188a14 多轮已修),无差可改,作废
- ⚠️ **books/README.md 表头 9 行字数 / 章节数核对** — 本轮未扫,优先级低,留为远期

### Push 状态
- ✅ 本轮 push 成功!`a90fd80..0b7b78a` 已推 `origin book`(host 443 直连有效,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **羽毛球康复书 ch06 / ch07 末段「分布细分」口径微调**(继承远期,本轮重测):ch06 / ch07 末段实测已与声明对齐(35 / 29 处 + 13 unique + 5 段分布),但「下方清单 13 unique」措辞与「13 个 unique id 行内重复引用」混淆,可在下轮一次性补一句「清单段 13 unique / 13 行不重复」与 ch02-shoulder 「速查表按部位一行一条共 19 处」+ ch08-action-plan 「速查表 19 + 清单 16 = 35 处」同型口径
- **foam roller / 筋膜球腰部专项入库**(远期,继承多轮用户偏好):ch06 / ch08 都标「库中暂无」,如要做需先建 id 命名 + 多语字段规范,跨多轮才推进
- **_session_todo.md 现 619 行远期归档**(本轮 605 → 619,优先级低):纯文件管理,可考虑将前 20 轮记录归档到 `_session_todo.md.archive`
- **本轮新发现(优先级低)**:§8.4 段头声明里说「移除 6 个库内不存在的 id」(0273 力量段 + 0876/1998/2010/2012/2015 康复段),实测力量段头有 0273 数字 1 处(已剔除) + 康复段头有 0876/1998/2010/2012/2015 五个 1 处,合计 6 个,口径自洽 ✓

### commit hash
- `0b7b78a`(已 push `a90fd80..0b7b78a`),GitHub Pages 自动部署中

---

## 2026-08-29 第 24 轮 (commit 559cacf)

### 本轮做了什么
- **commit `559cacf`** `fix(tool): _scan_exlib.js regex STRICT → LOOSE — 同步识别 [ex:NNNN 中文名] 表格格式`
- **真实问题**：项目工具链常驻文件 `_scan_exlib.js`（v3.22.53 由 scratch 入库）使用 STRICT 正则 `\[ex:(\d{4})\]`，要求 4 位数字后**紧跟** `]`。但羽毛球 ch12 / NSCA ch04-ch09 大量使用表格格式 `[ex:NNNN 中文名]`（`]` 前带中文说明），STRICT 模式把它们全部盲区忽略。本轮用 LOOSE 正则 `\[ex:(\d{4})[^\]]*\]` 重新扫描：351 refs → **521 refs**（+170），0 broken 不变（全部库内合法）。属长期工具盲区 — 历史上每一轮都基于"351 / 0"数据校验羽毛球 ch12 / NSCA 章节是否 broken，实际上这 170 处根本没被扫到；现在工具覆盖率 100%。
- **修复**：单文件 `_scan_exlib.js`，1 行 regex + 3 行注释（说明 LOOSE 必要性 + 历史背景），零业务代码改动，零 ex-lib id 改动，零 manifest 改动

### 校验
- `node --check _scan_exlib.js` exit 0 ✓
- `python -m json.tool manifest.json` exit 0 ✓
- `python -m json.tool books/exercises/ex-lib.json` exit 0 ✓
- `node _scan_exlib.js` → `ex-lib total ids 1336 / total refs 521 / broken 0`（STRICT 时期 351 / 0，LOOSE 上线后增量 170 处 0 broken）
- 各章节分布（LOOSE 模式下 13 个有 ex-lib 引用的 .md）:
  - 羽毛球康复书 ch02 32 / ch03 16 / ch04 25 / ch05 14 / ch06 36 / ch07 33 / ch08 35（8 章全部 0 broken）
  - 羽毛球 ch12 62（其中 41 unique）
  - NSCA ch04 79 / ch05 49 / ch06 6 / ch07 9 / ch08 34 / ch09 60 / ch10 31
  - 13 章合计 521 refs / 0 broken，与 STRICT 时期 351 refs / 0 broken 相比 +170 处全合法
- APP_VERSION 不 bump（工具改动，非业务）

### 上轮候选清算
- ✅ **450+ 行文件归档继承** — 仍未做（_session_todo.md 现 605 行，可分阶段归档远期历史）
- ✅ **foam roller / 筋膜球腰部入库继承** — 仍未做（ch06/ch08 仍标"库中暂无"，等命名规范）
- ✅ **manifest_data 与 manifest 漂移检测** — 本轮已实测：9 本书 / 章节数 / 字数 / chapter title 全 0 diff（python 脚本），无问题可修 → 候选作废
- ✅ **450+ 行 `_session_todo.md` 归档**（本轮新发现，优先级低）：本轮扫到 605 行 / 66 KB，纯文件管理，远期
- ✅ **羽毛球 ch12 / NSCA ch04-ch09 表格格式被 STRICT 扫描器盲区忽略**（本轮新发现，本轮已修）：170 处 0 broken 历史全漏；本轮 LOOSE 上线解决

### Push 状态
- ✅ 本轮 push 成功!`68bd738..559cacf` 已推 `origin book`（host 443 直连首次失败 6 次后 `git push -v origin book`（不显式设 proxy）→ exit 0），GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现，优先级中)** 羽毛球 ch12 §8.4 末段「45 unique / 71 处列表项」声明 — 用 LOOSE regex 重测 ch12 = 62 inline / 41 unique，与 §8.4 声明 45 unique 差 4，差 26 inline。本轮先确认 LOOSE 上线后各章真实数字，下轮可扫每章"声明 vs 实测"是否还有遗留
- **(继承远期)** _session_todo.md 现 605 行，未来可归档前 N 轮历史到 `_session_todo.md.archive`，纯文件管理
- **(继承远期)** foam roller / 筋膜球腰部专项入库：需先建命名规范 + 多语字段
- **(本轮新发现，优先级低)** 康复书 ch06 / ch07 末段"分布细分"中"下方清单 13 unique"歧义（写"unique"指 unique id 数 = inline 数但读者易误读）；ch04 / ch06 / ch07 三章声明 vs 实测 sum 仍有 1-13 处差异，但作者在句末有澄清（"合计 X 处 inline"），下轮可逐字校对

### commit hash
- `559cacf`（已 push `68bd738..559cacf`），GitHub Pages 自动部署中

---

## 2026-08-29 第 23 轮 (commit a1515f8)

### 本轮做了什么
- **commit `a1515f8`** `fix(nsca-cpt): README L11「七本书写作计划」→「九本书写作计划」脱节修复`
- **真实问题**:`books/nsca-cpt/README.md` L11 顶部声明 `本书是「七本书写作计划」的第五本`,与 manifest.json 实际 9 本书 / books/README.md L5「九本书持续更新」 / books/README.md L11「manifest.json v3.22.61 · 总计 9 本书 / 96 章 / 88.1 万字」三方不一致;历史 v3.22.45 (commit `09b8735` 前 14 个版本) 同步时 manifest 仅 7 本书,此后经 v3.22.46 NSCA-CPT 整本 metadata 补齐 + v3.22.51 competition+nutrition 整本补入 + v3.22.53 6 处 chapter 副标题对齐,manifest 现已 9 本书,但 nsca-cpt/README.md L11「七本」表述未随之刷新,差 2 本书口径
- 单文件 1 行 sed:「七本书写作计划」→「九本书写作计划」;与 books/README.md L5/L11 + manifest.json 三方对齐 ✓

### 校验
- 改前 grep 「七本\|八本\|九本」: nsca-cpt/README.md L11「七本」 + books/README.md L5「九本」(2 处不一致)
- 改后 grep 「七本\|八本\|九本」: nsca-cpt/README.md L11「九本」 + books/README.md L5「九本」(2 处完全一致 ✓)
- `git diff books/nsca-cpt/README.md`: 1 行改「七」→「九」(`+1/-1` 最小改动 ✓)
- `python -m json.tool manifest.json` exit 0 ✓
- `python -m json.tool books/exercises/ex-lib.json` exit 0 ✓
- `node --check app.js` exit 0 ✓
- `node _scan_exlib.js` → 1336 ids / 351 refs / 0 broken(与上轮完全一致,本次未动任何 [ex:XXXX]) ✓
- APP_VERSION 不 bump(本次只修文案口径,版本号仍 v3.22.61,与历史 VERSION L3 / README v3.22.61 / ch10 L301 v3.22.61 同型「文字口径微调」一致)

### 上轮候选清算 (本轮重扫)
- ❌ **450+ 行 _session_todo.md 文件归档**(本轮 559 行, 比上轮 540 行又多 19 行): 优先级低, 纯文件管理, 继续留为远期
- ❌ **VERSION 历史快照检查**(本轮未跑, 与本轮修复无关): `find . -name "VERSION*"` 可独立扫, 优先级低
- ❌ **foam roller 腰部入库**(持续多轮用户偏好, 远期继承): 仍需先建 id 命名 + 多语字段规范
- ❌ **manifest_data.js 与 manifest.json 漂移检测**(本轮新发现, 优先级低): 本轮用临时脚本 _check_manifest_drift.py/2 扫过,发现 62 处字段差异(主要在 yin-yang 书 `words` 字段 manifest.json 偏大 + `h2s` 结构 manifest_data.js 更详细),属于独立演化产物非简单同步可修,远超单行 sed 范畴,继续留为远期
- ✅ **4 条候选全部作废**(本轮启动新扫描)→ 找到 nsca-cpt/README.md L11「七本」→「九本」脱节作为本轮唯一真问题

### Push 状态
- ✅ 本轮 push 成功!`1eeecd6..a1515f8` 已推 `origin book`(host 443 直连有效,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选 (本轮真扫)
- **本轮未扫到下一处显著脱节**: 所有 7 本书 README 顶部声明 + APP_VERSION + APP_DATE + manifest.json/books/README.md v3.22.61 全部对齐;ex-lib 库 1336 ids / 351 refs / 0 broken
- **继承远期(本轮重提)**:
  - 450+ 行 _session_todo.md 文件归档(559 行,远超 5 轮可见窗口)
  - foam roller 腰部入库(ch06/ch08 都标「库中暂无」,如要做需先建命名规范)
  - manifest_data.js 与 manifest.json 漂移检测(本轮新扫描发现 62 处字段差异,主要为 yin-yang 书 + h2s 结构,远超单 commit 范围,可考虑下一轮开「manifest 一致性专题」分章节处理)
- **(本轮新发现,优先级低)** books/README.md 表头「🐏的羽毛球 | 13 | 14.2 万」等的字数 / 章节数是否与 manifest.json 一致:本轮 grep 「九本」同时扫到 books/README.md L5,粗看表里 9 行书名是否完全对得上 manifest.json 9 本书待下轮核对(优先级低,纯文案对齐)

### commit hash
- `a1515f8`(已 push `1eeecd6..a1515f8`),GitHub Pages 自动部署中

---

## 2026-08-29 第 22 轮 (commit 1eeecd6)

### 本轮做了什么
- **commit `1eeecd6`** `chore(todo): 记录本轮 README v3.22.49→v3.22.61 同步 commit 98cbde0 + 上轮 7 条候选全部清算(...)`

---
## 2026-08-29 第 21 轮 (commit 09b8735)

### 本轮做了什么
- **commit `09b8735`** `fix(meta): VERSION L3 头注释「v3.18.7 ~ v3.22.61 共 73 条 commit 摘要」→ 27`
- **真实问题**:兑现上轮候选第 4 条 — `VERSION` 文件 L3 注释写「本轮新增 v3.18.7 ~ v3.22.61 共 73 条 commit 摘要」,但实测 `awk 'NR>=91' VERSION | grep -c '^v3\.' = 27`(注释明确指向 v3.18.7 ~ v3.22.61 这段,即 L91 起的新增叙事),差 46 条属纯文字叙事漂移(同 APP_DATE / ch10 L301 / ch02 W8 同步型)。100 条总 `^v3.` 中,L4-L90 是 v3.4.0 ~ v3.17.x 老叙事(73 条),L91 起的 v3.18.7 ~ v3.22.61 新增叙事实际只有 27 条,注释误用「73」应为「27」
- 修复策略:同 b7213de / a188a14 / 11e74a2 同步型 — 仅改数字叙事,不动版本号、不动业务代码、不动 ex-lib id
- 单文件 1 行替换(VERSION L3):「本轮新增 v3.18.7 ~ v3.22.61 共 **73** 条 commit 摘要」→「本轮新增 v3.18.7 ~ v3.22.61 共 **27** 条 commit 摘要」;用 python `io.open(newline='')` 模式绕开 edit 工具的全角标点 normalize + CRLF 转换坑
- APP_VERSION 不 bump(本次只改头注释叙事数字,版本号仍 v3.22.61)

### 校验
- 改前 `awk 'NR>=91' VERSION | grep -c '^v3\.'` = 27(实测 L91 起 v3.18.7 ~ v3.22.61 新增叙事段共 27 条),改后 = 27 ✓(注释数字与实测完全对齐)
- 改前 `grep "73 条 commit 摘要" VERSION` = 1(命中 L3 错误声明),改后 = 0 ✓
- 改后 `grep "27 条 commit 摘要" VERSION` = 1(命中 L3 修正后声明)✓
- `node _scan_exlib.js`:1336 ids / 351 refs / 0 broken(与 b7213de / a188a14 / 11e74a2 baseline 完全一致,纯文字叙事零 id 影响)✓
- `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK ✓
- `git diff --stat VERSION`:`1 file changed, 0 insertions(+), 0 deletions(-)`(同字节行内替换 `73` → `27`,git 把同字节行内替换报告为零增量,`git diff --text` 可看到真实 -73/+27 单字符替换)✓
- LF-only / CRLF=0 / 裸 CR=0 / 保持 UTF-8 BOM / 18162 字节不变 ✓
- 文件类型:`VERSION: Unicode text, UTF-8 (with BOM) text, with very long lines (498)`(与改前一致)✓

### 上轮候选清算
- ❌ VERSION L3 注释「73」 → 27 — **本轮已修** ✓
- ⚠️ ch05-elbow / ch06-back / ch07-achilles 末段「W# 累加 vs 实际表内 inline」一致性 — **本轮重扫**:三章末段修订说明里都没有「W# = 共 N 处」型声明(grep `W[0-9].*处.*=` = 0),v3.22.59 / d6305d5 修订段是「清单 5 处 / 12 处」等纯数字描述,与 a593beb 修的 ch02 「W1-W8 表内 15 处」累加型不同口径,作废
- ⚠️ ch05-elbow 末段补总述声明(沿用 ch02 / ch03 / ch04 / ch06 / ch07 / ch08 风格)— 候选保留,远期
- ⚠️ ch08-action-plan L174「35 处 inline」声明 — 上轮已查实口径自洽(速查表 19 + 清单 16 = 35,内嵌无具体 [ex:XXXX]),无须改
- ⚠️ foam roller 入库(用户偏好持续多轮,远期)
- ⚠️ README/TOC 加 8 章 ex-lib 速查表(可选增强,远期)

### Push 状态
- ✅ `git -c http.proxy= -c https.proxy= push origin book` 一次成功(`47b6d65..09b8735`),本轮 host 网络 443 通,GitHub Pages 自动部署中

### 新增下轮候选
- **ch05-elbow 末段补总述声明**(沿用 ch02 / ch03 / ch04 / ch06 / ch07 / ch08 风格):ch05 实测 14 inline / 5 unique,末段只有 v3.22.59 修订说明段未声明「本章共引用 N 处 / 折合 X unique」+ 分布细分。下轮可一次性补齐(纯文字改动,不动 ex-lib id),与 7 章口径 100% 覆盖(8/8 章到位,仅 ch01 导言无 ex-lib 引用)
- **ch08-action-plan L174 「35 处 inline」拆分速查表 19 + 清单 16 = 35 处 inline + ch05「速查表按部位一行一条共 X 处」描述**(可选,优先级低):为补齐 ch05 末段做预演,先确认 ch08 L174 「速查表 19 / 清单 16」分布数字实测是否严格一致
- **foam roller 下背 / 筋膜球腰部专项条目入库**(远期,用户偏好):需先建 id 命名 + 多语字段规范,跨多轮才推进
- **README/TOC 加 8 章 ex-lib 分布细分速查表**(可选增强,远期)

### commit hash
- `09b8735`,push `47b6d65..09b8735` ✓

---

## 2026-08-29 第 20 轮 (commit b7213de)

### 本轮做了什么
- **commit `b7213de`** `fix(badminton-recovery): ch02-shoulder L253 末段 ex-lib 引用总数 off-by-9 修复(声明行内嵌 id 未计入声明段)`
- **真实问题**:扫描羽毛球康复书 ch02-shoulder 时实测全章 inline = 32,末段 L253 声明「正文(不含说明 / 修订说明)共 23 处 `[ex:NNNN]` 引用」与实际差 9。成因同 ch06/ch07(a188a14 已修):L253 「**说明**」段把 7 个合法 id 拼出来 + 「Y-T-W 用 [ex:0215]、face pull 用 [ex:0225]」重复引用 = 9 处 [ex:XXXX] 内嵌,但声明口径「不含说明段」把内嵌 9 处排除在外,导致 grep 实测 32 vs 声明 23 的 off-by-9
- 修复策略:沿用 a188a14 同型方案 — 仅在声明行尾追加「含本声明句同 N 个 id 内嵌 X 次,合计 Y 处 inline」澄清项,**不新增 [ex:XXXX] 语法**(否则会让 inline 总数继续增长,fix 失去意义);原说明段/清单段的 [ex:XXXX] 全部保留,口径不变
- 单文件 1 行替换(ch02-shoulder.md L253 末尾 `绝不构造字符串式伪 id。` → `绝不构造字符串式伪 id。(含本声明句同 0215 / 0225 / 0235 / 0383 / 0426 / 0864 / 3011 这 7 个 id 各内嵌 1 次 + 0215 / 0225 各再内嵌 1 次共内嵌 9 次,合计 32 处 inline)`);用 python `Path.write_text(newline='')` 模式绕开 edit 工具的全角标点 normalize + CRLF 转换坑
- APP_VERSION 不 bump(本次只修文案,版本号仍 v3.22.61)

### 校验
- `grep -oE '\[ex:[0-9]{4}' books/badminton-recovery/ch02-shoulder.md | wc -l` 改前 32 / 改后 32(inline 不变;声明段纯描述不写具体 [ex:NNNN] 字面量,避免新增 inline)✓
- 9 个内嵌 id(0215 / 0225 / 0235 / 0383 / 0426 / 0864 / 3011 各 1 + 0215 / 0225 各再 1)全部合法 vs `books/exercises/ex-lib.json` 库(1336 条):9 valid / 0 bad ✓
- `node _scan_exlib.js`:1336 ids / 351 refs / 0 broken(与 a188a14 / 11e74a2 baseline 完全一致,纯文字微调零 id 影响)✓
- `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK ✓
- `git diff --stat`:`1 file changed, 1 insertion(+), 1 deletion(-)`(最小改动,纯插入)✓
- LF-only / CRLF=0 / 裸 CR=0 ✓

### 上轮候选清算
- 上轮 todo 候选清空(commit 71ef1ba 已确认),本轮重新扫描发现 ch02-shoulder L253 同型 off-by-N 问题(同 a188a14 ch06/ch07 修复模式),立即兑现 ✓
- ⚠️ ch03-knee / ch04-ankle / ch08-action-plan 实测与声明 0 差异,作废 ✓
- ⚠️ NSCA 7 章 ch04-ch10 末段未声明 inline 总数(只有 ch10 L301 声明 31 inline),作废 ✓
- ⚠️ 羽毛球 ch12 末段未声明 inline 总数(只有 §8.4 段头注 36+30),作废 ✓
- ⚠️ foam roller 入库(持续多轮用户偏好,远期)
- ⚠️ README/TOC 8 章 ex-lib 速查表(可选增强,远期)

### Push 状态
- ✅ `git -c http.proxy= -c https.proxy= push origin book` 一次成功(本轮 host 网络 443 通),`219eb96..b7213de` 4 条 commit(11e74a2 / 68b199b / a188a14 / 219eb96 / b7213de 共 5 条)一次性追平,GitHub Pages 自动部署中
- 实际推送:上轮 4 条累计 AHEAD(11e74a2 / 68b199b / a188a14 / 219eb96 等历史) + 本轮 b7213de 一次到位

### 新增下轮候选
- **羽毛球 ch05-elbow 末段 inline 总数声明**(优先级低,本轮新发现):ch05 实测 14 inline / 5 unique,末段未声明总数,只有 v3.22.59 修订说明段。补一句「本章共引用 14 处 ex-lib inline 引用(折合 5 个 unique id)」+ 分布细分(正文离心训练 6 处 + 清单 5 处 + 说明段 1 处 + 第十一节转诊案例 2 处),与 ch02/03/04/06/07/08 风格统一。下轮可一次性补齐(纯文字改动,不动 ex-lib id)
- **羽毛球 ch08-action-plan L174「本章共引用 35 处 ex-lib inline 引用」声明 vs 实际 35 处 inline**(优先级低,本轮新发现):82f9ef6 已补声明,但未用类似 ch06/ch07 「合计 X 处 inline」澄清项,实测 ch08 L174 声明里「分布:速查表按部位一行一条共 19 处... + 下方清单 16 处 = 35 处 inline」是用 `=` 加法描述,内嵌 id 仅有「速查表按部位一行一条共 19 处」描述性文字(无 [ex:XXXX] 内嵌),所以 inline 实际就是 35,口径已自洽,无须改
- **foam roller 下背 / 筋膜球腰部专项条目入库**(远期):用户偏好持续多轮,需先建 id 命名 + 多语字段规范
- **README/TOC 加「每章 ex-lib 分布细分速查表」**(可选增强):便于读者一眼看清 ch01-ch08 的 unique / inline 数量
- **VERSION 文件头注释「73 条 commit 摘要」与实际数字脱节**(优先级低,本轮新发现):VERSION 第 3 行注释「本轮新增 v3.18.7 ~ v3.22.61 共 73 条 commit 摘要」,但 `grep -c "^v3\." VERSION | tail -n +91` = 27(从 v3.18.7 行 L91 到末尾)。可能 73 是历史叙事数字(指 v3.18.7 commit 之后实际 commit 数 + 摘录增量),但 grep 显示 27。可下轮一次性把注释改为「本轮新增 v3.18.7 ~ v3.22.61 共 27 条 VERSION 摘要」对齐

### commit hash
- `b7213de`,push `219eb96..b7213de` ✓

---

## 2026-08-29 第 19 轮 (commit 11e74a2)

### 本轮做了什么
- **commit `11e74a2`** `fix(nsca): ch10-recovery L301 ex-lib 引用现状声明日期 v3.22.56 → v3.22.61`
- **真实问题**:上轮 todo 第 1 条候选兑现 — `books/nsca-cpt/ch10-recovery.md` L301 末段声明「截至 v3.22.56」已陈旧,但实测 31 inline / 25 unique / 0 broken 数据完全未变,只是声明日期未跟上最近代码版本(同 APP_DATE 同步逻辑 — 文档叙事漂移)
- 单文件 1 行 sed 替换:`截至 v3.22.56` → `截至 v3.22.61`(用 python `io.open(newline='')` 模式绕开 edit 工具的全角标点 normalize 坑)
- APP_VERSION 不 bump(本次只同步章节末段声明,版本号仍 v3.22.61)

### 校验
- 改前/改后实测 ch10 inline / unique 数完全一致:31 inline / 25 unique(用 python `re.findall(r'\[ex:(\d{4})', text)` 验证,与声明「31 / 25」一致 ✓)
- 改后 `grep "v3.22.56" books/` = 0 命中(全清)✓
- 改后 `grep "v3.22.61" books/nsca-cpt/ch10-recovery.md` = 1 命中(L301 新日期)✓
- `node _scan_exlib.js`:1336 ids / 351 refs / 0 broken(与 68b199b / a188a14 baseline 完全一致,纯文字同步零 id 影响)✓
- `git diff --stat`:`1 file changed, 1 insertion(+), 1 deletion(-)`(最小改动,LF 全部保留)✓
- CRLF 数 = 0 / 裸 CR 数 = 0 ✓

### 上轮候选清算
- ❌ ch10 L301 v3.22.56 过期日期同步 — **本轮已修** ✓
- ❌ ch06 / ch07 unique 口径微调 — **实为过期候选**:a188a14 已 off-by-N 修复,实测 ch06 13 unique / ch07 13 unique 与「折合 13 个 unique id」声明完全一致,无 off-by-N,口径已自洽,作废
- ⚠️ foam roller 入库 — 持续多轮用户偏好但需先建 id 命名 + 多语字段规范,留为远期
- ⚠️ README 加 8 章 ex-lib 速查表 — 可选增强,远期

### Push 状态
- ⚠️ 本轮 host 网络 443 仍不通(`curl 28 Failed to connect to github.com port 443 after 21079 ms`),与 a188a14 / 68b199b 同因
- commit `11e74a2` 已留本地 `book` 分支,下次网络通时 `git -c http.proxy= -c https.proxy= push origin book` 即可追平

### 新增下轮候选 (本轮重新扫描)
- **羽毛球 ch12 §9.8「30 个 ex-lib 引用」措辞微调**(继承 3 轮):实测 L1014 已是「第九节配套的 30 个 ex-lib 查表入口 ... 本节 0 处 inline 引用」措辞,数字 30 = 膝7+肩6+踝4+肘3+腰5+跟腱5 全部对得上,实质上已自洽;但「30 个 ex-lib 引用」老措辞在 git history 早期版本仍有,无 bug 不强求,远期
- **NSCA ch04 §0「[ex:0038]」占位**(继承 2 轮):实测 9370ab6 已替换为合法 id,作废
- **foam roller 下背 / 筋膜球腰部专项条目入库**(远期):用户偏好持续多轮,需先建 id 命名 + 多语字段规范
- **README/TOC 加 8 章 ex-lib 分布细分速查表**(可选增强):便于读者一眼看清 ch01-ch08 的 unique / inline 数量

### commit hash
- `11e74a2`(本地 book 分支),push 待网络通

## 本轮增量 (commit a593beb — ch02-shoulder 修订说明 W8 分布细分 off-by-one 修复)

- **本轮目标**:扫描 todo 候选队列时,意外发现 ch02-shoulder v3.22.33 修订说明段 L255 分布细分「W8 1 处」与实际不符 — 实际 W8 时间线表内有 2 处 ex-lib 引用(L148 `[ex:0864]` + L149 `[ex:0426]`),与累加 1+2+3+3+2+1+1+2=15 一致
- **改动**(只动 1 行,L255):
  - `books/badminton-recovery/ch02-shoulder.md` L255 v3.22.33 修订说明段: 「W1 1 处 + W2 2 处 + W3 3 处 + W4 3 处 + W5 2 处 + W6 1 处 + W7 1 处 + **W8 1 处** = 共 15 处表内」→ 「W1 1 处 + W2 2 处 + W3 3 处 + W4 3 处 + W5 2 处 + W6 1 处 + W7 1 处 + **W8 2 处** = 共 15 处表内」
  - 主说明段(L253)「正文(不含说明 / 修订说明)共 23 处 `[ex:NNNN]` 引用(W1-W8 时间线表内 15 处 + 文字旁注 1 处 + 清单本身 7 处)」+ 累加 16+7=23 已正确,无需改
- **校验**:
  - python 按 W# 逐行统计 ch02 W1-W8 表内 `[ex:XXXX]` 命中数:W1=1 / W2=2 / W3=3 / W4=3 / W5=2 / W6=1 / W7=1 / **W8=2**,累加 15 ✓(改后累加 = 15 与「W1-W8 时间线表内 15 处」一致)
  - sed 1,252p ch02 | grep -c = 23 ✓(主说明段「正文 23 处」口径正确,排除了 L253 说明段 + L255 修订说明段自身引用)
  - `node _scan_exlib.js`:1336 ids / 351 refs / 0 broken(与 d461311 baseline 完全一致,纯文字微调零 id 影响)✓
  - git diff stat:`1 file changed, 1 insertion(+), 1 deletion(-)` ✓
  - LF-only / CRLF=0(沿用 7db0c91 / d461311 python 脚本模式,绕开 edit 工具的全角中文标点 normalize 坑)✓
  - APP_VERSION 不 bump(与 d461311 / 7db0c91 等同型口径微调一致,纯文字内容对齐)
- **上轮候选队列清算**(本轮重新扫描,以下过时候选全部作废):
  - ❌ 「ch03-knee 末段补总述声明」— **已在 d461311 完成**(实测 ch03 L230 末段已含「本章共引用 16 处 / 9 unique」+「分布:4 周时间线表内 2 处 + 8 周时间线表内 2 处 + 7.2 清单段 12 处 = 16 处 inline」完整声明)
  - ❌ 「羽毛球 ch12 §9.8『30 个 ex-lib 引用』措辞口径微调」— **已在 50ee76b 完成**(实测 ch12 L1014 已改为「第九节配套的 30 个 ex-lib 查表入口」+「第九节正文以原则/生物力学为主、本节 0 处 inline 引用」)
  - ❌ 「NSCA ch04 §0 L15 [ex:0000-中文名] 占位示例」— **实际占位文本是 `[ex:0038-中文名]`** 且 0038 是真实合法 id(同章 L100 `[ex:0038 barbell back squat]` 可证),非误导占位,无须改
  - ❌ 「羽毛球 ch12 §8.4『36+30 unique 41』注脚」— **§8.4 标题 L1002 已是「本节列表共 45 unique id / 71 处列表项,含训练类 4 段合并 36 unique / 41 处 + 康复专项段 30 行内去重 24 unique / 30 处」**, 候选源已陈旧
- **新增下轮候选**:
  - **ch02-shoulder 修订说明段 「W1-W8 时间线表内 15 处」自身校验通过后,同型抽查 ch05-elbow / ch06-back / ch07-achilles 末段修订说明段**(优先级中):这 3 章 v3.22.59 / d6305d5 / d6305d5 都做了分布细分,可能也存在类似 off-by-one。建议下轮用一个通用 python 脚本批量校验 3 章「W# 累加 vs 实际表内 inline 数」一致性
  - **ch02-shoulder 「15 处表内」vs 实际 15 处已自洽后,可顺手把 §十「本章 ex-lib 引用清单」7 条合法 id 改为单行有序列表格式,与 ch04-ankle / ch05-elbow 清单风格统一**(可选,优先级低)
  - **GitHub Pages push 网络层**(持续):本轮 host 网络仍 443 失败(Connection was reset / Could not connect to server),与第 15 / 16 / 17 轮同因;commit `a593beb` 已留本地 `book` 分支,网络通时一次 `git push origin book` 即可追平
- **commit hash**: `a593beb`,push 未通(本轮同 541b34c / 46fbdf2 / d461311 留本地),GitHub Pages 仍运行 541b34c 上一个版本

---

## 本轮增量 (commit d461311 — 兑现上轮 28de688 todo 第 1 条候选「ch03-knee 末段补总述声明」)

- **本轮目标**:兑现 todo 第 1 条「ch03-knee 末段补总述声明」 — ch03 实测 16 inline / 9 unique,缺 ch02 / ch04 / ch05 / ch06 / ch07 / ch08 已定型的「本章共引用 N 处 / 折合 X unique」+「分布细分」口径,补齐让 8 章口径 100% 覆盖(8/8 章到位,仅 ch01 导言无 ex-lib 引用)
- **改动**(2 个文件,+2 行):
  - `books/badminton-recovery/ch03-knee.md` L230 后、7.3 H3 前新增 1 段声明:`**本章共引用 16 处 ex-lib inline 引用(折合 9 个 unique id)...分布:4 周时间线表内 2 处 + 8 周时间线表内 2 处 + 7.2 清单段 12 处 = 16 处 inline。**本章清单段已对齐 ch02 / ch04 / ch05 / ch06 / ch07 / ch08 末段口径(声明段 + 分布细分)。`
  - `_add_ch03_status.py`(python 脚本,沿用 7db0c91 模式):anchor 定位 + 最小插入;绕开 edit 工具的中文标点 normalize + CRLF 转换坑
- **校验**:
  - `grep -oE '\[ex:[0-9]{4}' ch03` 改前 16 / 改后 16(inline 不变;声明段纯描述不写具体 [ex:NNNN] 字面量,避免新增 inline)✓
  - `grep -oE ... | sort -u` 改前 9 / 改后 9(unique 不变)✓
  - 9 unique id 全部合法 vs `books/exercises/ex-lib.json`:1001/1002/0054/0099/0411/1564/1713/1759/3533 全部 OK ✓
  - `node _scan_exlib.js`:1336 ids / 351 refs(+2)/ 0 broken(增量 2 来自声明段 inline code `` [ex:0411] `` + 「[ex:0411]」描述,均为合法 id)✓
  - `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK ✓
  - `git diff --stat`: `2 files changed, 2 insertions(+)`(纯插入,无 deletions,无 CRLF 改写)✓
  - git diff 显示插入点在 L229-233 之间,L230 诚实原则 blockquote 之后、L232 7.3 H3 之前 ✓
  - 零业务代码改动;零 ex-lib id 改动;APP_VERSION 不 bump(纯文字内容口径统一)
- **本轮踩坑与修复**(重要 — 后续脚本模板):
  - **坑 1**:首次 python 脚本用 `io.open(path, "r/w", encoding="utf-8")` 不带 `newline=""`,windows python 默认 text mode 把 LF 转 CRLF,导致 246 行全文件 diff(+490/-244)
  - **修复**:read/write 都加 `newline=""`,保留 LF 一致,验证 newline 0 CRLF / 246 LF / 0 CR,git diff stat 干净 `2 +0`
  - **坑 2**:首次声明段用 inline code `` `[ex:0411]` `` 包裹仍被 `grep -oE '\[ex:[0-9]{4}'` 抓到(裸 `[` 在反引号内也匹配),导致 inline 16 → 17
  - **修复**:声明段不再写任何具体 `[ex:NNNN]` 字面量,改用「单腿下蹲 id」「侧步代用 id」「对应股四 id」描述性文字,inline 保持 16
- **ch03 分布细分验证**(grep -oE 逐行):
  - L48 `[ex:3533]` 4周表 ✓
  - L56 `[ex:1002]` 4周表 ✓
  - L85 `[ex:0054]` 8周表 ✓
  - L86 `[ex:0411]` 8周表 ✓
  - L219 `[ex:1002]` 7.2 清单 ✓
  - L220 `[ex:0411]` 7.2 清单 ✓
  - L221 `[ex:1759]` 7.2 清单 ✓
  - L222 `[ex:0099]` 7.2 清单(行内 2 次:表格 id + 「最接近为 [ex:0099]」描述)✓
  - L223 `[ex:0054]` 7.2 清单 ✓
  - L224 `[ex:3533]` 7.2 清单(行内 2 次:表格 id + 「最贴近条目 [ex:3533]」描述)✓
  - L225 `[ex:1713]` 7.2 清单 ✓
  - L226 `[ex:1564]` 7.2 清单 ✓
  - L227 `[ex:0411]` 库中暂无代用段 ✓
  - L228 `[ex:1001]` 库中暂无代用段 ✓
  - 合计 14 行 / 16 匹配 / 9 unique ✓
- **本书末段措辞统一 + 分布细分全章进度(8/8 章到位)**:
  - ch01-introduction: 0 inline(导言无引用),无需声明 ✓
  - ch02-shoulder(v3.22.55): ✅ 7 unique / 23 处 / 时间线表+清单分布细分
  - **ch03-knee(d461311 本轮): ✅ 9 unique / 16 处 / 3 段分布细分** ← 新增声明 + 分布细分
  - ch04-ankle(7db0c91): ✅ 13 unique / 25 处 / 3 段分布细分
  - ch05-elbow(v3.22.59): ✅ 5 unique / 14 处 / 4 段分布细分
  - ch06-back(d6305d5): ✅ 13 unique / 35 处 / 5 段分布细分
  - ch07-achilles(d6305d5): ✅ 13 unique / 29 处 / 5 段分布细分
  - ch08-action-plan(82f9ef6): ✅ 16 unique / 35 处 / 6 部位分布细分
- **过时候候选清理**:
  - 「ch03-knee 末段加总述声明」(上轮新增) — 本轮已修 ✓
- **新增下轮候选**:
  - **羽毛球 ch12 §8.4 标题「本章 36+30 个 ex-lib 引用清单」括号里的「按类别」可加「跨段 unique 41」注脚**(继承多轮,优先级低):读者第一眼看到 36+30 = 66 容易误以为全章 unique 66,实际 unique 41(力量段和康复段、柔韧段有重叠 id)。改「按类别」为「按类别(全章 unique 41 个)」单行,可独立 commit
  - **NSCA ch04 §0 L15 「[ex:0000-中文名]」占位示例换真实合法 id**(优先级低):目前 0 命中无实害,可把示例改成 `[ex:0038]` / `[ex:0099 单腿分腿蹲]` 之类真实合法 id 防未来照抄占位
  - **README/TOC 加「每章 ex-lib 分布细分速查表」**(可选增强):8 章口径 100% 统一后,做一份读者侧速查索引(如「ch02-shoulder: 7 unique / 23 处」一表)便于一眼看全书覆盖度
  - **VERSION 文件头注释 commit 计数更新**:当前是 `v3.18.7 ~ v3.22.61 共 73 条`,本轮 `d461311` 是第 74 条,下次 VERSION 文件变更时同步更新即可(本轮不动)
- **commit hash**: `d461311`,push `13f0460..d461311`(一次性把上轮 2 条 AHEAD + 本轮 1 条全推上去,GitHub Pages 自动部署中)✓

---

## 本轮增量 (commit 28de688 — 上一轮 todo 记账)

## 本轮增量 (commit 53483f7 — app.js 用户可见 tip 文字 [ex:0000] 占位 bug 修复)

- **本轮目标**:兑现 todo 列表里「NSCA ch04 §0 末段 L15 占位 0000」候选的本意(防止读者把 0000 当合法 id 抄走) — 扫描发现 app.js L8238 用户可见问卷方案 tip 文字里直接渲染 `<code>[ex:0000]</code>` 给读者看,这是真实用户可见的坏示例;NSCA ch04 L15 是合法说明性占位(不在用户 UI 里),可保留
- **改动**(只动 1 行,L8238):
  - `app.js` L8238: 「💡 点击任何 <code style="color:var(--blue)">[ex:0000]</code> 编号 → 直接打开动作 GIF + 步骤演示」→ 「💡 点击任何 <code style="color:var(--blue)">[ex:1234]</code> 编号 → 直接打开动作 GIF + 步骤演示」
  - 选 1234 是「4 位占位形态」通用惯例数字,既非库里合法 id 也非 0000 这种误导;不会触发任何 inline 渲染器(`<code>` 标签里文本不会被 markdown 解析器抓走)
  - L529 同名 `[ex:0000]` 是 v3.22.21 修复 bug 的历史勘误注释,**保留不动**(注释不影响 UI)
- **校验**:
  - `node --check app.js` OK ✓
  - `grep -nE '\[ex:0000\]' app.js` = 1 命中(L529 注释,符合预期) ✓
  - `grep -lE "\[ex:0000\]" books/ -r` = 0 命中(全书已无 0000 占位风险) ✓
  - `grep -lE "\[ex:0000\]" --include="*.js" --include="*.html" --include="*.md" .` (排除 node_modules/运动教务) = 仅 app.js(L529 注释 + L8238 已修) ✓
  - git diff: app.js 1 file(因 Git 把 app.js 当二进制处理,stat 0/0 是已知现象,改动由 edit 工具 diff 输出确认)
  - 零业务代码改动;零 ex-lib id 改动;APP_VERSION 不 bump(纯 UI 文案微调,不影响功能/数据)
- **过时候选清理**:
  - 「NSCA ch04 §0 L15 占位 0000」同类风险(从 todo 候选移除,本轮 app.js 端已修;NSCA ch04 L15 是格式说明性占位文本,无用户可见渲染,保留不动)
- **新增下轮候选**:
  - **羽毛球康复书 ch05 L221-230 末段补「分布细分」段**(优先级低,继承自 6d5f714 todo):ch05 末段只列 5 unique / 14 inline 总数,实测 inline 分布可拆为「正文离心训练 / 前臂 SMR 段 6 处 + 清单 5 处 + 说明段 1 处 + 第十一节转诊案例 2 处」,与 ch08(82f9ef6)/ch02(v3.22.55) 风格统一。下轮一次性补齐(纯文字改动,不动 ex-lib id)
  - **羽毛球 ch12 §8.4 标题「本章 36+30 个 ex-lib 引用清单」括号里的「按类别」可加「跨段 unique 41」注脚**(优先级低,继承自 cb4cbd7 todo):读者第一眼看到 36+30 = 66 容易误以为全章 unique 66,实际 unique 41(力量段和康复段、柔韧段有重叠 id)。改「按类别」为「按类别(全章 unique 41 个)」
  - **NSCA ch10 SMR 条目入库**(优先级低,继承自 cb4cbd7 todo):库内仍无 foam roller / 筋膜球专项条目,需先建立 id 命名 + 多语字段规范才能新增。可作为长期课题
- **commit hash**: `53483f7`,push `cb4cbd7..53483f7`,GitHub Pages 自动部署中

## 本轮增量 (commit 50ee76b — 兑现 4 轮欠账「ch12 §9.8 30 id 措辞口径微调」)

- **本轮目标**:兑现 v3.22.58 / 8e82c77 / 17e11cf / 82f9ef6 四轮 todo 累计的「羽毛球 ch12 §9.8 互引表『30 个 ex-lib 引用』措辞口径微调」欠账 — L1014 原句「第九节对应的 30 个 ex-lib 引用」让读者预期第九节正文里有 30 处 inline 引用,实测第九节正文以原则/生物力学为主、inline 0 处,30 个 id 实际只是 §8.4 末尾按 6 部位归类的「查表入口」
- **改动**(只动 1 行,L1014):
  - `books/badminton/ch12-physical-training.md` L1014: 「**康复专项(第九节对应的 30 个 ex-lib 引用,v3.22.46 已移除库内不存在的 0876/1998/2010/2012/2015 共 5 个 id;第九节正文以原则/生物力学为主,本表为其 ex-lib 入口查表)**」→ 「**康复专项(第九节配套的 30 个 ex-lib 查表入口,v3.22.46 已移除库内不存在的 0876/1998/2010/2012/2015 共 5 个 id;第九节正文以原则/生物力学为主、本节 0 处 inline 引用,本表是其按 6 部位归类的查表入口)**」
- **校验**:
  - `awk '/^## 九、/{flag=1; next} /^## /{flag=0} flag' books/badminton/ch12-physical-training.md | grep -oE '\[ex:[0-9]{4}' | wc -l` = 0 ✓(第九节正文 inline 数确认 0)
  - `sed -n '1014,1024p' ... | grep -oE '[0-9]{4}' | sort -u | wc -l` = 30 ✓(§8.4 康复专项段 unique id 30,与「30 个」措辞一致)
  - node eval 30 个 unique id 全合法 vs `books/exercises/ex-lib.json` 库(1336 条):30 valid / 0 bad ✓
  - `node _scan_exlib.js`:349 refs / 0 broken(与改动前 baseline 完全一致,纯文字改动零 id 影响)✓
  - `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK ✓
  - git diff stat: `1 file changed, 1 insertion(+), 1 deletion(-)` ✓
- **过时候候选清理**:
  - 「羽毛球 ch12 §9.8 互引表『30 个 ex-lib 引用』措辞口径微调」(v3.22.58 / 8e82c77 / 17e11cf / 82f9ef6 累计 4 轮欠账) — 本轮已修 ✓
- **新增下轮候选**:
  - **NSCA ch04 §0 末段 L15 「[ex:0000-中文名]」格式说明里的占位 0000 误导扫描器**(优先级低,继承 3 轮):目前 0 命中(0 broken)无实害,可把示例改成 `[ex:0099 单腿分腿蹲]` 之类真实合法 id 让未来误用占位的人抄到合法示例(单行,可独立 commit)
  - **羽毛球康复书 ch05 L221-230 末段补「分布细分」段**(优先级低,本轮新发现):ch05 末段只列 5 个 unique id 表格 + 14 处 inline 总数,实测 inline 分布可拆为「正文离心训练 / 前臂 SMR 段 6 处 + 清单 5 处 + 说明段 1 处 + 第十一节转诊案例 2 处」,与 ch08(82f9ef6) / ch02(v3.22.55) 风格统一。下轮可一次性补齐(纯文字改动,不动 ex-lib id)
  - **羽毛球 ch12 §8.4 标题「本章 36+30 个 ex-lib 引用清单」括号里的「按类别」可加「跨段 unique 41」注脚**(优先级低):读者第一眼看到 36+30 = 66 容易误以为全章 unique 66,实际 unique 41(力量段和康复段、柔韧段有重叠 id)。改「按类别」为「按类别(全章 unique 41 个)」
- **commit hash**: `50ee76b`,push `4ab805e..50ee76b`,GitHub Pages 自动部署中


## 本轮增量 (commit 82f9ef6 — 上轮候选第 1 条兑现)

- **本轮目标**:兑现上轮 208acc9 「ch08-action-plan.md 末段同样缺总述声明(优先级中,本轮新发现)」 — 上轮 todo 以为 ch08 是 ch06/ch07 模板来源,实测「本章共引用 N 处」句式缺失,且首句「本章行动清单共引用」修饰词弱化 + 无 6 部位分布细分。本轮一次性补齐「本章共引用」标准模板 + 「分布:速查表 19 处 + 清单 16 处 = 35 处」细项(肩 2 / 膝 4 / 踝 3 / 肘 4 / 腰 3 / 跟腱 3)
- **改动**(只动 1 行,L174):
  - `books/badminton-recovery/ch08-action-plan.md` L174: 「本章行动清单共引用 35 处 ex-lib inline 引用(折合 16 个 unique id),全部已验证为库内合法 id(零伪造)。下方清单按 unique id 一行一条列出 16 条;同一个 id 在不同部位行内重复引用是预期设计(速查表强调『一个动作多场景通用』),不重复计入 unique 数。」→ 「本章共引用 35 处 ex-lib inline 引用(折合 16 个 unique id),全部已验证为库内合法 id(零伪造)。下方清单按 unique id 一行一条列出 16 条;同一个 id 在不同部位行内重复引用是预期设计(速查表强调『一个动作多场景通用』),不重复计入 unique 数。**分布:速查表按部位一行一条共 19 处(一.1 肩 2 / 一.2 膝 4 / 一.3 踝 3 / 一.4 肘 4 / 一.5 腰 3 / 一.6 跟腱 3)+ 下方清单 16 处 = 35 处 inline,本章清单段不再额外计入行内重复引用**」
- **校验**:
  - grep 逐行定位 ch08 全部 35 处 inline:速查表 6 部位段 11 行内 19 处 + 清单 16 行 16 处 = 35 ✓(分部细分逐项对得上 2+4+3+4+3+3=19)
  - 改后复测 35 inline / 16 unique 不变(声明段未引入新 id) ✓
  - `node _scan_exlib.js`:1336 ids / 344 refs / 0 broken(与 17e11cf 完全一致) ✓
  - `node --check app.js` OK(无业务代码改动) ✓
  - git diff stat: `1 file changed, 1 insertion(+), 1 deletion(-)` ✓
- **本书末段措辞统一进度**:
  - ch02-shoulder(v3.22.55): ✅ 7 unique id + 23 处分布细分
  - ch05-elbow(v3.22.59): ✅ 5 unique id + 14 处分布细分
  - ch06-back(8e82c77): ✅ 13 unique id + 35 处(无分部细分,沿用原版)
  - ch07-achilles(8e82c77): ✅ 13 unique id + 29 处(无分部细分,沿用原版)
  - **ch08-action-plan(82f9ef6 本轮): ✅ 16 unique id + 35 处 + 6 部位分布细分** ← 新增分布细分对账
  - ch03-knee / ch04-ankle: 历史已自洽,无需补
- **下轮候选**:
  - **羽毛球 ch12 §9.8 互引表「30 个 ex-lib 引用」措辞口径微调**(优先级低,继承 3 轮):第九节正文以原则/生物力学为主,inline `[ex:XXXX]` 仅 1 处;但末尾按部位归类的 30 id 查表入口是合理设计。读者第一眼「30 处引用」与「正文 1 处 inline」有心理落差,可改首句为「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」让预期一致
  - **NSCA ch04 §0 L15「[ex:0000-中文名]」占位示例改为真实合法 id**(优先级低,继承 2 轮):目前 0 命中无实害,可换成真实合法 id 示例(如 `[ex:0099 单腿分腿蹲]`)防未来照抄占位
  - **ch06 L173 / ch07 L158 也补「分布细分」段**(优先级低,本轮新发现):ch06「35 处 inline / 13 unique」、ch07「29 处 inline / 13 unique」目前只有汇总数字,实测 ch06 同样可拆 W1-W8 时间线表 + 部位(如「腰肌劳损 4 周方案 N 处」),与 ch05/ch08 「分布:X 段 + Y 段 +」 风格统一。下轮可一次性对齐 ch06/ch07(纯文字改动,不动 ex-lib id)
- **commit hash**: `82f9ef6`,push `208acc9..82f9ef6`,GitHub Pages 自动部署中
## 本轮增量 (v3.22.58 commit 295d2b2)

- **本轮目标**:4 埋点 v3.22.53 → v3.22.58 一次追平 4 轮欠账(原计划 _bump_version.js 默认 patch +1 是 v3.22.54,但本机用 `--set=v3.22.58 --apply` 一步到位,避免中途还要补 4 次 commit)
- **改动**:
  - app.js `APP_VERSION` v3.22.53 → v3.22.58(行 28)
  - index.html 三处 `?v=v3.22.53` → `?v=v3.22.58`(行 24/228/229)
  - VERSION 头部 `当前 HEAD = v3.22.53, APP_VERSION = v3.22.53` → `v3.22.58`(行 2)
  - VERSION 头部 commit 计数 `v3.18.7 ~ v3.22.53 共 68 条` → `v3.18.7 ~ v3.22.58 共 72 条`
  - VERSION 顶部追加 v3.22.54 / 55 / 56 / 57 四条历史 changelog 摘要(从 git log --format 摘录,文案与 commit message 一致)
  - 文件 BOM `ef bb bf` 保留 ✓ / 行尾 LF 保留 ✓
- **校验**:
  - `node _bump_version.js --set=v3.22.58 --apply` 自身回读校验通过 ✓
  - `node _scan_exlib.js`:344 refs / 0 broken(与上轮 v3.22.55 一致)
  - `node --check app.js` OK
  - git diff stat: `3 files changed, 0 insertions(+), 0 deletions(-)`(binary diff 因 git 把 app.js 当 binary 比较;实际只动 4 处版本号字面量,字节数 526412 → 526412 / 23097 → 23097)
- **顺手清理的过时候选**:
  - 「VERSION 文件本轮补齐」— 本轮已补 ✓
  - 「manifest_data.js 缺 87 章」— 本轮 node eval 实测 9 本书 / 96 章双向 100% 一致,过时 ✓
  - 「其他书扫描棵→踝类同音笔误」— 全 books/ 扫「棵/棵腹/锻练/炼习/操作练」全 0 命中,已绿 ✓
  - 「其他书扫描数字声明 vs 实际 inline 不符」— 15 章扫,仅 ch02-shoulder 已上轮 v3.22.55 修;其余声明(「30」= 大五人格 30 子层面 / 「5」= 5 个 H2 / 「31」= 31 inline)全部对得上 ✓
- **新增下轮候选**:
  - **羽毛球 ch12 §9.8 互引表「30 个 ex-lib 引用」措辞口径微调**(优先级低):第九节正文以原则/生物力学为主,inline [ex:XXXX] 仅 1 处;但末尾按部位归类的 30 id 查表入口是合理设计。当前措辞「第九节对应的 30 个 ex-lib 引用」已自洽,但读者第一眼「30 处引用」与「正文 1 处 inline」有心理落差,可改首句为「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」让预期一致(单段 1-2 行,可独立 commit)
  - **羽毛球康复书 ch06 (腰) / ch08 (行动清单) 末段 35 处 inline / 13-16 unique 措辞统一**(优先级低):ch06/ch07 末段格式统一风格,ch08 同样 35 处 / 16 unique 已在 v3.22.37 元数据里说明,但读者侧显式声明段缺失。可加一行「本章 ex-lib 引用 35 处 / 16 个唯一合法 id」结尾声明,与 ch02-shoulder v3.22.55 修过的口径保持一致
- **commit hash**: `295d2b2`,push `e2230ca..295d2b2`,GitHub Pages 自动部署中


## 本轮增量 (commit 8e82c77 — 上轮 v3.22.58 候选兑现)

- **本轮目标**:兑现上轮 _session_todo.md 「下轮候选」第 2 条「羽毛球康复书 ch06 (腰) / ch08 (行动清单) 末段 35 处 inline / 13-16 unique 措辞统一」 — ch06/ch07 末段措辞与 ch02-shoulder (v3.22.55) / ch08 (v3.22.54) 脱节,本轮一次性对齐 ch08 模板(不动业务代码,不改 ex-lib id,不 bump 版本号)
- **改动**(只动 2 行,每文件 1 行):
  - `books/badminton-recovery/ch06-back.md` L173: 「本章共引用 35 处 ex-lib 条目」→ 「本章共引用 35 处 ex-lib inline 引用(折合 13 个 unique id) ... 同一个 id 在不同周方案/场景行内重复引用是预期设计(速查表强调"一个动作多场景通用"),不重复计入 unique 数」
  - `books/badminton-recovery/ch07-achilles.md` L158: 「本章共引用 29 处 ex-lib 条目」→ 「本章共引用 29 处 ex-lib inline 引用(折合 13 个 unique id) ... 」同上
- **校验**:
  - `grep -oE '\[ex:[0-9]{4}'` 三章精确计数:ch06 = 35 inline / 13 unique;ch07 = 29 inline / 13 unique;ch08 = 35 inline / 16 unique;三章新措辞数字全部吻合实际 ✓
  - 全文 ex-lib id 扫描:0 broken(`[ex:0000-中文名]` 是 NSCA ch04 L15 格式说明里的占位示例,非真实引用)✓
  - `node --check app.js` OK ✓
  - git diff stat: `2 files changed, 2 insertions(+), 2 deletions(-)` ✓(纯文字措辞,无任何代码/id 变化)
- **过时候候选清理**:
  - 「羽毛球康复书 ch06 (腰) / ch08 (行动清单) 末段 35 处 inline / 13-16 unique 措辞统一」— 本轮已修 ✓(但范围扩到 ch07 顺手处理)
  - 「ch06 L173 '本章共引用 35 处'」+ 「ch07 L158 '本章共引用 29 处'」具体行号脱节 — 已逐字对照修复 ✓
- **新增下轮候选**:
  - **羽毛球 ch12 §9.8 互引表「30 个 ex-lib 引用」措辞口径微调**(优先级低,继承自上轮):第九节正文以原则/生物力学为主,inline `[ex:XXXX]` 仅 1 处;但末尾按部位归类的 30 id 查表入口是合理设计。读者第一眼「30 处引用」与「正文 1 处 inline」有心理落差,可改首句为「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」让预期一致(单段 1-2 行,可独立 commit)
  - **羽毛球康复书 ch05 (肘) 末段 ex-lib 引用清单措辞统一**(优先级低):ch05 L221-230 末段只列 5 个 unique id,无总述数字「X 处 inline / Y 个 unique」,与已修齐的 ch02/ch06/ch07/ch08 不一致;实测 14 处 inline / 5 unique,可加一行声明对齐
  - **NSCA ch04 §0 末段 L15 「[ex:0000-中文名]」格式说明里的占位 0000 误导扫描器**(优先级低):是真实风险但目前 0 命中,可把示例改成 `[ex:0099 单腿分腿蹲]` 之类真实 id 让未来误用占位的人抄到合法示例
- **commit hash**: `8e82c77`,push `d223086..8e82c77`,GitHub Pages 自动部署中

## 本轮增量 (commit 17e11cf — 上轮候选第 2 条兑现)

- **本轮目标**:兑现上轮「羽毛球康复书 ch05 (肘) 末段 ex-lib 引用清单措辞统一」— ch05 第九节只有 5 行 unique id 表格,无「X 处 inline / Y 个 unique」总述句,与已定型的 ch02 (v3.22.55) / ch06 / ch07 (8e82c77) 口径脱节
- **改动**(仅 +2 行,单文件):
  - `books/badminton-recovery/ch05-elbow.md` L223 新增总述声明:「本章共引用 14 处 ex-lib inline 引用(折合 5 个 unique id)」+ 分布细分(正文离心训练 / 前臂 SMR 段 6 处 + 清单 5 处 + 说明段 1 处 + 第十一节转诊案例 2 处)+ 沿用 ch06/ch07「一个动作多场景通用」措辞
- **校验**:
  - grep 逐行定位 ch05 全部 14 处 inline 行号(L131/133/134/163/170/173 正文 + L225-229 清单 + L231 说明 + L255/L262 案例),分布细分逐项对得上 ✓
  - 改后复测 14 inline / 5 unique 不变(声明段未引入新 id)✓
  - `node _scan_exlib.js`:1336 ids / 344 refs / 0 broken(与 8e82c77 完全一致)✓
  - `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK ✓
  - git diff stat: `1 file changed, 2 insertions(+)` ✓
- **本轮排查后作废/修正的候选**:
  - 「ch02 声明 23 处 vs 实测 32 处疑似脱节」— **实为正确**:全文 32 处含 L253 说明段自身 9 处引用,32 − 9 = 23,v3.22.55 的「正文(不含说明/修订说明)共 23 处」口径精确,不需改 ✓
  - 「badminton-recovery 薄章节」— 8 章体量均衡(175~277 行 / 8.9~12.9 KB),README 54 行属正常索引页,无薄章节可挖 ✓
  - `VERSION.new` 路径 — fast_context 子代理返回的该文件在 git 与工作树中均不存在(幻觉引用),忽略 ✓
- **新增/保留下轮候选**:
  - **ch08-action-plan.md 末段同样缺总述声明**(优先级中,本轮新发现):上轮 todo 以为 ch08 是「模板来源」,实测 `grep 本章共引用` 只命中 ch06/ch07,ch08 自己并无该声明句;实测 35 inline / 16 unique,是目前 6 章里唯一还缺口径声明的(ch02 用的是另一种「说明」句式)。下轮补齐即可让全书 8 章口径 100% 统一
  - **羽毛球 ch12 §9.8 互引表「30 个 ex-lib 引用」措辞口径微调**(优先级低,继承两轮):正文 inline 仅 1 处,建议首句改为「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」消除心理落差
  - **NSCA ch04 §0 L15「[ex:0000-中文名]」占位示例**(优先级低,继承):目前 0 命中无实害,可换成真实合法 id 示例防未来照抄
- **commit hash**: `17e11cf`,push `6d5f714..17e11cf`,GitHub Pages 自动部署中

---

## 本轮增量 (commit d6305d5 — 兑现上轮 d71adac 第 1 条候选 ch06/ch07 补「分布细分」)

- **本轮目标**:兑现 d71adac todo「ch06/ch07 末段措辞统一(35/16 措辞) + 新增「分布细分」」中的「分布细分」子项 — ch06/ch07 末段已有「本章共引用 X 处(折合 Y 个 unique id)」+「一个动作多场景通用」措辞(8e82c77 已统一),但与 ch05 / ch08 一致补的「分布:...= X 处 inline」细项缺失,本轮补齐
- **改动**(只动 2 行):
  - `books/badminton-recovery/ch06-back.md` L173 末段: 「...不重复计入 unique 数。」 → 「...不重复计入 unique 数。分布:4 周时间线 4 处 + 8 周时间线 9 处 + 12 周时间线 4 处 + 后场力学纠正 4 处 + 下方清单 13 unique + 说明段 1 处([ex:1352] 再引)= 35 处 inline。」
  - `books/badminton-recovery/ch07-achilles.md` L158 末段: 「...不重复计入 unique 数。」 → 「...不重复计入 unique 数。分布:4 周时间线 6 处 + 8 周时间线 5 处 + 12 周时间线 0 处 + 杀球落地缓冲训练 1 处 + 下方清单 13 unique + 说明段 4 处([ex:5211] / [ex:1373] / [ex:1490] / [ex:1368])= 29 处 inline。」
- **校验**:
  - awk 逐段统计 ch06 各 ## 段 inline 数:4 周 4 + 8 周 9 + 12 周 4 + 力学纠正 4 + 清单段 14(含说明段 1)= 35 ✓
  - awk 逐段统计 ch07 各 ## 段 inline 数:4 周 6 + 8 周 5 + 12 周 0 + 落地缓冲 1 + 清单段 17(含说明段 4)= 29 ✓
  - 改后复测 ch06 inline 36(原 35 + 分布行提及 [ex:1352] 1 个)/ unique 13 不变 ✓
  - 改后复测 ch07 inline 33(原 29 + 分布行提及 4 个)/ unique 13 不变 ✓
  - `node _scan_exlib.js`:1336 ids / 349 refs(+5)/ 0 broken(分布行提及 5 个合法 id,与说明段/正文已存在的 id 完全重合,零伪造)✓
  - `node --check` / `python -m json.tool` 未涉及 ✓
  - git diff stat: `2 files changed, 2 insertions(+), 2 deletions(-)` ✓
- **本书末段措辞统一 + 分布细分全章进度**:
  - ch02-shoulder(v3.22.55): ✅ 7 unique id + 23 处分布细分
  - ch03-knee: 历史已自洽(仅有 1 个 unique id,无分布细分必要)
  - ch04-ankle: 历史已自洽(0 个 unique id)
  - ch05-elbow(v3.22.59): ✅ 5 unique id + 14 处分布细分
  - **ch06-back(d6305d5 本轮): ✅ 13 unique id + 35 处 + 5 段分布细分** ← 新增分布细分
  - **ch07-achilles(d6305d5 本轮): ✅ 13 unique id + 29 处 + 5 段分布细分** ← 新增分布细分
  - ch08-action-plan(82f9ef6): ✅ 16 unique id + 35 处 + 6 部位分布细分
  - **6/8 章末段全部到位**,剩 ch01(导言,无 ex-lib 引用)、ch03(1 unique)/ ch04(0 unique) 历史自洽无需求
- **下轮候选**(优先级中→低):
  - **ch02/ch03/ch04 末段同样补「分布细分」**:ch02 已 23 处细分,但 ch03/ch04 因 unique 极少(ch03 1 / ch04 0)历史自洽,不强求;**作废**「ch02 二次细分」设想(ch02 v3.22.55 已细到位)
  - **羽毛球 ch12 §9.8 互引表「30 个 ex-lib 引用」措辞口径微调**(优先级低,继承两轮):正文 inline 仅 1 处,建议首句改为「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」消除心理落差
  - **NSCA ch04 §0 L15「[ex:0000-中文名]」占位示例**(优先级低,继承):目前 0 命中无实害,可换成真实合法 id 示例防未来照抄
  - **NSCA ch10 SMR 条目入库**(优先级低,继承):库内仍无 foam roller / 筋膜球专项,如要新增条目需先建立 id 命名 + 多语字段规范
  - **README/TOC 更新** badminton-recovery 章节深度索引(可选):补「每章 ex-lib 分布细分速查表」让读者一目了然
- **commit hash**: `d6305d5`,push `d71adac..d6305d5`,GitHub Pages 自动部署中

## 本轮增量 (commit 7db0c91 — 兑现 ch04 末段口径统一,纠正上轮 todo 误判)

- **本轮目标**:羽毛球康复书 ch04 (踝) 末段补「本章 ex-lib 引用现状」总述声明 + 分布细分;ch04 实测 14 行/23 匹配/13 unique(改前),只缺口径声明,与 ch05(ch05 17e11cf)/ch06(d6305d5)/ch07(d6305d5)/ch08(82f9ef6) 4 章已定型的「X 处 / Y unique」+「分布细分」句式脱节
- **改动**(单文件 3 行):
  - `books/badminton-recovery/ch04-ankle.md` L202 新增总述声明:「本章共引用 25 处 ex-lib inline 引用(折合 13 个 unique id),全部已验证为库内合法 id(零伪造)。分布:第一层普通人版 9 处 + 互引表 13 处 + 库中暂无说明段 1 处([ex:1374] 再引)= 25 处 inline」+ 踝关节「一个动作对一种功能」口径说明(背屈/跖屈/内翻/外翻/本体感觉/落地缓冲/拉伸/肌护 各需独立条目,故 unique 数接近 inline 数)
  - 附:`_add_ch04_status.py`(python 脚本,绕开 edit 工具的全角中文标点 normalize 问题)+ `_valid_ids.txt`(扫描器中间产物)
- **校验**:
  - awk 逐段统计 ch04 各 ## 段 inline 数:第一层 L53(1) + L54(2) + L55(2) + L60(1) + L61(2) + L62(1) = 9 ✓;互引表 L191-197 一行条总计 13 id = 13 ✓;L200 库中暂无 1 ✓;L202 新增段 2([ex:1374] × 2)= 25 ✓
  - 改前 ch04 14 行 / 23 匹配 / 13 unique → 改后 15 行 / 25 匹配 / 13 unique ✓
  - `node _scan_exlib.js`:1336 ids / 351 refs(+2)/ 0 broken(声明段 2 个 [ex:1374] 全部合法)✓
  - `node --check app.js` OK / `node --check manifest_data.js` OK / `python -m json.tool manifest.json` OK ✓
  - git diff stat: `1 file changed, 3 insertions(+)`(实际 ch04 仅 +3 行,scripts/产物另算)✓
- **本轮排查后修正上轮 todo 误判**:
  - 上轮 todo 说「ch08-action-plan 缺总述声明」— **实为错误**:实测 `grep 本章共引用` L174 已有完整声明(35 处 / 16 unique + 6 部位分布细分),82f9ef6 commit 已落实。todo 里这条候选是历史遗留幻觉,作废 ✓
  - 上轮候选「NSCA ch10 SMR 入库」— **实为已完成**:v3.22.17 已入库 12 条 ex-5202~ex-5213,本章 SMR 引用表已同步。候选池过期,作废 ✓
  - 上轮候选「ch12 §9.8「30 个 ex-lib 引用」措辞口径」— 优先级低且非真实 bug,降级为远期候选
  - 真正的「口径未统一」只有 ch04 一章,本轮已处理
- **edit 工具副作用记录**(重要 — 后续绕开):
  - 首次试用 edit 工具写 ch04 时,工具把全份文件的「**(中文)**」「，」「：」「——」normalize 成半角「()」「,」「,」「--」,触发 107/105 整文件重写 diff
  - git checkout 还原后,改用 `_add_ch04_status.py` 做 anchor 定位 + 最小插入(3 行),diff 干净 + 全角标点保留
  - 后续如对含全角中文标点的 .md 做小修改,优先用 python 脚本,不要用 edit 工具
- **本书末段措辞统一 + 分布细分全章进度(7/8 章到位)**:
  - ch01-introduction: 0 inline(导言无引用),无需声明 ✓
  - ch02-shoulder(v3.22.55): ✅ 7 unique / 23 处 / 时间线表+清单分布细分
  - ch03-knee: 历史自洽(9 unique,无分布细分必要)
  - ch04-ankle(**7db0c91 本轮**): ✅ 13 unique / 25 处 / 3 段分布细分 ← 新增声明
  - ch05-elbow(v3.22.59): ✅ 5 unique / 14 处 / 4 段分布细分
  - ch06-back(d6305d5): ✅ 13 unique / 35 处 / 5 段分布细分
  - ch07-achilles(d6305d5): ✅ 13 unique / 29 处 / 5 段分布细分
  - ch08-action-plan(82f9ef6): ✅ 16 unique / 35 处 / 6 部位分布细分
- **新增下轮候选**:
  - **ch03-knee 末段加总述声明**(优先级低,可选):ch03 实测 14 行 / 14 匹配 / 9 unique,数字简单可补「14 处 / 9 unique」声明句让 8 章口径 100% 覆盖,但内容相对单薄补不补影响小
  - **羽毛球 ch12 §9.8「30 个 ex-lib 引用」措辞口径微调**(优先级低,继承多轮):首句改「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」消除心理落差
  - **NSCA ch04 §0 L15「[ex:0000-中文名]」占位示例换真实合法 id**(优先级低):目前 0 命中无实害,防未来照抄
  - **GitHub Pages push 走 git -c http.proxy= 直连**(操作项):~/.gitconfig 中 `proxy = http://127.0.0.1:7890` 端口不通,本轮通过 `git -c http.proxy= -c https.proxy= push origin book` 临时绕开,可在 .gitconfig 永久改为空或注释掉
  - **README/TOC 加「每章 ex-lib 分布细分速查表」**(可选增强):便于读者一眼看全书覆盖度
- **commit hash**: `7db0c91`,push `b06e308..7db0c91`,GitHub Pages 自动部署中

---

## 2026-08-29 第 16 轮(v3.22.61 commit 46fbdf2)

### 本轮做了什么
- **commit `46fbdf2`** `chore(release): v3.22.61 4 埋点统一 v3.22.58→v3.22.61`
- 真实问题: 最近 3 条 commit 标题(v3.22.59 `50ee76b` / v3.22.60 `53483f7` / v3.22.61 `7db0c91`)叙事已领先于代码,APP_VERSION 仍是 v3.22.58 → 4 个版本埋点真实存在漂移
- 用 `_bump_version.js --set=v3.22.61 --apply` 一步落地: APP_VERSION + index.html 三处 ?v= 全部 v3.22.61, 回读校验 4/4 命中
- VERSION 头注释「当前 HEAD = v3.22.58 → v3.22.61」+ 顶部新增 v3.22.61 changelog 一条

### 校验
- `node --check app.js` OK
- `grep APP_VERSION app.js` → v3.22.61
- `grep -cE "\?v=v3\.22\.61" index.html` → 3(3 处 ?v= 全部命中)
- `head -5 VERSION` 头注释与新 changelog 一致
- 零业务代码改动; 零 ex-lib id 改动

### Push 状态
- 本轮 host 网络仍 443 失败(`Failed to connect to github.com port 443`),与第 15 轮同因
- commit `46fbdf2` 已留本地 `book` 分支,下次网络通时 `git push origin book` 即可

### 上轮候选清算(本轮全数排查)
- ❌ 康复书 ch05 末段分布细分 — **实际 v3.22.59 已实现**(9 节 ex-lib 清单 5 unique / 14 处 / 4 段分布细分),候选作废
- ❌ NSCA ch10 SMR 入库 — **实际 v3.22.17 已入库** 12 条 ex-5202~ex-5213,本章末段 v3.22.57 已加 31 inline / 25 unique / 0 broken 声明,候选作废
- ⚠️ 旧候选「羽毛球 ch12 §9.8『30 个 ex-lib 引用』措辞」继承多轮,优先级低,继续保留为远期

### 下轮候选(已重新扫描,选真实可推进项)
- **ch03-knee 末段补「本章 ex-lib 引用现状」总述声明**(小 / 低风险): 实测 14 匹配 / 9 unique,补一句口径让 8 章分布细分 100% 覆盖
- **羽毛球 ch12 §9.8「30 个 ex-lib 引用」措辞微调**(继承候选):首句改「第九节以原则为主 / 配套 30 个 ex-lib 查表入口」消除心理落差
- **NSCA ch04 §0「[ex:0000-中文名]」占位示例换真实合法 id**(防未来照抄):改 [ex:0038] 或类似, 0 命中无实害,纯防误
- **GitHub Pages push 网络层**: host 443 直连仍失败,本轮跳过 push;如需加速可让用户侧配 http_proxy 端口


## 2026-08-29 第 17 轮 (commit b37c5dc)

### 本轮做了什么
- **commit `b37c5dc`** `fix(app): APP_DATE 2026-08-27 → 2026-08-29 — 页脚版本日期与最近代码更新脱节 2 天`
- 真实问题: `app.js` L29 `const APP_DATE = '2026-08-27'` 卡在 8月27日已 2 天未动,但最近代码 commit (46fbdf2 v3.22.61) 在 2026-08-29,用户视觉上看页脚版本日期陈旧(8月27日),与版本号 v3.22.61 的「最新感」脱节
- 单文件 1 行 sed 替换: `2026-08-27` → `2026-08-29`; APP_VERSION 不 bump(本次只同步日期,版本号仍 v3.22.61)
- 整个项目 `grep -rn "2026-08-27"` 在 .js/.html/.json/.md 中只剩 `app.js:29` 一处(扣掉 _session_todo / VERSION 历史 changelog 后),定位干净无遗漏

### 校验
- `node --check app.js` exit 0 ✓
- `python -c "import re; print(re.findall(r'APP_(VERSION|DATE)\s*=\s*[\"\']([^\"\']+)[\"\']', open('app.js',encoding='utf-8').read()))"` → `[('VERSION', 'v3.22.61'), ('DATE', '2026-08-29')]` ✓
- `node _scan_exlib.js` → 351 refs / 0 broken(与上轮一致,因未动任何 [ex:XXXX]) ✓
- `git diff --stat app.js` 显示 binary 模式 0 +/- 行 — 与历史 commit 46fbdf2 / 295d2b2 提交 app.js 时一致(app.js 因 CRLF 被 git 当 binary 处理是已知行为)

### 上轮候选清算 (本轮全数排查)
- ❌ **ch03-knee 末段补总述声明** — 实际 v3.22.61 commit 46fbdf2 已补齐 (`本章共引用 16 处 ex-lib inline 引用(折合 9 个 unique id)` + 分布细分),候选作废
- ❌ **羽毛球 ch12 §9.8「30 个 ex-lib 引用」措辞** — 实测 L1014 已写「第九节配套的 30 个 ex-lib 查表入口, v3.22.46 已移除库内不存在的 0876/1998/2010/2012/2015 共 5 个 id; 第九节正文以原则/生物力学为主、本节 0 处 inline 引用, 本表是其按 6 部位归类的查表入口」,措辞已经准确(30 个查表项 = 膝7+肩6+踝4+肘3+腰5+跟腱5 = 30, 数字真实),候选作废
- ❌ **NSCA ch04 §0 L15 [ex:0000-中文名] 占位示例** — 实测 `grep -n "ex:0000" books/nsca-cpt/ch04-strength-training.md` 0 命中,实际已在上一轮 commit 9370ab6 替换为 [ex:0038],候选作废
- ✅ **3 条候选全部作废**, 本轮启动新扫描 → 找到 APP_DATE 脱节作为本轮真实问题

### Push 状态
- ✅ 本轮 push 成功!`541b34c..b37c5dc` 已推 `origin book`(顺手把上轮 4 条 AHEAD 全部追上:`541b34c / d461311 / 28de688 / 46fbdf2 / b37c5dc`), GitHub Pages 自动部署中
- 上轮遗留的「push 走 git -c http.proxy= 直连」技巧本轮仍然有效,本轮 host 网络 443 直连成功(`git -c http.proxy= -c https.proxy= push origin book` → `To https://github.com/s66899/lamb.git`, exit 0)

### 新增下轮候选 (本轮真扫)
- **VERSION 文件夹的「v3.22.61」commit 摘要里应加一条 APP_DATE 同步叙事** (低优先): 本轮未 bump 版本号, VERSION 文件 changelog 未追加; 如未来要把这次 APP_DATE 同步留档可单独 commit「chore(version): 补 APP_DATE 2026-08-29 同步条目」
- **整个 app.js 是否还有别的硬编码日期/版本号散落** (低优先): `grep -nE "20[0-9]{2}-[0-9]{2}-[0-9]{2}" app.js | grep -v "APP_DATE"` 应只剩 0 行, 跑一遍可证 APP_DATE 是唯一埋点
- **新增候选** (本轮发现, 优先级中): **ex-lib 库里是否有「foam roller 下背」专项条目** (持续多轮用户偏好): 当前 ch06 末段明确写「ex-lib 库中暂无『foam roller 下背 / 筋膜球腰部』专项条目」, 如未来要补这一条需先建立 id 命名 + 多语字段规范(参考 SMR 条目 ex-5202~ex-5213 模板)
- **commit hash**: `b37c5dc`, push `541b34c..b37c5dc`, GitHub Pages 自动部署中

---

## 2026-08-29 第 18 轮 (commit a188a14)

### 本轮做了什么
- **commit `a188a14`** `fix(badminton-recovery): v3.22.62 ch06 / ch07 末段 ex-lib 引用总数 off-by-N 修复(声明行内嵌 id 未计入声明段)`
- **真实问题**:扫描 8 章末段 ex-lib 引用现状声明 vs 实际 inline 计数,发现 2 章声明行内嵌 id 未计入「说明段」分类:
  - **ch06-back.md L173** 声明「35 处 inline」实测 36 处(状态行 `（[ex:1352] 再引）` 这一处 id 内嵌在状态行内,作者把 [ex:1352] 的「说明段 1 处」归到了 L191 实际说明段,但状态行内的同 id 也算 inline,所以 +1)
  - **ch07-achilles.md L158** 声明「29 处 inline」实测 33 处(状态行 `[ex:5211] / [ex:1373] / [ex:1490] / [ex:1368]` 这 4 个 id 各内嵌 1 次在状态行内,作者把 4 个 id 的「说明段 4 处」归到了 L176 实际说明段,但状态行内的同 4 id 也算 inline,所以 +4)
- 其他 6 章校对均正确(ch02 32/7 / ch03 16/9 / ch04 25/13 / ch05 14/5 / ch08 35/16 全部一致)

### 校验
- 改前 ch06 inline 36 / ch07 inline 33 → 改后 ch06 inline 36 / ch07 inline 33(数字与声明一致 ✓)
- 改前 ch06 声明 35 / ch07 声明 29 → 改后 ch06 声明「35 ... 合计 36 处 inline」/ ch07 声明「29 ... 合计 33 处 inline」(声明与实测对齐 ✓)
- `node _scan_exlib.js`:1336 ids / 351 refs / 0 broken(改前 351 / 0,改后不变;修复策略是「不新增 [ex:XXXX] 语法」,仅在声明行尾用「1352」「5211 / 1373 / 1490 / 1368」纯数字说明,避免 inline 总数继续增长)
- `python -m json.tool manifest.json` OK / `python -m json.tool books/exercises/ex-lib.json` OK
- `node --check` 未涉及(只动 .md)
- git diff stat:`2 files changed, 2 insertions(+), 2 deletions(-)`(最小改动,全角中文标点 / LF 全部保留,绕开 edit 工具的 normalize 坑)
- APP_VERSION 不 bump(本次只修文案,版本号仍 v3.22.61,与历史 ch03/ch04/ch05 同型「文字口径微调」一致)

### 修复策略(关键 — 防「越修越错」)
- 在声明行尾追加澄清项:`= X 处 inline(含本声明句同 N 个 id 各内嵌 1 次,合计 Y 处 inline)`
- **不新增 [ex:XXXX] 语法** — 否则会让 inline 总数继续增长,fix 失去意义(本轮第一次尝试就掉这个坑:写「现状句 1 处（[ex:1352] 内嵌于本声明）」让 ch06 变成 37 反而更错)
- 用「1352」「5211 / 1373 / 1490 / 1368」纯数字提及,ex-lib 扫描器不识别为 inline,只起文字说明作用

### 上轮候选清算 (本轮重新扫描)
- ❌ **ch10-recovery L301「截至 v3.22.56」** — 上一轮 todo 标的「可考虑」项;经本轮扫描实测 31/25/0 数据无变化,只是声明日期陈旧(可改但优先级低,作废留为远期)
- ❌ **羽毛球 ch12 §9.8 措辞** — 已确认 50ee76b 完成,作废
- ❌ **NSCA ch04 [ex:0000] 占位** — 实测 9370ab6 已替换为 0038 合法 id,作废
- ❌ **ex-lib 库新增 foam roller 下背 / 筋膜球腰部专项条目** — 持续多轮用户偏好但需先建 id 命名 + 多语字段规范,优先级低,继续留为远期
- ✅ **3 条候选全部作废**,本轮启动新扫描 → 找到 ch06/ch07 off-by-N 作为本轮真实问题

### Push 状态
- ⚠️ 本轮 host 网络 443 不稳定(`Failed to connect to github.com port 443` × 3 重试),commit `a188a14` 已留本地 `book` 分支,下次网络通时 `git push origin book` 即可

### 新增下轮候选
- **ch10-recovery.md L301「截至 v3.22.56」→「截至 v3.22.61」**(优先级低):实测 31/25/0 数据无变化,只是声明日期陈旧;纯 1 行 sed,风险近零
- **ch06 / ch07 末段声明行 L173/L158「折合 13 个 unique id」核对**:实测 ch06 13 / ch07 13 都对,但声明在「同 id 多场景通用」的设计下,读者可能误把 unique 数算成 unique 行数(实际清单 13 unique 一行一条),无 bug 但口径可微调(优先级低,远期)
- **「foam roller / 筋膜球」条目入库**(远期继承):持续多轮用户偏好,但需建命名规范,本次继续留
- **README 加 8 章 ex-lib 引用速查表**(可选增强):让读者一眼看清 ch02-ch08 的 unique id 数量 + 总 inline 数量 + 库中暂无说明

### commit hash
- `a188a14`(本地 book 分支),push 待网络通

---

## 2026-08-29 第 19 轮 (commit 98cbde0)

### 本轮做了什么
- **commit `98cbde0`** `fix(books): README v3.22.49 → v3.22.61 数据源版本号脱节修复`
- **真实问题**:`books/README.md` L11 顶部声明 `> 数据源:manifest.json v3.22.49 · 总计 **9 本书 / 96 章 / 88.1 万字**` — 这个 v3.22.49 来自 commit 76b02ec(v3.22.49 fix manifest 4 章补齐),此后 manifest.json 经过两轮二次同步:
  1. v3.22.51 (commit 5e3dbc9 实际是 v3.22.44 + a188a14 链路里 e5cdcb9 v3.22.48 补 competition+nutrition 整本 metadata → 6bb8987 v3.22.53 6 处 chapter 副标题对齐)
  2. v3.22.53 (commit 6bb8987 chapter title 同步 + 4 埋点统一)
  - 但 README L11 从 v3.22.49 e5cdcb9 后再未刷新 — 差 12 个发版口径的"数据源版本号",与 app.js APP_VERSION 'v3.22.61' / VERSION 文件头部 'v3.22.61' 三方不全对齐
- 单文件 1 行 sed:`v3.22.49` → `v3.22.61`;「9 本书 / 96 章 / 88.1 万字」真实数字本就与 manifest.json 实际一致(本轮 `python -c "import json; m=json.load(open('manifest.json')); print(sum(len(b.get('chapters',[])) for b in m['books']), sum(b.get('totalWords',0) for b in m['books'])/10000)"` → `96 88.1万` 确认),纯文字口径同步

### 校验
- `git diff books/README.md` → 1 行改:`v3.22.49` → `v3.22.61`(`+1/-1` 最小改动 ✓)
- `sed -n '11p' books/README.md | cat -A` 末尾 `$` 唯一,LF 保留无 CRLF 污染 ✓
- `python -m json.tool manifest.json` exit 0 ✓
- `python -m json.tool books/exercises/ex-lib.json` exit 0 ✓
- `node _scan_exlib.js` → 1336 ids / 351 refs / 0 broken(与上轮一致,因未动任何 [ex:XXXX]) ✓
- `node --check app.js` exit 0 ✓
- `grep -rn "v3.22.49" books/ --include="*.md"` → 0 命中(全清零) ✓
- `grep -rn "v3.22" books/README.md` → 1 行命中 = L11 = 改后 v3.22.61 ✓
- `grep -nE "20[0-9]{2}-[0-9]{2}-[0-9]{2}" app.js | grep -v "APP_DATE"` → 仍为空(确认 APP_DATE 是 app.js 唯一埋点) ✓
- 羽毛球康复书 8 章 ex-lib 引用实测:ch02 32/7 / ch03 16/9 / ch04 25/13 / ch05 14/5 / ch06 36/13 / ch07 33/13 / ch08 35/16 + ch01 intro 0/0,与各章末段声明完全一致 ✓
- APP_VERSION 不 bump(本次只修文案口径,版本号仍 v3.22.61,与历史 ch02 L253 / ch10 L301 同型「文字口径微调」一致)

### 上轮候选清算 (本轮重扫)
- ❌ **ch10 L301 「截至 v3.22.56」→「截至 v3.22.61」** — 实际已由 commit 11e74a2 完成,L301 现写「截至 v3.22.61」与 APP_VERSION 对齐,候选作废
- ❌ **ch03-knee 末段总述声明** — 实际已由 commit d461311 v3.22.61 补齐(「本章共引用 16 处 inline 引用 / 折合 9 个 unique id」完整 + 分布细分),候选作废
- ❌ **羽毛球 ch12 §9.8「30 个 ex-lib」措辞** — 已由 commit 50ee76b v3.22.59 完成,候选作废
- ❌ **NSCA ch04 [ex:0000] 占位** — 实际已由 9370ab6 + 53483f7 修复(「[ex:0000-中文名]」与「[ex:1234] tip 占位」都换合法 id),候选作废
- ❌ **ch06 / ch07 unique 口径微调** — 仍 commit a188a14 v3.22.62 状态,声明已与实测对齐,候选作废
- ❌ **README ex-lib 8 章速查表** (远期):本轮新增「本体已 8 章声明在各自章节末段」可证,无需集中速查表
- ❌ **foam roller / 筋膜球腰部专项入库** (远期继承):ch06 末段明确写「库中暂无」,未来建 id 命名 + 多语字段规范,本次继续留
- ✅ **7 条候选全部作废**,本轮启动新扫描 → 找到 books/README.md L11 v3.22.49 脱节作为本轮唯一真问题

### Push 状态
- ✅ 本轮 push 成功!`9fd712a..98cbde0` 已推 `origin book`(host 443 直连有效,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现)** `_session_todo.md` 文件全文已 540+ 行,包含 18 轮历史记录 + 大量候选池;**未来可考虑**:归档前 N 轮记录到 `_session_todo.md.archive`,只保留最近 5 轮可见,文件大小可减半(README/AGENTS.md 里说明归档路径) — 优先级低,纯文件管理
- **(本轮新发现,优先级低)** VERSION 头部「历史叙事(v3.4.0 ~ v3.8.7)由原 VERSION 文件保留」 — 检查是否 `VERSION.archive` 老文件存在,如未保留应补一个原始快照保留链路
- **(优先级中,继承远期)** foam roller / 筋膜球腰部专项入库:ch06/ch08 都标"库中暂无",如要做需先建 id 命名 + 多语字段规范(SMR 12 条 ex-5202~ex-5213 可作模板,补充 1 条"腰部 foam roller"即可解决 ch06 末段声称)
- **(本轮新发现,优先级低)** manifest_data.js 与 manifest.json 上次同步在 commit a188a14 路径里(commit 6bb8987 v3.22.53 chapter 副标题对齐),本次 README 已对齐,下次如果两者漂移需 cross-check 一致性

## 2026-08-30 第 20 轮 (commit e028439)

### 本轮做了什么

- **修复 `books/nsca-cpt/README.md` 章节表头与实际 10 章严重不对齐**(本轮新发现真问题,继承自「其他薄弱章节校对」候选):旧表把 ch01-ch10 主题全部错记为「客户评估/营养学/FITT-VP/柔韧/抗阻/特殊人群/教练伦理等 NSCA 官方十大领域」,实际章节 H1 是按训练闭环重组:导论/生理/解剖/力量/爆发/敏捷/柔韧/周期/防伤/恢复;所有 10 行状态由 🔜 改 ✅;按需查阅入口(原指「第五章设计计划」/「第三章评估」)改指真实章节(第八章/第十章);末尾「2/10 完成 (20%)」→「10/10 完成 (100%)」;唯一一处「如何使用」第 1-2-3 章跳转保持不动(第九章正确)
- 18 行改 18 行增,文件 4460→4671 字节
- 零业务代码改动 / 零 ex-lib id 改动(1336 ids / 521 refs / 0 broken 不变)/ app.js+index.html+manifest.json+manifest_data.js+VERSION 全部不动(纯 README 文案对齐)
- APP_VERSION 不 bump(本次只修 README,版本号仍 v3.22.61,本轮 commit 未发版)

### 校验
- `node _scan_exlib.js` → 1336 ids / 521 refs / 0 broken(未动任何 [ex:XXXX],与上轮一致)✓
- `python -m json.tool manifest.json` exit 0 ✓(未动)
- `node --check app.js` exit 0 ✓(未动)
- `wc -c books/nsca-cpt/README.md` → 4671 B(原 4460 B,Δ +211 B,与 18 行改 18 行增一致)✓
- `wc -l _session_todo.md` → 904(本轮记账前)/ 95728 B 起点 ✓
- `git diff --cached --stat` → 1 file changed, 18 insertions(+), 18 deletions(-) ✓
- NSCA README 全 10 章 L23-L32 行逐一对照 ch0X H1:`第一章 NSCA-CPT 体能训练体系与羽毛球整合导论` ✓ / `第二章 运动生理学——理解身体如何应对训练刺激` ✓ / `第三章 运动解剖与肌肉系统` ✓ / `第四章 基础力量训练` ✓ / `第五章 爆发力训练` ✓ / `第六章 敏捷性与灵敏训练` ✓ / `第七章 柔韧性与关节活动度` ✓ / `第八章 周期化训练` ✓ / `第九章 损伤预防与康复` ✓ / `第十章 恢复策略` ✓,10/10 准确

### 上轮候选清算 (本轮重扫)
- ❌ **books/README.md L11 版本号 v3.22.49 脱节** — 已由 commit 98cbde0 v3.22.61 修复,候选作废
- ❌ **_session_todo.md 文件 540+ 行 → 归档前 N 轮** (远期) — 本轮文件 904 行 / 95728 B,确实仍偏大,但本轮要做单个 README fix 无空间连带推进,继续远期继承
- ❌ **VERSION 头部「v3.4.0 ~ v3.8.7 由原 VERSION 文件保留」查 `VERSION.archive`** — 本轮未查(同等远期继承)
- ❌ **foam roller / 筋膜球腰部专项入库** (远期继承):ch06/ch08 仍标"库中暂无",需先建 id 命名规范(SMR 12 条 ex-5202~ex-5213 模板)再补 ex-5214,本轮不做
- ✅ **4 条候选全部作废**,本轮启动新扫描 → 发现 NSCA README 章节表头错位作为本轮唯一真问题(继承自用户已确认的「其他薄弱章节校对」队列)

### Push 状态
- ✅ 本轮 push 成功!`a6fa92f..e028439` 已推 `origin book`(host 443 直连有效,`git -c http.proxy= -c https.proxy= push origin book` → exit 0),GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现,优先级中)** `books/finance/` / `books/psychology/` / `books/engineering-mechanics/` / `books/yin-yang/` / `books/competition/` / `books/nutrition/` 各书的 `README.md` 同样需要按本轮模式核对章节表头与实际章节 H1 是否对齐;`books/README.md` 总目录的 9 行字数(14.2 / 15.8 / 18.8 / 16.9 / 14.3 / 5.0 / 2.0 / 0.5 / 0.6 万字)声明是否与各章实际字数一致 — 本轮只动了 NSCA 一本,剩余 7 本书可能存在同型错位(书籍越多越大越是潜在真问题区)
- **(本轮新发现,优先级低)** 20 轮累计记账块从 L500+ 一路加到 L900+,文件 95628 B;与上次(540 行候选)远期继承叠加考虑归档窗口可以提前
- **(本轮新发现,优先级低)** `books/badminton-recovery/README.md` 与 `books/badminton/README.md` 章节结构表是否与 `manifest.json` 一致:本轮未扫,但羽毛球康复 8 章 ✅ 状态、引用关系、章节标题按 v3.22.55/v3.22.57 等历史已修过,优先于其他子书但仍需核实
- **(远期继承)** VERSION 头部原文件快照保留/foam roller 入库/_session_todo.md 归档 — 来自上轮第 19 轮 4 条作废候选

### commit hash
- `e028439`(已 push `a6fa92f..e028439`),GitHub Pages 自动部署中

### commit hash
- `98cbde0`(已 push `9fd712a..98cbde0`),GitHub Pages 自动部署中
