// ════════════════════════════════════════════════════════════
//  📚 知识书架 - 交互学习应用
// ════════════════════════════════════════════════════════════

const GITHUB_REPO = 's66899/lamb';
const GITHUB_BRANCH = 'book';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}`;

// ───── State ───────────────────────────────────────────────
let MANIFEST = null;
let currentView = 'dashboard';
let currentBookId = null;
let currentChapterIdx = -1;
let currentChapters = [];
let fontBase = 15;
let studyQuestions = [];
let studyIdx = 0;

// ───── DOM shortcuts ───────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const views = { dashboard: $('viewDashboard'), book: $('viewBook'), reader: $('viewReader') };

// Progress helpers
const PROGRESS_KEY = 'bookshelf_progress';
function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}
function saveProgress(p) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); }
function markRead(bookId, file) {
  const p = getProgress();
  if (!p[bookId]) p[bookId] = [];
  if (!p[bookId].includes(file)) { p[bookId].push(file); saveProgress(p); }
  updateAllProgress();
}
function unmarkRead(bookId, file) {
  const p = getProgress();
  if (p[bookId]) { p[bookId] = p[bookId].filter(f => f !== file); saveProgress(p); }
  updateAllProgress();
}
function isRead(bookId, file) {
  const p = getProgress();
  return p[bookId] && p[bookId].includes(file);
}
function chapterProgress(bookId) {
  const book = MANIFEST.books.find(b => b.id === bookId);
  if (!book) return 0;
  const p = getProgress();
  const done = (p[bookId] || []).filter(f => book.chapters.some(c => c.file === f)).length;
  return book.chapters.length ? done / book.chapters.length : 0;
}
function totalProgress() {
  const total = MANIFEST.books.reduce((s, b) => s + b.chapterCount, 0);
  let done = 0;
  const p = getProgress();
  for (const b of MANIFEST.books) done += (p[b.id] || []).filter(f => b.chapters.some(c => c.file === f)).length;
  return total ? done / total : 0;
}
function updateAllProgress() {
  // Dashboard hero
  const tp = totalProgress();
  document.querySelector('.hero-progress-bar') && (document.querySelector('.hero-progress-bar').style.width = (tp * 100) + '%');
  $('progressBadge').textContent = '📊 ' + Math.round(tp * 100) + '%';
  // Book cards
  document.querySelectorAll('.book-card').forEach(el => {
    const bid = el.dataset.bookId;
    const p = chapterProgress(bid);
    const bar = el.querySelector('.card-progress-bar');
    if (bar) bar.style.width = (p * 100) + '%';
  });
  // Chapter list
  if (currentBookId) renderChapterList(currentBookId);
}

// ───── Init ─────────────────────────────────────────────────
async function init() {
  const res = await fetch('manifest.json');
  MANIFEST = await res.json();
  MANIFEST.books.forEach(b => {
    b.chapterCount = b.chapters.length;
    b.totalWords = b.chapters.reduce((s, c) => s + (c.words || 0), 0);
  });
  const totalCh = MANIFEST.books.reduce((s, b) => s + b.chapterCount, 0);
  const totalW = MANIFEST.books.reduce((s, b) => s + b.totalWords, 0);
  $('totalChapters').textContent = totalCh;
  $('totalWords').textContent = (totalW / 10000).toFixed(1) + '万';
  renderDashboard();
  updateAllProgress();

  // Theme from localStorage
  const saved = localStorage.getItem('bookshelf_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  // Font size from localStorage
  const savedFont = localStorage.getItem('bookshelf_font');
  if (savedFont) { fontBase = parseInt(savedFont); document.documentElement.style.setProperty('--font-base', fontBase + 'px'); }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.ctrlKey && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault(); openSearch();
    }
    if (e.key === 'Escape') { closeSearch(); closeStudyMode(); }
    if (e.key === 'ArrowLeft' && currentView === 'reader') prevChapter();
    if (e.key === 'ArrowRight' && currentView === 'reader') nextChapter();
    if (e.key === 'b' && currentView === 'reader' && !e.ctrlKey && e.target.tagName !== 'INPUT') toggleReadProgress();
  });
}

// ───── View switching ──────────────────────────────────────
function showView(name) {
  Object.keys(views).forEach(k => views[k].style.display = k === name ? 'block' : 'none');
  currentView = name;
  // Sidebar
  if (name === 'dashboard') {
    $('bookListSection').style.display = 'block';
    $('chapterListSection').style.display = 'none';
  }
  $('content').scrollTo({ top: 0, behavior: 'smooth' });
}

// ───── Dashboard ────────────────────────────────────────────
function renderDashboard() {
  const grid = $('bookGrid');
  grid.innerHTML = MANIFEST.books.map(b => {
    const p = chapterProgress(b.id);
    const pct = Math.round(p * 100);
    return `<div class="book-card fade-in" data-book-id="${b.id}" onclick="goToBook('${b.id}')">
      <div class="card-accent" style="background:${b.color}"></div>
      <div class="card-top">
        <span class="card-emoji">${b.emoji}</span>
        <span class="card-title">${b.title}</span>
      </div>
      <div class="card-desc">${b.desc}</div>
      <div class="card-stats">
        <span>📖 ${b.chapterCount} 章</span>
        <span>📝 ${(b.totalWords / 10000).toFixed(1)} 万字</span>
        <span>✅ ${pct}%</span>
      </div>
      <div class="card-progress"><div class="card-progress-bar" style="width:${pct}%;background:${b.color}"></div></div>
    </div>`;
  }).join('');
}

// ───── Book view ────────────────────────────────────────────
function goToBook(bookId) {
  currentBookId = bookId;
  showView('book');
  const book = MANIFEST.books.find(b => b.id === bookId);
  const ch = $('chapterGrid');
  const p = chapterProgress(bookId);
  $('bookHeader').innerHTML = `
    <span class="back-link" onclick="goHome()">← 返回书架</span>
    <h1>${book.emoji} ${book.title}</h1>
    <div class="book-meta">${book.chapterCount} 章 · ${(book.totalWords / 10000).toFixed(1)} 万字 · 已读 ${Math.round(p * 100)}%</div>
  `;
  ch.innerHTML = book.chapters.map((c, i) =>
    `<div class="chapter-card fade-in" onclick="openChapter(${i})">
      <div class="ch-num">第 ${String(i + 1).padStart(2, '0')} 章</div>
      <div class="ch-name">${c.title}</div>
      <div class="ch-sections">${c.sections ? c.sections.slice(0, 3).map(s => s.title).join(' · ') : ''}</div>
      <div class="ch-bottom">
        <span class="ch-words">${(c.words / 100).toFixed(0)} 百字 · ${c.sections ? c.sections.length : 0} 节</span>
        <span class="ch-done">${isRead(bookId, c.file) ? '✅ 已读' : '📖 未读'}</span>
      </div>
    </div>`
  ).join('');

  // Sidebar chapters
  $('bookListSection').style.display = 'block';
  $('chapterListSection').style.display = 'block';
  renderBookList();
  renderChapterList(bookId);
  updateAllProgress();
}

// ───── Reader ───────────────────────────────────────────────
function openChapter(idx) {
  currentChapterIdx = idx;
  showView('reader');
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  currentChapters = book.chapters;
  renderChapter();
}

async function renderChapter() {
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  const ch = currentChapters[currentChapterIdx];
  if (!ch) return;
  $('readerTitle').textContent = `第${String(currentChapterIdx + 1).padStart(2, '0')}章 · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx + 1} / ${currentChapters.length}`;

  // Footer nav
  $('chapterNavFooter').innerHTML = `
    <button onclick="prevChapter()" ${currentChapterIdx <= 0 ? 'disabled style="opacity:.4"' : ''}>← 上一章</button>
    <button onclick="nextChapter()" ${currentChapterIdx >= currentChapters.length - 1 ? 'disabled style="opacity:.4"' : ''}>下一章 →</button>
  `;

  const url = `${RAW_BASE}/books/${currentBookId}/${ch.file}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    $('article').innerHTML = marked.parse(md, { breaks: true, gfm: true });
    // Make headings collapsible
    makeCollapsible();
    // Render TOC
    renderToc();
  } catch (err) {
    $('article').innerHTML = `<div class="error"><h3>❌ 加载失败</h3><p>${err.message}</p></div>`;
  }

  $('content').scrollTo({ top: 0, behavior: 'smooth' });
  updateAllProgress();
}

