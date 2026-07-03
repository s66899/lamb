// ═══════════════════════════════════════════════════════════════════
//  🏸 羽毛球系统训练 · NSCA-CPT 科学体系
//  ═══════════════════════════════════════════════════════════════════

const RAW = 'https://raw.githubusercontent.com/s66899/lamb/book';
let MANIFEST = null;
let currentModule = 'dashboard';

// ─── 5大训练模块配置 ──────────────────────────
const TRAIN_MODULES = [
  {
    id:'badminton-tech', icon:'🏸', title:'羽毛球技术', color:'var(--blue)',
    desc:'手法·步伐·球路·战术一体化训练体系',
    tags:['握拍','高远球','杀球','网前','步伐','球路'],
    books:['badminton'],
    chaptersBase:['基础握拍','正手高远球','反手技术','网前小球','步伐体系','杀球扣杀','平抽快挡','综合训练','常见错误','比赛心理']
  },
  {
    id:'strength', icon:'💪', title:'体能训练', color:'var(--green)',
    desc:'关节稳定·代谢适应·间歇训练·周期安排',
    tags:['肩关节','膝关节','核心力量','代谢训练','周期化'],
    books:['nsca-cpt'],
    chaptersBase:['训练哲学','解剖基础','力量训练','爆发力','敏捷性','柔韧性','核心训练','周期化','损伤预防','恢复策略']
  },
  {
    id:'psychology', icon:'🧠', title:'心理训练', color:'var(--purple)',
    desc:'注意力·压力适应·自我调节·决策信心',
    tags:['注意力','压力管理','自我对话','目标设定','心流'],
    books:['psychology'],
    chaptersBase:['动机理论','目标设定','注意力训练','压力管理','自我效能','心流体验','情绪调节','团队动力','比赛心理','心理韧性']
  },
  {
    id:'nutrition', icon:'🥗', title:'营养恢复', color:'var(--orange)',
    desc:'TDEE计算·营养素分配·训练后恢复·睡眠优化',
    tags:['蛋白质','碳水','脂肪','水合','睡眠'],
    books:['nsca-cpt'],
    chaptersBase:['能量代谢','宏量营养素','微量营养素','训练前营养','训练后恢复','水合策略','补剂科学','睡眠优化','周期营养','体重管理']
  },
  {
    id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'对手分析·战术选择·节奏控制·体能分配',
    tags:['对手分析','战术库','节奏控制','心理战术','复盘'],
    books:['badminton','psychology'],
    chaptersBase:['对手分析','战术选择','节奏控制','体能分配','心理博弈','临场调整','复盘分析','赛前准备','赛中应变','赛后恢复']
  }
];

// ─── 书塔书籍入口（次要） ─────────────────────
const TOWER_BOOKS = ['badminton','finance','psychology','engineering-mechanics','nsca-cpt','yin-yang'];

