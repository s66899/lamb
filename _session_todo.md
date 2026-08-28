
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
