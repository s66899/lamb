#!/usr/bin/env node
/**
 * _bump_version.js — 单点发版版本号 bump 工具（v3.22.41）
 *
 * 问题：项目里有 4 个版本号埋点（app.js APP_VERSION + index.html 三处 ?v=），
 *       历史上多次出现「只改了 APP_VERSION，忘了改 ?v=」或「只改了两个 ?v= 一个漏」
 *       导致 GitHub Pages 老访客吃旧缓存。
 *
 * 用法：
 *   node _bump_version.js                # dry-run，patch +1（v3.22.40 → v3.22.41）
 *   node _bump_version.js --apply        # 实际写入
 *   node _bump_version.js --minor --apply # minor +1（v3.22.40 → v3.23.0）
 *   node _bump_version.js --set=v3.23.0 --apply
 *
 * 设计原则：
 *   - 默认 dry-run：必须显式 --apply 才落盘
 *   - 校验当前 4 处版本号必须一致；不一致则报错退出（防止漏改历史）
 *   - 改完后再校验 4 处全部 = 新版本号
 *   - 写入 UTF-8（不写 BOM），保留行尾（LF / CRLF）原状
 *   - 不自动 commit（留人工确认）
 */

const fs = require('fs');
const path = require('path');

const FILES = {
  appJs:    'app.js',
  indexHtml:'index.html',
};

// 4 个埋点的「模板」：file + find 正则 + replace 模板（{next} 占位）
// 用正则动态构造，避免对当前版本号字面量硬编码（自举关键）
const PLACEHOLDER_TEMPLATES = [
  { file: 'app.js',
    // app.js 的 APP_VERSION 是 single source of truth，单独用反义匹配不依赖 g 标志
    findRe: /const APP_VERSION = 'v\d+\.\d+\.\d+';/g,
    replace: "const APP_VERSION = '{next}';" },
  { file: 'index.html',
    findRe: /(href="style\.css\?v=)v\d+\.\d+\.\d+(")/g,
    replace: '$1{next}$2' },
  { file: 'index.html',
    findRe: /(src="manifest_data\.js\?v=)v\d+\.\d+\.\d+(")/g,
    replace: '$1{next}$2' },
  { file: 'index.html',
    findRe: /(src="app\.js\?v=)v\d+\.\d+\.\d+(")/g,
    replace: '$1{next}$2' },
];

// 兼容旧版调用入口：探测 current 后，把 find 串从模板材料化为实际字面量
// 为避免仅凭 replace 串字面特征做类型判断出错，干脆同时在模板上声明 find 串的骨架
function materializePlaceholders(current) {
  // 骨架：以 PLACEHOLDER_TEMPLATES 顺序一一对应的「裸字串」（不嵌入 current）
  //     插入时只把中间版本号占位符 {current} 替换为当前版本号
  const skeletons = [
    `const APP_VERSION = '{current}';`,
    `href="style.css?v={current}"`,
    `src="manifest_data.js?v={current}"`,
    `src="app.js?v={current}"`,
  ];
  return PLACEHOLDER_TEMPLATES.map((t, i) => ({
    file: t.file,
    find: skeletons[i].replace('{current}', current),
    findRe: t.findRe,
    replace: t.replace,
  }));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { apply: false, minor: false, major: false, set: null };
  for (const a of args) {
    if (a === '--apply') opts.apply = true;
    else if (a === '--minor') opts.minor = true;
    else if (a === '--major') opts.major = true;
    else if (a.startsWith('--set=')) opts.set = a.slice('--set='.length);
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`未知参数：${a}`); printHelp(); process.exit(2); }
  }
  return opts;
}

function printHelp() {
  console.log(`用法：
  node _bump_version.js                # dry-run，patch +1
  node _bump_version.js --apply        # 实际写入
  node _bump_version.js --minor --apply # minor +1
  node _bump_version.js --set=v3.23.0 --apply # 直接指定新版本号
`);
}

function bumpVersion(v, opts) {
  if (opts.set) {
    if (!/^v\d+\.\d+\.\d+$/.test(opts.set)) {
      throw new Error(`--set 必须匹配 vMAJOR.MINOR.PATCH（如 v3.23.0），收到：${opts.set}`);
    }
    return opts.set;
  }
  const m = v.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`当前版本号格式不合法：${v}`);
  let [_, maj, min, pat] = m;
  maj = +maj; min = +min; pat = +pat;
  if (opts.major) { maj += 1; min = 0; pat = 0; }
  else if (opts.minor) { min += 1; pat = 0; }
  else { pat += 1; }
  return `v${maj}.${min}.${pat}`;
}