// ─── Markdown Parser ─────────────────────────────────
const mdParse = (txt) => {
  if (!txt) return '';
  // Escape HTML
  let s = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Inline formatting
  const inline = [
    [/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>'],
    [/\*\*(.+?)\*\*/g,'<strong>$1</strong>'],[/\*(.+?)\*/g,'<em>$1</em>'],
    [/__(.+?)__/g,'<strong>$1</strong>'],[/_(.+?)_/g,'<em>$1</em>'],
    [/~~(.+?)~~/g,'<del>$1</del>'],[/`([^`]+)`/g,'<code>$1</code>'],
  ];
  inline.forEach(([re,repl]) => { s = s.replace(re, repl); });
  // Images with SVG support
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>'<img src="'+src.replace(/&amp;/g,'&')+'" alt="'+alt+'" class="md-img" loading="lazy">');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>'<a href="'+u.replace(/&amp;/g,'&')+'" target="_blank">'+t+'</a>');
  
  let lines = s.split('\n'), result = [], inTable = false, inCode = false;
  for (let i=0;i<lines.length;i++) {
    let l=lines[i];
    if (l.startsWith('```')) {
      if (inCode) { result.push('</code></pre>'); inCode=false; }
      else { result.push('<pre><code>'); inCode=true; }
      continue;
    }
    if (inCode) { result.push(l+'\n'); continue; }
    if (/^[-*_]{3,}\s*$/.test(l)) { result.push('<hr>'); continue; }
    const hm = l.match(/^(#{1,4})\s+(.+)/);
    if (hm) { result.push('<h'+hm[1].length+'>'+hm[2]+'</h'+hm[1].length+'>'); continue; }
    if (l.startsWith('> ')) { result.push('<blockquote><p>'+l.slice(2)+'</p></blockquote>'); continue; }
    if (/^[-*+]\s+/.test(l)) { result.push('<li>'+l.replace(/^[-*+]\s+/,'')+'</li>'); continue; }
    if (/^\d+\.\s+/.test(l)) { result.push('<li>'+l.replace(/^\d+\.\s+/,'')+'</li>'); continue; }
    if (/^\|/.test(l)) {
      if (!inTable) { inTable=true; result.push('<table>'); }
      if (/^\|[\s:-]+\|[\s:-]+/.test(l)) continue;
      const cells = l.split('|').filter((c,j,a)=>j>0||j<a.length-1).map(c=>c.trim());
      const tag = i===0||!lines[i-1].includes('---')?'th':'td';
      result.push('<tr>'+cells.map(c=>'<'+tag+'>'+c+'</'+tag+'>').join('')+'</tr>');
      continue;
    } else if (inTable && l.trim()==='') { result.push('</table>'); inTable=false; }
    if (l.trim()==='') { result.push(''); continue; }
    result.push('<p>'+l+'</p>');
  }
  if (inTable) result.push('</table>');
  if (inCode) result.push('</code></pre>');
  let out = result.join('\n');
  out = out.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>');
  // Center images with figcaptions
  out = out.replace(/<p><img[^>]+><\/p>/g,(m)=>'<div class="img-container">'+m.replace(/^<p>/,'').replace(/<\/p>$/,'')+'</div>');
  return out;
};

// ─── 版本信息 ──────────────────────────────────────────
// 每次更新内容后修改此行
const APP_VERSION = 'v2.1.0';
const APP_DATE = '2026-07-03';

// ─── State ──────────────────────────────────────────────
let currentView='dashboard', currentBookId=null, currentChapterIdx=-1;
let fontBase=15, sidebarOpen=true, focusMode=false;
let tocBtnState=true, quizItems=[];
let studyQuestions=[], studyIdx=0;

const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

// ════════════════════════════════════════════════════════
//  🎮 RPG 游戏引擎
// ════════════════════════════════════════════════════════
const RP_KEY = 'bk_rpg';

function getRP() {
  try { return JSON.parse(localStorage.getItem(RP_KEY)||'{}'); } catch { return {}; }
}
function setRP(r) { localStorage.setItem(RP_KEY, JSON.stringify(r)); }

function getDefaultRP() {
  return {
    level:1, xp:0,
    xpToNext:100,
    achievements:{},
    quests:{},
    totalRead:0,
    totalQuizCorrect:0,
    avatar:'🧙'
  };
}

function initRP() {
  let r = getRP();
  if (!r.level) { r = getDefaultRP(); setRP(r); }
  // Ensure XP curve
  r.xpToNext = getXpForLevel(r.level);
  return r;
}

function getXpForLevel(lvl) {
  return Math.floor(50 * Math.pow(1.2, lvl - 1));
}

function calcLevel(xpTotal) {
  let lvl=1, needed=50;
  while (xpTotal >= needed) {
    xpTotal -= needed;
    lvl++;
    needed = Math.floor(50 * Math.pow(1.2, lvl - 1));
  }
  return { level:lvl, xp:xpTotal, xpToNext:needed };
}

// ─── XP 获得 ────────────────────────────────────
function addXP(amount, source='📖 阅读') {
  let r = getRP();
  if (!r.level) r = getDefaultRP();
  const oldLevel = r.level;
  let totalXp = calcTotalXp(r.level, r.xp);
  totalXp += amount;
  const newState = calcLevel(totalXp);
  r.level = newState.level;
  r.xp = newState.xp;
  r.xpToNext = newState.xpToNext;
  setRP(r);
  updateRpgHud();
  if (newState.level > oldLevel) showLevelUp(oldLevel, newState.level);
  showXpPopup(amount, source);
}

function calcTotalXp(lvl, xp) {
  let total = xp;
  for (let i=1; i<lvl; i++) total += getXpForLevel(i);
  return total;
}

function showXpPopup(amount, source) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = `+${amount} XP ${source}`;
  el.style.left = '50%';
  el.style.top = '30%';
  el.style.transform = 'translateX(-50%)';
  document.getElementById('app').appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function showLevelUp(oldLvl, newLvl) {
  const titles = ['修行者','探索者','学者','智者','大师','宗师','传说'];
  const oldTitle = titles[Math.min(6,Math.floor(oldLvl/3))];
  const newTitle = titles[Math.min(6,Math.floor(newLvl/3))];
  const titleChanged = oldTitle !== newTitle;
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  overlay.innerHTML = `
    <div class="levelup-box">
      <div class="lu-icon">🎉</div>
      <div class="lu-title">🎊 ${titleChanged?'称号晋升！':'升级！'}</div>
      <div style="font-size:48px;font-weight:700;color:var(--gold);margin:8px 0">Lv.${oldLvl} → Lv.${newLvl}</div>
      ${titleChanged ? `<div style="font-size:14px;color:var(--text2);margin-bottom:8px">${oldTitle} → <strong style="color:var(--green)">${newTitle}</strong></div>` : ''}
      <div class="lu-sub">✨ ${['继续前行，知识之路永无止境！','智慧的增长是最大的力量！','每一页都是成长的阶梯！','你的坚持正在创造奇迹！','学识如海，继续扬帆！'][Math.min(4,Math.floor(newLvl/4))]}</div>
      <div style="margin:12px 0;font-size:12px;color:var(--text3)">🎁 升级奖励：<span style="color:var(--green)">+${Math.floor(newLvl*100)} XP</span></div>
      <button class="lu-btn" onclick="addXP(${Math.floor(newLvl*100)},'🎊 升级奖励');this.closest('.levelup-overlay').remove()">🎯 领取奖励继续探索</button>
    </div>`;
  document.body.appendChild(overlay);
  // Check achievements
  checkAchievements();
}

// ─── HUD 更新 ────────────────────────────────────
function updateRpgHud() {
  const r = initRP();
  const hud = $('#rpgHud');
  if (!hud) return;
  const pct = r.xpToNext > 0 ? Math.min(100, Math.round(r.xp / r.xpToNext * 100)) : 0;
  const streak = getStreakDays().filter(d=>d.done).length;
  hud.innerHTML = `
    <div class="rpg-level" onclick="openStats()" title="查看玩家数据">
      <span class="lvl">Lv.${r.level}</span>
      <span>${r.avatar}</span>
    </div>
    <div class="rpg-xp-bar" title="经验值">
      <div class="rpg-xp-fill" style="width:${pct}%"></div>
    </div>
    <span class="rpg-xp-text">${r.xp}/${r.xpToNext}</span>
    <div class="rpg-badge streak" onclick="openStats()" title="连续阅读">
      🔥 ${streak}
    </div>
    <div class="rpg-badge achievement" onclick="openAchievements()" title="成就">
      🏆 ${Object.values(r.achievements||{}).filter(v=>v).length}
    </div>
    <div class="rpg-badge quest" onclick="openQuests()" title="任务">
      📋 任务
    </div>
  `;
}

// ─── 成就系统 ──────────────────────────────────
const ACHIEVEMENTS = {
  first_read: { icon:'📖', name:'初次阅读', desc:'读完第一章', check:(r)=>r.totalRead>=1 },
  reader_10: { icon:'📚', name:'阅读达人', desc:'读完10章', check:(r)=>r.totalRead>=10 },
  reader_50: { icon:'📚', name:'知识探险家', desc:'读完50章', check:(r)=>r.totalRead>=50 },
  reader_all: { icon:'🏆', name:'全知全能', desc:'读完所有章节', check:(r)=>r.totalRead>=getTotalChapters() },
  level_5: { icon:'⭐', name:'初出茅庐', desc:'达到5级', check:(r)=>r.level>=5 },
  level_10: { icon:'🌟', name:'知识学徒', desc:'达到10级', check:(r)=>r.level>=10 },
  level_20: { icon:'💫', name:'知识大师', desc:'达到20级', check:(r)=>r.level>=20 },
  streak_7: { icon:'🔥', name:'一周坚持', desc:'连续阅读7天', check:(r)=>getStreakDays().filter(d=>d.done).length>=7 },
  streak_30: { icon:'🔥', name:'月度坚持', desc:'连续阅读30天', check:(r)=>getStreakDays().filter(d=>d.done).length>=30 },
  quiz_master: { icon:'🧪', name:'测验大师', desc:'答对50道测验题', check:(r)=>r.totalQuizCorrect>=50 },
  quiz_guru: { icon:'🎯', name:'测验宗师', desc:'答对200道测验题', check:(r)=>r.totalQuizCorrect>=200 },
  full_book: { icon:'🎉', name:'完成一本书', desc:'读完一本书的全部章节', check:(r)=>checkAnyBookComplete() },
  all_books: { icon:'👑', name:'六艺精通', desc:'六本书全部完成', check:(r)=>checkAllBooksComplete() },
};

function getTotalChapters() {
  return MANIFEST ? MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0) : 0;
}

