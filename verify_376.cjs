// verify_376.cjs — v3.7.6 实操验证
// 1. 检查 index.html/app.js/style.css 三件可被 vm.Script 解析
// 2. CSS 语法校验（用正则）
// 3. 模拟 jsdom 跑 app.js — 不真正需要 jsdom，用 new Function

const fs = require('fs');
const path = require('path');

const repo = process.cwd();
const log = (k, v) => console.log(`  ${k.padEnd(28)} ${v}`);

console.log('═'.repeat(64));
console.log('  v3.7.6 段 C 验证 (CSS + JS 双轨)');
console.log('═'.repeat(64));

// 1. 三个文件存在
const indexHtml = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(repo, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');
const manifest = fs.readFileSync(path.join(repo, 'manifest_data.js'), 'utf8');

log('index.html bytes', indexHtml.length);
log('style.css bytes', styleCss.length);
log('app.js bytes', appJs.length);
log('manifest_data.js bytes', manifest.length);

// 2. 版本号一致性
const cssVMatch = /v3\.7\.6/.test(styleCss);
const jsV = (appJs.match(/const APP_VERSION = '([^']+)'/) || [])[1];
const htmlV = (indexHtml.match(/style\.css\?v=([^"]+)"/) || [])[1];
const jsCacheV = (indexHtml.match(/app\.js\?v=([^"]+)"/) || [])[1];
const manifestV = (indexHtml.match(/manifest_data\.js\?v=([^"]+)"/) || [])[1];

console.log('');
console.log('  ── 版本一致性 ──');
log('style.css contains v3.7.6', cssVMatch ? '✅' : '❌');
log('app.js APP_VERSION', jsV);
log('index.html style.css?v=', htmlV);
log('index.html app.js?v=', jsCacheV);
log('index.html manifest_data.js?v=', manifestV);

const allSame = jsV === 'v3.7.6' && htmlV === 'v3.7.6' && jsCacheV === 'v3.7.6' && manifestV === 'v3.7.6';
log('全部 = v3.7.6', allSame ? '✅' : '❌');

// 3. CSS 语法 — 检查 keyframes 完整 { } 配对
console.log('');
console.log('  ── CSS 语法 ──');
const floatLogoMatch = styleCss.match(/@keyframes floatLogo\s*\{[\s\S]*?\}/);
log('floatLogo keyframes 完整', floatLogoMatch ? '✅' : '❌');
log('  | 0%/50%/100% 都有', (floatLogoMatch && /0%, 100%/.test(floatLogoMatch[0]) && /50%\s*\{/.test(floatLogoMatch[0])) ? '✅' : '❌');

const prmMatch = styleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/);
log('prefers-reduced-motion 媒体查询', prmMatch ? '✅' : '❌');
log('  | .h-logo { animation: none }', (prmMatch && /\.h-logo[^{]*\{\s*animation:\s*none/.test(prmMatch[0])) ? '✅' : '❌');

// 4. .h-logo 应用 animation
const hLogoAnim = /\.h-logo\s*\{[^}]*animation:\s*floatLogo/.test(styleCss);
log('.h-logo 应用 floatLogo animation', hLogoAnim ? '✅' : '❌');

// 5. JS 静态语法 (vm.Script 解析)
console.log('');
console.log('  ── JS 静态解析 (vm.Script) ──');
const vm = require('vm');
try {
  // 把 DOM/Window/相关包成 stub
  const stubWindow = {
    addEventListener: () => {},
    localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
    document: { 
      getElementById: () => null,
      querySelector: () => null, 
      querySelectorAll: () => [], 
      addEventListener: () => {},
      body: { appendChild:()=>{}, removeChild:()=>{} }
    },
    location: { hash: '', pathname: '', search: '' },
    history: { pushState: () => {}, replaceState: () => {} },
    fetch: () => Promise.reject(new Error('offline')),
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    console: console, 
    navigator: { userAgent: 'verify-376', language: 'zh-CN', onLine: false },
    screen: { width: 1280, height: 800 },
    requestAnimationFrame: (fn) => setTimeout(() => fn(0), 16),
    WebKitMutationObserver: function() {},
    MutationObserver: function() { this.observe=()=>{}; this.disconnect=()=>{}; }
  };
  vm.createContext(stubWindow);
  
  // 1) 先 parse manifest
  new vm.Script(manifest);
  log('manifest_data.js parse', '✅');
  
  // 2) 再 parse app.js
  new vm.Script(appJs);
  log('app.js parse', '✅');
  
  // 3) 执行 app.js — 给 stub 注入 window 引用
  stubWindow.globalThis = stubWindow;
  vm.runInContext(`var window = this;\n${appJs}`, stubWindow);
  log('app.js 顶层执行', '✅');
} catch (e) {
  log('app.js 执行 / parse 错误', `❌ ${e.message.split('\n')[0]}`);
  console.log(e.stack);
}

console.log('');
console.log('═'.repeat(64));
console.log('  段 C 验证结束');
console.log('═'.repeat(64));
