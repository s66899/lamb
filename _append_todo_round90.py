"""Round 90 ledger append — finance ch13 重复 ## 十...补充 块挪回 ## 十 内"""
import io, sys

ROUND = 90
COMMIT = "929ecc4"
PREV_COMMIT = "7baf422"

LEDGER = """\

---

## 第 90 轮（commit 929ecc4）— finance ch13 重复 ## 十...补充 块挪回 ## 十 内（89 轮候选 #1 兑现）

**本轮做了什么**：89 轮 ledger 候选 #1 — `books/finance/ch13-international-finance.md`
里 `## 十、个人投资者的国际资产配置` 在 L660 和 L817 出现两次（重复 H2 同号）。
原作者本意把 L817-L983 整段（### 10.6-10.10）作为「## 十」的延续，但误开了
新 ## 二级，且位置错放在 `## 本章思考题` + `## 延伸阅读推荐` 之后（chapter-end 区域），
导致 10.6-10.10 失去父 H2 上下文。

89 轮 ledger 候选 #1 给出的方案是降级 L817 为 `### 10.6`（替换空标题 10.5），
但 10.6≠10.5，强行降级会破坏编号语义。本轮改用更稳的方案：
**块 MOVE**（不动内容，只挪位置）：

1. **markdown MOVE**：L817-L982 共 166 行（含 `## 十...补充与常见误区` heading +
   ### 10.6-10.10 完整 5 个三级标题 + 内容）原封不动地从「## 延伸阅读推荐 之后」
   挪到「### 10.5 之后、## 本章思考题 之前」，新位置在 ## 十 的作用域内。
2. **manifest 同步挪**：manifest.json + manifest_data.js 的 h2s 嵌套数组中
   `[十...补充与常见误区]` 条目（subs 10.6-10.10）从 `[延伸阅读推荐]` 之后挪到
   `[本章思考题]` 之前，h2s 顺序与 markdown 16 个 ## 严格 1:1 对齐。

为什么不删 L817 heading 而要 MOVE：
- 删除会让 10.6-10.10 失去父 ## 上下文（漂在 chapter-end 区域，更糟）
- 降级为 ### 10.6 会与原有 ### 10.6 重复（虽然原 10.6 不存在，但语义错位）
- MOVE 保留原作者「## 十 + ## 十补充」的两段式意图，仅修复位置 bug

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- finance ch13 h2s count：`16 → 16`（与 markdown 16 个 ## 仍严格 1:1，89 轮未回退）✓
- finance ch13 h2s ORDER：markdown ## 顺序与 manifest 一致（[十] → [十...补充] →
  [本章思考题] → [延伸阅读推荐] → [十一]）✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only）✓
- `git diff --text --stat` → 325 + / 324 -（净 +1 行 = 块 MOVE 后多出的 1 个分隔空行）✓
- manifest.json 字节数：`435425 → 435425`（不变，仅顺序变动；`.gitattributes` 把 manifest
  标 binary 但 `git diff --text` 仍可拿到真实 diff 验证内容未变）✓
- manifest_data.js 字节数：`457379 → 457379`（不变，同上）✓
- markdown 行数：`1137 → 1138`（净 +1 = 块 MOVE 后多出的 1 个分隔空行）✓
- `git log -1 --format=%H` → `929ecc4` ✓
- APP_VERSION `v3.22.62` 不 bump；APP_DATE 不变；app.js 未触碰 ✓
- 可独立回滚：`git revert HEAD` 即可恢复 3 文件的块 MOVE ✓
- `git push origin book` 首次成功（7baf422..929ecc4）✓

**用户偏好兑现**：
- 沿用 73/74/75/76/77/79/80/81/82/83/84/85/86/87/88/89 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅块挪位置，0 涉 ex-lib）
- 兑现 89 轮 ledger 候选 #1 的 finance/ch13 重复 ## 十 块位置修复承诺
- 单 commit / 单源 issue / 对称三文件（md + 2 manifests）修复 / 严格 1:1 与 markdown 对齐
- 与 86/87/88/89 轮 NSCA-CPT ch02 / finance-ch13 修复同型（manifest h2s 与 markdown 1:1 对齐），
  跨书跨轮复制成功

**commit hash**：`929ecc4`
（`fix(finance-ch13): 重复 ## 十...补充 块从延伸阅读推荐后挪回 ## 十 内 — 89 轮候选 #1 兑现`）

**push 状态**：首次重试即成功（7baf422..929ecc4，github.com:443 无失败）

**下轮候选**：
1. (继承 89 轮, 已部分兑现 90 轮, 优先级中) ### 10.5 空标题（manifest 写 "10.5"，
   markdown L743 写 "### 10.5 " 标题文本为空）—— 本轮 90 轮块 MOVE 没修这个。
   可以小补：把 markdown L743 `### 10.5 ` → `### 10.5 国际资产配置的实战步骤`，
   manifest.json + manifest_data.js "10.5" → "10.5 国际资产配置的实战步骤"
   共 3 处修改，1 个 commit 兑现
2. (继承 71~90 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），
   如需扩写可挑 1 章做小补
3. (继承 71~90 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14
   个已饱和，结构完整，硬补有 scope creep 风险，留观
4. (继承 72~90 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」
   四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
5. (继承 80~90 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账
   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79/80/81/82/83/84/85/86/87/88/89/90
   双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~90 双写系列保持连续
6. (继承 85~90 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable`
   全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 90 轮 diff --stat 显示
   manifest.json 和 manifest_data.js 被 git 标 binary，但字节数实际未变（435425/457379 原地）
   —— 此次因为只 MOVE 块、不改字节数所以 diff --stat 显示 Bin → Bin，但 `git diff --text`
   仍能拿到 28 行真实差异。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），
   而其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff
7. (继承 71~90 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162
   「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留
8. (新增, 90 轮发现) finance ch13 仍有 `### 10.5 ` 标题文本为空的 markdown 写作瑕疵（实为 90 轮候选 #1
   重写版），manifest 标题也是 "10.5"（无 subject）。原 89 轮候选 #1 提议降级 L817 为 `### 10.6`
   但本轮已用 MOVE 方案替代，10.5 空标题问题未解决。优先级中（3 处小改，单 commit）
9. (新增, 90 轮发现) finance ch13 「## 参考文献 + ## 致谢」在 L725 / L740 错放在 ## 十 作用域内
   （位于 10.4 内容之后、### 10.5 之前），按惯例应挪到 chapter-end（## 十二 之后）。
   影响范围：1 个 markdown 改动 + manifest 可能需同步调整 entries。
   优先级低（参考文献/致谢放在哪里对内容阅读影响小）
"""

with open("_session_todo.md", "a", encoding="utf-8") as f:
    f.write(LEDGER)

print(f"Round {ROUND} ledger appended to _session_todo.md ({len(LEDGER)} bytes)")
print(f"Commit: {COMMIT} (prev: {PREV_COMMIT})")