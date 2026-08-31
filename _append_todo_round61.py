#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Append round 61 commit accounting to _session_todo.md (LF only)."""
import io
import os

content = '''---

## 2026-08-31 07:55 第 61 轮 (commit e3f69d2)

### 本轮做了什么
- **commit `e3f69d2`** `fix(badminton-recovery-ch02): 数字声明重构 - 把'23 (正文) + 32 (合计)'两数字并列/含本声明句括号混用的稠密叙述拆为正文 23 + 本段 9 + 合计 32 三段式,逻辑层次清晰;同数字与原版一致(32/7);ex-lib 校验全过`
- **真实问题**:ch02-shoulder.md L255 单段同时声明 3 个数字但混排
  - "7 个合法 id (清单) + 正文 (不含说明/修订说明) 共 23 处 (W1-W8 15 + 旁注 1 + 清单 7) + 含本声明句同 0215/0225/0235/0383/0426/0864/3011 这 7 个 id 各内嵌 1 次 + 0215/0225 各再内嵌 1 次共内嵌 9 次,合计 32 处 inline"
  - 23 / 32 / 9 三个数字都在同一长句,读者一遍读下来很难追溯"为什么 23 不等于 32"
- **修复策略**:沿用本项目「纯文字叙事修正」+「数字声明 ↔ 实际 grep 计数对齐」模式 (沿用 eb2a66f / 1f98698 / 0a77a56 / e852cef 等多轮教训) — 同数字 (23/9/32),只重排版:
  - 第 1 句:"本章 ex-lib 引用清单含 7 个合法 id:" + 全部 7 个 id 列表
  - 第 2 句:"正文 (不含本说明 / v3.22.33 修订说明段) 共 23 处 [ex:NNNN] 引用: W1-W8 时间线表内 15 处 + 文字旁注 1 处 + 清单本身 7 处" — 加粗「正文」「W1-W8 时间线表内」「文字旁注」「清单本身」四个关键标识
  - 第 3 句:"本段说明中另有 9 处 [ex:NNNN] 引用 (全部 7 个合法 id 各 1 次作为「清单详列」,加上 0215/0225 两个 id 作为「库中暂无条目以代用 id 标注举例」各多内嵌 1 次 — 即 0215 与 0225 出现 2 次)"
  - 第 4 句:"全文合计 32 处 inline (正文 23 + 本段 9)"
  - 用「本段说明中」单独成句明确"括号里说的那 9 次"是哪里来的
- 单行改写 1 文件 1 行 1 行删除 1 行新增:13647 → 13872 字节 (+225 字节纯文字叙述)

### 校验
- `git diff --stat`: `1 file changed, 1 insertion(+), 1 deletion(-)` 通过 (单行改写)
- L255 实测改写后,regex `[ex:NNNN]` 计数:
  - 全文 = 32 处 = 原版 32 处 (= 未变,纯文字重排,无 id 改动)
  - 全文 unique = 7 (= 未变)
  - L255 单行内 inline 9 处 = 原版 9 处 (= 未变)
- ex-lib 库校验:`node _scan_exlib.js` = total ids 1336 / total refs 530 / broken 0 (= 改前一致,因只动 .md 纯文字)
- `python -m json.tool manifest.json` OK (改前一致)
- `python -m json.tool books/exercises/ex-lib.json` OK (改前一致)
- `node --check app.js` OK
- `python -c "raw.count(b'\\r\\n')"`: 0 (= 改前一致,无 CRLF 污染)
- `python -c "raw.count(b'\\r')"`: 0 (= 改前一致,无裸 CR)
- `python -c "raw.endswith(b'\\n')"`: True (= 改前一致,文件以单 LF 结尾)
- 零 ex-lib id 改动 (32/7 不变) / 零业务代码改动 / APP_VERSION 不 bump (沿用 v3.22.61,纯文字叙事修正)

### 上轮候选清算 (本轮重扫)
- ✅ **(本轮 61 轮已修)ch02-shoulder.md L255 数字声明自相矛盾修复** — 上轮 58/60 轮登记「ch02 L255 '23 + 32' 双数字并列 + 括弧混用 阅读负担重」,本轮用「正文 23 + 本段 9 + 合计 32」三段式落地
- ✅ **(本轮捎带 commit)** 上轮 60 轮 commit f0a046c — 已通过本轮 push 一并捎带成功 (`36be69f..e3f69d2` 含本轮 e3f69d2 + 上轮 1 个 chore(todo) commit 一次性捎带)
- ✅ **(扫表验证,本轮无 mismatch)** ch02/ch03/ch04/ch05/ch06/ch07/ch08 各章 ex-lib 数字声明 (32/7 / 16/9 / 23/13 / 16/5 / 44/16 / 32/14 / 35/16) 实际 grep 一一对齐,本轮扫表工具 `_round61_audit.py` 输出全通过
- 🔄 **(未做,跨轮保留)** ch06 「15 个 unique 业务 id」措辞 — 13 表 + 2 邻近 (5207/5208) = 15 业务,但 file-unique = 16 (因 [ex:1352] 仅在 勘误段出现 1 次);当前文「**15 个 unique 业务 id**」已经明确加「业务」二字,与 ch07 「14 个 unique id (其中 13 训练 + 1 [ex:5205])」类似口径,可读性强,不修
- 🔄 **(未做,跨轮保留)** ch01 L3 「**三阶段时间线 + 三层信号识别 + 三种返回测试**」 之 "三层信号识别" 段	ch01 §三是「六大损伤早期警告」+ 速查表,只双层 H3 (普通人 + 专业人士);严格 grep 「第三层」= 0 次 — 但读后认为 ch01「三层」= ch02/ch05「信号识别—三个层次」(红/黄/绿 三色) 的口径汇总,所以**文意一致**,可能是读者误读,继续留
- 🔄 **(未做,跨轮保留)** foam roller / 筋膜球腰部专项入库 — 库内 back 系列 5207/5208/5212 全是 upper/thoracic/lats,腰部 foam roller 专项**确实暂无**,绝不假造 id
- 🔄 **(未做,跨轮保留)** NSCA-CPT ch10 ch10 第七节总清单 v3.22.50 「↗ 详见 2.1 节」是否覆盖所有 id — 60 轮新发现,跨轮保留
- 🔄 **(未做,跨轮保留)** 羽毛球康复书 6 章 H2 结构统一化 — 跨轮保留,工作量大
- 🔄 **(未做,跨轮保留)** APP_VERSION bump — 本轮纯文字,无需 bump
- 🔄 **(未做,跨轮保留)** _session_todo.md 远期归档瘦身 — 现 1880+ 行,继续留
- 🔄 **(未做,跨轮保留)** books/README.md 96 → 97 章字段同步 / 根 README「每章 60/30/10」核实 — 远期继承

### push 状态
- ✅ **本轮 push 成功!** `git -c http.proxy= -c https.proxy= push origin book` exit 0;`36be69f..e3f69d2` 已推 `origin book`(含本轮 e3f69d2 + 上轮 f0a46c 1 个 chore(todo) commit 一次性捎带),GitHub Pages 自动部署中

### 新增下轮候选
- **(本轮新发现,优先级低)ch06 §清单段「(含 13 行表 + 说明段提及 + 历史勘误提及)23 处」措辞细化** — 现状是混述 13 row table + 2 个 邻近 mention + 1 个 1352 勘误 mention = 23 = 6 (L175 declaration) + 13 (table rows) + 4 (L193 说明段 4 inline);把"23 处"拆成 (13 行表 13 处 + 说明段 6 处 + 历史勘误 4 处) 三段计数,与 ch02 本轮拆分句法对齐
- **(本轮新发现,优先级低)ch07 「13 个为训练动作 + 1 个为说明段顺带提及的 foam roller 邻近条目 [ex:5205]」** — 表述已较完整;可考虑标 `[ex:5205]` 邻近条目为何在文中实际未被业务引用 (只在 §清单段「说明」中顺带提及 1 次),让读者一眼明白「14 unique 中有 1 个是邻近 mention 不训练用」 — 与 ch02 本轮正文 23 + 邻近不算业务 的拆分风格统一
- **(本轮新发现,优先级低)ch01 L3 「三阶段时间线 + 三层信号识别 + 三种返回测试」语义对齐** — 严格 grep 三层信号识别 = §二/§五「信号识别—三个层次」+ ch01 §三 本章信号识别 (双层);目前口径混用,但读者读得懂,优先级低可远期处理
- **(继承远期,优先级低)** 羽毛球康复书 6 章 H2 结构统一化 — 跨轮保留
- **(继承远期,优先级低)** foam roller / 筋膜球腰部专项入库 — 不假造 id,继续留
- **(继承远期,优先级低)** NSCA-CPT ch10 第七节总清单 ↗ 详见 2.1 节 是否覆盖所有 id — 跨轮保留
- **(继承远期,优先级低)** APP_VERSION bump — 沿用 v3.22.61
- **(继承远期,优先级低)** books/README.md 96 → 97 章字段同步
- **(继承远期,优先级低)** 根 README「每章 60/30/10」核实

### commit hash
- `e3f69d2`(本轮已 commit,已 push `36be69f..e3f69d2`)

---
'''

target = '_session_todo.md'
# Read existing content in LF mode
with io.open(target, 'r', encoding='utf-8', newline='') as f:
    existing = f.read()

# Ensure trailing LF
if not existing.endswith('\n'):
    existing = existing + '\n'

# Append new content (already in pure LF because we're not writing any \r\n)
new_content = existing + content

with io.open(target, 'w', encoding='utf-8', newline='') as f:
    f.write(new_content)

# Verify
with io.open(target, 'rb') as f:
    raw = f.read()
print(f"_session_todo.md appended: {len(existing)} → {len(raw)} bytes")
print(f"CRLF count: {raw.count(b'\\r\\n')}")
print(f"ends with LF: {raw.endswith(b'\\n')}")
