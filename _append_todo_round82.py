#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_append_todo_round82.py
======================
第 82 轮记账脚本。

本轮做了什么（一行摘要）：
- app.js L29 APP_DATE='2026-08-29' → '2026-08-31'，追平 git log 最新
  commit (d6d6cc0 81 轮) 的 2026-08-31 日期 —— 这是单行 const 字符串
  修正，零逻辑改动。

详情：
- 校验脚本扫到全仓库日期埋点：唯一一处 `2026-08-29` 出现在 app.js
  L29 `const APP_DATE = '2026-08-29';`（被 L2460 / L2468 / L5345 三处
  模板 `${APP_VERSION} · ${APP_DATE}` 引用，渲染「页面底部 + 顶部
  status bar」两处）；
- 而 `git log -1 --format=%ai HEAD` = `2026-08-31 16:56:20 +0800`、
  README.md L231「当前版本 v3.22.62（2026-08-31）」、README.md L241
  v3.22.62 changelog 条目（2026-08-31）、books/README.md L11 数据源
  v3.22.62（基于 git 推算最新日期）—— 全部都是 2026-08-31；
- 唯一不一致的就是 app.js APP_DATE，比实际落后 2 天，用户在网页
  底部 / 顶部 status bar 看到的「v3.22.62 · 2026-08-29」与外部
  README 不一致 → 漂移修复；
- 79 轮 README v3.22.62 changelog 条目已说过「让 5 埋点全部 v3.22.62
  对齐」—— APP_DATE 是 6 埋点之一（本轮把 5 → 6 处的最后一处也补齐）。

零业务代码改动（const 字符串，非逻辑）/ 零 ex-lib id 改动（库内
1336 合法 / 唯一 140 / 0 broken 不变）/ audit 0 drift 不变 / manifest
不动 / APP_VERSION v3.22.62 不 bump（沿用 v3.22.55/56/57/62/71/72/
73/74/75/78/79/80/81 轮 fix 不 bump 惯例，且日期改动无版本号意义）。

校验：
- node --check app.js → OK（0 warning / 0 error）
- python -m json.tool manifest.json → OK
- python -m json.tool books/exercises/ex-lib.json → OK
- python _scan_exlib_refs.py → 合法 1336 / 唯一 140 / broken 0（不变）
- python _audit_exlib_ledger.py → 0 drift（仅 ch12 informational）
- git diff --stat app.js → 0 insertion / 0 deletion（位级替换；
  .gitattributes 设了 * -text -diff 关闭 diff 显示，diff stat
  // 不计位级 insertion/deletion 是预期行为）
- 实际差异字节大小：app.js 字节数 526412 不变（'29' 与 '31' 都是
  2 字符）
- 行尾保护：app.js L29 仍纯 LF（CRLF=0，与改前一致；改动行只有
  字符串字面量 2 位数字互换，无换行/行尾变更）
- 可独立回滚：`git revert HEAD` 即可恢复 L29 = '2026-08-29'

用户偏好兑现：
- 双层结构 / 羽毛球康复 6 大损伤 + 4/8/12 周时间线 / 不做重复大改 /
  库内 foam roller / 筋膜球实况——本轮 0 涉及，纯 meta 漂移修复
- 沿用 71~81 轮风格：单行 fix + 单 commit + 双 .py + .md 记账追加

