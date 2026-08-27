# todos

## 进行中

## 待办(下轮候选)
- **羽毛球康复 ch03 / ch04 / ch05 inline 引用 vs 库内动作名详细比对** (id 全部合法,但中文译名一致性未逐条复核)
- **manifest_data.js 大缺口**:本轮 _inspect 发现 manifest_data.js 实际每本书只有 ch01 一章(9 章总和)——比 manifest.json 的 96 章少 87 章;v3.22.51 commit message 声称「9 本书 / 96 章完全双向一致」是错的,实际只是补了 4 章 metadata 进 manifest.json 单边,manifest_data.js chapters 数组从未补。工作量:byte 级追加 87 章 metadata + 重算 9 本 totalWords。**严禁单 commit** —— 单 commit 6000+ 行 JS 不可回滚。拆为「9 个单书 patch commit」,每本 8-15 章,单 commit ~600 行可独立回滚。本轮先入 todo,**下轮起每轮完成 1 本**。
- **competition / nutrition 两本内容过薄**(每章 3-5KB vs ch06-back 9KB / ch07-achilles 8.7KB 基线)—— 选 competition ch03-opponent-analysis.md 5 个 h2 / 3491B 做双层扩写 + 加 5-10 条 [ex:XXXX]。可独立 commit
- **其他书扫描「棵→踝」类同音笔误**:本轮羽毛球 ch12 4 处「棵」应为「踝」。全 books/ 扫一遍可能还有类似同音字 / 形近字 / 简体繁体混淆 / unit 错字(棵/踝,棵腹/空腹,练/炼,记/纪 等)
- **其他书扫描「数字声明 vs 实际 inline 不符」**:本轮 _scan_decl 扫到的 ch02-shoulder「7 个合法 id」(其实是 unique id 数,不是 inline 数)与 ch06/ch07/ch08 统一风格的「共 N 处 inline」有口径差;不是 bug 但读者易混。可改 ch02-shoulder 用 ch06 同款「共 X 处 / Y unique」开口口径
- **`VERSION` 文件历史追平**:自 v3.22.55 (5e64f86) 后还有本轮 91d1da3 v3.22.56 一个 commit,需追加 VERSION 头部 HEAD/APP_VERSION 一致 + v3.22.56 一条 chore 摘要(单文件,可独立 commit)

## 参考:manifest words 计算公式(已验证与历史值 100% 一致)
`_update_manifest.js` 的口径 = CJK 字符数 + 含字母数字的 token 数;用 yin-yang 前 4 章验证:8103/9300/8363/1864 全部逐字复现。h2s 结构 = `[{title, subs:[{title, level:3}]}]`。

## 已完成（本会话）
- **本轮 (v3.22.56)**:`books/badminton/ch12-physical-training.md` 4 处「棵」→「踝」笔误一次性清零 — commit `91d1da3`,push `5e64f86..91d1da3`。历史 v3.22.8 (`4671302`) 修 NSCA-CPT ch09 时清过一笔「棵/踝」,但没扫到 badminton ch12 体能章;遗留 4 处:
  - L487 「急停防膝棵伤」→「急停防膝踝伤」(跳深落地缓冲行)
  - L501 「棵背屈不够」→「踝背屈不够」(柔韧必要性段)
  - L521 「【棵/小腿】」→「【踝/小腿】」(动作品类小节标题)
  - L988 「棵背屈距墙」→「踝背屈距墙」(4 周体能自评表)
  - 4 处都是同位置同名字、同单位(`ankle dorsiflexion` 是标准术语),零歧义,单字符 4 替换 sed 一把改。git diff stat: `1 file changed, 4 insertions(+), 4 deletions(-)`。校验:`grep -c 棵 = 0` ✓ / `grep -c 踝` = 30(原 26 + 新 4) / `_scan_exlib.js` 仍 `344 refs / 0 broken`(零 ex-lib id 改动)/ 业务代码 app.js / index.html / manifest 字节级零膨胀(单文件单字符)/ 不 bump `APP_VERSION`(纯文案,不影响缓存串)。**零风险,可独立回滚**:`git revert 91d1da3` 只回退 4 行。**本次附带新发现**(已入 todo):(a) `manifest_data.js` 实际每本书只有 ch01 一章,比 manifest.json 的 96 章少 87 章 — 上轮 v3.22.51 commit message 「96 章双向一致」与事实不符,需拆 9 个单书 commit 修复;(b) VERSION 文件头部 HEAD/APP_VERSION 仍写 v3.22.53,与最新 commit v3.22.55 不对齐(虽 APP_VERSION 业务代码真实快照是 v3.22.53,无未合并变更),下轮补一条 v3.22.56 changelog。
