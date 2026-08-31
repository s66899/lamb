# Round 93 ledger — NSCA-CPT ch02 manifest 重复 `十三、` h2 改 `十二、` + subs 13.x→12.x（92 轮候选 #2 兑现）

**commit**：`5a6ad58`（`fix(nsca-ch02): manifest 重复 十三、 h2 改 十二、 + subs 13.x→12.x — 与 markdown 1:1 对齐（92 轮候选 #2 兑现）`）
**prev commit**：`39bdee7`
**push**：首次即成功（39bdee7..5a6ad58，github.com:443 无失败）

## 本轮做了什么

92 轮 ledger 候选 #2 — `books/nsca-cpt/ch02-exercise-physiology.md` 的 manifest h2 漂移修复：

**问题**：markdown 实际结构（grep `^## ` 验证）：
```
L11   本章导言
L21   一、能量系统——身体的电池组
L135  二、心血管系统
L215  三、最大摄氧量
L289  四、激素系统
L398  五、肌肉生理学
L502  六、训练生理学适应
L592  七、运动恢复
L710  八、运动生理学在羽毛球训练中的应用
L828  九、训练监测
L931  十、不同年龄段球友的生理学要点
L1020 十一、常见生理学误区辨析
L1096 十二、运动损伤的生理学——理解身体的"求救信号"
       (subs: 12.1 急性损伤 / 12.2 慢性劳损 / 12.3 损伤预防 / 12.4 退役)
L1177 十三、营养时机的生理学——什么时候吃什么
       (subs: 13.1 整体框架 / 13.2 运动前餐 / 13.3 运动后餐 / 13.4 补水 / 13.5 补剂)
L1284 十四、本章总结与下章预告
L1339 思考题
```

manifest 错位：
- h2[12] = `十三、运动损伤的生理学`（subs 13.1~13.4） → 应为 `十二、运动损伤的生理学`（subs 12.1~12.4）
- h2[13] = `十三、营养时机的生理学`（subs 13.1~13.5） → 已正确

→ 出现两个 `十三、` h2 entry + 一整段 `12.x` 在 manifest 中消失；TOC/sidebar 渲染出现两个「十三、」节点，第二/三个 `13.1` 重号。

**修法**：纯 manifest 改动，markdown 0 触碰 —— 与 92 轮 finance-ch13 同型 fix：

- `manifest.json` nsca-cpt ch02 h2[12]：
  - title: `十三、运动损伤的生理学...` → `十二、运动损伤的生理学...`
  - subs[0..3].title: `13.1`→`12.1`, `13.2`→`12.2`, `13.3`→`12.3`, `13.4`→`12.4`
- `manifest_data.js` nsca-cpt ch02 h2[12]：与 manifest.json 完全相同的 5 处字符串替换（保持 1:1 镜像）
- h2[13] 营养时机 0 触碰（原本就正确）

h2 总数 16 不变，subs 总数 16+28=44 不变（12.1~12.4 替换 13.1~13.4，4 个改号；13.1~13.5 保持）。

## 校验

- `python -m json.tool manifest.json` → OK ✓
- `node --check manifest_data.js` → OK ✓
- manifest nsca-cpt ch02 现含：
  - h2[12] = `十二、运动损伤的生理学`（4 subs: 12.1 / 12.2 / 12.3 / 12.4）
  - h2[13] = `十三、营养时机的生理学`（5 subs: 13.1 / 13.2 / 13.3 / 13.4 / 13.5）
  - h2 总数 16 = markdown `^## ` 总数（严格 1:1 对齐）
- 0 markdown 改动，0 APP_VERSION 改动（v3.22.62 不 bump），0 app.js / style.css 改动
- `_scan_exlib_refs.py`：合法 1336 / 唯一 140 / broken 0（不变）✓
- `_audit_exlib_ledger.py`：0 drift（不变；仅羽毛球 ch12 1 处 informational list-only）✓
- `git diff --text` 真实差异：2 files × 5 string replacements × -1/+1 行（净 0 字节 = 同字节不同字符串）
- git 标 Bin 因 `.gitattributes` L5 `* -text` 全文件屏蔽（继承 90/91/92 轮现象，可远期处理）
- 可独立回滚：`git revert HEAD` 恢复 2 文件的 manifest 漂移状态 ✓
- `git push origin book` 首次成功（92 轮 22.5 分钟 retry 链路已恢复，github.com:443 当下无失败）

## 用户偏好兑现