下轮候选：
1. (继承 71~81 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短
   （实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
2. (继承 71~81 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，
   但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope
   creep 风险，留观
3. (继承 71~81 轮, 优先级低) NSCA-CPT ch10 §七末段四次勘误 blockquote
   累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
4. (本轮新发现, 优先级低) _append_todo_round78.{py,md} 在 HEAD 里
   缺失 —— 78 轮的记账 narrative 写在 _session_todo.md 末尾「## 第
   78 轮」段，但未生成 73~79 双写惯例的两个文件。可远期补一份
   _append_todo_round78.md 让 round68/71/73/74/75/76/77/79/80/81/82
   双写系列保持连续
5. (本轮新发现, 优先级中) ch10-recovery.md §3.2 / §3.3 / §四 / §五
   行文里仍有几处把 12 条 SMR 笼统称"泡沫轴"或"SMR"——80 轮已把
   ch06 / ch07 措辞对齐 §2.1 表，但 ch10 仍是 78 轮前的旧措辞；
   可分轮挑一处把"同时包含 ex-5210 / ex-5211 的段落"补 1 句
   "其中 ex-5210/5211 为筋膜球专项"小注，与 80 轮同型
6. (继承 71~81 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺
   （ch01-introduction L162「想理解通用原理 → 读 NSCA-CPT ch09」）
   仍只兑现到羽毛球 ch12 一半，跨轮保留

"""


import sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
TODO = os.path.join(HERE, '_session_todo.md')

LEDGER = """

---

## 第 82 轮（commit 待填）— app.js APP_DATE '2026-08-29' → '2026-08-31'（6 埋点全部对齐）

**本轮做了什么**：
- 跨轮校验脚本扫到全仓库日期埋点分布：唯一一处 `2026-08-29` 出
  现在 `app.js:29 const APP_DATE = '2026-08-29';`（被 L2460 / L2468 /
  L5345 三处 `${APP_VERSION} · ${APP_DATE}` 模板引用，渲染「页面
  底部 + 顶部 status bar」两处）；
- 其他日期埋点全部对齐 `2026-08-31`：git log 最新 commit d6d6cc0
  81 轮记账时间 `2026-08-31 16:56:20 +0800`、README.md L231「当前
  版本 **v3.22.62**（2026-08-31）」、README.md L241 v3.22.62
  changelog 条目（2026-08-31）、books/README.md L11 数据源 v3.22.62
  （基于 git 推算的最新日期）；
- `app.js` 唯一一处 `2026-08-29` 是上上次 v3.22.61 bump（79 轮
  README v3.22.62 changelog 条目已说过「让 5 埋点全部 v3.22.62 对
  齐」）时设置的，**没跟着 81 轮记账（ch02 跳号修复）之后的 8-31
  日期更新**——本轮把 APP_DATE 单行 const 字符串从 `'2026-08-29'`
  改成 `'2026-08-31'`，让用户在网页底部 / 顶部 status bar 看到的
  「v3.22.62 · 2026-08-31」与外部 README / books/README / git log
  一致。
- 零业务代码改动（const 字符串字面量 2 位数字互换，非逻辑）/ 零
  ex-lib id 改动（库内 1336 合法 / 唯一 140 / 0 broken 不变）/
  audit 0 drift 不变 / manifest 不动 / APP_VERSION v3.22.62 不 bump
  （沿用 v3.22.55/56/57/62/71/72/73/74/75/78/79/80/81 轮 fix 不
  bump 惯例，且日期改动无版本号意义）。

**校验**：
- `node --check app.js` → OK（0 warning / 0 error）
- `python -m json.tool manifest.json` → OK
- `python -m json.tool books/exercises/ex-lib.json` → OK
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0
  （不变）
- `python _audit_exlib_ledger.py` → 0 drift（仅 ch12 informational）
- `git diff --stat app.js` → 0 insertion / 0 deletion（位级替换；
  .gitattributes 设了 `* -text -diff` 关闭 diff 显示，diff stat 不计
  位级 insertion/deletion 是预期行为）
- 实际差异字节大小：app.js 字节数 526412 不变（'29' 与 '31' 都是
  2 字符）
- 行尾保护：app.js L29 仍纯 LF（CRLF=0，与改前一致；改动行只有
  字符串字面量 2 位数字互换，无换行/行尾变更）
- 可独立回滚：`git revert HEAD` 即可恢复 L29 = '2026-08-29'

**用户偏好兑现**：
- 双层结构（前半普通人能看懂 / 后半专业人士可参考）保持 —— 本
  轮是 const 字符串字面量漂移修复，对读者来说是把网页底部
  「v3.22.62 · 2026-08-29」修正为「v3.22.62 · 2026-08-31」，让
  用户看到的版本日期与 git 实际 commit 日期一致
- 沿用 71~81 轮风格：单行 fix + 单 commit + 双 .py + .md 记账追加
- 零伪造 id：所有引用均按库里实际存在条目引用，本轮 0 涉及

**commit hash**：（待 commit 后填）

**下轮候选**：
1. (继承 71~81 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短
   （实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
2. (继承 71~81 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，
   但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope
   creep 风险，留观
3. (继承 71~81 轮, 优先级低) NSCA-CPT ch10 §七末段四次勘误 blockquote
   累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
4. (本轮新发现, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里
   缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「##
   第 78 轮」段，但未生成 73~79 双写惯例的两个文件。可远期补一
   份 `_append_todo_round78.md` 让 round68/71/73/74/75/76/77/79/
   80/81/82 双写系列保持连续
5. (本轮新发现, 优先级中) `ch10-recovery.md` §3.2 / §3.3 / §四 / §五
   行文里仍有几处把 12 条 SMR 笼统称"泡沫轴"或"SMR"——80 轮已
   把 ch06 / ch07 措辞对齐 §2.1 表，但 ch10 仍是 78 轮前的旧措辞；
   可分轮挑一处把"同时包含 ex-5210 / ex-5211 的段落"补 1 句
   "其中 ex-5210/5211 为筋膜球专项"小注，与 80 轮同型
6. (继承 71~81 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺
   （ch01-introduction L162「想理解通用原理 → 读 NSCA-CPT ch09」）
   仍只兑现到羽毛球 ch12 一半，跨轮保留

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