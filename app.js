// ═══════════════════════════════════════════════════════════════════
//  🏸 羽毛球系统训练 · NSCA-CPT 科学评估教学体系
// ═══════════════════════════════════════════════════════════════════

const RAW = 'https://raw.githubusercontent.com/s66899/lamb/book';
let MANIFEST = null;
let currentModule = 'dashboard';
let currentBookId = null;
let currentChapterIdx = -1;

// ─── 版本 ─────────────────────────────────
const APP_VERSION = 'v3.0.0';
const APP_DATE = '2026-07-03';

// ─── 5大训练模块 ──────────────────────────
const TRAIN_MODULES = [
  { id:'badminton-tech', icon:'🏸', title:'羽毛球技术', color:'var(--blue)',
    desc:'基于NSCA-CSCS运动科学，融合世界顶级教练实战经验的手法·步伐·球路一体化训练体系',
    tags:['握拍','高远球','杀球','网前','步伐','球路','战术'], docs:20,
    chapters:['基础握拍与准备姿势','正手高远球技术','反手技术体系','网前小球技术','步伐体系','杀球与扣杀','平抽快挡','综合训练','常见错误纠正','比赛心理'] },
  { id:'strength', icon:'💪', title:'体能训练', color:'var(--green)',
    desc:'关节稳定·代谢适应·间歇训练·周期安排 — 科学力量与体能训练体系',
    tags:['肩关节','膝关节','核心力量','代谢','间歇','周期'], docs:18,
    chapters:['训练哲学','运动解剖','基础力量','爆发力训练','敏捷性','柔韧性','核心训练','周期化训练','损伤预防','恢复策略'] },
  { id:'psychology', icon:'🧠', title:'心理训练', color:'var(--purple)',
    desc:'注意力·压力适应·自我调节·决策信心 — 从动机心理学到赛场心理韧性',
    tags:['注意力','压力','自我对话','目标','心流','韧性'], docs:15,
    chapters:['动机理论','目标设定','注意力训练','压力管理','自我效能','心流体验','情绪调节','团队动力','比赛心理','心理韧性'] },
  { id:'nutrition', icon:'🥗', title:'营养恢复', color:'var(--orange)',
    desc:'TDEE计算·营养素分配·训练后恢复时间轴·睡眠优化 — 科学营养恢复体系',
    tags:['蛋白','碳水','脂肪','水合','睡眠','补剂'], docs:12,
    chapters:['能量代谢基础','宏量营养素','微量营养素','训练前营养','训练后恢复','水合策略','补剂科学','睡眠优化','周期营养','体重管理'] },
  { id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'对手分析·战术选择·节奏控制·体能分配 — 从准备到复盘完整比赛流程',
    tags:['对手分析','战术库','节奏','体能分配','复盘'], docs:14,
    chapters:['对手分析框架','战术选择','节奏控制','体能分配','心理博弈','临场调整','复盘方法','赛前准备','赛中应变','赛后恢复'] },
];

// ─── 训练等级 ──────────────────────────
const LEVELS = [
  { id:'L0', label:'第零级 · 零基础启蒙', time:'0-1个月', emoji:'🌱',
    desc:'建立正确的神经肌肉控制模式，培养本体感觉和基础运动能力。从零到握拍和基本站位。' },
  { id:'L1', label:'第一级 · 基础建立', time:'1-3个月', emoji:'🌿',
    desc:'固化基础动作模式，建立关节稳定性和基础力量。高远球、网前小球基本动作定型。' },
  { id:'L2', label:'第二级 · 技术入门', time:'3-6个月', emoji:'🌳',
    desc:'掌握基础击球技术，建立步法连贯性和基本战术意识。反手、步伐开始成型。' },
  { id:'L3', label:'第三级 · 技术熟练', time:'6-12个月', emoji:'🔥',
    desc:'实现技术自动化，掌握技术变化和简单战术应用。杀球、网前勾对角等进阶技术。' },
  { id:'L4', label:'第四级 · 技术精进', time:'1-1.5年', emoji:'💫',
    desc:'技术精细化打磨，掌握高级技术和战术应用。平抽快挡、多拍对抗。' },
  { id:'L5', label:'第五级 · 战术应用', time:'1.5-2年', emoji:'👑',
    desc:'建立完整战术体系，提升比赛阅读能力和战术执行。球路组合、节奏变化。' },
  { id:'L6', label:'第六级 · 准专业', time:'2-2.5年', emoji:'🏆',
    desc:'全面发展各项能力，适应专业训练强度和比赛准备。心理韧性、体能分配。' },
  { id:'L7', label:'第七级 · 专业水平', time:'2.5-3年+', emoji:'🐉',
    desc:'达到专业水平，掌握比赛掌控和心理抗压能力。精英级训练体系。' },
];

// ─── 书塔书籍映射（次要入口） ──────────
const TOWER_BOOKS = ['badminton','finance','psychology','engineering-mechanics','nsca-cpt','yin-yang'];

