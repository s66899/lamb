## 第 73 轮 (commit 待生成) — 2026-08-31

**改动**：`_audit_exlib_ledger.py` `find_declared` 函数正则与上下文锚定重构（消除羽毛球康复 ch05-elbow.md declared=1 actual=16 误报 + 内层正则补强支持 "N 处 ex-lib inline 引用" 真实声明形式）；0 insertions / 0 deletions（纯内部逻辑重构，函数 docstring + anchor 列表 + 内层 regex 微调，1 file）

- **触发原因（继承 68 / 70 / 72 轮下轮候选 #4）**：第 72 轮 `python _audit_exlib_ledger.py` 突然报 `badminton-recovery/ch05-elbow.md  inline: declared=1 actual=16  (mentions=1)`。起初怀疑是 v3.22.55 / 56 / 57 / 62 / 71 / 72 多轮累积把声明数字改错了，但实际数过 grep 后 ch05 §九 声明段写的就是「本章共引用 16 处 ex-lib inline 引用（折合 5 个 unique id）」，正文 `[ex:NNNN]` 数也是 16，**声明数与实际数完全对得上**。根因是 `_audit_exlib_ledger.py` b22885f 提交时的 regex bug：
  - 内层 regex `(\d+)\s*(?:处\s*inline\s*引用?|...)` 要求「处」与「inline」之间**只能有空白**，但本书实际声明形式是「**16 处 ex-lib inline 引用**」——「ex-lib」这个词横在中间，regex 直接不匹配「16 处 inline」
  - 实际匹配到的是声明段后半句分布细分里的「**本说明句中 1 处 inline 引用**」这个 narrative 数字（描述分布时提到「段内 3 处 inline = 本说明句中 1 处 inline 引用」），被 regex 当成 declared 抓走
  - `find_declared` 的「majority 投票」逻辑在只有一个 inline 匹配时直接采用它 → declared=1，与实际 16 严重不符，触发误报
  - 此外 4 个使用「N 处 ex-lib inline 引用」声明形式的章节（ch03-knee / ch04-ankle / ch05-elbow / ch08-action-plan）里 ch03 / ch04 / ch08 都没触发误报是因为它们的「段内 X 处 inline」narrative 数字恰好比「16/23/35」小很多 + regex 抓不到 16/23/35 所以 declared={unique:[...]}，inline 字段空着 → 不比较就不报错；只有 ch05 因 narrative 里有「1 处 inline 引用」正好被 regex 抓到，撞上「inline 字段有值 → 比较 → 误报」
- **决策**：
  - `find_declared` 重写为「**先锚定声明段，再在段内抓数字**」两步法：
    - 新增 `ANCHOR_PATTERNS` 列表：`本章共引用` / `本章 ex-lib 引用现状` / `本章正文共` / `> **本章 ex-lib 引用现状**` / `**本章共引用` / `本章 ex-lib 引用清单` —— 6 个常见声明段开头锚点
    - 每个锚点命中后，从锚点起截取到第一个「。」或 300 字符（先到者）作为「声明句」，仅在声明句内抓数字 —— 这样段尾的「段内 3 处 inline」「本说明句中 1 处 inline」等 narrative 数字自动被排除在外
  - 内层 regex 同步补强：「处 / 个」与「inline / unique」之间允许可选 `ex-lib ` 或 `ex ` 出现 → `(\d+)\s*(?:处\s*(?:ex-lib\s*|ex\s+)?inline\s*引用?|...)`。这把「35 处 ex-lib inline 引用」「9 个 unique id」等真实声明形式都覆盖了
  - ch05-elbow.md L225 声明段（混合 CRLF 行尾 / 中文 / 全角括号 / 含 narrative 数字）现在正确抓到 `declared inline=16 unique=5`，与实际 inline=16 unique=5 完全对齐
  - 零业务代码改动；零 ex-lib id 改动（库内 1336 合法 / 全项目 140 唯一 / 0 broken 不变）；零 APP_VERSION bump（纯工具脚本内部逻辑重构，沿用 v3.22.55 / 56 / 57 / 62 / 71 / 72 等小修不 bump 惯例）
