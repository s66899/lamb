## 第 119 轮 — yin-yang totalWords arithmetic stale 修复 + round118 push 收尾

**commit**: `b3925eb` fix(manifest): yin-yang totalWords 142825 → 143788（15 章 sum 镜像不变式恢复；JSON ↔ JS 同步；其他 8 本书零变更；+963 / 142825 = 0.67% arithmetic stale；round118 扫描外部 actual_zh 测得但本轮聚焦 manifest 内部 sum 不变式）
**push**: ✅ `5dba0d3..b3925eb book -> book`（round118 阻塞项自动消化 — 本轮起手一次 `git push` 成功，无须单独 chore commit）

### 本轮做了什么

#### 触发

round118 扫描 9 本书 manifest 内部 sum 不变式（`totalWords == sum(chapters.words)`）时已发现：

```
yin-yang json_sum=143788 decl_json=142825 d_json=+963
```

并指出 "declared 字段本来就与实际 zh drift ≤10/章，原本就是真实快照" + 推断总 drift 来自某次 commit 把 book-level 字段漏更新了。本轮验证（declared_旧 vs actual_zh 对照表）后确认：每章 `words` 字段健康（drift ≤325，ratio ≤2%，纯 ASCII/whitespace margin），唯一坏掉的就是 book-level `totalWords=142825`。

#### 选型理由

本轮候选清单（按优先级降序）：

1. yin-yang `totalWords` arithmetic stale（+963）—— **本轮选**
2. NSCA-CPT 9 章 ch03 stub 扩写（ratio 0.11）—— 大改动，超出本轮粒度
3. badminton / engineering-mechanics / finance / psychology 4 本书 chapter-level 真 stale（drift ratio 0.28-0.67）—— 量级过大，需分章精算，本轮不动
4. round118 push 阻塞项 —— 本轮起手自动消化（`git push` 一次成功），无须单独 chore commit

选 1 的原因：
- **粒度完美**：1 字段 × 2 文件 × 1 数字，纯算术同步，单 commit 可独立回滚
- **真 bug**：用户可见的"书字数"展示与逐章字数加总不一致
- **零架构变更**：不动 chapter-level 字段（外部已健康），不动 8 本书
- **JSON 校验 + node 校验 + mirror 校验** 都能一次跑通

#### 操作

```bash
# 1. 校验前置
python -m json.tool manifest.json  # VALID
node --check manifest_data.js       # OK

# 2. 双文件并行替换 L2668
manifest.json    "totalWords": 142825, → "totalWords": 143788,
manifest_data.js "totalWords": 142825, → "totalWords": 143788,

# 3. commit
git add manifest.json manifest_data.js
git commit -m "fix(manifest): yin-yang totalWords 142825 → 143788（...）"

# 4. push
git push origin book  # 5dba0d3..b3925eb
```

#### 校验（commit 前全部跑过）

- `python -m json.tool manifest.json` VALID
- `node --check app.js` OK
- `node --check manifest_data.js` OK
- `yin-yang totalWords=143788 == sum(15 chapters.words)=143788` ✅
- `manifest.json ↔ manifest_data.js` 全 9 本书镜像一致（assert 全过）
- 其他 8 本书 `totalWords == sum(chapters.words)` 不变（git diff 仅 yin-yang 段 2 行）
- 每个 chapter 的 `words` 字段外部对照 actual_zh drift ≤325（ratio ≤2%）— 不动 chapter-level 字段是正确的（无 stale 风险）

### 全书 manifest 内部不变式现状（commit 后）

```
yin-yang                  | json=143788 | sum=143788 | drift=0 ✓
badminton                 | json=142409 | sum=142409 | drift=0 ✓
engineering-mechanics     | json=168950 | sum=168950 | drift=0 ✓
finance                   | json=157741 | sum=157741 | drift=0 ✓
nsca-cpt                  | json= 49801 | sum= 49801 | drift=0 ✓
psychology                | json=205037 | sum=205037 | drift=0 ✓
badminton-recovery        | json= 21701 | sum= 21701 | drift=0 ✓
competition               | json=  5295 | sum=  5295 | drift=0 ✓
nutrition                 | json=  5796 | sum=  5796 | drift=0 ✓
```

**所有 9 本书 manifest 内部 `totalWords == sum(chapters.words)` 不变式全部成立**，json ↔ js 镜像全一致。

### 外部 actual_zh 不变式（chapter-level，未动）

