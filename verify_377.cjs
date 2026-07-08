// verify_377.cjs — v3.7.7 实操验证
// 1. JS parse + run 顶层
// 2. applyProfileToWeights 数学正确性
// 3. 路径: 无 profile / 有 injuries / 有 strengths / 都有

const fs = require('fs');
const path = require('path');
const repo = process.cwd();
const log = (k, v) => console.log(`  ${k.padEnd(34)} ${v}`);

console.log('═'.repeat(64));
console.log('  v3.7.7 段 C 验证 (JS parse + 数学)');
console.log('═'.repeat(64));

// 1. 读文件 + parse
const appJs = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
const manifest = fs.readFileSync(path.join(repo, 'manifest_data.js'), 'utf8');

log('app.js bytes', appJs.length);

const vm = require('vm');
const stub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
  document: { 
    getElementById: () => null,
    querySelector: () => null, 
    querySelectorAll: () => [], 
    addEventListener: () => {},
    body: { appendChild:()=>{} },
    createElement: () => ({ style:{}, classList:{add:()=>{},remove:()=>{}}, addEventListener:()=>{} })
  },
  location: { hash: '', pathname: '', search: '' },
  history: { pushState: () => {}, replaceState: () => {} },
  fetch: () => Promise.reject(new Error('offline')),
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  console: console, 
  navigator: { userAgent: 'verify-377', language: 'zh-CN', onLine: false },
  screen: { width: 1280, height: 800 },
  requestAnimationFrame: (fn) => setTimeout(() => fn(0), 16),
  MutationObserver: function() { this.observe=()=>{}; this.disconnect=()=>{}; }
};
vm.createContext(stub);

try {
  new vm.Script(manifest);
  new vm.Script(appJs);
  vm.runInContext(`var window = this;\n${appJs}`, stub);
  log('app.js parse + run', '✅');
} catch (e) {
  log('app.js parse/run', `❌ ${e.message.split('\n')[0]}`);
  console.log(e.stack);
  process.exit(1);
}

// 2. 取 LEVELS + 函数
const LEVELS = vm.runInContext('LEVELS', stub);
const applyProfileToWeights = vm.runInContext('applyProfileToWeights', stub);
const INJURY_RULES = vm.runInContext('INJURY_RULES', stub);
const STRENGTH_RULES = vm.runInContext('STRENGTH_RULES', stub);

log('LEVELS 总数', LEVELS.length);
log('INJURY_RULES 总数', INJURY_RULES.length);
log('STRENGTH_RULES 总数', STRENGTH_RULES.length);

// 3. 数学正确性
console.log('');
console.log('  ── 数学正确性 ──');

// 路径 A: 无 profile
const noProf = applyProfileToWeights(LEVELS[0].abilities, null);
const noProfOK = noProf.every(a => a.effective === a.weight && a.marker === '' && a.original === a.weight);
log('A. 无 profile → effective = weight', noProfOK ? '✅' : '❌');

// 路径 B: 只有 injuries = ['shoulder']
const injShoulder = applyProfileToWeights(LEVELS[0].abilities, { injuries:['shoulder'], strengths:[] });
console.log('  B. 肩伤作用于 LEVELS[0]:');
injShoulder.forEach(a => console.log(`     ${a.name.padEnd(20)} base=${a.original} eff=${a.effective} mkr=${a.marker}`));

// 路径 C: 只有 strengths = ['endurance']
const strEndur = applyProfileToWeights(LEVELS[2].abilities, { injuries:[], strengths:['endurance'] });
console.log('  C. 体能优势作用于 LEVELS[2] (反手技术级):');
strEndur.forEach(a => console.log(`     ${a.name.padEnd(20)} base=${a.original} eff=${a.effective} mkr=${a.marker}`));

// 路径 D: 都勾 — 膝伤 + 力量大
const combo = applyProfileToWeights(LEVELS[3].abilities, { injuries:['knee'], strengths:['power'] });
console.log('  D. 膝伤+力量大 作用于 LEVELS[3] (杀球级):');
combo.forEach(a => console.log(`     ${a.name.padEnd(20)} base=${a.original} eff=${a.effective} mkr=${a.marker}`));

// 路径 E: 学习快 = 全级 +20%
const learn = applyProfileToWeights(LEVELS[0].abilities, { injuries:[], strengths:['learning'] });
console.log('  E. 学习快 作用于 LEVELS[0]:');
learn.forEach(a => console.log(`     ${a.name.padEnd(20)} base=${a.original} eff=${a.effective} mkr=${a.marker}`));

// 路径 F: 反手 + 腕伤冲突 — 腕伤杀 0.6, 左手反手 +1.25 → 0.6 * 1.25 = 0.75
const conflict = applyProfileToWeights(LEVELS[1].abilities, { injuries:['wrist'], strengths:['left'] });
const fHits = conflict.find(a => a.name.indexOf('反手') >= 0);
console.log('  F. 腕伤+左手 冲突验证:');
if (fHits) console.log(`     ${fHits.name.padEnd(20)} base=${fHits.original} eff=${fHits.effective} mkr="${fHits.marker}" (预期 ≈ ${Math.round(fHits.original * 0.6 * 1.25)})`);

// 4. 函数暴露
console.log('');
console.log('  ── 函数暴露 ──');
log('openStudentProfile', typeof vm.runInContext('openStudentProfile', stub) === 'function' ? '✅' : '❌');
log('submitProfile', typeof vm.runInContext('submitProfile', stub) === 'function' ? '✅' : '❌');
log('renderProfileStep1', typeof vm.runInContext('renderProfileStep1', stub) === 'function' ? '✅' : '❌');
log('renderProfileStep2', typeof vm.runInContext('renderProfileStep2', stub) === 'function' ? '✅' : '❌');
log('renderProfileStep3', typeof vm.runInContext('renderProfileStep3', stub) === 'function' ? '✅' : '❌');
log('toggleInjury', typeof vm.runInContext('toggleInjury', stub) === 'function' ? '✅' : '❌');
log('toggleStrength', typeof vm.runInContext('toggleStrength', stub) === 'function' ? '✅' : '❌');
log('showOverlayContent', typeof vm.runInContext('showOverlayContent', stub) === 'function' ? '✅' : '❌');
log('showToast', typeof vm.runInContext('showToast', stub) === 'function' ? '✅' : '❌');
log('getProfile', typeof vm.runInContext('getProfile', stub) === 'function' ? '✅' : '❌');
log('setProfile', typeof vm.runInContext('setProfile', stub) === 'function' ? '✅' : '❌');

console.log('');
console.log('═'.repeat(64));
console.log('  段 C 验证结束');
console.log('═'.repeat(64));
