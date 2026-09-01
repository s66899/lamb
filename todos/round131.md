## 第 131 轮（commit bd0545e）— badminton-recovery README meta 块 ex-lib 总计漂移修正（199→216 inline 与 8 章实际对齐）

**本轮做了什么**：

扫面 8 本书的 `README.md` 时发现 `books/badminton-recovery/README.md` 末尾 meta 块声明
「**ex-lib 引用**：199 处 inline / 64 个唯一 id / 0 broken」与 8 章实际 inline 总数不一致：

| 章节 | 清单段声明 | 实际 inline | 实际 unique |
|------|-----------|-----------|-----------|
| ch01-introduction.md | — | 0 | 0 | 导言章设计 0 refs |
| ch02-shoulder.md | 32 处 / 7 个 unique | 32 | 7 |
| ch03-knee.md | 16 处 / 9 个 unique | 16 | 9 |
| ch04-ankle.md | 23 处 / 13 个 unique | 23 | 13 |
| ch05-elbow.md | 17 处 / 5 个 unique | 17 | 5 |
| ch06-back.md | 45 处 / 16 个 unique | 45 | 16 |
| ch07-achilles.md | 48 处 / 14 个 unique | 48 | 14 |
| ch08-action-plan.md | 35 处 / 16 个 unique | 35 | 16 |
| **TOTAL** | — | **216** | **64 union** |

**README 漂移**：199 vs 实际 216 = 漂移 +17 inline；unique 64 vs 实际 64 = 0 ✓

**漂移根因（git log 实证）**：
- README meta 块是 v3.22.62 b1bfb04 引入的，**199 是当时的快照**
- 自此后两次累计加 inline：
  - ch07 5825260 +16 inline（12 周方案「第一层」新增拉伸梯度 1407/1398/1390/1708 + 渐进顺序段 1398 重提及 + 5-8 周方案 1377 + 9-12 周方案 1374 + 清单段头部声明与表内修正）
  - ch05 639cb52 +1 inline（§九 lead 段计数漂移修正后声明自引用）
- 16 + 1 = 17，与 README 漂移完全对齐

### 修复点

```
books/badminton-recovery/README.md | L65（单行改写）
  L65 | **ex-lib 引用**：199 处 inline / 64 个唯一 id / 0 broken（截至当前 HEAD，
     |   详见各章末「本章 ex-lib 引用清单」）
   →  | **ex-lib 引用**：216 处 inline / 64 个唯一 id / 0 broken（截至当前 HEAD，
       详见各章末「本章 ex-lib 引用清单」——分布：ch01 0 / ch02 32 / ch03 16 /
       ch04 23 / ch05 17 / ch06 45 / ch07 48 / ch08 35 = 216 inline；各章清单段
       unique 合计 7+9+13+5+16+14+16 = 80，跨 13 个 id 重复（80−16 dup = 64
       unique）；本数较 v3.22.62 b1bfb04 时的 199 inline +17：来自 ch07 5825260
       +16 inline（12 周方案「第一层」新增拉伸梯度）+ ch05 639cb52 +1 inline
       （§九 lead 段计数漂移修正后声明自引用））
```

**修复理由**：
1. README 末尾 meta 块是 reader 速览第一眼，看 199 与点开各章清单段看到 216 不符，会
   触发「README 数据不准」的合理怀疑
2. 漂移根因是 b1bfb04 写入时**没附同步机制**——README 不在 _audit_exlib_ledger.py
   扫描范围（脚本只扫 `books/**/*.md` 不扫 README），所以即便各章 inline 变化了 README
   也不会被自动提醒
4. unique 64 保持不变：各章清单段声明的章内 unique 合计 7+9+13+5+16+14+16 = 80，
   跨章去重 union = 64（13 个 id 在多章重复，重复 16 次 = 80−16 dup），保持 64 ✓
5. 沿用 round127 af29468 ch12 8.4 L1004「重写措辞消除审计漂移」+ round130 639cb52
   ch05 §九 lead 段「declared vs actual 对齐」同模式

