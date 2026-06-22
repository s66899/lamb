// ═══════════════════════════════════════════════════════════════════
//  📚 知识书架 · 交互学习应用
// ═══════════════════════════════════════════════════════════════════

const RAW = 'https://raw.githubusercontent.com/s66899/lamb/book';
let MANIFEST = null;

// ═══════ Inline Markdown Parser (no deps) ═══════
const mdParse = (txt) => {
  if (!txt) return '';
  let s = txt
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/__(.+?)__/g,'<strong>$1</strong>')
    .replace(/_(.+?)_/g,'<em>$1</em>')
    .replace(/~~(.+?)~~/g,'<del>$1</del>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
  // inline code again after html
  s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
  
  // Images
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>'<img src="'+src.replace(/&amp;/g,'&')+'" alt="'+alt+'">');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>'<a href="'+u.replace(/&amp;/g,'&')+'" target="_blank">'+t+'</a>');
  
  // Tables
  let lines = s.split('\n');
  let result = [];
  let inTable = false, inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) { result.push('</code></pre>'); inCodeBlock = false; }
      else { result.push('<pre><code>'); inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { result.push(line + '\n'); continue; }
    
    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) { result.push('<hr>'); continue; }
    // Headings
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) { 
      result.push('<h'+hm[1].length+'>'+hm[2]+'</h'+hm[1].length+'>'); 
      continue; 
    }
    // Blockquote
    if (line.startsWith('> ')) {
      result.push('<blockquote><p>'+line.slice(2)+'</p></blockquote>');
      continue;
    }
    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      result.push('<li>'+line.replace(/^[-*+]\s+/,'')+'</li>');
      continue;
    }
    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      result.push('<li>'+line.replace(/^\d+\.\s+/,'')+'</li>');
      continue;
    }
    // Table row
    if (/^\|/.test(line)) {
      if (!inTable) { inTable = true; result.push('<table>'); }
      if (/^\|[\s:-]+\|[\s:-]+/.test(line)) continue; // separator
      const cells = line.split('|').filter((c,i,a)=>i>0||i<a.length-1).map(c=>c.trim());
      const tag = i === 0 || !lines[i-1].includes('---') ? 'th' : 'td';
      result.push('<tr>'+cells.map(c=>'<'+tag+'>'+c+'</'+tag+'>').join('')+'</tr>');
      continue;
    } else if (inTable && line.trim() === '') { result.push('</table>'); inTable = false; }
    
    // Empty line
    if (line.trim() === '') { result.push(''); continue; }
    // Regular paragraph
    result.push('<p>'+line+'</p>');
  }
  if (inTable) result.push('</table>');
  if (inCodeBlock) result.push('</code></pre>');
  
  // Wrap consecutive <li> into <ul>
  let out = result.join('\n');
  out = out.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>');
  return out;
};
let currentView = 'dashboard', currentBookId = null, currentChapterIdx = -1;
let fontBase = 15, sidebarOpen = true, focusMode = false;
let tocBtnState = true, quizItems = [];
let studyQuestions = [], studyIdx = 0;

const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

