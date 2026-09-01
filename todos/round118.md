## 第 118 轮 — 撤销 round117 反向同步 + 排查教训沉淀

**commit**: `8f6c0c1` revert(manifest): competition 6 章 words 恢复原值（撤销 7f106eb 反向同步）
**push**: ⚠️ **未推送**（github.com:443 连接超时；commit 已在本地 book 分支，curl github.com 也是 timeout；网络恢复后再 `git push origin book`）

### 本轮做了什么

#### 触发 & 根因

round117 (7f106eb) commit message 自报「把 competition 6 章 words 字段同步到实际中文字数（5295→859）」，并声称"用 file+title 双锚定 + book 段内限定"是安全的。本轮跑扫描脚本（`re.findall(r'[一-鿿]', open(p).read())`）真实测量 9 本书每章 zh 字符数后**立即发现完全相反的事实**：

| 章节 | round117 前 declared | round117 后 | 实际 zh |
|------|----------------------|-------------|---------|
| ch01-pre-match-prep | 964 | 60 | 954 |
| ch02-serve-receive | 758 | 334 | 754 |
| ch03-opponent-analysis | 771 | 168 | 771 |
| ch04-mental-strategy | 972 | 122 | 972 |
| ch05-physical-pacing | 1068 | 120 | 1066 |
| ch06-post-match-review | 762 | 55 | 762 |
| **totalWords** | **5295** | **859** | **5279** |

declared 字段本来就与实际 zh drift ≤10/章，**原本就是真实快照**。round117 不知为何把它读成了约 6× 小的数字（猜测：把 chapterCount/h2s 字段当 zh 读了，或 declared 误读为 declared/10），并反向塞回 declared 字段。

#### 用户可见影响

`app.js:5181` 把 `chapter c.words/100` 取整显示为「XX 百字」。round117 后用户在章节卡片看到的：

- ch01「1 百字」、ch02「3 百字」、ch03「2 百字」、ch04「1 百字」、ch05「1 百字」、ch06「1 百字」

但每章实际是 754-1066 中文字符、200-300 行 markdown，离谱错配。本轮 revert 后恢复为：

- ch01「10 百字」、ch02「8 百字」、ch03「8 百字」、ch04「10 百字」、ch05「11 百字」、ch06「8 百字」

——与 260-300 行的实际内容相符。

#### 操作

1. `git revert --no-edit 7f106eb` → 6aa7dec（默认 Revert msg）
2. `git reset --soft HEAD~1` 把 revert 的改动放回 staged
3. 改打精确 message 描述事实，重新 commit → **8f6c0c1**
4. manifest.json + manifest_data.js 双字段镜像同步到 964/758/771/972/1068/762 + totalWords=5295

#### 校验

- `python -m json.tool manifest.json` VALID
- manifest_data.js inner JSON VALID
- `node --check app.js` OK
- 9 本书 json ↔ js 全字段镜像一致（assert 全过）
- 重新扫描：competition 6 章 declared vs actual_zh drift +10/+4/0/0/+2/0
- 其他 8 本书 totalWords / 各章 words 逐字段不变（git diff 仅 competition 段 6 章 + book.totalWords）

### 全书真实 drift 现状（zh_chars 口径）

```
yin-yang                  | decl=143788 | actual=141093 | drift= +2695 | ratio=0.02 ✓
badminton                 | decl=142409 | actual=111165 | drift=+31244 | ratio=0.28 ⚠
engineering-mechanics     | decl=168950 | actual=101177 | drift=+67773 | ratio=0.67 ✗
finance                   | decl=157741 | actual=102697 | drift=+55044 | ratio=0.54 ✗
nsca-cpt                  | decl= 49801 | actual= 44692 | drift= +5109 | ratio=0.11 ⚠
psychology                | decl=205037 | actual=144198 | drift=+60839 | ratio=0.42 ✗
badminton-recovery        | decl= 21701 | actual= 21701 | drift=    +0 | ratio=0.00 ✓ (round116)
competition               | decl=  5295 | actual=  5279 | drift=   +16 | ratio=0.00 ✓ (本轮 revert)
nutrition                 | decl=  5796 | actual=  5430 | drift=  +366 | ratio=0.07 ✓
```

**结论**：仅羽毛球、工程力学、金融、心理学、NSCA-CPT 5 本书存在真 drift；其中：

- **NSCA-CPT** ratio=0.11（5109 drift）—— round108 已开始动 ch09，第 9 章已 sync；剩 9 章
- **nutrition** ratio=0.07（366 drift）—— drift 太小且全部 declared > actual 1.07×，是稳定增长留下的尾部误差，无 stale 风险
- **yin-yang** ratio=0.02（2695 drift）—— 已很稳
- **badminton / engineering-mechanics / finance / psychology** ratio=0.28-0.67—— 真 drift 但量大、需分章精算

### 排查教训（沉淀到下轮工作流）

1. round117 致命失误：**只做了「declared 之和 = totalWords」内部一致性自检**，没做「declared vs 实际 zh 字符数」外部一致性自检。下轮起凡是动 manifest.words 的 commit，必须先打印：
   ```
   declared_旧值 vs actual_zh 值 对照表
   ```
   再下笔。
2. round116 验收 round117 时同样没做外部一致性二次校验。下轮「同 pattern 跨书复制」必须**先在最小样本（单章单字段）做 proof-of-concept 完整往返验证**，再批量推广。
3. 本次 revert 用 `git revert --no-edit` 默认消息质量差（与"fix"区分不开），本轮已用 `reset --soft` 重打精确 message 后 commit。

### push 状态

- 本轮 commit **8f6c0c1** 已落地本地 book 分支
- `git push origin book` × 3 次尝试均失败（curl github.com 也 timeout）——网络层故障，非凭证问题
- **下次开机第一件事**：`cd /d/lamb/projects/qingyu && git push origin book`（网络恢复后一推送即生效，GitHub Pages 自动部署）
- **本轮 todo 自身也无法 push**：本文件（todos/round118.md）也只是本地新增，需要同一 push 一起推上去

## 下轮候选（按优先级降序）

1. **(必做, 阻塞)** `git push origin book` —— 把 8f6c0c1 + todos/round118.md 推上去；push 成功后再补一次 `chore(todo): round118 push 已补`记账（与 round113 同型）。
2. **(本轮新观察, 优先级中)** yin-yang 15 章 drift ratio 0.02 已很稳（2695 zh ≈ 0.02×总），按"declared < actual"方向**可能不必改**；建议下次扫描再对一次，确认是真 drift 还是 ASCII/whitespace 占比差。
3. **(继承 round117 #3, 优先级低)** NSCA-CPT 仍剩 9 章 drift +5109（ch10 SMR 条目除外）；ch03-anatomy 217 zh 是真 stub，需扩写而非调字段。
4. **(本轮新观察, 优先级低)** badminton / engineering-mechanics / finance / psychology 4 本书 ratio > 0.28 真 stale；其中 badminton（drift +31244, 13 章）最值得重做全章扫描后逐章修复。