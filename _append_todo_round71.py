#!/usr/bin/env python3
# _append_todo_round71.py — 2026-08-31
import io, os

SESSION = r"D:\lamb\projects\qingyu\_session_todo.md"
APPEND = r"D:\lamb\projects\qingyu\_append_todo_round71.md"

new_block = """## 第 71 轮 (commit ce714b0) — 2026-08-31

**改动**：`books/nsca-cpt/ch10-recovery.md` §3.1「每日恢复投入时间」拉伸 / 泡沫轴两行各加 2 个常见动作的 inline 引用示例（股四头肌 [ex:1713] 俯卧股四拉伸 + 小腿 [ex:1377] 靠墙小腿拉伸 + 股四头肌 [ex:5202] foam roller quadriceps + 腘绳肌 [ex:5203] foam roller hamstrings）；§7 末段「本章 ex-lib 引用现状」声明数字从 v3.22.62 的 33 → 41 inline 同步累加（unique 25 / broken 0 不变）（3 insertions / 3 deletions, 1 file）

- **触发原因（真实可用性问题）**：用户偏好「按库里实际存在的拉伸动作引用，不要伪造 id」+ 风格偏好「普通人版 / 专业版双层结构」已严格遵守。但 NSCA ch10 §3.1「每日恢复投入时间」段（4 行：睡眠 / 拉伸 / 泡沫轴 / 营养）在 v3.22.16 / v3.22.17 / v3.22.57 / v3.22.62 多次修订中只更新了表格，**正文条目始终为纯文字描述**（"拉伸：15-20 分钟" / "泡沫轴：10-15 分钟"），读者读到这里想看示范动作**无法一键跳转 ex-lib 演示**——这是真实可用性 gap：库内已有 1713 / 1377 / 5202 / 5203 等最常用动作条目，但 §3.1 这段只字未引。NSCA ch10 §3.2 / §3.3 / §四 / §五 / §六 同样零 inline（13 节内容），本轮先补 §3.1（4 周快速重启方案的日常核心操作），其余节跨轮保留
- **决策**：
  - 在原 4 行不动（睡眠 / 拉伸 / 泡沫轴 / 营养）的前提下，**只对"拉伸"和"泡沫轴"两行追加例：引用**——"营养"行不动因库内无营养类动作条目，"睡眠"行不动因不属 ex-lib 范畴
  - 4 个 inline id 选择依据：股四头肌 + 小腿（人体最常用两大拉伸部位）+ 股四头肌 + 腘绳肌（SMR 最常用两部位），全部为 v3.22.17 / v3.22.62 早已入库的合法条目（1336 个合法 / 0 broken 不变）
  - 行尾加"（更多部位见 §2.1 SMR 引用表）"明确告诉读者完整列表在 §2.1 —— 与原 §2.1 SMR 引用表 12 条 (ex-5202~ex-5213) 形成交叉引用闭环
  - §7 末段「本章 ex-lib 引用现状」声明数字同步更新：v3.22.62 时 33 inline / 25 unique / 0 broken → v3.22.71 时 **41 inline / 25 unique / 0 broken**；§7 末段 v3.22.71 现状说明字符串本身也列出 4 个新 id (1713/1377/5202/5203) 触发 +4 inline，故总 inline 数 = 原 33 + §3.1 新增 4 + §7 末段字符串 4 = **41**
  - H2/H3 顺序不动；§2.1 本节 ex-lib 引用表 7 行不动；§2.1 SMR 引用表 12 行不动；§7 总清单 13 行不动；零 ex-lib id 新增（4 个全部库内已有）；零业务代码改动；零 APP_VERSION bump（沿用 v3.22.55 / 56 / 57 等小 fix 不 bump 惯例）
- **校验**：
  - `python _scan_exlib_refs.py` → 合法 1336 / 唯一引用 140 / broken 0 与本轮修复前一致 ✅
  - `python -c "..."` 精确数 ch10 内 inline=41 / unique=25，声明数 41 ✅，声明 unique 25 ✅
  - `grep -nE "ex:1713\|ex:1377\|ex:5202\|ex:5203" books/nsca-cpt/ch10-recovery.md` → 4 个新 id 全部入库，`git diff --stat` 确认本次 commit 含 4 处 ✅
  - `node --check app.js && node --check manifest_data.js` → JS OK ✅
  - `python -c "import json; json.load(open('books/exercises/ex-lib.json',encoding='utf-8'))"` → JSON OK ✅
  - `grep -nE "^## " books/nsca-cpt/ch10-recovery.md` → 7 个 H2 全部唯一，结构未变 ✅
  - `git diff --stat` → 1 file changed, 3 insertions(+), 3 deletions(-) ✅
  - §2.1 本节 ex-lib 引用表 7 行 + §2.1 SMR 引用表 12 行 + §7 总清单 13 行 = 32 行表，0 行被改动 ✅
- **回滚路径**：`git revert ce714b0` 即可恢复 ch10 §3.1 与 §7 末段到 v3.22.62 状态；本次改动严格保持表结构 / 章节结构 / APP_VERSION 不动，可独立回滚 ✅

**Push 状态**：

- ✅ **本轮 push 成功**：commit `ce714b0` 在代理 `http://127.0.0.1:7890` 连不上的情况下，绕过代理 `git -c http.proxy= -c https.proxy= push origin book` 一次性推送成功（输出：`To https://github.com/s66899/lamb.git / 860fb83..ce714b0  book -> book`），第 64 / 65 / 66 / 67 / 68 / 69 / 70 轮累计 13 个本地 commit（d67b8cc..a3f5c3d 共 13 个）在 push 前已被自动捎带——本地与远程已重新对齐 ✅
- GitHub Pages 自动部署预计 1-3 分钟生效，部署地址 https://s66899.github.io/lamb/

**下轮候选**：

1. **(继承 70 轮)** NSCA ch10 §3.2 8 周方案 + §3.3 12 周方案 + §四 恢复评估 + §五 误区清单 + §六 体系衔接 —— 共 5 节 0 inline，本轮先补了 §3.1，剩余 5 节跨轮分批补（每节 ~3-4 inline 引用示例）；单次 commit 内可独立回滚
2. **(本轮新发现,优先级低)** ch07-achilles 184 行 / ch06-back 198 行仍是羽毛球康复书最薄两章，可补第 13 周「专项维护期」+ 损伤力学图解说明段；ch07 距「跟腱硬度自测」「跟腱炎分期鉴别」等专业内容尚未覆盖
3. **(继承 68 / 70 轮)** `_audit_exlib_ledger.py` 正则扩展消 ch05-elbow 误报（declared=1 actual=16）：ch05 第 225 行声明段里"段内 3 处 inline"+"本说明句中 1 处 inline 引用"两个 keyword 都被 regex 抓到但 audit majority 错误地选了 "1"；修 regex 让其跳过声明段里的"段内 X 处 inline"措辞，仅匹配"本章共引用 X 处 ex-lib inline 引用"格式
4. **(继承 68 轮,优先级低)** NSCA ch10 §六「与本套体系的衔接」末段 L276 单链接 `badminton-recovery/` 整书 → 可扩展为 6 行表（与 ch09 本轮刚补的反向链接表同模式）
5. **(继承 68 轮,优先级低)** `books/exercises/ex-lib.json` 腰部 lumbar foam roller 专项（用户偏好明确：不假造 id，跨轮保留）
6. **(继承 70 轮,优先级低)** ch01 L214 / ch02-ch07 末 → ch08 §四 锚点链接 — 跨轮保留
7. **(本轮新发现,优先级低)** 用户偏好文本"库内没有 foam roller / 筋膜球专项条目"与库实况不一致（v3.22.17 已入库 ex-5202~ex-5213 共 12 条）—— 跨轮保留；可在下一轮把 USER.md / USER 偏好同步对齐到库实况

### commit hash

- `ce714b0` (本轮主 commit, nsca-ch10 §3.1 加 4 个 inline 引用 + §7 末段声明 33→41 同步,已 push)
"""

os.makedirs(os.path.dirname(APPEND), exist_ok=True)
with io.open(APPEND, "w", encoding="utf-8", newline="\n") as f:
    f.write(new_block)

with io.open(SESSION, "a", encoding="utf-8", newline="\n") as f:
    f.write("\n" + new_block)

print("appended", APPEND)