function checkAnyBookComplete() {
  if (!MANIFEST) return false;
  const p = getP();
  for (const b of MANIFEST.books) {
    const done = (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
    if (done >= b.chapters.length) return true;
  }
  return false;
}

function checkAllBooksComplete() {
  if (!MANIFEST) return false;
  const p = getP();
  for (const b of MANIFEST.books) {
    const done = (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
    if (done < b.chapters.length) return false;
  }
  return true;
}

function checkAchievements() {
  const r = getRP();
  if (!r.achievements) r.achievements = {};
  let unlocked = false;
  for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
    if (!r.achievements[key] && ach.check(r)) {
      r.achievements[key] = true;
      unlocked = true;
      showAchievementPopup(ach);
    }
  }
  if (unlocked) setRP(r);
  updateRpgHud();
}

function showAchievementPopup(ach) {
  const el = document.createElement('div');
  el.className = 'ach-popup';
  el.innerHTML = `
    <div class="ach-icon">${ach.icon}</div>
    <div class="ach-name">🏆 ${ach.name}</div>
    <div class="ach-desc">${ach.desc}</div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition='opacity .4s'; el.style.opacity='0'; setTimeout(()=>el.remove(),500); }, 3500);
}

function openAchievements() {
  const r = getRP();
  if (!r.achievements) r.achievements = {};
  let html = '<div class="ach-grid">';
  for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
    const unlocked = !!r.achievements[key];
    html += `<div class="ach-item ${unlocked?'unlocked':'locked'}">
      <div class="ai-icon">${ach.icon}</div>
      <div class="ai-name">${ach.name}</div>
      <div class="ai-desc">${unlocked?'✅ '+ach.desc:'🔒 '+ach.desc}</div>
    </div>`;
  }
  html += '</div>';
  showOverlay('panel-achievement', '🏆 成就', html);
}

// ─── 每日任务 ──────────────────────────────────
function getDailyQuests() {
  const today = new Date().toISOString().slice(0,10);
  return [
    { id:'daily_read', icon:'📖', name:'每日阅读', desc:'读完一章', check:(r,p)=>p[today]||getStreakDays().some(d=>d.done&&d.key===today), reward:'+20 XP' },
    { id:'daily_quiz', icon:'🧪', name:'知识测验', desc:'答对3道题', check:(r,p)=>(r.totalQuizCorrect||0)>=3 },
    { id:'daily_streak', icon:'🔥', name:'保持连续', desc:'登录并阅读', check:(r,p)=>getStreakDays().filter(d=>d.done).length>=1 },
  ];
}

function openQuests() {
  const r = getRP();
  if (!r.quests) r.quests = {};
  const today = new Date().toISOString().slice(0,10);
  const quests = getDailyQuests();
  let html = '<div class="quest-list">';
  for (const q of quests) {
    const done = r.quests[q.id+'_'+today];
    const canComplete = !done && q.check(r, {});
    html += `<div class="quest-item ${done?'completed':''}">
      <div class="qi-icon">${q.icon}</div>
      <div class="qi-info">
        <div class="qi-name">${q.name}</div>
        <div class="qi-desc">${q.desc}</div>
        <div class="qi-reward">🎁 ${q.reward}</div>
      </div>
      ${done?'<span style="font-size:16px">✅</span>':canComplete?'<button class="tb-btn" onclick="claimQuest(\''+q.id+'\')">领取</button>':'<span style="color:var(--text3);font-size:10px">⏳ 进行中</span>'}
    </div>`;
  }
  html += '</div>';
  showOverlay('panel-quest', '📋 每日任务', html);
}

function claimQuest(qid) {
  const r = getRP();
  if (!r.quests) r.quests = {};
  const today = new Date().toISOString().slice(0,10);
  r.quests[qid+'_'+today] = true;
  setRP(r);
  addXP(20, '🎯 任务奖励');
  openQuests();
}

// ─── 进度系统 (读取标记) ──────────────────────
const PK = 'bk_prog';
function getP() { try { return JSON.parse(localStorage.getItem(PK)||'{}'); } catch { return {}; } }
function setP(p) { localStorage.setItem(PK, JSON.stringify(p)); }

function markRead(bid, f) {
  const p = getP();
  if (!p[bid]) p[bid] = [];
  if (!p[bid].includes(f)) {
    p[bid].push(f); setP(p);
    // RPG: 阅读奖励
    const r = getRP();
    if (!r.level) { setRP(getDefaultRP()); }
    r.totalRead = (r.totalRead||0) + 1;
    setRP(r);
    addXP(10, '📖');
    checkAchievements();
  }
  updateProgress();
}
function unmarkRead(bid, f) {
  const p = getP();
  if (p[bid]) { p[bid] = p[bid].filter(x=>x!==f); setP(p); }
  updateProgress();
}
function isRead(bid, f) {
  const p = getP(); return p[bid] && p[bid].includes(f);
}
function chProgress(bid) {
  const book = MANIFEST?.books.find(b=>b.id===bid);
  if (!book || !book.chapters.length) return 0;
  const p = getP();
  const done = (p[bid]||[]).filter(f=>book.chapters.some(c=>c.file===f)).length;
  return done / book.chapters.length;
}
function totalP() {
  const total = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0) : 0;
  if (!total) return 0;
  let done = 0; const p = getP();
  for (const b of MANIFEST.books) done += (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
  return done/total;
}

function updateProgress() {
  const tp = totalP();
  const bar = $('heroBar');
  if (bar) bar.style.width = (tp*100)+'%';
  const badge = $('progressBadge');
  if (badge) badge.textContent = Math.round(tp*100)+'%';
  
  // Books
  $$('.bc-fill').forEach(el => {
    const bid = el.closest('.book-card')?.dataset?.bid;
    if (bid) el.style.width = (chProgress(bid)*100)+'%';
  });
  $$('.bp').forEach(el => {
    const bid = el.closest('.b-item')?.dataset?.bid;
    if (bid) el.style.width = (chProgress(bid)*100)+'%';
  });
  if (currentBookId) renderChapters(currentBookId);
  updateRpgHud();
}

// ─── Streak ─────────────────────────────────---
function getStreakDays() {
  const p = getP();
  const s = p._streak || {};
  const days = [];
  const today = new Date();
  for (let i=6; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    days.push({ key, done:!!s[key], today:i===0 });
  }
  return days;
}
function markStreak() {
  const p = getP();
  if (!p._streak) p._streak = {};
  const today = new Date().toISOString().slice(0,10);
  if (!p._streak[today]) {
    p._streak[today] = true;
    p._count = (p._count||0) + 1;
    setP(p);
    // Streak bonus XP with celebration milestones
    const streakDays = getStreakDays().filter(d=>d.done).length;
    const milestoneMsgs = [
      [3,'🔥 3日连击','继续加油，习惯在养成！',15],
      [7,'🔥 7日连击','一周不懈怠，了不起！',30],
      [14,'🔥 半月坚持','两个星期的毅力，奖励！',60],
      [21,'🔥 三周连击','三周的坚持，超凡！',90],
      [30,'🔥 月度达人','一个月的非凡毅力！',150],
      [60,'🔥 双月传说','两个月如一日的坚持！',300],
      [100,'🔥 百日王者','百日修炼，难能可贵！',500],
    ];
    for (const [days,title,msg,xp] of milestoneMsgs) {
      if (streakDays === days) {
        addXP(xp, title);
        showAchievementPopup({icon:'🔥',name:title,desc:msg});
        return;
      }
    }
    addXP(5, '📖 每日阅读');
  }
}

// ─── Overlay ──────────────────────────────────
function showOverlay(cls, title, body) {
  closeAll();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = '_tmpOverlay';
  overlay.onclick = function(e) { if(e.target===this) this.remove(); };
  overlay.innerHTML = `<div class="${cls}" onclick="event.stopPropagation()">
    <div class="panel-hd"><span>${title}</span><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div>
    <div class="panel-bd">${body}</div>
  </div>`;
  document.body.appendChild(overlay);
}

// ─── View Switch ──────────────────────────────
function showView(v) {
  ['dashboard','book','reader'].forEach(k => {
    $(`view${k.charAt(0).toUpperCase()+k.slice(1)}`).style.display = k===v ? 'block' : 'none';
  });
  currentView = v;
  $('content').scrollTo({top:0, behavior:'smooth'});
  if (v==='dashboard') $('chSection').style.display='none';
}

// ─── Sidebar ──────────────────────────────────
function toggleSidebar(show) {
  if (show===undefined) show = !sidebarOpen;
  $('sidebar').classList.toggle('closed', !show);
  sidebarOpen = show;
}

// ─── Sidebar：训练模块 + 书塔入口 ──────────
function renderBookListShort() {
  const list = $('bookList');
  // Training modules section
  let html = '<div class="side-section"><div class="side-title">🎯 训练模块</div>';
  html += TRAIN_MODULES.map(m => `
    <div class="b-item ${currentModule===m.id?'active':''}" onclick="openTrainModule('${m.id}')" style="border-left:3px solid transparent;${currentModule===m.id?'border-left-color:'+m.color:''}">
      <span class="be">${m.icon}</span>
      <span class="bt">${m.title}</span>
    </div>`).join('');
  html += '</div>';
  
  // Book tower (collapsible-like)
  html += '<div class="side-section"><div class="side-title" style="display:flex;align-items:center;gap:4px;cursor:pointer" onclick="goHome()">📚 知识书塔 <span style="font-size:8px;color:var(--text4)">拓展</span></div>';
  html += MANIFEST.books.filter(b=>TOWER_BOOKS.includes(b.id)).map(b => {
    const p = chProgress(b.id);
    return `<div class="b-item ${currentBookId===b.id?'active':''}" data-bid="${b.id}" onclick="goToBook('${b.id}')">
      <span class="be">${b.emoji}</span>
      <span class="bt">${b.title}</span>
      <span class="bc">${b.chapters.length}</span>
      <span class="bp" style="width:${Math.round(p*100)}%"></span>
    </div>`;
  }).join('');
  html += '</div>';
  
  list.innerHTML = html;
}

function renderBookList() { renderBookListShort(); }

function renderChapters(bid) {
  const book = MANIFEST.books.find(b=>b.id===bid);
  if (!book) return;
  const list = $('chapterList');
  $('chSectionTitle').textContent = `📂 ${book.emoji} ${book.title}`;
  list.innerHTML = book.chapters.map((c,i) => {
    const read = isRead(bid,c.file);
    return `<div class="c-item ${currentChapterIdx===i?'active':''}" onclick="openChapter(${i})">
      <span class="cn">${String(i+1).padStart(2,'0')}</span>
      <span class="ct">${c.title}</span>
      <span>${read?'✅':''}</span>
    </div>`;
  }).join('');
  $('chSection').style.display='block';
}

// ─── Dashboard ────────────────────────────────
// ─── 渲染训练总览（首页） ──────────────────
function renderDashboard() {
  currentModule = 'dashboard';
  const r = initRP();
  const tp = totalP();
  const totalCh = MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0);
  const totalWords = MANIFEST.books.reduce((s,b)=>s+(b.totalWords||0),0);
  const pct = r.xpToNext>0 ? Math.min(100, Math.round(r.xp/r.xpToNext*100)) : 0;
  const streakCount = getStreakDays().filter(d=>d.done).length;
  
  showView('dashboard');
  $('chSection').style.display='none';
  
  // 主要统计
  const sBooks = $('sBooks'); if (sBooks) sBooks.textContent = TRAIN_MODULES.length;
  const sCh = $('sChapters'); if (sCh) sCh.textContent = totalCh;
  const sWords = $('sWords'); if (sWords) sWords.textContent = (totalWords/10000).toFixed(1);
  const sProg = $('sProgress'); if (sProg) sProg.textContent = Math.round(tp*100)+'%';
  const str = $('sStreak'); if (str) str.textContent = streakCount;
  
  // Hero
  const avatarEl = $('heroAvatar');
  if (avatarEl) {
    const avatars = ['🧙','🧝','🦸','🧛','🧞','🦄','🐉','🦅'];
    avatarEl.textContent = r.avatar || avatars[(r.level-1)%avatars.length];
  }
  $('heroTitle').textContent = '🏸 羽毛球系统训练 · NSCA-CPT 科学体系';
  $('heroSub').textContent = `${TRAIN_MODULES.length} 大训练模块 · ${totalCh} 篇教学文档 · 8 级进阶体系 · 3 年完整发展周期`;
  $('heroLevel').textContent = `Lv.${r.level} · ${['✨ 初心者','🌟 学徒','🔥 学士','💫 硕士','👑 博士','🏆 宗师','🐉 传说'][Math.min(6,Math.floor(r.level/3))]}`;
  
  // XP bar
  const xpFill = $('heroXpFill');
  if (xpFill) xpFill.style.width = pct+'%';
  const xpLabel = $('heroXpLabel');
  if (xpLabel) xpLabel.innerHTML = `<span>🧪 经验值 ${r.xp}/${r.xpToNext}</span><span>${pct}%</span>`;
  
  // Streak
  const streakDays = getStreakDays();
  const ss = $('heroStreak');
  if (ss) ss.innerHTML = streakDays.map(d=>
    `<span class="ss-day ${d.done?'done':''} ${d.today?'today':''}" style="display:inline-flex;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;font-size:8px;background:${d.done?'var(--green)':'var(--bg3)'};color:${d.done?'#fff':'var(--text3)'};${d.today?'border:2px solid var(--blue)':''}margin:0 1px">${new Date(d.key).getDate()}</span>`
  ).join('') + `<span style="margin-left:6px;font-size:10px">🔥 ${streakCount} 天</span>`;
  
  // Achievements link
  const achEl = $('heroAchievements');
  if (achEl) {
    const unlocked = Object.values(r.achievements||{}).filter(v=>v).length;
    achEl.innerHTML = `<span style="cursor:pointer;font-size:11px;color:var(--gold)" onclick="openAchievements()">🏆 成就 ${unlocked}/${Object.keys(ACHIEVEMENTS).length}</span>`;
  }
  
  // ── 🎯 核心训练原则（对标参考站） ──
  const featSection = $('featuresSection');
  if (featSection) {
    featSection.innerHTML = `
    <div class="principles-title" style="grid-column:1/-1;text-align:center;margin-bottom:4px">
      <span style="font-size:16px;font-weight:600">⚡ 核心训练原则</span>
      <span style="font-size:10px;color:var(--text3);display:block;margin-top:2px">任何训练安排必须同时满足四条才能执行</span>
    </div>
    <div class="principle-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:var(--radius);padding:16px 14px;transition:all var(--transition);">
      <div class="fc-icon">🎯</div>
      <div class="fc-title">动作质量 > 训练数量</div>
      <div class="fc-desc">神经肌肉系统记住的是你重复最多的模式。练错的动作重复100次=巩固100次错误。</div>
      <span class="fc-tag" style="background:var(--red-bg);color:var(--red)">不能用次数衡量效果</span>
    </div>
    <div class="principle-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:var(--radius);padding:16px 14px;transition:all var(--transition);">
      <div class="fc-icon">🧠</div>
      <div class="fc-title">神经肌肉控制 > 力量输出</div>
      <div class="fc-desc">神经系统先学会控制肌肉，肌肉才能发力。动作模式不稳定时不能加重量。</div>
      <span class="fc-tag" style="background:var(--purple-bg);color:var(--purple)">顺序不能反</span>
    </div>
    <div class="principle-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:var(--radius);padding:16px 14px;transition:all var(--transition);">
      <div class="fc-icon">🛡️</div>
      <div class="fc-title">预防损伤 > 追求表现</div>
      <div class="fc-desc">一次受伤=倒退回起点。恢复时间往往是训练时间的3-10倍。</div>
      <span class="fc-tag" style="background:var(--red-bg);color:var(--red)">不能在疲劳时冲击极限</span>
    </div>
    <div class="principle-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:var(--radius);padding:16px 14px;transition:all var(--transition);">
      <div class="fc-icon">📈</div>
      <div class="fc-title">长期发展 > 短期进步</div>
      <div class="fc-desc">神经系统适应需要4-6周，结缔组织初步适应约8-12周。</div>
      <span class="fc-tag" style="background:var(--blue-bg);color:var(--blue)">不能每周都加量</span>
    </div>`;
  }
  
  // ── 5大训练模块卡片 ──
  const grid = $('bookGrid');
  grid.innerHTML = TRAIN_MODULES.map(m => {
    // Count related chapters from manifest
    let chCount = 0;
    m.books.forEach(bid => {
      const book = MANIFEST.books.find(b=>b.id===bid);
      if (book) chCount += book.chapters.length;
    });
    return `<div class="training-card" onclick="openTrainModule('${m.id}')" style="background:linear-gradient(145deg,var(--bg2),var(--bg3),var(--bg2));border:1px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:all var(--transition);position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;width:100%;height:3px;background:${m.color}"></div>
      <div style="font-size:36px;margin-bottom:8px">${m.icon}</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:4px">${m.title}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:10px">${m.desc}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
        ${m.tags.map(t => `<span style="font-size:9px;background:var(--bg4);color:var(--text3);padding:1px 8px;border-radius:10px;border:1px solid var(--border)">${t}</span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
        <span>📖 ${chCount} 篇文档</span>
        <span style="color:${m.color}">查看详情 →</span>
      </div>
    </div>`;
  }).join('');
  
  // ── 📚 书塔入口（小型，放底部） ──
  grid.innerHTML += `<div style="grid-column:1/-1;text-align:center;margin-top:8px">
    <div onclick="openBookTower()" style="display:inline-flex;align-items:center;gap:10px;padding:14px 28px;background:linear-gradient(135deg,var(--bg3),var(--bg4));border:1px solid var(--border);border-radius:var(--radius-xl);cursor:pointer;transition:all var(--transition);">
      <span style="font-size:28px">📚</span>
      <div style="text-align:left">
        <div style="font-size:14px;font-weight:600">知识书塔</div>
        <div style="font-size:10px;color:var(--text3)">${MANIFEST.books.length}本书 · ${totalCh}关 · 拓展阅读</div>
      </div>
      <span style="font-size:18px;color:var(--text3)">→</span>
    </div>
  </div>`;
  
  renderBookListShort();
  updateProgress();
}

// ─── 书塔入口（次要） ────────────────────
function openBookTower() {
  currentModule = 'tower';
  showView('book');
  $('chSection').style.display='none';
  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回训练总览</div>
    <h1>📚 知识书塔 · 拓展阅读</h1>
    <div class="vm">${MANIFEST.books.length}本书 · 专业知识深度阅读</div>`;
  $('bookStats').innerHTML = '';
  const grid = $('chapterGrid');
  grid.innerHTML = MANIFEST.books.map(b => {
    const p = chProgress(b.id);
    return `<div class="book-card fade-in" data-bid="${b.id}" onclick="goToBook('${b.id}')" style="background:linear-gradient(145deg,var(--bg2),var(--bg3),var(--bg2));border:1px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:all var(--transition);position:relative;overflow:hidden;">
      <div class="bc-glow"></div>
      <div class="bc-accent" style="position:absolute;top:0;left:0;width:4px;height:100%;border-radius:0 2px 2px 0;background:${b.color}"></div>
      <div class="bc-head" style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:26px">${b.emoji}</span>
        <span style="font-size:15px;font-weight:600">${b.title}</span>
      </div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px">${b.desc}</div>
      <div style="display:flex;gap:10px;font-size:10px;color:var(--text3);flex-wrap:wrap">
        <span>📖 ${b.chapters.length} 关</span>
        <span>📝 ${(b.totalWords/10000).toFixed(1)} 万字</span>
        <span>✅ ${Math.round(p*100)}%</span>
      </div>
      <div style="margin-top:8px;height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.round(p*100)}%;background:${b.color};border-radius:4px;transition:width .5s"></div>
      </div>
    </div>`;
  }).join('');
}

// ─── 打开训练模块 ────────────────────
function openTrainModule(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  currentModule = modId;
  showView('book');
  $('chSection').style.display='none';
  
  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回训练总览</div>
    <h1>${mod.icon} ${mod.title}</h1>
    <div class="vm">${mod.desc}</div>`;
  
  // Stats
  let chCount = 0;
  mod.books.forEach(bid => {
    const book = MANIFEST.books.find(b=>b.id===bid);
    if (book) chCount += book.chapters.length;
  });
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${mod.chaptersBase.length}</span><span class="bs-label">📖 训练主题</span></div>
    <div class="bs-item"><span class="bs-num">${mod.tags.length}</span><span class="bs-label">🏷️ 核心标签</span></div>
    <div class="bs-item"><span class="bs-num">${chCount}</span><span class="bs-label">📚 相关文档</span></div>
  `;
  
  // Module content grid
  const grid = $('chapterGrid');
  grid.innerHTML = mod.chaptersBase.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openChapter(${i})" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;cursor:pointer;transition:all var(--transition);position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${mod.color};opacity:.6"></div>
      <div style="font-size:9px;color:var(--text3);margin-bottom:3px">训练主题 ${String(i+1).padStart(2,'0')}</div>
      <div style="font-size:13px;font-weight:500;margin-bottom:4px">${title}</div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);">
        <span>🔍 学习</span>
        <span style="color:${mod.color}">${mod.icon}</span>
      </div>
    </div>
  `).join('');
  
  renderBookListShort();
}

