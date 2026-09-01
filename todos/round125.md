## 第 125 轮（commit ea8f89f）— 兑现 round124 阻塞 #1 push + 修复 badminton-recovery ch01 L212「本书 6 章」章数歧义

**本轮做了什么**：

### 修复点（单文件单 commit）

`books/badminton-recovery/ch01-introduction.md` L212 blockquote 内的「导航表说明」一段：

- 原：「本书 **6 章**的内部 H2 结构**未完全统一**」
- 改：「本书 **6 大损伤章（ch02-ch07）**的内部 H2 结构**未完全统一**——
  ch02 / ch05 采用...；... 注：全书实际为 **8 章 = ch01 本引言 + ch02-ch07
  六大损伤 + ch08 行动清单**，上表仅聚焦 6 大损伤章的 H2 差异；
  ch01 / ch08 不在此差异范围。」

### 真实 bug 来源

L212 字面意思「本书 6 章」= 全书共 6 章，与实际 **8 章**（ch01 引言 +
ch02-ch07 六大损伤 + ch08 行动清单）不符。但**原始意图**是描述导航表里
6 大损伤章的 H2 不统一现象——作者忘了 ch01 引言章 + ch08 行动清单章也属于
"全书"。读起来会误以为「全书只有 6 章」，对一本新书读者是真实的歧义 bug。

下游约束（manifest / README / app.js 营销文案）全部使用「6 大损伤」+
「8 章」标准措辞，唯独 L212 用「6 章」孤例，是真实的小遗漏。

### 校验（commit 前全部跑过）

- 单文件单 commit 改动（1 insertion / 1 deletion；+198 字节）
- 文件内全部 markdown 链接（30 处 ch02-ch08）`./chXX-*.md` ✓
  （ch02-shoulder / ch03-knee / ch04-ankle / ch05-elbow / ch06-back /
  ch07-achilles / ch08-action-plan 全部仍存在）
- LF 行尾保持：238 LF / 0 CR ✓（沿用 round124 newline LF 容忍规范）
- `node --check app.js` ✅（未触碰 JS）
- `node --check manifest_data.js` ✅（未触碰 JS）
- `python3 -m json.tool manifest.json` ✅（未触碰 manifest）
- Git warning `LF will be replaced by CRLF`：预期——autoCRLF 替换行为，
  content 一致 ✓

### push 状态 — round124 阻塞 #1 兑现 ✅

- `git push origin book` → ✅ 成功
- `ca888d9..ea8f89f book -> book`（增量推送包含 round124 commit dc1d002
  + 本轮 ea8f89f）
- GitHub Pages 端**已触发自动部署**（之前的网络阻塞本轮自动恢复，
  与 round121 / round123 一致的临时性网络波动）
- commit ea8f89f 已上线：https://s66899.github.io/lamb/

### 不在本轮做

- **NSCA ch10 §七末段 v3.22 勘误史整理为附录**（round121 #2）——内容性
  改动，留观
- **`_audit_exlib_ledger.py` 加声明数字 vs 实际计数自动报错**（round121 #3）
  ——脚本扩展属"加大改动"类，留观
- **羽毛球康复书内容深化**（round119 #1）——内容性大改动，留观
- **nutrition ch01-tdee.md 394 字偏薄补双层结构**——内容性大改动，留观

### 项目现状（commit + push 后）

```
版本同步     | app.js/manifest_data.js/index.html APP_VERSION 一致 v3.22.62 ✓
ex-lib 健康  | 597 处引用 / 0 broken id ✓
跨链健康     | 0 broken ✓
manifest 健康| 9 本书 / 9 注册 / 14 章 chXX 文件全对齐 ✓
chXX 文件注册| 0 unregistered ✓
chXX hardcode| app.js 0 / index.html 0 / manifest_data.js 94 (全对) ✓
badminton-recovery 内部一致性 | ch01 L212 章数歧义已修 ✓
```

### 下轮候选（按优先级降序）

1. **(新优先 #1)** 顺手把 round124 / 本轮 push 成功的 fact 补到 round124
   todo 里（`push ⏳ → ✅`），让两轮 ledger 完整闭环
2. **(继承 round121 #2)** NSCA-CPT ch10 §七末段 v3.22.17 / v3.22.62 /
   v3.22.72 / v3.22.74 四次勘误 blockquote 累积 580+ 字 → 整理为附录
   「v3.22 勘误史」独立 H2
3. **(继承 round121 #3)** `_audit_exlib_ledger.py` 加「声明数字 vs 实际
   计数偏差」自动报错逻辑（9 本书 14 章 + 90+ unique id 持续可校验化）
4. **(继承 round119 #1)** 羽毛球康复书内容深化（6 大损伤 + 4/8/12 周
   时间线）——内容性大改动，留观
5. **(新发现)** nutrition ch01-tdee.md 394 字偏薄——但属于内容性大改动
   类，沿用 round119 #1 评估标准留观
6. **(新发现 #2)** badminton-recovery L212 修复后可顺道扫一遍所有书的
   "本书 N 章" 元说明是否有同类歧义——单脚本扫表，可作下轮 small
   improvement 候选