function makeCollapsible() {
  $$('article h2, article h3').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('collapsed');
      localStorage.setItem('bookshelf_collapsed_' + el.textContent.trim(), el.classList.contains('collapsed'));
    });
    // Restore state
    const saved = localStorage.getItem('bookshelf_collapsed_' + el.textContent.trim());
    if (saved === 'true') el.classList.add('collapsed');
  });
}

function renderToc() {
  const toc = $('readerToc');
  const headings = $$('article h2, article h3');
  if (!headings.length) { toc.style.display = 'none'; return; }
  toc.style.display = 'block';
  toc.innerHTML = '<div class="toc-title">📑 本节目录</div>' +
    Array.from(headings).map((h, i) => {
      const level = h.tagName.toLowerCase() === 'h2' ? 'h2' : 'h3';
      const text = h.textContent.trim();
      return `<div class="toc-item toc-${level}" onclick="scrollToHeading(${i})">${text}</div>`;
    }).join('');
}

function scrollToHeading(idx) {
  const headings = $$('article h2, article h3');
  if (headings[idx]) headings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleToc() {
  const toc = $('readerToc');
  toc.style.display = toc.style.display === 'none' ? 'block' : 'none';
}

function prevChapter() { if (currentChapterIdx > 0) openChapter(currentChapterIdx - 1); }
function nextChapter() { if (currentChapterIdx < currentChapters.length - 1) openChapter(currentChapterIdx + 1); }

function toggleReadProgress() {
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  const ch = currentChapters[currentChapterIdx];
  if (!book || !ch) return;
  if (isRead(currentBookId, ch.file)) unmarkRead(currentBookId, ch.file);
  else markRead(currentBookId, ch.file);
}

// ───── Font size ────────────────────────────────────────────
function increaseFont() { if (fontBase < 22) { fontBase += 1; applyFont(); } }
function decreaseFont() { if (fontBase > 12) { fontBase -= 1; applyFont(); } }
function applyFont() {
  document.documentElement.style.setProperty('--font-base', fontBase + 'px');
  localStorage.setItem('bookshelf_font', fontBase);
}

// ───── Theme ────────────────────────────────────────────────
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? '' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bookshelf_theme', next);
}

