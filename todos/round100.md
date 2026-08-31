# Round 100 todos（保留给下一轮的 pending 候选）

**已完成 commit**：
- `89c2fe5` 上轮记账（round 99）
- `8fcf73c` psychology ch11 §一 空 h2 标题补全（第 100 轮主 commit，本轮）
- `a9f2c8a` 本轮记账（round 100）

**下轮候选**（继承 99 轮 + 本轮新发现，优先级降序）：

1. **(继承 99 轮, 优先级中)** 6 本 README 末尾 meta 块补齐（badminton / competition / engineering-mechanics / finance / nutrition / psychology）。建议按 1 commit 1 本节奏，留观 6 轮；或第 101 轮一次性做（commit message 明列 6 文件名），按用户偏好决定。
2. **(继承 99 轮, 优先级中)** badminton ch13 markdown 数字编号乱序（L754/L808 duplicate 十二、L857 跳号到 十五、L991 回退到 十三、L1082 跳号 十四）。先 grep 比对 markdown 与 manifest，做最小 diff。
3. **(继承 99 轮, 优先级中)** psychology ch12 markdown 数字编号乱序（L525 十一、L895 空标题、L952 倒退到 十、L988 duplicate 十一）。先 grep 比对 markdown 与 manifest，做最小 diff。
4. **(继承 99 轮, 优先级低)** engineering-mechanics ch12 markdown L585 跳号 + L1013 `## ʮ` 乱码字符空标题 + L1067/L1135 重复 十一/十二。可远期处理。
5. **(继承 99 轮, 优先级低)** NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」四次勘误 blockquote 累积 580+ 字，可远期整理为附录「v3.22 勘误史」独立 H2。
6. **(继承 99 轮, 优先级低)** `_append_todo_round78.{py,md}` 在 HEAD 里缺失 —— 78 轮记账 narrative 写在 `_session_todo.md`「## 第 78 轮」段，未生成双写惯例两个文件。可远期补一份让 round 73~77/79~100 双写系列保持连续。
7. **(本轮新发现, 优先级低)** psychology ch11 L30 裸 anchor 文本「精神动力学疗法——探索无意识」缺 `### ` 标题，与 L32 `### 1.1 理论基础` 同级但作者未加 ###。建议下一轮做小补：L30 加 `### ` 前缀，与 §1.1/§1.2/§1.3 形成完整 §1 子节序列。本轮不做的原因：scope 1 行补完标题，scope 1 行加 ### 已经在 round 100 commit 8fcf73c 完成；不批量翻新；可远期做。

**本轮 commit hash**：`8fcf73c`

**本轮 push**：✅ 第 7 次重试成功（`b1bfb04..8fcf73c` book → book，github.com:443 累计 sleep 5+15+30+60+60+120+60 ≈ 350 秒；前 6 次 git https POST 被中间设备 reset 但 API `curl /repos/s66899/lamb` 一直 200；最后一次稳定通过；GitHub Pages 自动部署中）

**记账 push**：✅ `8fcf73c..a9f2c8a` book → book（第 1 次重试即成功）