// ───── Splash & Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const bar = $('splashBar');
  // Show loading progress
  bar.style.width = '30%';
  await sleep(200);
  
  MANIFEST = MANIFEST_DATA;
  bar.style.width = '70%';
  await sleep(150);

  // Restore theme
  const theme = localStorage.getItem('bk_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  const savedFont = localStorage.getItem('bk_font');
  if (savedFont) { fontBase = parseInt(savedFont); document.documentElement.style.setProperty('--font-base', fontBase + 'px'); }
  
  bar.style.width = '100%';
  await sleep(300);
  
  $('splash').style.display = 'none';
  $('app').style.display = 'block';
  
  // Init app
  const totalCh = MANIFEST.books.reduce((s, b) => s + b.chapters.length, 0);
  const totalW = MANIFEST.books.reduce((s, b) => s + b.totalWords, 0);
  $('heroSub').textContent = `${MANIFEST.books.length} 本书 · ${totalCh} 章 · ${(totalW / 10000).toFixed(1)} 万字`;
  
  renderDashboard();
  updateProgress();
  
  // Keyboard
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    switch(e.key) {
      case '/': e.preventDefault(); openSearch(); break;
      case 'Escape': closeAll(); break;
      case 'ArrowLeft': if (currentView==='reader') prevChapter(); break;
      case 'ArrowRight': if (currentView==='reader') nextChapter(); break;
      case 'b': case 'B': if (currentView==='reader') toggleReadMark(); break;
      case 't': case 'T': if (currentView==='reader') toggleTocFn(); break;
      case 'f': case 'F': if (currentView==='reader') toggleFocus(); break;
      case '?': showShortcuts(); break;
    }
  });

  // Scroll to top button
  $('content').addEventListener('scroll', () => {
    $('fab').classList.toggle('show', $('content').scrollTop > 300);
  });

  // Sidebar toggle for mobile
  if (window.innerWidth <= 768) toggleSidebar(false);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const closeAll = () => { closeSearch(); closeStats(); closeStudyMode(); closeShortcuts(); closeQuizOverlay(); };

// ───── Progress ───────────────────────────────────────────
const PK = 'bk_prog';
function getP() { try { return JSON.parse(localStorage.getItem(PK)||'{}'); } catch { return {}; } }
function setP(p) { localStorage.setItem(PK, JSON.stringify(p)); }

function markRead(bid, f) {
  const p = getP();
  if (!p[bid]) p[bid] = [];
  if (!p[bid].includes(f)) { p[bid].push(f); setP(p); }
  updateProgress();
}
function unmarkRead(bid, f) {
  const p = getP();
  if (p[bid]) { p[bid] = p[bid].filter(x => x !== f); setP(p); }
  updateProgress();
}
function isRead(bid, f) {
  const p = getP(); return p[bid] && p[bid].includes(f);
}
function chProgress(bid) {
  const book = MANIFEST.books.find(b => b.id === bid);
  if (!book || !book.chapters.length) return 0;
  const p = getP();
  const done = (p[bid]||[]).filter(f => book.chapters.some(c => c.file === f)).length;
  return done / book.chapters.length;
}
function totalP() {
  const total = MANIFEST.books.reduce((s, b) => s + b.chapters.length, 0);
  let done = 0;
  const p = getP();
  for (const b of MANIFEST.books) done += (p[b.id]||[]).filter(f => b.chapters.some(c => c.file === f)).length;
  return total ? done / total : 0;
}

function updateProgress() {
  const tp = totalP();
  const bar = $('heroBar');
  if (bar) bar.style.width = (tp * 100) + '%';
  const badge = $('progressBadge');
  if (badge) badge.textContent = Math.round(tp * 100) + '%';
  
  // Streak
  const streak = getStreak();
  const ss = $('heroStreak');
  if (ss) ss.textContent = streak > 0 ? `🔥 连续阅读 ${streak} 天` : '开始阅读，保持连续！';
  
  // Books
  $$('.bc-fill').forEach(el => {
    const bid = el.closest('.book-card')?.dataset?.bid;
    if (bid) el.style.width = (chProgress(bid)*100) + '%';
  });
  $$('.bp').forEach(el => {
    const bid = el.closest('.b-item')?.dataset?.bid;
    if (bid) el.style.width = (chProgress(bid)*100) + '%';
  });
  
  if (currentBookId) renderChapters(currentBookId);
}

// ───── Streak ─────────────────────────────────────────────
function getStreak() {
  const s = getP()._streak || {};
  const today = new Date().toISOString().slice(0,10);
  return s[today] ? s._count || 0 : 0;
}
function markStreak() {
  const p = getP();
  if (!p._streak) p._streak = {};
  const today = new Date().toISOString().slice(0,10);
  if (!p._streak[today]) {
    p._streak[today] = true;
    p._count = (p._count || 0) + 1;
    setP(p);
  }
}
function getStreakDays() {
  const p = getP();
  const s = p._streak || {};
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    const isToday = i === 0;
    days.push({ key, done: !!s[key], today: isToday });
  }
  return days;
}

