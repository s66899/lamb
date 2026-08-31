# 第 76 轮记账（append）

**改动**：
1. `_session_todo.md` L2967 — 回填第 75 轮 ledger 末尾「（待 commit 后填）」为真实 commit hash `49b1bc1`（之前 75 轮两次 commit 完成但 ledger 字符串里的占位符没回填）
2. `.gitignore` L4-L8 — 新增 `__pycache__/` / `*.pyc` / `*.pyo` 三个忽略项（消除每次跑 `_audit_exlib_ledger.py` 都会在工作树生成 `__pycache__/_audit_exlib_ledger.cpython-313.pyc` / `cpython-314.pyc` 导致工作树 dirty 状态污染）

**真实问题**：
- 第 75 轮 commit `49b1bc1` + `970b4c1` 已完成且 push 成功，但 ledger 字符串里 `**commit hash**：（待 commit 后填）` 占位符未回填，跨轮看 ledger 时无法直接定位本轮 commit（需要 git log 反查）；属于「记账不一致」类小 bug
- 每次跑 `python _scan_exlib_refs.py` / `python _audit_exlib_ledger.py` 后都会在工作树生成 `__pycache__/_audit_exlib_ledger.cpython-313.pyc`（更早期还有 cpython-314.pyc），但 `.gitignore` 一直没忽略 Python bytecode，导致 `git status --short` 长期 dirty（最近至少 71 轮起每个 commit 之前都看到 `?? __pycache__/`）；属于「工具链 cleanliness」类小改进

**校验**：
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0 与本轮修复前一致 ✅
- `python _audit_exlib_ledger.py` → 0 drift（ch12 仍 informational list-only）✅
- `python -m json.tool books/exercises/ex-lib.json` → JSON OK ✅
- `python -m json.tool manifest.json` → JSON OK ✅
- `node --check app.js` → 无语法错误 ✅
- `rm -rf __pycache__/` 后 `git status --short` → 只有 2 行真实改动（`M .gitignore` + `M _session_todo.md`），无 `?? __pycache__/` 污染 ✅
- 反向验证：临时把 `.gitignore` 里 `__pycache__/` / `*.pyc` 两行删掉，跑 `python _audit_exlib_ledger.py` 一次，工作树立即出现 `?? __pycache__/` dirty → 加回两行 + `rm -rf __pycache__/` 后干净，确认本轮 .gitignore 修改有效 ✅
- `grep -c "（待 commit 后填）" _session_todo.md` → 0（修前为 1）✅
- `grep -c "49b1bc1" _session_todo.md` → 75 轮 ledger 行内回填成功 ✅
- U+FFFD 仍为 1（byte offset 145226 = 「🧠 \uFFFD的心理学」emoji + variation selector 历史遗留，与本轮修复无关，HEAD baseline 也是 1）✅
- CRLF=0 / 末行 LF=True — 一致 ✅

**用户偏好兑现**：
- 100% 在已有文件内做「文本对齐 / 忽略规则补全」，零新增内容、零伪造 id、零 APP_VERSION bump（沿用 v3.22.55/56/57/62/71/72/73/74/75 等小 fix 不 bump 惯例）
- 沿用 71 / 72 / 73 / 74 / 75 轮风格：单次 commit 内含多个独立微改 + 双 .py + .md 记账文件追加
- 零业务代码改动；零 ex-lib id 改动（库内 1336 合法 / 全项目 140 唯一 / 0 broken 不变）
- .gitignore 加 `__pycache__/` / `*.pyc` / `*.pyo` 是「删除/不追踪」类改动，不会移除任何已有 tracked 文件

**commit hash**：（待 commit 后填）

**下轮候选**：
1. **(继承 71 / 72 / 73 / 74 / 75 / 76 轮,优先级低)** ch07-achilles 184 行 / ch06-back 198 行仍是羽毛球康复书最薄两章，可补第 13 周「专项维护期」+ 损伤力学图解说明段；ch07 距「跟腱硬度自测」「跟腱炎分期鉴别」等专业内容尚未覆盖
2. **(继承 72 / 73 / 74 / 76 轮,优先级低)** ch10 §六「与本套体系的衔接」末段 L267 已加 1 句"实操衔接：世界最佳拉伸 [ex:1604] 作为日间过渡动作"——但 9 个章节 bullet 末仍是单链接，可扩展为 6 行表（与 ch09 反向链接表同模式）
3. **(继承 70 / 72 / 73 / 74 / 76 轮,优先级低)** ch01 L214 / ch02-ch07 末 → ch08 §四 锚点链接 — 跨轮保留
4. **(本轮新发现,优先级低)** `ch07-achilles.md` L161「Thompson 试验阳性提示完全断裂」是空泛措辞（无引文出处 + 无敏感性/特异性数字）—— 与 47 轮 ch07 L52 Alfredson 改写模式同型，可单轮修：补一句「Thompson 试验敏感性 ~0.96 / 特异性 ~0.93（PubMed 1a 级证据）」；可远期处理
5. **(继承 72 / 73 / 74 / 76 轮,优先级低)** 用户偏好文本「库内没有 foam roller / 筋膜球专项条目」与库实况不一致（v3.22.17 已入库 ex-5202~ex-5213 共 12 条）—— 跨轮保留；可在下一轮把 USER.md / USER 偏好同步对齐到库实况
6. **(本轮新发现,优先级低)** NSCA ch10 §2.1 拉伸表 L70-L76 共 7 条拉伸,**未列** ex-1339「背阔肌拉伸」(库里确实有 ex-1339 = lat pulldown / 背阔肌下拉,与"背阔肌拉伸"非同义) 和 ex-1403「颈部侧屈拉伸」、ex-1559「髋屈肌拉伸」、ex-1716「胸大肌稳定球拉伸」—— 但 §七 L296-L307 末段清单已补齐 12 条扩展表（含这 4 条）；§2.1 拉伸表本身是「核心 7 条」短表，不动也合理；可远期处理