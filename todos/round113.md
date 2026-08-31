# 第 113 轮记账 — 兑现上轮候选 #1「根目录散落 75+ 临时 .py / .json / .txt 补 .gitignore 通配」

**commit**: `32689de`（已 push：2ac306b..32689de → book）

## 本轮干了什么

`.gitignore` 新增 13 行通配规则，一次性覆盖 75+ 个 `_roundNNN_*.py / _brace_check*.py / _scan_*.py / _manifest_backup_*.json` 等临时脚本。

**目标**：让 `git status` 不再被开发期临时 fix/scan 脚本噪音淹没
**方案**：在 .gitignore 末尾追加 13 行通配（不删散落的 66 行显式条目，保留向后兼容 + 历史取证）
**具体 drift**：
- 修复前：`git status` 列出 23 个 `?? _*.py / _*.json / _*.txt` 未追踪文件
- 修复后：`git status` 只剩 2 项（`.gitignore` 改动 + 本轮 ledger）

## 校验

- `git check-ignore -v _round104_fix_ch12_manifest.py _brace_check.py _scan_exlib.js _round109_compare.py _round109_dump.txt _add_chapter_nav.py _manifest_new_round110.json _manifest_backup_round110.json` 全部命中（L80/L81/L53/L87/L93/L92 等多行规则）
- 临时文件本身**不删除**（沿用「不擦取证脚本」原则，磁盘证据保留；如需彻底清理可手动 `rm -rf _*.py _*.json _*.txt`）
- 其余文件 0 改动（manifest.json / manifest_data.js / app.js / 9 本书 markdown 全部不动）
- 字节变化：.gitignore +380 bytes (1690→2070)；todos/round112.md 新增 67 行
- push 成功（与 round107/108/110/111 不同，本次网络可达：`To https://github.com/s66899/lamb.git   2ac306b..32689de  book -> book`）

## 用户偏好兑现

- 不做与现有功能重复的大改动——本轮只动 .gitignore 一个文件、+13 行
- 单 commit 可独立回滚（`git revert HEAD` 即恢复原 78 行 .gitignore）
- 临时脚本不删除（避免擦历史取证；与「不擦无关用户工作」一致）

## 真实问题修复对照

- 修复前：`git status` 噪音 23 项，全是 round104+ 临时脚本（开发期每轮产出的 fix/scan/compare 工具）
- 修复后：`git status` 噪音 23 → 2 项；开发者每轮后只需看真正需要 commit 的内容（manifest / markdown / 文案 / 代码）

## commit hash

`32689de` — `chore(gitignore): 一次性收敛 75+ 个 _roundNNN_*.py / _brace_check*.py / _scan_*.py 临时脚本`

## push 状态

✅ 成功：`2ac306b..32689de book -> book`（网络本次可达，未触发 round107/108/110/111 的 curl 28 reset）

## 下轮候选（继承 108/109/110/111/112/113 + 本轮新观察，优先级降序）

1. **(继承 108 轮 #4, 优先级中)** `.gitattributes` L5 `* -text` 让 manifest.json diff 显示 Binary — 本轮 commit `32689de` 也受影响（`.gitignore` 同样 Bin 1690→2070，0 insertions/deletions 行数不可读）；可改为 `manifest.json text` / `manifest_data.js text` 显式覆盖，恢复可读 diff
2. **(继承 112 轮 #6, 优先级低)** todos/round110.md 文件缺失：HEAD `2ac306b` commit message 自称「第 110 轮记账」但 ledger 文件不存在——下轮可考虑补建 round110 ledger 闭 loop
3. **(继承 108 轮 #2, 优先级低)** 7 章「English · 中文」双语 manifest 标题——是否设计意图仍未确认
4. **(继承 108 轮 #3, 优先级低)** NSCA ch10 §7 末段「v3.22.17 / v3.22.62 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2
5. **(继承 112 轮 #5, 优先级低)** README.md（根）vs books/README.md 数据声明不对称
6. **(本轮新发现, 优先级低)** 临时脚本 75 个仍存磁盘（gitignore 只是 git 不追踪，文件本身还在）；下一阶段如要彻底清理可 `rm -rf _*.py _*.json _*.txt`（但需要先确认无任何脚本被引用——目前 0 引用，可清理）
7. **(本轮新观察, 优先级低)** `git log --oneline -10` 显示上一轮 `0b2c775 chore(todo): round113 记账 ledger hash 完整字段化` 已存在但本轮 ledger 是 round112——命名存在 drift（0b2c775 commit message 说 round113，实际 ledger 文件是 round112.md）；下轮记账 commit message 需统一为 round113/114 等当前轮号

## 本轮 drift 状态

- `.gitignore` 散落模式：已修 ✓
- 全局 drift 计数：1 → 0
- git status 噪音：23 → 2 项