// ───── View Switch ────────────────────────────────────────
function showView(v) {
  ['dashboard','book','reader'].forEach(k => {
    $(`view${k.charAt(0).toUpperCase()+k.slice(1)}`).style.display = k === v ? 'block' : 'none';
  });
  currentView = v;
  $('content').scrollTo({top:0, behavior:'smooth'});
  
  // Sidebar
  if (v === 'dashboard') {
    $('chSection').style.display = 'none';
  }
}

// ───── Sidebar ────────────────────────────────────────────
function toggleSidebar(show) {
  if (show === undefined) show = !sidebarOpen;
  $('sidebar').classList.toggle('closed', !show);
  sidebarOpen = show;
}

function renderBookList() {
  const list = $('bookList');
  list.innerHTML = MANIFEST.books.map(b => {
    const p = chProgress(b.id);
    return `<div class="b-item ${currentBookId===b.id?'active':''}" data-bid="${b.id}" onclick="goToBook('${b.id}')">
      <span class="be">${b.emoji}</span>
      <span class="bt">${b.title}</span>
      <span class="bc">${b.chapters.length}</span>
      <span class="bp" style="width:${Math.round(p*100)}%"></span>
    </div>`;
  }).join('');
}

function renderChapters(bid) {
  const book = MANIFEST.books.find(b => b.id === bid);
  if (!book) return;
  const list = $('chapterList');
  $('chSectionTitle').textContent = `📂 ${book.emoji} ${book.title}`;
  list.innerHTML = book.chapters.map((c, i) =>
    `<div class="c-item ${currentChapterIdx===i?'active':''}" onclick="openChapter(${i})">
      <span class="cn">${String(i+1).padStart(2,'0')}</span>
      <span class="ct">${c.title}</span>
      <span>${isRead(bid,c.file)?'✅':''}</span>
    </div>`
  ).join('');
  $('chSection').style.display = 'block';
}

// ───── Dashboard ──────────────────────────────────────────
function renderDashboard() {
  const grid = $('bookGrid');
  grid.innerHTML = MANIFEST.books.map(b => {
    const p = chProgress(b.id);
    return `<div class="book-card fade-in" data-bid="${b.id}" onclick="goToBook('${b.id}')">
      <div class="bc-accent" style="background:${b.color}"></div>
      <div class="bc-head">
        <span class="bc-emoji">${b.emoji}</span>
        <span class="bc-title">${b.title}</span>
      </div>
      <div class="bc-desc">${b.desc}</div>
      <div class="bc-meta">
        <span>📖 ${b.chapters.length} 章</span>
        <span>📝 ${(b.totalWords/10000).toFixed(1)} 万字</span>
        <span>✅ ${Math.round(p*100)}%</span>
      </div>
      <div class="bc-bar"><div class="bc-fill" style="width:${Math.round(p*100)}%;background:${b.color}"></div></div>
    </div>`;
  }).join('');
  renderBookList();
  updateProgress();
}