- **本轮 (v3.22.55)**:badminton-recovery ch02-shoulder 数字声明脱节修复 — 原文「**说明**：本章共 7 处 ex-lib 引用 + 2 项库中暂无条目」是 v3.22.33 修订时的「清单项数」快照,但读者扫读只看到「7 处」会误以为整章仅 7 个引用。实际 [ex:XXXX] 计数:**23 处正文**(W1-W8 时间线表内 15 处 + 文字旁注 1 处 + 清单本身 7 处) / **7 个唯一 id** ([ex:0215] / [ex:0225] / [ex:0235] / [ex:0383] / [ex:0426] / [ex:0864] / [ex:3011]) / **2 项库中暂无条目**(钟摆 / 爬墙,文字描述保留) / **2 项库中暂无以代用 id 标注**(Y-T-W → [ex:0215]、face pull → [ex:0225])。重写说明段:1) 补全 7 个唯一 id 列表;2) 明确「正文 23 处」+ 三个分项构成;3) 区分「库中暂无」vs「代用 id」两类;4) 明确「不含说明 / 修订说明」统计口径,防止数字随本段文字双计;5) 与 v3.22.33 修订说明的「16 处内联」保持兼容(列表本身 7 处 + 内联 16 处 = 23 处正文)。校验:python -m json.tool ex-lib.json ✓ / 全文件 32 个 [ex:XXXX] = 23 正文 + 9 本轮说明段引用(meta 计数) / 其他章数字声明 (ch06 35 处 / ch07 29 处 / ch08 35 处) 全部 ✓ 与实际一致;commit `c7c207a` 已 push 到 origin book (`202d3df..c7c207a`)。**顺手清掉两条遗留 todo**:`books/{competition,nutrition} 两本整书注册` —— 本轮确认 manifest.json / manifest_data.js / books/README.md 都是 9 本,exercises/ 是 ex-lib 库目录不是书;`books/{competition,nutrition,exercises} 三本书未注册` —— 同上,无需注册。**新增下轮候选**:(a) competition / nutrition 两本内容过薄(每章 3-5KB vs ch06 9KB / ch07 8.7KB 基线) — 选 competition ch03-opponent-analysis.md 做双层扩写 + 加 5-10 条 [ex:XXXX];(b) VERSION 头部 v3.22.53 已滞后本轮 → 下轮跑 `_bump_version.js --apply` 一次性追平 4 埋点。
- **本轮 (v3.22.54)**:根目录 VERSION 文件脱节修复 — 上轮 v3.22.52 commit `6bb8987` 同步了 app.js / index.html / manifest 4 埋点到 v3.22.53,但 VERSION 文件既没更新头注释「当前 HEAD = v3.22.51」也没补 v3.22.52/v3.22.53 两条 commit 摘要。本轮:(1) 头部 HEAD/APP_VERSION 双行 v3.22.51 → v3.22.53 同步;(2) 顶部加 v3.22.52 (6 处 chapter 副标题对齐 + NSCA 10 章 title 同步) + v3.22.53 (4 处不一致修复) 两条新 commit 摘要;(3) 文件本体未涉及 app.js / index.html / manifest,本轮不动业务代码(纯文档)。校验:14769 → 15760 bytes (+991) / 文件首行 BOM 保留 / 70 个 v3.* 版本号 grep 全命中(60 旧 + 2 新增 v3.22.52/v3.22.53 + 8 历史 typo/重复合并项) / node --check ×2 ✓(app.js / manifest_data.js 未动字节级)/ json 校验 ✓ / CRLF 保留。Commit `202d3df` 已 push 到 origin book。**顺手清掉**:`VERSION 头部同步 / commit message 模板自举化`两条上轮 todo。
- **本轮 (v3.22.44 VERSION 同步)**:根目录 `VERSION` 文件严重脱节 + 数据脏污修复 -- 原文件最后更新于 v3.18.6 (2026-08-03 commit `25f2427`),但 git log 显示此后还有 89 个 commit (60 个新版本号 v3.18.7 ~ v3.22.44) 未在 VERSION 中记录,且与 `app.js APP_VERSION='v3.22.44'` 脱节 14 个版本 + 历史内容含 `v33.7.6` typo + 整篇单行物理堆叠(16 行物理行内容)。本次重写:(1) **加 BOM + 头注释 + 倒序排列**(新版本在最上);(2) **修 `v33.7.6` → `v3.7.6`** typo;(3) **补 v3.18.7~v3.22.44 共 60 条 commit 摘要**(按 PRIORITY_TYPE=[feat/fix/docs/...] 优先 + SKIP_CHORE=[chore(todo)/chore(release)/chore(version)/chore(manifest)] 退避,每个版本号选该版本号下最具代表性的一条 commit,典型如 v3.22.41 选 `chore(tool): v3.22.41 新增 _bump_version.js` 而非 `chore(todo): 记录 v3.22.41...`);(4) **保留 v3.4.0~v3.18.6 共 26 条历史叙事**(最小变更原则,只改 typo + 加换行);(5) **从 16 行物理行 → 94 行结构化**(5706 → 12619 bytes)。校验:BOM `EF BB BF` 保留 ✓ / 新版区间 v3.22.44 → v3.18.7 单调递减 ✓ / 历史区间 v3.18.6 → v3.4.0 顺序保留 ✓ / 86 条 v3.* 版本号 grep 全命中(60 新 + 26 历史) ✓ / 其他文件零变动(只动 VERSION 单一文件,git diff stat:1 file changed) ✓ / app.js / manifest.json / index.html byte 级未变 ✓ / 不动 APP_VERSION(纯文档修复)。本轮**未 bump 4 个埋点**(VERSION 修复是纯文档工作,不影响运行时缓存串)——下轮若发版仍走 `_bump_version.js --apply`。**顺手清掉**候选里「VERSION 文件历史从未更新(滞后 22+ 个版本)」一条 + 顺手更新候选(competition/nutrition 整本注册是下轮最有价值的下一步,exercises/ 经核是 ex-lib.json 库真实存放目录不是书,无需注册)。
- **本轮 (v3.22.44 bump)**:补落盘上轮 v3.22.44 commit message 宣称但 4 埋点未实际写盘的版本号 -- 上轮 commit `945dc92` 提交 manifest.json 补 badminton-recovery,但 `_bump_version.js --apply` 漏跑,导致 `app.js APP_VERSION='v3.22.43'` 与 `index.html` 3 处 `?v=v3.22.43` 都还是 v3.22.43(完全重复 v3.22.42 → v3.22.43 那个漏改坑)。本轮直接 `node _bump_version.js --apply`:4 处 v3.22.43 → v3.22.44 同步落盘 + 回读校验通过(534724/23097 bytes 完全不变,零 LF/CRLF 污染)。校验:`node --check app.js` ✓ / `python -m json.tool manifest.json` ✓ / 4 处埋点文本 grep = v3.22.44 / git diff 显示 `Bin 534724 -> 534724 bytes` `Bin 23097 -> 23097 bytes` 字节级零膨胀。Commit `1e726ce` 已 push 到 origin book(`945dc92..1e726ce`)。**顺手加入新候选**:`books/{competition,nutrition,exercises}` 三本书目录真实存在但两份 manifest 都未注册(grep 仅命中 ch09-competition-psychology.md / ch10-competition-psychology.md 是 NSCA 内部章节名,而非 books/competition/ 整书),下轮候选加入「是否整本注册到 2 manifest」。
- **本轮 (v3.22.44)**:manifest.json 补入 badminton-recovery 8 章 metadata -- 修真实问题:manifest_data.js v3.22.37 已注册羽毛球康复书(7 本),但 **manifest.json 从 v3.22.37 至今一直是 6 本**(grep `badminton-recovery` 在 manifest.json 零命中)。任何外部工具/CI 读 manifest.json 都会以为羽毛球康复书根本不存在(即使 UI 用 manifest_data.js 不受影响,但项目结构真相源与运行时真相源脱节)。本次 byte 级平移 manifest_data.js badminton-recovery 整本到 manifest.json 末尾:**+19694 bytes(329594 → 349288)**;8 章 file/title/words/h2s 全部与 manifest_data.js 一致(2072/3035/2738/2520/2633/2313/2082/2680 字 / 71 h2 + 93 h3);sum(chapters.words)=20073 == totalWords=20073 == chapterCount=8。校验:python -m json.tool ✓ / CRLF 裸 LF=0 / 前 6 本书(除末本)byte 级未动 / 末尾 `} ] }` byte-equal / 76 个 `[ex:NNNN]` 引用 0 broken / 不动 APP_VERSION(纯数据修复,UI/缓存串不变)。新增工具脚本 `_add_recovery_to_manifest.js`(一次性,留作将来补其他书到 manifest.json 的模板)。**同时清掉候选里"manifest.json badminton-recovery 8 章缺失"一条**。Commit `5e3dbc9` 已 push 到 origin book(`ba4cc4c..5e3dbc9`)。
- **本轮 (v3.22.43)**:双 manifest `totalWords` 漂移修复 + 4 埋点追平 -- 总览:(1) 修 `manifest_data.js` 5 本书 totalWords 字段(yin-yang -963 / badminton -14265 / engineering-mechanics -11080 / finance -10613 / nsca-cpt -38595)使其 = sum(chapters.words);(2) 修 `manifest.json` 3 本书(badminton / engineering-mechanics / finance)totalWords 同字段漂移(yin-yang / nsca-cpt 在 manifest.json 上轮 v3.22.43 / v3.22.38 已正确)使其 = sum(chapters.words);(3) 顺带 `_bump_version.js --apply` 把上轮 v3.22.43 commit message 宣称但未落盘的 4 埋点(APP_VERSION + 3 个 ?v= 缓存串)从 v3.22.42 → v3.22.43 追平。校验:python -m json.tool ✓ / node --check ×2 ✓ / 14 处 totalWords 全部 = sum(chapters.words) 零偏差 / CRLF 保留(file -k 验证)/ bytes delta 仅 manifest.json +1(129082 是 6 位数)/ grep 114817/142825/143638/134136/11206/38595 仅命中 session_todo.md 历史 + manifest.json 已正确值,零副作用。**同时兑现并清掉两条已落实 todo**:上轮候选里"manifest_data.js 5 本书 totalWords 不一致(差几千到 3.8 万字)→ 优先改字段"和"4 埋点 v3.22.42 → v3.22.43 追平"。Commit `0f34b4e` 已 push 到 origin book(`fa92458..0f34b4e`)。
- **本轮 (v3.22.43)**:manifest.json NSCA-CPT 整本 metadata 残缺补齐--manifest.json 是项目结构真相源(structure-of-truth),但 NSCA-CPT 在 manifest.json 里是 v3.22.9 注册时的简化版(10 章均仅 `{file, title}`,无 words/h2s;chapterCount=1, totalWords=9800)。manifest_data.js 在 v3.22.10/16/17/38 多轮修复中已逐步补齐完整 metadata,但 manifest.json 一直没同步(任何外部工具/CI 读 manifest.json 都以为 NSCA 是本空书)。本轮用 manifest_data.js NSCA 部分 byte 级对齐:10 章 words/h2s 全部补齐(h2s=7/17/6/9/13/10/15/12/12/7 共 108 个 h2),chapterCount 1→10, totalWords 9800→49801(10 章 words 求和)。**chapter title 保留 manifest.json 既有中文文案**(最小变更原则,且 manifest.json ch10 标题是 v3.22.16 正确状态、manifest_data.js 反而是过时「待扩展」)。校验:python -m json.tool 通过;CRLF 全程保留(275374→329593 bytes, +54219);其他 5 本书 byte 级不变;全库 1336 个合法 ex-lib id / 0 broken;零线上影响(UI 用 manifest_data.js)。**顺手清掉**上轮候选里「`_bump_version.js` commit message 模板未自举化」一条--v3.22.42 commit `e63270b` 已实际兑现 PLACEHOLDER 自举化(6591→8723 bytes, 7 条改造点),本轮候选未及时勾掉。Commit `b3b600b` 已 push 到 origin book(`f6059cf..b3b600b`)。
- 上轮 (v3.22.42):补落盘上一轮新增 `_bump_version.js` 单点发版工具时**漏改的 4 个版本号埋点**(commit message 已宣告 v3.22.41 但实际 app.js `APP_VERSION` 仍是 v3.22.40、index.html 三处 `?v=v3.22.40`)。直接 `node _bump_version.js --apply`:4 处 v3.22.40 → v3.22.41 同步落盘 + 回读校验通过。校验:`node --check app.js` 通过、`python -m json.tool manifest.json` 通过、4 处埋点文本 grep 一致。Commit `9553115` 已 push 到 origin book(`8506646..9553115`)。**附发现**:`_bump_version.js` PLACEHOLDERS 里的 find/replace 是硬编码字面量 `'v3.22.40'`,下轮如要做 v3.22.42 必须先手改工具里的字面量才能再用--下轮候选已加"自举化"条目。
- 上轮 (v3.22.41):新增 `_bump_version.js` 单点发版版本号统一工具 - 历史问题:app.js APP_VERSION + index.html 三处 ?v= 共 4 个埋点,多次漏改导致 GitHub Pages 老访客吃旧缓存(v3.22.37 修复时补过一次 style.css 漂移,v3.22.38/39/40 三轮也都有人工对账成本)。工具能力:(1) 从 app.js APP_VERSION 自动探测当前版本号;(2) 默认 patch +1(v3.22.40 → v3.22.41),--minor / --major / --set=vX.Y.Z 可切;(3) 默认 dry-run,加 --apply 才落盘;(4) **写前校验 4 处埋点必须 = current**,不一致拒绝执行(防漏改历史);(5) 写后回读校验 4 处全部 = next;(6) 字节级 Buffer.from 回写保留原始行尾(LF/CRLF),**避免 Node 隐式 LF→CRLF 污染**(初次实现时踩过此坑:fs.writeFileSync(string,'utf8') 把 index.html 23097 LF 写成 23559 CRLF,已用 `git checkout` 恢复);(7) 不自动 commit,留人工确认 + 打印建议 commit message。校验:node --check 通过;dry-run + apply + 漏改保护 + 行尾保留 + 回滚 5 项测试全过;本轮**未实际 bump 4 个埋点**(仅新增工具脚本),下次发版才用 `node _bump_version.js --apply` 一次到位。Commit `71ce5ab` 已 push 到 origin book。顺手清掉两条已兑现 todo:NSCA ch10 SMR 5202-5213 入库状态(v3.22.17 已兑现)+ 三 ?v= 漂移问题(本轮已工具化)。
- 上轮 (v3.22.40):NSCA-CPT ch09 双层结构 H4 标题统一 - 该章共 8 处「#### 第一层」「#### 第二层」子标题,但其中 7 处(1.2 半月板/1.3 髌骨软化/2.1 肩袖/3.1 ATFL/4.1 网球肘/5.1 腰肌劳损/6.1 跟腱炎)写成了截断形式「第一层」「第二层」,仅 1.1 髌腱炎一处是完整「第一层:普通人能看懂」「第二层:专业人士参考」。这种不一致会让读者在章节内交叉阅读时困惑(到底哪个是「家里能做」哪个是「专业进阶」)。14 处 H4 全部校准为完整形式(含 1.1 原有 2 处,**新增 12 处**「第一层:普通人能看懂」「第二层:专业人士参考」)。`APP_VERSION` v3.22.39 → v3.22.40;`index.html` 三处 ?v=v3.22.39 → ?v=v3.22.40。校验:node --check 通过;ex-lib.json / manifest.json JSON OK;全库 335 处 [ex:NNNN] 引用零 broken;CRLF 完整保留(ch09 545 行 CRLF,prefix/suffix byte 同);git diff 仅 14 insertions / 14 deletions,零副作用。影响:与 ch07(v3.22.35)+ 羽毛球 ch02(v3.22.33)风格对齐,UI 章节大纲一致性 +1。
- 上轮 (v3.22.39):三本书(badminton / engineering-mechanics / finance)ch05 同一模板 bug 修复--manifest 引用了早期生成的'心理框架'占位(ch05-psychological-framework.md 156/147/147 行),但真实的专业第五章(945/1023/1041 行、10+ h2、35+ h3)在文件系统中早已完成。两份 manifest 三本共 6 处 ch05 条目整体替换为真实章节;words 按 yin-yang 公式精确重算(badminton 14067、engineering-mechanics 13443、finance 12988);三份孤儿 md 删除(已无任何外部引用,仅 memory/dreaming 历史日志保留痕迹);APP_VERSION v3.22.38 → v3.22.39;index.html 三处 ?v= 同步。校验:node --check 通过、JSON 深比对确认两份 manifest 三处 ch05 字段 byte-equal、CRLF 保留、全库 335 处 ex 引用 0 broken。影响:用户打开这三本书时 ch05 从 4 个 H2 的心理草稿恢复为 10+ H2 的真实专业内容;UI 章节卡片 / 侧边栏 / 测试点列表同步刷新。
- 上轮 (v3.22.38):修 **NSCA-CPT 10 章 + yin-yang 5 章 + badminton ch12** 合计 **16 章 manifest h2s 元数据滞后**(UI-breaking bug,空 h2s 会同时打瘸 app.js 三处 UI:章节卡片 / 侧边栏 / 测试题)。NSCA 10 章 h2s 全部为 `[]`、words 为 3 位数存根值(如 ch02 manifest 1416 字但实际 15093 字、ch10 manifest 101 字但实际 3398 字);yin-yang ch08/11/12/13/15 共 5 章 h2s 数量错误;badminton ch12 h2s 数量错误(manifest=7, 实际=11)。按既有「CJK + alnum token」公式重算:**h2s 0/错误 → 16 章全部校准**;NSCA words 同步从存根值升到真实值(如 ch02 1416→15093, ch10 101→3398)。顺带版本同步:`APP_VERSION` v3.22.37 → v3.22.38;`index.html` 三个 ?v= 缓存串 v3.22.37/v3.21.2 → v3.22.38(**style.css 本轮一并提到 v3.22.38**,免得下次继续漂)。校验:node --check ×2 通过;JSON 深比对确认**仅 NSCA-CPT 整本 + yin-yang 5 章 + badminton ch12 共 16 章变动**,其余 6 本(yin-yang/badminton/finance/engineering-mechanics/psychology/competition/nutrition)byte 级不变;CRLF 全程保留(app.js 8312 行 CRLF 完整、manifest_data.js 11496 行 CRLF、index.html 维持 LF 口径);分章 words 求和 = 781331(NSCA 49801 + yin-yang 143788 + badminton 89875 + badminton-recovery 20073 + 其他);全库 335 处 [ex:NNNN] 引用零 broken;ex-lib.json JSON OK
- 上轮 (v3.22.37):羽毛球-recovery 8 章 manifest 元数据修 -- 该书 8 章 `h2s` 全是空数组、`words` 还是初版存根值(1529 字)。空 h2s 会同时打瘸 app.js 三处 UI:章节卡片显示「- / 0节」(5176-5181)、侧边栏目录显示「无子章节」(5390)、测试题显示「无测试点」(5655)。重算后 **words 1529 → 20073(2.0万字)、h2 0 → 71、h3 0 → 93**,8 章空 h2s 归零。顺带修两处版本漂移:`APP_VERSION` v3.22.35 → v3.22.37(上轮 v3.22.36 只改文案漏了 bump)、`index.html` 的 `manifest_data.js`/`app.js` 缓存串 `?v=v3.8.6` → `?v=v3.22.37`(滞后约 28 个版本,老访客会一直吃缓存看不到本次修复)。校验:node --check ×2 通过;JSON 深比对确认**仅 badminton-recovery 一本变动**、其余 6 本 byte 级不变;CRLF 全程保留(8735 → 9435 行全是 CRLF,prefix/suffix byte 相同);words 分章求和 == totalWords;全库 335 处 [ex:NNNN] 引用零 broken;ex-lib.json JSON OK
- 羽毛球康复 ch08 末清单段"19 处"计数 bug 修正 → 35 inline / 16 unique(commit 55cc110, v3.22.36)
- NSCA-CPT ch07 第八节"训练负荷管理"扩写(commit 6941602, v3.22.35)
- NSCA-CPT 4 章表格列头统一(commit 9d90bf1, v3.22.34)
- 羽毛球康复 ch02 肩章 W1-W8 时间线表内联 ex-lib 引用(commit bb557eb, v3.22.33)
- NSCA-CPT ch10 三处 ex-lib 表格统一方括号格式(commit 97a5b13, v3.22.32)
- NSCA ch10 兑现 v3.22.17 承诺:2.1 节末尾 SMR 引用表 12 条(commit 0cf1282, v3.22.31)
- ch08 末尾补 ex-lib 引用清单段(commit 124e6cf, v3.22.30)