// ═══════════════════════════════════════════════════════════════════
//  🎮 RPG 系统（保持完整）
// ═══════════════════════════════════════════════════════════════════
const RP_KEY = '***';
function getRP() { try { return JSON.parse(localStorage.getItem(RP_KEY)||'{}'); } catch { return {}; } }
function setRP(r) { localStorage.setItem(RP_KEY, JSON.stringify(r)); }
function getDefaultRP() { return { level:1, xp:0, xpToNext:100, achievements:{}, quests:{}, totalRead:0, totalQuizCorrect:0, avatar:'🧙' }; }
function initRP() { let r=getRP(); if(!r.level){r=getDefaultRP();setRP(r);} r.xpToNext=getXpForLevel(r.level); return r; }
function getXpForLevel(lvl) { return Math.floor(50*Math.pow(1.2,lvl-1)); }
function calcLevel(xpTotal) {
  let lvl=1, needed=50;
  while(xpTotal>=needed){xpTotal-=needed;lvl++;needed=Math.floor(50*Math.pow(1.2,lvl-1));}
  return {level:lvl,xp:xpTotal,xpToNext:needed};
}
function addXP(amount,source='📖') {
  let r=getRP();if(!r.level)r=getDefaultRP();
  const oldLvl=r.level;let totalXp=calcTotalXp(r.level,r.xp);totalXp+=amount;
  const ns=calcLevel(totalXp);r.level=ns.level;r.xp=ns.xp;r.xpToNext=ns.xpToNext;setRP(r);
  updateRpgHud();if(ns.level>oldLvl)showLevelUp(oldLvl,ns.level);showXpPopup(amount,source);
}
function calcTotalXp(lvl,xp){let t=xp;for(let i=1;i<lvl;i++)t+=getXpForLevel(i);return t;}
function showXpPopup(amt,src){const e=document.createElement('div');e.className='xp-popup';e.textContent=`+${amt} XP ${src}`;e.style.cssText='position:absolute;left:50%;top:30%;transform:translateX(-50%)';document.getElementById('app').appendChild(e);setTimeout(()=>e.remove(),900);}
function showLevelUp(oldLvl,newLvl){const t=['修行者','探索者','学者','智者','大师','宗师','传说'];const ot=t[Math.min(6,Math.floor(oldLvl/3))],nt=t[Math.min(6,Math.floor(newLvl/3))];const tc=ot!==nt;const o=document.createElement('div');o.className='levelup-overlay';o.innerHTML=`<div class="levelup-box"><div class="lu-icon">🎉</div><div class="lu-title">🎊 ${tc?'称号晋升！':'升级！'}</div><div style="font-size:48px;font-weight:700;color:var(--gold);margin:8px 0">Lv.${oldLvl} → Lv.${newLvl}</div>${tc?`<div style="font-size:14px;color:var(--text2);margin-bottom:8px">${ot} → <strong style="color:var(--green)">${nt}</strong></div>`:''}<div class="lu-sub">✨ ${['继续前行！','智慧增长！','每页都是成长！','坚持不懈！','学识如海！'][Math.min(4,Math.floor(newLvl/4))]}</div><div style="margin:12px 0;font-size:12px;color:var(--text3)">🎁 升级奖励：<span style="color:var(--green)">+${Math.floor(newLvl*100)} XP</span></div><button class="lu-btn" onclick="addXP(${Math.floor(newLvl*100)},'🎊 升级');this.closest('.levelup-overlay').remove()">🎯 领取奖励</button></div>`;document.body.appendChild(o);checkAchievements();}
function updateRpgHud(){const r=initRP(),h=$('rpgHud');if(!h)return;const pct=r.xpToNext>0?Math.min(100,Math.round(r.xp/r.xpToNext*100)):0;h.innerHTML=`<div class="rpg-level" onclick="openStats()"><span class="lvl">Lv.${r.level}</span><span>${r.avatar}</span></div><div class="rpg-xp-bar"><div class="rpg-xp-fill" style="width:${pct}%"></div></div><span class="rpg-xp-text">${r.xp}/${r.xpToNext}</span><div class="rpg-badge achievement" onclick="openAchievements()">🏆 ${Object.values(r.achievements||{}).filter(v=>v).length}</div><div class="rpg-badge quest" onclick="openQuests()">📋 任务</div>`;}

