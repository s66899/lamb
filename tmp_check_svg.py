import xml.etree.ElementTree as ET

tree = ET.parse(r'D:\openclaw\workspace\worm-gear-lift-platform\books\yin-yang\diagrams\five-elements-cycle.svg')
root = tree.getroot()
ns = '{http://www.w3.org/2000/svg}'

print("=== Circles ===")
for c in root.findall(f'.//{ns}circle'):
    cx = c.get('cx')
    cy = c.get('cy')
    r = c.get('r')
    fill = c.get('fill', '')
    stroke = c.get('stroke', '')
    print(f'  cx={cx:>3} cy={cy:>3} r={r:>3}  fill={fill[:30]} stroke={stroke[:20]}')

print("\n=== Arrow Paths (fill=none) ===")
for p in root.findall(f'.//{ns}path'):
    fill = p.get('fill','')
    if fill == 'none':
        d = p.get('d','')[:50]
        me = p.get('marker-end','')
        print(f'  marker-end={me}')
        print(f'  d={d}')
        print()

print("\n=== Text Elements ===")
for t in root.findall(f'.//{ns}text'):
    x = t.get('x')
    y = t.get('y')
    text = (t.text or '').strip()
    print(f'  ({x},{y}): "{text}"')

print("\n=== All checks passed ===")
