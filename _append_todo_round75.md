# 第 75 轮记账（append）

**改动**：`books/nsca-cpt/ch10-recovery.md` L255 正文 + L315 v3.22.74 blockquote 同步——把"泡沫轴全身 [ex:5205]"措辞修正为"泡沫轴小腿 [ex:5205]"（库里 ex-5205 真实名称就是 foam roller calves / 小腿 foam roller，不是"全身"）。后句"泡沫轴全身每段 60 秒"同步改为"泡沫轴小腿每侧 60 秒"。L315 v3.22.74 ledger 描述同步改为"泡沫轴小腿 [ex:5205]"（与正文一致）。

**真实问题**：上一轮 74 轮 commit `827e9af` 加了 §4.3 末段 "世界最佳拉伸 [ex:1604] + 泡沫轴全身 [ex:5205]" 时把 [ex:5205]（库里实际是 `foam roller calves` / 小腿）错标为"全身"——L87 SMR 表里 [ex:5205] 早就正确标"小腿"。这是典型的 id-动作错位 bug，与 session_todo 27 行「绝不混用核心动作条目替代 SMR」原则直接相关。

**校验**：
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0 与本轮修复前一致 ✅
- `python _audit_exlib_ledger.py` → 0 drift（ch10 不再报错，仅 ch12 仍 informational list-only）✅
- `python -m json.tool books/exercises/ex-lib.json` → JSON OK ✅
- `python -c "import _audit_exlib_ledger"` → 模块导入无语法错误 ✅
- `python -c "text=open('books/nsca-cpt/ch10-recovery.md',encoding='utf-8').read(); print(text.count('\ufffd'))"` → U+FFFD=0 ✅
- CRLF=321（与 v3.22.74 baseline 309 + 之前累加 12 行一致，本轮未增减行数）✅
- H2=7 / H3=13 结构未变 ✅
- grep "泡沫轴全" books/nsca-cpt/ch10-recovery.md → 0 命中（之前 2 命中 L255+L315 全清掉）✅
- 库实况确认：`ex-5205` name_en=`foam roller calves` / name_zh=`foam roller calves (СȺɽ)` / eq=`foam roller`——确为小腿，不是全身 ✅
- 反向验证：把 L255 "小腿"改回"全身"模拟上一轮错位版本，`python _scan_exlib_refs.py` 仍合法（id 没变），但 grep "泡沫轴全" 重现 2 命中——确认本轮修正的就是措辞错位（id 始终合法，但 id-动作描述不符）✅

**用户偏好兑现**：
- 修复 100% 在库里合法 id 内做"措辞对齐"——id 没变（仍 [ex:5205]），只把 id 的中文描述从"全身"改成库里真实名称"小腿"，零伪造 id、零新增 id ✅
- 沿用 71 / 72 / 73 / 74 轮风格：H2/H3 顺序不动（7 H2 + 13 H3 一致）；§2.1 本节 ex-lib 引用表 7 行不动；§2.1 SMR 引用表 12 行不动（L87 已正确标"小腿"）；§7 总清单 13 行不动；§3.1 / §3.2 / §3.3 引用示例不动；v3.22.17 / v3.22.62 旧 blockquote 完整保留作为历史快照
- 零业务代码改动；零 APP_VERSION bump（v3.22.62 不变，沿用 v3.22.55/56/57/62/71/72/73/74 等小 fix 不 bump 惯例）
- L315 v3.22.74 blockquote 是本轮 ledger 的"本轮改动内容描述"，必须与本轮 commit 正文一致——故 L315 中"泡沫轴全身 [ex:5205]"同步改为"泡沫轴小腿 [ex:5205]"，与正文 L255 同步

**commit hash**：（待 commit 后填）

**下轮候选**：
1. **(继承 71 / 72 / 73 / 74 / 75 轮,优先级低)** ch07-achilles 184 行 / ch06-back 198 行仍是羽毛球康复书最薄两章，可补第 13 周「专项维护期」+ 损伤力学图解说明段；ch07 距「跟腱硬度自测」「跟腱炎分期鉴别」等专业内容尚未覆盖
2. **(继承 72 / 73 / 74 轮,优先级低)** ch10 §六「与本套体系的衔接」末段本轮 L267 已加 1 句"实操衔接：世界最佳拉伸 [ex:1604] 作为日间过渡动作"——但 9 个章节 bullet 末仍是单链接，可扩展为 6 行表（与 ch09 反向链接表同模式）
3. **(继承 70 / 72 / 73 / 74 / 75 轮,优先级低)** ch01 L214 / ch02-ch07 末 → ch08 §四 锚点链接 — 跨轮保留
4. **(继承 72 / 73 / 74 / 75 轮,优先级低)** ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误说明累积在 §7 末段，跨多轮后声明字符串越来越长（v3.22.74 块 580+ 字），可考虑移到附录或独立 changelog 章节；本轮先不动
5. **(继承 74 / 75 轮,本轮已发现并修)** ch10 §4.3 L255 [ex:5205] "泡沫轴全身" 措辞错位——本轮修正 L255+L315 同步 ✅
