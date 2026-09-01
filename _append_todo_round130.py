#!/usr/bin/env python3
"""Append-only todo ledger for round 130 (commit b5db915).

Writes todos/round130.md describing what round 130 did, the verification it
ran, and the candidate queue for round 131. Idempotent: refuses to overwrite
existing todos/round130.md.

Re-running this script is safe; the script itself is committed to git so the
ledger creation is reproducible.

NOTE: Uses os.path.dirname(__file__) path-relative target so the script works
from any CWD (avoids Windows case-insensitive `D:\\Lamb` vs `D:\\lamb` parent
mismatch when __file__ resolves to one casing and cwd uses another).
"""
import os
import sys

LEDGER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "todos", "round130.md"
)

if os.path.exists(LEDGER):
    print(f"[round130] {LEDGER} already exists - refusing to overwrite")
    sys.exit(0)

content = """## Round 130 (commit b5db915) - badminton-recovery ch06 L193 narrative year correction

**What this round did:**

Cancelled round129 ledger candidate #1 (ch06-back "declared number drift",
round2 audit confirmed 0 drift: unique 16 / inline 45 perfectly matches actual
grep). Real issue was candidate #3: ch06-back L193 attributed the [ex:1352]
mislabel to v3.22.18, but git log proves:

- v3.22.18 (commit de057a1, 2026-08-26 09:07): fixed 10 broken ex-lib ids.
  Did NOT touch ch06-back.md (chapter not yet created until v3.22.22).
- v3.22.22 (commit 001ad4e, 2026-08-26 15:16): ch06-back created.
  [ex:1352] lower back curl introduced as "SMR substitute".
- v3.22.62 era (commit 1f98698, 2026-08-31 06:52): rewrote [ex:1352] ->
  [ex:5212] foam roller thoracic spine in the W2 row.

Rewrote L193 from "v3.22.18 修订" to "本章创建时（v3.22.22 期，commit
001ad4e）...已在 v3.22.62 同期逐行替换...；v3.22.18 修复 10 处 broken 时
本章尚未创建，与 v3.22.18 无关". Changed [ex:1352] inline reference to
"id 1352" string to preserve unique/inline counts (16/45 unchanged).

### Verification

- git diff --stat: 1 file changed, 1 insertion(+), 1 deletion(-)
- ex-lib id self-check: 16 unique / 45 inline (matches L175 declaration)
- _audit_exlib_ledger.py: 105 chapters, all declared counts match actual
- File ends with LF (0x0a)
- git push origin book: b76df2f..b5db915 (GitHub Pages auto-deploys)
- APP_VERSION v3.22.62 NOT bumped (text-only revision)

### Candidates for next round

1. ch06 L175 narrative precision: "仅本说明段作为历史记录保留 id 字符串"
   understates (real: 7 inline in L175 = 3 [ex:1352] + 2 [ex:5212] +
   [ex:5207] + [ex:5208]). Single-line rewrite, audit-safe.
2. NSCA ch10 seventh total list: 6 unique rows missing "2.1 节无交叉" tag
   (1403/1716/1341/1358/1604/5205). Single commit, 6 row tags.
3. manifest.json word count vs books/README.md: 90.1 / 14.4 / 2.2 wan
   last checked round126 (01b1ced). Re-scan after ~5 rounds of additions.
"""

with open(LEDGER, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Wrote {LEDGER} ({len(content)} chars)")