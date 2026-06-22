// ── State ────────────────────────────────────────────────────
let state = {
  books: [],
  currentBook: null,
  currentChapter: null,
};

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const bookList = $('bookList');
const chapterList = $('chapterList');
const content = $('content');
const welcome = $('welcome');
const chapterContent = $('chapterContent');
const contentHeader = $('contentHeader');
const article = $('article');
const gitInfo = $('gitInfo');
const statusDot = $('statusDot');

// ── API helpers ──────────────────────────────────────────────
async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Git info ─────────────────────────────────────────────────
async function loadGitInfo() {
  try {
    const data = await api('/api/git');
    gitInfo.textContent = `🌿 ${data.branch} · ${data.log.length} commits`;
    gitInfo.title = data.log.join('\n');
  } catch { gitInfo.textContent = '🌿 --'; }
}

// ── Load books ───────────────────────────────────────────────
async function loadBooks() {
  state.books = await api('/api/books');
  renderBookList();
}

function renderBookList() {
  bookList.innerHTML = state.books.map(book => `
    <div class="book-item" data-book="${book.id}" onclick="selectBook('${book.id}')">
      <span class="book-emoji">${book.emoji}</span>
      <span class="book-title">${book.title}</span>
      <span class="book-count" id="count-${book.id}">--</span>
    </div>
  `).join('');
}

// ── Select book ──────────────────────────────────────────────
async function selectBook(bookId) {
  statusDot.className = 'status-dot loading';

  // Update active state
  document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.book-item[data-book="${bookId}"]`)?.classList.add('active');

  state.currentBook = bookId;
  state.currentChapter = null;

  // Show chapters
  const chapters = await api(`/api/books/${bookId}/chapters`);
  const count = chapters.length;
  document.getElementById(`count-${bookId}`).textContent = `${count}章`;

  // Hide content, show welcome
  chapterContent.style.display = 'none';
  welcome.style.display = 'flex';

  renderChapterList(chapters);
  statusDot.className = 'status-dot';
}

function renderChapterList(chapters) {
  if (!chapters.length) {
    chapterList.innerHTML = `<div class="chapter-list-title">📂 暂无章节</div>`;
    return;
  }
  chapterList.innerHTML = `
    <div class="chapter-list-title">📂 章节目录 (${chapters.length})</div>
    ${chapters.map((ch, i) => `
      <div class="chapter-item" data-chapter="${ch.file}" onclick="selectChapter('${ch.file}')">
        ${String(i + 1).padStart(2, '0')}. ${ch.title}
      </div>
    `).join('')}
  `;
}

// ── Select chapter ──────────────────────────────────────────
async function selectChapter(chapterFile) {
  statusDot.className = 'status-dot loading';

  document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.chapter-item[data-chapter="${chapterFile}"]`)?.classList.add('active');

  state.currentChapter = chapterFile;

  const book = state.books.find(b => b.id === state.currentBook);
  const fileName = chapterFile.replace(/\.md$/, '');
  const title = fileName.replace(/^ch\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  try {
    const data = await api(`/api/books/${state.currentBook}/chapter/${chapterFile}`);

    welcome.style.display = 'none';
    chapterContent.style.display = 'block';

    contentHeader.innerHTML = `
      <div class="breadcrumb">
        <span onclick="selectBook('${state.currentBook}')">${book?.emoji || ''} ${book?.title || ''}</span>
        &nbsp;/&nbsp; ${fileName}
      </div>
      <h2>${title}</h2>
    `;

    article.innerHTML = data.html;
    content.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    article.innerHTML = `<div style="color:#f85149;padding:40px;text-align:center">
      <h3>❌ 加载失败</h3>
      <p>${err.message}</p>
    </div>`;
  }

  statusDot.className = 'status-dot';
}

// ── Keyboard shortcuts ───────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.currentChapter && state.currentBook) {
      selectBook(state.currentBook);
    }
  }
});

// ── Init ─────────────────────────────────────────────────────
async function init() {
  statusDot.className = 'status-dot loading';
  await Promise.all([loadBooks(), loadGitInfo()]);
  statusDot.className = 'status-dot';
}

init();
