# 第 144 轮 — yin-yang 子目录补 README.md

**起点状态**：HEAD = `a3f562f`（round143 记账：badminton-recovery README ex-lib 总数 216→219 顶层汇总行滞后修复），working tree clean，branch `book`，APP_VERSION = v3.22.63（drift 0/0）

## 本轮做了什么

**选题过程**：先按指令跑真实状态扫描，逐条排除上轮留下的候选 + 探索新候选：

1. ~~候选 #1「badminton-recovery 内容深化」~~ → round142/143 已修复 ch04 红旗信号、ch06/ch07 SMR 库条数描述附注、README 顶层汇总行 1:1 对齐；ch02-shoulder（v3.22.55 已修数字声明）、ch03-knee（v3.22.24 已修）、ch04-ankle（round142）、ch05-elbow（v3.22.28）、ch06-back（v3.22.22）、ch07-achilles（v3.22.35）、ch08-action-plan（v3.22.23）全部已落地；无明显可改处
2. ~~候选 #2「NSCA ch10 SMR 条目补入库」~~ → 库内 5202~5213 共 12 条 + 2202~2209 共 8 条泡沫轴，合计 20 条 SMR 专项条目均已在 v3.22.17 + v3.18.2 入库；本章 §2.1 12 条引用表全合法，腰部 foam roller 仍无专项条目，按用户偏好「不要伪造 id」明确不补
3. ~~候选 #3「ex-lib broken id 扫表」~~ → 上轮 round143 已实测全 107 文件 / 582 token / 140 unique id / broken 0；本次复跑确认仍 0 broken
4. APP_VERSION 5 维度体检 → app.js `v3.22.63` / index.html 3 处 `?v=v3.22.63` / VERSION 头注释 `v3.22.63` / README.md L236 `v3.22.63` / books/README.md L11 `v3.22.63` — **5 处全部一致**，drift 0/0 ✓
5. **新发现 #4「9 本书 README 对齐扫表」** → 扫 `books/<book>/README.md` 存在性 + 章节声明数 vs 实际 `ch*.md` 文件数，发现 1 处真实缺失：

| 书 | README.md 存在 | 实际 ch*.md | 章节预览段 | 状态 |
|---|---|---|---|---|
| badminton | Y | 13 | 「第一章」~「第十三章」13 项 ✓ | OK |
| badminton-recovery | Y | 8 | 8 项 ✓ | OK |
| competition | Y | 6 | 1.~6. ✓ | OK |
| engineering-mechanics | Y | 12 | 12 项（ch03 标注「暂未创作」） ✓ | OK（round140 已修） |
| finance | Y | 13 | 13 项 ✓ | OK |
| nsca-cpt | Y | 10 | 表格 10 行 ✓ | OK |
| nutrition | Y | 7 | 1.~7. ✓ | OK |
| psychology | Y | 13（含 ch02-memory + ch02-memory-textbook 扩展版） | 12 项（ch02 一项覆盖两个文件） | OK（双文件共享 1 个目录项是设计） |
| **yin-yang** | **N** | **15** | **缺失** | **❌ 真实缺失** |

**最终选定**：为 `books/yin-yang/README.md` 新建最小化 README，对齐 competition/nutrition 简洁模板（一句话简介 + 章节结构有序列表），但额外给每章加相对链接（更友好，且根 README §「九本书目录」预览段本就是有链接的）：

- 15 个章节标题与根 README §「☯️ Lamb 的阴阳 · 手面相与八卦」L76-L96 的目录预览 **1:1 完全对齐**（`diff` 验证 0 差异）
- 15 个 `./chXX-*.md` 相对链接全部命中真实文件（脚本逐个 stat 验证，15/15 OK）
- 文件 23 行 / 1040 B，单 commit 可独立回滚
- 不动 5 维度 APP_VERSION（纯文档新增，无业务代码 / 数据结构 / 兼容性影响）

**为什么不放在根 README §「九本书目录」里**：根 README 已经有 yin-yang 15 章完整目录预览，问题是子目录进 yin-yang/ 后没有任何 README，跟其他 8 本书不一致 —— 用户在 GitHub 网页直接进子目录、或 clone 后用 IDE 浏览时，会看到 yin-yang/ 是个孤立的"裸章节目录"。本轮修复的是**子目录层级的 README 缺失**，与根 README 的"九本书目录"是两层独立问题，互不替代。

**为什么不 bump APP_VERSION**：纯文档新增（新增一个 README 文件），零业务代码 / 数据结构 / 兼容性影响，与 round143 同型。

## 校验

- `git diff --stat`: `books/yin-yang/README.md | 23 +++++++++++++++++++++++`（1 file / +23）✓
- 15 个相对链接全部命中：`grep -oE './ch[0-9]+-[a-z0-9-]+\.md' | xargs -I{} test -f` → 15/15 OK ✓
- 15 个章节标题与根 README §「☯️ Lamb 的阴阳 · 手面相与八卦」段 `diff` 验证 → **0 差异** ✓
- 9 本书 README 存在性复跑 → 全 9 本 Y ✓
- APP_VERSION 5 维度一致性：app.js / index.html（3 处 ?v=）/ VERSION / README.md L236 / books/README.md 全部 v3.22.63，drift **0/0** ✓
- `node --check` 未涉及（纯 .md 新增）✓
- `python -m json.tool` 未涉及（未触及 .json）✓

## 留给下轮候选

1. **badminton-recovery 内容深化（任一薄处）**：当前 8 章全部已有完整结构 + 红旗信号 + 4/8/12 周时间线 + ex-lib 引用，下轮可选小切入点：ch01 总览章加「6 大损伤速查表」（目前只有「6 大损伤占比数据来源」附录），或 ch08 行动清单章加「不同年龄段（青少年/成人/老年）训练负荷调整」表
2. **engineering-mechanics ch03 真正补章节**：round140 只在 README 把 ch03 标为"暂未创作"，实际 ch03-shear-and-torsion.md 文件缺失；下轮可补真实内容（约 4000-6000 字）
3. **finance ch11-financial-market.md 主题与 ch01 重叠**：两章都叫"金融市场"，需扫表确认 ch11 是否真的讲不同主题（衍生品？国际市场？）还是 ch01 误存副本
4. **psychology ch02 双文件**：ch02-memory.md + ch02-memory-textbook.md 共享一个目录项，下轮可扫表确认 textbook 版是 memory 章节的扩展附录还是独立内容
5. **继续维护 yin-yang**：若用户后续对阴阳章节有反馈，可加 H1/链接修正或子目录组织
6. **NSCA-CPT 内容深化**：ch10 SMR 表已 12 条，但 ch09 损伤预防章的「6 大康复体系」是否完整覆盖 6 大损伤部位（肩/膝/踝/肘/腰/跟腱），下轮可扫表确认覆盖完整性