// ───── Book View ──────────────────────────────────────────
function goToBook(bid) {
  currentBookId = bid;
  showView('book');
  const book = MANIFEST.books.find(b => b.id === bid);
  const p = chProgress(bid);
  const readCount = Math.round(p * book.chapters.length);
  const totalH2 = book.chapters.reduce((s, c) => s + (c.h2s?.length || 0), 0);
  
  $('bookHeader').innerHTML = `
    <span class="back" onclick="goHome()">← 返回书架</span>
    <h1>${book.emoji} ${book.title}</h1>
    <div class="vm">${book.desc}</div>
  `;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${book.chapters.length}</span><span class="bs-label">📖 章节</span></div>
    <div class="bs-item"><span class="bs-num">${(book.totalWords/10000).toFixed(1)}</span><span class="bs-label">📝 万字</span></div>
    <div class="bs-item"><span class="bs-num">${totalH2}</span><span class="bs-label">📑 小节</span></div>
    <div class="bs-item"><span class="bs-num">${readCount}</span><span class="bs-label">✅ 已读/${book.chapters.length}</span></div>
    <div class="bs-item"><span class="bs-num">${Math.round(p*100)}%</span><span class="bs-label">📊 进度</span></div>
  `;
  
  const grid = $('chapterGrid');
  grid.innerHTML = book.chapters.map((c, i) => {
    const h2s = (c.h2s || []).map(h => h.title).join(' · ');
    return `<div class="chapter-card fade-in" onclick="openChapter(${i})">
      <div class="cc-num">第 ${String(i+1).padStart(2,'0')} 章</div>
      <div class="cc-title">${c.title} ${isRead(bid,c.file)?'✅':''}</div>
      <div class="cc-h2">${h2s || '—'}</div>
      <div class="cc-foot">
        <span>${(c.words/100).toFixed(0)} 百字 · ${c.h2s?.length||0} 节</span>
        <span>${isRead(bid,c.file)?'已读':'未读'}</span>
      </div>
    </div>`;
  }).join('');
  
  renderBookList();
  renderChapters(bid);
  if (window.innerWidth <= 768) toggleSidebar(false);
}

function goHome() {
  currentBookId = null; currentChapterIdx = -1;
  showView('dashboard');
  renderDashboard();
  $('chSection').style.display = 'none';
}

// ───── Reader ─────────────────────────────────────────────
function openChapter(idx) {
  currentChapterIdx = idx;
  showView('reader');
  renderChapter();
}

async function renderChapter() {
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  if (!book || !book.chapters[currentChapterIdx]) return;
  const ch = book.chapters[currentChapterIdx];
  
  // Update toolbar
  $('readerTitle').textContent = `${String(currentChapterIdx+1).padStart(2,'0')}/${book.chapters.length} · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx+1}/${book.chapters.length}`;
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
  
  // Prev/Next
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="prevChapter()" ${currentChapterIdx<=0?'disabled':''}>◀ 上章</button>
    <button class="tb-btn" onclick="openFullQuiz()">🧪 测验</button>
    <button class="tb-btn" onclick="nextChapter()" ${currentChapterIdx>=book.chapters.length-1?'disabled':''}>下章 ▶</button>
  `;
  
  // Build TOC
  buildToc(ch);
  
  // Load content — try local relative path first, then GitHub raw
  $('article').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 读入中…</div>';
  let md = null;
  let loadErr = null;
  
  // Try 1: local relative path (works when opened locally with file:// or same-origin)
  const localUrl = `books/${currentBookId}/${ch.file}`;
  try {
    const r1 = await fetch(localUrl);
    if (r1.ok) md = await r1.text();
  } catch(e) { loadErr = e; }
  
  // Try 2: GitHub raw CDN (works when deployed on GitHub Pages)
  if (!md) {
    try {
      const url = `${RAW}/books/${currentBookId}/${ch.file}`;
      const r2 = await fetch(url);
      if (r2.ok) md = await r2.text();
      else throw new Error('HTTP '+r2.status);
    } catch(e2) {
      loadErr = e2;
    }
  }
  
  if (md) {
    $('article').innerHTML = mdParse(md);
    makeCollapsible();
    makeHighlightable();
    setupQuiz(ch);
    markStreak();
  } else {
    const msg = loadErr ? loadErr.message : '未知错误';
    $('article').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">
      ❌ 加载失败<br><span style="font-size:13px;color:var(--text3)">${msg}</span>
      <div style="margin-top:16px;font-size:13px;color:var(--text2)">
        提示：克隆仓库到本地，或者部署到 GitHub Pages 后访问<br>
        也可以直接打开 books/${currentBookId}/${ch.file} 查看原始文件
      </div>
    </div>`;
  }
  
  $('content').scrollTo({top:0, behavior:'smooth'});
  updateProgress();
  if (window.innerWidth <= 768) toggleSidebar(false);
}

function buildToc(ch) {
  const list = $('tocList');
  const h2s = ch.h2s || [];
  list.innerHTML = h2s.length ? h2s.map((h, i) => 
    `<div class="toc-item toc-h2" onclick="scrollToToc(${i})">${h.title}</div>`
  ).join('') : '<div style="font-size:11px;color:var(--text3)">无子标题</div>';
  tocBtnState = true;
  $('readerToc').style.display = 'block';
}

function scrollToToc(idx) {
  const headings = $$('article h2');
  if (headings[idx]) headings[idx].scrollIntoView({behavior:'smooth', block:'start'});
}

function toggleTocFn() {
  tocBtnState = !tocBtnState;
  $('readerToc').style.display = tocBtnState ? 'block' : 'none';
}

function toggleFocus() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
}

// ─── Type scale ───────────────────────────────────────
function increaseFont() { if (fontBase<22) { fontBase++; applyFont(); } }
function decreaseFont() { if (fontBase>12) { fontBase--; applyFont(); } }
function applyFont() { document.documentElement.style.setProperty('--font-base',fontBase+'px'); localStorage.setItem('bk_font',fontBase); }

// ─── Theme ────────────────────────────────────────────
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? '' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bk_theme', next);
}

// ─── Read Mark ────────────────────────────────────────
function toggleReadMark() {
  const ch = getCurChapter();
  if (!ch) return;
  if (isRead(currentBookId,ch.file)) unmarkRead(currentBookId,ch.file);
  else markRead(currentBookId,ch.file);
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
}

function getCurChapter() {
  if (!currentBookId || currentChapterIdx < 0) return null;
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  return book?.chapters[currentChapterIdx] || null;
}

function prevChapter() { if (currentChapterIdx>0) openChapter(currentChapterIdx-1); }
function nextChapter() {
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  if (book && currentChapterIdx < book.chapters.length-1) openChapter(currentChapterIdx+1);
}

// ─── Collapsible ──────────────────────────────────────
function makeCollapsible() {
  $$('article h2, article h3').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('collapsed'));
  });
}

// ─── Highlight ────────────────────────────────────────
function makeHighlightable() {
  $$('article p').forEach(el => {
    el.addEventListener('click', e => {
      el.classList.toggle('highlighted');
      // Remove highlight tag
      const tag = el.querySelector('.hl-tag');
      if (tag) tag.remove();
    });
  });
}

// ─── Quiz (sidebar) ────────────────────────────────────
function setupQuiz(ch) {
  quizItems = [];
  const h2s = ch.h2s || [];
  if (!h2s.length) { $('quizContent').innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:16px">🤷 无小节</div>'; return; }
  
  // Simple quiz: pick a random section and ask about it
  const n = Math.min(3, h2s.length);
  const picked = [...h2s].sort(()=>Math.random()-.5).slice(0, n);
  
  quizItems = picked.map(h => ({
    q: `「${h.title}」这部分主要讲什么？`,
    a: h.title,
    options: shuffle([h.title, ...getRandomH2s(ch, h, 3)])
  }));
  
  renderQuizSidebar();
}

function getRandomH2s(ch, exclude, count) {
  const others = (ch.h2s || []).filter(h => h.title !== exclude.title);
  const shuffled = [...others].sort(()=>Math.random()-.5);
  return shuffled.slice(0, count).map(h => h.title);
}

function shuffle(arr) { return [...arr].sort(()=>Math.random()-.5); }

function renderQuizSidebar() {
  $('quizContent').innerHTML = quizItems.map((item, qi) => `
    <div class="quiz-card" id="qc-${qi}">
      <div class="qc-q">${item.q}</div>
      ${item.options.map((o, oi) => `
        <button class="qc-btn" onclick="checkQuiz(${qi},${oi})" id="qcb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>
      `).join('')}
      <div class="qc-result" id="qcr-${qi}"></div>
    </div>
  `).join('');
  $('quizSidebar').style.display = 'block';
}

function checkQuiz(qi, oi) {
  const item = quizItems[qi];
  const correct = item.options[oi] === item.a || item.options.indexOf(item.a) === oi;
  // Check which index is the correct answer
  const correctIdx = item.options.indexOf(item.a);
  
  // Disable all buttons
  for (let i = 0; i < item.options.length; i++) {
    const btn = $(`qcb-${qi}-${i}`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add(i === correctIdx ? 'correct' : i === oi && !correct ? 'wrong' : '');
    }
  }
  
  const r = $(`qcr-${qi}`);
  if (r) r.textContent = correct ? '✅ 正确！' : `❌ 答案是 ${item.a}`;
}

// ─── Full Quiz ──────────────────────────────────────────
function openFullQuiz() {
  if (!currentBookId) return;
  const book = MANIFEST.books.find(b => b.id === currentBookId);
  const ch = book?.chapters[currentChapterIdx];
  if (!ch) return;
  
  const h2s = ch.h2s || [];
  if (!h2s.length) { alert('本章暂无小节内容可生成测验'); return; }
  
  // Generate 5 questions
  const picked = [...h2s].sort(()=>Math.random()-.5).slice(0,5);
  const fq = picked.map(h => ({
    q: `「${h.title}」是关于什么的？`,
    a: h.title,
    opts: shuffle([h.title, ...getRandomH2s(ch, h, 3)])
  }));
  
  renderFullQuiz(fq);
  $('quizOverlay').style.display = 'flex';
}

function renderFullQuiz(questions) {
  let html = '<div class="quiz-full">';
  questions.forEach((q, qi) => {
    html += `<div class="qf-card" id="qf-${qi}" style="margin-bottom:20px">
      <div class="qf-q">${qi+1}. ${q.q}</div>
      <div class="qf-opts">
        ${q.opts.map((o, oi) => `
          <button class="qf-btn" onclick="checkFullQuiz(${qi},${oi})" id="qfb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>
        `).join('')}
      </div>
      <div class="qf-result" id="qfr-${qi}"></div>
    </div>`;
  });
  html += `<div style="margin-top:8px"><button class="tb-btn" onclick="closeQuizOverlay()">关闭测验</button></div></div>`;
  
  // Store answer key
  window._fullQuiz = questions;
  $('quizFullContent').innerHTML = html;
}

function checkFullQuiz(qi, oi) {
  const q = window._fullQuiz?.[qi];
  if (!q) return;
  const correctIdx = q.opts.indexOf(q.a);
  const correct = oi === correctIdx;
  
  for (let i = 0; i < q.opts.length; i++) {
    const btn = $(`qfb-${qi}-${i}`);
    if (btn) { btn.disabled = true; btn.classList.add(i === correctIdx ? 'correct' : i === oi ? 'wrong' : ''); }
  }
  const r = $(`qfr-${qi}`);
  if (r) { r.textContent = correct ? '✅ 正确！' : `❌ 答案是 ${q.a}`; r.className = 'qf-result ' + (correct ? 'correct' : 'wrong'); }
}

function closeQuizOverlay() { $('quizOverlay').style.display = 'none'; }

// ─── Study Mode ────────────────────────────────────────
function toggleStudyMode() {
  if ($('studyOverlay').style.display === 'flex') { closeStudyMode(); return; }
  generateStudy();
  $('studyOverlay').style.display = 'flex';
  showStudy();
}

function closeStudyMode() { $('studyOverlay').style.display = 'none'; }

function generateStudy() {
  studyQuestions = [];
  const candidates = [];
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if ((ch.h2s||[]).length > 0) {
        ch.h2s.forEach(h => candidates.push({ book, ch, section: h }));
      }
    }
  }
  candidates.sort(()=>Math.random()-.5);
  studyQuestions = candidates.slice(0, 20);
  studyIdx = 0;
}

function showStudy() {
  if (!studyQuestions.length || studyIdx >= studyQuestions.length) {
    $('studyBody').innerHTML = `
      <div style="text-align:center;padding:40px">
        <div style="font-size:64px;margin-bottom:12px">🎉🏆🎉</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:4px">🎯 全记住了！</div>
        <div style="color:var(--text2);font-size:13px;margin-bottom:16px">🧠 继续加油</div>
        <button class="study-reveal" onclick="generateStudy();showStudy()">🔄 再练</button>
      </div>
    `;
    return;
  }
  const q = studyQuestions[studyIdx];
  $('studyBody').innerHTML = `
    <div class="study-section">${q.book.emoji} ${q.book.title} · ${q.ch.title}</div>
    <div class="study-question">🤔 说说「<strong>${q.section.title}</strong>」讲了啥？</div>
    <button class="study-reveal" onclick="studyReveal()">💡 提示</button>
    <div class="study-answer" id="studyAnswer">⏳ 加载…</div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
      <button class="tb-btn" onclick="studyMarked()">✅ 会了</button>
      <button class="tb-btn" onclick="studyAgain()">🔄 再看</button>
    </div>
  `;
}

function studyReveal() {
  const a = $('studyAnswer');
  if (a) { a.style.display = 'block'; a.textContent = '📖 翻书复习 ✨'; }
}

function studyMarked() { studyIdx++; showStudy(); }
function studyAgain() { showStudy(); }

// ─── Random Chapter ────────────────────────────────────
function randomChapter() {
  const books = MANIFEST.books;
  const book = books[Math.floor(Math.random() * books.length)];
  const ch = book.chapters[Math.floor(Math.random() * book.chapters.length)];
  const idx = book.chapters.indexOf(ch);
  goToBook(book.id);
  setTimeout(() => openChapter(idx), 300);
}

// ─── Search ────────────────────────────────────────────
function openSearch() {
  $('searchOverlay').style.display = 'flex';
  const inp = $('searchInput');
  setTimeout(() => inp.focus(), 100);
  $('searchResults').innerHTML = '<div class="search-hint">⌨️ 输词 · ⏎ 搜全书</div>';
}
function closeSearch() { $('searchOverlay').style.display = 'none'; $('searchResults').innerHTML = ''; }

const MAX_RESULTS = 30;
async function doSearch(query) {
  query = query.trim();
  if (!query) { $('searchResults').innerHTML = '<div class="search-hint">⌨️ 输词 · ⏎ 搜全书</div>'; return; }
  
  $('searchResults').innerHTML = '<div class="search-hint">⏳ 搜…</div>';
  const ql = query.toLowerCase();
  const results = [];
  
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if (results.length >= MAX_RESULTS) break;
      // Search by title/section match
      if (ch.title.toLowerCase().includes(ql) || ch.file.toLowerCase().includes(ql)) {
        results.push({book,ch,preview:'📑 章节标题匹配',line:0});
        continue;
      }
      if (ch.h2s) {
        for (const h of ch.h2s) {
          if (results.length >= MAX_RESULTS) break;
          if (h.title.toLowerCase().includes(ql)) {
            results.push({book,ch,preview:`📌 小节「${h.title}」`,line:0});
          }
        }
      }
    }
    if (results.length >= MAX_RESULTS) break;
  }
  
  // If not enough, fetch content
  if (results.length < MAX_RESULTS) {
    for (const book of MANIFEST.books) {
      for (const ch of book.chapters) {
        if (results.length >= MAX_RESULTS) break;
        if (results.some(r => r.ch === ch)) continue;
        try {
          let md = null;
          // local first, then remote
          try { const lr = await fetch('books/'+book.id+'/'+ch.file); if(lr.ok) md = await lr.text(); } catch{}
          if (!md) {
            const rr = await fetch(`${RAW}/books/${book.id}/${ch.file}`);
            if (rr.ok) md = await rr.text();
          }
          if (!md) continue;
          const lines = md.split('\n');
          for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
            if (lines[i].toLowerCase().includes(ql) && !lines[i].startsWith('#')) {
              const p = lines[i].length > 100 ? lines[i].slice(0,100)+'…' : lines[i];
              results.push({book,ch,preview:p,line:i+1,raw:lines[i]});
              break;
            }
          }
        } catch {}
      }
    }
  }
  
  if (!results.length) {
    $('searchResults').innerHTML = '<div class="search-hint">😅 未找到匹配内容</div>';
    return;
  }
  
  $('searchResults').innerHTML = results.map(r => {
    const highlighted = r.preview.replace(new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<em>$1</em>');
    return `<div class="sr-item" onclick="goSearchResult('${r.book.id}','${r.ch.file}')">
      <div class="sr-b">${r.book.emoji} ${r.book.title} · ${r.ch.title}</div>
      <div class="sr-p">${highlighted}</div>
      ${r.line ? '<div class="sr-m">第 '+r.line+' 行</div>' : ''}
    </div>`;
  }).join('');
}

function goSearchResult(bid, file) {
  closeSearch();
  goToBook(bid);
  const book = MANIFEST.books.find(b => b.id === bid);
  const idx = book?.chapters.findIndex(c => c.file === file);
  if (idx >= 0) setTimeout(() => openChapter(idx), 300);
}

// ─── Stats ─────────────────────────────────────────────
function openStats() {
  const tp = totalP();
  const totalCh = MANIFEST.books.reduce((s,b) => s+b.chapters.length, 0);
  const p = getP();
  let totalRead = 0;
  for (const b of MANIFEST.books) totalRead += (p[b.id]||[]).filter(f => b.chapters.some(c=>c.file===f)).length;
  
  const streakDays = getStreakDays();
  const streakCount = p._count || 0;
  
  $('statsContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="sc-num">${totalRead}</div><div class="sc-label">✅ 已读</div></div>
      <div class="stat-card"><div class="sc-num">${totalCh - totalRead}</div><div class="sc-label">📖 剩</div></div>
      <div class="stat-card"><div class="sc-num">${MANIFEST.books.length}</div><div class="sc-label">📚 书</div></div>
      <div class="stat-card"><div class="sc-num">${Math.round(tp*100)}%</div><div class="sc-label">📊 进度</div></div>
    </div>
    <div class="stats-streak">
      <div style="font-size:14px;font-weight:600;margin-top:16px;">🔥 阅读连续 ${streakCount} 天</div>
      <div class="ss-days">
        ${streakDays.map(d => `
          <div class="ss-day ${d.done?'done':''} ${d.today?'today':''}">${new Date(d.key).getDate()}</div>
        `).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">
        ${streakDays.map(d => ['日','一','二','三','四','五','六'][new Date(d.key).getDay()]).join(' ')}
      </div>
    </div>
    <div style="margin-top:16px;">
      ${MANIFEST.books.map(b => {
        const bp = chProgress(b.id);
        return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px;">
          <span>${b.emoji}</span>
          <span style="flex:1">${b.title}</span>
          <div style="width:100px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${Math.round(bp*100)}%;background:${b.color};border-radius:2px;"></div>
          </div>
          <span style="color:var(--text3)">${Math.round(bp*100)}%</span>
        </div>`;
      }).join('')}
    </div>
  `;
  $('statsOverlay').style.display = 'flex';
}
function closeStats() { $('statsOverlay').style.display = 'none'; }

// ─── Shortcuts ─────────────────────────────────────────
function showShortcuts() {
  $('shortcutsContent').innerHTML = `
    <div class="sc-grid">
      <div class="sc-item"><span>搜索</span><kbd>/</kbd></div>
      <div class="sc-item"><span>关闭弹窗</span><kbd>Esc</kbd></div>
      <div class="sc-item"><span>上一章</span><kbd>←</kbd></div>
      <div class="sc-item"><span>下一章</span><kbd>→</kbd></div>
      <div class="sc-item"><span>标记已读</span><kbd>B</kbd></div>
      <div class="sc-item"><span>目录切换</span><kbd>T</kbd></div>
      <div class="sc-item"><span>专注模式</span><kbd>F</kbd></div>
      <div class="sc-item"><span>快捷键</span><kbd>?</kbd></div>
      <div class="sc-item"><span>随机章节</span><kbd>🎲 按钮</kbd></div>
      <div class="sc-item"><span>学习模式</span><kbd>🎯 按钮</kbd></div>
    </div>
  `;
  $('shortcutsOverlay').style.display = 'flex';
}
function closeShortcuts() { $('shortcutsOverlay').style.display = 'none'; }

// ─── Scroll to Top ─────────────────────────────────────
function scrollToTop() { $('content').scrollTo({top:0, behavior:'smooth'}); }

// ─── Toggle quiz sidebar ───────────────────────────────
function toggleQuizPanel() {
  const qs = $('quizSidebar');
  qs.style.display = qs.style.display === 'none' ? 'block' : 'none';
}
