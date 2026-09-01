#!/usr/bin/env python3
"""Round 124 记账脚本 — 写 todos/round124.md + 追加 todo_summary_index。

格式沿用 round118-123。
"""
from pathlib import Path
import sys

TPL = """## 第 124 轮（commit dc1d002）— 兑现 round123 候选 #1：NSCA-CPT ch04 79 处 ex-lib 方括号格式统一 ⏳ push 重试中（github.com:443 网络阻塞，commit 已落 book 本地）

**本轮做了什么**：

兑现 round123 候选 #1「ch08 6 处 → ch12 61 处 → ch04 79 处 ex-lib 方括号格式统一」
按相同 pattern 修复。round122 闭环 ch08 / round123 闭环 ch12 / 本轮聚焦 **ch04 79 处**
——单文件单 commit 内可完成。

### 修复点

`books/nsca-cpt/ch04-strength-training.md` 正文叙事段 + 表格单元格 + 格式说明文案 1 处
共 79 处 `[ex:NNNN 文本]`（中文名 + 英文名混合，含「barbell back squat」/「反向腕弯举」
/「罗马尼亚硬拉」等）→ 统一为 `[ex:NNNN] 文本` 规范格式（与 v3.22.32 + round120 ch09
/ round122 ch08 / round123 ch12 修订后规范一致）。

### 模式分布

- **5 处章节导言 / 金字塔图 ASCII art 内**：行内引用
- **~50 处表格单元格内**：动作名 + id 引用
- **~24 处 3/4/8 周计划表内**：动作名 + id 引用 + 组数
- **1 处格式说明文案**：第 15 行原写 `[ex:0038-中文名]`（嵌套格式），一并改为
  `[ex:0038] 中文名`，与全文 79 处引用统一
- **39 unique id**：0464 / 0864 出现多次（含第 251 行 90/90 肩外旋借用最接近条目）
- **0 处后跟 ex 引用/紧跟 `]` 嵌套**：模式高度统一，无替换歧义风险

### 校验（commit 前全部跑过）

- 文件内 `[ex:NNNN] ` 规范数：0 → 79；`[ex:NNNN 文本]` bad 数：79 → 0 ✓
- 文件总字节数：23393 → 23393（Δ 0；`]` 位置对称 ASCII 1 字节净增 0）✓
- LF 行尾保持：510 LF / 0 CR（重要，沿用 round123 newline='' 规范）✓
- 79 处引用 / 39 unique id / 0 broken（全部 id 在 ex-lib.json 合法集合内）✓
- 格式说明文案与实际引用一致：第 15 行 `[ex:0038-中文名]` → `[ex:0038] 中文名` ✓
- `node --check app.js` ✅（未触碰 JS）
- `node --check manifest_data.js` ✅（未触碰 JS）
- `python3 -m json.tool manifest.json` ✅（未触碰 manifest）
- diff 仅 1 文件 79 行 ±（79 处格式微调）+0 字节字数变化 + 0 行尾变化 ✓
- Git warning `LF will be replaced by CRLF`：预期——之前 ch04 是 LF，git 在 commit 时
  默认 autoCRLF 会替换；这与 ch12 round123 行为一致，**沿用现状容忍**（LF/CRLF
  双向可见但 content 一致）

### 陷阱说明（本轮踩到后已修）

**前次脚本第一次跑 ex-lib.json 路径错**——我用 `books/_data/ex-lib.json` 但实际
是 `books/exercises/ex-lib.json`（grep glob 修正后正确）。**前次脚本第二次跑
`✓` emoji 在 Windows GBK 控制台 encode 失败**——文件已写入但 print 阶段抛异常，
**这是断言之后的 print 失败不影响已写入数据**，重跑确认已是修复后状态。
后续 markdown 修改脚本**统一加 `PYTHONIOENCODING=utf-8` 兜底**。

### 操作

1. `git status --short` 确认工作区干净（round123 失败的脚本断言前已抛，文件未写入）
2. 写 `_round124_fix_ch04.py`：步骤 1 拆格式说明文案 1 处 + 步骤 2 空格分隔 78 处
3. `python3 _round124_fix_ch04.py` → 78 处 + LF 保留 + valid id 校验通过 + 0 broken
4. `node --check` × 2 + `python3 -m json.tool manifest.json` 全 OK
5. `git add` → `git commit` → `dc1d002`
6. `git push origin book` → 8 次连续失败，github.com:443 网络阻塞（21 秒超时）
   与 round121 / round123 同源环境网络波动；commit dc1d002 **已落本地 book 分支**
   仅是 GitHub Pages 端**未触发自动部署**

### 不在本轮做

- **`push 重试`** 留待下轮继续尝试（与 round123 round121 网络阻塞模式一致，
  失败不引入变更，仅是部署延迟，不影响代码质量）
- **NSCA ch10 §七末段 v3.22 勘误史整理为附录**（round121 #2）——内容性改动，留观
- **`_audit_exlib_ledger.py` 加声明数字 vs 实际计数自动报错**（round121 #3）——脚本
  扩展属「加大改动」类，留观
- **羽毛球康复书内容深化**（round119 候选 #1）——内容性大改动，留观

### 项目现状（commit 后）

```
全 9 本书 ex-lib 方括号格式（round120 之后累计）
  nsca-cpt/ch04            | 0 bad ✓ ← 本轮修复
  badminton/ch12           | 0 bad ✓ ← round123 修复
  nsca-cpt/ch08            | 0 bad ✓ ← round122 修复
  nsca-cpt/ch09            | 0 bad ✓ ← round120 修复
  其余 10 章               | 0 bad ✓
  本轮修复：ch04 79 处清零 ✓
  累计已修（round120 + round122 + round123 + 本轮）：170 处
  14 章 ex-lib 方括号格式全归零 ✓（4 处修复章节 + 10 处原始规范章节）
```

### 下轮候选（按优先级降序）

1. **(新优先 #1)** 兑现 round124 push 重试：`git push origin book`，commit dc1d002
   部署到 GitHub Pages；如失败 ≥10 次再做网络隔离诊断
2. **(继承 round121 #2)** NSCA-CPT ch10 §七末段 v3.22.17 / v3.22.62 / v3.22.72 /
   v3.22.74 四次勘误 blockquote 累积 580+ 字 → 整理为附录「v3.22 勘误史」独立 H2
3. **(继承 round121 #3)** `_audit_exlib_ledger.py` 加「声明数字 vs 实际计数偏差」
   自动报错逻辑（9 本书 14 章 + 90+ unique id 持续可校验化）
4. **(round119 #1)** 羽毛球康复书内容深化（6 大损伤 + 4/8/12 周时间线）——大改动，沿用
   round122 评估标准继续留观
5. **(round124 新增 #1)** Python 写 markdown 文件**统一**加 `PYTHONIOENCODING=utf-8`
   环境变量（避免 Windows GBK 控制台 `✓` emoji encode 失败）；可作脚本基建更新
"""


def main():
    target = Path("todos/round124.md")
    target.write_text(TPL, encoding="utf-8")
    print(f"wrote {target} ({target.stat().st_size} bytes)")

    # 追加 todo_summary_index（如有）
    idx = Path("todos/todo_summary_index.md")
    if idx.exists():
        cur = idx.read_text(encoding="utf-8")
        # 仅在最后追加 round124 一行 + commit hash
        if "round124" not in cur:
            cur = cur.rstrip() + "\n\n- round124: dc1d002 ch04 79 处 ex-lib 格式统一 + push 待重试\n"
            idx.write_text(cur, encoding="utf-8")
            print(f"updated {idx}")


if __name__ == "__main__":
    main()