function main() {
  const opts = parseArgs();

  // 1. 探测当前版本号（取 APP_VERSION 那一处作为 single source of truth）
  const appJs = fs.readFileSync(FILES.appJs, 'utf8');
  const m = appJs.match(/const APP_VERSION = '(v\d+\.\d+\.\d+)';/);
  if (!m) throw new Error(`app.js 中未找到 const APP_VERSION = 'v...'`);
  const current = m[1];
  const next = bumpVersion(current, opts);

  // 1.5 自举关键：用探测到的 current 动态构造 find 串（不再硬编码 'v3.22.40' 之类的字面量）
  const PLACEHOLDERS = materializePlaceholders(current);

  console.log(`当前版本号：${current}`);
  console.log(`目标版本号：${next}`);
  console.log(`模式：${opts.apply ? 'APPLY（落盘）' : 'DRY-RUN（仅预览）'}`);
  console.log('');

  // 2. 校验 4 处埋点当前都必须存在且 = current
  const errors = [];
  for (const p of PLACEHOLDERS) {
    if (!fs.existsSync(p.file)) { errors.push(`文件不存在：${p.file}`); continue; }
    const text = fs.readFileSync(p.file, 'utf8');
    // 用 matchAll() 遍历而非 text.match(..., 'g')，后者在含捕获组的正则上会重复计数
    const matches = Array.from(text.matchAll(p.findRe));
    const count = matches.length;
    if (count !== 1) {
      errors.push(`${p.file} 中埋点 ${p.find} 出现 ${count} 次（应为 1 次）`);
    }
  }
  if (errors.length) {
    console.error('❌ 当前版本号埋点不一致，无法安全 bump：');
    errors.forEach(e => console.error('  - ' + e));
    process.exit(1);
  }

  // 3. 预览 / 落盘（按原始行尾字节级回写，避免 Node 隐式 LF→CRLF 污染）
  const changes = [];
  for (const p of PLACEHOLDERS) {
    const raw = fs.readFileSync(p.file); // Buffer
    const text = raw.toString('utf8');
    const before = p.find;
    const after = p.replace.replace('{next}', next);
    const beforeBytes = raw.length;
    // 重要：每次循环都要 new 一个新的 RegExp 实例，避免上次 g 标志 match 后的 lastIndex 状态残留
    // （同一个 RegExp 对象在跨文件跨上下文重复调用 String.replace 时会跳过预期匹配）
    const re = new RegExp(p.findRe.source, p.findRe.flags);
    const newText = text.replace(re, after);
    const newRaw = Buffer.from(newText, 'utf8'); // Buffer.from 保留源字节序列，不改行尾
    const afterBytes = newRaw.length;
    // 展示「落地后字面量」：从 newText 里反推首个匹配行（与原 before 同位置的那一行）
    const beforeLines = text.split(/\r?\n/);
    const afterLines = newText.split(/\r?\n/);
    const idx = beforeLines.findIndex(l => l.includes(before));
    const displayAfter = idx >= 0 ? (afterLines[idx] || after) : after;
    changes.push({ file: p.file, before, after: displayAfter, beforeBytes, afterBytes });
    if (opts.apply) {
      fs.writeFileSync(p.file, newRaw);
    }
  }

  // 4. 输出变更摘要
  for (const c of changes) {
    console.log(`  ${c.file}`);
    console.log(`    - ${c.before}`);
    console.log(`    + ${c.after}`);
    console.log(`    字节数：${c.beforeBytes} → ${c.afterBytes}`);
  }
  console.log('');
  console.log(`✅ ${opts.apply ? '已写入' : '预览完成'}（4 处埋点 ${current} → ${next}）`);

  if (!opts.apply) {
    console.log('提示：加 --apply 参数实际写入；--minor / --major 控制 bump 幅度；--set=vX.Y.Z 直接指定。');
  } else {
    // 5. 写入后回读校验：4 处必须 = next
    let ok = true;
    for (const p of PLACEHOLDERS) {
      const text = fs.readFileSync(p.file, 'utf8');
      // 不靠 expected 字串（$1/$2 反向引用在 replace 模板里造成调试期字面字符串干扰）
      // 直接用反构正则重新探测「当前应存在 next」的子串
      // 把 findRe 中的 v\d+\.\d+\.\d+ 换成 next 字面量重新构造验证正则
      const validateRe = new RegExp(p.findRe.source.replace(/v\\d+\\.\\d+\\.\\d\+/g, next.replace(/\./g, '\\.')), p.findRe.flags);
      const count = (text.match(validateRe) || []).length;
      if (count !== 1) { console.error(`  ❌ 回读校验失败：${p.file} 中埋点出现 ${count} 次（应为 1 次）`); ok = false; }
    }
    if (!ok) process.exit(1);
    console.log('✅ 回读校验通过（4 处埋点全部 = ' + next + '）');
    console.log('');
    console.log('下一步建议：');
    console.log('  git add app.js index.html _bump_version.js');
    console.log('  git commit -m "chore(release): v' + next.slice(1) + ' 版本号统一（_bump_version.js 单点工具）"');
    console.log('  git push origin book');
  }
}

main();