- 沿用 86/87/88/89/90/91/92 轮风格：单 commit fix + 双 .py + .md 记账追加
- 零业务代码改动；零 ex-lib id 改动；零 JS / CSS / APP_VERSION 改动
- 零伪造 id：本轮 0 涉及（仅 manifest 编号对齐，0 涉 ex-lib）
- 兑现 92 轮 ledger "下轮候选 #2" 中提到的 NSCA-CPT ch02 manifest h2 漂移问题
- 单 commit / 单源 issue / 对称双文件（manifest.json + manifest_data.js）修复 / 严格 1:1 与 markdown 对齐
- 与 92 轮 finance-ch13 修复同型（manifest h2s 与 markdown 1:1 对齐），跨书跨轮复制成功
- 92 轮候选 #3 badminton ch13 / #4 psychology ch12 / #5 engineering-mechanics ch12 三处 markdown
  自身数字编号乱序（涉及 ### 重新编号），scope 比本轮更大，本轮不动，留候选 #1-#2 给后续 round

## 下轮候选

1. **(继承 92 轮, 优先级中) NSCA-CPT ch02 markdown L1296~L1338 `## 十四、本章总结与下章预告` 的
   内容与小标题结构核查**——manifest h2[14] = `十四、本章总结与下章预告` 含 2 subs（14.1 本章核心要点 /
   14.2 给读者的实践建议）。本轮 93 轮仅修 h2[12] 编号，未深入核对 h2[14] 的 subs 是否与 markdown
   的 ### 14.x 严格对齐（待 94 轮快速 grep `^### ` 在 L1284-L1338 范围验证）。若发现新的
   13.x→14.x 编号漂移可顺势兑现。
2. **(继承 92 轮, 优先级中) finance ch13 「**参考文献：** + **致谢：**」加粗段在 L725 / L740
   错放在 canonical `## 十、` 作用域内**（位于 10.4 内容之后、### 10.5 之前），按惯例应挪到
   chapter-end（## 本章小结 之后）。影响范围：1 个 markdown 改动 + manifest 可能需同步调整
   entries。继承 3 轮未动，优先级中。
3. **(继承 92 轮, 优先级中) badminton ch13 markdown 数字编号乱序**：L754 `## 十二、双打比赛的体能要求`
   + L808 `## 十二、双打比赛的体能储备与伤病预防`（DUPLICATE 十二）+ L857 `## 十五、` (跳号)
   + L991 `## 十三、` (回退) + L1082 `## 十四、`。manifest 镜像了这个混乱。本轮不动（涉及 markdown
   重新编号，scope 比 NSCA ch02 修复大），可单独立 round 处理。
4. **(继承 92 轮, 优先级中) psychology ch12 markdown 数字编号乱序 + 空 `## ` 行**：L525
   `## 十一、积极心理学的应用与日常练习` + L895 `## `（空标题）+ L952 `## 十、积极心理学的争议`
   （十 出现在 十一 之后）+ L988 `## 十一、积极心理学的日常实践指南`（DUPLICATE 十一）。
   manifest 镜像混乱。本轮不动。
5. **(继承 92 轮, 优先级低) engineering-mechanics ch12 markdown 同样有 L585 `## 十一、` 跳号 +
   L1013 `## ʮ`（乱码字符空标题）+ L1067/L1135 重复 `## 十一/十二、`**。manifest 镜像混乱。
   本轮不动。
6. **(继承 91 轮, 优先级低) 营养书 ch01~ch07 各 400~1000 字偏短**（实为完整骨架 + 公式 + 表），
   如需扩写可挑 1 章做小补。
7. **(继承 91 轮, 优先级低) 羽毛球康复书 ch07-achilles 184 行最薄**，但 inline 32 处 / unique 14
   个已饱和，结构完整，硬补有 scope creep 风险，留观。
8. **(继承 91 轮, 优先级低) NSCA-CPT ch10 §七末段「v3.22.17 / v3.22.62 / v3.22.72 / v3.22.74」
   四次勘误 blockquote 累积 580+ 字**，可远期整理到附录「v3.22 勘误史」独立 H2。
9. **(继承 92 轮, 优先级低) `_append_todo_round78.{py,md}` 在 HEAD 里缺失**——78 轮的记账
   narrative 写在 `_session_todo.md` 末尾「## 第 78 轮」段，但未生成 73~77/79~93 轮双写惯例的
   两个文件。可远期补一份让 round68/71/73~77/79~93 双写系列保持连续。
10. **(继承 92 轮, 优先级低) `.gitattributes` L5 写 `* -text -merge -diff -lfs -lockable` 全文件
    禁用 diff 配置**，是 v3.7.8 时期为避免 LFS filter 卡 checkout 引入；本轮 93 轮 diff --stat 显示
    manifest.json 和 manifest_data.js 被 git 标 binary。可远期改成只屏蔽真正需要 `.lfs` 后缀的文件
    （如 `*.psd` / `*.zip`），其他正常 .md / .js / .html / .json 走默认 text 改善协作 diff。

---

**本轮 commit hash**：`5a6ad58`

**本轮 push**：✅ 1 次成功（`39bdee7..5a6ad58` book → book，github.com:443 无失败）
