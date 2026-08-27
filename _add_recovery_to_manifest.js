// 一次性脚本：从 manifest_data.js 提取 badminton-recovery 元数据，
// 字节级追加到 manifest.json 末尾（CRLF 保持）。
// v3.22.44 - fix(manifest): 将 badminton-recovery 8 章 metadata 补入 manifest.json

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MD_PATH = path.join(ROOT, 'manifest_data.js');
const MJ_PATH = path.join(ROOT, 'manifest.json');

// 1) 从 manifest_data.js 解析 MANIFEST_DATA.books
const src = fs.readFileSync(MD_PATH, 'utf8');
const m = src.match(/const MANIFEST_DATA\s*=\s*(\{[\s\S]*?\});/);
if (!m) throw new Error('MANIFEST_DATA 未找到');
const MANIFEST_DATA = (new Function('return (' + m[1] + ')'))();
const target = MANIFEST_DATA.books.find(b => b.id === 'badminton-recovery');
if (!target) throw new Error('badminton-recovery 在 manifest_data.js 中找不到');

// 2) 检查 manifest.json 是否已有 badminton-recovery（防重复跑）
const mj = fs.readFileSync(MJ_PATH, 'utf8');
if (mj.includes('"id": "badminton-recovery"')) {
  console.log('[skip] manifest.json 已有 badminton-recovery，无需重跑');
  process.exit(0);
}

// 3) 检测行尾并准备 EOL
const isCRLF = mj.includes('\r\n');
const EOL = isCRLF ? '\r\n' : '\n';
console.log('[debug] CRLF mode:', isCRLF);

// 4) JSON.stringify 后做 LF -> CRLF 转换（用 split('\n') 逐行处理，安全：字符串字段不含 \n\n 模式）
//    已验证：badminton-recovery 顶层 5 个字符串字段（id/title/emoji/color/desc）均无换行
const bookJsonLF = JSON.stringify(target, null, 2);
const bookJson = isCRLF ? bookJsonLF.replace(/\n/g, '\r\n') : bookJsonLF;

// 5) 定位 books 数组结束位置 "  ]" + EOL
const booksClose = mj.lastIndexOf('  ]' + EOL);
if (booksClose === -1) throw new Error('未找到 books 数组结束标记 "  ]"');

// 切两段：before 包含末本书 "    }" + 换行；after 从 "  ]" 开始
const before = mj.slice(0, booksClose);
const after = mj.slice(booksClose);

// before 末尾应当是 "    }\r\n"（末本书对象关闭 + 换行）
// 我们要把 "," + 新 book 段插到 "    }" 之后、"  ]" 之前
const beforeTrimmed = before.replace(new RegExp(EOL + '$'), '');
const insertion = ',' + EOL + bookJson;
const newContent = beforeTrimmed + insertion + EOL + after;

// 6) 校验 JSON 合法性
const parsed = JSON.parse(newContent);
const br = parsed.books.find(b => b.id === 'badminton-recovery');
console.log('[verify] badminton-recovery chapters:', br.chapters.length);
console.log('[verify] badminton-recovery totalWords:', br.totalWords);
console.log('[verify] badminton-recovery chapterCount:', br.chapterCount);
const sumWords = br.chapters.reduce((a, c) => a + c.words, 0);
console.log('[verify] sum(chapters.words) =', sumWords, 'vs totalWords =', br.totalWords,
  sumWords === br.totalWords ? '✓' : '✗');

// 7) 校验字节行尾：CRLF 计数 + 裸 LF 必须为 0
const crlfCount = (newContent.match(/\r\n/g) || []).length;
const lfCount = (newContent.match(/(?<!\r)\n/g) || []).length;
console.log('[verify] CRLF count:', crlfCount, '裸 LF count:', lfCount);
if (lfCount !== 0) throw new Error('裸 LF 不为 0，行尾污染');

// 8) 校验其他 6 本书 byte 级不变（取前 booksClose 字节对比）
const beforeSnap = mj.slice(0, booksClose);
const newSnap = newContent.slice(0, beforeSnap.length - EOL.length).replace(EOL + bookJson + EOL, EOL);
//    更稳妥：在 newContent 里把新 book 段切掉后比对剩下部分
const newBooksEnd = beforeTrimmed.length + insertion.length + EOL.length;
//    newContent 头 = beforeTrimmed (不含末本书 } 后的 EOL) + insertion + EOL
//    我们要校验的是 beforeTrimmed 之前的部分（也就是 mj 的 booksClose 前所有内容）
//    newContent 在 beforeTrimmed 长度处的左侧 = beforeTrimmed 内容 = mj.slice(0, booksClose - EOL.length) —— 即 mj 去掉了末本书 } 后那一个 EOL
//    这部分本来就和 mj 的 head 一致，byte 级必然相等（因为 before = mj.slice(0, booksClose)）

// 9) 校验末尾未污染：after 段（"  ]\r\n}\r\n"）应 byte 级未变
const afterInNew = newContent.slice(newContent.length - after.length);
if (afterInNew !== after) {
  console.log('[verify] 末尾段对比:', JSON.stringify(afterInNew.slice(0, 50)));
  console.log('[verify] 期望末尾段:', JSON.stringify(after.slice(0, 50)));
  throw new Error('末尾段被改动');
}
console.log('[verify] 末尾段 byte-equal ✓');

// 10) 校验原 6 本书（除末本）内容完全未动：直接对比 mj.slice(0, booksClose - 末本书 } 后 EOL) == newContent.slice(0, same length)
const mjHeadLen = booksClose - EOL.length; // 去掉末本书对象关闭后的 \r\n
const expectedHead = mj.slice(0, mjHeadLen);
const actualHead = newContent.slice(0, expectedHead.length);
if (expectedHead !== actualHead) throw new Error('前 6 本书内容被改动');
console.log('[verify] 前 6 本书（除末本外）内容 byte-equal ✓');

// 11) 写回
const newBytes = Buffer.from(newContent, 'utf8');
fs.writeFileSync(MJ_PATH, newBytes);
console.log('[done] manifest.json 已更新');
console.log('[delta] 字节差:', newBytes.length - Buffer.byteLength(mj, 'utf8'),
  '(+', newBytes.length - Buffer.byteLength(mj, 'utf8'), ')');