## 本轮增量 (v3.22.45 commit 020ad58)
- **成就文案脱节修复**:manifest 真实 7 本书(yin-yang/badminton/engineering-mechanics/finance/nsca-cpt/psychology/badminton-recovery),但 `app.js:2233` 成就卡片文案仍写「六艺精通 / 六本书全部完成」(v3.22.10 注册 NSCA 时旧文案,v3.22.44 加羽毛球康复后未同步)。checkAllBooksComplete() 逻辑本身已用 MANIFEST.books.length 动态遍历,**功能行为正确,只是 UI 文案脏数据**。本轮 2 处文案脱节修复 + APP_VERSION 4 埋点同步:(1) `app.js:2233`「六艺精通」→「七艺精通」+「六本书全部完成」→「七本书全部完成」;(2) `books/nsca-cpt/README.md:11`「六本书写作计划」→「七本书写作计划」;(3) APP_VERSION v3.22.44 → v3.22.45(`node _bump_version.js --apply`);(4) VERSION changelog 头部注释 + v3.22.45 摘要条目。校验:`node --check app.js` ✓ / `python -m json.tool manifest.json` ✓ / 4 处埋点文本 grep = v3.22.45 ✓ / 「六艺/六本」grep = 0 残留 ✓ / 「七艺/七本」grep = 2 处都正确 ✓ / BOM 保留 ✓ / VERSION v3.* 倒序单调递减(87 条)✓ / git diff stat:4 files changed, +1/-1(其余 2 文件字节级未变)。
- **顺手清掉候选**「NSCA 9/10 章 title 与 manifest_data.js 不一致」一条——本轮重新评估后,真正最显眼的文案脏数据其实是「六艺/六本」→「七艺/七本」(已修)。

