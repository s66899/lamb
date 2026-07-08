// verify_379.cjs — v3.7.9 段 C 验证 (用 stub.localStorage.setItem 模拟)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const repo = process.cwd();
const log = (k, v) => console.log(`  ${k.padEnd(40)} ${v}`);

console.log('='.repeat(72));
console.log('  v3.7.9 段 C 验证 (6维 + 评语)');
console.log('='.repeat(72));

const appJs = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
const manifest = fs.readFileSync(path.join(repo, 'manifest_data.js'), 'utf8');

// 用 stub.localStorage 内部 state (避免 outer store 沙箱差异)
const lsState = {};
const stub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    getItem: k => (k in lsState ? lsState[k] : null),
    setItem: (k, v) => { lsState[k] = String(v); },
    removeItem: k => { delete lsState[k]; },
    clear: () => { Object.keys(lsState).forEach(k => delete lsState[k]); }
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ style:{}, classList:{add:()=>{},remove:()=>{}}, addEventListener:()=>{} }),
    body: { appendChild:()=>{}, removeChild:()=>{} }
  },
  location: { hash: '', pathname: '', search: '' },
  history: { pushState: () => {}, replaceState: () => {} },
  fetch: () => Promise.reject(new Error('offline')),
  setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
  console,
  navigator: { userAgent: 'verify-379', language: 'zh-CN', onLine: false },
  screen: { width: 1280, height: 800 },
  requestAnimationFrame: fn => setTimeout(() => fn(0), 16),
  MutationObserver: function() { this.observe=()=>{}; this.disconnect=()=>{}; }
};
vm.createContext(stub);

try {
  new vm.Script(manifest);
  new vm.Script(appJs);
  vm.runInContext(`var window = this;\n${manifest}\n${appJs}`, stub);
  // 手动模拟 DOMContentLoaded：把 MANIFEST 设为 MANIFEST_DATA
  vm.runInContext(`MANIFEST = MANIFEST_DATA`, stub);
  log('all parse + run', 'OK');
} catch (e) {
  log('script error', `FAIL ${e.message.split('\n')[0]}`);
  console.log(e.stack);
  process.exit(1);
}

// === 1. calcAbilityScore 6 维 ===
console.log('');
console.log('  -- 1. calcAbilityScore 6 维数学 --');
const calcAbilityScore = vm.runInContext('calcAbilityScore', stub);
const a = calcAbilityScore();
log('score 范围 0~100', (a.score >= 0 && a.score <= 100) ? 'OK' : 'FAIL');
log('dims 包含 application', a.dims.application !== undefined ? 'OK' : 'FAIL');
log('application 默认 50% (无 localStorage)', Math.round(a.dims.application) === 50 ? 'OK' : `FAIL got ${Math.round(a.dims.application)}`);

// 用 stub.localStorage.setItem 在 vm context 内
vm.runInContext(`localStorage.setItem('lamb_application_v1', '${JSON.stringify({score:0.85})}')`, stub);
const a2 = calcAbilityScore();
log('set score=0.85 → application=85%', Math.round(a2.dims.application) === 85 ? 'OK' : `FAIL got ${Math.round(a2.dims.application)}`);

vm.runInContext(`localStorage.setItem('lamb_application_v1', '{"score":1.5}')`, stub);
const a3 = calcAbilityScore();
log('score=1.5 裁到 100%', Math.round(a3.dims.application) === 100 ? 'OK' : `FAIL got ${Math.round(a3.dims.application)}`);

vm.runInContext(`localStorage.setItem('lamb_application_v1', '{"score":-0.5}')`, stub);
const a4 = calcAbilityScore();
log('score=-0.5 裁到 0%', Math.round(a4.dims.application) === 0 ? 'OK' : `FAIL got ${Math.round(a4.dims.application)}`);

vm.runInContext(`localStorage.setItem('lamb_application_v1', 'garbage')`, stub);
const a5 = calcAbilityScore();
log('score=garbage JSON fallback 50%', Math.round(a5.dims.application) === 50 ? 'OK' : `FAIL got ${Math.round(a5.dims.application)}`);

vm.runInContext(`localStorage.removeItem('lamb_application_v1')`, stub);
const a6 = calcAbilityScore();
log('key missing fallback 50%', Math.round(a6.dims.application) === 50 ? 'OK' : `FAIL got ${Math.round(a6.dims.application)}`);

// === 2. 评论 CRUD ===
console.log('');
console.log('  -- 2. 评论 CRUD --');
vm.runInContext(`localStorage.removeItem('lamb_received_comments_v1')`, stub);
const empty = JSON.stringify(vm.runInContext('getComments', stub)());
log('empty = []', empty === '[]' ? 'OK' : `FAIL got ${empty}`);

vm.runInContext(`localStorage.setItem('lamb_received_comments_v1', 'invalid json')`, stub);
const corrupt = JSON.stringify(vm.runInContext('getComments', stub)());
log('corrupt json fallback []', corrupt === '[]' ? 'OK' : `FAIL got ${corrupt}`);

vm.runInContext(`localStorage.removeItem('lamb_received_comments_v1')`, stub);
vm.runInContext(`
  addComment({ author: '李教练', role: 'coach', text: '杀球角度不错' });
  addComment({ author: '王教练', role: 'coach', text: '网前推球偏急' });
`, stub);
const list = vm.runInContext('getComments', stub)();
log('add 2 条后 list.length = 2', list.length === 2 ? 'OK' : `FAIL got ${list.length}`);
log('author/role/text 都存', list[0].author === '李教练' && list[0].role === 'coach' && list[0].text === '杀球角度不错' ? 'OK' : 'FAIL');

// 空 author
vm.runInContext(`localStorage.removeItem('lamb_received_comments_v1')`, stub);
vm.runInContext(`addComment({ author: '', text: 'no name' })`, stub);
const list2 = vm.runInContext('getComments', stub)();
log('空 author fallback "教练"', list2[0].author === '教练' ? 'OK' : `FAIL got "${list2[0].author}"`);

// deleteComment
vm.runInContext(`localStorage.removeItem('lamb_received_comments_v1')`, stub);
vm.runInContext(`var c = addComment({ author: 'A', text: 'X' })`, stub);
const c = vm.runInContext('getComments', stub)()[0];
vm.runInContext(`deleteComment('${c.id}')`, stub);
const afterDel = vm.runInContext('getComments', stub)();
log('deleteComment 移除', afterDel.length === 0 ? 'OK' : `FAIL got ${afterDel.length}`);

// === 3. 关键函数暴露 ===
console.log('');
console.log('  -- 3. 函数暴露 --');
['openStudentProfile','renderProfileMain','renderCommentWriter','submitComment','readApplicationProgress','getComments','addComment','deleteComment','showOverlayContent','showToast'].forEach(name => {
  const fn = vm.runInContext(name, stub);
  log(name, typeof fn === 'function' ? 'OK' : 'FAIL');
});

console.log('');
console.log('='.repeat(72));
console.log('  段 C 验证结束');
console.log('='.repeat(72));
