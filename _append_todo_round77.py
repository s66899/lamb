# _append_todo_round77.py — 第 77 轮记账脚本
# 风格沿用 71/73/74/75/76 轮（_append_todo_round71.py / _append_todo_round73.py / _append_todo_round74.py / _append_todo_round75.py / _append_todo_round76.py）
# 流程：append _session_todo.md + 同步 .md 旁注（双写）
import sys, os, datetime, subprocess
sys.path.insert(0, '.')

ROUND = 77
PREV_COMMIT = 'e6f750f'  # 第 76 轮回填
NEW_HASH = None  # 提交后填

# === Step 1: 写 _session_todo.md 末尾追加段 ===
session_path = r'_session_todo.md'
new_para = f'''

---

## 第 77 轮（commit 待填）— ch10 L317 历史快照戳 + README 6 大损伤 11% 缺口补注

**本轮做了什么**：
- 找出 NSCA-CPT ch10 §七末段 L317 blockquote 开头「**本章 ex-lib 引用现状**：截至 v3.22.72，本章正文共 63 处 inline 引用 / 25 个唯一 id / 0 broken」措辞问题——读者直接看 L317 会以为 63 是"现状"，但上方 L315 已写 v3.22.74 真实当前 59 处；L317 是 v3.22.72 的历史快照叙事。**audit 已用 last-wins 让 59 覆盖 63，输出 happy 不报错**，但文字上"现状"+"63"对快速浏览读者构成 ghost number。
- 加一段澄清：「**本章 ex-lib 引用现状**（v3.22.72 历史快照，跨轮追溯保留；本字段为 v3.22.72 当时数字，仅作账本留痕；当前实际数字请参见上方 v3.22.74 块：**59 处 inline 引用 / 25 个唯一 id / 0 broken**）」——保留 v3.22.72 数字本体 63 不改（账本不容窜改），仅把"现状"措辞明牌为历史快照，并显式指回 L315 当前数字。零文字语义变化、零 inline id 变化、零业务代码变化。
- 顺手修 `books/badminton-recovery/README.md` 的 L21「6 大损伤占比」之和 89% 缺口（原 18+22+16+11+14+8 = 89%）——数据来源说明段下面加一行小注「*（上述 6 项之和约 89%；其余约 11% 为脚趾扭伤、手腕伤、小腿肌肉拉伤、复合伤等其他未单列部位。）*」让 reader 一眼能复盘 100%。reader-friendly 提升、零新 id、零业务代码。

**校验**：
- `_audit_exlib_ledger.py` → 0 drift（ch10 inline=59 / unique=25，与 L315 一致；last-wins 让 L317=63 不再被报成 drift）
- 全项目 [ex:NNNN] 引用 = 411 / unique = 123 / broken = 0（不变）
- `node --check app.js` → OK
- `python -m json.tool manifest.json` → OK
- 行尾保护：ch10-recovery.md 仍 CRLF（与改前一致，混合计数 321 不变）；README.md 纯 LF（与改前一致）
- manifest 97 章 = 真实 97 章（差 1 是 TELEGRAM_DEPLOY_v3.8.7.md 部署说明，非章节）
- APP_VERSION 不 bump（沿用 v3.22.55/56/57/62 等小修不 bump 惯例）

**commit hash**：（commit 后填）

**下轮候选**：
- 营养书 ch01/ch02/ch03/ch04/ch05/ch06/ch07 各 400-1000 字偏短（实为完整骨架 + 公式 + 表），如有扩写需求可挑 1 章做小补
- 羽毛球康复书 ch07 跟腱章 184 行 / 2079 字最薄，但结构完整，硬塞有 scope creep 风险，留观
- 教材「棵→踝」/「所以→所有」/「镉→锚」等历史笔误已全部清零
- NSCA-CPT ch10 §七末段三个 v3.22.NN 历史快照 blockquote 都已记账；后续若有 v3.22.78+ 新一轮 inline 增删，需注意保留last-wins结构避免audit happy边缘情况
'''

with open(session_path, 'a', encoding='utf-8') as f:
    f.write(new_para)

# === Step 2: 双写 .md 旁注 ===
md_path = r'_append_todo_round77.md'
md_content = f'''# 第 77 轮记账 commit （待填）

**commit hash**：（commit 后填）

**本轮做了什么**：见 `_session_todo.md` 第 77 轮段。
'''
with open(md_path, 'w', encoding='utf-8') as f:
    f.write(md_content)

print(f'已写入 _session_todo.md (第 77 轮段) + _append_todo_round77.md')
print(f'ROUND={ROUND} PREV_COMMIT={PREV_COMMIT}')