// ─── 进度系统 ──────────────────────────────────
const PK='bk_prog';
function getP(){try{return JSON.parse(localStorage.getItem(PK)||'{}');}catch{return {};}}
function setP(p){localStorage.setItem(PK,JSON.stringify(p));}
function markRead(bid,f){const p=getP();if(!p[bid])p[bid]=[];if(!p[bid].includes(f)){p[bid].push(f);setP(p);const r=getRP();if(!r.level){setRP(getDefaultRP());}r.totalRead=(r.totalRead||0)+1;setRP(r);addXP(10,'📖');checkAchievements();}updateProgress();}
function unmarkRead(bid,f){const p=getP();if(p[bid]){p[bid]=p[bid].filter(x=>x!==f);setP(p);}updateProgress();}
function isRead(bid,f){const p=getP();return p[bid]&&p[bid].includes(f);}
function chProgress(bid){const b=MANIFEST?.books.find(x=>x.id===bid);if(!b||!b.chapters.length)return 0;const p=getP();const d=(p[bid]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/b.chapters.length;}
function totalP(){const total=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;if(!total)return 0;let d=0;const p=getP();for(const b of MANIFEST.books)d+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/total;}
function updateProgress(){const tp=totalP();const bar=$('heroBar');if(bar)bar.style.width=(tp*100)+'%';const badge=$('progressBadge');if(badge)badge.textContent=Math.round(tp*100)+'%';updateRpgHud();}

// ─── 成就系统 ──────────────────────────────────
const ACHIEVEMENTS={
  first_read:{icon:'📖',name:'初次阅读',desc:'读完第一章',check:(r)=>r.totalRead>=1},
  reader_10:{icon:'📚',name:'阅读达人',desc:'读完10章',check:(r)=>r.totalRead>=10},
  reader_50:{icon:'📚',name:'知识探险家',desc:'读完50章',check:(r)=>r.totalRead>=50},
  level_5:{icon:'⭐',name:'初出茅庐',desc:'达到5级',check:(r)=>r.level>=5},
  level_10:{icon:'🌟',name:'知识学徒',desc:'达到10级',check:(r)=>r.level>=10},
  level_20:{icon:'💫',name:'知识大师',desc:'达到20级',check:(r)=>r.level>=20},
  quiz_master:{icon:'🧪',name:'测验大师',desc:'答对50道',check:(r)=>r.totalQuizCorrect>=50},
  quiz_guru:{icon:'🎯',name:'测验宗师',desc:'答对200道',check:(r)=>r.totalQuizCorrect>=200},
  full_book:{icon:'🎉',name:'完成一本书',desc:'读完一本书全部章节',check:(r)=>checkAnyBookComplete()},
  all_books:{icon:'👑',name:'六艺精通',desc:'六本书全部完成',check:(r)=>checkAllBooksComplete()},
};
function getTotalChapters(){return MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;}
function checkAnyBookComplete(){if(!MANIFEST)return false;const p=getP();for(const b of MANIFEST.books){const d=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;if(d>=b.chapters.length)return true;}return false;}
function checkAllBooksComplete(){if(!MANIFEST)return false;const p=getP();for(const b of MANIFEST.books){const d=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;if(d<b.chapters.length)return false;}return true;}
function checkAchievements(){const r=getRP();if(!r.achievements)r.achievements={};let u=false;for(const[k,ach]of Object.entries(ACHIEVEMENTS)){if(!r.achievements[k]&&ach.check(r)){r.achievements[k]=true;u=true;showAchievementPopup(ach);}}if(u)setRP(r);updateRpgHud();}
function showAchievementPopup(ach){const e=document.createElement('div');e.className='ach-popup';e.innerHTML=`<div class="ach-icon">${ach.icon}</div><div class="ach-name">🏆 ${ach.name}</div><div class="ach-desc">${ach.desc}</div>`;document.body.appendChild(e);setTimeout(()=>{e.style.transition='opacity .4s';e.style.opacity='0';setTimeout(()=>e.remove(),500);},3500);}
function openAchievements(){const r=getRP();if(!r.achievements)r.achievements={};let h='<div class="ach-grid">';for(const[k,ach]of Object.entries(ACHIEVEMENTS)){const u=!!r.achievements[k];h+=`<div class="ach-item ${u?'unlocked':'locked'}"><div class="ai-icon">${ach.icon}</div><div class="ai-name">${ach.name}</div><div class="ai-desc">${u?'✅ '+ach.desc:'🔒 '+ach.desc}</div></div>`;}h+='</div>';showOverlay('panel-achievement','🏆 成就',h);}

// ─── 每日任务 ──────────────────────────────
const $=id=>document.getElementById(id);
const $$=s=>document.querySelectorAll(s);
function getDailyQuests(){return[{id:'daily_read',icon:'📖',name:'每日阅读',desc:'读一章',check:(r)=>true,reward:'+20 XP'},{id:'daily_quiz',icon:'🧪',name:'测验',desc:'答对3题',check:(r)=>(r.totalQuizCorrect||0)>=3}];}
function openQuests(){const r=getRP();if(!r.quests)r.quests={};const qs=getDailyQuests();let h='<div class="quest-list">';for(const q of qs){const done=r.quests[q.id];h+=`<div class="quest-item ${done?'completed':''}"><div class="qi-icon">${q.icon}</div><div class="qi-info"><div class="qi-name">${q.name}</div><div class="qi-desc">${q.desc}</div><div class="qi-reward">🎁 ${q.reward}</div></div>${done?'✅':''}</div>`;}h+='</div>';showOverlay('panel-quest','📋 每日任务',h);}

// ─── Stats ──────────────────────────────
function openStats(){const tp=totalP();const totalCh=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;const p=getP();let totalRead=0;for(const b of MANIFEST.books)totalRead+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;const r=initRP();const achCount=Object.values(r.achievements||{}).filter(v=>v).length;const content=`<div class="stats-grid"><div class="stat-card"><div class="sc-num">${totalRead}</div><div class="sc-label">✅ 已通关</div></div><div class="stat-card"><div class="sc-num">${totalCh-totalRead}</div><div class="sc-label">📖 未读</div></div><div class="stat-card"><div class="sc-num">${MANIFEST.books.length}</div><div class="sc-label">📚 书塔</div></div><div class="stat-card"><div class="sc-num">${Math.round(tp*100)}%</div><div class="sc-label">📊 总进度</div></div></div><div style="text-align:center;margin:14px 0"><span style="font-size:36px">${r.avatar}</span><div style="font-size:14px;font-weight:600;margin:4px 0">Lv.${r.level} · 🧪 ${r.xp}/${r.xpToNext} XP</div><div style="font-size:11px;color:var(--text2)">🏆 ${achCount} 成就 · 🧪 ${r.totalQuizCorrect||0} 测验</div></div>`;showOverlay('panel-stats','📊 训练报告',content);}

// ═══════════════════════════════════════════════════════════════════
//  🏠 Dashboard 首页渲染（对标参考站风格）
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
  currentModule = 'dashboard';
  showView('dashboard');
  const r = initRP();

  // ── Stats ──
  $('sModules').textContent = TRAIN_MODULES.length;
  $('sDocs').textContent = TRAIN_MODULES.reduce((s,m)=>s+m.docs,0);
  $('sCycle').textContent = '3yr';
  $('heroSub').textContent = `${TRAIN_MODULES.length}大训练模块 · 融合心理学·营养学·比赛策略 · 基于NSCA-CSCS科学体系`;

  // ── ⚡ 核心原则 ──
  $('principlesSection').innerHTML = `
    <div class="section-divider"><span class="sd-label">⚡ 核心训练原则</span><div class="sd-line"></div></div>
    <div class="principles-table">
      <div class="principle-row header">
        <span class="pr-col1">原则</span>
        <span class="pr-col2">为什么</span>
        <span class="pr-col3">什么不能做</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>动作质量 > 训练数量</strong></span>
        <span class="pr-col2">神经肌肉系统记住的是你重复最多的模式，练错的动作重复100次=巩固100次错误</span>
        <span class="pr-col3">不能用"做了多少次"衡量训练效果</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>神经肌肉控制 > 力量输出</strong></span>
        <span class="pr-col2">神经系统先学会控制肌肉，肌肉才能发力。顺序不能反</span>
        <span class="pr-col3">不能在动作模式不稳定时加重量</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>预防损伤 > 追求表现</strong></span>
        <span class="pr-col2">一次受伤=倒退回起点，恢复时间往往是训练时间的3-10倍</span>
        <span class="pr-col3">不能在疲劳状态下冲击极限</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>长期发展 > 短期进步</strong></span>
        <span class="pr-col2">神经系统适应需要4-6周，结缔组织初步适应约8-12周</span>
        <span class="pr-col3">不能每周都加量</span>
      </div>
    </div>
    <div class="principle-footer">这四个原则不是建议，是底线。任何训练安排必须同时满足四条才能执行。</div>`;

  // ── 🏆 训练等级体系 ──
  $('levelSection').innerHTML = LEVELS.map(l => `
    <div class="level-card" onclick="openLevelDetail('${l.id}')">
      <div class="lc-badge">${l.id}</div>
      <div class="lc-emoji">${l.emoji}</div>
      <div class="lc-label">${l.label}</div>
      <div class="lc-time">${l.time}</div>
      <div class="lc-desc">${l.desc}</div>
    </div>`).join('');

  // ── 🎯 训练模块 ──
  $('moduleSection').innerHTML = TRAIN_MODULES.map(m => {
    const colors = {'var(--blue)':'#4f9aff','var(--green)':'#3dd68c','var(--purple)':'#a855f7','var(--orange)':'#f59e0b','var(--red)':'#f06060'};
    const c = colors[m.color]||'#4f9aff';
    return `<div class="module-card" onclick="openTrainModule('${m.id}')" style="border-top:3px solid ${c}">
      <div class="mc-icon">${m.icon}</div>
      <div class="mc-title">${m.title}</div>
      <div class="mc-desc">${m.desc}</div>
      <div class="mc-tags">${m.tags.map(t=>`<span class="mc-tag" style="border-color:${c}20;color:${c}">${t}</span>`).join('')}</div>
      <div class="mc-foot"><span>📖 ${m.docs} 教学文档</span><span class="mc-arrow">查看详情 →</span></div>
    </div>`;
  }).join('');

  // ── 🛠️ 评估工具 ──
  const TOOLS = [
    {icon:'🩺',title:'功能筛查',desc:'6个测试·10分钟·每月重测',action:'openScreening()',color:'var(--blue)'},
    {icon:'📊',title:'级别定位',desc:'回答问题找到起始级别',action:'openLevelFinder()',color:'var(--purple)'},
    {icon:'✅',title:'状态自查',desc:'绿/黄/红码训练决策',action:'openWeeklyCheck()',color:'var(--green)'},
    {icon:'🔍',title:'训练诊断',desc:'60+症状→原因→方案',action:'openDiagnosis()',color:'var(--orange)'},
    {icon:'🧮',title:'计算工具',desc:'TDEE·水合·训练量计算',action:'openCalculators()',color:'var(--red)'},
  ];
  $('toolsSection').innerHTML = TOOLS.map(t => `
    <div class="tool-card" onclick="${t.action}">
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-title">${t.title}</div>
      <div class="tc-desc">${t.desc}</div>
    </div>`).join('');

  // ── 🧮 快速参考公式 ──
  $('referenceSection').innerHTML = `
    <div class="ref-card">
      <div class="ref-title">🔥 TDEE 每日总能耗</div>
      <div class="ref-formula">BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5 <span style="color:var(--text3);font-size:10px">(男)</span></div>
      <div class="ref-formula">BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161 <span style="color:var(--text3);font-size:10px">(女)</span></div>
      <div class="ref-detail">久坐×1.2 · 轻度×1.375 · 中度×1.55 · 高度×1.725</div>
    </div>
    <div class="ref-card">
      <div class="ref-title">🥩 三大营养素</div>
      <div class="ref-formula"><span style="color:var(--red)">蛋白</span> 维持1.2-1.6 / 增肌1.6-2.0 / 减脂2.0-2.4 g/kg</div>
      <div class="ref-formula"><span style="color:var(--orange)">脂肪</span> 0.8-1.0 g/kg (20-25%)</div>
      <div class="ref-formula"><span style="color:var(--blue)">碳水</span> 休息2-3 / 训练3-5 / 高强度5-7 g/kg</div>
    </div>
    <div class="ref-card">
      <div class="ref-title">💧 水合公式</div>
      <div class="ref-formula">日常 = 体重(kg) × 33ml</div>
      <div class="ref-formula">训练 = 时长(min) × 12ml</div>
      <div class="ref-formula">高温(>30°C) +20%</div>
    </div>
    <div class="ref-card" style="grid-column:1/-1;text-align:center;padding:10px 0;cursor:pointer" onclick="openCalculators()">
      <span style="font-size:12px;color:var(--blue)">📐 打开完整计算工具 →</span>
    </div>`;

  // ── 📚 书塔入口 ──
  renderTowerEntry();
  renderSidebar();
  updateProgress();
}

