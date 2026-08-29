// 一次性脚本：把 psychology/ch02-memory-textbook.md（磁盘 432 行 / 16,722 字 配套教材版）
// 注册到 manifest.json + manifest_data.js 的 psychology.chapters 数组中，
// 紧跟在 ch02-memory.md 之后（与 engineering-mechanics/ch02-axial-loading-deep-dive.md
// 模式对齐）。同步刷新 psychology.chapterCount 12 → 13 和 psychology.totalWords。
//
// 状态：脚本 v1（JS 字符串切片法）实现时碰 CRLF + indent 双重坑失败；最终用同源思路
//       改写为 Python json.loads/dumps 一次性跑通（diff 见同 commit hash），本 JS 脚本
//       保留为参考模板未运行（参照 _add_4_missing_chapters.js / _add_recovery_to_manifest.js）。

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ---- 1) 从磁盘读 ch02-memory-textbook.md，提 metadata（与 _add_4_missing_chapters.js 同源）
const TARGET_FILE = 'ch02-memory-textbook.md';
const BOOK_ID = 'psychology';
const TITLE = 'Memory · 教材版';

function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const tokens = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + tokens;
}

function extractH2s(text) {
  const lines = text.split(/\r?\n/);
  const h2s = [];
  let cur = null;
  for (const ln of lines) {
    const m2 = ln.match(/^##\s+(.+?)\s*$/);
    const m3 = ln.match(/^###\s+(.+?)\s*$/);
    if (m2) { cur = { title: m2[1].trim(), subs: [] }; h2s.push(cur); }
    else if (m3 && cur) cur.subs.push({ title: m3[1].trim(), level: 3 });
  }
  return h2s;
}

const fp = path.join(ROOT, 'books', BOOK_ID, TARGET_FILE);
const text = fs.readFileSync(fp, 'utf8');
const words = countWords(text);
const h2s = extractH2s(text);
const newChapter = { file: TARGET_FILE, title: TITLE, words, h2s };
console.log(`[build] ${BOOK_ID}/${TARGET_FILE}  words=${words}  h2=${h2s.length}  h3=${h2s.reduce((a,c)=>a+c.subs.length,0)}`);

// ---- 2) 防重入
for (const fname of ['manifest.json', 'manifest_data.js']) {
  const txt = fs.readFileSync(path.join(ROOT, fname), 'utf8');
  if (txt.includes('"file": "' + TARGET_FILE + '"')) {
    throw new Error(`[abort] ${fname} 已含 ${TARGET_FILE}，请先检查是否重跑`);
  }
}

// ---- 3) 处理两个文件
function processFile(fname) {
  const fpath = path.join(ROOT, fname);
  const raw = fs.readFileSync(fpath);
  const isCRLF = raw.includes('\r\n');
  const EOL = isCRLF ? '\r\n' : '\n';
  let txt = raw.toString('utf8');

  // 3a) 找到 ch02-memory.md 在 BOOK_ID 章节块内的结束位置：
  //     "},\n        {\n          \"file\": \"ch03-thinking-and-language.md\","
  //     把 "},\n        {\n          \"file\": \"ch03-..." 替换为 "},\n        {\n          <new_entry>\n        },\n        {\n          \"file\": \"ch03-..."
  const boundaryOld =
    '        },' + EOL +
    '        {' + EOL +
    '          "file": "ch03-thinking-and-language.md",';
  if (!txt.includes(boundaryOld)) throw new Error(`[abort] ${fname} 缺 boundary`);

  // 3b) 渲染 newChapter 为带 10 空格缩进的字符串
  // entryJson 使用相对缩进（顶层 2 空格，每层 +2），而我们的目标缩进是顶层 10 空格
  // （与 ch02-memory.md 等现有 chapter 块一致）。做法：剥掉 entryJson 每行首部 '  '（2 空格），
  // 再在前面统一补 10 空格；entryJson 中已无 2 空格前缀的顶层 '[' / '{' / ']' / '}' 也补 10 空格。
  const entryJson = JSON.stringify(newChapter, null, 2);
  const reindented = entryJson.split(/\r?\n/).map(ln => {
    if (ln.startsWith('  ')) return '          ' + ln.slice(2);
    return '          ' + ln;
  }).join(EOL);

  const replacement =
    '        },' + EOL +
    reindented + EOL +
    '        },' + EOL +
    '        {' + EOL +
    '          "file": "ch03-thinking-and-language.md",';
  txt = txt.replace(boundaryOld, replacement);

  // 3c) 找到 psychology 块的 chapterCount 与 totalWords
  //     形如: "id": "psychology",\n          ... \n          "chapterCount": 12,\n          ... "totalWords": 188315,
  // 直接用 regex 找到 "id": "psychology" 之后的 chapterCount 和 totalWords 并 +1 / +words
  const psyIdx = txt.indexOf('"id": "psychology"');
  if (psyIdx < 0) throw new Error(`[abort] ${fname} 缺 psychology book id`);
  // chapterCount/totalWords 位于 psychology 块末尾（紧跟 chapters 数组之后），
  // 相对 id 偏移可达 5 万+ 字符（实测 48552），所以要 search 整个剩余段。
  const tail = txt.slice(psyIdx);
  const cm = tail.match(/"chapterCount":\s*(\d+)/);
  const tw = tail.match(/"totalWords":\s*(\d+)/);
  if (!cm || !tw) throw new Error(`[abort] ${fname} 缺 chapterCount / totalWords`);
  const oldCC = parseInt(cm[1], 10);
  const oldTW = parseInt(tw[1], 10);
  const newCC = oldCC + 1;
  const newTW = oldTW + words;
  let updated = txt.slice(0, psyIdx) +
    txt.slice(psyIdx)
      .replace('"chapterCount": ' + oldCC, '"chapterCount": ' + newCC)
      .replace('"totalWords": ' + oldTW, '"totalWords": ' + newTW);
  txt = updated;

  // 3d) 校验：行尾没破坏（CRLF 模式下不应有裸 LF）
  const crlfCount = (txt.match(/\r\n/g) || []).length;
  const bareLfCount = (txt.match(/(?<!\r)\n/g) || []).length;
  console.log(`[verify] ${fname}: CRLF=${crlfCount} bare_LF=${bareLfCount}`);
  if (isCRLF && bareLfCount !== 0) {
    throw new Error(`[abort] ${fname} CRLF 模式出现裸 LF（${bareLfCount} 处），行尾污染`);
  }

  // 3e) 校验：JSON 合法
  if (fname.endsWith('.json')) {
    JSON.parse(txt);
    console.log(`[verify] ${fname} JSON.parse OK`);
  } else {
    // manifest_data.js 是 `const MANIFEST_DATA = {...};` 形式，截取 { } 段 parse
    const m = txt.match(/const MANIFEST_DATA\s*=\s*(\{[\s\S]*?\});/);
    if (!m) throw new Error(`[abort] ${fname} 缺 MANIFEST_DATA const`);
    JSON.parse(m[1]);
    console.log(`[verify] ${fname} MANIFEST_DATA JSON.parse OK`);
  }

  // 3f) 校验：新章节确实被插入且 chapterCount/totalWords 已更新
  if (!txt.includes('"file": "' + TARGET_FILE + '"')) {
    throw new Error(`[abort] ${fname} 写入后仍缺 ${TARGET_FILE}`);
  }
  if (!txt.includes('"chapterCount": ' + newCC)) {
    throw new Error(`[abort] ${fname} 写入后 chapterCount 仍非 ${newCC}`);
  }
  if (!txt.includes('"totalWords": ' + newTW)) {
    throw new Error(`[abort] ${fname} 写入后 totalWords 仍非 ${newTW}`);
  }

  return { txt, oldCC, newCC, oldTW, newTW };
}

const results = {};
for (const fname of ['manifest.json', 'manifest_data.js']) {
  results[fname] = processFile(fname);
}

// ---- 4) 原子写盘（写 .new 再 mv 覆盖）
for (const [fname, r] of Object.entries(results)) {
  const fpath = path.join(ROOT, fname);
  fs.writeFileSync(fpath + '.new', r.txt, 'utf8');
  fs.renameSync(fpath + '.new', fpath);
  console.log(`[write] ${fname}  chapterCount ${r.oldCC}→${r.newCC}  totalWords ${r.oldTW}→${r.newTW}  delta_bytes=${r.txt.length - fs.statSync(fpath + '.new')}`);
}

// ---- 5) 端到端校验
const finalMJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const psy = finalMJ.books.find(b => b.id === BOOK_ID);
console.log(`[final] ${BOOK_ID}: chapterCount=${psy.chapterCount} totalWords=${psy.totalWords} chapters.length=${psy.chapters.length}`);
const ch02Count = psy.chapters.filter(c => c.file.startsWith('ch02-')).length;
console.log(`[final] ch02-* count: ${ch02Count} (expect 2)`);
console.log('[done]');
