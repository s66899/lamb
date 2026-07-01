const fs = require('fs');

// Get word counts from yin-yang chapters
const yinYangDir = './books/yin-yang';
const files = fs.readdirSync(yinYangDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
const counts = {};
files.forEach(f => {
  const content = fs.readFileSync(yinYangDir + '/' + f, 'utf8');
  const chinese = content.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  const plain = content.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const tokens = plain.split(/[\s,;:.!?()\[\]{}""''\u3000\u3001\u3002\uff0c\uff1b\uff1a\u201c\u201d\u2018\u2019\u300a\u300b\u300e\u300f\uff08\uff09\u2014\u2013\u2026\u00b7]+/)
    .filter(w => w.length > 0 && /[a-zA-Z0-9]/.test(w));
  counts[f] = chinese.length + tokens.length;
});

// Update manifest
let manifest = fs.readFileSync('manifest_data.js', 'utf8');

// For each yin-yang chapter, update the words count
for (const [file, count] of Object.entries(counts)) {
  const regex = new RegExp('("file":\\s*"' + file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]*?"words":\\s*)\\d+', 'g');
  manifest = manifest.replace(regex, '$1' + count);
}

fs.writeFileSync('manifest_data.js', manifest, 'utf8');
console.log('Manifest updated successfully');

// Print what was done
for (const [file, count] of Object.entries(counts)) {
  console.log(file + ': ' + count);
}
