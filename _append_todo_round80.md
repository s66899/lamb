# 第 80 轮（commit 待填）— ch06-back.md L193 + ch07-achilles.md L179 SMR 12 条按真实器材拆开（10 泡沫轴 + 2 筋膜球）

## 本轮做了什么

实地校对 `books/exercises/ex-lib.json` 库内 12 条 SMR 专项条目（`ex-5202 ~ ex-5213`）的 `eq_zh` 字段后，发现 **10 条是泡沫轴**（`ex-5202 ~ ex-5209 + ex-5212 + ex-5213`，`eq_zh = 泡沫轴`），**2 条是筋膜球**（`ex-5210` / `ex-5211`，`eq_zh = 筋膜球`）。

而 `books/badminton-recovery/ch06-back.md` L193 与 `books/badminton-recovery/ch07-achilles.md` L179 两段说明文均把 12 条**笼统**写成「foam roller / 筋膜球系列专项条目（12 条覆盖各部位）」—— 让快速浏览读者误以为 12 条是泡沫轴+筋膜球混称。 实际上 12 条里有 10 条**只是泡沫轴**、只有 2 条**才是筋膜球**。

`books/nsca-cpt/ch10-recovery.md` §2.1 SMR 引用表 L84-L95 已正确分开泡沫轴（10 条）/ 筋膜球（2 条）两列 —— 本轮把 ch06 / ch07 行文拉齐到这个写法：

- `ch06-back.md` L193：把原「foam roller / 筋膜球系列专项条目（12 条覆盖各部位）」改为「12 条 SMR 专项条目（其中 **10 条泡沫轴** ex-5202~5209 + 5212~5213 分别覆盖股四/腘绳/髂胫束/小腿/臀/上背/背阔/肩袖/胸椎/内收肌（`eq_zh` 全部为「泡沫轴」），加 **2 条筋膜球** ex-5210 / ex-5211 分别覆盖前臂伸肌/足底筋膜（`eq_zh` 为「筋膜球」，介质即长曲棍球/网球等球形硬质工具））」；末尾「v3.22.62 勘误」段同步把「库内 foam roller 真实条目（ex-5202~ex-5213）」补为「库内 foam roller / 筋膜球真实条目（ex-5202~ex-5213 共 12 条）」
- `ch07-achilles.md` L179：把原「筋膜球 / foam roller 系列专项条目（12 条覆盖各部位）」改为同型 10+2 拆分；同时把文中两处 `[ex:5211]` / `[ex:5205]` 引用处的 `eq_zh` 用反引号包起 + 各自补一句「`eq_zh=筋膜球`」/「`eq_zh=泡沫轴`」让行文与 §2.1 L84-L95 表格的 eq 列一致

- 零业务代码改动
- 零 ex-lib id 改动（库内 1336 合法 / 全项目 140 unique / 0 broken 不变）
- audit 0 drift 不变
- manifest 不动
- APP_VERSION `v3.22.62` 不 bump（沿用 v3.22.55/56/57/62/71/72/73/74/75/78/79 等小 fix 不 bump 惯例）

## 校验

- `node --check app.js` → OK ✓
- `python -m json.tool manifest.json` → OK ✓
- `python -m json.tool books/exercises/ex-lib.json` → OK ✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（仅 ch12 informational list-only，与改前一致）✓
- `git diff --numstat` → `2 files changed, 1 insertion(+), 1 deletion(-)` per file（每文件仅 L193 / L179 一行替换，无新增章节内容）✓
- 行尾保护：`ch06-back.md` 仍纯 LF（CRLF=0），`ch07-achilles.md` 仍纯 LF（CRLF=0），与改前一致 ✓
- byte 变化：`ch06` +347 bytes、`ch07` +349 bytes（拆开 10+2 的细分说明 + 反引号 `eq_zh` 标注），纯文字增密、零 id 变化 ✓
- 可独立回滚：`git revert HEAD` 即可恢复 L193 / L179 原「foam roller / 筋膜球系列专项条目」笼统措辞 ✓

## 用户偏好兑现

- **双层结构**（前半普通人能看懂 / 后半专业人士可参考）保持 —— 本轮修改是说明文里的器材细分，对读者来说是把含糊术语「foam roller / 筋膜球」精确化为「泡沫轴 + 筋膜球」两份清单 + 各自覆盖的肌肉群名称，普通读者更易分清介质，专业读者可直接对照 §2.1 表 L84-L95 校对 ✓
- 沿用 73 / 74 / 75 / 76 / 77 / 79 轮风格：单次 commit 内含 2 处独立微改（ch06 + ch07） + 双 `.py` + `.md` 记账文件追加 ✓
- **零伪造 id**：所有引用均按库里实际存在条目引用（`[ex:5211]` 筋膜球 / `[ex:5205]` 泡沫轴 / `[ex:5212]` 胸椎泡沫轴 / `[ex:5207]` 上背泡沫轴 / `[ex:5208]` 背阔泡沫轴 / `[ex:1373]` / `[ex:1490]` / `[ex:1368]` 等全部库内合法），零新增 id、零伪造 id ✓

## commit hash

83d17e6

## 下轮候选

1. **(继承 71~79 轮,优先级低)** 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
2. **(继承 71~79 轮,优先级低)** 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观
3. **(继承 71~79 轮,优先级低)** NSCA-CPT ch10 §七末段四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
4. **(本轮新发现,优先级低)** `ch10-recovery.md` §3.2 / §3.3 / §四 / §五 行文里仍有几处把 12 条 SMR 笼统称「泡沫轴」或「SMR」—— 可分轮挑一处把「同时包含 ex-5210 / ex-5211 的段落」补 1 句「其中 ex-5210 / ex-5211 为筋膜球专项」小注，与本轮 ch06 / ch07 同型
5. **(本轮新发现,优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~79 双写惯例的两个文件。可远期补一份 `_append_todo_round78.md` 让 round68/71/73/74/75/76/77/79/80 双写系列保持连续
6. **(继承 71~79 轮,优先级低)** NSCA-CPT ch09 / ch10 的反向链接承诺（`ch01-introduction.md` L162「想理解通用原理 → 读 NSCA-CPT ch09」）仍只兑现到羽毛球 ch12 一半，跨轮保留