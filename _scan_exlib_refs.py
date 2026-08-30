#!/usr/bin/env python3
"""扫所有 books/*.md 内 ex:#### 引用 vs _valid_ids.txt 合法 id，找出 broken。"""
import re, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
VALID_FILE = os.path.join(ROOT, '_valid_ids.txt')
BOOKS = os.path.join(ROOT, 'books')

def main():
    valid = set()
    with open(VALID_FILE, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.isdigit() and len(line) == 4:
                valid.add(line)
    print(f'合法 ex-lib id: {len(valid)} 个')

    ref_re = re.compile(r'(?<!\d)ex:(\d{4})(?!\d)')

    all_refs = set()
    per_file = []
    for dirpath, _, files in os.walk(BOOKS):
        for fn in sorted(files):
            if not fn.endswith('.md'):
                continue
            p = os.path.join(dirpath, fn)
            try:
                text = open(p, encoding='utf-8').read()
            except Exception as e:
                print(f'WARN skip {p}: {e}', file=sys.stderr)
                continue
            ids = ref_re.findall(text)
            if not ids:
                continue
            uniq = set(ids)
            bad = sorted(uniq - valid)
            all_refs |= uniq
            if bad:
                rel = os.path.relpath(p, ROOT)
                per_file.append((rel, len(uniq), len(bad), bad))

    print(f'被引用的唯一 id: {len(all_refs)} 个')
    print(f'broken 引用文件: {len(per_file)} 个')
    print()
    for rel, t, b, sample in per_file:
        print(f'  {rel}: unique={t} broken={b} sample={sample}')

if __name__ == '__main__':
    main()
