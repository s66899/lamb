# todos

## 进行中

## 待办（下轮候选）
- **style.css?v=v3.21.2 缓存串仍滞后**（本轮把 manifest_data.js / app.js 从 ?v=v3.8.6 提到 v3.22.37，但 index.html:24 的 style.css 仍是 v3.21.2）→ 下轮统一为「发版时三个 ?v= 一起提」并考虑写个 _bump_version.js 单点脚本，避免再次漂移
- 其他 6 本书（badminton / nsca-cpt / psychology / finance / engineering-mechanics / yin-yang / competition / nutrition）manifest words + h2s 是否也滞后于正文？本轮只修了 badminton-recovery；yin-yang 前 4 章抽样是准的，其余未验 → 下轮写一次性核对脚本（公式已确认见下）
- 羽毛球康复 ch03 / ch04 / ch05 inline 引用 vs 库内动作名详细比对（id 全部合法，但中文译名一致性未逐条复核）
- NSCA-CPT ch10 第七节总清单（12 条）与 2.1 节本节 ex-lib（7 条）有 6 个 id 重叠（颈 1403/肩 0669/上背 1339/大腿后 1560/大腿前 1713/臀 1709/小腿 1377）；可在总清单加"已被 2.1 节引用"标记 → 读者一键跳转
- 其他书扫描是否有"数字声明 vs 实际不符"或"承诺了引用表但未实现"的瑕疵

## 参考：manifest words 计算公式（已验证与历史值 100% 一致）
`_update_manifest.js` 的口径 = CJK 字符数 + 含字母数字的 token 数；用 yin-yang 前 4 章验证：8103/9300/8363/1864 全部逐字复现。h2s 结构 = `[{title, subs:[{title, level:3}]}]`。

## 已完成（本会话）
- **本轮 (v3.22.37)**：修 badminton-recovery **manifest 元数据严重滞后** —— 该书 8 章 `h2s` 全是空数组、`words` 还是初版存根值（1529 字）。空 h2s 会同时打瘸 app.js 三处 UI：章节卡片显示「— / 0节」(5176-5181)、侧边栏目录显示「无子章节」(5390)、测试题显示「无测试点」(5655)。重算后 **words 1529 → 20073（2.0万字）、h2 0 → 71、h3 0 → 93**，8 章空 h2s 归零。顺带修两处版本漂移：`APP_VERSION` v3.22.35 → v3.22.37（上轮 v3.22.36 只改文案漏了 bump）、`index.html` 的 `manifest_data.js`/`app.js` 缓存串 `?v=v3.8.6` → `?v=v3.22.37`（滞后约 28 个版本，老访客会一直吃缓存看不到本次修复）。校验：node --check ×2 通过；JSON 深比对确认**仅 badminton-recovery 一本变动**、其余 6 本 byte 级不变；CRLF 全程保留（8735 → 9435 行全是 CRLF，prefix/suffix byte 相同）；words 分章求和 == totalWords；全库 335 处 [ex:NNNN] 引用零 broken；ex-lib.json JSON OK
- 羽毛球康复 ch08 末清单段"19 处"计数 bug 修正 → 35 inline / 16 unique（commit 55cc110, v3.22.36）
- NSCA-CPT ch07 第八节"训练负荷管理"扩写（commit 6941602, v3.22.35）
- NSCA-CPT 4 章表格列头统一（commit 9d90bf1, v3.22.34）
- 羽毛球康复 ch02 肩章 W1-W8 时间线表内联 ex-lib 引用（commit bb557eb, v3.22.33）
- NSCA-CPT ch10 三处 ex-lib 表格统一方括号格式（commit 97a5b13, v3.22.32）
- NSCA ch10 兑现 v3.22.17 承诺：2.1 节末尾 SMR 引用表 12 条（commit 0cf1282, v3.22.31）
- ch08 末尾补 ex-lib 引用清单段（commit 124e6cf, v3.22.30）
