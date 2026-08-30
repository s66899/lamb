"""Fix 4 books' manifest chapter title from English to Chinese (H1 minus prefix).

Mirror 2d0a09d strategy: title = H1 stripped of "第N章" / "第N章配套" prefix.
Books: badminton / engineering-mechanics / finance / psychology.

Writes both manifest.json and manifest_data.js with CRLF preserved.
"""
import json, re, os

ROOT = 'D:/lamb/projects/qingyu'
BOOKS = ['badminton', 'engineering-mechanics', 'finance', 'psychology']

def has_cn(s):
    return any('\u4e00' <= x <= '\u9fff' for x in s)

def h1_to_title(h1):
    s = h1.strip()
    s = re.sub(r'^第[一二三四五六七八九十百千零〇\d]+章(配套)?[\s:：]*', '', s)
    return s.strip()

# --- Read both files in binary to detect CRLF ---
with open(f'{ROOT}/manifest.json', 'rb') as f:
    raw_json = f.read()
crlf_json = b'\r\n' in raw_json

with open(f'{ROOT}/manifest_data.js', 'rb') as f:
    raw_js = f.read()
crlf_js = b'\r\n' in raw_js

assert crlf_json, 'manifest.json should be CRLF'
assert crlf_js, 'manifest_data.js should be CRLF'

# --- Decode & parse ---
m = json.loads(raw_json.decode('utf-8'))
m_js_text = re.search(r'const MANIFEST_DATA\s*=\s*(\{.*\})\s*;?\s*$',
                       raw_js.decode('utf-8'), re.DOTALL).group(1)
m_js = json.loads(m_js_text)

# --- Apply changes ---
changes = []
for m_obj in [m, m_js]:
    for b in m_obj['books']:
        if b['id'] not in BOOKS:
            continue
        for c in b['chapters']:
            if has_cn(c['title']):
                continue
            p = f'{ROOT}/books/{b["id"]}/{c["file"]}'
            with open(p, 'r', encoding='utf-8') as f:
                text = f.read()
            m1 = re.search(r'^#\s+(.+)$', text, re.MULTILINE)
            if not m1:
                continue
            new_title = h1_to_title(m1.group(1).strip())
            if not has_cn(new_title):
                continue
            old = c['title']
            c['title'] = new_title
            changes.append((b['id'], c['file'], old, new_title))

# --- Verify equality ---
def fingerprint(m_obj):
    return [(b['id'], c['file'], c['title'])
            for b in m_obj['books'] for c in b['chapters']]
assert fingerprint(m) == fingerprint(m_js), 'json != js after edit'

# --- Write back manifest.json (CRLF) ---
new_json_text = json.dumps(m, ensure_ascii=False, indent=2).replace('\n', '\r\n')
with open(f'{ROOT}/manifest.json', 'wb') as f:
    f.write(new_json_text.encode('utf-8'))

# --- Write back manifest_data.js (CRLF) ---
new_js_inner = json.dumps(m_js, ensure_ascii=False, indent=2).replace('\n', '\r\n')
new_js_full = f'const MANIFEST_DATA = {new_js_inner};\r\n'
with open(f'{ROOT}/manifest_data.js', 'wb') as f:
    f.write(new_js_full.encode('utf-8'))

# --- Report ---
print(f'Applied {len(changes)} title changes (manifest.json + manifest_data.js 同步):')
for bid, fn, old, new in changes:
    print(f'  [{bid:<22}] {fn:<50}  {old}  →  {new}')

# --- Post-write validation ---
with open(f'{ROOT}/manifest.json', 'rb') as f:
    raw_j_after = f.read()
with open(f'{ROOT}/manifest_data.js', 'rb') as f:
    raw_js_after = f.read()
assert b'\r\n' in raw_j_after, 'manifest.json lost CRLF'
assert b'\r\n' in raw_js_after, 'manifest_data.js lost CRLF'

m_v = json.loads(raw_j_after.decode('utf-8'))
m_js_v = json.loads(re.search(r'const MANIFEST_DATA\s*=\s*(\{.*\})\s*;?\s*$',
                               raw_js_after.decode('utf-8'), re.DOTALL).group(1))
assert fingerprint(m_v) == fingerprint(m_js_v), 'json != js after write'

n_cn_books = sum(1 for b in m_v['books'] if b['id'] in BOOKS)
n_chapters = sum(len(b['chapters']) for b in m_v['books'] if b['id'] in BOOKS)
n_titles_cn = sum(1 for b in m_v['books'] if b['id'] in BOOKS
                   for c in b['chapters'] if has_cn(c['title']))
print(f'\n=== Validation: {n_cn_books} books / {n_chapters} chapters / {n_titles_cn} chapters now have CN title ===')
print('  CRLF preserved on both files ✓')
print('  json == js ✓')