// ───── Search ───────────────────────────────────────────────
let searchDebounce = null;
function onSearchInput(val) { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => { if (val.trim()) openSearch(val.trim()); }, 300); }

function openSearch(query) {
  $('searchOverlay').style.display = 'flex';
  if (query) { $('searchPanelInput').value = query; doSearch(query); }
  else setTimeout(() => $('searchPanelInput').focus(), 100);
}

function closeSearch() { $('searchOverlay').style.display = 'none'; $('searchResults').innerHTML = ''; }

async function doSearch(query) {
  if (!query.trim()) { $('searchResults').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">输入关键词搜索全部书籍</div>'; return; }
  $('searchResults').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">搜索中…</div>';

  const results = [];
  const q = query.toLowerCase();

  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      try {
        const url = `${RAW_BASE}/books/${book.id}/${ch.file}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const md = await res.text();
        const lines = md.split('\n');
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes(q)) {
            const preview = line.length > 120 ? line.substring(0, 120) + '…' : line;
            const highlighted = preview.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<em>$1</em>');
            results.push({
              book: book, chapter: ch, line: i + 1,
              preview: highlighted.replace(/^#{1,4}\s+/, ''),
              file: ch.file
            });
            found = true;
            if (results.length >= 50) break;
          }
        }
      } catch {}
      if (results.length >= 50) break;
    }
    if (results.length >= 50) break;
  }

  if (!results.length) {
    $('searchResults').innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)">未找到匹配内容 😅</div>';
    return;
  }

  $('searchResults').innerHTML = results.map(r =>
    `<div class="search-result" onclick="goSearchResult('${r.book.id}','${r.file}')">
      <div class="sr-title">${r.book.emoji} ${r.book.title} · ${r.chapter.title}</div>
      <div class="sr-path">第 ${r.line} 行</div>
      <div class="sr-preview">${r.preview}</div>
    </div>`
  ).join('');
}

function goSearchResult(bookId, file) {
  closeSearch();
  goToBook(bookId);
  const book = MANIFEST.books.find(b => b.id === bookId);
  const idx = book.chapters.findIndex(c => c.file === file);
  if (idx >= 0) setTimeout(() => openChapter(idx), 300);
}

// ───── Study mode ──────────────────────────────────────────
function toggleStudyMode() {
  if ($('studyOverlay').style.display === 'flex') { closeStudyMode(); return; }
  generateStudyQuestions();
  $('studyOverlay').style.display = 'flex';
  showStudyCard();
}

function closeStudyMode(e) { $('studyOverlay').style.display = 'none'; }

async function generateStudyQuestions() {
  studyQuestions = [];
  const allRead = getProgress();
  const candidates = [];
  for (const book of MANIFEST.books) {
    const readFiles = allRead[book.id] || [];
    for (const ch of book.chapters) {
      if (readFiles.includes(ch.file) && ch.sections && ch.sections.length > 0) {
        for (const sec of ch.sections.slice(0, 3)) {
          candidates.push({ book, ch, section: sec.title, type: 'section' });
        }
      }
    }
  }
  // Fallback: use first chapters
  if (!candidates.length) {
    for (const book of MANIFEST.books.slice(0, 3)) {
      for (const ch of book.chapters.slice(0, 3)) {
        candidates.push({ book, ch, section: ch.title, type: 'chapter' });
      }
    }
  }
  // Shuffle and take up to 20
  candidates.sort(() => Math.random() - 0.5);
  studyQuestions = candidates.slice(0, 20);
  studyIdx = 0;
}

function showStudyCard() {
  if (!studyQuestions.length || studyIdx >= studyQuestions.length) {
    // Fetch content for study
    $('studyBody').innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--text2)">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">太棒了！</div>
        <div>题库已用完，<a href="#" style="color:var(--accent);" onclick="generateStudyQuestions();showStudyCard();return false">点此重新生成</a></div>
      </div>
    `;
    $('studyFooter').innerHTML = '';
    return;
  }
  const q = studyQuestions[studyIdx];
  $('studyBody').innerHTML = `
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;">${q.book.emoji} ${q.book.title} · ${q.ch.title}</div>
    <div class="study-question" id="studyQuestion">📝 回顾一下「<strong>${q.section}</strong>」的内容</div>
    <button class="study-reveal" onclick="studyReveal()">👁 查看要点</button>
    <div class="study-answer" id="studyAnswer" style="display:none">加载中…</div>
  `;
  $('studyFooter').innerHTML = `
    <span style="font-size:12px;color:var(--text3)">${studyIdx + 1} / ${studyQuestions.length}</span>
    <button class="toolbar-btn" onclick="studyNext()">下一张 →</button>
  `;
  // Pre-fetch answer
  const url = `${RAW_BASE}/books/${q.book.id}/${q.ch.file}`;
  fetch(url).then(r => r.text()).then(md => {
    const lines = md.split('\n');
    let found = [], capture = false;
    for (const line of lines) {
      if (line.includes(q.section) && line.startsWith('#')) { capture = true; continue; }
      if (capture) {
        if (line.startsWith('## ') || line.startsWith('# ')) break;
        if (line.trim()) found.push(line.replace(/^#+\s*/, ''));
      }
    }
    const answerEl = $('studyAnswer');
    if (answerEl) {
      const text = found.slice(0, 8).join('<br>');
      answerEl.innerHTML = text ? marked.parse(text) : '<em>（本节内容可直接打开阅读）</em>';
    }
  }).catch(() => { const a = $('studyAnswer'); if (a) a.innerHTML = '<em>加载失败</em>'; });
}

function studyReveal() { const a = $('studyAnswer'); if (a) a.style.display = 'block'; }
function studyNext() { studyIdx++; showStudyCard(); }

// ───── Sidebar ──────────────────────────────────────────────
function renderBookList() {
  const list = $('bookList');
  list.innerHTML = MANIFEST.books.map(b => {
    const p = chapterProgress(b.id);
    return `<div class="book-item ${currentBookId === b.id ? 'active' : ''}" onclick="goToBook('${b.id}')">
      <span class="emoji">${b.emoji}</span>
      <span class="title">${b.title}</span>
      <span class="count">${b.chapterCount}章</span>
      <span class="progress-mini" style="width:${Math.round(p * 100)}%"></span>
    </div>`;
  }).join('');
}

function renderChapterList(bookId) {
  const book = MANIFEST.books.find(b => b.id === bookId);
  if (!book) return;
  const list = $('chapterList');
  $('chapterListTitle').textContent = `📂 ${book.emoji} ${book.title}`;
  list.innerHTML = book.chapters.map((ch, i) =>
    `<div class="chapter-item ${currentChapterIdx === i ? 'active' : ''}" onclick="openChapter(${i})">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="ch-title">${ch.title}</span>
      <span class="ch-check">${isRead(bookId, ch.file) ? '✅' : ''}</span>
    </div>`
  ).join('');
}

// ───── Navigation ───────────────────────────────────────────
function goHome() {
  currentBookId = null;
  currentChapterIdx = -1;
  showView('dashboard');
  renderDashboard();
  $('bookListSection').style.display = 'block';
  $('chapterListSection').style.display = 'none';
  updateAllProgress();
}

// ───── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
