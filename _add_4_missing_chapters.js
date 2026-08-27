// 一次性脚本：把 4 章漏注册的真实内容补到 manifest.json 末尾
// v3.22.49 - fix(manifest): 补入 badminton/ch13 + finance/ch13 + psychology/ch12 + engineering-mechanics/ch12
// 参照 v3.22.44 _add_recovery_to_manifest.js 模板（CRLF + byte 级追加 + 防重入）

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MJ_PATH = path.join(ROOT, 'manifest.json');

// 1) 这 4 章的元信息（路径 + title 与磁盘文件首行 H1 对齐 — 已用 grep 校验）
const TARGETS = [
  { book: 'badminton',             file: 'ch13-doubles-tactics.md',         title: 'Doubles Tactics' },
  { book: 'finance',               file: 'ch13-international-finance.md',   title: 'International Finance' },
  { book: 'psychology',            file: 'ch12-positive-psychology.md',     title: 'Positive Psychology' },
  { book: 'engineering-mechanics', file: 'ch12-fracture-and-fatigue.md',    title: 'Fracture And Fatigue' },
];

// 2) 防重入：4 个 file 名都不应在 manifest.json 出现
const mj = fs.readFileSync(MJ_PATH, 'utf8');
for (const t of TARGETS) {
  if (mj.includes('"file": "' + t.file + '"')) {
    throw new Error(`[abort] manifest.json 已有 ${t.file}，请先检查是否重复跑`);
  }
}

// 3) CRLF 检测
const isCRLF = mj.includes('\r\n');
const EOL = isCRLF ? '\r\n' : '\n';
console.log('[debug] CRLF mode:', isCRLF);

// 4) 字数公式（CJK + alnum token，与 manifest.json 其他章一致）：
//    CJK 字符按 1 字/token 计；连续 [A-Za-z0-9]+ 视为 1 token。
function countWords(text) {
  // 先剔除 code block（与 manifest.json 其他章一致 — 但这里没影响，因为本章无 code fence）
  // 简单按纯文本统计
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const tokens = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + tokens;
}

// 5) 从磁盘读 .md，提 h2 + h3 子树
function extractH2s(text) {
  const lines = text.split(/\r?\n/);
  const h2s = [];
  let currentH2 = null;
  for (const ln of lines) {
    const m2 = ln.match(/^##\s+(.+?)\s*$/);
    const m3 = ln.match(/^###\s+(.+?)\s*$/);
    if (m2) {
      currentH2 = { title: m2[1].trim(), subs: [] };
      h2s.push(currentH2);
    } else if (m3 && currentH2) {
      currentH2.subs.push({ title: m3[1].trim(), level: 3 });
    }
  }
  return h2s;
}

// 6) 给 4 章生成 metadata 对象
const newChapters = [];
for (const t of TARGETS) {
  const fp = path.join(ROOT, 'books', t.book, t.file);
  if (!fs.existsSync(fp)) throw new Error(`[abort] 文件不存在: ${fp}`);
  const text = fs.readFileSync(fp, 'utf8');
  const words = countWords(text);
  const h2s = extractH2s(text);
  const ch = { file: t.file, title: t.title, words, h2s };
  console.log(`[build] ${t.book}/${t.file}  words=${words}  h2=${h2s.length}  h3=${h2s.reduce((a,c)=>a+c.subs.length,0)}`);
  newChapters.push({ book: t.book, chapter: ch });
}

// 7) 解析 manifest.json，按 book id 分组修改（必须基于原 JSON 操作，不能用 string surgery 重建 books 数组）
const manifest = JSON.parse(mj);
const updates = {};
for (const { book, chapter } of newChapters) {
  const b = manifest.books.find(x => x.id === book);
  if (!b) throw new Error(`[abort] manifest.json 缺 book id=${book}`);
  if (updates[book]) throw new Error(`[abort] book ${book} 重复`);
  updates[book] = true;
  // 检查现有 chapters 是否已有同 file
  if (b.chapters.some(c => c.file === chapter.file)) {
    throw new Error(`[abort] ${book} 已有 ${chapter.file}`);
  }
  b.chapters.push(chapter);
  b.chapterCount = b.chapters.length;
  // totalWords = sum(chapters.words)
  b.totalWords = b.chapters.reduce((a, c) => a + c.words, 0);
}

// 8) 总账 sanity check
let totalBooks = manifest.books.length;
let totalChapters = manifest.books.reduce((a, b) => a + b.chapterCount, 0);
let totalWords = manifest.books.reduce((a, b) => a + b.totalWords, 0);
console.log('[verify] totalBooks=', totalBooks, 'totalChapters=', totalChapters, 'totalWords=', totalWords);

// 9) 序列化：JSON.stringify(manifest, null, 2) + 末尾加 EOL（与原文件末尾行为一致）
//    原 manifest.json 末尾应当以 "}\r\n" 结尾（标准），但保险起见用原 mj 的尾部字节来推断。
//    做法：检测原 mj 末尾最后一个 "}" 之后是否还有 EOL，并保留。
const out = JSON.stringify(manifest, null, 2);
// CRLF 还原
const outFinal = isCRLF ? out.replace(/\n/g, '\r\n') : out;

// 10) 检测原 mj 末尾是否带 EOL（决定 outFinal 要不要补一个 EOL）
const origEndsWithEOL = /\r?\n$/.test(mj);
const outToWrite = origEndsWithEOL ? outFinal + EOL : outFinal;

// 11) 行尾 + 字节级校验（防意外）
const crlfCount = (outToWrite.match(/\r\n/g) || []).length;
const lfCount = (outToWrite.match(/(?<!\r)\n/g) || []).length;
console.log('[verify] CRLF count:', crlfCount, '裸 LF count:', lfCount);
if (isCRLF && lfCount !== 0) throw new Error('[abort] CRLF 模式下出现裸 LF，行尾污染');

// 12) 二次 parse 校验新 manifest 合法
const reparsed = JSON.parse(outToWrite);
for (const { book } of newChapters) {
  const b = reparsed.books.find(x => x.id === book);
  console.log(`[verify] ${book}: chapterCount=${b.chapterCount} chapters.length=${b.chapters.length} totalWords=${b.totalWords}`);
}

// 13) 不写盘 — 只打印。让用户用 git diff 检查后再正式 commit
console.log('[dry-run] 共将变更 ' + newChapters.length + ' 本书的 chapterCount/totalWords/chapters');
console.log('[dry-run] 末尾将输出新文件到 manifest.json.new，避免误覆盖。请检查后用 mv 覆盖原文件。');
fs.writeFileSync(MJ_PATH + '.new', outToWrite);
console.log('[done] wrote', MJ_PATH + '.new', 'bytes=' + outToWrite.length, 'orig bytes=' + mj.length, 'delta=' + (outToWrite.length - mj.length));
