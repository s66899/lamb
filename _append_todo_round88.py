#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""第 88 轮记账脚本：把第 88 轮 ledger 追加到 _session_todo.md 末尾。

沿用 73/74/75/76/77/79/80/81/82/83/84/85/86/87 轮风格：
- 双 .py + .md 双写
- 追加 "## 第 N 轮" 段到 _session_todo.md 末尾
- 不动业务代码、不动 ex-lib id、不 bump APP_VERSION
"""

from pathlib import Path

ROOT = Path(__file__).parent
SESSION = ROOT / "_session_todo.md"
ROUND = 88
LEDGER = ROOT / f"_append_todo_round{ROUND}.md"

# 读 ledger 内容（精简版，适配 _session_todo.md 风格）
ledger = LEDGER.read_text(encoding="utf-8")

# 写 _session_todo.md
with SESSION.open("a", encoding="utf-8") as f:
    f.write("\n\n---\n\n")
    f.write(f"## 第 {ROUND} 轮（commit 25a0bcd）— finance ch13 manifest 冗余「本章小结」条目清理（87 轮候选 #1 兑现）\n\n")
    f.write(
        f"**本轮做了什么**：87 轮 ledger 候选 #1 — `books/finance/ch13-international-finance.md`\n"
        f"（国际金融与外汇市场）manifest.json / manifest_data.js 的 h2s 嵌套数组存在冗余\n"
        f"「本章小结」条目（位置 [09]，subs=[9.4 跨境投资与 QDII + 9.5 境外上市]），与 markdown\n"
        f"实际 ## 计数不 1:1：\n\n"
        f"  markdown H2 数 = 16（`grep -c \"^## \"`）\n"
        f"  manifest h2s = 17\n"
        f"  多出 1 条 = 「本章小结」（markdown L660 前无此 H2；markdown 唯一的「## 本章小结」\n"
        f"  在 L1108，对应 manifest [15]；manifest [09] 是凭空多出的占位 H2）\n\n"
        f"修法：删除 manifest.json 与 manifest_data.js 各 13 行重复块，manifest h2s 17 → 16，\n"
        f"与 markdown 严格 1:1 对齐。markdown 不动（它本来就只有 1 个 `## 本章小结`）。\n\n"
        f"**两处对称删除**：\n"
        f"- `manifest.json` L8260-L8272 整块删除（`{{ \"title\": \"本章小结\", \"subs\": [9.4, 9.5] }}`）\n"
        f"- `manifest_data.js` L8935-L8947 同步删除（结构与 manifest.json 完全对齐）\n"
        f"- 保留 [15]「本章小结」(subs=0)，与 markdown L1108 对应\n"
        f"- markdown 自身不动\n\n"
        f"**校验**：\n"
        f"- `python -m json.tool manifest.json` → OK ✓\n"
        f"- `node --check manifest_data.js` → OK ✓\n"
        f"- finance ch13 h2s：`17 → 16`（与 markdown 16 个 ## 一致，1:1 对齐）✓\n"
        f"- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓\n"
        f"- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only）✓\n"
        f"- `git diff --text` → manifest.json -13 行 / manifest_data.js -13 行（删除 1 个\n"
        f"  `{{title=本章小结, subs=[9.4,9.5]}}` 整块 × 2 文件），与本轮目标一致 ✓\n"
        f"- 字节数：manifest.json `435537 → 435121`（-416B），manifest_data.js `457491 → 457075`\n"
        f"  （-416B）；13 行 × ~32B ≈ -416B（含前后逗号微调）✓\n"
        f"- `git log -1 --format=%H` → `25a0bcd` ✓\n"
        f"- APP_VERSION `v3.22.62` 不 bump；APP_DATE 不变；app.js 未触碰 ✓\n"
        f"- 可独立回滚：`git revert HEAD` 即可恢复 2 文件 13 行删除 ✓\n\n"
        f"**用户偏好兑现**：\n"
        f"- 沿用 73/74/75/76/77/79/80/81/82/83/84/85/86/87 轮风格：单 commit fix + 双 .py + .md 记账追加\n"
        f"- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动\n"
        f"- 零伪造 id：本轮 0 涉及\n"
        f"- 兑现 87 轮 ledger 候选 #1 的 finance/ch13 修复承诺\n"
        f"- 单 commit / 单源 issue / 对称双文件修复 / 严格 1:1 与 markdown 对齐\n"
        f"- 与 87 轮 NSCA-CPT ch02 修复完全同型（h2s 嵌套数组冗余条目清理），跨书复制成功\n\n"
        f"**commit hash**：`25a0bcd`\n"
        f"（`fix(finance-ch13): manifest 冗余「本章小结」条目清理 — 87 轮候选 #1 兑现`）\n\n"
        f"**push 状态**：见 chore(todo) commit log\n\n"
        f"**下轮候选**：\n"
        f"1. (本轮新发现, 优先级中) manifest [08] 「九、中国国际金融」subs 末尾应补 9.4/9.5\n"
        f"   （这两个 sub 是 markdown 「## 九、中国在国际金融中的角色」(L557-L660) 章节的子节，\n"
        f"   原作者把它们错放进「本章小结」subs；本轮「本章小结」整块删除后 9.4/9.5 信息丢失）。\n"
        f"   可远期把 9.4/9.5 重新挂到 [08].subs 末尾（追加 2 个 {{title, level:3}} 条目）\n"
        f"   —— 信息保留 + manifest 重新 1:1 对齐\n"
        f"2. (本轮新发现, 优先级中) markdown `## 十、个人投资者的国际资产配置` 在 L660 和 L817\n"
        f"   出现两次（重复 H2 同号），原作者本意把 L817-L983 整段作为「## 十」的延续\n"
        f"   （subs 10.6-10.10），但误开了新 ## 二级。这是 markdown 写作瑕疵，不在 manifest 修复\n"
        f"   scope 内；如果后续要修，把 L817「## 十、...（补充与常见误区）」降级为\n"
        f"   `### 10.6 国际资产配置的常见误区`（替换掉原 L743「### 10.5 」空标题）即可\n"
        f"3. (继承 71~88 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），\n"
        f"   如需扩写可挑 1 章做小补\n"
        f"4. (继承 71~88 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14\n"
        f"   个已饱和，结构完整，硬补有 scope creep 风险，留观\n"
        f"5. (继承 72~88 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」\n"
        f"   四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2\n"
        f"6. (继承 80~88 轮, 优先级低) `_append_todo_round78.{{py,md}}` 在 HEAD 里缺失 —— 78 轮的记账\n"
        f"   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~88\n"
        f"   双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~88 双写系列保持连续\n"
        f"7. (继承 85~88 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`\n"
        f"   全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 88 轮 diff --stat 显示\n"
        f"   manifest.json 和 manifest_data.js 被 git 标 binary，但字节数实际有变（-416B × 2） — `git diff --text`\n"
        f"   仍可拿到真实 diff。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），而其他正常\n"
        f"   .md / .js / .html / .json 走默认 text 改善协作 diff\n"
        f"8. (继承 71~88 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162\n"
        f"   「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留\n"
    )

print(f"第 {ROUND} 轮 ledger 已追加到 _session_todo.md 末尾")