// ─── Book View (关卡地图) ─────────────────────
function goToBook(bid) {
  currentBookId = bid;
  showView('book');
  const book = MANIFEST.books.find(b=>b.id===bid);
  const p = chProgress(bid);
  const readCount = Math.round(p * book.chapters.length);
  const totalH2 = book.chapters.reduce((s,c)=>s+(c.h2s?.length||0),0);
  
  $('bookHeader').innerHTML = `
    <div class="back" onclick="goHome()">← 返回大陆</div>
    <h1>${book.emoji} ${book.title}</h1>
    <div class="vm">${book.desc}</div>
  `;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${book.chapters.length}</span><span class="bs-label">📖 关卡</span></div>
    <div class="bs-item"><span class="bs-num">${(book.totalWords/10000).toFixed(1)}</span><span class="bs-label">📝 万字</span></div>
    <div class="bs-item"><span class="bs-num">${totalH2}</span><span class="bs-label">📑 小节</span></div>
    <div class="bs-item"><span class="bs-num">${readCount}</span><span class="bs-label">✅ 已通关/${book.chapters.length}</span></div>
    <div class="bs-item"><span class="bs-num">${Math.round(p*100)}%</span><span class="bs-label">📊 进度</span></div>
  `;
  
  const grid = $('chapterGrid');
  const completed = readCount;
  grid.innerHTML = book.chapters.map((c,i) => {
    const read = isRead(bid,c.file);
    const isLocked = !read && i > completed;
    const h2s = (c.h2s||[]).map(h=>h.title).join(' · ');
    return `<div class="chapter-card fade-in ${read?'completed':''} ${isLocked?'locked':''}" onclick="${isLocked?'':`openChapter(${i})`}">
      <div class="cc-num">关卡 ${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-h2">${h2s || '—'}</div>
      <div class="cc-foot">
        <span>${(c.words/100).toFixed(0)} 百字 · ${c.h2s?.length||0} 节</span>
        <span class="cc-xp">${isLocked?'<span class="cc-lock">🔒</span>':'🏅 '+(Math.round(c.words/100)*2)+' XP'}</span>
      </div>
    </div>`;
  }).join('');
  
  renderBookList();
  renderChapters(bid);
  if (window.innerWidth<=768) toggleSidebar(false);
}

function goHome() {
  currentBookId=null; currentChapterIdx=-1; currentModule='dashboard';
  showView('dashboard');
  renderDashboard();
}

// ─── Reader ────────────────────────────────────
function openChapter(idx) {
  currentChapterIdx = idx;
  showView('reader');
  renderChapter();
}

async function renderChapter() {
  const book = MANIFEST.books.find(b=>b.id===currentBookId);
  if (!book || !book.chapters[currentChapterIdx]) return;
  const ch = book.chapters[currentChapterIdx];
  
  $('readerTitle').textContent = `关卡 ${String(currentChapterIdx+1).padStart(2,'0')}/${book.chapters.length} · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx+1}/${book.chapters.length}`;
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
  
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="prevChapter()" ${currentChapterIdx<=0?'disabled':''}>◀ 上一关</button>
    <button class="tb-btn" onclick="openFullQuiz()">🧪 测验</button>
    <button class="tb-btn" onclick="nextChapter()" ${currentChapterIdx>=book.chapters.length-1?'disabled':''}>下一关 ▶</button>
  `;
  
  buildToc(ch);
  
  $('article').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载关卡…</div>';
  let md = null, loadErr = null;
  
  const localUrl = `books/${currentBookId}/${ch.file}`;
  try { const r1 = await fetch(localUrl); if (r1.ok) md = await r1.text(); } catch(e) { loadErr = e; }
  
  if (!md) {
    try {
      const url = `${RAW}/books/${currentBookId}/${ch.file}`;
      const r2 = await fetch(url);
      if (r2.ok) md = await r2.text();
      else throw new Error('HTTP '+r2.status);
    } catch(e2) { loadErr = e2; }
  }
  
  if (md) {
    const versionFooter = `<hr style="margin-top:60px;opacity:0.3">
<div style="text-align:center;font-size:11px;color:var(--text3);padding:20px 0 10px 0;border-top:1px solid var(--border);margin-top:30px">
  📚 知识书塔 · ${APP_VERSION} &nbsp;|&nbsp; 📅 更新日期：${APP_DATE} &nbsp;|&nbsp; 🐏 by Lamb
</div>`;
    $('article').innerHTML = mdParse(md) + versionFooter;
    makeCollapsible();
    setupQuiz(ch);
    markStreak();
  } else {
    $('article').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">❌ 加载失败<br><span style="font-size:12px;color:var(--text3)">${loadErr?.message||'未知错误'}</span></div>`;
  }
  
  $('content').scrollTo({top:0, behavior:'smooth'});
  updateProgress();
  if (window.innerWidth<=768) toggleSidebar(false);
}

