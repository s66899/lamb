// verify_378.cjs — v3.7.8 密码安全修复验证
// 模拟: localStorage / DOM / 反复刷新
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const repo = process.cwd();

const indexHtml = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
const manifest = fs.readFileSync(path.join(repo, 'manifest_data.js'), 'utf8');

const log = (k, v) => console.log(`  ${k.padEnd(40)} ${v}`);

console.log('═'.repeat(72));
console.log('  v3.7.8 段 C 验证 (密码安全修复)');
console.log('═'.repeat(72));

// ---- 构造一个简单 DOM stub ----
class FakeEl {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this._listeners = {};
    this.display = '';
  }
  appendChild(c) { this.children.push(c); }
  removeChild(c) { this.children = this.children.filter(x => x !== c); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  getAttribute() { return null; }
  addEventListener(t, fn) { (this._listeners[t]=this._listeners[t]||[]).push(fn); }
  removeEventListener(t, fn) { this._listeners[t] = (this._listeners[t]||[]).filter(x=>x!==fn); }
  focus() {}
  click() {}
  remove() {}
  get classList() { return { add: () => {}, remove: () => {} }; }
}

const domElements = {};
['pwOverlay','pwInput','pwErr','adminOverlay','adminPwInput','adminContent'].forEach(id => {
  domElements[id] = new FakeEl(id);
});

const documentStub = {
  getElementById: id => domElements[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => new FakeEl(),
  body: { appendChild: () => {}, removeChild: () => {} },
  documentElement: { style: { setProperty: () => {} } }
};

// localStorage stub (mock 持久化,模拟刷新要重置)
function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: i => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; }
  };
}
const localStorage = makeLocalStorage();

// XMLHttpRequest stub
class FakeXHR {
  constructor() { this.timeout = 0; this.onload = null; this.onerror = null; }
  open() {}
  setRequestHeader() {}
  send() { setImmediate(() => { if (this.onerror) this.onerror(); }); }
}
global.XMLHttpRequest = FakeXHR;

const stub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage,
  document: documentStub,
  location: { hash: '', pathname: '', search: '' },
  history: { pushState: () => {}, replaceState: () => {} },
  fetch: () => Promise.reject(new Error('offline')),
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval,
  console,
  navigator: { userAgent: 'verify-378', language: 'zh-CN', onLine: false, platform: 'win32' },
  screen: { width: 1280, height: 800 },
  requestAnimationFrame: fn => setTimeout(() => fn(0), 16),
  MutationObserver: function() { this.observe=()=>{}; this.disconnect=()=>{}; },
  XMLHttpRequest: FakeXHR,
};
vm.createContext(stub);

// 解析 index.html 里的密码 script
const scriptMatch = indexHtml.match(/<script>\s*(\/\* [\s\S]*?function initPwGate[\s\S]*?)<\/script>/);
if (!scriptMatch) {
  log('extract password script', '❌ 没找到');
  process.exit(1);
}
const pwScript = scriptMatch[1];
log('extracted password script bytes', pwScript.length);

// 1) 解析 + 执行 app.js (用来对照)
try {
  new vm.Script(manifest);
  new vm.Script(pwScript);
  new vm.Script(appJs);
  vm.runInContext(`var window = this;\n${manifest}\n${pwScript}\n${appJs}`, stub);
  log('all scripts parse + run', '✅');
} catch (e) {
  log('script error', `❌ ${e.message.split('\n')[0]}`);
  console.log(e.stack);
  process.exit(1);
}

// ---- 测试 ----

console.log('');
console.log('  ── 场景 1: 旧 SITE_KEY 缓存存在 → 启动时清掉 ──');
localStorage.setItem('lamb_auth', JSON.stringify({t:Date.now(),v:1}));
log('reset lamb_auth 模拟旧用户', '✅');
const initPwGate = vm.runInContext('initPwGate', stub);
try { initPwGate(); } catch(e) { log('initPwGate throw', `❌ ${e.message}`); }
const ovAfterInit = domElements.pwOverlay.style.display === 'flex';
const lambAuthAfter = localStorage.getItem('lamb_auth');
log('pwOverlay display=flex (要求输入)', ovAfterInit ? '✅' : '❌');
log('lamb_auth 已清掉', lambAuthAfter === null ? '✅' : `❌ 残留: ${lambAuthAfter}`);