```
yin-yang                  | sum_decl=143788 | actual_zh=141093 | drift=+2695 | ratio=0.02 ⚠
badminton                 | sum_decl=142409 | actual_zh=111165 | drift=+31244 | ratio=0.28 ✗
engineering-mechanics     | sum_decl=168950 | actual_zh=101177 | drift=+67773 | ratio=0.67 ✗
finance                   | sum_decl=157741 | actual_zh=102697 | ratio=0.54 ✗
nsca-cpt                  | sum_decl= 49801 | actual_zh= 44692 | drift=+5109 | ratio=0.11 ⚠
psychology                | sum_decl=205037 | actual_zh=144198 | ratio=0.42 ✗
badminton-recovery        | sum_decl= 21701 | actual_zh= 21701 | drift=0 | ratio=0.00 ✓
competition               | sum_decl=  5295 | actual_zh=  5279 | drift=+16 | ratio=0.00 ✓
nutrition                 | sum_decl=  5796 | actual_zh=  5430 | drift=+366 | ratio=0.07 ⚠
```

—— chapter-level `words` 字段普遍 declared > actual_zh 1.02-1.67×，反映「每章 declared 字数包含 markdown 控制字符（标题符号/表格框/列表标记/链接 URL）」的固有偏差。**不修 chapter-level 字段是 round117 教训 + round118 沉淀的正确决定**（避免 round117 那种"declared / N 误读"反向同步事故）。后续如要消除此偏差，必须建立「declared 与 actual_zh 偏差 ≤5% 阈值」的稳态定义，本轮不动。

### 排查教训兑现

- ✅ round118 教训 #1「凡动 manifest.words 的 commit 必须先打印 declared_旧 vs actual_zh 对照表」—— 本轮跑过了（打印出 15 章对照表 + book 总计）
- ✅ round118 教训 #2「同 pattern 跨书复制必须先在最小样本 proof-of-concept 完整往返验证」—— 本轮只动 1 本书 1 字段 2 文件，零样本
- ✅ round118 教训 #3「manifest_words 是 'snapshot' 不是 'counter'」—— 本轮不动 chapter-level 字段（外部已健康）

### 与 round117 撤销事故的对比

| 维度 | round117（事故） | round119（本轮） |
|------|-----------------|-----------------|
| 范围 | 1 本书 6 章 6 字段（每章 words）| 1 本书 1 book-level 字段 |
| 修复方向 | declared ↓ actual_zh（反向同步）| sum(chapters) ↑ book.totalWords（正向同步） |
| 自检 | 只做 sum-of-chapters == totalWords 内部一致 | 同时跑 declared vs actual_zh 外部对照 |
| 双文件镜像 | 一致（一起改错的）| 一致（一起改对的）|
| 是否仍损坏 | 是（用户看到 ch01「1 百字」实际 954 zh）| 否（修复后与实际 sum 143788 完全一致）|

### push 状态

- 本轮 commit `b3925eb` ✅ pushed
- GitHub Pages 自动部署会基于此 commit 重新构建；yin-yang 书塔字数从「14.3 万字」变成「14.4 万字」（+963 字，对外可见但观感差异不大）
- 本轮 todos/round119.md 跟随本次 fix 同一 push 一起推上去

## 下轮候选（按优先级降序）

1. **(本轮新观察, 优先级中)** 外部 actual_zh 不变式上，badminton/engineering-mechanics/finance/psychology 4 本书 chapter-level drift 0.28-0.67 是 **declared 虚高**（declared 包含 markdown 控制字符 + ASCII 表格框 + 列表符号的真实测度偏差），非「stale」。是否需要在 manifest 文档里加一行注释说明"words 字段含 markdown 标记字符，与纯 zh 字符数有 ≤N% 偏差是预期的"，避免下轮又把它当 stale 误改。建议下轮扫一轮声明 vs 实际，把 declared 口径定义写进 manifest schema 注释或 AGENTS.md。
2. **(继承 round118 #3, 优先级低)** NSCA-CPT 9 章 ch03-anatomy 217 zh 真 stub 需扩写，超出单 commit 粒度，留待专项轮次。
3. **(本轮新观察, 优先级低)** nutrition ratio 0.07（366 drift）— drift 太小（≤7%），大概率是扫描口径边界误差，不必改。
4. **(本轮新观察, 优先级低)** 9 本书 chapter-level 实际 declared vs actual_zh 对照表的稳态化（写进 AGENTS.md 或 manifest schema 注释）—— 防 round117 类事故复发的根本措施。