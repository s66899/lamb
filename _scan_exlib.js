// 一次性扫描：books/**/*.md 里的 [ex:NNNN] 引用 vs books/exercises/ex-lib.json 库
const fs = require('fs');
const path = require('path');

const lib = JSON.parse(fs.readFileSync('books/exercises/ex-lib.json', 'utf8'));
const valid = new Set(lib.map(e => String(e.id).padStart(4, '0')));
console.log('ex-lib total ids:', valid.size);

let total = 0, broken = 0;
const brokens = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.md')) {
      const t = fs.readFileSync(p, 'utf8');
      const ms = t.match(/\[ex:(\d{4})\]/g) || [];
      for (const m of ms) {
        const id = m.slice(4, 8);
        total++;
        if (!valid.has(id)) {
          broken++;
          if (brokens.length < 30) brokens.push(p + ' -> ' + id);
        }
      }
    }
  }
}
walk('books');
console.log('total refs =', total, 'broken =', broken);
for (const b of brokens) console.log('  X', b);