// ─── 📚 书塔入口（首页底部） ──────────────
function renderTowerEntry() {
  const totalCh = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0) : 0;
  const totalWords = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+(b.totalWords||0),0) : 0;
  const tp = totalP();
  const p = getP(); let done=0; for(const b of MANIFEST.books) done+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;

  $('towerSection').innerHTML = `
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
      ${MANIFEST ? MANIFEST.books.map(b => {
        const bp = chProgress(b.id);
        return `<div class="tower-book-card" onclick="goToBook('${b.id}')">
          <div style="font-size:28px;margin-bottom:4px">${b.emoji}</div>
          <div style="font-size:11px;font-weight:500">${b.title}</div>
          <div style="font-size:9px;color:var(--text3)">${b.chapters.length}关 · ${Math.round(bp*100)}%</div>
          <div style="height:3px;background:var(--bg4);border-radius:2px;margin-top:4px;overflow:hidden">
            <div style="height:100%;width:${Math.round(bp*100)}%;background:${b.color};border-radius:2px"></div>
          </div>
        </div>`;
      }).join('') : ''}
    </div>
    <div style="text-align:center;margin-top:4px;font-size:10px;color:var(--text3)">
      共${totalCh}关 · ${(totalWords/10000).toFixed(1)}万字 · 已完成${done}关 · 总进度${Math.round(tp*100)}%
    </div>`;
}

// ─── 侧边栏 ──────────────────────────────
function renderSidebar() {
  const list = $('bookList');
  let html = '<div class="side-section side-section-links">';
  html += `<div class="side-link ${currentModule==='dashboard'?'active':''}" onclick="goHome()"><span class="sl-icon">🏠</span> 训练总览</div>`;
  html += '</div><div class="side-section"><div class="side-title">📚 我的书塔</div>';
  if (MANIFEST) {
    html += MANIFEST.books.filter(b=>TOWER_BOOKS.includes(b.id)).map(b => {
      const p = chProgress(b.id);
      return `<div class="b-item ${currentBookId===b.id?'active':''}" data-bid="${b.id}" onclick="goToBook('${b.id}')">
        <span class="be">${b.emoji}</span><span class="bt">${b.title}</span>
        <span class="bc">${b.chapters.length}</span><span class="bp" style="width:${Math.round(p*100)}%"></span>
      </div>`;
    }).join('');
  }
  html += '</div>';
  list.innerHTML = html;
}

// ─── 训练模块详情 ────────────────────────
function openTrainModule(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  currentModule = modId;
  showView('book');
  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回总览</div>
    <h1>${mod.icon} ${mod.title}</h1>
    <div class="vm">${mod.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${mod.chapters.length}</span><span class="bs-label">📖 训练主题</span></div>
    <div class="bs-item"><span class="bs-num">${mod.tags.length}</span><span class="bs-label">🏷️ 核心标签</span></div>
    <div class="bs-item"><span class="bs-num">${mod.docs}</span><span class="bs-label">📚 教学文档</span></div>`;
  $('contentGrid').innerHTML = mod.chapters.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openModuleTopic('${mod.id}',${i})">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${mod.color};opacity:.6"></div>
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${title}</div>
      <div class="cc-foot"><span>${mod.icon}</span><span style="color:${mod.color}">学习 →</span></div>
    </div>`).join('');
  updateProgress();
}

// ─── 模块主题（跳转到对应书籍章节） ──────
function openModuleTopic(modId, topicIdx) {
  // Try to find a matching chapter from one of the module's books
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod || !MANIFEST) return;
  // Find first book from this module and open a chapter
  for (const bid of mod.books) {
    const book = MANIFEST.books.find(b=>b.id===bid);
    if (book && book.chapters.length > 0) {
      const chIdx = Math.min(topicIdx % book.chapters.length, book.chapters.length - 1);
      goToBook(bid);
      setTimeout(() => openChapter(chIdx), 300);
      return;
    }
  }
}

// ─── 级别详情 ────────────────────────────
function openLevelDetail(levelId) {
  const lvl = LEVELS.find(l=>l.id===levelId);
  if (!lvl) return;
  showOverlay('panel-sm', `${lvl.emoji} ${lvl.label}`, `
    <div style="text-align:center;padding:8px">
      <div style="font-size:48px;margin-bottom:8px">${lvl.emoji}</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${lvl.label}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">⏱ ${lvl.time}</div>
      <div style="font-size:13px;line-height:1.6;color:var(--text2)">${lvl.desc}</div>
      <div style="margin-top:14px;font-size:10px;color:var(--blue)">🔍 使用级别定位器找到你的当前级别</div>
    </div>`);
}

