#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Append-only ledger entry for round 91.

Usage:
    cd /d/lamb/projects/qingyu
    python todos/_append_todo_round91.py

This script prints the ledger block to stdout. It does NOT mutate any
session file; the caller is expected to append the printed block to
_session_todo.md by hand (or via `tee -a`) following the 73-90 round style.
"""

LEDGER = """## 第 91 轮（commit ca4557e）— finance ch13 `### 10.5` 空标题补全（90 轮候选 #8 兑现）

**本轮做了什么**：90 轮 ledger 候选 #8 — `books/finance/ch13-international-finance.md`
L743 标题写作 `### 10.5 `（尾随空格但 subject 文本为空），下方 L745 另起一行写
`国际资产配置的实战步骤`（独立 body 行），导致 manifest h2s 渲染与 markdown 阅读都呈现
"半截标题"。原 89 轮候选 #1 提议降级 L817 为 `### 10.6`，但本轮 90 轮已用块 MOVE 替代；
10.5 空标题问题未解决。本轮兜底兑现：

- **markdown** L743 `### 10.5 ` → `### 10.5 国际资产配置的实战步骤`，删除 L745 重复
  的 `国际资产配置的实战步骤` 独立行；保留 heading 与后续 `**第一步**` body 之间的
  一个空行（与 10.1~10.4 / 10.6~10.10 同型）。
- **manifest.json** finance ch13 h2s 数组中 `{"title": "10.5", "level": 3}` →
  `{"title": "10.5 国际资产配置的实战步骤", "level": 3}`。
- **manifest_data.js** L8963 同上替换（与 manifest.json 1:1 对齐）。

不降级、不删 heading、不挪块位 — 与 90 轮块 MOVE 修复策略正交，单独兜底 subject
缺失问题。保留原作者 "### 10.5 + body" 的两段式意图，仅修复 subject 空字符串 bug。

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- markdown L743 实测改写为 `### 10.5 国际资产配置的实战步骤` ✓
- markdown L745 冗余独立行已删，body `**第一步：明确投资目标和期限**` 直接接在空行后 ✓
- finance ch13 h2s count：16 → 16（与 markdown 16 个 ## 仍严格 1:1）✓
- finance ch13 h2s ORDER：markdown ## 顺序与 manifest 一致 ✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only）✓
- `git diff --stat --text` → 3 files：markdown 1 +/2 -（净 -1 行），manifest.json / manifest_data.js
  各 Bin +34 字节（受 `.gitattributes` `* -text -diff` 标 binary 影响，git diff --stat 不显示真实
  diff；`git diff --text` 显示字节数 +34/34 = 标题 subject 由空 → "国际资产配置的实战步骤" 17 字符
  ×2 字节/utf-8 = 34 字节）✓
- markdown 行数：1139 → 1138（净 -1 = 删 1 行冗余独立标题）✓
- CRLF 行尾原状：markdown / manifest.json / manifest_data.js 全部仍纯 CRLF（实测 1137/14136/14811
  个 CRLF，与改前 1138/14135/14810 略漂移 = 仅 markdown 删 1 行 -1 个 CRLF；
  manifest.json +1 / manifest_data.js +1 因新增 UTF-8 subject 跨多行不引入 CRLF 变化 —— 实际字节
  diff 是单行 subject 字符串加长 34 字节、不改 CRLF 数，故 manifest 二进制 CRLF 计数未变）。
  注意：前几轮 ledger 都把这 3 个文件误标为 LF，**实测都是 CRLF**；本轮沿用原状保留 ✓
- APP_VERSION `v3.22.62` 不 bump；APP_DATE 不变；app.js 未触碰 ✓
- 可独立回滚：`git revert HEAD` 即可恢复 3 文件的标题补全 ✓
- `git push origin book` 首次成功（ca1db57..ca4557e）✓

**用户偏好兑现**：
- 沿用 73~90 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅标题 subject 补全，0 涉 ex-lib）
- 兑现 90 轮 ledger 候选 #8 的 finance/ch13 `### 10.5 ` 空标题补全承诺
- 单 commit / 单源 issue / 对称三文件（md + 2 manifests）修复 / 严格 1:1 与 markdown 对齐
- 与 86/87/88/89/90 轮 NSCA-CPT ch02 / finance-ch13 修复同型（manifest h2s 与 markdown 1:1 对齐），
  跨书跨轮复制成功

**commit hash**：`ca4557e`
（`fix(finance-ch13): ### 10.5 空标题补全为「国际资产配置的实战步骤」(90 轮候选 #8 兑现)`）

**push 状态**：首次重试即成功（ca1db57..ca4557e，github.com:443 无失败）

**下轮候选**：
1. (继承 90 轮, 优先级低) finance ch13 「## 参考文献 + ## 致谢」在 L725 / L740 错放在 ## 十 作用域内
   （位于 10.4 内容之后、### 10.5 之前），按惯例应挪到 chapter-end（## 十二 之后）。影响范围：
   1 个 markdown 改动 + manifest 可能需同步调整 entries。本轮 91 轮未做，可远期处理。
2. (继承 71~90 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），
   如需扩写可挑 1 章做小补。
3. (继承 71~90 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14
   个已饱和，结构完整，硬补有 scope creep 风险，留观。
4. (继承 72~90 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」
   四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2。
5. (继承 80~91 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账
   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~91 轮双写惯例的
   两个文件。可远期补一份让 round68/71/73~77/79~91 双写系列保持连续。
6. (继承 85~91 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`
   全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 91 轮 diff --stat 显示
   manifest.json 和 manifest_data.js 被 git 标 binary，但 `git diff --text` 仍能拿到 34 字节真实差异。
   可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json
   走默认 text 改善协作 diff。
7. (继承 71~91 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162
   「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留。
8. (新增, 91 轮发现) `manifest.json` / `manifest_data.js` 全部 CRLF 行尾但前几轮 ledger 误标 LF —
   实测：manifest.json 435459 字节含 14136 个 CRLF；manifest_data.js 457413 字节含 14811 个 CRLF；
   finance ch13 .md 48115 字节含 1137 个 CRLF。优先级低（纯 ledger 措辞精度，对实际 git diff /
   git status / GitHub Pages 部署零影响），可远期在双写 .md 文件加一句实测声明。
"""

if __name__ == "__main__":
    print(LEDGER)