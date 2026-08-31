LEDGER = r"""# 第 93 轮记账

**commit hash**：`5a6ad58`
（`fix(nsca-ch02): manifest 重复 十三、 h2 改 十二、 + subs 13.x→12.x — 与 markdown 1:1 对齐（92 轮候选 #2 兑现）`）

**push 状态**：✅ 第 1 次即成功（`39bdee7..5a6ad58`，github.com:443 无重试）✓

---

**本轮做了什么**：兑现 92 轮 ledger "下轮候选 #2" — NSCA-CPT ch02 manifest 与 markdown
数字编号漂移 bug，与 92 轮 finance-ch13 ## 十、 重复同型（manifest h2s 与 markdown 1:1
漂移）。本轮 NSCA-ch02 是 92 轮 NSCA-ch02 候选 #2 的兄弟篇，目标一致：让 manifest 严格
对齐 markdown，消除 sidebar/TOC 错位。

**bug 复盘**：
- markdown L1096 `## 十二、运动损伤的生理学——理解身体的"求救信号"`，subs 12.1~12.4
- markdown L1177 `## 十三、营养时机的生理学——什么时候吃什么`，subs 13.1~13.5
- manifest 错位（修复前）：h2[12] = `十三、运动损伤的生理学...` + subs `13.1~13.4`，
  h2[13] = `十三、营养时机的生理学...` + subs `13.1~13.5`
- 后果：sidebar/TOC 出现两个 `十三、...` 节点，且 `十二、` 整段缺失，
  破坏 1:1 对齐与 12.1~12.4 subs 路径寻址。

**修复落地**：
- `manifest.json` L8805 h2[12] title：`十三、运动损伤的生理学...` → `十二、运动损伤的生理学...`
- `manifest.json` L8808/8812/8816/8820 四个 sub title：`13.1/13.2/13.3/13.4` → `12.1/12.2/12.3/12.4`
- `manifest_data.js` L9481 / L9484/9488/9492/9496 对称修改（5 处 string 替换）
- markdown **完全未动**（本来就是 ground truth）

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- NSCA-CPT ch02 manifest 现状（h2 总数 16，与 markdown 一致）：
  - [11] `十一、常见生理学误区辨析` (8 subs: 误区 1~8)
  - [12] `十二、运动损伤的生理学...` (4 subs: 12.1~12.4) ← 本轮修复
  - [13] `十三、营养时机的生理学...` (5 subs: 13.1~13.5) ✓ 原状已对齐
  - [14] `十四、本章总结与下章预告` (2 subs: 14.1~14.2)
  - [15] `思考题`
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（仅羽毛球 ch12 1 处 informational list-only）✓
- `git diff --text manifest.json manifest_data.js` → 2 files × 5 string replace × 5 行 each
  = 净 10 行替换（5 删除 + 5 插入），字节数完全相等（中文同宽度），
  故 `git diff --stat` 显示 `0 insertions(+), 0 deletions(-)` 但 binary delta 真实存在
  （`.gitattributes` `* -text -merge` 把 .json/.js 标 bin）。`--text` 后可读 diff：
  - manifest.json -8805: 十三→十二、运动损伤的生理学
  - manifest.json -8808/8812/8816/8820: 13.1/13.2/13.3/13.4 → 12.1~12.4
  - manifest_data.js -9481/9484/9488/9492/9496 同样 5 处
- markdown 行数 / 字符 / CRLF 全部不变 ✓
- APP_VERSION `v3.22.62` 不 bump；app.js 未触碰；其他章节 h2 count 不变 ✓
- 可独立回滚：`git revert 5a6ad58` 即可恢复重复 `十三、` 状态 ✓

**用户偏好兑现**：
- 沿用 92 轮风格：单 commit fix + 双文件对称（manifest.json + manifest_data.js）+ 0 markdown 改动
- 兑现 92 轮 ledger "下轮候选 #2" 中提到的 NSCA-CPT ch02 manifest h2 漂移问题
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅 h2 title 字符级修复，0 涉 ex-lib）
- 单 commit / 单源 issue / 对称两文件修复 / 严格 1:1 与 markdown 对齐
- 与 92 轮 finance-ch13 ## 十、 修复 + 86~91 轮 NSCA-CPT ch02 / finance-ch13 修复同型
  （manifest h2s 与 markdown 1:1 对齐），跨书跨轮复制成功

---

**下轮候选**（继承 92 轮 + 本轮新发现，优先级降序）：
1. **(继承 92 轮 #3, 优先级中)** badminton ch13 markdown 数字编号乱序 ——
   L754 `## 十二、双打比赛的体能要求` + L808 `## 十二、双打比赛的体能储备与伤病预防`
   （DUPLICATE 十二）+ L857 `## 十五、` (跳号) + L991 `## 十三、` (回退)
   + L1082 `## 十四、`. manifest 镜像混乱。scope 比 NSCA ch02 修复大（涉及 markdown
   重新编号 + 内容块定位），但仍是同型 bug。建议下一轮：先 grep 一遍 markdown 与
   manifest 当前所有 h2 标题，对齐成一张 diff 表，然后只改 manifest（不动 markdown）
   或者只改 markdown（保持原 numbered list 风格）。单 commit 可独立回滚。
2. **(继承 92 轮 #4, 优先级中)** psychology ch12 markdown 数字编号乱序 + 空 `## ` 行 ——
   L525 `## 十一、积极心理学的应用与日常练习` + L895 `## `（空标题）+ L952 `## 十、积极心理学的争议`
   （十 出现在 十一 之后）+ L988 `## 十一、积极心理学的日常实践指南`（DUPLICATE 十一）。
   manifest 镜像混乱。建议下一轮：先 grep 比对 markdown 与 manifest 的 h2 list，
   做最小补丁把 manifest 与 markdown 对齐。
3. **(继承 92 轮 #5, 优先级低)** engineering-mechanics ch12 markdown L585 `## 十一、` 跳号
   + L1013 `## ʮ`（乱码字符空标题）+ L1067/L1135 重复 `## 十一/十二、`. manifest 镜像混乱。
   可远期处理。
4. **(继承 91 轮 #1, 优先级低)** finance ch13 「**参考文献：** + **致谢：**」加粗段在
   L725 / L740 错放在 canonical `## 十、` 作用域内（位于 10.4 内容之后、### 10.5 之前），
   按惯例应挪到 chapter-end（## 本章小结 之后）。单 markdown 改动 + manifest 可能需同步。
5. **(继承 91 轮 #6, 优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架
   + 公式 + 表），如需扩写可挑 1 章做小补。
6. **(继承 91 轮 #7, 优先级低)** 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处
   / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观。
7. **(继承 91 轮 #8, 优先级低)** NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72
   / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2。
8. **(继承 91 轮 #9, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮
   的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~93 轮
   双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~93 双写系列保持连续。
9. **(继承 91 轮 #10, 优先级低)** `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`
   全文件禁用 diff 配置，本轮 93 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被
   git 标 binary，但 `git diff --text` 仍能拿到 10 行真实差异。可远期改成只屏蔽真正需要
   `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json 走默认
   text 改善协作 diff。

---

**本轮 commit hash**：`5a6ad58`

**本轮 push**：✅ 1 次成功（`39bdee7..5a6ad58` book → book，github.com:443 无失败）
"""

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(LEDGER)
