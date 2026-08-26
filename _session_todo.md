# todos

## 进行中

## 待办（下轮候选）
- 其他 4 本书（badminton / finance / engineering-mechanics / psychology）**words 仍用旧公式存根值**（manifest 数量比真实 CJK+token 大 30-60%），但本轮只验证过 yin-yang 与 badminton-recovery 用的是「CJK+alnum token」公式；其他 4 本用的是什么公式未确证（可能用了更宽松的 char-by-char 计数，**不是 bug 而是历史口径差异**）→ 下轮如要统一需先确认 4 本书的原始 commit message 用的是什么口径
- 羽毛球康复 ch03 / ch04 / ch05 inline 引用 vs 库内动作名详细比对（id 全部合法，但中文译名一致性未逐条复核）
- NSCA-CPT ch10 第七节总清单（12 条）与 2.1 节本节 ex-lib（7 条）有 6 个 id 重叠（颈 1403/肩 0669/上背 1339/大腿后 1560/大腿前 1713/臀 1709/小腿 1377）；可在总清单加"已被 2.1 节引用"标记 → 读者一键跳转
- **NSCA-CPT ch10 第七节 SMR 清单** 中**已可入库**的真·SMR 动作**仍未在 ex-lib.json 注册**——ch10 引用表用了 5202-5213 共 12 个 id，库内可能已有但未确认；下轮应跑 node 脚本检查这 12 个 id 是否在库中，若不在则按已有 SMR 条目模板补登记
- 其他书扫描是否有"数字声明 vs 实际不符"或"承诺了引用表但未实现"的瑕疵
- **发版时三个 ?v= 一起提**（style.css / manifest_data.js / app.js）→ 考虑写个 _bump_version.js 单点脚本，避免再次漂移（上次犯过 style.css 漏改）

## 参考：manifest words 计算公式（已验证与历史值 100% 一致）
`_update_manifest.js` 的口径 = CJK 字符数 + 含字母数字的 token 数；用 yin-yang 前 4 章验证：8103/9300/8363/1864 全部逐字复现。h2s 结构 = `[{title, subs:[{title, level:3}]}]`。

## 已完成（本会话）
- **本轮 (v3.22.39)**：三本书（badminton / engineering-mechanics / finance）ch05 同一模板 bug 修复——manifest 引用了早期生成的'心理框架'占位（ch05-psychological-framework.md 156/147/147 行），但真实的专业第五章（945/1023/1041 行、10+ h2、35+ h3）在文件系统中早已完成。两份 manifest 三本共 6 处 ch05 条目整体替换为真实章节；words 按 yin-yang 公式精确重算（badminton 14067、engineering-mechanics 13443、finance 12988）；三份孤儿 md 删除（已无任何外部引用，仅 memory/dreaming 历史日志保留痕迹）；APP_VERSION v3.22.38 → v3.22.39；index.html 三处 ?v= 同步。校验：node --check 通过、JSON 深比对确认两份 manifest 三处 ch05 字段 byte-equal、CRLF 保留、全库 335 处 ex 引用 0 broken。影响：用户打开这三本书时 ch05 从 4 个 H2 的心理草稿恢复为 10+ H2 的真实专业内容；UI 章节卡片 / 侧边栏 / 测试点列表同步刷新。
- 上轮 (v3.22.38)：修 **NSCA-CPT 10 章 + yin-yang 5 章 + badminton ch12** 合计 **16 章 manifest h2s 元数据滞后**（UI-breaking bug，空 h2s 会同时打瘸 app.js 三处 UI：章节卡片 / 侧边栏 / 测试题）。NSCA 10 章 h2s 全部为 `[]`、words 为 3 位数存根值（如 ch02 manifest 1416 字但实际 15093 字、ch10 manifest 101 字但实际 3398 字）；yin-yang ch08/11/12/13/15 共 5 章 h2s 数量错误；badminton ch12 h2s 数量错误（manifest=7, 实际=11）。按既有「CJK + alnum token」公式重算：**h2s 0/错误 → 16 章全部校准**；NSCA words 同步从存根值升到真实值（如 ch02 1416→15093, ch10 101→3398）。顺带版本同步：`APP_VERSION` v3.22.37 → v3.22.38；`index.html` 三个 ?v= 缓存串 v3.22.37/v3.21.2 → v3.22.38（**style.css 本轮一并提到 v3.22.38**，免得下次继续漂）。校验：node --check ×2 通过；JSON 深比对确认**仅 NSCA-CPT 整本 + yin-yang 5 章 + badminton ch12 共 16 章变动**，其余 6 本（yin-yang/badminton/finance/engineering-mechanics/psychology/competition/nutrition）byte 级不变；CRLF 全程保留（app.js 8312 行 CRLF 完整、manifest_data.js 11496 行 CRLF、index.html 维持 LF 口径）；分章 words 求和 = 781331（NSCA 49801 + yin-yang 143788 + badminton 89875 + badminton-recovery 20073 + 其他）；全库 335 处 [ex:NNNN] 引用零 broken；ex-lib.json JSON OK
- 上轮 (v3.22.37)：羽毛球-recovery 8 章 manifest 元数据修 —— 该书 8 章 `h2s` 全是空数组、`words` 还是初版存根值（1529 字）。空 h2s 会同时打瘸 app.js 三处 UI：章节卡片显示「— / 0节」(5176-5181)、侧边栏目录显示「无子章节」(5390)、测试题显示「无测试点」(5655)。重算后 **words 1529 → 20073（2.0万字）、h2 0 → 71、h3 0 → 93**，8 章空 h2s 归零。顺带修两处版本漂移：`APP_VERSION` v3.22.35 → v3.22.37（上轮 v3.22.36 只改文案漏了 bump）、`index.html` 的 `manifest_data.js`/`app.js` 缓存串 `?v=v3.8.6` → `?v=v3.22.37`（滞后约 28 个版本，老访客会一直吃缓存看不到本次修复）。校验：node --check ×2 通过；JSON 深比对确认**仅 badminton-recovery 一本变动**、其余 6 本 byte 级不变；CRLF 全程保留（8735 → 9435 行全是 CRLF，prefix/suffix byte 相同）；words 分章求和 == totalWords；全库 335 处 [ex:NNNN] 引用零 broken；ex-lib.json JSON OK
- 羽毛球康复 ch08 末清单段"19 处"计数 bug 修正 → 35 inline / 16 unique（commit 55cc110, v3.22.36）
- NSCA-CPT ch07 第八节"训练负荷管理"扩写（commit 6941602, v3.22.35）
- NSCA-CPT 4 章表格列头统一（commit 9d90bf1, v3.22.34）
- 羽毛球康复 ch02 肩章 W1-W8 时间线表内联 ex-lib 引用（commit bb557eb, v3.22.33）
- NSCA-CPT ch10 三处 ex-lib 表格统一方括号格式（commit 97a5b13, v3.22.32）
- NSCA ch10 兑现 v3.22.17 承诺：2.1 节末尾 SMR 引用表 12 条（commit 0cf1282, v3.22.31）
- ch08 末尾补 ex-lib 引用清单段（commit 124e6cf, v3.22.30）
