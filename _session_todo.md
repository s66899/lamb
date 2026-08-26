# todos

## 进行中

## 待办（下轮候选）
- 羽毛球康复 ch06 腰部章 30 处 inline 引用 vs lib 名校对（密度最高，需逐条核动作名是否对应）
- NSCA-CPT ch10 第七节总清单（12 条）与 2.1 节本节 ex-lib（7 条）有 6 个 id 重叠（颈 1403/肩 0669/上背 1339/大腿后 1560/大腿前 1713/臀 1709/小腿 1377）；可在总清单加"已被 2.1 节引用"标记 → 读者一键跳转
- 其他书（engineering-mechanics / 心理学 / 营养 / 财务 / yin-yang / competition）扫描是否有类似"承诺了引用表但未实现"的瑕疵

## 已完成（本会话）
- **本轮 (v3.22.35)**：NSCA-CPT ch07 第八节"训练负荷管理"扩写（4 行 bullet + 1 句 quote → 8.1 双层文案 + 4/8/12 周柔韧渐进表 + 强度公式 + 8.2 负荷过量红灯信号 4 条；零新 ex-lib id 引入，7 个原 id 全部 lib 合法；LF 纯净；node --check + manifest.json + ex-lib.json 全过；APP_VERSION v3.22.34 → v3.22.35）
- NSCA-CPT 4 章表格列头统一（ch04×7 + ch08×7 + ch09×14 + ch10×3 = 31 处裸"ex-lib"→"ex-lib 动作"，与羽毛球康复书 ch04 引用表列头对齐；ex-lib id 数据行未动；行尾保持原 CRLF/LF；node --check 通过；manifest.json 通过；commit 9d90bf1, v3.22.34）
- 羽毛球康复 ch02 肩章 W1-W8 时间线表内联 ex-lib 引用（附录 7 条合法 id + 4 项库中暂无标注从末尾回填到表内 15 处 + 文字旁注 1 处，APPENDIX 7 条保留；零新 id 引入；零 CRLF；node --check 通过）。commit bb557eb, v3.22.33
- NSCA-CPT ch10 三处 ex-lib 表格（2.1 节本节 7 条 / 2.1 节 SMR 表 12 条 / 第七节总清单 12 条）共 31 处表格内裸 4 位数字 → `[ex:XXXX]` 方括号（commit 97a5b13, v3.22.32）
- NSCA ch10 兑现 v3.22.17 承诺：2.1 节末尾 SMR 引用表（12 条 ex-5202 至 ex-5213，部位/器材/组×时间齐全），commit 0cf1282, v3.22.31
- ch08 末尾补 ex-lib 引用清单段（16 个 unique id 对应 19 处 inline 引用），commit 124e6cf, v3.22.30