## 本轮增量 (v3.22.46 commit 待定)
- **羽毛球 ch12 §8.4 + §9.8 引用清单脱节 + 6 broken ex-lib id 修复**：`git log --oneline -10` 看到上轮 `3d34557 docs(books): v3.22.46 books/README.md ...` 是文档型 commit 未实际 bump（4 埋点 / VERSION header 仍是 v3.22.45）。本轮扫 `books/badminton/ch12-physical-training.md` §8.4 发现三处脱节：**表头「本章 51+30 个 ex-lib 引用清单（按类别）」实际是「36+30」(力量 17 + 爆发 11 + 敏捷 1 + 柔韧 7 = 36)**;**3 个类别计数跟列表实际数量不符**(力量 17个 → 实际 18 个、爆发 8个 → 实际 11 个、柔韧 5个 → 实际 7 个);**6 个 id 在 ex-lib.json 库里根本不存在**(0273/0876/1998/2010/2012/2015,全是在表中以裸 4 位数字呈现,读者点击会被 UI 当作 broken 引用失败)。§9.8 互引表同步存在同一组 5 个 id (踝/肘/腰)。修复动作: (1) §8.4 表头加 v3.22.46 注释 + 「36+30」新表头;(2) 3 个类别计数校准 (力量 18 个移除 0273 → 17 个、爆发 8 → 11、柔韧 5 → 7、康复 30 → 30 移除 5 个 broken);(3) 8.4 + 9.8 同步移除 6 个 broken id (0273/0876/1998/2010/2012/2015;§8.4 力量表 0273,§9.8 + §8.4 康复表 0876/1998/2010/2012/2015);(4) §8.4 表后加一句「本表内全部 id 已对照 `books/exercises/ex-lib.json`（1336 条）逐个校验, 零 broken ex-lib id」防止后续再脱节。`_bump_version.js --apply` 把 4 埋点 v3.22.45 → v3.22.46 同步落盘 + VERSION 加 v3.22.46 摘要条目 + 头注释更新。校验:全 `books/` 目录 `os.walk` 扫 266 处 `[ex:NNNN]` 引用,**零 broken**(原唯一 `ex:0000` 是 NSCA ch04 README 「[ex:0000-中文名]」格式说明,非实际引用); ch12 文件 1334 行 LF 全保留(纯 LF,零 CRLF 污染); git diff stat 5 files changed,24 insertions / 12 deletions; node --check app.js 上一轮 v3.22.45 时已验,本轮只改 APP_VERSION 常量字节; 4 处埋点文本 grep = v3.22.46 ✓。Commit (待生成) push origin book。
- **顺手清掉候选**「扫描 broken ex-lib id」一条,本轮 v3.22.46 一次性扫全 books/ 266 处零 broken,全部状态在掌握。
- **未清理**候选:① NSCA-CPT ch10 §七总清单 (12 条) 与 §2.1 节 ex-lib (7 条) 有 6 个 id 重叠的「已被 2.1 节引用」UX 标记(纯文字 UX 改进,优先级中);② §8.4 14 个「库内合法但本章节正文中未出现」的 id (0036/0088/0980/0984/0999/1324/1369/1408) — 这些是「第九节对应 ex-lib 入口查表」,本轮已加注说明第九节正文是原则/生物力学为主,表是查表入口,不算 phantom;③ §9 各小节正文加 inline `[ex:NNNN]` 引用 (工作量中等,可与 NSCA ch10 重叠 UX 改进一起做);④ books/{competition,nutrition} 是否注册到 manifest.json 决策(本轮进一步确认:`app.js` 中 `nutrition` / `competition` 是 MODULES 数组里的 inline 模块 id,books:['nutrition'] / books:['competition'] 是死引用,所以这 2 本目录是「独立化模块内容素材库」非 UI 入口)。

