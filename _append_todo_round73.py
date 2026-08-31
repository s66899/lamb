#!/usr/bin/env python3
# _append_todo_round73.py — 2026-08-31
import io

SESSION = r"D:\lamb\projects\qingyu\_session_todo.md"
APPEND = r"D:\lamb\projects\qingyu\_append_todo_round73.md"

with open(APPEND, "r", encoding="utf-8") as f:
    new_block = f.read()

with open(SESSION, "a", encoding="utf-8") as f:
    # ensure exactly one blank line separator
    if not new_block.endswith("\n"):
        new_block += "\n"
    f.write("\n" + new_block)

print(f"appended {len(new_block)} chars from {APPEND} to {SESSION}")
