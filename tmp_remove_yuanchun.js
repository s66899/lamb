const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
let count = 0;

// Replace all 元淳 references with unified coach system names
const replacements = {
  '元淳教练系统': '教练系统',
  '元淳6专家': '6专家',
  '元淳系统': '教练系统',
  '元淳联合6位专家': '6位专家联合',
  '+ 元淳教练系统': '',
};

for (const [oldText, newText] of Object.entries(replacements)) {
  const c = (code.split(oldText).length - 1);
  if (c > 0) {
    code = code.split(oldText).join(newText);
    count += c;
    console.log(`Replaced "${oldText}" → "${newText}" (${c}x)`);
  }
}

fs.writeFileSync('app.js', code, 'utf8');
console.log(`Total ${count} replacements done.`);

// Also check coach/ files
const coachIndexHtml = 'coach/index.html';
if (fs.existsSync(coachIndexHtml)) {
  const coachCode = fs.readFileSync(coachIndexHtml, 'utf8');
  if (coachCode.includes('六专家')) {
    console.log('Note: coach/index.html has 六专家 - might need review');
  }
}
