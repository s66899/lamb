# 第 84 轮记账

**本轮做了什么**：
- `books/README.md` L21 羽毛球康复指南字数 `2.07 万` → `2.1 万`
- 追平 83 轮 L11 总字数已用 1 位小数的惯例（89.9 / 89.86）
- 让 9 本书表全部统一 1 位小数：
  - 14.2 / 15.8 / 20.5 / 16.9 / 14.3 / 5.0 / **2.1** / 0.5 / 0.6
- 真实数据：badminton-recovery 8 章累加 20742 字 → 2.0742 万 → 1 位 = 2.1

**校验**：
- `python -m json.tool manifest.json` → OK ✓
- `file books/README.md` → "Unicode text, UTF-8 text" 无 CRLF ✓
- `git diff --stat` → `1 file changed, 1 insertion(+), 1 deletion(-)` ✓
- manifest badminton-recovery 8 章累加 20742 字 = 2.0742 万 ≈ 2.1 万 ✓
- 零业务代码改动 / 零 ex-lib id 改动 / audit 0 drift 不变 / APP_VERSION 不 bump
- 可独立回滚：`git revert HEAD`

**commit hash**：（待 commit 后填）

**下轮候选**：
1. (继承 71~83 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短
2. (继承 71~83 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄，留观
3. (继承 71~83 轮, 优先级低) NSCA-CPT ch10 §七末段四次勘误 blockquote 累积
4. (继承 80~83 轮, 优先级低) `_append_todo_round78.{py,md}` 缺失
5. (本轮新发现, 优先级低) 根 README.md L10 也有类似「v3.22.62 · 9 本书 / 97 章 / X 万字」
   字面量，需对照根 README 内部一致性