function buildToc(ch) {
  const list = $('tocList');
  const h2s = ch.h2s || [];
  list.innerHTML = h2s.length ? h2s.map((h,i)=>
    `<div class="toc-item toc-h2" onclick="scrollToToc(${i})">${h.title}</div>`
  ).join('') : '<div style="font-size:10px;color:var(--text3)">无子关卡</div>';
  tocBtnState=true;
  $('readerToc').style.display='block';
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

function increaseFont() { if (fontBase<22) { fontBase++; applyFont(); } }
function decreaseFont() { if (fontBase>12) { fontBase--; applyFont(); } }
function applyFont() { document.documentElement.style.setProperty('--font-base',fontBase+'px'); localStorage.setItem('bk_font',fontBase); }

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur==='light' ? '' : 'light');
  localStorage.setItem('bk_theme', cur==='light' ? '' : 'light');
}

function toggleReadMark() {
  const ch = getCurChapter();
  if (!ch) return;
  if (isRead(currentBookId,ch.file)) unmarkRead(currentBookId,ch.file);
  else markRead(currentBookId,ch.file);
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
}

function getCurChapter() {
  if (!currentBookId || currentChapterIdx<0) return null;
  const book = MANIFEST.books.find(b=>b.id===currentBookId);
  return book?.chapters[currentChapterIdx] || null;
}

