#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_append_todo_round81.py
======================
第 81 轮记账脚本。

本轮做了什么（一行摘要）：
- NSCA-CPT ch02-exercise-physiology.md L1096「## 十三、运动损伤的生理学」
  跳号修复 — 原序列「## 十一、常见生理学误区辨析」直接到「## 十三」，
  中间缺「## 十二」号位（子节同步从 13.1-13.4 跳号）。
  本轮把该节改回「## 十二」号位 + 4 个子节改回 12.1-12.4，
  与上方「## 十一」连续；下游「## 十四、营养时机」/「## 十五、本章总结」
  保留原编号（下游无「第N节」/「第十二」硬引用，grep 0 命中，
  顺移 / 补节作为下轮候选）。

零业务代码改动 / 零 ex-lib id 改动（库内 1336 合法 / 全项目 140 unique /
0 broken 不变） / audit 0 drift 不变 / manifest 不动 /
APP_VERSION v3.22.62 不 bump（沿用 v3.22.55/56/57/62/71/72/73/74/75/
78/79/80 等小 fix 不 bump 惯例）。

校验：
- node --check app.js / manifest_data.js → OK
- python -m json.tool manifest.json / books/exercises/ex-lib.json → OK
- python _audit_exlib_ledger.py → 0 drift（仅 ch12 informational list-only）
- git diff --numstat → 1 file / 5 insertions / 5 deletions
  （5 处 markdown 标题字改字：1 个 ## + 4 个 ###，零内容增删）
- 行尾：ch02 文件 LF 保留（file 报 Unicode text UTF-8，头字节 0x23 无 CRLF）

