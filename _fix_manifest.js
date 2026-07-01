/**
 * Script to regenerate manifest_data.js with proper h2s data
 * Run: node _fix_manifest.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'D:/openclaw/workspace/worm-gear-lift-platform';

// Read existing manifest_data.js
let content = fs.readFileSync(BASE + '/manifest_data.js', 'utf8');
let rawJson = content.replace(/^const MANIFEST_DATA = /, '').replace(/;\s*$/, '').trim();
const data = JSON.parse(rawJson);

// For each book, read each chapter markdown and extract h2/h3 info
for (const book of data.books) {
  const bookDir = BASE + '/books/' + book.id;
  for (const ch of book.chapters) {
    const mdPath = bookDir + '/' + ch.file;
    const h2s = [];
    let totalWords = 0;
    try {
      const md = fs.readFileSync(mdPath, 'utf8');
      const lines = md.split('\n');
      totalWords = md.length;
      let currentH2 = null;
      for (const line of lines) {
        const h2Match = line.match(/^## (.+)/);
        const h3Match = line.match(/^### (.+)/);
        if (h2Match) {
          currentH2 = { title: h2Match[1].trim(), level: 2, subs: [] };
          h2s.push(currentH2);
        } else if (h3Match && currentH2) {
          currentH2.subs.push({ title: h3Match[1].trim(), level: 3 });
        } else if (h3Match && !currentH2) {
          currentH2 = { title: h3Match[1].trim(), level: 2, subs: [] };
          h2s.push(currentH2);
        }
      }
    } catch (e) {
      console.warn('  [WARN] Cannot read:', mdPath, e.message);
    }
    // Only use filtered h2s (level 2) for the h2s field
    ch.h2s = h2s.filter(h => h.level === 2).map(h => ({
      title: h.title,
      subs: h.subs || []
    }));
    // Update word count based on actual file
    if (totalWords > 0) ch.words = totalWords;
    console.log(`  ${book.id}/${ch.file}: ${ch.h2s.length} h2 sections, ${ch.words} chars`);
  }
  // Recalculate totalWords
  book.totalWords = book.chapters.reduce((s, c) => s + (c.words || 0), 0);
  book.chapterCount = book.chapters.length;
}

// Write updated manifest_data.js
const jsonStr = JSON.stringify(data, null, 2);
fs.writeFileSync(BASE + '/manifest_data.js', 'const MANIFEST_DATA = ' + jsonStr + ';\n', 'utf8');
console.log('\nDone! Updated manifest_data.js');
console.log('Total books:', data.books.length);

// Also update manifest.json with yin-yang book
const manifestPath = BASE + '/manifest.json';
let manifestJson = {};
try {
  manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch(e) {
  manifestJson = { books: [] };
}

// Merge yin-yang from data into manifest
const yinYangInManifest = manifestJson.books.find(b => b.id === 'yin-yang');
if (!yinYangInManifest) {
  const yinYang = data.books.find(b => b.id === 'yin-yang');
  if (yinYang) {
    manifestJson.books.unshift(yinYang);
    console.log('Added yin-yang to manifest.json');
  }
}
// Also update chapters data for all books in manifest
for (const mBook of manifestJson.books) {
  const sourceBook = data.books.find(b => b.id === mBook.id);
  if (sourceBook) {
    mBook.chapters = sourceBook.chapters;
    mBook.totalWords = sourceBook.totalWords;
    mBook.chapterCount = sourceBook.chapterCount;
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');
console.log('Updated manifest.json');
