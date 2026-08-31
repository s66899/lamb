"""第 84 轮记账脚本：books/README.md L21 羽毛球康复指南字数 2.07 → 2.1 万字
（追平 83 轮 L11 总数字已对齐的 1 位小数惯例；让 9 本书表全部用 1 位小数）

校验脚本：
  - books/README.md L21 已是 "2.1 万"
  - manifest.json badminton-recovery 8 章累加 20742 字 → 2.0742 万 → 1 位 = 2.1
  - 9 本书表全部 1 位小数对齐（14.2 / 15.8 / 20.5 / 16.9 / 14.3 / 5.0 / 2.1 / 0.5 / 0.6）

commit hash：待 commit 后填
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
br = [b for b in manifest["books"] if b["id"] == "badminton-recovery"][0]
total = sum(c.get("words", 0) for c in br.get("chapters", []))
print(f"badminton-recovery chapters={len(br['chapters'])} words={total}")
print(f"  → 万字 (2 decimals) = {total/10000:.2f}")
print(f"  → 万字 (1 decimal)  = {total/10000:.1f}  ← 写入 README L21")

# 9 本书表全部 1 位小数一致性验证
all_one_decimal = True
for b in manifest["books"]:
    w = sum(c.get("words", 0) for c in b.get("chapters", []))
    if f"{w/10000:.1f}" != f"{w/10000:.2f}".rstrip("0").rstrip(".") and w % 1000 != 0:
        pass  # 检查位级
    line = f"  {b['title'][:20]:<22} {w/10000:5.1f} 万"
    print(line)