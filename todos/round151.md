# Round 151 — ch01 第九节清单说明 [ex:0994] 反向腕弯举脱节修复（声明 8 → 9 个唯一 id）

## 落点

兑现上轮 round150 留给下轮的下一项（**H 层级结构复核**已完成大半，本轮从全仓扫表另起一项更小但更确凿的真实脱节）。

| 检查项 | 工具 | 期望 | 实际 | 结论 |
|--------|------|------|------|------|
| ch01 §九 清单声明 "N 个唯一 id" | _audit_exlib_ledger.py（排除 blockquote） | N = 9 | N = 8 | ❌ 1 个漏列 |
| 全项目 106 章声明 vs 实际 drift | _audit_exlib_ledger.py | 0 drift | 1 章 drift | ❌ ch01 是唯一脱节点 |
| ch01 9 个 id 是否全在库内合法 | ex-lib.json (1336 条) | 9/9 合法 | 9/9 合法 | ✅ |
| ch01 LF 行尾 | 二进制扫描 | 0 CRLF | 0 CRLF | ✅ |

## 改动

`books/badminton-recovery/ch01-introduction.md`：

1. §九 本章 ex-lib 引用清单（Markdown 表格）新增一行：
   ```
   | [ex:0994] | band reverse wrist curl（弹力带反向腕弯举） | 前臂 | 弹力带 | beginner | §八 软组织/力量配套示例（ch05 离心力量） |
   ```
   —— [ex:0994] 库内合法条目（ex-lib.json 1336 条 id 中的一员，部位前臂/器材弹力带/强度 beginner），其定义就是 ch05 肘章里的「离心力量训练」代表动作；
2. §九 清单说明 blockquote 「本次补入的 8 个唯一 id」→「本次补入的 9 个唯一 id」，8 个 id 列举后补 `[ex:0994] → ch05`；
3. 之前已存在的 §八 L265 软组织/力量配套示例段 `[ex:0994] 反向腕弯举` inline 引用保持不变（这是脱节的"原始 9th id"，原本就已被审计脚本识别为合法 inline，缺的只是清单说明里的对应声明）。

## 校验

- **`_audit_exlib_ledger.py` 全项目 106 章零 drift ✅**（ch01 从 drift 状态收敛为 matched）
- **ch01 body inline = 22 / unique = 9 与 blockquote 声明"9 个唯一 id"完全对齐 ✅**
- `[ex:0994]` 库内合法（ex-lib.json 1336 条 id 之一，部位前臂/器材弹力带/强度 beginner）✅
- 全书羽毛球 0 broken（不变）✅
- LF 行尾干净 0 CRLF（ch01 285 行 LF-only）✅
- ex-lib.json / manifest.json json 校验 OK ✅
- **零业务代码改动 / APP_VERSION 不 bump / 零 ex-lib id 新增**（0994 原本就是库内合法条目，本次仅补 ch01 清单声明）✅
- diff stat：`1 file changed, 2 insertions(+), 1 deletion(-)`（本质是清单 +1 行 + 声明 8→9 数字 + 列举补 0994）
- 可独立回滚 `git revert 1854cdc`

## 落点价值

1. **真实 drift 而非计数假象** —— `_audit_exlib_ledger.py` 已稳定运行多轮，ch01 是全项目唯一仍存在的脱节点，fix 完后 106 章零 drift 是干净状态
2. **声明与正文叙事一致** —— §八 L265 已出现 `[ex:0994] 反向腕弯举`，§九 清单原本缺这条会让读者扫到 L265 时疑惑"这个 id 哪里来的"
3. **零新增 id / 零代码改动 / 零回归** —— `0994` 本就是库内合法条目，本轮只是把 ch01 自己的清单声明对齐到正文真实状态

## Commit

`1854cdc` fix(badminton-recovery): ch01 第九节清单说明 [ex:0994] 反向腕弯举脱节修复（声明 8 → 9 个唯一 id）

## Push

✅ push 成功 —— `eb414bd..1854cdc  book -> book`，前几轮持续失败的 GitHub 网络已恢复，ahead 0 干净。

## 留给下一轮下一项

1. 羽毛球 ch08 行动清单是否引用了 §二 红旗信号段的"应急流程"分支（互引一致性）—— round150 已留候选
2. NSCA-CPT ch03 anatomy 全文 326 行但 inline 只有 6 处集中在 §评估表，是否需补正文部位→ex-lib 关联 —— round150 已留候选
3. 羽毛球 ch01 §八「六大损伤第 1 天起步动作」速查是否需要在 ch03 升级后回填膝关节"红旗应急流程"指向 —— round150 已留候选
4. **新发现**：NSCA-CPT ch10 L312「14 个错位 id」历史说明段已合并入 L315 但 L312 自身仍存在内容（与 L317「历史叙述合并」自相矛盾——但上次 6ccdc81 的本意就是合并，实际看 diff 是合并到 L315 的"v3.22.63 实测"段，L312 改写为新措辞；本轮 audit 跑过无 drift，但仍可作复查候选）