import xml.etree.ElementTree as ET
tree = ET.parse(r'D:\openclaw\workspace\worm-gear-lift-platform\books\yin-yang\diagrams\five-elements-cycle.svg')
root = tree.getroot()
ns = '{http://www.w3.org/2000/svg}'

# Check arrow paths
paths = root.findall(f'.//{ns}path')
arrow_count = 0
for p in paths:
    me = p.get('marker-end', '')
    if me:
        arrow_count += 1
        d = p.get('d', '')
        print(f'Arrow #{arrow_count}: marker={me} d=|{d}|')

# Check text nodes for Chinese chars
texts = root.findall(f'.//{ns}text')
chars = []
for t in texts:
    if t.text and len(t.text.strip()) > 0:
        chars.append(t.text.strip())
print(f'\nText content: {chars}')

# Check markers
markers = root.findall(f'.//{ns}marker')
print(f'\nMarkers: {[m.get("id") for m in markers]}')

# Check translates (node positions)
gs = root.findall(f'.//{ns}g')
for g in gs:
    t = g.get('transform', '')
    if t.startswith('translate'):
        # Find Chinese char child
        for child in g.iter():
            if child.text and len(child.text.strip()) == 1 and ord(child.text.strip()) > 0x4E00:
                print(f'Node: "{child.text}" at {t}')
                break

print('\nDone!')
