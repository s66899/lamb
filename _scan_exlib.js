// 一次性扫描：books/**/*.md 里的 [ex:NNNN] / [ex:NNNN 中文名] 引用 vs books/exercises/ex-lib.json 库
// 关键：regex 用 LOOSE 形式 \[ex:(\d{4})[^\]]*\]，同时识别「[ex:NNNN]」标准式与「[ex:NNNN 中文名]」表格式（羽毛球 ch12 / NSCA ch04-ch09 大量使用）
// 历史：v3.22.62 之前用 STRICT \[ex:(\d{4})\] 仅识别标准式，导致 170 处「[ex:NNNN 中文名]」被扫描器盲区忽略；LOOSE 上线后总引用数 351 → 521，0 broken 不变（库内合法）
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
      // LOOSE: 识别 [ex:NNNN] 与 [ex:NNNN 中文名] 两种格式
      const ms = t.match(/\[ex:(\d{4})[^\]]*\]/g) || [];
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