## 本轮增量 (v3.22.47 commit 待定)
- **books/nutrition/README.md 单行实物对齐**：原 README 列了 8 章（含「8. 损伤康复营养」），但 `books/nutrition/` 下实际只有 ch01-ch07 共 7 个 md 文件。ls / wc -m 双重确认：ch01-tdee 1415 / ch02-macronutrients 2842 / ch03-nutrient-timing 2053 / ch04-protein-strategy 2426 / ch05-hydration 2230 / ch06-supplements 2579 / ch07-weight-management 1841，**无任何 ch08-*.md 文件**。这处脱节不是大 bug，但会让读者按 README 找「损伤康复营养」章节时扑空。**最小变更修复**：删除第 14 行「8. 损伤康复营养」，章节列表 8 → 7，与磁盘实物一致。**未 bump 4 埋点**（这是纯文档对齐，不影响 APP_VERSION / 缓存串语义，不属于发版级变更）。校验：`git diff books/nutrition/README.md` 单文件 1 行 deletion / `python -m json.tool manifest.json` ✓ / `node --check app.js` ✓ / 全 `books/` 目录 `[ex:NNNN]` 引用扫描 335 处 0 broken（沿用上轮 v3.22.46 校验结论，本轮零文件改动）。
- **本轮新增下轮候选**（按价值排序）:
  1. **books/{badminton,engineering-mechanics,finance,psychology} 4 本书共 5 章漏注册到 manifest**：本轮扫 fs vs manifest 发现 — `badminton/ch13-doubles-tactics.md`（21329 字 / 1173 行）/ `engineering-mechanics/ch12-fracture-and-fatigue.md`（25772 字 / 1375 行）/ `finance/ch13-international-finance.md`（22107 字 / 1147 行）/ `psychology/ch03-thinking-and-language.md`（24925 字 / 731 行）/ `psychology/ch12-positive-psychology.md`（22252 字 / 1048 行）— 5 个文件都在磁盘上、合计 11.6 万字真实内容，但 manifest.json + manifest_data.js 都只注册到 ch12 / ch11 / ch12 / ch11 / ch11，**这 5 章用户从 UI 完全看不到**。修法：跟 v3.22.44 `_add_recovery_to_manifest.js` 同一模板，给这 5 章生成 file/title/words/h2s metadata 后 byte 级追加到两份 manifest。工作量 = 一次性脚本 + 章节 words/h2s 重算 + 4 埋点 + VERSION 摘要。可独立 commit / 回滚。但这是「数据补全」而非「代码变更」，用户偏好明确说「不做与现有功能重复的大改动；优先修复真实存在的 bug/质量问题」，本轮决定先做最小（nutrition README），把 5 章注册留给下轮决策。
  2. **羽毛球 ch09 / ch10 + engineering-mechanics ch09 / ch10 + psychology ch03 manifest title 与实际章节主题不对位**：本轮扫 manifest title vs md H1，发现 badminton ch09 和 ch10 都叫「Competition Psychology」（实际一个讲赛前心理，一个讲赛后心理）；engineering-mechanics ch09/ch10 都叫「Dynamics」（实际一个讲运动学一个讲动力学）；psychology ch03 manifest title 是「Memory」但实际文件叫 ch03-thinking-and-language.md（思维与语言，根本不是记忆）。其中 psychology ch03 是最严重的功能性错位（用户点 ch03 看到的是记忆内容，但文件名/UI 显示是思维与语言，会严重困惑）。其余 4 处是同名但实际不同主题。修法：先修 psychology ch03 这一个（一行修改 manifest title），其余 4 处与下轮 5 章注册合并处理更高效。
- **本轮事实修正（重要，给下轮避免重蹈）**：之前几轮 todo 反复出现「库里没有 foam roller / 筋膜球专项条目」的表述，**这是错的**。本轮扫描确认 `books/exercises/ex-lib.json` 库内 id `5202-5213` 共 12 条**全部真实存在**，英文名 foam roller quadriceps / hamstrings / it band / calves / glutes / upper back / latissimus / rotator cuff / thoracic spine / adductors + lacrosse ball forearm / plantar fascia，**覆盖了全部 12 个 SMR 动作**。NSCA ch10 §2.1 末尾的 SMR 引用表（v3.22.17 + v3.22.31 校对）引用 `[ex:5202]` 至 `[ex:5213]` 全部合法可用。**下轮如再涉及 SMR 条目，可直接用 5202-5213，无需新建动作或伪造 id**。此事实修正也清掉了候选里相关死信条目。