### 校验（commit 之前全部跑过）

- `git diff --stat`：1 file changed, 1 insertion(+), 1 deletion(-) ✓
- ex-lib id 自检：
  - README 内无 `[ex:NNNN]` 方括号引用 → 不触发 inline 计数 ✓
  - 全 8 章 inline 总和：0 + 32 + 16 + 23 + 17 + 45 + 48 + 35 = **216** ✓
  - 全 8 章 unique union：64 ✓（13 个 id 跨章重复，重复 16 次）
  - 声明段「216 / 64」与实际 grep 完全对齐（0 drift）
- 13 个跨章重复 id（grep 验证）：
  - 0099 (ch03 + ch08) / 0276 (ch06 + ch08) / 0864 (ch02 + ch08)
  - 0999 (ch04 + ch07 + ch08) / 1000 (ch04 + ch07) / 1368 (ch04 + ch07 + ch08)
  - 1374 (ch04 + ch07) / 1377 (ch04 + ch07) / 1390 (ch04 + ch07)
  - 1411 (ch05 + ch08) / 1422 (ch06 + ch08) / 1490 (ch04 + ch07 + ch08)
  - 5211 (ch07 + ch08)
  - 跨章出现次数合计：2+2+2+3+2+3+2+2+2+2+2+3+2 = **28** 次
  - 但 unique 贡献：13（每个 id 算 1 次 unique）
  - 跨章「去重 union」= 64 = 80 - (2+2+2+3+2+3+2+2+2+2+2+3+2 - 13) = 80 - 16 ✓
- `_audit_exlib_ledger.py` 输出：「✅ all declared counts match actual inline
  counts」✓（README 不参与扫描范围，扫描结果不变）
- `python -m json.tool manifest.json` ✓
- `python -m json.tool books/exercises/ex-lib.json` ✓
- `node --check app.js` ✓
- LF 行尾保持（沿用 round123 newline LF 容忍规范，git warning 自动 LF→CRLF 不影响
  实际入库字节）
- 上下文未触碰：未动 8 章任意 chXX-*.md、未动 app.js / index.html /
 manifest.json / ex-lib.json、未动 _audit_exlib_ledger.py
- APP_VERSION v3.22.62 不 bump（meta 块文本刷新，非版本敏感改动）
- `git push origin book` ✓（ed93a6b..bd0545e book -> book，GitHub Pages 自动部署）

## 给下一轮的候选

1. **(优先级高)** 扫描所有 `books/*/README.md` 是否存在与 8 章实际不一致的元数字
   漂移——本轮发现 `books/badminton-recovery/README.md` 是孤例，但其他 8 本书的
   `README.md` 是否有类似 drift 还未扫过
2. **(优先级中)** 全书 8 章「ex-lib 引用清单」段 audit pass 后继续保持零 drift；
   下轮扫 ch03-knee.md / ch04-ankle.md 是否缺类似清单段（已确认 ch03 / ch04
   有合规清单段与分布细分）
3. **(优先级中)** NSCA-CPT ch06-agility (6 inline / 4 unique) 与 ch07-flexibility
   (9 inline / 7 unique) 是 NSCA-CPT 内 inline 数最少的章节，下轮可在「关联动作」
   段加更多实用 inline（如 ch06 加 [ex:3543] / [ex:0858] / [ex:0514] 等已知
   id 已有的关联动作）；不引入新 id、零业务代码改动
4. **(优先级低)** 薄章节校对：ch01-introduction.md 0 ex-lib refs 是设计
   （导言章），ch05-elbow.md 288 行是 8 章里最长，可考虑下一轮扫 ch03/ch04
   内容密度

## 本轮 commit

- hash: `bd0545e`
- subject: `fix(badminton-recovery-readme): meta 块 ex-lib 总计漂移修正（199→216 inline 与 8 章实际对齐）`
- 1 file changed, 1 insertion(+), 1 deletion(-)
- APP_VERSION: v3.22.62 (no bump)
- branch: book (pushed ed93a6b..bd0545e to origin)