function prevChapter() { if (currentChapterIdx>0) openChapter(currentChapterIdx-1); }
function nextChapter() {
  const book = MANIFEST.books.find(b=>b.id===currentBookId);
  if (book && currentChapterIdx < book.chapters.length-1) openChapter(currentChapterIdx+1);
}

function makeCollapsible() {
  $$('article h2, article h3').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('collapsed'));
  });
}

// ─── Quiz ──────────────────────────────────────
function setupQuiz(ch) {
  quizItems = [];
  const h2s = ch.h2s || [];
  if (!h2s.length) { $('quizContent').innerHTML='<div style="font-size:10px;color:var(--text3);text-align:center;padding:12px">🤷 无测试点</div>'; return; }
  const n = Math.min(3, h2s.length);
  const picked = [...h2s].sort(()=>Math.random()-.5).slice(0,n);
  quizItems = picked.map(h => ({
    q: `「${h.title}」主要讲什么？`,
    a: h.title,
    options: shuffle([h.title, ...getRandomH2s(ch,h,3)])
  }));
  renderQuizSidebar();
}

function getRandomH2s(ch, exclude, count) {
  const others = (ch.h2s||[]).filter(h=>h.title!==exclude.title);
  return [...others].sort(()=>Math.random()-.5).slice(0,count).map(h=>h.title);
}

function shuffle(arr) { return [...arr].sort(()=>Math.random()-.5); }

function renderQuizSidebar() {
  $('quizContent').innerHTML = quizItems.map((item,qi)=>`
    <div class="quiz-card" id="qc-${qi}">
      <div class="qc-q">${item.q}</div>
      ${item.options.map((o,oi)=>`
        <button class="qc-btn" onclick="checkQuiz(${qi},${oi})" id="qcb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>
      `).join('')}
      <div class="qc-result" id="qcr-${qi}"></div>
    </div>
  `).join('');
  $('quizSidebar').style.display='block';
}

function checkQuiz(qi, oi) {
  const item = quizItems[qi];
  const correctIdx = item.options.indexOf(item.a);
  const correct = oi === correctIdx;
  for (let i=0; i<item.options.length; i++) {
    const btn = $(`qcb-${qi}-${i}`);
    if (btn) { btn.disabled=true; btn.classList.add(i===correctIdx?'correct':i===oi&&!correct?'wrong':''); }
  }
  const r = $(`qcr-${qi}`);
  if (r) r.textContent = correct ? '✅ 正确！' : `❌ 答案是 ${item.a}`;
  if (correct) {
    const rp = getRP();
    rp.totalQuizCorrect = (rp.totalQuizCorrect||0)+1;
    setRP(rp);
    addXP(5, '🧪 测验');
    checkAchievements();
  }
}

