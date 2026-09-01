## 第 115 轮 — 兑现 round114 候选 #2 上半段（`.gitattributes` 全局 `-diff` 解除）

**commit**: `a1c4cc4` chore(gitattributes): 解除全局 -diff，给 json/md/js/html/css 重新开启可读 diff
**push**: ✅ 5b3992e..a1c4cc4 → github.com/s66899/lamb (book)

### 本轮做了什么

- **诊断**：`.gitattributes` L3 `* -text -merge -diff -lfs -lockable` 把**所有**文件 diff 全关了，导致 `manifest.json`、`manifest_data.js` 等数据文件每次改动 `git diff` 只显示「blob hash changed」，完全看不见实际改了什么（round114 候选 #2 已点名）。
- **改动**：单文件 `.gitattributes`（12 + / 1 -）
  - L3 收紧：`* -text -lfs -lockable`（保留 LFS 关闭、保留 lockable，去掉全局 `-diff -merge`）
  - 显式给 `*.json *.md *.js *.html *.css` 打开 `diff`
  - `*.md diff=markdown` 沿用
- **不修改任何工作区文件换行符**——CRLF 文件保持 CRLF；属性只影响 git *显示*。

### 校验

- `manifest.json` 烟雾测试：临时插入 `__smoke__: true`，`git diff -- manifest.json` 现在能展示实际行内容（不是只显示 blob 变）。
- 回滚后 `git status --short` 只有 `.gitattributes` 一处修改，md5 与备份一致。
- `node --check` / `python -m json.tool` 不适用（属性文件改动，不影响 JS/JSON 解析）。
- `git push origin book` 一次成功（round114 候选 #1 的网络问题本轮已恢复）。

### 残留 / 后续

- **manifest.json 缺末尾换行**：diff 看起来仍然像"全删 + 全增"（一行 stdout 看不到上下文），不是 diff 本身失败，而是文件无 trailing newline + CRLF 混合导致 git 把整个文件视作一行。下轮可补 trailing `\n`，会触发一次性巨大 diff 但仅此一次。
- **manifest_data.js 仍是 CRLF + 大行宽**：本轮改完 diff *已可读*，但行长仍是 ~540+ 字符，diff 仍然不算美观。如果以后想美化，可加 `core.attributesfile` 里设 `*.js diff=js` 或后续用 pre-commit hook 跑 `prettier`。
- **.gitattributes 改动为后续可观测性铺路**：现在改 manifest.json 时终于能看见内容，下轮想做字数镜像、章节深度校对就有依据了。

## 下轮候选（继承 114 + 本轮新观察，优先级降序）

1. **(本轮遗留, 优先级高)** `manifest.json` 末尾补 trailing newline（一次性触发全文件 diff，但从此 diff 干净；可与 #2 合并成一个 commit）
2. **(本轮遗留, 优先级中)** `manifest_data.js` 同样缺末尾换行 / CRLF 混排；用 `_normalize_lf.py` 已经存在但未对 manifest_data.js 跑过；可考虑一次性 normalize 这两个文件
3. **(继承 114 #3, 优先级中)** 全仓字数对真实 markdown 的系统漂移（badminton/engineering-mechanics/finance/psychology/badminton-recovery/nutrition 6 本书差异 30-50%）
4. **(继承 114 #4, 优先级低)** `todos/round110.md` 文件缺失，可补建 round110 ledger 闭 loop
5. **(继承 108 #3, 优先级低)** NSCA ch10 §7 末段 v3.22 勘误累积 580+ 字，可整理为附录
6. **(本轮新观察, 优先级低)** `manifest_data.js` 458414 bytes 不变 + `manifest.json` -14072 drift → 后续可考虑统一 words 字段为 padded 4-digit 字符串，或干脆放弃精确字节对齐