console.log('');
console.log('  ── 场景 2: 错误密码 → 不写缓存 + 显示错误 ──');
const checkPw = vm.runInContext('checkPw', stub);
domElements.pwInput.value = 'wrongpw';
try { checkPw(); } catch(e) { log('checkPw throw', `❌ ${e.message}`); }
const errVisible = domElements.pwErr.style.display === 'block';
const errText = domElements.pwErr.textContent;
const ovStill = domElements.pwOverlay.style.display === 'flex';
log('pwErr 显示', errVisible ? '✅' : '❌');
log('pwErr 文本 含错误提示', errText.includes('错误') ? '✅' : `❌ "${errText}"`);
log('pwOverlay 仍 flex (没解锁)', ovStill ? '✅' : '❌');
log('localStorage 没新增 lamb_auth', localStorage.getItem('lamb_auth') === null ? '✅' : '❌');

console.log('');
console.log('  ── 场景 3: 正确密码 → 关闭 overlay + 清缓存 + 不写新缓存 ──');
domElements.pwInput.value = 'syy';
localStorage.setItem('lamb_auth', JSON.stringify({t:Date.now(),v:1}));  // 模拟残留
try { checkPw(); } catch(e) { log('checkPw throw', `❌ ${e.message}`); }
const ovAfterCorrect = domElements.pwOverlay.style.display === 'none';
const authAfterCorrect = localStorage.getItem('lamb_auth');
log('pwOverlay hidden', ovAfterCorrect ? '✅' : `❌ "${domElements.pwOverlay.style.display}"`);
log('lamb_auth 清掉', authAfterCorrect === null ? '✅' : `❌ 残留: ${authAfterCorrect}`);

console.log('');
console.log('  ── 场景 4: 模拟刷新页面 (re-init) → 必须重新输入 ──');
domElements.pwOverlay.style.display = '';  // 重置 overlay
domElements.pwInput.value = '';
try { initPwGate(); } catch(e) { log('initPwGate throw (refresh)', `❌ ${e.message}`); }
const ovAfterRefresh = domElements.pwOverlay.style.display === 'flex';
log('刷新后 pwOverlay 重新显示 flex', ovAfterRefresh ? '✅' : '❌');
log('  → 刷新后必须重新输入密码', ovAfterRefresh ? '✅ 安全 ✅' : '❌ 危险,可绕过');

console.log('');
console.log('  ── 场景 5: localStorage 报错 → 系统不崩 ──');
const ls2 = {
  _throwGet: false, _throwSet: false, _throwRemove: false,
  store: {},
  getItem(k) { if (this._throwGet) throw new Error('mock getItem fail'); return this.store[k] || null; },
  setItem(k,v) { if (this._throwSet) throw new Error('mock setItem fail'); this.store[k] = String(v); },
  removeItem(k) { if (this._throwRemove) throw new Error('mock removeItem fail'); delete this.store[k]; }
};
const stub2 = { ...stub, localStorage: ls2 };
stub2.console = console;
vm.createContext(stub2);
try {
  new vm.Script(manifest);
  new vm.Script(pwScript);
  vm.runInContext(`var window = this;\n${manifest}\n${pwScript}`, stub2);
  ls2._throwRemove = true;
  const init2 = vm.runInContext('initPwGate', stub2);
  init2();
  log('localStorage.removeItem 抛错也不崩', '✅');
} catch(e) {
  log('localStorage 报错 → 系统崩', `❌ ${e.message}`);
}

console.log('');
console.log('═'.repeat(72));
console.log('  段 C 验证结束');
console.log('═'.repeat(72));