function openFullQuiz() {
  if (!currentBookId) return;
  const book = MANIFEST.books.find(b=>b.id===currentBookId);
  const ch = book?.chapters[currentChapterIdx];
  if (!ch) return;
  const h2s = ch.h2s||[];
  if (!h2s.length) { alert('本章暂无测试点'); return; }
  const picked = [...h2s].sort(()=>Math.random()-.5).slice(0,5);
  const fq = picked.map(h => ({
    q: `「${h.title}」是关于什么的？`,
    a: h.title,
    opts: shuffle([h.title, ...getRandomH2s(ch,h,3)])
  }));
  renderFullQuiz(fq);
  const overlay = document.createElement('div');
  overlay.className='overlay';
  overlay.id='_quizOverlay';
  overlay.onclick = function(e) { if(e.target===this) this.remove(); };
  overlay.innerHTML = `<div class="panel panel-quiz" onclick="event.stopPropagation()">
    <div class="panel-hd"><span>🧪 关卡测验</span><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div>
    <div class="panel-bd" id="quizFullContent"></div>
  </div>`;
  document.body.appendChild(overlay);
}

function renderFullQuiz(questions) {
  window._fullQuiz = questions;
  let html = '<div class="quiz-full">';
  questions.forEach((q,qi) => {
    html += `<div class="qf-card" id="qf-${qi}" style="margin-bottom:16px">
      <div class="qf-q">${qi+1}. ${q.q}</div>
      <div class="qf-opts">
        ${q.opts.map((o,oi)=>`
          <button class="qf-btn" onclick="checkFullQuiz(${qi},${oi})" id="qfb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>
        `).join('')}
      </div>
      <div class="qf-result" id="qfr-${qi}"></div>
    </div>`;
  });
  html += '<div style="margin-top:8px"><button class="tb-btn" onclick="document.getElementById(\'_quizOverlay\')?.remove()">关闭测验</button></div></div>';
  $('quizFullContent').innerHTML = html;
}

function checkFullQuiz(qi, oi) {
  const q = window._fullQuiz?.[qi];
  if (!q) return;
  const correctIdx = q.opts.indexOf(q.a);
  const correct = oi === correctIdx;
  for (let i=0; i<q.opts.length; i++) {
    const btn = $(`qfb-${qi}-${i}`);
    if (btn) { btn.disabled=true; btn.classList.add(i===correctIdx?'correct':i===oi?'wrong':''); }
  }
  const r = $(`qfr-${qi}`);
  if (r) { r.textContent=correct?'✅ 正确！':'❌ 答案是 '+q.a; r.className='qf-result '+(correct?'correct':'wrong'); }
  if (correct) {
    const rp = getRP();
    rp.totalQuizCorrect = (rp.totalQuizCorrect||0)+1;
    setRP(rp);
    checkAchievements();
  }
}

// ─── Study Mode ──────────────────────────────
function toggleStudyMode() {
  if ($('studyOverlay') && $('studyOverlay').style.display==='flex') { closeStudyMode(); return; }
  generateStudy();
  const overlay = document.createElement('div');
  overlay.className='overlay';
  overlay.onclick = function(e) { if(e.target===this) this.remove(); };
  overlay.innerHTML = `<div class="panel panel-study" onclick="event.stopPropagation()">
    <div class="panel-hd"><span>🔁 复习卡片</span><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div>
    <div class="panel-bd" id="studyBody"></div>
  </div>`;
  document.body.appendChild(overlay);
  showStudy();
}

function generateStudy() {
  studyQuestions = []; const candidates = [];
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if ((ch.h2s||[]).length>0) ch.h2s.forEach(h=>candidates.push({book,ch,section:h}));
    }
  }
  candidates.sort(()=>Math.random()-.5);
  studyQuestions = candidates.slice(0,20); studyIdx=0;
}

function showStudy() {
  const body = $('studyBody');
  if (!body) return;
  if (!studyQuestions.length || studyIdx>=studyQuestions.length) {
    body.innerHTML = `<div style="text-align:center;padding:32px">
      <div style="font-size:56px;margin-bottom:10px">🎉🏆🎉</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">🎯 全部掌握！</div>
      <div style="color:var(--text2);font-size:12px;margin-bottom:14px">🧠 继续加油</div>
      <button class="study-reveal" onclick="generateStudy();showStudy()">🔄 再练</button>
    </div>`;
    return;
  }
  const q = studyQuestions[studyIdx];
  body.innerHTML = `
    <div class="study-section">${q.book.emoji} ${q.book.title} · ${q.ch.title}</div>
    <div class="study-question">🤔 说说「<strong>${q.section.title}</strong>」讲了啥？</div>
    <button class="study-reveal" onclick="studyReveal()">💡 提示</button>
    <div class="study-answer" id="studyAnswer">⏳ 加载…</div>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
      <button class="tb-btn" onclick="studyMarked()">✅ 会了</button>
      <button class="tb-btn" onclick="studyAgain()">🔄 再看</button>
    </div>`;
}

function studyReveal() { const a=$('studyAnswer'); if(a){a.style.display='block';a.textContent='📖 翻书复习 ✨';} }
function studyMarked() { studyIdx++; showStudy(); }
function studyAgain() { showStudy(); }

function randomChapter() {
  const books = MANIFEST.books;
  const book = books[Math.floor(Math.random()*books.length)];
  const ch = book.chapters[Math.floor(Math.random()*book.chapters.length)];
  goToBook(book.id);
  setTimeout(() => openChapter(book.chapters.indexOf(ch)), 300);
}