// ─── 工具页面 ────────────────────────────
function openScreening() {
  showView('book');
  currentModule = 'screening';
  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回总览</div>
    <h1>🩺 羽毛球专项功能筛查</h1>
    <div class="vm">BSFS v1.0 · 6个测试 · 10分钟完成 · 每月重测</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1;background:var(--bg3);border-radius:var(--radius);padding:16px 18px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">🎯 为什么做功能筛查？</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">识别身体薄弱环节，预防运动损伤，制定个性化训练计划。这个筛查专门为羽毛球运动设计，比通用筛查更有效。</div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">1️⃣ 动态平衡测试</span>
        <span style="font-size:9px;color:var(--text3)">Y-Balance</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        单腿站立，双手叉腰，另一腿分别向前/后内/后外三个方向伸展，记录最大距离(cm)，计算：(前方+后内+后外)÷(3×腿长)×100
      </div>
      <div class="score-standard"><span>>90%</span><span>80-90%</span><span>70-80%</span><span>≤70%</span></div>
      <div class="score-desc"><span>3分·步法稳定</span><span>2分·基本稳定</span><span>1分·需加强</span><span>0分·不稳定</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">2️⃣ 单腿跳跃测试</span>
        <span style="font-size:9px;color:var(--text3)">Single-Leg Hop</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        单腿站立向前跳跃，测量跳距(cm)÷腿长，每侧3次取最佳
      </div>
      <div class="score-standard"><span>>1.5</span><span>1.3-1.5</span><span>1.1-1.3</span><span><1.1</span></div>
      <div class="score-desc"><span>3分·起跳有力</span><span>2分·正常</span><span>1分·需加强</span><span>0分·弱</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">3️⃣ 侧向移动测试</span>
        <span style="font-size:9px;color:var(--text3)">Lateral Shuffle</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        双脚并拢站在线旁，侧向跳跃过线再跳回，30秒总次数×2（换算每分钟）
      </div>
      <div class="score-standard"><span>>80次/分钟</span><span>60-80</span><span>40-60</span><span><40</span></div>
      <div class="score-desc"><span>3分·移动快</span><span>2分·正常</span><span>1分·需加强</span><span>0分·慢</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">4️⃣ 肩关节稳定性</span>
        <span style="font-size:9px;color:var(--text3)">Shoulder Stability</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        双手举过头顶保持平衡，另一人轻推手臂，观察稳定性
      </div>
      <div class="score-standard"><span>完全稳定</span><span>轻微晃动</span><span>明显不稳</span></div>
      <div class="score-desc"><span>3分·击球稳定</span><span>2分·基本稳定</span><span>1分·需肩袖强化</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">5️⃣ 核心耐力测试</span>
        <span style="font-size:9px;color:var(--text3)">Side Bridge</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        侧桥姿势保持，身体成直线，双侧都测取较差值
      </div>
      <div class="score-standard"><span>>60秒</span><span>45-60秒</span><span>30-45秒</span><span><30秒</span></div>
      <div class="score-desc"><span>3分·核心稳定</span><span>2分·正常</span><span>1分·需加强</span><span>0分·差</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">6️⃣ 髋关节灵活性</span>
        <span style="font-size:9px;color:var(--text3)">Hip Flexion Test</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        仰卧桌边，一腿抱向胸口，另一腿自然下垂，观察大腿能否接触桌面
      </div>
      <div class="score-standard"><span>正常</span><span>轻度紧张</span><span>明显紧张</span></div>
      <div class="score-desc"><span>3分·步幅大</span><span>2分·正常</span><span>1分·需拉伸</span></div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:10px;color:var(--text3)">
      🛡️ 预防性训练：平衡差→单腿站立 · 肩不稳→弹力带外旋 · 核心差→侧桥 · 髋紧→拉伸
    </div>`;
}

function openCalculators() {
  showView('book');
  currentModule = 'calculators';
  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回总览</div>
    <h1>🧮 训练计算工具</h1>
    <div class="vm">TDEE · 水合 · 训练量 · 营养素一键计算</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">🔥 TDEE 每日总能耗</div>
      <div class="calc-formula">男性 BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5</div>
      <div class="calc-formula">女性 BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161</div>
      <div class="calc-factor">
        <span>久坐×1.2</span><span>轻度×1.375</span><span>中度×1.55</span><span>高度×1.725</span>
      </div>
    </div>
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">🥩 三大营养素分配</div>
      <div class="calc-formula"><span style="color:var(--red)">● 蛋白质</span> 维持1.2-1.6 · 增肌1.6-2.0 · 减脂2.0-2.4 g/kg</div>
      <div class="calc-formula"><span style="color:var(--orange)">● 脂肪</span> 0.8-1.0 g/kg (占总热量20-25%)</div>
      <div class="calc-formula"><span style="color:var(--blue)">● 碳水</span> 休息日2-3 · 训练日3-5 · 高强度5-7 g/kg</div>
    </div>
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">💧 水合需求</div>
      <div class="calc-formula">日常需要 = 体重(kg) × 33ml</div>
      <div class="calc-formula">训练增加 = 训练时长(min) × 12ml</div>
      <div class="calc-formula">高温增加(>30°C) = 日常×20%</div>
    </div>
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">⏰ 训练后24小时恢复指南</div>
      <div class="recovery-timeline">
        <div class="rt-item"><span class="rt-time">0-30分钟</span><span>快速碳水1-1.2g/kg + 快速蛋白0.3-0.4g/kg + 整理拉伸</span></div>
        <div class="rt-item"><span class="rt-time">30分-2h</span><span>正餐(碳水+蛋白+蔬菜) + 分次补水</span></div>
        <div class="rt-item"><span class="rt-time">2h-睡前</span><span>泡沫轴全身10-15分钟 + 热水澡</span></div>
        <div class="rt-item"><span class="rt-time" style="color:var(--gold)">睡眠7-9h</span><span style="color:var(--gold)">⭐ 生长激素分泌 + 组织修复 — 最重要不可替代</span></div>
        <div class="rt-item"><span class="rt-time">次日晨</span><span>评估恢复状态 → 决定训练强度</span></div>
      </div>
    </div>
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px;grid-column:1/-1">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">🔄 不同训练类型恢复时间</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">训练类型</th><th style="padding:4px 8px;border-bottom:1px solid var(--border)">恢复时间</th><th style="padding:4px 8px;border-bottom:1px solid var(--border)">建议频率</th></tr>
        <tr><td style="padding:4px 8px">纯技术训练</td><td style="padding:4px 8px">4-8小时</td><td style="padding:4px 8px">每天都可以练</td></tr>
        <tr><td style="padding:4px 8px">步伐训练</td><td style="padding:4px 8px">24-36小时</td><td style="padding:4px 8px">隔天练</td></tr>
        <tr><td style="padding:4px 8px">力量训练</td><td style="padding:4px 8px">48-72小时</td><td style="padding:4px 8px">每周2-3次</td></tr>
        <tr><td style="padding:4px 8px">高强度间歇</td><td style="padding:4px 8px">48-72小时</td><td style="padding:4px 8px">每周2次</td></tr>
        <tr><td style="padding:4px 8px">对抗/比赛</td><td style="padding:4px 8px">48-72小时</td><td style="padding:4px 8px">每周1-2次</td></tr>
      </table>
    </div>`;
}

