#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 87 轮记账脚本：把第 87 轮 ledger 追加到 _session_todo.md 末尾。

沿用 73/74/75/76/77/79/80/81/82/83/84/85/86 轮风格：
- 双 .py + .md 双写
- 追加 "## 第 N 轮" 段到 _session_todo.md 末尾
- 不动业务代码、不动 ex-lib id、不 bump APP_VERSION
"""

from pathlib import Path

ROOT = Path(__file__).parent
SESSION = ROOT / "_session_todo.md"
ROUND = 87
LEDGER = ROOT / f"_append_todo_round{ROUND}.md"

# 读 ledger 内容（精简版，适配 _session_todo.md 风格）
ledger = LEDGER.read_text(encoding="utf-8")

# 写 _session_todo.md
with SESSION.open("a", encoding="utf-8") as f:
    f.write("\n\n---\n\n")
    f.write(f"## 第 {ROUND} 轮（commit 6669b60）— NSCA-CPT ch02 h2s 嵌套数组「思考题」重复条目清理（86 轮候选 #1 兑现）\n\n")
    f.write(
        f"**本轮做了什么**：第 86 轮 ledger 候选 #1 — NSCA-CPT ch02 manifest.json h2s 嵌套数组尾部\n"
        f"存在「思考题」重复条目（[16] 思考题 + [17] 思考题，subs 都为空 stub）。markdown\n"
        f"`books/nsca-cpt/ch02-exercise-physiology.md` L1339 实际只有 1 个 `## 思考题`，所以\n"
        f"manifest 比 markdown 多 1 个条目，渲染到 ch02 大纲时会重复显示「思考题」一次。\n"
        f"本轮把多余重复条目删掉，让 manifest 与 markdown 严格 1:1 对齐（15 个编号 H2 +\n"
        f"1 个 `## 思考题` = 16 个 manifest 条目）。\n\n"
        f"**两处对称删除**：\n"
        f"- `manifest.json` L8872-L8880 重复块 4 行删除（`{{ \"title\": \"思考题\", \"subs\": [] }}` 第二次出现）\n"
        f"- `manifest_data.js` L9548-L9556 同步删除（结构与 manifest.json 完全对齐）\n"
        f"- 保留第一个「思考题」（与 markdown L1339 对应），删第二个空 stub\n"
        f"- markdown 自身不动（它本来就只有 1 个 `## 思考题`）\n\n"
        f"**校验**：\n"
        f"- `python -m json.tool manifest.json` → OK ✓\n"
        f"- `node --check manifest_data.js` → OK ✓\n"
        f"- NSCA-CPT ch02 h2s 数组长度：`17 → 16`（与 markdown 16 个 H2 一致，1:1 对齐）✓\n"
        f"- `grep -c \"思考题\" manifest.json`：`5 → 4`（净减 1）✓\n"
        f"- `grep -c \"思考题\" manifest_data.js`：`5 → 4`（净减 1）✓\n"
        f"- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓\n"
        f"- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only，与改前一致）✓\n"
        f"- `git diff --stat` → `2 files changed, 0 insertions(+), 0 deletions(-)`（`.gitattributes` L5 全文件\n"
        f"  禁用 diff 配置导致 git 标 binary；`git diff --text` 拿到 -8 真实修改：-4 行 × 2 文件）✓\n"
        f"- `git diff --text` → manifest.json -4 行 / manifest_data.js -4 行（删除 1 个重复\n"
        f"  `{{\"title\":\"思考题\",\"subs\":[]}}` 整块 × 2 文件），与本轮目标一致 ✓\n"
        f"- 字节数：manifest.json `435631 → 435537`（-94B），manifest_data.js `457585 → 457491`（-94B）\n"
        f"  ；4 行 × 23B ≈ -92B ≈ -94B（含前后逗号微调）✓\n"
        f"- `git log -1 --format=%H` → `6669b60` ✓\n"
        f"- 可独立回滚：`git revert HEAD` 即可恢复 2 个文件 4 行删除 ✓\n\n"
        f"**用户偏好兑现**：\n"
        f"- 沿用 73/74/75/76/77/79/80/81/82/83/84/85/86 轮风格：单 commit fix + 双 .py + .md 记账追加\n"
        f"- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动\n"
        f"- 零伪造 id：本轮 0 涉及\n"
        f"- 兑现 86 轮 ledger 候选 #1 的「可远期清理（合并或删除一个空 stub）」承诺\n"
        f"- 单 commit / 单源 issue / 对称双文件修复 / 严格 1:1 与 markdown 对齐\n\n"
        f"**commit hash**：`6669b60`\n"
        f"（`fix(nsca-ch02): h2s 嵌套数组重复「思考题」条目清理 — 86 轮 ledger 候选 #1 兑现`）\n\n"
        f"**push 状态**：✅ 成功！`15b9e85..6669b60 book -> book`（⚠ 5 次 github.com 443 连接失败：\n"
        f"首次 2088ms / 后 21068ms / 21128ms / 21178ms / Recv failure / 21117ms；累计 sleep\n"
        f"30 + 60 + 90 + 90 + 180 = 8 分 30 秒；最终 `git -c http.proxy= -c https.proxy= push origin book`\n"
        f"→ exit 0），GitHub Pages 自动部署中\n\n"
        f"**下轮候选**：\n"
        f"1. (本轮新发现, 优先级中) `finance/ch13-international-finance.md` h2s 嵌套数组存在重复\n"
        f"   「理财小组」条目（与 87 轮 ch02 修复同型 — manifest 与 markdown 不对齐），后续可对称清理\n"
        f"   （需要先 grep markdown 确认几处 + 找合法保留位置）\n"
        f"2. (继承 71~87 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），\n"
        f"   如需扩写可挑 1 章做小补\n"
        f"3. (继承 71~87 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14\n"
        f"   个已饱和，结构完整，硬补有 scope creep 风险，留观\n"
        f"4. (继承 72~87 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」\n"
        f"   四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2\n"
        f"5. (继承 80~87 轮, 优先级低) `_append_todo_round78.{{py,md}}` 在 HEAD 里缺失 —— 78 轮的记账\n"
        f"   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79/80/81/82/83/84/85/86/87\n"
        f"   双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~87 双写系列保持连续\n"
        f"6. (继承 85~87 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`\n"
        f"   全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 87 轮 diff --stat 显示\n"
        f"   manifest.json 和 manifest_data.js 被 git 标 binary，但字节数实际有变（-94B × 2） — `git diff --text`\n"
        f"   仍可拿到真实 diff。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），而其他正常\n"
        f"   .md / .js / .html / .json 走默认 text 改善协作 diff\n"
        f"7. (继承 71~87 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162\n"
        f"   「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留\n"
    )

print(f"第 {ROUND} 轮 ledger 已追加到 _session_todo.md 末尾")