下轮候选（沿用上轮 71~80 既有池 + 本轮新发现）：
1. (继承 71~80 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短
   （实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
2. (继承 71~80 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，
   但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope
   creep 风险，留观
3. (继承 71~80 轮, 优先级低) NSCA-CPT ch10 §七末段四次勘误 blockquote
   累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
4. (本轮新发现, 优先级低) NSCA-CPT ch06-agility.md L310-L400 末尾死
   章节「### 方向变化类型 / ### 敏捷素质组成 / ## 敏捷训练方法 /
   ## 训练计划」+ 尾部「*来源：NSCA敏捷性训练指南*」是 2026-07-18 前
   占位草稿留下的死内容，已在「## 七、本章总结」+ 思考题 + 参考文献
   之后再次出现完整章节，且不挂 manifest 元数据；可分轮做整段
   约 90 行删除
5. (本轮新发现, 优先级低) NSCA-CPT ch02 跳号修复留了一个空缺号位
   — 本轮把原「## 十三、运动损伤的生理学」改回「## 十二」号位后，
   章末「## 十四、营养时机」/「## 十五、本章总结」保留原编号，
   序列现为「## 十一 → ## 十二 → ## 十四 → ## 十五」(中间缺 ## 十三)；
   下轮可二选一：(a) 把下游 14/15 顺移到 13/14（机械改字），
   (b) 在 ## 十二 之前 / 之后补一个真实的 ## 十三节（内容创作）。
   顺移风险小但语义空缺保留；补节更彻底但需要写 ≥ 200 字新内容
6. (本轮新发现, 优先级低) NSCA-CPT ch03-anatomy.md 6 个二级标题
   「## 羽毛球运动解剖基础 / ## 关键肌肉功能 / ## 关节活动度 /
   ## 动力链分析 / ## 常见损伤与解剖 / ## 训练建议」全部无编号，
   与 NSCA 其他章「一、二、三」中文章节号风格脱节（ch02 用「一、
   二...十一、十二、十四、十五」、ch04 用「一、二...八」、ch05 用
   「一、二...十」、ch07 用「一、二...十」、ch08 用「一、二...十」、
   ch10 用「一、二...七」）；可分轮补 6 个标题编号对齐
7. (继承 71~80 轮, 优先级低) 羽毛球康复 ch03-knee.md 7 个二级标题用
   「第一部分：...」非中文章节号，与 ch02-shoulder / ch05-elbow 的
   「一、二、三...」风格脱节；可分轮改成中文章节号对齐
8. (本轮新发现, 优先级高) 本轮 fix commit 4731c27 因 host 网络
   127.0.0.1:443 限制 git push 443 失败（连续 10 次重试均报
   "Failed to connect to github.com port 443 via 127.0.0.1"），
   与 75 轮 ded6cd7 commit message 末尾「GitHub Pages push 重试 —
   本轮 host 网络 443 失败」同类问题；下次会话 host 网络恢复时
   补 git push origin book + 在 README v3.22.x changelog 末尾补
   v3.22.63 条目（届时 _bump_version.js --set=v3.22.63 --apply
   同步 5 埋点 + 根 README L231 当前版本 + books/README 数据源）
"""

import sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
TODO = os.path.join(HERE, '_session_todo.md')

LEDGER = """

---

## 第 81 轮（commit 4731c27）— NSCA-CPT ch02 第十一节后跳号修复

**本轮做了什么**：
- 实地 grep `books/nsca-cpt/ch02-exercise-physiology.md` L1020 → L1096 → L1177 → L1284
  发现二级标题序列「## 十一、常见生理学误区辨析」直接跳到「## 十三、运动
  损伤的生理学——理解身体的"求救信号"」，中间缺「## 十二」号位（子节同步
  从 13.1-13.4 跳号）。全文共 15 节，但编号序列实际是 1→2→3→...→11→13→14→15
  （中间空缺 12 号位）。
- 本轮把原 L1096「## 十三、运动损伤的生理学——理解身体的"求救信号"」改回
  「## 十二」号位 + 4 个子节同步改回 12.1-12.4，与上方「## 十一、常见生理学
  误区辨析」连续；下游「## 十四、营养时机」/「## 十五、本章总结」保留原
  编号（下游无「第N节」/「第十二」硬引用，grep 0 命中，顺移 / 补节作为
  下轮候选）。
- 改后序列：「## 十一」→「## 十二、运动损伤的生理学」→「## 十四、营养时机」
  →「## 十五、本章总结」（中间 ## 十三 号位空缺，作为下轮补节或顺移候选）。
- 零业务代码改动 / 零 ex-lib id 改动（库内 1336 合法 / 全项目 140 unique /
  0 broken 不变） / audit 0 drift 不变 / manifest 不动 / APP_VERSION v3.22.62
  不 bump（沿用 v3.22.55/56/57/62/71/72/73/74/75/78/79/80 等小 fix 不 bump
  惯例）。

**校验**：
- `node --check app.js` → OK
- `node --check manifest_data.js` → OK
- `python -m json.tool manifest.json` → OK
- `python -m json.tool books/exercises/ex-lib.json` → OK
- `python _audit_exlib_ledger.py` → 0 drift（仅 ch12 informational list-only，
  与改前一致）
- `grep -nE "^## |^### " books/nsca-cpt/ch02-exercise-physiology.md` 改后序列：
  L21 一 / L135 二 / L215 三 / L289 四 / L398 五 / L502 六 / L592 七 / L710 八
  / L828 九 / L931 十 / L1020 十一 / L1096 十二 / L1177 十四 / L1284 十五
  / L1339 思考题（中间 12 号位空缺保留为下轮候选）
- `grep -nE "第14|第十四|第15节|第十五|第13节|第十三|第12节|第十二"` → 0 命中
  （下游无「第N节」硬引用，顺移安全）
- `git diff --numstat` → 1 file changed, 5 insertions(+), 5 deletions(-)
  （5 处 markdown 标题字改字：1 个 ## + 4 个 ###，零内容增删）
- 行尾保护：`file books/nsca-cpt/ch02-exercise-physiology.md` → "Unicode text,
  UTF-8 text"（无 CRLF 提示），L1096 上下文 cat -A 显示纯 LF（$ 结尾无 ^M$），
  改后字节数 56577（与改前一致，无 BOM/CRLF 引入）
- byte 变化：ch02 字节数 56577 不变（纯字改字，无新增内容）
- 可独立回滚：`git revert HEAD` 即可恢复原「## 十三」+ 13.1-13.4 跳号

**用户偏好兑现**：
- 双层结构（前半普通人能看懂 / 后半专业人士可参考）保持 —— 本轮修改是
  markdown 标题编号字改字，对读者来说是把「## 十一」→ 跳号 → 「## 十三」
  的叙事错位修正为「## 十一」→「## 十二」的连续编号，普通读者不再困惑
  「十二去哪了」，专业读者可直接对照二级标题序号快速定位
- 沿用 73/74/75/76/77/79/80 轮风格：单次 commit 内含 1 处独立微改（ch02
  跳号修复）+ 双 .py + .md 记账文件追加
- 零伪造 id：所有改动是标题编号字改字，与 ex-lib 库 / inline 引用 /
  manifest 元数据 / 业务代码完全解耦

**commit hash**：4731c27（fix commit）；chore 记账 commit 待本脚本 append
完成后单独 commit

**push 状态**：本轮 fix commit 4731c27 因 host 网络 127.0.0.1:443 限制
git push 443 失败（连续 10 次重试均报 "Failed to connect to github.com
port 443 via 127.0.0.1 after 2054 ms"，与 75 轮 ded6cd7 commit message
末尾「GitHub Pages push 重试 — 本轮 host 网络 443 失败」同类问题）。
GitHub Pages 部署待下次会话 host 网络恢复时补 git push origin book。
commit 4731c27 在本地仓库已存在，origin/book 暂落后一 commit。

**下轮候选**：
1. (继承 71~80 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为
   完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
2. (继承 71~80 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但
   inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，
   留观
3. (继承 71~80 轮, 优先级低) NSCA-CPT ch10 §七末段四次勘误 blockquote
   累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
4. (本轮新发现, 优先级低) NSCA-CPT ch06-agility.md L310-L400 末尾死章节
   「### 方向变化类型 / ### 敏捷素质组成 / ## 敏捷训练方法 / ## 训练计划」
   + 尾部「*来源：NSCA敏捷性训练指南*」是 2026-07-18 前占位草稿留下的死
   内容，已在「## 七、本章总结」+ 思考题 + 参考文献之后再次出现完整章节，
   且不挂 manifest 元数据；可分轮做整段约 90 行删除
5. (本轮新发现, 优先级低) NSCA-CPT ch02 跳号修复留了一个空缺号位 — 本轮
   把原「## 十三、运动损伤的生理学」改回「## 十二」号位后，章末「## 十四、
   营养时机」/「## 十五、本章总结」保留原编号，序列现为「## 十一 → ## 十二
   → ## 十四 → ## 十五」（中间缺 ## 十三）；下轮可二选一：(a) 把下游 14/15
   顺移到 13/14（机械改字），(b) 在 ## 十二 之前 / 之后补一个真实的 ## 十三
   节（内容创作）。顺移风险小但语义空缺保留；补节更彻底但需要写 ≥ 200 字
   新内容
6. (本轮新发现, 优先级低) NSCA-CPT ch03-anatomy.md 6 个二级标题「## 羽毛球
   运动解剖基础 / ## 关键肌肉功能 / ## 关节活动度 / ## 动力链分析 /
   ## 常见损伤与解剖 / ## 训练建议」全部无编号，与 NSCA 其他章「一、二、
   三」中文章节号风格脱节（ch02 用「一、二...十一、十二、十四、十五」、
   ch04 用「一、二...八」、ch05 用「一、二...十」、ch07 用「一、二...十」、
   ch08 用「一、二...十」、ch10 用「一、二...七」）；可分轮补 6 个标题编号
   对齐
7. (继承 71~80 轮, 优先级低) 羽毛球康复 ch03-knee.md 7 个二级标题用「第一
   部分：...」非中文章节号，与 ch02-shoulder / ch05-elbow 的「一、二、三...
   」风格脱节；可分轮改成中文章节号对齐
8. (本轮新发现, 优先级高) 本轮 fix commit 4731c27 因 host 网络 127.0.0.1:443
   限制 git push 443 失败（连续 10 次重试均报 "Failed to connect to github.com
   port 443 via 127.0.0.1"），与 75 轮 ded6cd7 commit message 末尾「GitHub
   Pages push 重试 — 本轮 host 网络 443 失败」同类问题；下次会话 host
   网络恢复时补 git push origin book + 在 README v3.22.x changelog 末尾补
   v3.22.63 条目（届时 _bump_version.js --set=v3.22.63 --apply 同步 5 埋点
   + 根 README L231 当前版本 + books/README 数据源）

"""


def main():
    if not os.path.exists(TODO):
        print(f'NOT FOUND: {TODO}', file=sys.stderr)
        sys.exit(1)
    with open(TODO, 'a', encoding='utf-8') as f:
        if not LEDGER.endswith('\n'):
            f.write(LEDGER + '\n')
        else:
            f.write(LEDGER)
    print(f'appended {len(LEDGER)} bytes to {TODO}')


if __name__ == '__main__':
    main()