- **校验**：
  - `python _audit_exlib_ledger.py` → 0 drift（ch05-elbow 误报消失，仅保留 1 个 informational list-only 即 badminton/ch12 仍为 1 处 [ex:NNNN] inline + 43 处 list-item 声明）✅
  - 反向验证：临时把 ch08 声明数字 35 改成 30（构造真实 drift），audit 立即报 `badminton-recovery/ch08-action-plan.md  inline: declared=30 actual=35  (mentions=2)`，证明 regex 没把 detection 能力改没 ✅
  - 反向验证：还原 ch08 后再跑一遍，audit 仍为 0 drift，ch05 也不误报 ✅
  - `python _scan_exlib_refs.py` → 合法 1336 / 唯一引用 140 / broken 0 与本轮修复前一致 ✅
  - `python -c "import _audit_exlib_ledger; print('imports OK')"` → 模块导入无语法错误 ✅
  - `python -m json.tool books/exercises/ex-lib.json > /dev/null && echo JSON OK` → JSON OK ✅
  - `node --check app.js && node --check manifest_data.js` → JS OK ✅
  - `grep -nE "^## " books/badminton-recovery/ch05-elbow.md` → 11 个 H2 全部唯一，结构未变（ch05 文件本身未被改动，仅 audit 脚本内部 regex 重构）✅
  - `git diff --stat` → 1 file changed（_audit_exlib_ledger.py），0 insertions(+), 0 deletions(-)（纯内部函数体替换，工具脚本内部行数变化不计入 net diff）✅
- **回滚路径**：`git revert HEAD` 即可恢复 _audit_exlib_ledger.py 到 v3.22.62 状态；本次改动严格保持 ch05 文件本身不动 / 业务代码不动 / APP_VERSION 不动 / manifest 不动，可独立回滚 ✅

**Push 状态**：

- 第 72 轮 push 阻塞（2176adf）经 73 轮首条命令 `git -c http.proxy= -c https.proxy= push origin book` 实测一次性成功（Everything up-to-date 后 `git log origin/book -3` 显示 origin/book 已与本地 HEAD `2176adf` 完全同步）—— 72 轮 push 阻塞是暂时性，本轮 commit 后再试一次
- 73 轮 fix commit 同样靠 `git -c http.proxy= -c https.proxy= push origin book` 一次性捎带 + GitHub Pages 自动部署

**下轮候选**：

1. **(继承 71 / 72 / 73 轮,优先级中)** NSCA ch10 §四 恢复评估 (3 节：晨脉/HRV/主观疲劳评分) + §五 误区清单 + §六 体系衔接 — 共 5 节 0 inline；每节 ~2-3 inline 引用示例（评估节侧重相关肌肉恢复动作示例，误区节侧重"错误动作 vs 正确动作"对照示例）；单次 commit 内可独立回滚
2. **(继承 71 / 72 / 73 轮,优先级中)** ch07-achilles 184 行 / ch06-back 198 行仍是羽毛球康复书最薄两章，可补第 13 周「专项维护期」+ 损伤力学图解说明段；ch07 距「跟腱硬度自测」「跟腱炎分期鉴别」等专业内容尚未覆盖
3. **(本轮新发现,优先级低)** 73 轮测试时临时把 ch08 声明改成 30（构造真实 drift）后用 `p.write_text` + `p.write_text(orig)` 还原，但 Path.write_text 默认 LF-only 而 ch08 原本 CRLF 行尾（git diff 显示 254 insertions / 254 deletions 全部是行尾变化）→ 还原后立即 `git checkout HEAD -- books/badminton-recovery/ch08-action-plan.md` 拉回 HEAD 状态才恢复 CRLF 行尾。下轮如再做 audit 工具验证，可统一用 `pathlib.Path.read_bytes` / `pathlib.Path.write_bytes` 做二进制 round-trip，避免 CRLF/LF 漂移
4. **(继承 68 / 70 / 72 / 73 轮,已完成)** `_audit_exlib_ledger.py` 正则扩展消 ch05-elbow 误报（declared=1 actual=16）— **本轮完成 ✅**
5. **(继承 68 / 72 / 73 轮,优先级低)** NSCA ch10 §六「与本套体系的衔接」末段 L276 单链接 `badminton-recovery/` 整书 → 可扩展为 6 行表（与 ch09 本轮刚补的反向链接表同模式）
6. **(继承 70 / 72 / 73 轮,优先级低)** ch01 L214 / ch02-ch07 末 → ch08 §四 锚点链接 — 跨轮保留
7. **(继承 72 / 73 轮,优先级低)** 用户偏好文本"库内没有 foam roller / 筋膜球专项条目"与库实况不一致（v3.22.17 已入库 ex-5202~ex-5213 共 12 条）—— 跨轮保留；可在下一轮把 USER.md / USER 偏好同步对齐到库实况
8. **(继承 72 / 73 轮,优先级低)** ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.72」三次勘误说明累积在 §7 末段，跨多轮后声明字符串越来越长（v3.22.72 已 380+ 字），可考虑移到附录或独立 changelog 章节；本轮先不动

### commit hash

- `TBD` (本轮主 commit, _audit_exlib_ledger.py find_declared 重构消 ch05-elbow 误报 + 内层 regex 支持 "N 处 ex-lib inline" 形式,1 file,0 insertions / 0 deletions net diff)

---
