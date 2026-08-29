
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
