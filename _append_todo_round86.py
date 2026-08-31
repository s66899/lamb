#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 86 轮记账脚本：把第 86 轮 ledger 追加到 _session_todo.md 末尾。

沿用 73/74/75/76/77/79/80/81/82/83/84/85 轮风格：
- 双 .py + .md 双写
- 追加 "## 第 N 轮" 段到 _session_todo.md 末尾
- 不动业务代码、不动 ex-lib id、不 bump APP_VERSION
"""

from pathlib import Path

ROOT = Path(__file__).parent
SESSION = ROOT / "_session_todo.md"
ROUND = 86
LEDGER = ROOT / f"_append_todo_round{ROUND}.md"

# 读 ledger 内容（精简版，适配 _session_todo.md 风格）
ledger = LEDGER.read_text(encoding="utf-8")

# 写 _session_todo.md
with SESSION.open("a", encoding="utf-8") as f:
    f.write("\n\n---\n\n")
    f.write(f"## 第 {ROUND} 轮（commit 20b0b6d）— NSCA-CPT ch02 章末「## 十三」号位空缺修复（81 轮显式承诺兑现）\n\n")
    # 简明摘要
    f.write(
        f"**本轮做了什么**：第 81 轮（commit `4731c27`）修了 ch02 L1096 的 `## 十三、运动损伤的生理学` → `## 十二`，\n"
        f"把上方跳号问题修好，但**未顺移下游**——留下「## 十三」号位空缺，下游原 `## 十四、营养时机` /\n"
        f"`## 十五、本章总结与下章预告` 停留在错位号位。81 轮 ledger 显式记录：「中间「## 十三」号位空缺留作\n"
        f"下轮补节或顺移候选」。本轮兑现该承诺：把下游两节及全部子节 -1 顺移——`## 十四、营养时机` → `## 十三`\n"
        f"+ 5 个子节 14.1-14.5 → 13.1-13.5，`## 十五、本章总结` → `## 十四` + 2 个子节 15.1-15.2 → 14.1-14.2；\n"
        f"让 ch02 一级节号位连续无跳号：一/二/.../十一/十二/十三/十四 + `## 思考题`（无编号单列）= **15 个一级 H2**。\n\n"
        f"**三处对称更新**：\n"
        f"- `books/nsca-cpt/ch02-exercise-physiology.md`：12 处 markdown 标题字改字（实际 9 对 -/+ 行，\n"
        f"  `git diff --stat` 报 `9 insertions(+), 9 deletions(-)`；双字节等价替换，字节数 56577 不变；\n"
        f"  行尾纯 LF 1380 行不变）\n"
        f"- `manifest.json` L8836-L8870：ch02 h2s 嵌套数组 9 处 title 字面量同步\n"
        f"- `manifest_data.js` L9512-L9547：同 9 处 title 字面量同步（结构与 manifest.json 完全对齐）\n\n"
        f"**校验**：\n"
        f"- ch02 markdown：`grep -E \"^## (一|二|...|十五)\"` → 14 个一级 H2 全部连续无跳号 ✓\n"
        f"- ch02 旧值 grep：「十四、营养时机」「十五、本章总结」「14.1-14.5 营养时机相关」「15.1-15.2 本章总结相关」\n"
        f"  → 0 命中（严格中文锚定，过滤掉假阳性）✓\n"
        f"- ch02 新值 grep：「十三、营养时机」「十四、本章总结」「13.1-13.5」「14.1-14.2」\n"
        f"  → 9 命中 ✓\n"
        f"- manifest.json 旧/新 grep → 0 / 9 ✓\n"
        f"- manifest_data.js 旧/新 grep → 0 / 9 ✓\n"
        f"- `python -m json.tool manifest.json` → OK ✓\n"
        f"- `node --check manifest_data.js` → OK ✓\n"
        f"- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only，与改前一致）✓\n"
        f"- ch02 字节数：`56577 → 56577`（双字节等价替换，零字节变化）✓\n"
        f"- ch02 行数：`1380 → 1380` ✓\n"
        f"- ch02 h2s 数组长度：`17 → 17`（L8836-L8870 嵌套结构计数不变）✓\n"
        f"- `git diff --stat` → `3 files changed, 9 insertions(+), 9 deletions(-)` ✓\n"
        f"- `git log -1 --format=%H` → `20b0b6d` ✓\n"
        f"- 可独立回滚：`git revert HEAD` 即可恢复全部 27 处替换 ✓\n"
        f"- 文中硬引用 grep：「第十四节」「第十五节」「第14节」「第15节」「第十四章」「第十五章」→ 0 命中 ✓\n"
        f"  （顺移安全，与 81 轮 ledger 承诺一致）\n\n"
        f"**用户偏好兑现**：\n"
        f"- 沿用 73/74/75/76/77/79/80/81/82/83/84/85 轮风格：单 commit fix + 双 .py + .md 记账追加\n"
        f"- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动\n"
        f"- 零伪造 id：本轮 0 涉及\n"
        f"- 兑现 81 轮 ledger 的「## 十三号位空缺留作下轮补节或顺移候选」显式承诺\n\n"
        f"**commit hash**：`20b0b6d`\n"
        f"（`fix(nsca-ch02): 章末「## 十三」号位空缺修复 — 「## 十四/## 十五」下游顺移至「## 十三/## 十四」(81 轮显式承诺兑现)`）\n\n"
        f"**push 状态**：✅ 成功！`c7f1135..20b0b6d book -> book`（⚠ 2 次 \"Failed to connect to github.com\n"
        f"port 443 via 127.0.0.1 after 21106~21116 ms\"，30 秒 + 60 秒 sleep 后 `git -c http.proxy= -c https.proxy=\n"
        f"push origin book` → exit 0），GitHub Pages 自动部署中\n\n"
        f"**下轮候选**：\n"
        f"1. (本轮新发现, 优先级中) NSCA-CPT ch02 h2s 嵌套数组尾部 `[15] 思考题` 与 `[16] 思考题` 重复两次（已存在\n"
        f"   问题，与本轮无关；manifest.json L8888-8894 附近），可远期清理（合并或删除一个空 stub）\n"
        f"2. (继承 71~86 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），\n"
        f"   如需扩写可挑 1 章做小补\n"
        f"3. (继承 71~86 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14\n"
        f"   个已饱和，结构完整，硬补有 scope creep 风险，留观\n"
        f"4. (继承 72~85 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」\n"
        f"   四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2\n"
        f"5. (继承 80~86 轮, 优先级低) `_append_todo_round78.{{py,md}}` 在 HEAD 里缺失 —— 78 轮的记账\n"
        f"   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79/80/81/82/83/84/85/86 双写惯例\n"
        f"   的两个文件。可远期补一份让 round68/71/73/74/75/76/77/79/80/81/82/83/84/85/86 双写系列保持连续\n"
        f"6. (继承 85 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`\n"
        f"   全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 diff --stat 显示\n"
        f"   `manifest.json` 和 `manifest_data.js` 被 git 标 binary，但字节数不变 — `git diff --text` 仍可拿到\n"
        f"   真实 diff。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），而其他正常\n"
        f"   .md / .js / .html / .json 走默认 text 改善协作 diff\n"
        f"7. (继承 71~86 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162\n"
        f"   「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留\n"
    )

print(f"第 {ROUND} 轮 ledger 已追加到 _session_todo.md 末尾")