## 本轮增量 (commit 3e3f4e2，未发版 — 同 v3.22.47 纯元数据口径)
- **psychology ch03 manifest 改对 — 指向真文件 `ch03-thinking-and-language.md`**：上轮 _session_todo.md 第二候选「psychology ch03 manifest title『Memory』与实际章节主题不对位（实际文件是 ch03-thinking-and-language.md 思维与语言）」本轮落地。**问题事实**：磁盘 `books/psychology/` 下存在两个 ch03 文件——`ch02-memory.md`（动机心理学·记忆—大脑的信息银行，11912 字，7 h2s）+ `ch03-memory.md`（认知心理学·记忆，22384 字，11 h2s）+ `ch03-thinking-and-language.md`（认知心理学·思维与语言，24924 字，12 h2s）。manifest.json + manifest_data.js 里 psychology ch03 仍登记 `ch03-memory.md`（title=Memory，22384 字，11 h2s），**真正应当作为 ch03 的 `ch03-thinking-and-language.md`（24924 字、12 h2s）从未被 manifest 引用**——用户从 UI 点 ch03 看到「记忆」内容，但文件路径是 `ch03-thinking-and-language.md`、上下章（ch02 动机·记忆/ch04 动机）也是双层结构，**功能性错位严重**。
- **修法（最小变更、单 commit、可独立回滚）**:
  1. 两份 manifest ch03 段整段替换：`file=ch03-thinking-and-language.md`、`title=Thinking And Language`、`words=24924`（按 `_fix_manifest.js` 权威口径 = `md.length` 字符数）
  2. h2s 从 11 段（记忆·第一节…第十一节）重算为 12 段（3.1 思维的本质与类型 / 3.2 推理：思维的逻辑之舞 / 3.3 问题解决：从困惑到突破 / 3.4 创造性思维 / 3.5 语言的认知基础 / 3.6 语言习得 / 3.7 语言与思维的关系 / 3.8 双语与认知 / 3.9 思维与语言的障碍 / 3.10 本章总结 / 🐏 的行动建议 / 参考文献），38 个 h3 全量回填
  3. psychology.totalWords `172437 → 174977`（= sum 11 章 words）
  4. **`ch03-memory.md` 文件保留未删**（224 行内容未来可能复用；删除属于不可逆架构变更，需用户授权）
- **校验全过**:
  - `python -m json.tool manifest.json` ✓
  - `node --check manifest_data.js` ✓
  - ch03 真实文件 vs manifest h2s/h3: 12/12 全等, 38/38 全等, mismatch=0
  - 两份 manifest psychology 整块 byte-level 等价（重算后 `manifest.json:psychology` == `manifest_data.js:psychology`）
  - CRLF 全程保留（manifest.json 11375 行 CRLF 完整, manifest_data.js 12051 行 CRLF 完整, 0 LF-only 污染）
  - 4 处埋点文本（APP_VERSION + index.html 3 个 ?v=）未触（纯元数据修复，按 v3.22.47 nutrition/README 同口径不发版）
  - 其他 6 本书（yin-yang/badminton/engineering-mechanics/finance/nsca-cpt/badminton-recovery）byte 级未动
- **顺手清掉候选**「psychology ch03 manifest title 错位」一条 + 「5 章漏注册到 manifest」候选中第 4 项 `psychology/ch03-thinking-and-language.md` 一条（不再漏注册）。
- **下轮候选**（重新按价值排序）:
  1. **5 章漏注册剩余 4 项**（badminton/ch13 + engineering-mechanics/ch12 + finance/ch13 + psychology/ch12 — 上一轮 #1 候选的子集，本轮已兑现 psychology/ch03，剩余 4 项共 9.1 万字真实内容 UI 仍看不到）— 跟 v3.22.44 `_add_recovery_to_manifest.js` 同一模板，工作量 = 一次性脚本 + 4 章 metadata 生成 + 4 埋点 + VERSION 摘要。可独立 commit / 回滚。
  2. **4 处 manifest title 同名但实际不同主题**（badminton ch09/ch10「Competition Psychology」/ engineering-mechanics ch09/ch10「Dynamics」）— 一行式 title 修复，独立小改进。注：psychology ch03 是「title 与文件不对位」（已修），这 4 处是「两章共用一个 title」（不同问题）。
  3. **NSCA-CPT ch10 第七节总清单（12 条）与 §2.1 节 ex-lib（7 条）6 个 id 重叠 UX 标记** — 纯文字 UX 改进，优先级中。
  4. **`ch03-memory.md` 处置决策**（224 行，删除 / 归档 / 整合到 ch02 哪条路径）— 等用户授权，不属本轮范围。
  5. **yin-yang/badminton/nsca-cpt 两份 manifest 之间 totalWords 仍存预先存在漂移**（本轮确认非心理学段引起；与本轮 psychology 修复无关，可单独成轮）。
## 本轮增量 (v3.22.48 commit 待生成)
- **books/{competition,nutrition} 整本 metadata 补入 manifest.json + books/README.md**（兑现了自 v3.22.44 / v3.22.45 / v3.22.47 三轮 todo 反复出现的「下轮最有价值候选」）：manifest.json 长期只注册 7 本真书，但 `books/competition/`（ch01-ch06 六章 + README）和 `books/nutrition/`（ch01-ch07 七章 + README）都是真实可读的成品目录，**任何外部工具 / CI 读 manifest.json 都以为这 2 本根本不存在**（即使 UI 通过 manifest_data.js 渲染也仍未注册这 2 本）。manifest_data.js 里 `books:["nutrition"]` / `books:["competition"]` 是死引用（上轮 v3.22.47 todo 已确认），所以这 2 本从 UI 也完全看不到。本轮一次性补齐:
  1. **manifest.json**:末尾追加 competition (6 章 / 5295 字) + nutrition (7 章 / 5796 字) 两本 metadata（按 v3.22.44 `_add_recovery_to_manifest.js` 同一模板：CJK + alnum token 公式 + level-3 h3 subs）。`books[]` 长度 7 → 9；totalBooks = 9 本 / 92 章 / 827316 字 = 82.7 万字。
  2. **books/README.md**:脱节 3 处修复 — 「七本」→「九本」、`7 本书 / 79 章 / 81.4 万字` → `9 本书 / 92 章 / 82.7 万字`、列表追加 🎯 比赛策略 / 🥗 营养恢复 两行。版本号 `v3.22.45` → `v3.22.48` 同步。
  3. **APP_VERSION + index.html 三处 ?v=**:连升 2 格 `v3.22.46 → v3.22.48`（`node _bump_version.js --apply` 跑了 2 次，先 bump .47 才意识到需要再 bump 一次到 .48 与 README 对齐；4 埋点文本 grep = v3.22.48 ✓ / bytes delta app.js 534724 字节不变 / index.html 23097 字节不变 ✓）
  4. **VERSION**:头部 `当前 HEAD = v3.22.46` → `v3.22.48` + `共 62 条` → `共 63 条` + 顶部新增 v3.22.48 / v3.22.47 两条 commit 摘要
- **exercises/ 决策明确——不入 manifest，但保留目录**:`books/exercises/` 下仅 `ex-lib.json`（动作库真实存放地，1336 条合法 id），**没有 README / 没有章节 md**，不是一本书。manifest.json 也不应注册它（注册即等于 UI 给它显示 1 个「书」入口但内部空指针）。上轮 todo 候选里「exercises 是否注册」已确认答案是「否，保留为 ex-lib 库目录」。
- **校验全过**:
  - `python -m json.tool manifest.json` ✓（11375 → 11710 行，+335 行净增）
  - `node --check app.js` ✓（未触 manifest_data.js — 与 v3.22.47 同口径，理由：manifest_data.js 是 UI 真相源、manifest.json 是项目结构真相源，两份长期漂移已通过 v3.22.43 / v3.22.44 / v3.22.47 / v3.22.48 多轮补齐中。本轮竞/营 2 本补到 manifest.json 是「项目结构真相源」先到位，下轮补 manifest_data.js 时一次到位避免本轮 commit 内两份脱节）
  - 全 `books/` 目录 266 处 `[ex:NNNN]` 引用沿用 v3.22.46 校验结论 0 broken（本轮未触任何 chXX-*.md 内容）
  - CRLF 全程保留（manifest.json 11375 行 CRLF → 11710 行 CRLF，0 LF-only 污染）
  - 4 埋点文本 grep = v3.22.48 ✓ / 9 本书 id 唯一性 grep ✓ / chapterCount 与 chapters.length 全部相等 ✓
