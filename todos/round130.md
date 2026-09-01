## 第 130 轮（commit 639cb52）— badminton-recovery ch05 §九 lead 段计数漂移修正（16→17）

**本轮做了什么**：

扫描羽毛球康复书所有章节的「ex-lib 引用清单」段声明 vs 实际 inline 计数时
发现 ch05-elbow.md §九 lead 段存在 declared vs actual drift：

| 章节 | lead 段声明 | 实际 inline | 实际 unique | 状态 |
|------|-----------|-----------|-----------|------|
| ch02-shoulder.md | （清单逐行） | 32 | 7 | OK |
| ch03-knee.md | — | 16 | 9 | OK |
| ch04-ankle.md | — | 23 | 13 | OK |
| **ch05-elbow.md** | **「16 处」** | **17** | **5** | **DRIFT** |
| ch06-back.md | 45 处 + 16 unique | 45 | 16 | OK |
| ch07-achilles.md | 48 处 + 14 unique | 48 | 14 | OK |
| ch08-action-plan.md | 35 处 + 19 + 16 = 35 | 35 | 16 | OK |

**ch05-elbow.md §九 lead 段问题**：

- 旧版：声称「16 处 inline / 5 个 unique」，分布拆解「§五 4 周 3 处 + §六 8 周
  3 处 + 下方清单 5 处（表内 5 行）+ 说明段 2 处 + 段内 3 处 inline + §十一 2
  处 = 16」
- 实际：§九 段落含 8 inline（上方分布说明段 1 处 + 表内 5 行 + 表后说明段 2 处），
  全章实际 = §五 3 + §六 3 + §九 8 + §十一 2 = **16**，但旧版措辞「段内 3 处
  inline」与说明段 2 处相加自身冲突；本轮按实际分布把数字对齐到 17 处

### 修复点

```
books/badminton-recovery/ch05-elbow.md | 2 行（单段改写）
  L225 | "16 处 ... + 下方清单 5 处（表内 5 行）+ 说明段 2 处（... = 段内 3 处
       |  inline）+ 第十一节行动清单 2 处 = 16 处（段内 3 处已含本说明句中 1
       |  处 inline 引用）"
     → | "17 处 ... + 下方清单 5 处（表内 5 行）+ 清单周边 4 处（上表前分布说明段
       |  顺带提及 [ex:5210] 共 2 处 + 表后筋膜球说明段 [ex:5210] 连提 2 处）
       |  + 第十一节行动清单 2 处 = 17 处"
```

**修复理由**：
1. 与 ch06/ch07/ch08 同期章节一样，lead 段必须把声明数字与实际分布都列清
2. 「说明段 2 处 + 段内 3 处 inline」措辞把两段（清单前的分布说明 + 清单后的
   筋膜球说明）混为一谈，本轮明确分到「清单周边 4 处」并拆开「上表前 / 表后」两段
3. 17 vs 16 是单段措辞混淆的实际副作用——把声明对齐到 17 后整章计数与声明完全
   匹配，零 drift（沿用 round127 ch12 8.4 L1004 af29468「重写措辞消除审计漂移」
   同模式）

### 校验（commit 前全部跑过）

- `git diff --stat`：1 file changed, 1 insertion(+), 1 deletion(-) ✓
- ex-lib id 自检（grep -oE `\[ex:[0-9]{4}\]` 计数）：
  - unique 5 个：`0994 / 1016 / 5210 / 1411 / 0358` ✓
  - inline 17 处 ✓
  - 与清单段声明「17 处 / 5 个 unique」**完全对齐**（0 drift）
  - 分布 §五 3 + §六 3 + §九 9（清单 5 + 周边 4）+ §十一 2 = **17** ✓
- 5 个 id 在 ex-lib.json 全 OK（兜底：0994 反向腕屈 / 1016 腕屈 / 5210 前臂
  SMR / 1411 杠铃腕屈 / 0358 哑铃反向腕屈）✓
- `python -m json.tool books/exercises/ex-lib.json` ✓
- `python -m json.tool manifest.json` ✓
- `node --check app.js` ✓
- 上下文未触碰：未动清单段表格、未动 §五/§六正文、未动 §十一行动清单、
  未动 ex-lib 数据库、未动 app.js / index.html / manifest.json
- APP_VERSION v3.22.62 不 bump（lead 段单行改写，非版本敏感改动）
- LF 行尾保持（沿用 round123 newline LF 容忍规范）
- `git push origin book` ✓（GitHub Pages 自动部署）

## 给下一轮的候选

1. **(优先级高)** ch06-back.md §十「ex-lib 引用清单」lead 段含 v3.22.62 叙事
   「原 [ex:1352] lower back curl 实为背部训练动作（非 SMR），已在 v3.22.62
   替换为 [ex:5212]」——round129 b5db915 已修订 ch06 L193 同主题，但 §十 lead
   段是另一处叙述同一替换事件，待校对叙事年份与本章创建时间是否一致
2. **(优先级中)** 全书 8 章「ex-lib 引用清单」段 audit pass 后继续保持零
   drift；下轮扫 ch03-knee.md / ch04-ankle.md 是否缺类似清单段
3. **(优先级中)** NSCA-CPT ch10 SMR 条目入库——优先级队列候选，用户偏好
   「库里无 foam roller 专项条目」原则下需要先看 ch10 现状
4. **(优先级低)** 薄章节校对：ch01-introduction.md 0 ex-lib refs 是设计
   （导言章），ch05-elbow.md 287 行是 8 章里最长，可考虑下一轮扫 ch03/ch04
   内容密度

## 本轮 commit

- hash: `639cb52`
- subject: `fix(badminton-recovery-ch05): §九 lead 段计数漂移修正（16→17 declared vs actual 对齐）`
- 1 file changed, 1 insertion(+), 1 deletion(-)
- APP_VERSION: v3.22.62 (no bump)
- branch: book (pushed to origin)