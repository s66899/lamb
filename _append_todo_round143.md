# 第 143 轮 — 兑现 round142 9572a68 遗留：badminton-recovery README 顶层汇总行滞后修复

**commit hash**: `79c490f` (1 file changed, +1/-1)

## 本轮做了什么

扫描 `books/badminton-recovery/README.md` 第 65 行 ex-lib 汇总声明，发现与 ch06/ch07 章内「本章 ex-lib 引用清单」声明脱节：

| 项 | README 旧值 | 章内实测 | 差值 |
|---|---|---|---|
| ch06 inline | 45 | **46** | +1 |
| ch07 inline | 48 | **50** | +2 |
| 合计 inline | 216 | **219** | +3 |
| unique id | 64 | 64 | 0 ✓ |

## 根因

`round142 9572a68 fix(badminton-recovery): ch06/ch07 SMR 库条数描述附注` 在 ch06/ch07 章内 `## 九、本章 ex-lib 引用清单` 段新增了 v3.22.64 SMR 库条数描述附注，分别新增 +1（[ex:5212]）/ +2（[ex:5205]）inline 引用，但只改了章内，未同步 README 顶层汇总行。

## 修复

单文件 1 行修复 `books/badminton-recovery/README.md` L65：
- `216 处 inline` → `219 处 inline`
- `ch06 45` → `ch06 46`
- `ch07 48` → `ch07 50`
- `+17` → `+20`
- 末尾追加 `+ ch06/ch07 9572a68 +3 inline（v3.22.64 SMR 库条数描述附注：ch06 §十清单说明段 +1 处 [ex:5212] foam roller thoracic spine、ch07 §十清单说明段 +2 处 [ex:5205] foam roller calves）`

64 unique id 数 / 13 个 id 重复 / 80−16 dup = 64 等其他维度声明均不变（脚本扫表验证：13 个跨章重复 id → 10 个跨 2 章 + 3 个跨 3 章 → 累计 16 dup 与公式一致）。

## 校验

- `node --check app.js` ✅
- `node --check manifest_data.js` ✅
- `python -m json.tool manifest.json` ✅
- badminton-recovery ex-lib 扫描：219 inline / 0 broken / 库内合法 1336 个 id
- 5 维度 APP_VERSION 一致性：app.js L28 / index.html L24+228+229 / VERSION 头部 / books/README 仍为 v3.22.63（README 未涉及 APP_VERSION，本轮不 bump）
- drift 0/0

## 遗留候选（留给下轮）

1. （继承 141/142 轮，优先级中）`_session_todo.md` 78 轮双写 `_append_todo_round78.{py,md}` 在 HEAD 缺失，与 73~77/79~97 轮惯例不同
2. （继承 141/142 轮，优先级低）NSCA-CPT ch10 §七末段 v3.22.17/62/72/74 四次勘误 blockquote 累积 580+ 字 — round138 已合并 72/74 两段，剩余 17/62 两段仍占篇幅，可远期整理为附录
3. （本轮新发现，优先级低）**本轮 README 修复经验揭示一个 pattern**：book README 顶层汇总行与章内「清单」声明是两份独立维护的源码，chapter-level 修复时易遗漏 README 汇总行。下次任何 chapter-level 修改后应顺手 `git diff HEAD~ -- books/*/README.md` 比对一次
4. （本轮新发现，优先级低）`_valid_ids.txt` 是 4 位裸数字，不是 "ex-NNNN" 格式；前几轮 fast_context / scan 工具可能有兼容脚本假设了 "ex-" 前缀（如本轮 `python3 -c` 第一次失败就是因 `ex-` 前缀假设），建议在 `_valid_ids.txt` 头部加一行 `# format: bare 4-digit, prefix ex- when querying` 或创建 `_valid_ids_with_prefix.txt` 镜像文件