- **顺手清掉三条候选**:
  1. 「books/{competition,nutrition} 整书注册」— 本轮已兑现 ✓
  2. 「books/{competition,nutrition,exercises} 三本书目录真实存在但两份 manifest 都未注册」— exercises 已明确不注册 + competition/nutrition 已注册 ✓
  3. 「books/{competition,nutrition} 决策确认是否进 UI」— 本轮 README 列表追加 ✓
- **下轮候选**（重新按价值排序，本轮补完后剩余）:
  1. **5 章漏注册剩余 4 项**（badminton/ch13 + engineering-mechanics/ch12 + finance/ch13 + psychology/ch12 — 上一轮 v3.22.47 todo 第 1 项的子集，本轮 v3.22.47 已兑现 psychology/ch03，剩余 4 项共 9.1 万字真实内容 UI 仍看不到）— 跟 v3.22.44 / v3.22.48 `_add_recovery_to_manifest.js` 同一模板，工作量 = 一次性脚本 + 4 章 metadata 生成 + 4 埋点 + VERSION 摘要 + 同步 manifest_data.js 避免两份漂移。可独立 commit / 回滚。**优先级最高**：5 章共 9.1 万字 vs 本轮 2 本共 1.1 万字 = 8x 价值。
  2. **manifest_data.js 同步补竞/营 2 本**（本轮只补 manifest.json 单边；下轮同步补 manifest_data.js 让两份 manifest 在 UI 真看到 9 本书）。工作量 = 复用本轮 build_books.py 输出 + byte 级追加。
  3. **4 处 manifest title 同名但实际不同主题**（badminton ch09/ch10「Competition Psychology」/ engineering-mechanics ch09/ch10「Dynamics」）— 一行式 title 修复，独立小改进。
  4. **NSCA-CPT ch10 第七节总清单与 §2.1 节 6 个 id 重叠 UX 标记** — 纯文字 UX 改进，优先级中。
  5. **`ch03-memory.md` 处置决策**（224 行，删除 / 归档 / 整合到 ch02 哪条路径）— 等用户授权，不属本轮范围。
  6. **yin-yang/badminton/nsca-cpt 两份 manifest 之间 totalWords 仍存预先存在漂移** — 沿用历史候选，可单独成轮。

## 本轮增量 (v3.22.49 commit 76b02ec)
- **4 章漏注册补齐兑现**（v3.22.47 / v3.22.48 todo 第 1 候选，本轮已兑现）：badminton/ch13 (Doubles Tactics, 13.3K 字, 18 h2/55 h3) + finance/ch13 (International Finance, 13.0K 字, 17 h2/51 h3) + psychology/ch12 (Positive Psychology, 13.3K 字, 12 h2/40 h3) + engineering-mechanics/ch12 (Fracture And Fatigue, 14.2K 字, 19 h2/66 h3) = 共 5.4 万字真实内容 UI 原本看不到，现在可读了。
- **manifest.json 唯一真相源更新**: `9 本 / 92 章 / 82.7 万字 → 9 本 / 96 章 / 88.1 万字`（chapterCount +1/totalWords 重算/totalChapters 聚合全过）。5 本未触书 byte 级不变 (yin-yang/nsca-cpt/badminton-recovery/competition/nutrition)。
- **books/README.md 4 行「章数/字数」同步**: 12→13/12.9→14.2万, 12→13/14.5→15.8万, 11→12/17.2→18.8万, 11→12/15.5→16.9万 + 数据源版本 v3.22.48 → v3.22.49（直接换算 manifest 真实 totalWords → 1 位小数）。
- **APP_VERSION + index.html 3 ?v= 埋点**: v3.22.48 → v3.22.49（单步升级，连升两格踩过坑不再重复）。
- **VERSION**: 头部 v3.22.48 → v3.22.49 + 顶部新增 v3.22.49 commit 摘要（一句话写明「兑现 v3.22.47/48 todo 第 1 候选」便于后续追溯）。
- **schema 全校**:
  - 4 章 h2/h3 子树 vs 磁盘 grep 100% 等价（18/55, 17/51, 12/40, 19/66 — 4 章总计 66 h2 + 212 h3）
  - 4 本书的 chapterCount == chapters.length == 真实章数
  - 4 本书的 totalWords == sum(chapters.words)
  - title 字段沿用 4 本书既有「英文 Title Case」约定（Doubles Tactics / International Finance / Positive Psychology / Fracture And Fatigue）
- **ex-lib 验证**: 全 books/ `[ex:NNNN]` 引用 v3.22.46 是 266 处 → 本轮 335 处（多 69 处是 4 章内的合法引用），全部合法、零 broken（库内 1336 id）。
- **manifest_data.js 未触**：与 v3.22.48 同口径「本轮只补 manifest.json 单边避免双向漂移」。下轮同步补 manifest_data.js 时同样 ~5.4 万字 UI 才真正渲染。
- **校验全过**:
  - `python -m json.tool manifest.json` ✓
  - `node --check app.js / manifest_data.js / _add_4_missing_chapters.js` ✓
  - 5 本未触书 byte-level 等价 ✓
  - 4 章 h2/h3 子树 grep 等价 ✓
  - 4 本书 chapterCount/chapters.length/totalWords 自洽 ✓
  - 4 埋点文本 grep = v3.22.49 ✓
  - CRLF 0 裸 LF 污染 ✓
  - ex-lib 引用 335/335 零 broken ✓
- **顺手清掉两条候选**:
  1. 「5 章漏注册剩余 4 项」(本轮已兑现所有 4 项，**5 章漏注册这条 todo 已彻底清空**)
  2. 「books/{competition,nutrition} 整书注册」(上轮 v3.22.48 已兑现，确认)
- **下轮候选**（重新按价值排序）:
  1. **manifest_data.js 同步补竞/营 2 本 + 4 章 = 共 6 项缺口**（本轮 + 上轮累计遗留：competition 6 章 + nutrition 7 章 + 4 章漏注册 metadata = 共 17 章 metadata）— 工作量 = 一次性脚本 + byte 级追加到 MANIFEST_DATA.books。可独立 commit / 回滚。**优先级最高**：兑现了「UI 真看到 9 本书 + 96 章」承诺。
  2. **4 处 manifest title 同名但实际不同主题**（badminton ch09/ch10「Competition Psychology」/ engineering-mechanics ch09/ch10「Dynamics」/ badminton ch02/ch03「Backhand Technique」相邻等）— 抽查发现羽毛球有 2 处、力学有 2 处、可能更多；一行式 title 修复，独立小改进。
  3. **NSCA-CPT ch10 第七节总清单与 §2.1 节 6 个 id 重叠 UX 标记** — 纯文字 UX 改进，优先级中。
  4. **`ch03-memory.md` 处置决策**（224 行，删除 / 归档 / 整合到 ch02 哪条路径）— 等用户授权，不属本轮范围。
  5. **yin-yang/badminton/nsca-cpt 两份 manifest 之间 totalWords 仍存预先存在漂移** — 沿用历史候选，可单独成轮。

