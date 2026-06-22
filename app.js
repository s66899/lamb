// ── Config ──────────────────────────────────────────────────
const GITHUB_REPO = 's66899/lamb';
const GITHUB_BRANCH = 'book';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}`;

// ── State ──────────────────────────────────────────────────
let MANIFEST = null;
let activeBookId = null;
let activeChapterFile = null;

// ── DOM ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const bookList = $('bookList');
const chapterList = $('chapterList');
const welcome = $('welcome');
const chapterContent = $('chapterContent');
const contentHeader = $('contentHeader');
const article = $('article');

// ── Init ──────────────────────────────────────────────────
async function init() {
  const res = await fetch('manifest.json');
  MANIFEST = await res.json();
  renderBooks();
  // restore hash-based navigation
  const hash = window.location.hash.slice(1);
  if (hash) {
    const [bookId, ...fileParts] = hash.split('/');
    const chFile = fileParts.join('/');
    const book = MANIFEST.books.find(b => b.id === bookId);
    if (book && book.chapters.some(c => c.file === chFile)) {
      selectBook(bookId);
      setTimeout(() => selectChapter(chFile), 300);
    }
  }
}

// ── Render Books ──────────────────────────────────────────
function renderBooks() {
  bookList.innerHTML = MANIFEST.books.map(b =>
    `<div class="book-item" onclick="selectBook('${b.id}')" data-id="${b.id}">
       <span class="book-emoji">${b.emoji}</span>
       <span class="book-title">${b.title}</span>
       <span class="book-count">${b.chapters.length}章</span>
     </div>`
  ).join('');
}

// ── Select Book ───────────────────────────────────────────
function selectBook(bookId) {
  activeBookId = bookId;
  activeChapterFile = null;
  document.querySelectorAll('.book-item').forEach(el => el.classList.toggle('active', el.dataset.id === bookId));
  chapterContent.style.display = 'none';
  welcome.style.display = 'flex';

  const book = MANIFEST.books.find(b => b.id === bookId);
  if (!book || !book.chapters.length) {
    chapterList.innerHTML = `<div class="chapter-list-title">📂 暂无章节</div>`;
    return;
  }
  chapterList.innerHTML = `
    <div class="chapter-list-title">📂 ${book.emoji} ${book.title} (${book.chapters.length}章)</div>
    ${book.chapters.map((ch, i) =>
      `<div class="chapter-item" onclick="selectChapter('${ch.file}')" data-file="${ch.file}">
         ${String(i + 1).padStart(2, '0')}. ${ch.title}
       </div>`
    ).join('')}
  `;
}

// ── Select Chapter ────────────────────────────────────────
async function selectChapter(file) {
  activeChapterFile = file;
  document.querySelectorAll('.chapter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.file === file)
  );
  window.location.hash = `${activeBookId}/${file}`;

  const book = MANIFEST.books.find(b => b.id === activeBookId);
  const fileName = file.replace(/\.md$/, '');
  const title = fileName.replace(/^ch\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  welcome.style.display = 'none';
  chapterContent.style.display = 'block';
  article.innerHTML = '<div class="loading">加载中…</div>';
  contentHeader.innerHTML = `
    <div class="breadcrumb">
      <span onclick="selectBook('${activeBookId}')">${book.emoji} ${book.title}</span> / ${fileName}
    </div>
    <h2>${title}</h2>
  `;

  try {
    const url = `${RAW_BASE}/books/${activeBookId}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    article.innerHTML = marked.parse(md, { breaks: true, gfm: true });
    $('content').scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    article.innerHTML = `<div class="error"><h3>❌ 加载失败</h3><p>${err.message}</p></div>`;
  }
}

// ── Keyboard ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeBookId) {
    selectBook(activeBookId);
  }
});

// ── Boot ──────────────────────────────────────────────────
init();