function openDiagnosis() {
  showOverlay('panel-sm', '🔍 训练问题诊断', `
    <div class="diag-list">
      <div class="diag-item"><strong style="color:var(--text)">动作标准但没进步</strong><br><span style="color:var(--text2);font-size:11px">→ 检查训练量/恢复/变式</span></div>
      <div class="diag-item"><strong style="color:var(--text)">动作越练越差</strong><br><span style="color:var(--text2);font-size:11px">→ 疲劳累积/加量太快</span></div>
      <div class="diag-item"><strong style="color:var(--text)">训练中某个部位痛</strong><br><span style="color:var(--text2);font-size:11px">→ 刺痛=停 · 酸胀=正常</span></div>
      <div class="diag-item"><strong style="color:var(--text)">能完成但"使不上劲"</strong><br><span style="color:var(--text2);font-size:11px">→ 检查动力链顺序</span></div>
      <div class="diag-item"><strong style="color:var(--text)">体能跟不上技术训练</strong><br><span style="color:var(--text2);font-size:11px">→ 加强基础体能/代谢适应</span></div>
      <div class="diag-item"><strong style="color:var(--text)">比赛时技术变形</strong><br><span style="color:var(--text2);font-size:11px">→ 压力适应训练/模拟比赛</span></div>
    </div>`);
}

function openWeeklyCheck() {
  showOverlay('panel-sm', '✅ 每周状态自检', `
    <div style="margin-bottom:12px;font-size:11px;color:var(--text2);text-align:center">训练前必做，根据状态调整当日训练强度</div>
    <div class="w-check">
      <div class="wc-item wc-green">
        <div class="wc-icon">🟢</div>
        <div><strong>绿码：可正常训练</strong><br><span style="font-size:10px;color:var(--text2)">24-48h恢复 · 精力≥7/10</span></div>
      </div>
      <div class="wc-item wc-yellow">
        <div class="wc-icon">🟡</div>
        <div><strong>黄码：减量50%</strong><br><span style="font-size:10px;color:var(--text2)">48h仍酸痛 · 精力4-6/10</span></div>
      </div>
      <div class="wc-item wc-red">
        <div class="wc-icon">🔴</div>
        <div><strong>红码：休息</strong><br><span style="font-size:10px;color:var(--text2)">精力<4/10 · 有刺痛 · 睡眠<5h</span></div>
      </div>
    </div>`);
}

