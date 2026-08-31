# Round 89 ledger — finance ch13 manifest 9.4/9.5 subs 归还 [08]（88 轮候选 #1 兑现）

**commit**：`2f68ef8`（`fix(finance-ch13): 9.4/9.5 subs 归还 [08] — 88 轮候选 #1 兑现`）
**prev commit**：`d554699`
**push**：第二次重试成功（首次连接 github.com:443 失败，sleep 90 后 d554699..2f68ef8 push 完成）

## 本轮做了什么

88 轮 ledger 候选 #1 — `books/finance/ch13-international-finance.md` manifest.json / manifest_data.js 的 h2s 嵌套数组 [08]「九、中国在国际金融中的角色」subs 数量从 3 恢复到 5，与 markdown 「### 9.1 / 9.2 / 9.3 / 9.4 / 9.5」五个三级标题严格 1:1 对齐。

88 轮清理冗余「本章小结」时，把原作者错放进 [09] 「本章小结」.subs 的 9.4/9.5 信息一并删了：
- markdown 实有：9.4 跨境投资与中国合格境内机构投资者（QDII）制度（L611）+ 9.5 境外上市与中国概念股（L640）
- manifest [08] 原 subs = [9.1, 9.2, 9.3]（3 项，漏掉 9.4/9.5）
- 88 轮删掉的 [09] 「本章小结」.subs = [9.4, 9.5] —— 这两个 sub 本应挂在 [08].subs 末尾

修法：在 [08].subs 末尾追加 {title, level:3} 两项，与 9.1/9.2/9.3 完全同型：
- manifest.json L8256-L8262 追加 2 个对象（共 8 行）
- manifest_data.js L8932-L8938 同步追加 2 个对象（共 8 行）
- markdown 不动（它本来就有完整的 9.4/9.5 两个 ### 子节）

## 校验

- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- finance ch13 h2s count：`16 → 16`（与 markdown 16 个 ## 仍严格 1:1，88 轮刚修好未回退）✓
- finance ch13 [08] subs：`[9.1, 9.2, 9.3] → [9.1, 9.2, 9.3, 9.4, 9.5]`（与 markdown 「### 9.x」 1:1 对齐）✓
- `python _scan_exlib_refs.py` → 合法 1336 / 唯一 140 / broken 0（不变）✓
- `python _audit_exlib_ledger.py` → 0 drift（不变；仅羽毛球 ch12 1 处 informational list-only）✓
- `git diff --text` → manifest.json +8 行 / manifest_data.js +8 行（每文件追加 2 个 {title, level:3}），与本轮目标一致 ✓
- 字节数：manifest.json `435121 → 435425`（+304B），manifest_data.js `457075 → 457379`（+304B）；每文件 2 个新对象约 152B × 2 ≈ +304B ✓
- `git log -1 --format=%H` → `2f68ef8` ✓
- APP_VERSION `v3.22.62` 不 bump；APP_DATE 不变；app.js 未触碰 ✓
- 可独立回滚：`git revert HEAD` 即可恢复 2 文件 8 行追加 ✓

## 用户偏好兑现

- 沿用 73/74/75/76/77/79/80/81/82/83/84/85/86/87/88 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及
- 兑现 88 轮 ledger 候选 #1 的 finance/ch13 [08].subs 修复承诺
- 单 commit / 单源 issue / 对称双文件修复 / 严格 1:1 与 markdown 对齐
- 与 87/88 轮 NSCA-CPT ch02 / finance-ch13 修复完全同型（manifest h2s 嵌套数组与 markdown 1:1 对齐），跨书跨轮复制成功

## 下轮候选

1. (继承 88 轮, 优先级中) markdown `## 十、个人投资者的国际资产配置` 在 L660 和 L817 出现两次（重复 H2 同号），原作者本意把 L817-L983 整段作为「## 十」的延续（subs 10.6-10.10），但误开了新 ## 二级。这是 markdown 写作瑕疵，不在 manifest 修复 scope 内；如果后续要修，把 L817「## 十、...（补充与常见误区）」降级为 `### 10.6 国际资产配置的常见误区`（替换掉原 L743「### 10.5 」空标题）即可 —— 1 个 markdown 改动 + manifest.json + manifest_data.js 对应 L8436 / L9112 区块更新
2. (继承 71~89 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短（实为完整骨架 + 公式 + 表），如需扩写可挑 1 章做小补
3. (继承 71~89 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，但 inline 32 处 / unique 14 个已饱和，结构完整，硬补有 scope creep 风险，留观
4. (继承 72~89 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理到附录「v3.22 勘误史」独立 H2
5. (继承 80~89 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮的记账 narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79/80/81/82/83/84/85/86/87/88/89 双写惯例的两个文件。可远期补一份让 round68/71/73~77/79~89 双写系列保持连续
6. (继承 85~89 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件禁用 diff 配置，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 89 轮 diff --stat 显示 manifest.json 和 manifest_data.js 被 git 标 binary，但字节数实际有变（+304B × 2） — `git diff --text` 仍可拿到真实 diff。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件（如 `*.psd` / `*.zip`），而其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff
7. (继承 71~89 轮, 优先级低) NSCA-CPT ch09 / ch10 的反向链接承诺（ch01-introduction L162「想理解通用原理 → 读 NSCA-CPT ch09」）已完整兑现，跨轮保留
