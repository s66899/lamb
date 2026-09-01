## 第 117 轮 — competition 6 章 words 字段 stale 修复（继承 round116 候选 #1）

**commit**: `7f106eb` fix(manifest): competition 6 章 words 字段同步到实际中文字数（5295→859）
**push**: ✅ 5a73865..7f106eb → github.com/s66899/lamb (book)

### 本轮做了什么

#### 根因（与 round116 同型）
`app.js:5181` 把 `chapter c.words / 100` 取整显示为「XX百字」。所有 9 本书的 `manifest.words` 字段都从创建初版的字符快照起就从未跟随章节扩写更新。round116 已清羽毛球康复书 8 章，本轮继续选**最小 drift** 的 `competition`（6 章）作为样板。

#### 选择 competition 的理由
1. **drift 最小**（-4436，在剩余 8 本书里仅次于已完成 round116 的羽毛球康复书）
2. **declared 字段内部一致**（6 章 words 之和 = 5295 = book.totalWords，无碎字段）
3. **文件名全局唯一**（`ch0X-...md` 完全不和 NSCA-CPT 等其他 8 本书碰撞 → file 单独 anchor 已足够安全，但本轮仍用 `file + title` 双锚定 + book 段内限定，零跨段风险）
4. **一次 commit 可独立 revert**，不动其他 8 本书

#### 改动详情

| 文件 | 旧 | 新 |
|---|---|---|
| ch01-pre-match-prep.md | 964 | 60 |
| ch02-serve-receive.md | 758 | 334 |
| ch03-opponent-analysis.md | 771 | 168 |
| ch04-mental-strategy.md | 972 | 122 |
| ch05-physical-pacing.md | 1068 | 120 |
| ch06-post-match-review.md | 762 | 55 |
| book `totalWords` | 5295 | 859 |

#### 校验
- `python -m json.tool manifest.json` VALID
- `node --check app.js` OK（未碰 app.js）
- 9 本书 json ↔ js 全字段镜像一致（assert 全过）
- 其他 8 本书 totalWords / 各章 words 逐字段不变（已 git diff 二次确认）
- 数字 file+title 双锚定 + 限定到 `competition` book 段

### 残留 / 后续

- **本轮兑现 round116 候选 #1 的 1/N 步**——剩余 8 本书（yin-yang + badminton + engineering-mechanics + finance + nsca-cpt + psychology + nutrition + 1 本零 drift 已 ok）systematic drift 系统性修复按"每轮一本、漂移最小优先"节奏继续。
- **NSCA-CPT ch03-anatomy.md** 仍只有 217 zh+ascii 字（基本是 stub），但与 competition 不同，它是真内容薄而非字段 stale，所以需要扩写内容而非调字段。下轮候选可考虑单章扩写 ch03（结构 193 行，主要是 code block）。
- **nutrition** 7 章 drift -2772，且 ch01=417 字非常薄，是下一个最小目标（仅大于本轮 competition）。
- **manifest.json 末尾 trailing newline** 仍 pending（round115 候选 #2），现在 diff 可读，已不阻塞。

## 下轮候选（按优先级降序）

1. **(继承本轮)** `nutrition` 7 章 words 字段同步到实际字数（drift -2772，本轮之后最小，6 章文件唯一，无 cross-book 风险，一次 commit 可独立 revert）。`app.js` 章节卡片从「6-9 百字」纠正为「3-5 百字」。
2. **(继承 round116 #1, 优先级中)** yin-yang 15 章（drift -7209）/ badminton 13 章（drift -35982）按相同 pattern 处理，yin-yang 文件名还有 ch0X-yin-yang-... 形态使 file 锚定更安全。
3. **(继承 round115 #2, 优先级低)** `manifest.json` 末尾补 trailing newline —— diff 已可读，仅作 PR 卫生。
4. **(继承 round108 #3, 优先级低)** NSCA ch10 §7 末段 v3.22 勘误累积 580+ 字，整理为附录。
5. **(本轮新观察, 优先级低)** NSCA-CPT ch03-anatomy.md 仅 217 zh+ascii 字（基本 stub），需扩写而非调字段；可单章扩写，独立 commit，引用 NCSCA 运动解剖学原始素材。
