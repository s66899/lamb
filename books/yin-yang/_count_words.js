const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.md'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const chinese = content.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  const plain = content.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const tokens = plain.split(/[\s,;:.!?()\[\]{}""''\u3000\u3001\u3002\uff0c\uff1b\uff1a\u201c\u201d\u2018\u2019\u300a\u300b\u300e\u300f\uff08\uff09\u2014\u2013\u2026\u00b7]+/).filter(w => w.length > 0 && /[a-zA-Z0-9]/.test(w));
  const total = chinese.length + tokens.length;
  console.log(f + ' -> ' + total);
});