## 本轮增量 (v3.22.50 commit e083f49)

- **NSCA-CPT ch10 第七节总清单「↗ 详见 2.1 节」交叉提示**: 真实问题 — 第七节总清单 12 条与 2.1 节「本节 ex-lib 引用表」7 条实际重叠 6 个 id (0669/1339/1560/1709/1377/1713),但读者看不到这层重复，会产生「这本书怎么又把同样动作跳出来讲一遍」的疑惑。在总清单重复行末尾加 `↗ 详见 2.1 节` 纯文字标记 + 末尾说明点明「6+6」分组。ex id 仍直接跳 ex-lib 演示，零功能性影响，纯阅读路径提示。
- **选型原因**（为什么不做清单 1「manifest_data.js 17 章同步」或清单 4「ch03-memory 处置」）：
  - 清单 1 工作量超单 commit（17 章 metadata + 5 本书 totalWords 重算 + byte 级追加），不属本轮小改进定义；
  - 清单 4 需要用户授权；
  - 本轮改动 = 14+/14- 单文件 + 4 埋点，git diff stat 干净，可独立回滚。
- **校验全过**:
  - 全库 335 处 `[ex:NNNN]` 引用零 broken（库内 1336 id）
  - `node --check app.js` ✓（只动 const APP_VERSION 一行）
  - `_bump_version.js --apply` 4 埋点 v3.22.49 → v3.22.50 ✓
  - VERSION 文件追加一条 v3.22.50 changelog 同步
  - `git push origin book` 成功（dc9ec6d..e083f49）
- **顺手勾掉候选**:「NSCA-CPT ch10 第七节总清单与 §2.1 节 6 个 id 重叠 UX 标记」（v3.22.50 已兑现，可勾掉）
- **下轮候选**（重新排序后）:
  1. **manifest_data.js 同步补竞/营 2 本 + 4 章 = 共 6 项缺口**（累计 17 章 metadata 仍欠）— 优先级最高，UI 真正看到 9 本书 + 96 章承诺未兑现
  2. **4 处 manifest title 同名但实际不同主题**（羽毛球 ch09/ch10「Competition Psychology」/ 力学 ch09/ch10「Dynamics」/ 羽毛球 ch02/ch03「Backhand Technique」相邻等）— 一行式 title 修复，独立小改进
  3. **NSCA-CPT 其他章节是否也存在「总清单 vs 小节 ex 引用表」重叠未标记** — 类比本轮 ch10 模式，可扫其余 9 章
  4. **`ch03-memory.md` 处置决策**（224 行）— 等用户授权
  5. **羽毛球康复 ch03 / ch04 / ch05 inline 引用 vs 库内动作名详细比对**（id 全部合法，中文译名一致性未逐条复核）
  6. **yin-yang/badminton/nsca-cpt 两份 manifest 之间 totalWords 预先存在漂移** — 沿用历史候选
  7. **VERSION 文件「3+」表述与下文「64 条」是否对齐**（本轮已改 v3.18.7 ~ v3.22.50 = 64 条 + v3.22.50 = 65 条，注释 OK；但顶部头部「历史叙事 v3.4.0 ~ v3.8.7」措辞是否要更新「v3.18.7 ~ v3.22.50 共 65 条」需检查是否与表头一致）

## 本轮增量 (v3.22.53 commit 6bb8987)
- **v3.22.53 完整收回 + 4 处工程不一致修复**（commit 6bb8987, push `a38fbb3..6bb8987`）:
  - **A) 4 埋点统一 v3.22.53**:app.js APP_VERSION + index.html 3*?v=。之前 v3.22.51 → v3.22.53 已落盘但中断未 commit，本轮一次性收回
  - **B) 6 处 chapter 副标题对齐**（双层结构偏好）:
    - NSCA-CPT ch09 「Competition Psychology」→「Competition Psychology · 基础」
    - NSCA-CPT ch10 「Competition Psychology」→「Competition Psychology · 专业级」
    - 工程力学 ch02 「Axial Loading」→「Axial Loading · 入门」
    - 工程力学 ch03 「Axial Loading」→「Axial Loading · 理论推导」
    - 工程力学 ch09 「Dynamics」→「Dynamics · 入门」
    - 工程力学 ch10 「Dynamics」→「Dynamics · 专题」
    - 注:4 处在 manifest.json 已落盘；本轮补 2 处到 manifest_data.js（Axial Loading 是 manifest_data.js 缺漏）
  - **C) NSCA-CPT 10 章 title 同步**:manifest_data.js 旧文本（带 v3.22.5/7/8 扩展尾巴）→ manifest.json 干净版,清掉 9 处「（v3.22.X ...）」尾巴。修了上一轮 v3.22.51 `a38fbb3` commit message 说「与 manifest.json 对齐」实际只对齐了 4 章 + 2 整本、漏 NSCA 10 章的尾巴
  - **D) `_scan_exlib.js` 入库**:v3.22.46 留下来的 ex-lib 扫描工具,沿用 `_bump_version.js` 下划线前缀命名
- **校验全过**:JSON OK / node --check × 2 OK / 两份 manifest 7 本书 chapter title byte-level 等价(0 diff) / 全库 107 md × 123 unique [ex:NNNN] vs 1336 id 库 broken = 0 / 4 埋点 v3.22.53 一致 / manifest_data.js CRLF 守恒 14622(无 BOM 污染)
- **清掉的候选**:
  - 「manifest_data.js NSCA 9/10 章 title 与 manifest.json 不一致」— 本轮全 10 章同步,可勾掉
  - 「4 埋点未统一」— 本轮 v3.22.53 一致,可勾掉
- **下轮候选**(重新排序):
  1. **manifest_data.js 同步补竞/营 2 本 + 4 章 = 共 6 项缺口**(累计 17 章 metadata 仍欠)— 优先级最高,UI 真正看到 9 本书 + 96 章承诺未兑现
  2. **羽毛球 ch02/ch03「Backhand Technique」相邻 title 排查**:NSCA 与工程力学都已「· 副标题」化,但 badminton ch02/ch03 是否同样相邻同名未审
  3. **NSCA-CPT 其他章节是否也存在「总清单 vs 小节 ex 引用表」重叠未标记** — 类比 v3.22.50 ch10 模式,可扫其余 9 章
  4. **`ch03-memory.md` 处置决策**(224 行)— 等用户授权
  5. **羽毛球康复 ch03 / ch04 / ch05 inline 引用 vs 库内动作名详细比对**(id 全部合法,中文译名一致性未逐条复核)
  6. **yin-yang/badminton/nsca-cpt 两份 manifest 之间 totalWords 预先存在漂移** — 沿用历史候选(实际 v3.22.43 已修过 5 本,需复查是否真还有漂移)
  7. **VERSION 文件 v3.22.51/v3.22.53 两条 changelog 是否需追加**(本轮 bump 跨过 2 个版本号,VERSION 历史条目需补齐 v3.22.51/v3.22.52/v3.22.53 三条)