// ─── Search ──────────────────────────────────
function openSearch() {
  const overlay = document.createElement('div');
  overlay.className='overlay';
  overlay.onclick = function(e) { if(e.target===this) this.remove(); };
  overlay.innerHTML = `<div class="panel panel-search" onclick="event.stopPropagation()">
    <div class="panel-hd">
      <input type="text" id="searchInput" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-size:14px;outline:none" placeholder="🔍 搜索关键词 · ↵ 搜全书" autofocus onkeydown="if(event.key==='Enter')doSearch(this.value)">
      <button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button>
    </div>
    <div class="panel-bd" id="searchResults">
      <div class="search-hint">⌨️ 输入 → ↵ 搜索</div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('searchInput')?.focus(),100);
}

const MAX_RESULTS = 30;
async function doSearch(query) {
  query = query.trim();
  if (!query) { $('searchResults').innerHTML='<div class="search-hint">⌨️ 输入 → ↵ 搜索</div>'; return; }
  $('searchResults').innerHTML='<div class="search-hint">⏳ 搜索中…</div>';
  const ql = query.toLowerCase();
  const results = [];
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if (results.length>=MAX_RESULTS) break;
      if (ch.title.toLowerCase().includes(ql) || ch.file.toLowerCase().includes(ql)) {
        results.push({book,ch,preview:'📑 关卡标题匹配',line:0});
        continue;
      }
      if (ch.h2s) {
        for (const h of ch.h2s) {
          if (results.length>=MAX_RESULTS) break;
          if (h.title.toLowerCase().includes(ql)) results.push({book,ch,preview:'📌 小节「'+h.title+'」',line:0});
        }
      }
    }
    if (results.length>=MAX_RESULTS) break;
  }
  if (results.length<MAX_RESULTS) {
    for (const book of MANIFEST.books) {
      for (const ch of book.chapters) {
        if (results.length>=MAX_RESULTS) break;
        if (results.some(r=>r.ch===ch)) continue;
        try {
          let md=null;
          try { const lr=await fetch('books/'+book.id+'/'+ch.file); if(lr.ok) md=await lr.text(); } catch{}
          if (!md) { const rr=await fetch(RAW+'/books/'+book.id+'/'+ch.file); if(rr.ok) md=await rr.text(); }
          if (!md) continue;
          const lines=md.split('\n');
          for (let i=0; i<lines.length && results.length<MAX_RESULTS; i++) {
            if (lines[i].toLowerCase().includes(ql) && !lines[i].startsWith('#')) {
              const p = lines[i].length>100 ? lines[i].slice(0,100)+'…' : lines[i];
              results.push({book,ch,preview:p,line:i+1});
              break;
            }
          }
        } catch {}
      }
    }
  }
  if (!results.length) { $('searchResults').innerHTML='<div class="search-hint">😅 未找到匹配内容</div>'; return; }
  $('searchResults').innerHTML = results.map(r => {
    const highlighted = r.preview.replace(new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<em>$1</em>');
    return `<div class="sr-item" onclick="this.closest('.overlay').remove();goSearchResult('${r.book.id}','${r.ch.file}')">
      <div class="sr-b">${r.book.emoji} ${r.book.title} · ${r.ch.title}</div>
      <div class="sr-p">${highlighted}</div>
      ${r.line ? '<div class="sr-m">第 '+r.line+' 行</div>' : ''}
    </div>`;
  }).join('');
}

function goSearchResult(bid, file) {
  goToBook(bid);
  const book = MANIFEST.books.find(b=>b.id===bid);
  const idx = book?.chapters.findIndex(c=>c.file===file);
  if (idx>=0) setTimeout(()=>openChapter(idx), 300);
}

// ─── Stats ──────────────────────────────────
function openStats() {
  const tp = totalP();
  const totalCh = MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0);
  const p = getP();
  let totalRead = 0;
  for (const b of MANIFEST.books) totalRead += (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
  const streakDays = getStreakDays();
  const r = initRP();
  const achCount = Object.values(r.achievements||{}).filter(v=>v).length;
  
  const content = `
    <div class="stats-grid">
      <div class="stat-card"><div class="sc-num">${totalRead}</div><div class="sc-label">✅ 已通关</div></div>
      <div class="stat-card"><div class="sc-num">${totalCh - totalRead}</div><div class="sc-label">📖 待探索</div></div>
      <div class="stat-card"><div class="sc-num">${MANIFEST.books.length}</div><div class="sc-label">📚 地图</div></div>
      <div class="stat-card"><div class="sc-num">${Math.round(tp*100)}%</div><div class="sc-label">📊 总进度</div></div>
    </div>
    <div style="text-align:center;margin:12px 0">
      <span style="font-size:36px">${r.avatar}</span>
      <div style="font-size:14px;font-weight:600;margin:4px 0">Lv.${r.level} · 🧪 ${r.xp}/${r.xpToNext} XP</div>
      <div style="font-size:11px;color:var(--text2)">🏆 ${achCount} 成就 · 🧪 ${r.totalQuizCorrect||0} 测验</div>
    </div>
    <div class="stats-streak">
      <div style="font-size:13px;font-weight:600;margin-top:10px;">🔥 连续 ${streakDays.filter(d=>d.done).length} 天</div>
      <div class="ss-days">
        ${streakDays.map(d => `<div class="ss-day ${d.done?'done':''} ${d.today?'today':''}">${new Date(d.key).getDate()}</div>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">
        ${streakDays.map(d=>['日','一','二','三','四','五','六'][new Date(d.key).getDay()]).join(' ')}
      </div>
    </div>
    <div style="margin-top:12px">
      ${MANIFEST.books.map(b => {
        const bp = chProgress(b.id);
        return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px">
          <span>${b.emoji}</span>
          <span style="flex:1">${b.title}</span>
          <div style="width:80px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${Math.round(bp*100)}%;background:${b.color};border-radius:2px"></div>
          </div>
          <span style="color:var(--text3)">${Math.round(bp*100)}%</span>
        </div>`;
      }).join('')}
    </div>`;
  
  showOverlay('panel-stats', '📊 冒险报告', content);
}

// ─── Keyboard ──────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  switch(e.key) {
    case '/': e.preventDefault(); openSearch(); break;
    case 'Escape': { const o = document.querySelector('.overlay'); if (o) o.remove(); break; }
    case 'ArrowLeft': if (currentView==='reader') prevChapter(); break;
    case 'ArrowRight': if (currentView==='reader') nextChapter(); break;
    case 'b': case 'B': if (currentView==='reader') toggleReadMark(); break;
    case 'f': case 'F': if (currentView==='reader') toggleFocus(); break;
    case '?': showOverlay('panel-sm', '⌨️ 快捷键', `
      <div class="sc-grid">
        <div class="sc-item"><span>搜索</span><kbd>/</kbd></div>
        <div class="sc-item"><span>关闭</span><kbd>Esc</kbd></div>
        <div class="sc-item"><span>上一关</span><kbd>←</kbd></div>
        <div class="sc-item"><span>下一关</span><kbd>→</kbd></div>
        <div class="sc-item"><span>通关标记</span><kbd>B</kbd></div>
        <div class="sc-item"><span>专注模式</span><kbd>F</kbd></div>
      </div>`); break;
  }
});

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const bar = $('splashBar');
  if (!bar) return;
  bar.style.width = '25%';
  await sleep(150);
  MANIFEST = MANIFEST_DATA;
  bar.style.width = '60%';
  await sleep(120);
  
  const theme = localStorage.getItem('bk_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  const savedFont = localStorage.getItem('bk_font');
  if (savedFont) { fontBase=parseInt(savedFont); document.documentElement.style.setProperty('--font-base',fontBase+'px'); }
  
  bar.style.width = '90%';
  await sleep(200);
  initRP();
  bar.style.width = '100%';
  await sleep(200);
  $('splash').style.display='none';
  $('app').style.display='block';
  renderDashboard();
  updateProgress();
  
  // Content scroll listener for FAB
  $('content').addEventListener('scroll', () => {
    $('fab').classList.toggle('show', $('content').scrollTop > 300);
  });
  
  if (window.innerWidth <= 768) toggleSidebar(false);
  
  // Check achievements on load
  setTimeout(checkAchievements, 2000);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const closeAll = () => {};
function scrollToTop() { $('content').scrollTo({top:0, behavior:'smooth'}); }
function openShortcuts() {
  showOverlay('panel-sm', '⌨️ 快捷键', `
    <div class="sc-grid">
      <div class="sc-item"><span>🔍 搜索</span><kbd>/</kbd></div>
      <div class="sc-item"><span>✕ 关闭面板</span><kbd>Esc</kbd></div>
      <div class="sc-item"><span>◀ 上一关</span><kbd>←</kbd></div>
      <div class="sc-item"><span>▶ 下一关</span><kbd>→</kbd></div>
      <div class="sc-item"><span>📌 通关标记</span><kbd>B</kbd></div>
      <div class="sc-item"><span>🧘 专注模式</span><kbd>F</kbd></div>
      <div class="sc-item"><span>🏠 回到首页</span><kbd>H</kbd></div>
      <div class="sc-item"><span>🎲 随机关卡</span><kbd>R</kbd></div>
      <div class="sc-item"><span>📊 冒险报告</span><kbd>S</kbd></div>
      <div class="sc-item"><span>🌓 主题切换</span><kbd>T</kbd></div>
    </div>`);
}
function toggleQuizPanel() {
  const qs = $('quizSidebar');
  if (qs) qs.style.display = qs.style.display==='none' ? 'block' : 'none';
}
