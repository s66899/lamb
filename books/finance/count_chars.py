# -*- coding: utf-8 -*-
import re

with open('D:/openclaw/workspace/worm-gear-lift-platform/books/finance/ch05-stock-valuation.md', 'r', encoding='utf-8') as f:
    c = f.read()

cn = re.findall(r'[\u4e00-\u9fff]', c)
total = len(c)
print(f"Total characters: {total}")
print(f"Chinese characters: {len(cn)}")
print(f"Total bytes: {len(c.encode('utf-8'))}")