function openLevelFinder() {
  showOverlay('panel-sm', '📊 级别定位器', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px;text-align:center">回答以下问题，找到你的起始训练级别</div>
    <div style="font-size:11px;line-height:2;color:var(--text2)">
      <p>1. 你能连续正手高远球对打几个来回？</p>
      <p style="padding-left:12px">→ 0-3个 = L0 · 3-10个 = L1 · 10+个 = L2+</p>
      <p style="margin-top:6px">2. 你能反手发球/接球吗？</p>
      <p style="padding-left:12px">→ 不会 = L0-1 · 基本会 = L2 · 熟练 = L3+</p>
      <p style="margin-top:6px">3. 你一次能跑多远（步法）？</p>
      <p style="padding-left:12px">→ 半场吃力 = L0-1 · 全场可以 = L2-3 · 覆盖自如 = L4+</p>
      <p style="margin-top:6px">4. 你有战术意识吗？</p>
      <p style="padding-left:12px">→ 没有 = L0-2 · 基本有 = L3-4 · 完整体系 = L5+</p>
    </div>
    <div style="margin-top:12px;text-align:center;font-size:10px;color:var(--text3)">详细评估请参考训练等级体系</div>`);
}

// ═══════════════════════════════════════════════════════════════════
//  📚 书塔阅读（次要功能）
// ═══════════════════════════════════════════════════════════════════

function goToBook(bid) {
  currentBookId = bid;
  currentModule = 'tower';
  showView('book');
  const book = MANIFEST.books.find(b=>b.id===bid);
  if (!book) return;
  const p = chProgress(bid);
  const readCount = Math.round(p * book.chapters.length);

  $('bookHeader').innerHTML = `<div class="back" onclick="goHome()">← 返回总览</div>
    <h1>${book.emoji} ${book.title}</h1>
    <div class="vm">${book.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${book.chapters.length}</span><span class="bs-label">📖 章节</span></div>
    <div class="bs-item"><span class="bs-num">${(book.totalWords/10000).toFixed(1)}</span><span class="bs-label">📝 万字</span></div>
    <div class="bs-item"><span class="bs-num">${readCount}</span><span class="bs-label">✅ 已读/${book.chapters.length}</span></div>
    <div class="bs-item"><span class="bs-num">${Math.round(p*100)}%</span><span class="bs-label">📊 进度</span></div>`;

  $('contentGrid').innerHTML = book.chapters.map((c,i) => {
    const read = isRead(bid,c.file);
    const h2s = (c.h2s||[]).map(h=>h.title).join(' · ');
    return `<div class="chapter-card fade-in ${read?'completed':''}" onclick="openChapter(${i})">
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-h2">${h2s||'—'}</div>
      <div class="cc-foot"><span>${(c.words/100).toFixed(0)}百字 · ${c.h2s?.length||0}节</span>${read?'✅':''}</div>
    </div>`;
  }).join('');
  updateProgress();
  renderSidebar();
}

// ─── Reader ────────────────────────────────────
function openChapter(idx) {
  currentChapterIdx = idx;
  showView('reader');
  renderChapter();
}

async function renderChapter() {
  const book = MANIFEST?.books.find(b=>b.id===currentBookId);
  if (!book || !book.chapters[currentChapterIdx]) return;
  const ch = book.chapters[currentChapterIdx];

  $('readerTitle').textContent = `📖 ${String(currentChapterIdx+1).padStart(2,'0')}/${book.chapters.length} · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx+1}/${book.chapters.length}`;
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="prevChapter()" ${currentChapterIdx<=0?'disabled':''}>◀ 上一节</button>
    <button class="tb-btn" onclick="openFullQuiz()">🧪 测验</button>
    <button class="tb-btn" onclick="nextChapter()" ${currentChapterIdx>=book.chapters.length-1?'disabled':''}>下一节 ▶</button>`;
  buildToc(ch);

  $('article').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载…</div>';
  let md = null;
  const localUrl = `books/${currentBookId}/${ch.file}`;
  try { const r1=await fetch(localUrl); if(r1.ok) md=await r1.text(); } catch(e) {}
  if (!md) {
    try { const r2=await fetch(`${RAW}/books/${currentBookId}/${ch.file}`); if(r2.ok) md=await r2.text(); } catch(e2) {}
  }
  if (md) {
    $('article').innerHTML = mdParse(md) + `<hr style="margin-top:60px;opacity:0.3"><div style="text-align:center;font-size:11px;color:var(--text3);padding:20px 0 10px;border-top:1px solid var(--border);margin-top:30px">📚 知识书塔 · ${APP_VERSION} &nbsp;|&nbsp; ${APP_DATE} &nbsp;|&nbsp; 🐏 by Lamb</div>`;
    makeCollapsible(); setupQuiz(ch); markStreak();
  } else {
    $('article').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">❌ 加载失败</div>`;
  }
  $('content').scrollTo({top:0,behavior:'smooth'});
  updateProgress();
}

function buildToc(ch) {
  const list = $('tocList');
  const h2s = ch.h2s || [];
  list.innerHTML = h2s.length ? h2s.map((h,i)=>`<div class="toc-item toc-h2" onclick="scrollToToc(${i})">${h.title}</div>`).join('') : '<div style="font-size:10px;color:var(--text3)">无子章节</div>';
}
function scrollToToc(idx) { const h=$$('article h2'); if(h[idx]) h[idx].scrollIntoView({behavior:'smooth',block:'start'}); }
function toggleTocFn() { $('readerToc').style.display=$('readerToc').style.display==='none'?'block':'none'; }
function toggleFocus() { document.body.classList.toggle('focus-mode',!focusMode); focusMode=!focusMode; }
function increaseFont() { if(fontBase<22){fontBase++;applyFont();} }
function decreaseFont() { if(fontBase>12){fontBase--;applyFont();} }
function applyFont() { document.documentElement.style.setProperty('--font-base',fontBase+'px'); localStorage.setItem('bk_font',fontBase); }
function toggleTheme() { const cur=document.documentElement.getAttribute('data-theme'); document.documentElement.setAttribute('data-theme',cur==='light'?'':'light'); localStorage.setItem('bk_theme',cur==='light'?'':'light'); }
function toggleReadMark() { const ch=getCurChapter(); if(!ch)return; if(isRead(currentBookId,ch.file)) unmarkRead(currentBookId,ch.file); else markRead(currentBookId,ch.file); $('readMarkBtn').textContent=isRead(currentBookId,ch.file)?'✅':'📌'; }
function getCurChapter() { if(!currentBookId||currentChapterIdx<0) return null; const b=MANIFEST?.books.find(x=>x.id===currentBookId); return b?.chapters[currentChapterIdx]||null; }
function prevChapter() { if(currentChapterIdx>0) openChapter(currentChapterIdx-1); }
function nextChapter() { const b=MANIFEST?.books.find(x=>x.id===currentBookId); if(b&currentChapterIdx<b.chapters.length-1) openChapter(currentChapterIdx+1); }
function makeCollapsible() { $$('article h2, article h3').forEach(el=>{el.addEventListener('click',()=>el.classList.toggle('collapsed'));}); }
function markStreak() { const p=getP(); if(!p._streak) p._streak={}; const t=new Date().toISOString().slice(0,10); if(!p._streak[t]){p._streak[t]=true;setP(p);} }

// ─── Quiz ──────────────────────────────────────
let quizItems=[], fontBase=15, focusMode=false, tocBtnState=true, studyQuestions=[], studyIdx=0;
function setupQuiz(ch) { quizItems=[]; const h2s=ch.h2s||[]; if(!h2s.length){$('quizContent').innerHTML='<div style="font-size:10px;color:var(--text3);text-align:center;padding:12px">🤷 无测试点</div>';return;} const n=Math.min(3,h2s.length); const picked=[...h2s].sort(()=>Math.random()-.5).slice(0,n); quizItems=picked.map(h=>({q:`「${h.title}」主要讲什么？`,a:h.title,options:shuffle([h.title,...getRandomH2s(ch,h,3)])})); renderQuizSidebar(); }
function getRandomH2s(ch,exclude,count){const others=(ch.h2s||[]).filter(h=>h.title!==exclude.title);return[...others].sort(()=>Math.random()-.5).slice(0,count).map(h=>h.title);}
function shuffle(arr){return[...arr].sort(()=>Math.random()-.5);}
function renderQuizSidebar(){$('quizContent').innerHTML=quizItems.map((item,qi)=>`<div class="quiz-card" id="qc-${qi}"><div class="qc-q">${item.q}</div>${item.options.map((o,oi)=>`<button class="qc-btn" onclick="checkQuiz(${qi},${oi})" id="qcb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>`).join('')}<div class="qc-result" id="qcr-${qi}"></div></div>`).join('');$('quizSidebar').style.display='block';}
function checkQuiz(qi,oi){const item=quizItems[qi];const correctIdx=item.options.indexOf(item.a);const correct=oi===correctIdx;for(let i=0;i<item.options.length;i++){const btn=$(`qcb-${qi}-${i}`);if(btn){btn.disabled=true;btn.classList.add(i===correctIdx?'correct':i===oi&&!correct?'wrong':'');}}const r=$(`qcr-${qi}`);if(r)r.textContent=correct?'✅ 正确！':`❌ 答案是 ${item.a}`;if(correct){const rp=getRP();rp.totalQuizCorrect=(rp.totalQuizCorrect||0)+1;setRP(rp);addXP(5,'🧪');checkAchievements();}}
function openFullQuiz(){const b=MANIFEST?.books.find(x=>x.id===currentBookId);const ch=b?.chapters[currentChapterIdx];if(!ch)return;const h2s=ch.h2s||[];if(!h2s.length){alert('本章暂无测试点');return;}}
function toggleQuizPanel(){const qs=$('quizSidebar');if(qs)qs.style.display=qs.style.display==='none'?'block':'none';}

// ─── Markdown Parser ─────────────────────────────────
const mdParse = (txt) => {
  if(!txt) return '';
  let s=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline=[[/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>'],[/\*\*(.+?)\*\*/g,'<strong>$1</strong>'],[/\*(.+?)\*/g,'<em>$1</em>'],[/__(.+?)__/g,'<strong>$1</strong>'],[/_(.+?)_/g,'<em>$1</em>'],[/~~(.+?)~~/g,'<del>$1</del>'],[/`([^`]+)`/g,'<code>$1</code>']];
  inline.forEach(([re,repl])=>s=s.replace(re,repl));
  s=s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>'<img src="'+src.replace(/&amp;/g,'&')+'" alt="'+alt+'" class="md-img" loading="lazy">');
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>'<a href="'+u.replace(/&amp;/g,'&')+'" target="_blank">'+t+'</a>');
  let lines=s.split('\n'),result=[],inTable=false,inCode=false;
  for(let i=0;i<lines.length;i++){let l=lines[i];if(l.startsWith('```')){if(inCode){result.push('</code></pre>');inCode=false;}else{result.push('<pre><code>');inCode=true;}continue;}if(inCode){result.push(l+'\n');continue;}if(/^[-*_]{3,}\s*$/.test(l)){result.push('<hr>');continue;}const hm=l.match(/^(#{1,4})\s+(.+)/);if(hm){result.push('<h'+hm[1].length+'>'+hm[2]+'</h'+hm[1].length+'>');continue;}if(l.startsWith('> ')){result.push('<blockquote><p>'+l.slice(2)+'</p></blockquote>');continue;}if(/^[-*+]\s+/.test(l)){result.push('<li>'+l.replace(/^[-*+]\s+/,'')+'</li>');continue;}if(/^\d+\.\s+/.test(l)){result.push('<li>'+l.replace(/^\d+\.\s+/,'')+'</li>');continue;}if(/^\|/.test(l)){if(!inTable){inTable=true;result.push('<table>');}if(/^\|[\s:-]+\|[\s:-]+/.test(l))continue;const cells=l.split('|').filter((c,j,a)=>j>0||j<a.length-1).map(c=>c.trim());const tag=i===0||!lines[i-1].includes('---')?'th':'td';result.push('<tr>'+cells.map(c=>'<'+tag+'>'+c+'</'+tag+'>').join('')+'</tr>');continue;}else if(inTable&&l.trim()===''){result.push('</table>');inTable=false;}if(l.trim()===''){result.push('');continue;}result.push('<p>'+l+'</p>');}
  if(inTable)result.push('</table>');if(inCode)result.push('</code></pre>');
  let out=result.join('\n');out=out.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>');out=out.replace(/<p><img[^>]+><\/p>/g,(m)=>'<div class="img-container">'+m.replace(/^<p>/,'').replace(/<\/p>$/,'')+'</div>');
  return out;
};

// ─── View Switch ──────────────────────────────
function showView(v) {
  ['dashboard','book','reader'].forEach(k=>{const id='view'+k.charAt(0).toUpperCase()+k.slice(1);if($(id))$(id).style.display=k===v?'block':'none';});
  $('content').scrollTo({top:0,behavior:'smooth'});
}

function goHome() {
  currentBookId=null;currentChapterIdx=-1;currentModule='dashboard';
  $('chSection').style.display='none';
  showView('dashboard');
  renderDashboard();
}

function openSearch() {
  const overlay = document.createElement('div');
  overlay.className='overlay';overlay.onclick=function(e){if(e.target===this)this.remove();};
  overlay.innerHTML=`<div class="panel panel-search" onclick="event.stopPropagation()"><div class="panel-hd"><input type="text" id="searchInput" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-size:14px;outline:none" placeholder="🔍 搜索训练内容·知识书塔 · ↵ 搜索" autofocus onkeydown="if(event.key==='Enter')doSearch(this.value)"><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div><div class="panel-bd" id="searchResults"><div class="search-hint">⌨️ 输入 → ↵ 搜索</div></div></div>`;
  document.body.appendChild(overlay);setTimeout(()=>document.getElementById('searchInput')?.focus(),100);
}

const MAX_RESULTS=30;
async function doSearch(query){query=query.trim();if(!query){$('searchResults').innerHTML='<div class="search-hint">⌨️ 输入 → ↵ 搜索</div>';return;}$('searchResults').innerHTML='<div class="search-hint">⏳ 搜索中…</div>';const ql=query.toLowerCase();const results=[];for(const book of MANIFEST.books){for(const ch of book.chapters){if(results.length>=MAX_RESULTS)break;if(ch.title.toLowerCase().includes(ql)||ch.file.toLowerCase().includes(ql)){results.push({book,ch,preview:'📑 章节标题匹配',line:0});continue;}if(ch.h2s){for(const h of ch.h2s){if(results.length>=MAX_RESULTS)break;if(h.title.toLowerCase().includes(ql))results.push({book,ch,preview:'📌 '+h.title,line:0});}}}if(results.length>=MAX_RESULTS)break;}if(results.length<MAX_RESULTS){for(const book of MANIFEST.books){for(const ch of book.chapters){if(results.length>=MAX_RESULTS)break;if(results.some(r=>r.ch===ch))continue;try{let md=null;try{const lr=await fetch('books/'+book.id+'/'+ch.file);if(lr.ok)md=await lr.text();}catch{}if(!md){const rr=await fetch(RAW+'/books/'+book.id+'/'+ch.file);if(rr.ok)md=await rr.text();}if(!md)continue;const lines=md.split('\n');for(let i=0;i<lines.length&&results.length<MAX_RESULTS;i++){if(lines[i].toLowerCase().includes(ql)&&!lines[i].startsWith('#')){const p=lines[i].length>100?lines[i].slice(0,100)+'…':lines[i];results.push({book,ch,preview:p,line:i+1});break;}}}catch{}}}}if(!results.length){$('searchResults').innerHTML='<div class="search-hint">😅 未找到匹配内容</div>';return;}$('searchResults').innerHTML=results.map(r=>{const highlighted=r.preview.replace(new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<em>$1</em>');return`<div class="sr-item" onclick="this.closest('.overlay').remove();goSearchResult('${r.book.id}','${r.ch.file}')"><div class="sr-b">${r.book.emoji} ${r.book.title} · ${r.ch.title}</div><div class="sr-p">${highlighted}</div>${r.line?'<div class="sr-m">第'+r.line+'行</div>':''}</div>`;}).join('');}
function goSearchResult(bid,file){goToBook(bid);const b=MANIFEST.books.find(x=>x.id===bid);const idx=b?.chapters.findIndex(c=>c.file===file);if(idx>=0)setTimeout(()=>openChapter(idx),300);}

// ─── Sidebar ──────────────────────────────────
function toggleSidebar(show){if(show===undefined)show=!sidebarOpen;$('sidebar').classList.toggle('closed',!show);sidebarOpen=show;}
let sidebarOpen=true;

// ─── Overlay ──────────────────────────────────
function showOverlay(cls,title,body){const overlay=document.createElement('div');overlay.className='overlay';overlay.id='_tmpOverlay';overlay.onclick=function(e){if(e.target===this)this.remove();};overlay.innerHTML=`<div class="${cls}" onclick="event.stopPropagation()"><div class="panel-hd"><span>${title}</span><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div><div class="panel-bd">${body}</div></div>`;document.body.appendChild(overlay);}

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const bar = $('splashBar');
  if(!bar)return;
  bar.style.width='25%';await sleep(150);
  MANIFEST = MANIFEST_DATA;
  bar.style.width='60%';await sleep(120);
  const theme=localStorage.getItem('bk_theme');if(theme)document.documentElement.setAttribute('data-theme',theme);
  const savedFont=localStorage.getItem('bk_font');if(savedFont){fontBase=parseInt(savedFont);document.documentElement.style.setProperty('--font-base',fontBase+'px');}
  bar.style.width='90%';await sleep(200);
  initRP();bar.style.width='100%';await sleep(200);
  $('splash').style.display='none';$('app').style.display='block';
  renderDashboard();updateProgress();
  $('content').addEventListener('scroll',()=>{$('fab').classList.toggle('show',$('content').scrollTop>300);});
  if(window.innerWidth<=768)toggleSidebar(false);
  setTimeout(checkAchievements,2000);
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function scrollToTop(){$('content').scrollTo({top:0,behavior:'smooth'});}
const closeAll=()=>{};
