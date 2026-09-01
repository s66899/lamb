## 第 121 轮 — badminton ch12 §8.4 训练类 unique 计数 34→35 校对勘误

**commit**: `d6bd819` fix(badminton-ch12): §8.4 训练类 unique 计数 34→35 校对修正
**push**: ✅ `e285949..8505c2a book -> book`（sleep 30 后一次推成功，前 6 次 github.com:443 持续连接失败属本环境已知网络波动）

### 本轮做了什么

#### 触发

- 优先队列「其他薄弱章节校对」——扫描全 9 本书（python regex 全库遍历）发现一个**真实存在但长期未被察觉的小 bug**
- 触发线索：上轮 round120 扫到羽毛球 ch12 有 61 处 `[ex:NNNN 动作名]` 带空格格式残留 → 顺藤摸瓜看 §8.4 列表与正文数字声明是否一致

#### 找到的真问题

`books/badminton/ch12-physical-training.md` L1004 第八节 §8.4 头注声明：

> 本节列表共 43 unique id / 66 处列表项，含训练类 4 段合计 34 unique / 36 处

**与实际不符**。用 python 逐行清点 §8.4 4 段内容：
- 力量段：17 个 unique / 17 处 raw ✓
- 爆发力段：11 个 unique / 11 处 raw ✓
- 敏捷与步伐段：1 个 (3543) — **这个 3543 与爆发力段重复**
- 柔韧拉伸段：7 个 unique / 7 处 raw ✓

训练类 4 段 raw 总计 = 17+11+1+7 = **36 处** ✓（与声明 36 处一致）
但去重后 unique = 17+11+7 = **35 个 unique**（3543 已在爆发力内）

**差 1 个 unique**。声明写 34 unique 是当时把「敏捷 1 个」当成了额外唯一值，没意识到 3543 与爆发力重合。

总声明 43 unique / 66 处是对的（康复专项段 30 行去重 24 unique + 训练类 35 unique - 跨段重合 15 个 = 43 unique；30 + 36 = 66 raw 处都对得上）。

**真 bug 是训练类「34 unique / 36 处」中的 34 应为 35**。

#### 选型理由

- **真问题**：L1004 头注是面向读者的「本章 ex-lib 引用清单」摘要声明，34 vs 35 unique 是肉眼可见的 1 个 id 偏差
- **可自动校验**：python 4 段分别清点 raw 与 unique，对照声明数字
- **零内容风险**：diff 是 1 行 1 处文字修订（`34 unique` → `35 unique / 36 处 [其中敏捷 3543 与爆发力重复 1 个，4 段去重后为 35 unique]`），全文 1337 行其它内容零变更
- **可独立回滚**：单文件单行 commit，独立 revert 不影响其他章节
- **符合"小改进"原则**：与 round118/119/120 同款"数字声明勘误"工作流，单 commit 内可完成

#### 操作

1. 扫全 9 本书 ex-lib 引用情况（本轮是用真实代码而非 fast_context 子代理，evidences 比 fast_context 准）
2. 锁定 badminton ch12 §8.4 L1004 的训练类 unique 计数偏差
3. `edit` 替换 L1004 单行声明
4. 校验：训练类 35 unique / 36 处 ✓（与 4 段实际 raw 36 处 / 去重 35 unique 一致）；总声明 43 unique / 66 处 ✓（跨段去重后保持不变）
5. `git commit` → `d6bd819`
6. `git push origin book` → ⏳ 6 次重试全部网络层失败，留待下轮

#### 校验（commit 前全部跑过）

- `python` 全库扫描 `[ex:NNNN]` + `[ex:NNNN 动作名]` + 旧 `ex-NNNN` 三种格式，统计各文件引用情况
- 训练类 4 段 raw = 36 处 / unique = 35，修订后头注「35 unique / 36 处」与之一致 ✓
- 跨段去重 43 unique / 66 raw 总量声明不变 ✓
- ch12 全文其它行零变更（diff 仅 L1004 一行文字）
- `node --check app.js`（本轮未触碰 JS，跳过）
- `python -m json.tool manifest.json`（本轮未触碰 manifest，跳过）
- `books/exercises/ex-lib.json`（1336 条）未触碰
- manifest.json / manifest_data.js / app.js 均未触碰

### 副观察（本轮扫描顺手发现，未修）

1. **round120 上轮记账的「ch04 78 + ch12 61 + ch08 6 = 145 处 bad-format」承诺本轮未执行**——本轮聚焦在 ch12 §8.4 头注勘误（差异化选题）
2. **ch12 全文 61 处 `[ex:NNNN 动作名]` 格式** 仍未统一为规范 `[ex:NNNN]` 裸格式（与 ch04 78 处同 pattern），仍属于「下轮候选」
3. **羽毛球康复书 ch06 L193 + ch07 L194「说明」段叙事文案中含 `ex-5202~ex-5213` 范围写法**——经查 ex-lib.json 12 条全部合法（10 泡沫轴 + 2 筋膜球，分类 100% 一致），属于叙事性写法保持原样合理，**不属于 bug 不需修**
4. **NSCA ch10 L78/L310/L312/L317 4 处「勘误说明 / 引用现状」段中含 `ex-5202 / ex-1403 / ex-0669` 等老格式写法**——全部在 blockquote 历史叙事块内（v3.22.62 / v3.22.72 / v3.22.74 跨轮追溯注释），属于保留性叙述，**不属于 bug 不需修**

### 项目现状（commit 后）

```
全 9 本书 ex-lib 方括号格式（保留上轮 round120 数据 + 本轮扫描验证）
  ch04-strength-training.md  | 78 bad  ← 下轮候选
  badminton/ch12             | 61 bad  ← 下轮候选
  nsca-cpt/ch08              | 6 bad   ← 下轮候选
  其余 11 章                 | 0 bad ✓
  本轮修复：ch12 §8.4 头注 unique 计数偏差 ✓
```

### 下轮候选（按优先级降序）

1. **(继承 round120 #1, 优先级中)** NSCA-CPT ch04 78 处 + badminton/ch12 61 处 + NSCA-CPT ch08 6 处 = **145 处 ex-lib 方括号格式不统一**——三处文件分别处理，每处单文件单 commit。最优顺序：ch08 (6 处最小) → ch12 (61 处) → ch04 (78 处最多留专项)
2. **(本轮新观察, 优先级低)** 羽毛球康复书 ch02 L175「本章共 7 处」声明 + ch06 L175「45 处 inline」声明 + ch07 L175「48 处 inline」声明 + ch12 §8.4 头注 4 处「本章 ex-lib 引用现状」类文字声明，本轮已校验 ch06/ch07/ch12 §8.4 一致，但**没有为这种「数字声明 vs 实际引用数」建立全库自动化校验脚本**——本轮手工核对 4 个文件可行，但 9 本书 90+ 章节手工不可能定期复跑。可在 `_audit_exlib_ledger.py` 里加一段「声明数字 vs 实际计数偏差 > N 处自动报错」
3. **(本轮新观察, 优先级低)** 本轮 6 次重试 github.com:443 持续失败（ping 也被网络层拒绝），与 round118 同源波动——本环境到 GitHub 网络层不稳定是已知现象，**下轮 push 前先 ping 一次确认网络通**
