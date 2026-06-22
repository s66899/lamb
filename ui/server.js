const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3456;
const BOOKS_DIR = path.resolve(__dirname, '..', 'books');
const CACHE = { books: null, chapters: {}, content: {} };

// ── Books metadata ──────────────────────────────────────────
const BOOK_META = {
  badminton:           { title: '🏸 羽毛球',          color: '#2e7d32', emoji: '🏸' },
  finance:             { title: '📈 金融',            color: '#1565c0', emoji: '📈' },
  psychology:          { title: '🧠 心理学',          color: '#6a1b9a', emoji: '🧠' },
  'engineering-mechanics': { title: '⚙️ 工程力学',    color: '#e65100', emoji: '⚙️' },
  'nsca-cpt':          { title: '💪 NSCA-CPT',        color: '#c62828', emoji: '💪' },
};

// ── Helpers ─────────────────────────────────────────────────
function readBooksList() {
  if (CACHE.books) return CACHE.books;
  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
  const books = entries
    .filter(e => e.isDirectory() && BOOK_META[e.name])
    .map(e => ({
      id: e.name,
      ...BOOK_META[e.name],
      path: path.join(BOOKS_DIR, e.name),
    }));
  CACHE.books = books;
  return books;
}

function readChapters(bookId) {
  const key = `ch:${bookId}`;
  if (CACHE.chapters[key]) return CACHE.chapters[key];
  const bookPath = path.join(BOOKS_DIR, bookId);
  if (!fs.existsSync(bookPath)) return [];
  const files = fs.readdirSync(bookPath)
    .filter(f => f.endsWith('.md') && f.startsWith('ch'))
    .sort()
    .map(f => {
      const title = f.replace(/\.md$/, '')
        .replace(/^ch\d+-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      return { file: f, title };
    });
  CACHE.chapters[key] = files;
  return files;
}

function renderMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return marked.parse(raw, { breaks: true, gfm: true });
}

// ── API routes ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// List books
app.get('/api/books', (req, res) => {
  res.json(readBooksList());
});

// List chapters for a book
app.get('/api/books/:bookId/chapters', (req, res) => {
  const { bookId } = req.params;
  if (!BOOK_META[bookId]) return res.status(404).json({ error: 'Book not found' });
  res.json(readChapters(bookId));
});

// Get chapter content
app.get('/api/books/:bookId/chapter/:chapterFile', (req, res) => {
  const { bookId, chapterFile } = req.params;
  const filePath = path.join(BOOKS_DIR, bookId, chapterFile);
  
  // Security: ensure file is within books dir
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(BOOKS_DIR))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  try {
    const html = renderMarkdown(resolved);
    res.json({ html, file: chapterFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current git info
app.get('/api/git', (req, res) => {
  const { execSync } = require('child_process');
  try {
    const log = execSync('git log --oneline -5', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 5000,
    });
    const branch = execSync('git branch --show-current', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    res.json({ branch, log: log.trim().split('\n') });
  } catch {
    res.json({ branch: 'unknown', log: [] });
  }
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  console.log(`\n  📚 书架服务已启动`);
  console.log(`  ───────────────────────────────`);
  console.log(`  本地:    http://localhost:${PORT}`);
  addresses.forEach(ip => console.log(`  网络:    http://${ip}:${PORT}`));
  console.log(`  端口号:  ${PORT}`);
  console.log(`  ───────────────────────────────`);
  console.log(`  共 ${readBooksList().length} 本书 | Ctrl+C 停止\n`);
});
