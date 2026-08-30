#!/usr/bin/env python3
"""
Audit declared ex-lib counts vs actual inline counts in book chapters.

Scans every books/**/*.md file for an "ex-lib 引用清单 / 现状 / 总览 / 表" section
(plus other declared-count phrasing) and compares the **declared** unique/inline
count against the **actual** count computed by regex on the chapter text.

Reports any chapter where declared != actual (potential stale ledger).
"""
import re
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent
BOOKS = ROOT / "books"

# Pattern that catches "[ex:1234]" — 4 digits after ex:
EXLIB_RE = re.compile(r"\[ex:(\d{4})\]")

# Declarations we look for in declared-phrase paragraphs.
# We accept either "N unique id" / "N 个 unique id" / "N 个唯一 id" / "N 处 inline"
# Patterns are intentionally narrow so we don't false-positive on prose.
DECLARED_PATTERNS = [
    # e.g. "43 unique id / 66 处列表项" / "31 处 inline 引用 / 25 个唯一 id"
    (re.compile(r"(\d+)\s*(?:处\s*inline|个\s*inline)", re.I), "inline"),
    (re.compile(r"(\d+)\s*(?:个\s*unique|unique\s*id|唯一\s*id)", re.I), "unique"),
    (re.compile(r"(\d+)\s*(?:处\s*列表项|处\s*引用)", re.I), "list_items"),
]

def count_inline(text: str):
    """Return (inline_count, unique_count) over the chapter text, dedup per id."""
    ids = EXLIB_RE.findall(text)
    return len(ids), len(set(ids))

def find_declared(text: str):
    """Pull declared numbers near an ex-lib header."""
    declared = {}
    # find line numbers that look like a ledger / declared-count statement
    for m in re.finditer(r"(\d+)\s*(?:处\s*inline\s*引用?|个\s*inline|处\s*引用|unique\s*id|个\s*unique|唯一\s*id|个唯一|处\s*列表项)", text):
        n = int(m.group(1))
        ctx = text[max(0, m.start() - 40):m.end() + 40]
        # filter: only consider numbers that are reasonable counts (1..300)
        if n < 1 or n > 300:
            continue
        # classify by surrounding keyword
        kw = m.group(0)
        if "unique" in kw.lower() or "唯一" in kw:
            kind = "unique"
        elif "列表项" in kw:
            kind = "list_items"
        else:
            kind = "inline"
        declared.setdefault(kind, []).append((n, m.start()))
    return declared

def audit(path: Path):
    text = path.read_text(encoding="utf-8")
    inline_total, unique_total = count_inline(text)
    declared = find_declared(text)

    # Pick most-frequent declared value per kind as the "official" declared
    issues = []
    # Skip list-only chapters (declared counts in their list section are about bare 4-digit IDs,
    # not about [ex:NNNN] inline refs — compare only when there are real inline refs)
    if inline_total >= 5:
        for kind, vals in declared.items():
            # count frequency; pick majority
            from collections import Counter
            cnt = Counter(n for n, _ in vals)
            decl_n, hits = cnt.most_common(1)[0]
            actual = inline_total if kind == "inline" else (unique_total if kind == "unique" else None)
            if actual is None:
                continue
            if decl_n != actual:
                issues.append({
                    "kind": kind,
                    "declared": decl_n,
                    "actual": actual,
                    "hit_count": hits,
                    "total_mentions": len(vals),
                })
    return inline_total, unique_total, issues

def main():
    targets = sorted(BOOKS.glob("*/*.md"))
    print(f"# audit {len(targets)} book chapter files")
    print()
    bad_count = 0
    for p in targets:
        text = p.read_text(encoding="utf-8")
        # skip chapters without an "ex-lib 引用" header (don't audit count)
        if not re.search(r"ex-lib\s*引用(清单|现状|总览|表|汇总)", text):
            continue
        inline, uniq, issues = audit(p)
        if issues:
            bad_count += 1
            rel = p.relative_to(ROOT).as_posix()
            print(f"## {rel}  inline={inline} unique={uniq}")
            for iss in issues:
                print(f"   ❌ {iss['kind']}: declared={iss['declared']} actual={iss['actual']}  (mentions={iss['total_mentions']})")
            print()
    # also report chapters whose list section uses bare 4-digit IDs (informational only, NOT a bug)
    list_only = []
    for p in targets:
        text = p.read_text(encoding="utf-8")
        if not re.search(r"ex-lib\s*引用(清单|现状|总览|表|汇总)", text):
            continue
        # a "list-only" chapter has 0..2 [ex:NNNN] refs but declares a large list count
        n_inline = len(EXLIB_RE.findall(text))
        declared = find_declared(text)
        if declared and n_inline < 5:
            for kind, vals in declared.items():
                # vals is a list of (n, pos); pick the most frequent n
                from collections import Counter
                decl_n = Counter(n for n, _ in vals).most_common(1)[0][0]
                if decl_n > 10:
                    list_only.append((p.relative_to(ROOT).as_posix(), n_inline, decl_n))
                    break
    if bad_count == 0 and not list_only:
        print("✅ all declared counts match actual inline counts")
    else:
        if bad_count:
            print(f"⚠️  {bad_count} chapter(s) have declared-vs-actual drift")
        if list_only:
            print()
            print("# informational: chapters with list-only style (bare 4-digit IDs, not [ex:NNNN] refs)")
            for rel, n_inline, decl_n in list_only:
                print(f"   - {rel}  inline [ex:NNNN] = {n_inline}  (list-section declares {decl_n}, expected to be checked manually)")

if __name__ == "__main__":
    main()
