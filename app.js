// ═══════════════════════════════════════════════════════════════════
//  🏸 羽毛球系统训练 · NSCA-CPT 科学评估教学体系
// ═══════════════════════════════════════════════════════════════════

const RAW = 'https://raw.githubusercontent.com/s66899/lamb/book';
let MANIFEST = null;
let currentModule = 'dashboard';
let currentBookId = null;
let currentChapterIdx = -1;
let navStack = []; // 导航栈：追踪用户从哪里来
// 待定位的搜索匹配：{ bookId, file, line, query } — 章节渲染完后跳转并高亮
let pendingSearchJump = null;
// v3.22.1 搜索匹配导航：applySearchJump 高亮完所有匹配后，把 em 节点存进 _searchMatches，
// 并用 _searchCurrIdx 跟踪「当前」匹配；n / Shift+N 在阅读器视图循环跳转
let _searchMatches = [];   // 当前章节里所有 <em class="search-hl"> 节点（按 DOM 顺序）
let _searchCurrIdx = -1;   // 当前匹配序号（-1 = 无）；循环跳转时 wrap
// v3.22.3 跨章节匹配链：用户从搜索面板点进一个章节时，把当前结果列表的「章节摘要」快照存起来
// n 在当前章节底部 → 自动跳到下一个有命中的章节；Shift+N 反向。避免「找完一章就得手动退出再搜」的痛点
let _searchChain = [];     // [{ bookId, bookTitle, file, chTitle, hits }] 按搜索结果顺序
let _searchChainIdx = -1;  // 当前所在章节在链中的索引
// v3.14.5 阅读时长追踪：进入章节时打点，scroll 监听里节流刷新，切换/离开时累加进 RP.totalReadSeconds
let readStartTs = 0;        // 当前章节首次进入时间戳
let lastTickTs = 0;         // 上一次节流 tick 时间戳（scroll 时刷新）
let readSecThisChapter = 0; // 当前章节已累计的"页面可见 + 活跃"秒数
let _scrollSaveT = 0;       // v3.18.5 阅读位置记忆：scroll 节流保存定时器 id

// ─── 版本 ─────────────────────────────────
const APP_VERSION = 'v3.22.8';
const APP_DATE = '2026-08-24';

// ─── 全局错误边界（防白屏）─────────────────
window.addEventListener('error', (e) => {
  try {
    console.error('[GlobalError]', e.error || e.message, e.filename, e.lineno);
    const splash = document.getElementById('splash');
    if (splash && !splash.querySelector('.err-box')) {
      const msg = (e.error?.message || e.message || '未知错误').slice(0,200);
      splash.innerHTML = `<div class="splash-inner err-box">
        <div style="font-size:48px;margin-bottom:8px">⚠️</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:6px">出错了</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:14px;max-width:300px;font-family:monospace;text-align:left;padding:10px;background:rgba(255,59,48,.06);border-radius:6px">${msg}</div>
        <button onclick="location.reload()" style="padding:8px 18px;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;margin-right:6px">🔄 重新加载</button>
        <button onclick="localStorage.clear();location.reload()" style="padding:8px 18px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer">🧹 清除缓存</button>
      </div>`;
      splash.style.display = 'flex';
    }
  } catch (_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledRejection]', e.reason);
  e.preventDefault?.();
});

// ─── 安全存储工具（容错+容量检查）─────────────
function safeGet(key, fallback=null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[safeGet]', key, 'parse failed, returning fallback');
    return fallback;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // 容量超限或隐私模式：清理旧缓存重试
    console.warn('[safeSet]', key, 'failed:', e.message);
    try {
      const keys = Object.keys(localStorage);
      // 清理 streaking记录和临时数据
      for (const k of keys) {
        if (k.startsWith('tmp_') || k === '_cache') localStorage.removeItem(k);
      }
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e2) {
      console.error('[safeSet] persistent failure:', key, e2.message);
      return false;
    }
  }
}

// ─── 5大训练模块 ──────────────────────────
const TRAIN_MODULES = [
  { id:'badminton-tech', icon:'🏸', title:'羽毛球技术', color:'var(--blue)',
    desc:'基于NSCA-CSCS运动科学，融合世界顶级教练实战经验的手法·步伐·球路一体化训练体系',
    tags:['握拍','高远球','杀球','网前','步伐','球路','战术'], docs:20,
    books:['badminton'],
    chapters:['基础握拍与准备姿势','正手高远球技术','反手技术体系','网前小球技术','步伐体系','杀球与扣杀','平抽快挡','综合训练','比赛心理','高级战术','体能训练','双打战术'] },
  { id:'strength', icon:'💪', title:'体能训练', color:'var(--green)',
    desc:'NSCA-CPT · 体适能 · 中考高考 · 年龄分层训练库 + 疲劳度自检 + 周期化负荷调整',
    tags:['肩关节','膝关节','核心力量','代谢','间歇','周期','恢复'], docs:18,
    books:['nsca-cpt'],
    chapters:['训练哲学','运动生理学','运动解剖','基础力量','爆发力训练','敏捷性','柔韧性','周期化训练','损伤预防','恢复策略'] },
  { id:'psychology', icon:'🧠', title:'心理训练', color:'var(--purple)',
    desc:'注意力·压力适应·自我调节·决策信心 — 从动机心理学到赛场心理韧性',
    tags:['注意力','压力','自我对话','目标','心流','韧性'], docs:15,
    books:['psychology'],
    chapters:['知觉与注意','记忆','思维与语言','动机与需求','情绪与情感','人格','社会影响','认知偏差','发展心理学','心理障碍','心理治疗','积极心理学'] },
  { id:'nutrition', icon:'🍎', title:'营养恢复', color:'var(--orange)',
    desc:'TDEE计算·营养素分配·训练后恢复时间轴·睡眠优化 — 科学营养恢复体系',
    tags:['蛋白','碳水','脂肪','水合','睡眠','补剂'], docs:12,
    books:['nutrition'],
    chapters:['🔥 TDEE每日总能耗','🥩 三大营养素分配','⏰ 训练前后营养窗口','🥩 蛋白质摄入策略','💧 水合与电解质平衡','💊 运动补剂速查','⚖️ 体重管理'] },
  { id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'对手分析·战术选择·节奏控制·体能分配 — 从准备到复盘完整比赛流程',
    tags:['对手分析','战术库','节奏','体能分配','复盘','发接发'], docs:15,
    books:['competition'],
    chapters:['⚔️ 赛前准备与倒计时','🎯 发接发战术体系','📊 对手分析与应对','🧠 比赛心理策略','🏃 体能分配与节奏控制','📝 局间调整与赛后复盘'] },
  { id:'coach', icon:'🎯', title:'教练板块', color:'var(--gold)',
    desc:'AI教练辅助 · 训练计划编排 · 动作分析指导 · 个性化周期规划',
    tags:['AI教练','训练计划','动作分析','周期规划','数据追踪'], docs:12,
    chapters:['训练计划设计原则','周期性训练编排','动作质量评估体系','训练负荷调控','个性化方案制定','技术诊断方法论','比赛录像分析','训练日志与复盘','运动员心理辅导','智能教练工具'] },
  { id:'personal', icon:'👤', title:'个人专项', color:'var(--blue)',
    desc:'自定义训练计划 · 专项目标设定 · 个性化周期管理',
    tags:['自定义','个人','专项','目标','计划'], docs:0,
    chapters:['我的训练计划'] },
];

// ─── 模块内联内容（营养/比赛等无 book 映射的模块） ──
// ===== 体能训练库：4 个年龄段 × 训练目标 矩阵 =====
// 来源：NSCA-CPT 周期化原则 + 体适能体系 + 中考体育 + 高考体育
// 结构：每个 segment 含 goals（力量/爆发/耐力/综合 等），每个 goal 含 phases（基础期/强化期/专项期/恢复期）
const STRENGTH_PROGRAMS = {
  'adult-full': {
    label: '成人·全面体能', icon: '💪', age: '18-45 岁', source: 'NSCA-CPT',
    summary: '力量·爆发力·耐力·柔韧·核心 全面均衡，适用于业余爱好者与综合提升',
    weekly: 3, intensityBase: 70,
    goals: {
      power:   { label: '爆发力', color: '#ff9f0a', items: ['抓举 5×3','高翻 4×3','跳箱 4×6','药球掷远 4×8','短冲刺 30m×6'] },
      strength:{ label: '最大力量', color: '#0a84ff', items: ['深蹲 5×5 @85%','硬拉 5×3','卧推 5×5','罗马尼亚硬拉 3×8','引体向上 4×8'] },
      endurance:{ label: '肌肉耐力', color: '#30d158', items: ['战绳 4×30s','壶铃摇摆 5×15','波比跳 4×12','划船机 2000m','循环训练 20min'] },
      core:    { label: '核心稳定', color: '#a855f7', items: ['平板支撑 3×60s','死虫 3×12','鸟狗 3×12','农夫行走 4×30m','侧桥 3×45s'] }
    },
    recovery: { rest: '48h/肌群', sleep: '7-9h', hydration: '35ml/kg/天', protein: '1.6-2.0g/kg/天' }
  },
  'adult-specific': {
    label: '成人·专项体能', icon: '🎯', age: '18-45 岁', source: 'NSCA-CSCS',
    summary: '针对单一板块（速度/力量/耐力）深耕，周期化分明，含专项评估',
    weekly: 4, intensityBase: 80,
    goals: {
      speed:   { label: '速度专攻', color: '#ff453a', items: ['加速跑 10×30m','冲刺间歇 6×60m','变向跑 5×20m','反应起跑 8×10m','增强式训练 4×8'] },
      hypertrophy:{ label: '肌肥大', color: '#0a84ff', items: ['深蹲 4×10 @70%','卧推 4×10','罗马尼亚硬拉 4×10','哑铃推举 3×12','腿弯举 3×12'] },
      peak:    { label: '峰值力量', color: '#ff9f0a', items: ['深蹲 6×2 @90%','硬拉 5×2','推举 5×2','抓举 5×2','颈后深蹲 4×2'] },
      aerobic: { label: '有氧基础', color: '#30d158', items: ['LSD 慢跑 60min','节奏跑 4×8min','法特莱克 40min','骑行 90min Z2','游泳 1500m'] }
    },
    recovery: { rest: '72h/肌群', sleep: '8-9h', hydration: '40ml/kg/天', protein: '1.8-2.2g/kg/天' }
  },
  'mid-school': {
    label: '中考体育·初三年级', icon: '📚', age: '14-16 岁', source: '中考体育标准',
    summary: '围绕 1000/800m + 跳绳/实心球 + 立定跳远 + 选考项 训练',
    weekly: 4, intensityBase: 65,
    goals: {
      endurance:{ label: '耐力跑', color: '#30d158', items: ['1000m 计时×4','800m 间歇×6','变速跑 400m×8','越野跑 25min','跳绳 3min×4'] },
      jump:     { label: '下肢爆发', color: '#ff9f0a', items: ['立定跳远 6×3','收腹跳 4×10','蛙跳 3×8','单脚跳 4×6','跳深 4×6'] },
      strength: { label: '全身力量', color: '#0a84ff', items: ['自重深蹲 4×15','俯卧撑 4×12','平板支撑 3×60s','仰卧起坐 4×20','俄罗斯转体 4×20'] },
      throw:    { label: '投掷专项', color: '#a855f7', items: ['实心球掷远 6×3','铅球姿势练习 5×5','药球前抛 5×5','挥臂练习 4×8','核心抗旋 3×10'] }
    },
    recovery: { rest: '24-48h', sleep: '8-10h', hydration: '30ml/kg/天', protein: '1.2-1.5g/kg/天' }
  },
  'high-school': {
    label: '高考体育·专项生', icon: '🏅', age: '16-19 岁', source: '高考体育标准',
    summary: '100m/立定跳远/铅球/800m 四项达标 + 专项强化（径赛/田赛二选一）',
    weekly: 5, intensityBase: 75,
    goals: {
      sprint:   { label: '短跑专项', color: '#ff453a', items: ['起跑 30m×6','加速跑 60m×4','弯道跑 4×120m','行进间跑 3×30m','阻力跑 4×40m'] },
      jump2:    { label: '跳跃专项', color: '#ff9f0a', items: ['立定三级跳 5×3','跳远全程 6×3','跨步跳 4×8','挺身跳 4×6','单足跳 4×6'] },
      throw2:  { label: '投掷专项', color: '#a855f7', items: ['铅球滑步 6×3','铅球旋转 5×3','杠铃抓举 4×3','卧推 4×5','旋转爆发 5×5'] },
      endur2: { label: '中长跑', color: '#30d158', items: ['1500m 计时×3','间歇跑 400m×10','节奏跑 3×1200m','法特莱克 30min','登山跑 25min'] }
    },
    recovery: { rest: '48-72h/肌群', sleep: '9h+', hydration: '35ml/kg/天', protein: '1.6-2.0g/kg/天' }
  }
};

// ===== 心理训练库：周期化心理调适 =====
const PSYCHOLOGY_PROGRAMS = {
  'competition-prep': {
    label: '赛前心理准备', icon: '🎯', age: '全年龄', source: '运动心理学',
    summary: '赛前焦虑调控 · 自信心建立 · 比赛流程可视化 · 注意力聚焦',
    weekly: 2, intensityBase: 60,
    goals: {
      anxiety: { label: '焦虑调控', color: '#bf5af2', items: ['呼吸放松 5min×3/日','渐进式肌肉放松','正念冥想 10min','焦虑记录日记'] },
      confidence: { label: '自信建立', color: '#ffd60a', items: ['成功画面重现','自我暗示训练','优势清单回顾','信心口号背诵'] },
      focus: { label: '注意力聚焦', color: '#0a84ff', items: ['专注当下练习','外部聚焦训练','抗干扰练习','比赛流程可视化'] },
      routine: { label: '比赛routine', color: '#30d158', items: ['热身routine','赛前仪式','得分庆祝','失误恢复'] }
    },
    recovery: { rest: '每日', sleep: '8h+', mental: '避免赛前过度社交', protein: '均衡饮食' }
  },
  'stress-management': {
    label: '日常压力管理', icon: '🧠', age: '全年龄', source: '运动心理学',
    summary: '训练/生活压力识别 · 情绪调节技巧 · 恢复性心理练习',
    weekly: 3, intensityBase: 50,
    goals: {
      stress: { label: '压力识别', color: '#ff9f0a', items: ['压力源清单','身体信号觉察','压力等级自评','触发因素记录'] },
      emotion: { label: '情绪调节', color: '#ff453a', items: ['情绪ABC模型','认知重评','情绪表达练习','情绪日记'] },
      recovery: { label: '心理恢复', color: '#30d158', items: ['冥想放松','自然接触','兴趣爱好时间','社交支持'] },
      growth: { label: '心理成长', color: '#a855f7', items: ['成长型思维','失败重构','积极自我对话','感恩练习'] }
    },
    recovery: { rest: '每日30min', sleep: '7-8h', mental: '定期心理休息日', protein: 'Omega-3补充' }
  },
  'team dynamics': {
    label: '团队心理建设', icon: '👥', age: '青少年+成人', source: '团队心理学',
    summary: '团队凝聚力 · 沟通技巧 · 冲突处理 · 领导力培养',
    weekly: 1, intensityBase: 40,
    goals: {
      cohesion: { label: '团队凝聚', color: '#52b788', items: ['团队目标设定','共同挑战活动','成员认可仪式','团队故事建立'] },
      communication: { label: '有效沟通', color: '#0a84ff', items: ['积极倾听练习','非暴力沟通','反馈技巧','公开表达'] },
      conflict: { label: '冲突处理', color: '#ff9f0a', items: ['冲突识别','利益分析','双赢策略','情感修复'] },
      leadership: { label: '领导力', color: '#ffd60a', items: ['领袖榜样学习','决策练习','责任承担','激励他人'] }
    },
    recovery: { rest: '每周1天', sleep: '7-9h', mental: '团队建设活动', protein: '均衡饮食' }
  }
};

// ===== 营养模块：周期化营养策略 =====
const NUTRITION_PROGRAMS = {
  'competition-cycle': {
    label: '比赛周期营养', icon: '🏆', age: '全年龄', source: 'NSCA运动营养',
    summary: '赛前减脂 · 比赛周饮食 · 赛后恢复 · 补剂策略',
    weekly: 7, intensityBase: 70,
    goals: {
      load: { label: '碳水加载', color: '#ffd60a', items: ['赛前3天高碳水','肝糖原超补偿','比赛日早餐','赛中补给'] },
      hydrate: { label: '水合管理', color: '#0a84ff', items: ['赛前水合评估','比赛间歇补水','赛后脱水恢复','电解质补充'] },
      recovery: { label: '赛后恢复', color: '#30d158', items: ['赛后30min窗口','蛋白质补充','碳水+蛋白比例','抗炎食物'] },
      supplement: { label: '补剂策略', color: '#a855f7', items: ['咖啡因 timing','β-丙氨酸','肌酸','维生素D'] }
    },
    recovery: { rest: '赛后完全休息', sleep: '8h+', hydration: '3L+/天', protein: '2.0-2.4g/kg' }
  },
  'fat-loss': {
    label: '减脂周期', icon: '📉', age: '18-45岁', source: 'NSCA运动营养',
    summary: '热量赤字 · 蛋白质保护 · 训练表现维持 · 代谢保护',
    weekly: 7, intensityBase: 75,
    goals: {
      calorie: { label: '热量控制', color: '#ff453a', items: ['每日赤字300-500','间歇性禁食','欺骗餐安排','热量循环'] },
      protein: { label: '蛋白质保护', color: '#0a84ff', items: ['2.0-2.4g/kg摄入','每餐蛋白','亮氨酸优化','蛋白时间分布'] },
      train: { label: '训练配合', color: '#30d158', items: ['力量训练优先','HIIT控制','训练后有氧','活动量增加'] },
      metabolism: { label: '代谢保护', color: '#ff9f0a', items: ['定期热量重置','甲状腺支持','睡眠优化','压力管理'] }
    },
    recovery: { rest: '1-2天/周', sleep: '7-8h', hydration: '40ml/kg/天', protein: '2.2g/kg' }
  },
  'muscle-gain': {
    label: '增肌周期', icon: '💪', age: '18-45岁', source: 'NSCA运动营养',
    summary: '热量盈余 · 渐进负荷 · 合成代谢 · 恢复优化',
    weekly: 5, intensityBase: 80,
    goals: {
      surplus: { label: '热量盈余', color: '#ffd60a', items: ['每日盈余200-300','碳水循环','训练日高碳','休息日适中'] },
      anabolic: { label: '合成代谢', color: '#0a84ff', items: ['每餐蛋白25-40g','必需氨基酸','肌酸5g/日','胰岛素敏感度'] },
      training: { label: '训练营养', color: '#30d158', items: ['训练前低碳高脂','训练中补水','训练后快碳+蛋白','练后餐 timing'] },
      sleep: { label: '恢复优化', color: '#a855f7', items: ['睡眠8h+','生长激素高峰','褪黑素支持','睡前蛋白'] }
    },
    recovery: { rest: '1-2天/周', sleep: '8-9h', hydration: '35ml/kg/天', protein: '1.8-2.2g/kg' }
  }
};

// ===== 个人专项计划（用户自定义） =====
const PERSONAL_KEY = 'bk_personal_programs_v1';
function getPersonalPrograms() {
  try { return JSON.parse(localStorage.getItem(PERSONAL_KEY) || '[]'); } catch { return []; }
}
function savePersonalPrograms(arr) {
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(arr));
}
// 默认示例计划
const DEFAULT_PERSONAL = [
  { id: 'my-shuttle', name: '我的羽毛球专项', icon: '🏸', desc: '结合步法+技术+体能的系统训练',
    goals: [
      { label: '步法训练', color: '#0a84ff', items: ['全场四点跑','杀上网','吊上网','防守反击','前后轮换','交叉换位'] },
      { label: '技术打磨', color: '#30d158', items: ['高远球','吊球','杀球','搓球','推球','勾对角','扑球'] },
      { label: '体能储备', color: '#ff9f0a', items: ['跳绳3000','折返跑','核心稳定性','冲刺训练','敏捷梯','多球训练'] }
    ],
    recovery: { rest: '每周1天', sleep: '8h', hydration: '2L/天' }
  },
  { id: 'fitness-general', name: '综合体能提升', icon: '💪', desc: '力量+耐力+柔韧全面提升',
    goals: [
      { label: '力量训练', color: '#0a84ff', items: ['深蹲','硬拉','卧推','划船','肩推','引体'] },
      { label: '有氧耐力', color: '#30d158', items: ['慢跑30min','骑行','游泳','HIIT','冲刺间歇'] },
      { label: '柔韧拉伸', color: '#a855f7', items: ['全身拉伸','瑜伽','筋膜球','动态热身'] }
    ],
    recovery: { rest: '每周2天', sleep: '7-8h', hydration: '2.5L/天' }
  },
  { id: 'competition-prep', name: '赛前突击', icon: '🏆', desc: '比赛前2周集中准备',
    goals: [
      { label: '技术冲刺', color: '#0a84ff', items: ['多球训练','实战对练','关键分处理','心态调整'] },
      { label: '体能储备', color: '#30d158', items: ['短距离冲刺','高强度间歇','模拟比赛'] },
      { label: '心理调整', color: '#a855f7', items: ['比赛流程可视化','呼吸放松','自信心暗示'] }
    ],
    recovery: { rest: '赛前1天', sleep: '8h+', hydration: '3L/天' }
  }
];

// ===== 疲劳度自检 + 恢复追踪（数据驱动周期调整） =====
const FATIGUE_KEY = 'bk_fatigue_v1';
const CYCLE_KEY   = 'bk_cycle_v1';

// 疲劳自检 4 维（参考 NSCA RPE + 主观恢复量表）
const FATIGUE_DIMS = [
  { id: 'sleep',  label: '睡眠质量', desc: '过去 3 天平均睡眠小时与深度' },
  { id: 'muscle', label: '肌肉酸痛', desc: '训练后 24-48h 酸痛/僵硬感' },
  { id: 'mood',   label: '情绪/动力', desc: '训练意愿与日常专注度' },
  { id: 'energy', label: '能量水平', desc: '日常精力与训练表现' }
];
// 每维 1-10 分（10 = 极佳 / 1 = 极差），总平均 → 状态灯
function classifyFatigue(avg) {
  if (avg >= 8) return { code: 'green',  label: '绿·良好',  advice: '可按计划推进，可尝试突破训练' };
  if (avg >= 6) return { code: 'yellow', label: '黄·可控',  advice: '维持当前强度，重视睡眠与拉伸' };
  if (avg >= 4) return { code: 'orange', label: '橙·警戒',  advice: '降低强度 20%，加一次主动恢复' };
  return          { code: 'red',    label: '红·危险',  advice: '强制休息 1-2 天，复查原因（睡眠/疾病）' };
}

function getFatigueLog() { try { return JSON.parse(localStorage.getItem(FATIGUE_KEY) || '[]'); } catch { return []; } }
function setFatigueLog(arr) { try { localStorage.setItem(FATIGUE_KEY, JSON.stringify(arr)); } catch {} }

// 7 天滑动平均（按 ISO 日期去重，每日取最后一次）
function fatigue7dAvg() {
  const log = getFatigueLog();
  const byDay = {};
  for (const r of log) (byDay[r.date] = byDay[r.date] || []).push(r);
  const days = Object.keys(byDay).sort().slice(-7);
  if (!days.length) return null;
  const avg = days.reduce((s, d) => s + byDay[d].reduce((a, r) => a + (r.score || 0), 0) / byDay[d].length, 0) / days.length;
  return { avg: Math.round(avg * 10) / 10, days: days.length, latest: byDay[days[days.length - 1]] };
}

// 周期调整算法：基于 7 天疲劳均值 → 下周训练负荷调整
function computeCycleAdjust(segmentKey) {
  const prog = STRENGTH_PROGRAMS[segmentKey];
  if (!prog) return null;
  const f = fatigue7dAvg();
  const baseWeekly = prog.weekly;
  const baseIntensity = prog.intensityBase;
  if (!f) {
    return { segment: prog.label, weekly: baseWeekly, intensity: baseIntensity, note: '尚无疲劳数据，先按基线推进。记录 3 天后再评估。' };
  }
  let weekly = baseWeekly, intensity = baseIntensity, note = '';
  if (f.avg >= 8)        { weekly = baseWeekly + 1; intensity = Math.min(95, baseIntensity + 5); note = '状态极佳：+1 练次，强度上浮 5%'; }
  else if (f.avg >= 6)   { weekly = baseWeekly;     intensity = baseIntensity;              note = '状态稳定：按基线推进'; }
  else if (f.avg >= 4)   { weekly = Math.max(2, baseWeekly - 1); intensity = Math.max(50, baseIntensity - 15); note = '累积疲劳：-1 练次，强度下调 15%'; }
  else                   { weekly = Math.max(1, baseWeekly - 2); intensity = Math.max(40, baseIntensity - 25); note = '过劳信号：-2 练次，强度下调 25%，优先恢复'; }
  return { segment: prog.label, weekly, intensity, avg: f.avg, note };
}

// 写入疲劳记录
function recordFatigue(scores) {
  const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const log = getFatigueLog();
  const today = new Date().toISOString().slice(0, 10);
  log.push({ date: today, ts: Date.now(), scores, score: avg });
  // 仅保留 60 天
  setFatigueLog(log.slice(-180));
  return { avg, status: classifyFatigue(avg) };
}

// 打开疲劳自检面板
function openFatigueCheck() {
  const inputs = FATIGUE_DIMS.map((d, i) =>
    `<div style="margin:10px 0"><label style="font-size:12px;color:var(--text2)">${d.label} <span style="color:var(--text3);font-size:10px">${d.desc}</span></label>
     <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
       <input type="range" min="1" max="10" value="7" id="fq_${d.id}" style="flex:1">
       <span id="fv_${d.id}" style="font-size:12px;color:var(--text);min-width:24px;text-align:right">7</span>
     </div></div>`).join('');
  showOverlay('panel', '🩺 疲劳度自检（RPE 量表）',
    `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">基于 NSCA 主观恢复量表 · 1=极差 / 10=极佳 · 建议每天训练前记录</div>
     ${inputs}
     <div style="display:flex;gap:8px;margin-top:14px">
       <button class="h-btn" style="flex:1;background:var(--green);color:#fff" onclick="submitFatigueCheck()">✅ 提交并保存</button>
       <button class="h-btn" onclick="this.closest('.overlay').remove()">取消</button>
     </div>`);
  // 绑定滑块联动
  FATIGUE_DIMS.forEach(d => {
    const el = document.getElementById('fq_' + d.id);
    const out = document.getElementById('fv_' + d.id);
    if (el && out) el.addEventListener('input', () => out.textContent = el.value);
  });
}

function submitFatigueCheck() {
  const scores = FATIGUE_DIMS.map(d => parseInt(document.getElementById('fq_' + d.id)?.value) || 5);
  const { avg, status } = recordFatigue(scores);
  document.querySelector('.overlay .panel')?.parentElement?.remove();
  showOverlay('panel', '🩺 评估结果',
    `<div style="text-align:center;padding:10px 0">
       <div style="font-size:42px;font-weight:700;color:var(--${status.code === 'red' ? 'red' : status.code === 'orange' ? 'orange' : status.code === 'yellow' ? 'yellow' : 'green'})">${avg}</div>
       <div style="font-size:13px;font-weight:600;margin:4px 0">${status.label}</div>
       <div style="font-size:11px;color:var(--text2);margin:8px 20px">${status.advice}</div>
     </div>
     <div style="display:flex;gap:8px;margin-top:12px">
       <button class="h-btn" style="flex:1" onclick="openCyclePlanner()">📅 查看本周周期调整</button>
       <button class="h-btn" onclick="this.closest('.overlay').remove()">关闭</button>
     </div>`);
}

// 周期规划器：基于所选训练库 + 疲劳数据给出下周建议
let _selectedSegment = localStorage.getItem('bk_segment') || 'adult-full';
function setSegment(key) { _selectedSegment = key; localStorage.setItem('bk_segment', key); renderCyclePlan(); }
function openCyclePlanner() {
  const segPicker = Object.entries(STRENGTH_PROGRAMS).map(([k, p]) =>
    `<button class="h-btn" style="flex:1;${_selectedSegment === k ? 'background:var(--green);color:#fff' : ''}" onclick="setSegment('${k}')">${p.icon} ${p.label}</button>`).join('');
  showOverlay('panel panel-wide', '📅 周期化训练规划器',
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${segPicker}</div>
     <div id="cyclePlanBody"></div>
     <div style="display:flex;gap:8px;margin-top:12px">
       <button class="h-btn" onclick="openFatigueCheck()">🩺 立即疲劳自检</button>
       <button class="h-btn" onclick="this.closest('.overlay').remove()">关闭</button>
     </div>`);
  renderCyclePlan();
}

function renderCyclePlan() {
  const body = document.getElementById('cyclePlanBody');
  if (!body) return;
  const prog = STRENGTH_PROGRAMS[_selectedSegment];
  if (!prog) return;
  const adj = computeCycleAdjust(_selectedSegment);
  const f = fatigue7dAvg();
  const goalGrid = Object.entries(prog.goals).map(([k, g]) =>
    `<div style="background:var(--bg3);padding:10px;border-radius:8px;border-left:3px solid ${g.color}">
       <div style="font-size:12px;font-weight:600;color:${g.color}">${g.label}</div>
       <div style="font-size:11px;color:var(--text2);margin-top:4px">${g.items.slice(0,3).join(' · ')}</div>
       <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
         <div style="font-size:10px;color:var(--text3)">+${g.items.length - 3} 项</div>
         <button onclick="exOpenByGoal('${_selectedSegment}','${k}')" style="background:transparent;border:none;color:${g.color};font-size:10px;cursor:pointer;font-weight:600">动作库 →</button>
       </div>
     </div>`).join('');
  const recovery = prog.recovery;
  body.innerHTML = `
    <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${prog.icon} ${prog.label} <span style="font-size:10px;color:var(--text3)">${prog.age} · 来源 ${prog.source}</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">${prog.summary}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;font-size:11px">
        <div>😴 睡眠：${recovery.sleep}</div><div>💧 水合：${recovery.hydration}</div>
        <div>🥩 蛋白：${recovery.protein}</div><div>⏱️ 休息：${recovery.rest}</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:600;margin:8px 0 6px">🎯 训练目标库</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">${goalGrid}</div>
    <div style="background:var(--bg2);padding:12px;border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">📈 下周训练负荷调整</div>
      ${f ? `<div style="font-size:11px;color:var(--text2);margin-bottom:6px">近 7 天疲劳均值：<strong>${f.avg}</strong> / 10（${f.days} 天记录）</div>` : '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">尚无疲劳数据</div>'}
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;font-size:12px">
        <div>📅 每周练次：<strong>${adj.weekly}</strong> 次</div>
        <div>🔥 强度基线：<strong>${adj.intensity}%</strong> 1RM</div>
      </div>
      <div style="font-size:11px;color:var(--green);margin-top:8px">💡 ${adj.note}</div>
    </div>`;
}

// 体能模块入口重写：打开时跳到周期规划器（保留原 book 章节作为深入阅读）
function openStrengthHub() { openCyclePlanner(); }

// ═══════════════════════════════════════════════════════════════════
//  v3.18.2  体能动作库（EX_LIB） — 数据源：hasaneyldrm/exercises-dataset
//  1,324 个动作 · 中文名 + 中文步骤 + 部位/器械/目标肌群中文映射
//  加载策略：lazy fetch + sessionStorage 缓存（避免每次刷新重下 920KB）
// ═══════════════════════════════════════════════════════════════════
const EX_LIB_URL = 'books/exercises/ex-lib.json';
const EX_LIB_CACHE_KEY = 'bk_exlib_cache_v1';
const EX_LIB_TS_KEY    = 'bk_exlib_ts_v1';
const EX_LIB_TTL_MS    = 7 * 24 * 3600 * 1000; // 7 天缓存

let _EX = null;        // 动作数组（lazy load）
let _EX_LOADING = null; // Promise（防止并发重复请求）

async function loadExerciseLib(force = false) {
  if (_EX && !force) return _EX;
  if (_EX_LOADING && !force) return _EX_LOADING;
  // 1) 先查 sessionStorage 缓存
  try {
    const ts = parseInt(sessionStorage.getItem(EX_LIB_TS_KEY) || '0', 10);
    if (!force && ts && (Date.now() - ts) < EX_LIB_TTL_MS) {
      const cached = sessionStorage.getItem(EX_LIB_CACHE_KEY);
      if (cached) {
        _EX = JSON.parse(cached);
        return _EX;
      }
    }
  } catch (_) {}
  // 2) 网络拉取
  _EX_LOADING = (async () => {
    try {
      const r = await fetch(EX_LIB_URL, { cache: 'force-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      _EX = data;
      try {
        sessionStorage.setItem(EX_LIB_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(EX_LIB_TS_KEY, String(Date.now()));
      } catch (_) {}
      return data;
    } catch (e) {
      console.error('[EX_LIB] load failed:', e);
      showToast?.('❌ 动作库加载失败：' + e.message);
      throw e;
    } finally {
      _EX_LOADING = null;
    }
  })();
  return _EX_LOADING;
}

// 简易索引：按身体部位/器械/训练目标分组（构建一次，复用多次）
function buildExIndex(arr) {
  const idx = {
    byBP: {}, byEQ: {}, byGoal: {}, byLevel: {}, byTgt: {}, byMu: {},
    allMuscles: new Set(), allEqs: new Set(), allGoals: new Set(), allLevels: new Set()
  };
  for (const ex of arr) {
    (idx.byBP[ex.bp] ??= []).push(ex);
    (idx.byEQ[ex.eq] ??= []).push(ex);
    (idx.byGoal[ex.goal] ??= []).push(ex);
    (idx.byLevel[ex.level] ??= []).push(ex);
    (idx.byTgt[ex.tgt] ??= []).push(ex);
    (idx.byMu[ex.mu] ??= []).push(ex);
    idx.allEqs.add(ex.eq);
    idx.allGoals.add(ex.goal);
    idx.allLevels.add(ex.level);
    for (const m of ex.sec || []) idx.allMuscles.add(m);
    idx.allMuscles.add(ex.mu);
  }
  return idx;
}

// 体能动作库页面：搜索 + 多维筛选 + 卡片瀑布流
async function openExerciseLib() {
  showOverlay('panel panel-wide', '🏋️ 体能动作库 · 1,324 动作',
    `<div style="padding:6px 2px">
       <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
         <input id="exSearch" type="search" placeholder="🔍 搜索动作名（中/英）、目标肌群…"
           style="flex:2;min-width:200px;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);
                  border-radius:8px;color:var(--text);font-size:13px"
           oninput="exSearchInput(this.value)">
         <button class="h-btn" onclick="exResetFilters()" style="flex:0">🔄 重置</button>
       </div>
       <div id="exFiltersBar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:11px"></div>
       <div id="exStatsBar" style="font-size:11px;color:var(--text3);margin-bottom:8px"></div>
       <div id="exGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px"></div>
     </div>`);
  try {
    const arr = await loadExerciseLib();
    _EX_IDX = buildExIndex(arr);
    exRenderFilters();
    exApplyAndRender();
  } catch (e) {
    document.getElementById('exGrid').innerHTML =
      `<div style="grid-column:1/-1;padding:30px;text-align:center;color:var(--text3);font-size:12px">
         ⚠️ 动作库加载失败，请检查网络或重试。
       </div>`;
  }
}

let _EX_IDX = null;
let _EX_FILTER = { q: '', bp: '', eq: '', goal: '', level: '', mu: '' };
const BP_ORDER  = ['waist','upper legs','back','lower legs','chest','upper arms','cardio','shoulders','lower arms','neck'];
const BP_LABEL  = { waist:'核心·腰腹','upper legs':'大腿','back':'背部','lower legs':'小腿','chest':'胸部','upper arms':'上臂',cardio:'心肺',shoulders:'肩部','lower arms':'前臂',neck:'颈部' };
const EQ_LABEL  = { 'body weight':'徒手',dumbbell:'哑铃',barbell:'杠铃','olympic barbell':'奥杆','ez barbell':'EZ 杆',cable:'绳索','leverage machine':'固定器械','smith machine':'史密斯',kettlebell:'壶铃',band:'弹力带','resistance band':'弹力带','medicine ball':'药球','stability ball':'健身球','bosu ball':'波速球',sledmachine:'雪橇机','upper body ergometer':'上肢测功计','skiergmachine':'滑雪机',hammer:'锤式','tire':'轮胎','trap bar':'六角杠','stationary bike':'动感单车','elliptical machine':'椭圆机','stepmill machine':'踏步机',roller:'滚筒','wheelroller':'泡沫轴',assisted:'辅助',weighted:'负重',rope:'战绳' };
const GOAL_LABEL = { core:'核心', strength:'力量', cardio:'心肺', arm:'手臂', leg:'腿部', back:'背部', chest:'胸部', shoulder:'肩部', full:'全身' };
const LEVEL_LABEL = { beginner:'入门', intermediate:'进阶', expert:'高手' };

function exRenderFilters() {
  const bar = document.getElementById('exFiltersBar');
  if (!bar || !_EX_IDX) return;
  const bpChips = BP_ORDER.map(bp => {
    const c = (bp === _EX_FILTER.bp) ? 'background:var(--green);color:#fff;border-color:var(--green)' : '';
    return `<button class="h-btn" style="padding:4px 9px;font-size:11px;${c}" onclick="exSetFilter('bp','${bp}')">${BP_LABEL[bp]}</button>`;
  }).join('');
  const eqChips = [..._EX_IDX.allEqs].sort().slice(0, 10).map(eq => {
    const c = (eq === _EX_FILTER.eq) ? 'background:var(--blue);color:#fff;border-color:var(--blue)' : '';
    return `<button class="h-btn" style="padding:4px 9px;font-size:11px;${c}" onclick="exSetFilter('eq','${eq}')">${EQ_LABEL[eq] || eq}</button>`;
  }).join('');
  const goalChips = [..._EX_IDX.allGoals].sort().map(g => {
    const c = (g === _EX_FILTER.goal) ? 'background:var(--purple);color:#fff;border-color:var(--purple)' : '';
    return `<button class="h-btn" style="padding:4px 9px;font-size:11px;${c}" onclick="exSetFilter('goal','${g}')">${GOAL_LABEL[g] || g}</button>`;
  }).join('');
  const lvlChips = [..._EX_IDX.allLevels].sort().map(l => {
    const c = (l === _EX_FILTER.level) ? 'background:var(--orange,#ff9f0a);color:#fff;border-color:var(--orange,#ff9f0a)' : '';
    return `<button class="h-btn" style="padding:4px 9px;font-size:11px;${c}" onclick="exSetFilter('level','${l}')">${LEVEL_LABEL[l] || l}</button>`;
  }).join('');
  // 肌群 chip 组：按频次排序，展示 top 15 肌群（避免过长）
  const topMus = [..._EX_IDX.allMuscles].sort((a,b) => {
    const ca = _EX.filter(x => x.mu_zh === a || (Array.isArray(x.sec) && x.sec.includes(a))).length;
    const cb = _EX.filter(x => x.mu_zh === b || (Array.isArray(x.sec) && x.sec.includes(b))).length;
    return cb - ca;
  }).slice(0, 15);
  const muChips = topMus.map(m => {
    const c = (m === _EX_FILTER.mu) ? 'background:var(--green);color:#fff;border-color:var(--green)' : '';
    return `<button class="h-btn" style="padding:4px 9px;font-size:11px;${c}" onclick="exSetFilter('mu','${m}')">${m}</button>`;
  }).join('');
  bar.innerHTML = `
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text3);margin-right:2px">部位:</span>${bpChips}
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text3);margin-right:2px">器械:</span>${eqChips}
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text3);margin-right:2px">目标:</span>${goalChips}
      <span style="color:var(--text3);margin:0 4px 0 6px">水平:</span>${lvlChips}
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text3);margin-right:2px">💪 肌群:</span>${muChips}
    </div>`;
}

function exSetFilter(k, v) {
  _EX_FILTER[k] = (_EX_FILTER[k] === v) ? '' : v;
  exRenderFilters();
  exApplyAndRender();
}

// 从详情抽屉点击主/次要肌群 → 一键跳转训练该肌群
async function exFilterByMuscle(musName) {
  if (!_EX) await loadExerciseLib();
  // 关闭详情抽屉，再打开动作库并预筛肌群
  document.querySelector('.overlay')?.remove();
  await openExerciseLib();
  _EX_FILTER.mu = musName || '';
  exRenderFilters();
  exApplyAndRender();
  showToast?.(`已筛选：训练 ${musName} 的全部动作`);
}

function exResetFilters() {
  _EX_FILTER = { q: '', bp: '', eq: '', goal: '', level: '', mu: '' };
  const inp = document.getElementById('exSearch');
  if (inp) inp.value = '';
  exRenderFilters();
  exApplyAndRender();
}

let _EX_RENDER_TIMER = null;
function exSearchInput(v) {
  _EX_FILTER.q = v.trim();
  clearTimeout(_EX_RENDER_TIMER);
  _EX_RENDER_TIMER = setTimeout(exApplyAndRender, 180); // 180ms 防抖
}

function exApplyAndRender() {
  const grid = document.getElementById('exGrid');
  const stats = document.getElementById('exStatsBar');
  if (!grid || !_EX || !_EX_IDX) return;
  const q = _EX_FILTER.q.toLowerCase();
  const f = _EX_FILTER;
  let list = _EX;
  if (f.bp)    list = list.filter(x => x.bp === f.bp);
  if (f.eq)    list = list.filter(x => x.eq === f.eq);
  if (f.goal)  list = list.filter(x => x.goal === f.goal);
  if (f.level) list = list.filter(x => x.level === f.level);
  if (f.mu) {
    // 匹配主肌群 (mu_zh) 或次要肌群 (sec[]) 任一
    list = list.filter(x =>
      (x.mu_zh && x.mu_zh === f.mu) ||
      (x.mu === f.mu) ||
      (Array.isArray(x.sec) && x.sec.includes(f.mu)) ||
      (x.tgt === f.mu) || (x.tgt_zh === f.mu)
    );
  }
  if (q) {
    list = list.filter(x =>
      (x.n && x.n.toLowerCase().includes(q)) ||
      (x.e && x.e.toLowerCase().includes(q)) ||
      (x.mu_zh && x.mu_zh.toLowerCase().includes(q)) ||
      (x.tgt_zh && x.tgt_zh.toLowerCase().includes(q))
    );
  }
  const muBanner = _EX_FILTER.mu
    ? `<div style="background:linear-gradient(135deg,rgba(48,209,88,.12),rgba(10,132,255,.08));padding:8px 12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
         <div style="font-size:12px;color:var(--text)">💪 <strong>训练「${_EX_FILTER.mu}」</strong>的全部动作</div>
         <button onclick="exSetFilter('mu','')" style="background:transparent;border:1px solid var(--border);color:var(--text2);font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer">✕ 清除</button>
       </div>` : '';
  if (stats) stats.innerHTML = muBanner + `共 ${list.length} / ${_EX.length} 个动作`;
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:30px;text-align:center;color:var(--text3);font-size:12px">未匹配到动作，换个关键词试试。</div>`;
    return;
  }
  // 渲染：前 200 张卡片用 placeholder 缩略图（轻量），点击再加载 GIF
  const MAX_CARDS = 200;
  const slice = list.slice(0, MAX_CARDS);
  grid.innerHTML = slice.map((x, i) => {
    const lvlBg = x.level === 'beginner' ? '#30d158' : x.level === 'intermediate' ? '#ff9f0a' : '#ff453a';
    return `<div class="ex-card" data-i="${i}" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer"
                 onclick="openExerciseDetail('${x.id}')">
      <div style="position:relative;width:100%;padding-top:100%;background:var(--bg3)">
        <div class="ex-thumb" data-id="${x.id}" data-gif="${x.gif}"
             style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--text3);background:linear-gradient(135deg,var(--bg3),var(--bg2))">🏋️</div>
        <span style="position:absolute;top:6px;left:6px;background:${lvlBg};color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600">${LEVEL_LABEL[x.level] || x.level}</span>
        <span style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.45);color:#fff;font-size:9px;padding:2px 6px;border-radius:4px">${BP_LABEL[x.bp] || x.bp}</span>
      </div>
      <div style="padding:8px 10px">
        <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.n}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🎯 ${x.tgt_zh || x.tgt} · ${EQ_LABEL[x.eq] || x.eq}</div>
      </div>
    </div>`;
  }).join('') + (list.length > MAX_CARDS ?
    `<div style="grid-column:1/-1;text-align:center;color:var(--text3);font-size:11px;padding:12px">
       仅展示前 ${MAX_CARDS} 个，请细化筛选缩小范围（剩余 ${list.length - MAX_CARDS} 个）。
     </div>` : '');
  // 懒加载可视区域前 12 张 GIF（IntersectionObserver）
  requestAnimationFrame(exLazyGifs);
}

let _EX_OBS = null;
function exLazyGifs() {
  const grid = document.getElementById('exGrid');
  if (!grid) return;
  if (_EX_OBS) _EX_OBS.disconnect();
  _EX_OBS = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      const id = el.dataset.id;
      const gif = el.dataset.gif;
      if (!gif) continue;
      // base64 id → CDN 路径：videos/0007-4IKbhHV.gif → CDN
      // 注意：CDN 的视频文件没在仓库，需要回退到外网 gymvisual CDN
      // 动图走源仓库 raw.githubusercontent.com (© Gym visual · 已验证 200 OK)
      const cdnUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${gif}`;
      el.dataset.loaded = '1';
      const img = new Image();
      img.alt = id;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      img.onload = () => { el.innerHTML = ''; el.appendChild(img); };
      img.onerror = () => { el.innerHTML = '🏋️'; };
      img.src = cdnUrl;
      _EX_OBS.unobserve(el);
    }
  }, { rootMargin: '120px' });
  grid.querySelectorAll('.ex-thumb[data-loaded=""]').forEach(el => _EX_OBS.observe(el));
  // 标记所有未加载为已请求（防止二次进入时重复）
  grid.querySelectorAll('.ex-thumb').forEach(el => { if (!el.dataset.loaded) el.dataset.loaded = ''; });
}

// 动作详情抽屉：GIF + 中文步骤 + 目标肌群 + 组数建议
async function openExerciseDetail(id) {
  if (!_EX) await loadExerciseLib();
  const ex = _EX.find(x => x.id === id);
  if (!ex) return;
  const gifUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${ex.gif}`;
  const stepsHtml = (ex.steps || []).map((s, i) =>
    `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border)">
       <span style="flex:0;width:22px;height:22px;background:var(--green);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">${i+1}</span>
       <span style="flex:1;font-size:12px;line-height:1.6;color:var(--text)">${s}</span>
     </div>`).join('');
  const secHtml = (ex.sec && ex.sec.length) ?
    `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
       ${ex.sec.map(s => `<span data-mus="${s}" style="background:var(--bg3);font-size:10px;padding:3px 9px;border-radius:8px;cursor:pointer;border:1px solid var(--border)" title="点击查看训练 ${s} 的全部动作" onclick="exFilterByMuscle('${s}')">${s} <span style="opacity:.5;font-size:9px">→</span></span>`).join('')}
     </div>` : '';
  // 训练建议：根据 goal 推导
  const rec = exRecommendSets(ex);
  showOverlay('panel-md', `🏋️ ${ex.n}`,
    `<div style="display:flex;flex-direction:column;gap:10px">
       <div style="position:relative;width:100%;padding-top:100%;background:var(--bg3);border-radius:10px;overflow:hidden">
         <img src="${gifUrl}" alt="${ex.n}" loading="lazy"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
              onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px\\'>🏋️</div>'">
       </div>
       <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px">
         <span style="background:var(--bg3);padding:3px 8px;border-radius:6px">📍 ${BP_LABEL[ex.bp] || ex.bp}</span>
         <span style="background:var(--bg3);padding:3px 8px;border-radius:6px">🎯 ${ex.tgt_zh || ex.tgt}</span>
         <span style="background:var(--bg3);padding:3px 8px;border-radius:6px">🏋️ ${EQ_LABEL[ex.eq] || ex.eq}</span>
         <span style="background:var(--bg3);padding:3px 8px;border-radius:6px">⭐ ${LEVEL_LABEL[ex.level] || ex.level}</span>
       </div>
       <div>
         <div style="font-size:12px;font-weight:600;margin-bottom:4px">🎯 主要肌群</div>
         <div data-mus="${ex.mu_zh || ex.mu}" style="font-size:13px;color:var(--green);font-weight:600;cursor:pointer;display:inline-block;padding:3px 8px;background:rgba(48,209,88,.08);border-radius:6px" title="点击查看训练 ${ex.mu_zh || ex.mu} 的全部动作" onclick="exFilterByMuscle('${ex.mu_zh || ex.mu}')">${ex.mu_zh || ex.mu} <span style="opacity:.5;font-size:11px">→</span></div>
         <div style="font-size:11px;color:var(--text3);margin-top:2px">次要肌群：</div>
         ${secHtml}
       </div>
       <div>
         <div style="font-size:12px;font-weight:600;margin-bottom:4px">📝 动作要点（${(ex.steps||[]).length} 步）</div>
         ${stepsHtml || '<div style="color:var(--text3);font-size:11px">暂无步骤说明</div>'}
       </div>
       <div style="background:var(--bg3);padding:10px;border-radius:8px">
         <div style="font-size:12px;font-weight:600;margin-bottom:4px">💡 组数 × 次数建议</div>
         <div style="font-size:11px;color:var(--text2);line-height:1.6">${rec}</div>
       </div>
       <div style="display:flex;gap:8px">
         <button class="h-btn" style="flex:1" onclick="exSaveFav('${ex.id}')">⭐ 收藏</button>
         <button class="h-btn" onclick="exCopyLink('${ex.id}')">🔗 复制链接</button>
       </div>
       <div style="font-size:10px;color:var(--text3);text-align:center">📚 来源：Gym visual · exercises-dataset (1,324) · 仅供学习</div>
     </div>`);
}

// 根据 goal / level 给出训练建议
function exRecommendSets(ex) {
  const g = ex.goal, lv = ex.level;
  if (g === 'core') return lv === 'beginner'
    ? '核心稳定性 · 3 组 × 30-45 秒 · 组间 30 秒'
    : '核心耐力 · 3-4 组 × 45-60 秒 · 组间 45 秒';
  if (g === 'strength') return lv === 'expert'
    ? '力量极限 · 5 组 × 3-5 次 @ 85-90% 1RM · 组间 3 分钟'
    : lv === 'intermediate'
    ? '肌肥大 · 4 组 × 8-12 次 @ 70-80% · 组间 90 秒'
    : '入门适应 · 3 组 × 12-15 次 · 组间 60 秒';
  if (g === 'cardio') return lv === 'beginner'
    ? '心肺入门 · 3 组 × 60-90 秒 · 组间 60 秒'
    : '心肺高强 · 4 组 × 30-45 秒 HIIT · 组间 30 秒';
  if (g === 'arm') return '手臂孤立 · 3-4 组 × 10-15 次 · 组间 60-90 秒';
  if (g === 'leg') return lv === 'expert'
    ? '腿部力量 · 5 组 × 5-8 次 · 组间 2-3 分钟'
    : '腿部增肌 · 4 组 × 10-12 次 · 组间 90 秒';
  if (g === 'back') return '背部厚度 · 4 组 × 8-12 次 · 组间 90 秒';
  if (g === 'chest') return '胸部肌肥大 · 4 组 × 8-12 次 · 组间 90 秒';
  if (g === 'shoulder') return '肩部三角肌 · 3-4 组 × 10-15 次 · 组间 60-90 秒';
  return '综合训练 · 3 组 × 10-12 次 · 组间 60-90 秒';
}

// 收藏（localStorage）
function exSaveFav(id) {
  try {
    const k = 'bk_ex_favs_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(k, JSON.stringify(arr));
    showToast?.('⭐ 已收藏动作 #' + id);
  } catch (e) { console.error(e); }
}

function exCopyLink(id) {
  const url = location.origin + location.pathname + '#ex-' + id;
  try {
    navigator.clipboard.writeText(url);
    showToast?.('🔗 已复制锚点链接');
  } catch {
    showToast?.('复制失败：当前环境无剪贴板权限');
  }
}

// NSCA/STRENGTH_PROGRAMS 目标 → EX_LIB 筛选映射
// goal key (按 segment:goalKey 命名) → EX_LIB goal (核心/力量/心肺/手臂/腿部/背部/胸部/肩部/全身)
// 注意：mid-school 的 'strength' 跟 adult-full 的 'strength' 撞 key，所以这里按 segmentKey:goalKey 区分
const EX_GOAL_MAP = {
  // adult-full 成人全面
  'adult-full:power':      'strength',
  'adult-full:strength':   'strength',
  'adult-full:endurance':  'cardio',
  'adult-full:core':       'core',
  // adult-specific 成人专项
  'adult-specific:speed':        'cardio',
  'adult-specific:hypertrophy':  'strength',
  'adult-specific:peak':         'strength',
  'adult-specific:aerobic':      'cardio',
  // mid-school 中考
  'mid-school:endurance':  'cardio',
  'mid-school:jump':       'leg',
  'mid-school:strength':  'strength',
  'mid-school:throw':      'shoulder',
  // high-school 高考
  'high-school:sprint':   'cardio',
  'high-school:jump2':    'leg',
  'high-school:throw2':   'shoulder',
  'high-school:endur2':   'cardio',
  // 个人专项计划 (my-shuttle / fitness-general / competition-prep)
  'my-shuttle':       'leg',
  'fitness-general':  'strength',
  'competition-prep': 'cardio',
};
async function exOpenByGoal(segmentKey, goalKey) {
  // 优先按 segmentKey:goalKey 查，fallback 到裸 goalKey
  const mapKey = (segmentKey && goalKey) ? `${segmentKey}:${goalKey}` : (goalKey || segmentKey || '');
  const exGoal = EX_GOAL_MAP[mapKey] || EX_GOAL_MAP[goalKey] || EX_GOAL_MAP[segmentKey] || '';
  await openExerciseLib();
  // 打开后再覆盖筛选
  _EX_FILTER.goal = exGoal;
  exRenderFilters();
  exApplyAndRender();
  const segLabel = STRENGTH_PROGRAMS[segmentKey]?.label || segmentKey || '';
  const goalLabel = (STRENGTH_PROGRAMS[segmentKey]?.goals?.[goalKey]?.label) || goalKey || '';
  showToast?.(`已跳转：${segLabel}${goalLabel ? ' · ' + goalLabel : ''} → ${GOAL_LABEL[exGoal] || '全部动作'}`);
}

// 周期规划器：在原有 layout 顶部加一行按钮，跳到动作库
function openCyclePlanner() {
  const segPicker = Object.entries(STRENGTH_PROGRAMS).map(([k, p]) =>
    `<button class="h-btn" style="flex:1;${_selectedSegment === k ? 'background:var(--green);color:#fff' : ''}" onclick="setSegment('${k}')">${p.icon} ${p.label}</button>`).join('');
  showOverlay('panel panel-wide', '📅 周期化训练规划器',
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
       <button class="h-btn" onclick="openExerciseLib()" style="background:var(--green);color:#fff">
         🏋️ 体能动作库（1,324 动作）
       </button>
       <button class="h-btn" onclick="openFatigueCheck()">🩺 疲劳自检</button>
     </div>
     <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${segPicker}</div>
     <div id="cyclePlanBody"></div>
     <div style="display:flex;gap:8px;margin-top:12px">
       <button class="h-btn" style="flex:1" onclick="openExerciseLib()">📚 浏览动作库</button>
       <button class="h-btn" onclick="this.closest('.overlay').remove()">关闭</button>
     </div>`);
  renderCyclePlan();
}

// 心理训练周期规划器
let _selectedPsych = localStorage.getItem('bk_psych_segment') || 'competition-prep';
function setPsychSegment(key) { _selectedPsych = key; localStorage.setItem('bk_psych_segment', key); renderPsychPlan(); }
function openPsychHub() {
  const segPicker = Object.entries(PSYCHOLOGY_PROGRAMS).map(([k, p]) =>
    `<button class="h-btn" style="flex:1;${_selectedPsych === k ? 'background:var(--purple);color:#fff' : ''}" onclick="setPsychSegment('${k}')">${p.icon} ${p.label}</button>`).join('');
  showOverlay('panel panel-wide', '🧠 心理训练规划器',
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${segPicker}</div>
     <div id="psychPlanBody"></div>`);
  renderPsychPlan();
}
function renderPsychPlan() {
  const body = document.getElementById('psychPlanBody');
  if (!body) return;
  const prog = PSYCHOLOGY_PROGRAMS[_selectedPsych];
  if (!prog) return;
  const goalGrid = Object.entries(prog.goals).map(([k, g]) =>
    `<div style="background:var(--bg3);padding:10px;border-radius:8px;border-left:3px solid ${g.color}">
       <div style="font-size:12px;font-weight:600;color:${g.color}">${g.label}</div>
       <div style="font-size:11px;color:var(--text2);margin-top:4px">${g.items.slice(0,3).join(' · ')}</div>
       <div style="font-size:10px;color:var(--text3);margin-top:2px">+${g.items.length - 3} 项</div>
    </div>`).join('');
  const r = prog.recovery;
  body.innerHTML = `
    <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${prog.icon} ${prog.label} <span style="font-size:10px;color:var(--text3)">${prog.age} · 来源 ${prog.source}</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">${prog.summary}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;font-size:11px">
        <div>😴 睡眠：${r.sleep}</div><div>🧘 心理：${r.mental || '正常'}</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:600;margin:8px 0 6px">🎯 心理训练目标库</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${goalGrid}</div>`;
}

// 营养周期规划器
let _selectedNutr = localStorage.getItem('bk_nutr_segment') || 'competition-cycle';
function setNutrSegment(key) { _selectedNutr = key; localStorage.setItem('bk_nutr_segment', key); renderNutrPlan(); }
function openNutrHub() {
  const segPicker = Object.entries(NUTRITION_PROGRAMS).map(([k, p]) =>
    `<button class="h-btn" style="flex:1;${_selectedNutr === k ? 'background:var(--orange);color:#fff' : ''}" onclick="setNutrSegment('${k}')">${p.icon} ${p.label}</button>`).join('');
  showOverlay('panel panel-wide', '🍎 营养规划器',
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${segPicker}</div>
     <div id="nutrPlanBody"></div>`);
  renderNutrPlan();
}
function renderNutrPlan() {
  const body = document.getElementById('nutrPlanBody');
  if (!body) return;
  const prog = NUTRITION_PROGRAMS[_selectedNutr];
  if (!prog) return;
  const goalGrid = Object.entries(prog.goals).map(([k, g]) =>
    `<div style="background:var(--bg3);padding:10px;border-radius:8px;border-left:3px solid ${g.color}">
       <div style="font-size:12px;font-weight:600;color:${g.color}">${g.label}</div>
       <div style="font-size:11px;color:var(--text2);margin-top:4px">${g.items.slice(0,3).join(' · ')}</div>
       <div style="font-size:10px;color:var(--text3);margin-top:2px">+${g.items.length - 3} 项</div>
    </div>`).join('');
  const r = prog.recovery;
  body.innerHTML = `
    <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${prog.icon} ${prog.label} <span style="font-size:10px;color:var(--text3)">${prog.age} · 来源 ${prog.source}</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">${prog.summary}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;font-size:11px">
        <div>💧 水合：${r.hydration}</div><div>🥩 蛋白：${r.protein}</div>
        <div>😴 睡眠：${r.sleep}</div><div>⏱️ 休息：${r.rest}</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:600;margin:8px 0 6px">🎯 营养策略目标库</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${goalGrid}</div>`;
}

// ===== 个人专项计划规划器 =====
let _selectedPersonal = localStorage.getItem('bk_personal_segment') || '';
function openPersonalHub() {
  const list = getPersonalPrograms();
  const progs = list.length ? list : DEFAULT_PERSONAL;
  // 初始化选中第一个
  if (!_selectedPersonal || !progs.find(p=>p.id===_selectedPersonal)) {
    _selectedPersonal = progs[0]?.id || '';
  }
  const segPicker = progs.map(p =>
    `<button class="h-btn" style="flex:1;${_selectedPersonal === p.id ? 'background:var(--blue);color:#fff' : ''}" onclick="setPersonalSegment('${p.id}')">${p.icon} ${p.name}</button>`).join('');
  showOverlay('panel panel-wide', '👤 个人专项计划',
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${segPicker}</div>
     <button class="h-btn" style="width:100%;margin-bottom:10px;background:var(--bg3)" onclick="addNewPersonalPlan()">➕ 创建新计划</button>
     <div id="personalPlanBody"></div>`);
  renderPersonalPlan();
}
function setPersonalSegment(key) { _selectedPersonal = key; localStorage.setItem('bk_personal_segment', key); renderPersonalPlan(); }
function renderPersonalPlan() {
  const body = document.getElementById('personalPlanBody');
  if (!body) return;
  const list = getPersonalPrograms();
  const progs = list.length ? list : DEFAULT_PERSONAL;
  const prog = progs.find(p=>p.id===_selectedPersonal);
  if (!prog) { body.innerHTML = '<div style="text-align:center;color:var(--text2)">暂无计划，请创建</div>'; return; }
  const goalGrid = (prog.goals||[]).map(g =>
    `<div style="background:var(--bg3);padding:10px;border-radius:8px;border-left:3px solid ${g.color||'var(--blue)'}">
       <div style="font-size:12px;font-weight:600;color:${g.color||'var(--blue)'}">${g.label}</div>
       <div style="font-size:11px;color:var(--text2);margin-top:4px">${(g.items||[]).slice(0,3).join(' · ')}</div>
       <div style="font-size:10px;color:var(--text3);margin-top:2px">+${(g.items||[]).length - 3} 项</div>
    </div>`).join('');
  const r = prog.recovery||{};
  body.innerHTML = `
    <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${prog.icon||'📋'} ${prog.name}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">${prog.desc||''}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;font-size:11px">
        <div>😴 睡眠：${r.sleep||'--'}</div><div>⏱️ 休息：${r.rest||'--'}</div>
        <div>💧 水合：${r.hydration||'--'}</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:600;margin:8px 0 6px">🎯 训练目标库</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${goalGrid}</div>`;
}
function addNewPersonalPlan() {
  showPrompt('计划名称（如：我的乒乓球专项）', (name) => {
    if (!name) return;
    showPrompt('图标（emoji，如 🏓）', (icon) => {
      icon = icon || '🎯';
      showPrompt('计划描述', (desc) => {
        desc = desc || '自定义训练计划';
        const newPlan = {
          id: 'custom-' + Date.now(),
          name, icon, desc,
          goals: [
            { label: '基础训练', color: '#0a84ff', items: ['内容1','内容2','内容3'] }
          ],
          recovery: { rest: '每周1天', sleep: '8h' }
        };
        const list = getPersonalPrograms();
        list.push(newPlan);
        savePersonalPrograms(list);
        _selectedPersonal = newPlan.id;
        localStorage.setItem('bk_personal_segment', _selectedPersonal);
        openPersonalHub(); // 刷新
      }, { defaultValue: '自定义训练计划' });
    }, { placeholder: '🎯', defaultValue: '🎯' });
  }, { title: '新建自定义计划' });
}
const MODULE_CONTENT = {
  nutrition: [
    // 1. TDEE
    `<div class="reader-module-content">
      <h2>🔥 TDEE 每日总能耗详解</h2>
      <p><strong>TDEE</strong>（Total Daily Energy Expenditure）= 基础代谢（BMR）+ 食物热效应（TEF）+ 活动消耗（PA）+ 运动消耗（EAT）。</p>
      <h3>基础代谢 BMR（Mifflin-St Jeor 公式）</h3>
      <p><strong>男性</strong>：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5</p>
      <p><strong>女性</strong>：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161</p>
      <p>示例：70kg / 175cm / 25岁男性 <br>BMR = 10×70 + 6.25×175 - 5×25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75 kcal</p>
      <h3>活动系数（PA）</h3>
      <table><tr><th>级别</th><th>系数</th><th>描述</th></tr><tr><td>久坐</td><td>1.2</td><td>办公室工作，几乎不运动</td></tr><tr><td>轻度</td><td>1.375</td><td>每周1-3天轻度运动</td></tr><tr><td>中度</td><td>1.55</td><td>每周3-5天中等运动（推荐）</td></tr><tr><td>高度</td><td>1.725</td><td>每周6-7天高强度训练</td></tr><tr><td>极高</td><td>1.9</td><td>专业运动员/体力劳动者</td></tr></table>
      <p><strong>计算</strong>：TDEE = BMR × 活动系数</p>
      <h3>食物热效应 TEF</h3>
      <p>蛋白质 TEF = 20-30%（最高）<br>碳水 TEF = 5-10%<br>脂肪 TEF = 0-3%<br>混合膳食平均 TEF = 总热量 × 10%</p>
      <h3>减脂/增肌热量调整</h3>
      <p><strong>减脂</strong>：TDEE - 300~500 kcal/天（每周减0.3-0.5kg）<br><strong>增肌</strong>：TDEE + 200~400 kcal/天（每周增0.2-0.3kg）<br><strong>维持</strong>：TDEE 不变</p>
      <p class="tip">💡 不要每天称体重。每周固定时间称一次，观察2周趋势再调整热量。快速减重（>1kg/周）会导致肌肉流失。</p>
      <hr><p><em>参考文献：Mifflin MD, et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990. / NSCA-CPT 营养指南第4章</em></p>
    </div>`,
    // 2. 三大营养素
    `<div class="reader-module-content">
      <h2>🥩 三大营养素分配</h2>
      <p>运动营养的核心是三大宏量营养素的合理分配：蛋白质、碳水化合物、脂肪。</p>
      <h3>蛋白质（Protein）</h3>
      <table><tr><th>目标</th><th>推荐量 (g/kg/天)</th><th>总热量占比</th></tr><tr><td>维持</td><td>1.2 - 1.6</td><td>15-20%</td></tr><tr><td>增肌</td><td>1.6 - 2.0</td><td>20-25%</td></tr><tr><td>减脂</td><td>2.0 - 2.4</td><td>25-30%</td></tr></table>
      <p>蛋白质每次摄入上限约 0.4-0.55g/kg（最佳吸收），例如70kg运动员每餐约需28-38g蛋白。超过部分并不会增加肌肉合成速度，而是氧化供能或转化为脂肪。</p>
      <h3>碳水化合物（Carbohydrate）</h3>
      <table><tr><th>训练强度</th><th>推荐量 (g/kg/天)</th><th>总热量占比</th></tr><tr><td>休息日/低强度</td><td>2 - 3</td><td>40-45%</td></tr><tr><td>中等训练</td><td>3 - 5</td><td>45-55%</td></tr><tr><td>高强度/专业训练</td><td>5 - 7</td><td>55-65%</td></tr></table>
      <p>优先选择低GI碳水（全谷物、燕麦、薯类、豆类），训练后2小时内可用高GI碳水快速补充肌糖原。</p>
      <h3>脂肪（Fat）</h3>
      <p>推荐量：0.8 - 1.0 g/kg/天（占总热量20-25%）<br>低于20%会影响睾酮水平和脂溶性维生素吸收。</p>
      <table><tr><th>类型</th><th>推荐来源</th><th>占比</th></tr><tr><td>单不饱和</td><td>橄榄油、牛油果、坚果</td><td>10-15%</td></tr><tr><td>多不饱和（Omega-3）</td><td>深海鱼、亚麻籽、奇亚籽</td><td>5-10%</td></tr><tr><td>饱和脂肪</td><td>动物脂肪、椰子油</td><td>＜10%</td></tr><tr><td>反式脂肪</td><td>油炸食品、加工食品</td><td>＜1%</td></tr></table>
      <h3>实战比例速查</h3>
      <p><strong>增肌期</strong>：蛋白20% / 碳水55% / 脂肪25%（总TDEE+200~400）<br><strong>减脂期</strong>：蛋白30% / 碳水40% / 脂肪30%（总TDEE-300~500）<br><strong>维持期</strong>：蛋白20% / 碳水50% / 脂肪30%</p>
      <p class="tip">💡 70kg运动员增肌期（TDEE≈2600kcal + 300 = 2900kcal）：蛋白145g（20%）/ 碳水399g（55%）/ 脂肪81g（25%）</p>
      <hr><p><em>参考文献：NSCA-CPT第5版第11章·运动营养 / JISSN 2017, 14:31</em></p>
    </div>`,
    // 3. 水合
    `<div class="reader-module-content">
      <h2>💧 确定水合需求</h2>
      <p>水合状态直接影响运动表现。体重下降2%即可导致力量下降20%、耐力下降30%。</p>
      <h3>每日总水合需求</h3>
      <p><strong>日常基础</strong>：体重(kg) × 33ml<br><strong>训练加量</strong>：训练时长(min) × 12ml<br><strong>高温修正</strong>：环境温度>30°C 加20%</p>
      <p>示例：70kg运动员，训练60分钟，常温 → 70×33 + 60×12 = 2310 + 720 = <strong>3030ml</strong></p>
      <h3>训练中的水合策略</h3>
      <table><tr><th>时间</th><th>建议</th><th>量参考</th></tr><tr><td>训练前2h</td><td>补充500-600ml</td><td>一大瓶水</td></tr><tr><td>训练前15-30min</td><td>补充200-300ml</td><td>一小瓶水</td></tr><tr><td>训练中（每15-20min）</td><td>补充150-250ml</td><td>每15分钟喝几口</td></tr><tr><td>训练后</td><td>补回流失量的125-150%</td><td>称体重差×1.25</td></tr></table>
      <h3>判断水合状态的简易方法</h3>
      <p>① <strong>尿液颜色法</strong>：浅柠檬黄=水合良好，深琥珀色=脱水<br>② <strong>体重法</strong>：训练前后称体重差，每减1kg≈脱水1L<br>③ <strong>口渴感法</strong>：感到口渴时已脱水1-2%，不要等到口渴才补水</p>
      <h3>运动饮料的选择</h3>
      <p>训练<60分钟：白水足够<br>训练60-90分钟：6-8%碳水溶液（500ml水+30g糖+少量盐）<br>训练>90分钟：专业运动饮料+电解质补充</p>
      <p class="tip">💡 自制运动饮料：1L水 + 60g蜂蜜/糖 + 1g盐（约1/4茶匙）+ 少许柠檬汁</p>
      <hr><p><em>参考文献：ACSM Position Stand: Exercise and Fluid Replacement, 2007 / NSCA-CPT 营养学第5章</em></p>
    </div>`,
    // 4. 恢复时间线
    `<div class="reader-module-content">
      <h2>⏰ 训练后恢复时间线</h2>
      <p>训练后的恢复是训练效果的保障。科学恢复时间线根据训练后不同阶段，采取不同的恢复策略。

      <h3>训练后0-30分钟：快速恢复窗口</h3>
      <p><strong>目标</strong>：迅速补充肌糖原、启动肌肉修复<br><strong>碳水</strong>：1.0-1.2g/kg（高GI，如香蕉+运动饮料）<br><strong>蛋白</strong>：0.3-0.4g/kg（乳清蛋白最佳，快速吸收）<br><strong>水合</strong>：补回流失体重的125-150%</p>
      <p>示例：70kg运动员 → 70g碳水 + 25g蛋白 ≈ 一根香蕉+500ml运动饮料+一杯蛋白粉</p>

      <h3>训练后30分钟-2小时：正餐窗口</h3>
      <p><strong>目标</strong>：持续补充营养素、促进组织修复<br><strong>碳水化合物</strong>：1.5-2.0g/kg（中低GI为主）<br><strong>蛋白质</strong>：0.4-0.5g/kg（整蛋白如鸡胸肉、鱼、鸡蛋）<br><strong>脂肪</strong>：少量（不影响消化吸收）<br><strong>蔬菜</strong>：抗氧化物+微量元素</p>

      <h3>训练后2小时-睡前：恢复巩固期</h3>
      <p><strong>目标</strong>：降低皮质醇、促进睡眠质量<br><strong>恢复手段</strong>：泡沫轴10-15分钟（放松筋膜）<br><strong>拉伸</strong>：静态拉伸15-30秒每个肌群<br><strong>冷热交替浴</strong>：冷水1-3分钟 + 温水3-5分钟 × 3轮</p>
      <p><strong>营养补充</strong>：缓释蛋白（酪蛋白20-30g）或睡前酸奶+坚果</p>

      <h3>训练后次日：超量恢复期</h3>
      <p>训练后24-48小时出现超量恢复（Supercompensation）：
      <br>肌糖原合成速率峰值在训练后12-24小时
      <br>肌肉蛋白合成在训练后24-48小时持续升高
      <br>神经系统恢复需24-72小时</p>

      <h3>睡眠：最重要的恢复手段</h3>
      <table><tr><th>睡眠时长</th><th>恢复效果</th><th>生长激素分泌</th></tr><tr><td><6h</td><td>不足</td><td>↓ 70%</td></tr><tr><td>7-8h</td><td>良好</td><td>峰值（深度睡眠）</td></tr><tr><td>>9h</td><td>过剩</td><td>无明显额外收益</td></tr></table>

      <h3>深度睡眠：生长激素的「主战场」</h3>
      <p>生长激素（GH）70-80%在入睡后第一个90分钟内的深度睡眠（N3阶段）脉冲式分泌，每晚3-5个分泌峰。它直接驱动肌肉修复、脂肪分解、骨骼重建。<strong>深睡少1小时 = 训练效果打7折</strong>。</p>
      <table><tr><th>睡眠阶段</th><th>时段</th><th>主要功能</th></tr><tr><td>N1 浅睡</td><td>入睡5-15min</td><td>过渡期，肌肉放松</td></tr><tr><td>N2 中度睡眠</td><td>整晚50-60%</td><td>记忆整合，体温下降</td></tr><tr><td>N3 深度睡眠</td><td>前半夜2小时为主</td><td>GH分泌、肌肉修复、免疫</td></tr><tr><td>REM 快速眼动</td><td>后半夜增多</td><td>情绪调节、技能固化</td></tr></table>

      <h3>睡眠卫生学 12 条</h3>
      <ol><li><strong>固定作息</strong>：每天上床/起床时间误差<30分钟（周末也不例外）</li><li><strong>睡前90分钟无屏幕</strong>：蓝光抑制褪黑素释放3-4小时</li><li><strong>室温18-20°C</strong>：身体核心温度下降才能入睡，室温过高会减少深睡</li><li><strong>全黑环境</strong>：用遮光窗帘+眼罩，光线让褪黑素减少50%</li><li><strong>睡前避免咖啡因</strong>：咖啡因半衰期5-6小时，下午2点后别喝</li><li><strong>酒精≠助眠</strong>：酒精会破坏REM睡眠，睡前3小时别喝</li><li><strong>晚餐别太晚</strong>：睡前2-3小时完成晚餐，避免消化影响深睡</li><li><strong>睡前放松仪式</strong>：温水澡（38-40°C，15min）/阅读纸质书/拉伸</li><li><strong>床只用来睡觉</strong>：不在床上工作、看手机、思考问题</li><li><strong>白天有阳光</strong>：晨起晒10-15分钟阳光，校准生物钟</li><li><strong>运动时机</strong>：高强度训练距睡前至少3小时（瑜伽等低强度可近睡）</li><li><strong>失眠时不要看表</strong>：起床去另一个房间做无聊的事，困了再回床</li></ol>

      <h3>最佳睡眠时机</h3>
      <p><strong>理想入睡时间</strong>：22:00-23:00（与褪黑素分泌高峰对齐）<br><strong>理想起床时间</strong>：6:00-7:30（含90分钟睡眠周期×4-5个完整周期）<br><strong>深度睡眠密度</strong>：前半夜是后半夜的2-3倍，<u>早睡1小时=多1小时深睡</u></p>

      <h3>训练日的午睡策略</h3>
      <table><tr><th>午睡时长</th><th>效果</th><th>适用场景</th></tr><tr><td>10-20分钟（咖啡午睡）</td><td>警觉性+30%</td><td>下午训练前快速充电</td></tr><tr><td>30-45分钟</td><td>认知+体能恢复</td><td>周末大训练量后</td></tr><tr><td>90分钟（完整周期）</td><td>含REM，情绪恢复</td><td>极度疲劳或比赛恢复</td></tr><tr><td>>60分钟但<90分钟</td><td>⚠️ 睡眠惯性</td><td>不推荐，会越睡越累</td></tr></table>
      <p class='tip'>💡 咖啡午睡（Napuccino）：喝完咖啡立刻小睡20分钟，醒来咖啡因起效+警觉性双倍提升。下午训练前最强技巧。</p>

      <h3>失眠 / 轮班运动员对策</h3>
      <p>① <strong>褪黑素补充</strong>：0.5-3mg，睡前30分钟（短期使用，长期依赖会降低自身分泌）<br>② <strong>镁补充</strong>：甘氨酸镁 200-400mg，睡前30分钟（放松神经肌肉）<br>③ <strong>渐进式肌肉放松</strong>：从脚趾到头顶，每组肌肉绷紧5秒+放松10秒<br>④ <strong>4-7-8呼吸法</strong>：吸气4秒-屏息7秒-呼气8秒，4轮循环可诱导入睡<br>⑤ <strong>蓝光过滤眼镜</strong>：夜间训练或值班必备，琥珀色镜片过滤>90%蓝光</p>

      <p class='tip'>💡 训练后不恢复=训练没效果。恢复不是偷懒，是训练的一部分。</p>
      <hr><p><em>参考文献：NSCA-CPT第6版·恢复与再生 / ISSN 2018 运动恢复指南 / Walker M《Why We Sleep》2017 / Halson SL. Sleep in elite athletes. Sports Med 2014</em></p>
    </div>`,
    // 5. 营养窗口
    `<div class="reader-module-content"><h2>🍽️ 训练前后营养窗口</h2>
      <p>训练前后的营养安排直接影响训练质量和恢复效果。不重视营养窗口，训练效果至少打五折。</p>

      <h3>训练前餐（训练前1.5-3小时）</h3>
      <p><strong>目标</strong>：保证训练时能量充足、防止低血糖<br><strong>碳水</strong>：1-2g/kg（中低GI，缓慢释放能量）<br><strong>蛋白</strong>：0.15-0.3g/kg（少量即可）<br><strong>脂肪</strong>：低（<15g，避免消化不良）<br><strong>水</strong>：训练前2小时补充500-600ml</p>
      <p>推荐餐单：</p>
      <ul><li>全麦面包2片 + 花生酱 + 香蕉</li><li>燕麦粥（50g） + 半个苹果 + 少量坚果</li><li>希腊酸奶 + 莓果 + 少量蜂蜜</li></ul>

      <h3>训练中补给（>60分钟训练）</h3>
      <p><strong>碳水</strong>：30-60g/小时（6-8%碳水溶液）<br><strong>水合</strong>：每15-20分钟150-250ml<br><strong>电解质</strong>：训练>90分钟补充钠（300-500mg/L）</p>

      <h3>训练后补餐（训练后30分钟内）</h3>
      <p><strong>目标</strong>：最大化肌糖原再合成、启动肌肉修复<br><strong>碳水</strong>：1.0-1.5g/kg（高GI，尽快补充糖原）<br><strong>蛋白</strong>：0.3-0.5g/kg（乳清蛋白首选）<br><strong>蛋白碳水比</strong>：1:3 到 1:4</p>
      <p>推荐：蛋白粉（25g）+ 运动饮料（500ml）+ 香蕉1根</p>

      <h3>不同训练类型的营养微调</h3>
      <table><tr><th>训练类型</th><th>训练前</th><th>训练后</th></tr><tr><td>力量训练</td><td>正常碳水+高蛋白</td><td>高蛋白+中碳水</td></tr><tr><td>耐力训练</td><td>高碳水（1-2g/kg）</td><td>高碳水+中蛋白</td></tr><tr><td>高强度间歇</td><td>高碳水+充足水合</td><td>高碳水+蛋白+电解质</td></tr><tr><td>技术训练</td><td>中碳水+正常水合</td><td>正常恢复餐即可</td></tr></table>
      <p class='tip'>💡 空腹训练会加速肌肉分解。即使是晨练，也建议吃一根香蕉或半片面包再训练。</p>

      <h3>5.5 比赛日全天营养时间线</h3>
      <p>比赛日的营养安排与日常训练不同——既要保证上场时能量充沛，又要避免消化负担影响发挥。下面以一场 <strong>14:00 开始的羽毛球比赛</strong> 为例，按时间顺序给出 7 个关键节点的营养策略：</p>
      <table><tr><th>时间点</th><th>目标</th><th>推荐食物</th><th>大致量参考</th></tr>
      <tr><td>起床 09:00</td><td>补水 + 启动代谢</td><td>温水 300ml + 全麦面包 1 片 + 煮蛋 1 个</td><td>约 250 kcal</td></tr>
      <tr><td>赛前 3h 主餐 11:00</td><td>储备糖原（最关键的一餐）</td><td>燕麦 50g + 鸡胸肉 100g + 蔬菜 200g</td><td>500-700 kcal（碳水 2g/kg）</td></tr>
      <tr><td>赛前 1h 加餐 13:00</td><td>补充血糖</td><td>香蕉 1 根 + 运动饮料 200ml</td><td>约 200 kcal</td></tr>
      <tr><td>赛前 30min 顶能量 13:30</td><td>最后一击能量</td><td>半根香蕉 + 温水 100ml</td><td>约 50 kcal</td></tr>
      <tr><td>比赛中（>60min）</td><td>维持能量 + 补水</td><td>运动饮料（4-6% 碳水）+ 少量清水</td><td>30-60g 碳水/小时 + 150-250ml/15min</td></tr>
      <tr><td>赛后 30min 黄金窗口 14:45</td><td>启动恢复</td><td>蛋白粉 1 勺（25g）+ 香蕉 1 根 + 巧克力奶 300ml</td><td>25g 蛋白 + 70g 碳水</td></tr>
      <tr><td>赛后 3h 正餐 17:00</td><td>全面修复</td><td>三文鱼/鸡腿 150g + 糙米 100g + 西兰花 + 橄榄油</td><td>约 600-800 kcal</td></tr>
      </table>
      <p><strong>三条比赛日铁律</strong>：</p>
      <ol><li><strong>赛前 3h 主餐不能省</strong>：这是肌糖原储备的最后一击，不吃=后半场明显掉速</li><li><strong>赛前 30min 只能吃"轻"</strong>：固体食物会让跳杀时胃部不适，最多半根香蕉</li><li><strong>赛后 30min 内必补</strong>：错过这个窗口，肌糖原再合成速率降低 50%</li></ol>

      <h3>5.6 业余球友 5 大营养误区</h3>
      <p>营养理论都对，但执行起来就出错——这是业余球友最常见的 5 个「知错犯」：</p>
      <table><tr><th>#</th><th>误区</th><th>为什么错</th><th>正确做法</th></tr>
      <tr><td>1</td><td><strong>空腹训练更减肥</strong></td><td>空腹有氧时身体 60% 能量来自肌肉蛋白分解，肌肉流失 &gt; 脂肪流失</td><td>晨练前 1 根香蕉或半片面包垫底</td></tr>
      <tr><td>2</td><td><strong>训练后只喝蛋白粉</strong></td><td>只补蛋白不补碳水 → 肌糖原恢复不足 → 下次训练掉速 20%</td><td>蛋白:碳水 = 1:3，至少 70g 碳水 + 25g 蛋白</td></tr>
      <tr><td>3</td><td><strong>训练中不喝水省事</strong></td><td>脱水 2% 时体能表现下降 10-20%，注意力也明显下滑</td><td>每 15-20 分钟喝几口（约 150-250ml）</td></tr>
      <tr><td>4</td><td><strong>赛前不吃饭怕吐</strong></td><td>血糖低 → 头晕乏力 → 上场 20 分钟就腿软</td><td>赛前 3h 主餐 + 赛前 30min 半根香蕉</td></tr>
      <tr><td>5</td><td><strong>训练后大吃大喝"补回来"</strong></td><td>60 分钟中等强度训练 ≈ 400-500 kcal ≈ 1 个汉堡；吃 1 小时自助餐 &gt; 跑 3 小时</td><td>训练后吃恢复餐（碳水+蛋白），不是庆功宴</td></tr>
      </table>
      <p class='tip'>💡 营养不是"额外加分"，是训练的<strong>一部分</strong>。练得好但吃错了，等于练了 80% 扔了 50%。NSCA 原则：<u>先评估身体，再设计训练，再匹配营养</u>——三个环节缺一不可。</p>
      <hr><p><em>参考文献：ACSM Joint Position Statement: Nutrition and Athletic Performance, 2016 / NSCA-CPT 运动营养 / Burke L. Practical Sports Nutrition (2020)</em></p>
    </div>`,
    // 6. 蛋白质策略
    `<div class="reader-module-content"><h2>🥩 蛋白质摄入策略</h2>
      <p>蛋白质是肌肉修复和增长的核心原料。合理分配蛋白质摄入比总量更重要。</p>

      <h3>每日总量的误区</h3>
      <p>很多人追求一天吃了多少克蛋白，但80%的人一天摄入的蛋白集中在晚餐一顿，其他餐不达标。肌肉蛋白合成（MPS）每次被激活持续约3-5小时，之后进入不应期。所以分餐比总量更重要。</p>

      <h3>蛋白质分配：4-5餐 × 0.4g/kg</h3>
      <p>理想模式：每餐摄入 0.4-0.55g/kg，间隔 3-5 小时</p>
      <p>70kg运动员参考：</p>
      <ul><li>早餐：28g（3个鸡蛋 + 一杯牛奶）</li><li>加餐：20g（希腊酸奶 200g）</li><li>午餐：35g（鸡胸肉 120g）</li><li>训练后：25g（蛋白粉1勺）</li><li>晚餐：35g（三文鱼 150g）</li><li>总计：约 143g（≈2.0g/kg）</li></ul>

      <h3>蛋白质来源质量排名</h3>
      <table><tr><th>来源</th><th>PDCAAS</th><th>特点</th></tr><tr><td>乳清蛋白</td><td>1.0</td><td>吸收最快，训练后首选</td></tr><tr><td>酪蛋白</td><td>1.0</td><td>缓释6-8h，睡前推荐</td></tr><tr><td>鸡蛋</td><td>1.0</td><td>氨基酸谱完整</td></tr><tr><td>牛肉/鸡胸肉</td><td>0.9-1.0</td><td>整蛋白+微量元素</td></tr><tr><td>鱼</td><td>0.9-1.0</td><td>富含Omega-3</td></tr><tr><td>大豆</td><td>0.9-1.0</td><td>植物蛋白最佳</td></tr><tr><td>大米/豌豆蛋白</td><td>0.7-0.8</td><td>需互补搭配</td></tr></table>

      <h3>亮氨酸触发阈值</h3>
      <p>每餐至少含 2-3g 亮氨酸才能最大化激活 MPS：<br>100g鸡胸肉 ≈ 2.8g亮氨酸<br>3个鸡蛋 ≈ 2.1g亮氨酸<br>1勺蛋白粉 ≈ 2.5g亮氨酸</p>

      <h3>特殊场景</h3>
      <p><strong>减脂期</strong>：蛋白提高到2.0-2.4g/kg，防止肌肉流失<br><strong>素食者</strong>：需要比正常多20-30%蛋白，注意互补（豆类+谷物）<br><strong>老年运动员</strong>：每餐需要更多亮氨酸（3-4g）对抗合成抵抗</p>
      <p class='tip'>💡 蛋白不是越多越好。超过2.4g/kg的额外蛋白不会增加肌肉，反而增加肾脏负担。</p>
      <hr><p><em>参考文献：Schoenfeld BJ, Aragon AA. How much protein can the body use? JISSN 2018 / NSCA-CPT Nutrition</em></p>
    </div>`,
    // 7. 电解质平衡
    `<div class="reader-module-content"><h2>💧 电解质平衡</h2>
      <p>电解质是维持神经传导和肌肉收缩的关键。大量出汗导致的电解质失衡是抽筋和疲劳的主要原因。</p>

      <h3>主要电解质及其功能</h3>
      <table><tr><th>电解质</th><th>功能</th><th>推荐日摄入</th><th>主要来源</th></tr><tr><td>钠 (Na+)</td><td>水平衡、神经信号</td><td>1500-2300mg</td><td>食盐、运动饮料</td></tr><tr><td>钾 (K+)</td><td>肌肉收缩、心悸稳定</td><td>3500-4700mg</td><td>香蕉、土豆、绿叶菜</td></tr><tr><td>钙 (Ca2+)</td><td>骨健康、肌肉收缩</td><td>1000-1300mg</td><td>奶制品、绿叶菜、豆腐</td></tr><tr><td>镁 (Mg2+)</td><td>肌肉放松、能量代谢</td><td>310-420mg</td><td>坚果、豆类、全谷物</td></tr><tr><td>氯 (Cl-)</td><td>胃酸、电解质平衡</td><td>2300-3600mg</td><td>食盐</td></tr></table>

      <h3>运动中电解质流失</h3>
      <p>1小时高强度羽毛球训练平均流失：<br>钠：800-1500mg<br>钾：200-400mg<br>镁：10-30mg</p>

      <h3>电解质补充策略</h3>
      <p><strong>训练<60分钟</strong>：白水足够<br><strong>训练60-90分钟</strong>：运动饮料（含钠300-500mg/L）<br><strong>训练>90分钟或高温环境</strong>：专业电解质粉 + 碳水</p>

      <h3>自制电解质饮料</h3>
      <p>1L水 + 1/4茶匙盐（≈500mg钠）+ 60g蜂蜜/糖 + 柠檬汁少许 + 可选：200mg镁粉</p>

      <h3>抽筋预防</h3>
      <p><strong>训练前</strong>：吃一根香蕉（钾）+ 喝足水<br><strong>训练中</strong>：每30分钟补充电解质<br><strong>训练后</strong>：多吃绿叶蔬菜和坚果<br><strong>长期</strong>：注意镁摄入（70%的人缺镁）</p>
      <p class='tip'>💡 半夜小腿抽筋往往是镁不足。睡前补充200-400mg镁可显著改善。</p>
      <hr><p><em>参考文献：ACSM Position Stand: Exercise and Fluid Replacement / ISSN 电解质指南</em></p>
    </div>`,
    // 8. 运动补剂
    `<div class="reader-module-content"><h2>💊 运动补剂速查</h2>
      <p>补剂是锦上添花，不是雪中送炭。先做好基础营养再考虑补剂。以下基于科学证据分级。</p>

      <h3>A级（强证据支持）</h3>
      <table><tr><th>补剂</th><th>剂量</th><th>效果</th><th>适合人群</th></tr><tr><td>乳清蛋白</td><td>20-40g/次</td><td>肌肉蛋白合成</td><td>所有运动员</td></tr><tr><td>肌酸</td><td>3-5g/天</td><td>力量+爆发力+认知</td><td>力量/爆发力运动</td></tr><tr><td>咖啡因</td><td>3-6mg/kg</td><td>耐力+警觉性</td><td>赛前/大强度训练</td></tr><tr><td>Beta-丙氨酸</td><td>3-6g/天</td><td>延迟肌肉酸胀感</td><td>1-4分钟高强度运动</td></tr><tr><td>碳酸氢钠</td><td>0.3g/kg</td><td>缓冲乳酸</td><td>高强度间歇训练</td></tr></table>

      <h3>B级（中等到弱证据）</h3>
      <p><strong>支链氨基酸（BCAA）</strong>：不如整蛋白有效，但训练中可减少感知疲劳<br><strong>谷氨酰胺</strong>：免疫支持，但正常饮食者无需额外补充<br><strong>HMB</strong>：可能减少肌肉分解，新手和老年人效果更好<br><strong>Omega-3</strong>：抗炎+恢复，2-3g EPA/DHA/天</p>

      <h3>C级（证据不足或不推荐）</h3>
      <p><strong>睾酮促进剂</strong>：无效<br><strong>CLA</strong>：减脂效果微乎其微<br><strong>左旋肉碱</strong>：减脂无效<br><strong>胶原蛋白</strong>：关节健康证据不足，不如吃够蛋白</p>

      <h3>补剂使用原则</h3>
      <p>① 补剂是补充，不是替代<br>② 一次最多用3种<br>③ 选择第三方认证品牌（NSF/Informed Sport）<br>④ 注意咖啡因总量（每天400mg以内安全）<br>⑤ 新手先从蛋白粉+肌酸开始</p>
      <p class='tip'>💡 99%的'专利配方'和'快速见效'都是营销。如果一个补剂吹得太夸张，那它就是夸张的。</p>
      <hr><p><em>参考文献：ISSN Exercise & Sport Nutrition Review / Australian Institute of Sport Supplement Classification</em></p>
    </div>`,
    // 9. 周期化营养
    `<div class="reader-module-content"><h2>🔄 周期化营养</h2>
      <p>周期化营养是指根据训练周期的不同阶段，调整营养策略以匹配训练需求和身体状态。</p>

      <h3>周期划分</h3>
      <table><tr><th>周期</th><th>训练重点</th><th>热量</th><th>蛋白</th><th>碳水</th></tr><tr><td>基础期</td><td>技术积累、力量基础</td><td>维持/微增</td><td>1.6-1.8g/kg</td><td>3-4g/kg</td></tr><tr><td>强度期</td><td>高强度、专项训练</td><td>维持+200</td><td>1.8-2.0g/kg</td><td>4-5g/kg</td></tr><tr><td>比赛期</td><td>减量、赛前准备</td><td>维持</td><td>1.6-1.8g/kg</td><td>5-6g/kg（碳加载）</td></tr><tr><td>恢复期</td><td>主动恢复</td><td>微减</td><td>1.4-1.6g/kg</td><td>2-3g/kg</td></tr></table>

      <h3>训练日 vs 休息日</h3>
      <p><strong>训练日</strong>：碳水高 + 适当高热量，支持训练+恢复<br><strong>休息日</strong>：碳水降低 + 热量微减，促进脂肪代谢敏感化</p>
      <p>一天碳水波动：训练日4-5g/kg → 休息日2-3g/kg（交替式周期化）</p>

      <h3>碳加载周期</h3>
      <p><strong>比赛前5-7天</strong>：<br>第5天：碳水稍减（2-3g/kg）→ 耗尽存量<br>第4天：碳水3-4g/kg<br>第3天：碳水5-6g/kg<br>第2天：碳水6-7g/kg<br>第1天（赛前）：碳水7-8g/kg + 充足水合</p>
      <p>碳加载可增加肌糖原储存20-50%，显著提升耐力表现。</p>
      <p class='tip'>💡 周期化营养不是天天吃一样的东西。聪明的运动员会根据体重、训练强度、周期阶段动态调整。</p>
      <hr><p><em>参考文献：Jeukendrup AE. Periodized Nutrition for Athletes. Sports Med 2017 / NSCA-CSCS 营养周期化</em></p>
    </div>`,
    // 10. 体重管理
    `<div class="reader-module-content"><h2>⚖️ 体重管理</h2>
      <p>运动员的体重管理不是简单的'减肥'，而是在保持/提升运动表现的前提下优化体成分。</p>

      <h3>体成分目标</h3>
      <table><tr><th>性别/项目</th><th>体脂率参考</th><th>BMI参考</th></tr><tr><td>男性羽毛球</td><td>8-15%</td><td>20-24</td></tr><tr><td>女性羽毛球</td><td>15-22%</td><td>18-22</td></tr><tr><td>一般健康男性</td><td>10-20%</td><td>18.5-24</td></tr><tr><td>一般健康女性</td><td>18-28%</td><td>18.5-24</td></tr></table>

      <h3>减脂指南</h3>
      <p><strong>安全速率</strong>：每周减0.3-0.5kg（过多会肌肉流失）<br><strong>热量缺口</strong>：每日TDEE-300~500kcal<br><strong>蛋白提高</strong>：升至2.0-2.4g/kg，保留肌肉<br><strong>碳水时机</strong>：训练日碳水集中在训练前后<br><strong>监控频率</strong>：每周称1次体重 + 每2周测围度</p>

      <h3>增肌指南</h3>
      <p><strong>热量盈余</strong>：每日TDEE+200~400kcal<br><strong>蛋白达标</strong>：1.6-2.0g/kg，分4-5餐<br><strong>碳水保证</strong>：3-5g/kg，保证训练强度<br><strong>耐心</strong>：健康增重每月0.5-1kg</p>

      <h3>平台期突破</h3>
      <p>① 调整热量：减脂期降低100-200kcal/天<br>② 调整训练：改变训练模式/增加负荷<br>③ 检查蛋白：是不是吃够<br>④ 检查睡眠：<7小时影响瘦素<br>⑤ 重新估算TDEE：体重变了，BMR也变了</p>

      <h3>体重管理雷区</h3>
      <p>❌ 每日称体重（体水分波动让你焦虑）<br>❌ 节食（掉代谢，掉肌肉，掉表现）<br>❌ 极低碳水（影响训练质量）<br>❌ 快速减重（>1kg/周几乎必然掉肌肉）<br>❌ 只看体重不看体脂（体重不变但体脂可以降）</p>
      <p class='tip'>💡 体重是数字，表现才是真相。3个月后你跑得更快、跳得更高、杀得更狠，体重的几斤浮动根本不重要。</p>
      <hr><p><em>参考文献：ACSM Guidelines for Exercise Testing and Prescription / NSCA 体成分管理</em></p>
    </div>`,
    // 11. 损伤预防与康复营养
    `<div class="reader-module-content">
      <h2>🩹 损伤预防与康复营养</h2>
      <p>羽毛球是高强度变向运动，肩、膝、踝、腰是最易损伤的部位。营养不是治疗的全部，但科学的饮食能让预防更有效、康复更快。</p>

      <h3>常见运动损伤分类</h3>
      <table><tr><th>类型</th><th>代表损伤</th><th>常见动作</th><th>恢复周期</th></tr>
      <tr><td>急性软组织</td><td>肌肉拉伤、韧带扭伤</td><td>急停跳杀、跨步上网</td><td>1-6 周</td></tr>
      <tr><td>过用性损伤</td><td>网球肘、肩袖炎、髌腱炎</td><td>重复扣杀、反手高远</td><td>2-12 周</td></tr>
      <tr><td>关节损伤</td><td>半月板、肩袖、踝关节软骨</td><td>落地扭转、过度伸展</td><td>6 周-6 月</td></tr>
      <tr><td>应力性</td><td>应力性骨折、骨膜炎</td><td>大运动量+营养不足</td><td>4-12 周</td></tr></table>

      <h3>急性期 RICE → PEACE & LOVE 新原则</h3>
      <p><strong>传统 RICE</strong>（受伤 0-72 小时）：Rest 休息 + Ice 冰敷（每次 15-20 分钟，间隔 1-2 小时）+ Compression 加压 + Elevation 抬高。<br>
      <strong>2022 新版 PEACE & LOVE</strong>：Protection 保护 + Elevation 抬高 + Avoid anti-inflammatories 避免消炎药 + Compression 加压 + Education 教育 + Load 负荷管理 + Optimism 乐观 + Vascularisation 早期活动 + Exercise 训练。<br>
      ⚠️ 新版强调：<strong>急性期避免布洛芬等消炎药</strong>，因为消炎会抑制组织愈合的炎症反应（炎症本身是修复的第一步）。</p>

      <h3>抗炎营养策略</h3>
      <table><tr><th>营养素</th><th>剂量</th><th>食物来源</th><th>作用</th></tr>
      <tr><td>Omega-3 (EPA/DHA)</td><td>2-3 g/天</td><td>三文鱼、沙丁鱼、亚麻籽、奇亚籽</td><td>抑制过度炎症</td></tr>
      <tr><td>维生素 C</td><td>200-500 mg/天</td><td>猕猴桃、草莓、西兰花</td><td>胶原蛋白合成</td></tr>
      <tr><td>姜黄素</td><td>500-1000 mg/天</td><td>姜黄（搭配黑胡椒↑吸收 20 倍）</td><td>天然抗炎</td></tr>
      <tr><td>维生素 D</td><td>1000-2000 IU/天</td><td>阳光、蛋黄、强化奶</td><td>骨健康+免疫调节</td></tr>
      <tr><td>多酚类</td><td>多吃颜色深的蔬果</td><td>蓝莓、绿茶、黑巧克力（85%+）</td><td>抗氧化</td></tr></table>
      <p><strong>抗炎饮食模式</strong>：地中海饮食或 DASH 饮食已被证明能降低炎症标志物（CRP）20-40%。核心：多吃鱼、蔬果、全谷物、坚果；少吃加工食品、红肉、糖。</p>

      <h3>关节与软骨营养</h3>
      <p><strong>氨基葡萄糖</strong>：1500 mg/天（硫酸盐形式更优），长期使用（3-6 个月）可能减缓关节退化。<br>
      <strong>胶原蛋白肽</strong>：10-15 g/天，运动前 1 小时摄入可改善关节舒适度（研究显示 12 周后关节疼痛下降 30-40%）。<br>
      <strong>MSM（甲基磺酰甲烷）</strong>：1-3 g/天，抗炎+缓解肌肉酸痛。<br>
      <strong>钙 + 维 D</strong>：1000 mg 钙 + 1000 IU 维 D / 天，预防应力性损伤。</p>

      <h3>肌腱与韧带修复营养</h3>
      <p>肌腱/韧带主要由 I 型胶原蛋白构成，修复需要：</p>
      <ul>
      <li><strong>蛋白质</strong>：1.6-2.2 g/kg/天（高于日常维持量）</li>
      <li><strong>维生素 C</strong>：胶原蛋白合成的必需辅因子（不能缺）</li>
      <li><strong>锰 + 锌</strong>：胶原蛋白交联反应必需</li>
      <li><strong>充足水分</strong>：肌腱含水量 70%，脱水会降低弹性</li>
      </ul>
      <p class='tip'>💡 明胶（gelatin）+ 维 C 组合：15 g 明胶 + 50 mg 维 C，运动前 1 小时摄入可提升胶原蛋白合成 40%（Keith Baar 实验室研究）。</p>

      <h3>伤后恢复分阶段营养</h3>
      <table><tr><th>阶段</th><th>时间</th><th>营养重点</th><th>目标</th></tr>
      <tr><td>急性期</td><td>0-72 h</td><td>适度蛋白+维C+充足水分，避免高脂高糖</td><td>控制炎症、启动修复</td></tr>
      <tr><td>亚急性期</td><td>3-21 天</td><td>蛋白提到 2.0 g/kg + 维C 500mg + Omega-3</td><td>加速组织合成</td></tr>
      <tr><td>重建期</td><td>3-12 周</td><td>恢复正常训练营养 + 胶原蛋白肽</td><td>功能恢复</td></tr>
      <tr><td>回归期</td><td>12 周+</td><td>周期性营养 + 抗炎饮食</td><td>预防再伤</td></tr></table>

      <h3>羽毛球专项：易伤部位营养重点</h3>
      <table><tr><th>部位</th><th>高发原因</th><th>营养对策</th></tr>
      <tr><td>肩袖</td><td>扣杀、抽球反复过头</td><td>Omega-3 + 维C + 胶原蛋白肽</td></tr>
      <tr><td>肘关节（网球肘）</td><td>反手、挑球离心负荷</td><td>姜黄素 + MSM + 减少致炎食物</td></tr>
      <tr><td>膝关节</td><td>急停、跨步、起跳落地</td><td>氨基葡萄糖 + 维D + 控制体重</td></tr>
      <tr><td>踝关节</td><td>侧向移动、落地不稳</td><td>胶原蛋白 + 钙 + 本体感觉训练</td></tr>
      <tr><td>腰背</td><td>后场击球过度伸展</td><td>核心训练 + 维D + 抗炎饮食</td></tr></table>

      <h3>预防胜于治疗：日常营养习惯</h3>
      <ul>
      <li>✅ 每天 5 份以上蔬菜 + 2 份水果（抗氧化物储备）</li>
      <li>✅ 每周 2-3 次深海鱼（Omega-3 累积）</li>
      <li>✅ 训练日蛋白不低于 1.6 g/kg，损伤后提到 2.0 g/kg</li>
      <li>✅ 充足睡眠（修复激素 GH 分泌）</li>
      <li>✅ 训练前 1 小时明胶+维C（长期效果显著）</li>
      <li>❌ 避免：训练后立即吃快餐、油炸食品（增加炎症）</li>
      <li>❌ 避免：长期过量咖啡因（影响钙吸收+睡眠）</li>
      </ul>

      <p class='tip'>💡 营养是康复的"加速器"，但不能替代医学治疗。严重损伤（韧带断裂、应力性骨折）请先就医，营养是辅助不是替代。</p>
      <hr><p><em>参考文献：NSCA-CPT 第6版·运动损伤与营养康复 / British Journal of Sports Medicine 2019 营养与运动损伤 / Dubois et al. PEACE & LOVE 2022 / Keith Baar 胶原蛋白与肌腱修复研究 2017</em></p>
    </div>`,
  ],
    competition: [
    // 1. 赛前1周
    `<div class="reader-module-content">
      <h2>⚔️ 赛前1周倒计时</h2>
      <p>赛前一周的决定性因素不是训练，而是管理。管理好状态、管理好身体、管理好心态。</p>
      <h3>倒计时安排</h3>
      <table><tr><th>天数</th><th>训练</th><th>营养</th><th>恢复</th></tr><tr><td>T-7</td><td>最后一次高强度训练</td><td>正常碳水</td><td>泡沫轴+拉伸</td></tr><tr><td>T-6</td><td>中等强度技术训练</td><td>正常</td><td>正常睡眠</td></tr><tr><td>T-5</td><td>中等强度技术训练</td><td>碳加载开始（3-4g/kg）</td><td>充足水合</td></tr><tr><td>T-4</td><td>低强度有氧+激活</td><td>碳水4-5g/kg</td><td>筋膜放松</td></tr><tr><td>T-3</td><td>比赛模拟（减量65%）</td><td>碳水5-6g/kg</td><td>睡眠充分</td></tr><tr><td>T-2</td><td>完整休息</td><td>碳水持续</td><td>轻运动+拉伸</td></tr><tr><td>T-1</td><td>激活训练（30min）</td><td>碳水6-7g/kg</td><td>早睡</td></tr><tr><td>比赛日</td><td>赛前热身</td><td>赛前餐(3h前)</td><td>上场</td></tr></table>
      <h3>赛前减量原则</h3>
      <p><strong>训练量</strong>：减到平时的40-60%<br><strong>强度</strong>：维持或微增（保持神经激活）<br><strong>频率</strong>：不减（保持肌肉记忆）</p>
      <h3>赛前心理准备清单</h3>
      <p>☐ 准备好比赛装备（球拍穿线、鞋、毛巾、水壶）<br>☐ 规划好交通和到达时间<br>☐ 写一个3句话的比赛计划（关键词触发）<br>☐ 想象成功的画面（积极的内心演练）</p>
      <p class="tip">💡 赛前一周不要尝试任何新东西。新球鞋、新食物、新动作——全部留在训练中验证过。</p>
      <hr><p><em>参考文献：Mujika I, Padilla S. Tapering for Performance. Sports Med 2003 / NSCA 比赛准备指南</em></p>
    </div>`,
    // 2. 赛中关键策略
    `<div class="reader-module-content">
      <h2>🎯 赛中关键策略</h2>
      <p>比赛中的决策质量决定比赛走向。以下策略体系来自世界级教练和运动员的实战经验。</p>
      <h3>开局策略（0-5分）</h3>
      <p><strong>目的</strong>：试探对手、建立节奏<br><strong>发球</strong>：2-3种发球轮换（不要只用一种）<br><strong>接发</strong>：以回中为主，不追求直接得分<br><strong>试探方向</strong>：对手正手位？反手位？网前？后场？<br><strong>关键数字</strong>：前5分至少打3种不同的球路</p>
      <h3>中期策略（5-15分）</h3>
      <p><strong>目的</strong>：消耗对手、扩大优势<br><strong>节奏变化</strong>：快→慢→快的交替<br><strong>线路选择</strong>：重复点+突然变线<br><strong>体能管理</strong>：长短球结合，让对手多跑</p>
      <h3>局末策略（15-21分）</h3>
      <p><strong>领先时</strong>：维持节奏、不冒险变线、耐心等待对手失误<br><strong>落后时</strong>：主动变节奏、增加变化、打不同球路增加不确定性<br><strong>关键分（20平以后）</strong>：用你最稳的球路、不要打你只有50%把握的球</p>
      <h3>局间调整</h3>
      <p>90秒局间休息：<br>0-30秒：擦汗、喝水、慢走<br>30-60秒：分析对手模式（这一局发现了什么）<br>60-90秒：制定下一局战术（1-2个执行点）</p>
      <h3>关键比赛原则</h3>
      <p>① 对手弱的球路多打、强的球路尽量避开<br>② 连续失分≥2分时必须变节奏<br>③ 不要跟对手比"谁更凶"——凶的前提是有把握<br>④ 每一分都是新的开始，不要想上一分</p>

      <h3>关键分处理 SOP（18-21 分）</h3>
      <p>业余比赛 60% 以上的胜负其实在 18-21 分之间决出。关键分不是靠"拼"而是靠 <strong>SOP（标准作业流程）</strong>。训练时不练关键分处理，比赛时一定手抖。</p>
      <table><tr><th>比分场景</th><th>处理原则</th><th>具体动作</th></tr>
      <tr><td>18-18 平</td><td>回归基本功</td><td>用你最熟练的发球 + 最稳的接发，放弃所有"变化球"</td></tr>
      <tr><td>19-19 平</td><td>执行力优先</td><td>先发后攻，每一拍按计划执行，不冒险</td></tr>
      <tr><td>20-19 / 20-20</td><td>极简战术</td><td>1 个套路反复使用 2-3 分，直到分出胜负</td></tr>
      <tr><td>赛点 / 局点</td><td>压力反向利用</td><td>深呼吸 1 次 + 想 1 个关键词（"前场" / "反手"）后立即执行</td></tr></table>
      <p><strong>关键分铁律</strong>：<br>① 不打没有 70% 把握的球<br>② 不改变原有战术（突然想"杀球得分"是最常见的输球原因）<br>③ 每个发球前有 1 秒钟的"执行点确认"（想清楚发哪里、对手可能怎么接）<br>④ 输了立即"清零"——20-19 失分不算失败，只是一分</p>

      <h3>僵局破解（连续失分 / 连续得分）</h3>
      <p>任何比赛都会有连续失分或连续得分的时刻。处理这种"势能"的能力，决定你能稳定在多高水平。</p>
      <h4>连续失分 ≥ 3 分（被动）</h4>
      <p><strong>立刻做</strong>：<br>① <strong>慢下来</strong>——下一分前深呼吸 1 次 + 擦汗调整 5 秒<br>② <strong>改变节奏</strong>——快→慢 或 慢→快，幅度要明显<br>③ <strong>改变线路</strong>——重复 5 次的线路突然变到对角<br>④ <strong>改变战术</strong>——进攻→拉吊 或反之</p>
      <p><strong>绝不要</strong>：<br>❌ 加快节奏试图"抢回"（越快越失误）<br>❌ 一局内改变太多要素（最多 1-2 个）<br>❌ 看向教练/观众寻求安慰（失去专注）<br>❌ 抱怨对手或裁判（情绪失控的开始）</p>

      <h4>连续得分 ≥ 4 分（主动）</h4>
      <p><strong>稳住</strong>：<br>① <strong>不加码</strong>——保持当前节奏，对手随时可能反扑<br>② <strong>不懈怠</strong>——领先 6 分也别想"差不多赢了"<br>③ <strong>不冒险</strong>——成功率比花样重要</p>
      <p><strong>⚠️ 警惕</strong>：连得 4 分后最常见的失误是"想秀一下"（远台救球失败、放网出界）。业余比赛 70% 的逆转都发生在 11 分换边后的 4-6 分。</p>

      <h3>比赛节奏控制（3 种节拍切换）</h3>
      <p>业余选手最容易忽视的战术武器是"节奏"。同一种球路用快节奏和慢节奏打，效果完全不同。</p>
      <table><tr><th>节奏类型</th><th>特征</th><th>适用场景</th><th>代表球路</th></tr>
      <tr><td><strong>快节奏</strong></td><td>多拍短球、连续压制</td><td>对手重心没到位 / 我方体能优势 / 抢开局</td><td>平抽快挡、连续杀球、网前封网</td></tr>
      <tr><td><strong>慢节奏</strong></td><td>高远拉吊、调动对手</td><td>对手体能下降 / 我方需要喘息 / 破对手节奏</td><td>高远球、头顶吊球、被动挑高</td></tr>
      <tr><td><strong>变速节奏</strong></td><td>快慢交替、抓对手节奏漏洞</td><td>胶着局势 / 关键分 / 对手擅长单节奏</td><td>高远→放网、杀球→挑高、推扑→停顿</td></tr></table>
      <p><strong>节奏切换三原则</strong>：<br>① <strong>预判对手节奏</strong>：观察对手是"快节奏型"还是"慢节奏型"——前者打慢，后者打快<br>② <strong>同一局至少切换 1 次</strong>：让对手始终无法适应<br>③ <strong>变速前要有"假动作铺垫"</strong>：直接变速对手能预判，先做相同动作再变速效果更好</p>

      <p class="tip">💡 业余选手最容易忽视的不是技术，而是关键分的"思维清晰度"。把每个关键分都当作"重新开始的一分"，反而能赢。</p>
      <hr><p><em>参考文献：林丹《直到世界尽头》比赛策略篇 / 李永波教练体系 / Brad Gilbert《Winning Ugly》关键分处理 / NSCA 运动心理学 节奏控制章节</em></p>
    </div>`,
    // 3. 比赛心理准备
    `<div class="reader-module-content">
      <h2>🧠 比赛心理准备</h2>
      <p>高水平比赛最后都是心理的比拼。技术层面的差距在赛前训练中已经决定，比赛中的胜负取决于心理调节。</p>
      <h3>赛前心理状态分级</h3>
      <table><tr><th>状态</th><th>心率(静息+)</th><th>表现</th></tr><tr><td>低迷</td><td>+0~5 bpm</td><td>反应慢，注意力散漫</td></tr><tr><td>热身最佳区</td><td>+10~20 bpm</td><td>专注、反应快、爆发力足</td></tr><tr><td>过度紧张</td><td>+30~50 bpm</td><td>动作僵硬、失误多、判断力下降</td></tr><tr><td>恐慌</td><td>+50+ bpm</td><td>完全失控</td></tr></table>
      <h3>激活法（进入最佳区）</h3>
      <p><strong>音乐激活</strong>：赛前听熟悉的激昂音乐3-5首<br><strong>动作激活</strong>：重击球、跨步、跳跃等大肌肉动作<br><strong>自我暗示</strong>："我准备好了""这场我能赢"简短有力的话<br><strong>呼吸激活</strong>：4-7-8呼吸法（吸气4秒-屏7秒-呼8秒）×3轮</p>
      <h3>降压法（应对过度紧张）</h3>
      <p><strong>场边冷处理</strong>：不看对手、不看比分、专注于自己的球拍<br><strong>正向自我对话</strong>："这只是训练中的一分"<br><strong>重置仪式</strong>：擦汗、拍球、调整球拍线——形成自己的"重启仪式"<br><strong>身体放松</strong>：抖动双手、深呼吸、摇头放松</p>
      <h3>赛中注意力管理</h3>
      <p>① <strong>聚焦当下</strong>：不追忆上一分，也不预测下一分<br>② <strong>执行计划</strong>：每分前想一个关键词触发动作<br>③ <strong>过程导向</strong>：关注"我要做什么"而非"我要赢"</p>
      <p class="tip">💡 顶级运动员的标志不是不紧张，而是能在紧张中继续执行正确的动作。</p>
      <hr><p><em>参考文献：James E. Loehr《The New Toughness Training for Sports》/ 运动心理学竞赛焦虑研究</em></p>
    </div>`,
    // 4. 对手分析框架
    `<div class="reader-module-content">
      <h2>📊 对手分析框架</h2>
      <p>知己知彼百战百胜。赛前对对手的分析应该系统化，避免临时看两眼就说"知道"。</p>
      <h3>分析维度清单</h3>
      <table><tr><th>维度</th><th>关注点</th><th>记录方法</th></tr><tr><td>技术维度</th><td>正手、反手、网前、杀球、防御</th><th>记录命中率</td></tr><tr><td>战术维度</th><td>常用球路、变化频率、套路</th><th>记录3种最常用套路</td></tr><tr><td>身体维度</th><td>速度、力量、耐力、柔韧</th><th>评估等级1-5</td></tr><tr><td>心理维度</th><td>关键分稳定性、失误后调整</th><th>观察反应</td></tr><tr><td>体能维度</th><td>多拍能力、长局表现</th><th>记录第3局后表现</td></tr></table>
      <h3>赛前情报收集</h3>
      <p>① <strong>录像分析</strong>：找到对手最近3-5场比赛的完整录像<br>② <strong>数据统计</strong>：发球得分率、接发得分率、网前得分率<br>③ <strong>弱点标注</strong>：画出对手"必胜球"和"必败球"<br>④ <strong>历史交锋</strong>：回顾你与对手过去交锋的情况</p>
      <h3>对手档案模板</h3>
      <p>姓名/右手或左手/身高体重/<br>常用发球: 1. 2. 3.<br>强势技术: 1. 2. 3.<br>薄弱环节: 1. 2. 3.<br>心理特征: 1. 2. 3.<br>战术倾向: 进攻型？拉吊型？防守反击型？<br>应对方案: 1. 2. 3.</p>
      <h3>场上即时观察（开局5分）</h3>
      <p>① 对手的移动范围和重心<br>② 击球时的稳定性<br>③ 各种球的实际速度<br>④ 在压力下的选择倾向</p>
      <p class="tip">💡 不要被对手的"名头"吓到。任何对手都有弱点，比赛开始前的分析决定你能否找到它。</p>
      <hr><p><em>参考文献：《Winning Ugly》Brad Gilbert / NSCA 运动情报学</em></p>
    </div>`,
    // 5. 对手技术弱点
    `<div class="reader-module-content">
      <h2>🔍 对手技术弱点识别</h2>
      <p>找到对手的弱点还不够，要懂得持续攻击弱点，让对手无法适应。</p>
      <h3>常见羽毛球弱点模式</h3>
      <table><tr><th>弱点类型</th><th>识别方法</th><th>攻击策略</th></tr><tr><td>反手弱</td><td>对手反手回球质量差</td><td>多打反手位+重复反手</td></tr><tr><td>网前弱</td><td>对手网前挑球高、放网下网</td><td>多放网+勾对角</td></tr><tr><td>过渡球弱</td><td>对手中场球处理粗糙</td><td>多打中场软压</td></tr><tr><td>后退慢</td><td>对手从网前退到后场迟钝</td><td>网前→后场组合球</td></tr><tr><td>前场慢</td><td>对手从后场上网迟钝</td><td>高远球→网前组合</td></tr><tr><td>心理崩</td><td>对手连续失分后失误率飙升</td><td>保持攻势不放松</td></tr></table>
      <h3>弱点的三大特征</h3>
      <p><strong>① 持续性</strong>：不是偶尔失误，而是每次打到那里都差<br><strong>② 不可调整</strong>：对手知道但调整不过来<br><strong>③ 多拍暴露</strong>：越打越长越暴露</p>
      <h3>攻击弱点的实战技巧</h3>
      <p>① <strong>伪装</strong>：从对手强的位置开始，让他以为你打强的方向<br>② <strong>突然</strong>：在他准备好之前突然变线到弱点<br>③ <strong>重复</strong>：同一线路连续3-5次，让对手无法应对<br>④ <strong>加大压力</strong>：球速/角度/落点都最刁</p>
      <h3>对手反扑的应对</h3>
      <p>对手会调整，所以要预留plan B：<br>① 第一次攻击失败 → 改打次弱方向<br>② 对手突然加强弱点 → 改打其他方向<br>③ 对手改变战术 → 重新观察5分再调整</p>
      <p class="tip">💡 真正的强者是"无弱点"的球员。普通球员3-5个弱点，顶尖球员只有1-2个。找到对手的弱点持续攻击是基本功。</p>
      <hr><p><em>参考文献：羽毛球队训练学·对手分析章 / 李矛教练战术分析</em></p>
    </div>`,
    // 6. 体能分配
    `<div class="reader-module-content">
      <h2>🏃 体能分配策略</h2>
      <p>羽毛球三局两胜可以打90分钟以上，没有体能分配意识的人会在第2局末或第3局崩溃。</p>
      <h3>比赛三局体能曲线</h3>
      <table><tr><th>阶段</th><th>体能水平</th><th>策略</th></tr><tr><td>第1局0-10分</td><td>100%</td><td>全力执行既定战术</td></tr><tr><td>第1局10-21分</td><td>85-90%</td><td>建立优势、控制节奏</td></tr><tr><td>第2局0-10分</td><td>75-85%</td><td>稳定心态、稳中求变</td></tr><tr><td>第2局10-21分</td><td>65-75%</td><td>体能决战期，谁撑住谁赢</td></tr><tr><td>第3局决胜</td><td>看恢复情况</td><td>拼意志+拼战术</td></tr></table>
      <h3>局间休息的科学利用</h3>
      <p>90秒局间：<br>0-30秒：补水（150-200ml）+ 慢走<br>30-60秒：呼吸调整（4-7-8呼吸 × 3轮）<br>60-90秒：擦汗、整理装备、心态调整</p>
      <h3>节省体能的实战技巧</h3>
      <p>① <strong>合理回位</strong>：不要每次都全力回中心，预判+站位<br>② <strong>有效击球</strong>：每分都打有目的的球，不浪费体力<br>③ <strong>借力打力</strong>：对手发力时挡/抽，不要对拉<br>④ <strong>节奏控制</strong>：根据体能调整回合速度</p>
      <h3>决胜局体能管理</h3>
      <p>第3局开局前5分：<br>① 优先恢复，不能开局就拼光<br>② 用你最擅长的开局方式<br>③ 不冒险球，稳中求胜<br>④ 关键分11分换边时再做心理和身体重置</p>
      <p class="tip">💡 体能不只是身体，更是心理。第3局输掉的比赛90%是心理先崩，身体还在。</p>
      <hr><p><em>参考文献：林丹体能训练课 / NSCA 羽毛球体能训练</em></p>
    </div>`,
    // 7. 实战案例
    `<div class="reader-module-content">
      <h2>🎬 实战案例学习</h2>
      <p>从真实比赛中提炼规律，比理论更能指导实战。</p>
      <h3>案例1：林丹 vs 李宗伟 2016里约半决赛</h3>
      <p><strong>背景</strong>：李宗伟世界排名第一，林丹第二，前两次交手李宗伟胜。</p>
      <p><strong>关键策略</strong>：<br>① 林丹主动放弃纯进攻模式，采用拉吊+突击<br>② 针对李宗伟正手区空当持续施压<br>③ 节奏控制：林丹故意放慢节奏，让李宗伟"有力无处使"<br>④ 关键分处理：林丹更敢出手（基于多次大赛经验）</p>
      <p><strong>结果</strong>：林丹2-1逆转，第3局关键时刻打出神仙球。</p>
      <p><strong>启示</strong>：顶级对决不是比谁更凶，而是比谁失误更少、关键分更稳。</p>
      <h3>案例2：业余选手反败为胜典型场景</h3>
      <p><strong>背景</strong>：业余比赛，第一局大比分落后（5-15）。</p>
      <p><strong>反败策略</strong>：<br>① 暂停后不再想比分，只打"下一个球"<br>② 主动变节奏：打之前从未用过的球路<br>③ 针对对手已经"放松警惕"的心态突袭<br>④ 减少无谓失误，用稳定回球消耗对手注意力</p>
      <p><strong>结果</strong>：连追10分反超。</p>
      <p><strong>启示</strong>：业余比赛心理因素占比远大于技术。领先的容易松懈，落后方一旦起势，对手很难应对。</p>
      <h3>案例3：双打配合失误典型</h3>
      <p><strong>背景</strong>：业余双打，两名选手争抢同一区域，导致空当。</p>
      <p><strong>问题</strong>：<br>① 分区不明确，前后职责重叠<br>② 沟通仅靠喊叫，节奏不一致<br>③ 一人被压制时另一人不知道补位</p>
      <p><strong>改进</strong>：<br>① 赛前明确"前后"或"左右"站位<br>② 建立简单暗号（如"我的"）<br>③ 形成"谁在前谁主导"的默契</p>
      <h3>案例4：阿萨尔森 2024 巴黎奥运夺金战术拆解</h3>
      <p><strong>背景</strong>：丹麦名将 Viktor Axelsen（身高 2.03m）在 2024 巴黎奥运男单决赛对阵泰国昆拉武特。昆拉武特以防守反击 + 体能韧性著称，半决赛淘汰石宇奇。</p>
      <p><strong>关键策略</strong>：<br>① <strong>高度压制网前</strong>：凭借身高臂展，网前争夺形成"垂直打击"优势，网前球质量极高<br>② <strong>避免多拍拉吊</strong>：对手擅长多拍防守，阿萨尔森主动加快节奏，每回合 ≤ 5 拍<br>③ <strong>杀球落点精准</strong>：90% 杀球压向对手反手位腰部（昆拉武特反手防守相对薄弱）<br>④ <strong>体能分配前重后轻</strong>：首局 21-11 / 次局 21-7 速胜，整场仅 38 分钟，刻意保留体能以防三局战</p>
      <p><strong>结果</strong>：阿萨尔森 2-0 速胜，成功卫冕奥运男单金牌。</p>
      <p><strong>对业余选手的启示</strong>：<br>① <strong>知己知彼</strong>：每个对手都有最弱一环，业余选手也应赛前观察"对方最怕什么球"<br>② <strong>不让对手打舒服</strong>：对手擅长防守就别拉吊，擅长进攻就别送高球——比赛是让对方"不舒服"<br>③ <strong>体能 = 战术武器</strong>：能速胜就别拖到第三局，越短的比赛越可控<br>④ <strong>现代羽毛球趋势</strong>：速度 + 精准 > 蛮力。阿萨尔森的杀球并不比林丹更凶，但落点更精确、进攻更持续</p>
      <p class="tip">💡 比赛经验是最好的教练。多看比赛录像+赛后复盘，比看100篇战术文章都管用。</p>
      <hr><p><em>参考文献：BWF世界羽联官方比赛录像库 / 林丹自传《直到世界尽头》/ BWF Paris 2024 奥运官方录像</em></p>
    </div>`,
    // 8. 局间调整
    `<div class="reader-module-content">
      <h2>🔄 局间调整</h2>
      <p>两局之间的 90 秒比场上每一秒都重要。这是唯一能"重启"的时刻——身体要复位、战术要复盘、心态要清零。</p>

      <h3>局间调整的三大任务</h3>
      <p>① <strong>身体调整</strong>（30 秒）：补水、降温、肌肉放松<br>② <strong>战术复盘</strong>（30 秒）：刚才一局发生了什么？哪些有效哪些无效？<br>③ <strong>心态调整</strong>（30 秒）：放下上一局，专注于下一局</p>

      <h3>90 秒黄金时间分配（标准化流程）</h3>
      <p>很多业余选手的局间 90 秒是"瘫在椅子上喝水"，其实每 15 秒都有明确任务。下面是一份参考时间表，可根据个人习惯微调。</p>
      <table><tr><th>时间段</th><th>主要任务</th><th>具体动作</th></tr>
      <tr><td>0–15 秒</td><td>身体复位</td><td>慢走回到教练席 + 补温水 100–150 ml（不要冰水）</td></tr>
      <tr><td>15–30 秒</td><td>降温 + 呼吸</td><td>毛巾擦汗 + 4-7-8 呼吸 × 3 轮（吸气 4s / 屏 7s / 呼 8s）</td></tr>
      <tr><td>30–60 秒</td><td>战术复盘</td><td>对照下方"3 问清单"快速总结，必要时与教练 1 句话交流</td></tr>
      <tr><td>60–75 秒</td><td>能量补给</td><td>运动饮料 50–80 ml / 半根能量棒 / 香蕉 2–3 嘴</td></tr>
      <tr><td>75–90 秒</td><td>回到状态</td><td>站起来、活动肩颈、拍线检查、想象下一局开局第一球</td></tr></table>
      <p><strong>关键反直觉</strong>：局间不应长坐不动，0–30 秒的慢走比瘫坐更能促进心率恢复（站立时骨骼肌泵作用协助静脉回流）。</p>

      <h3>体能自检清单（4 维）</h3>
      <p>坐下 30 秒内快速扫描身体，把每项分成"绿/黄/红"三档：</p>
      <table><tr><th>维度</th><th>绿灯（可继续高强度）</th><th>黄灯（需调整）</th><th>红灯（需大幅简化战术）</th></tr>
      <tr><td>心率</td><td>30 秒内明显下降</td><td>仍偏快但能稳定</td><td>心悸感、久久不降</td></tr>
      <tr><td>肌肉</td><td>无明显酸胀</td><td>某肌群轻度紧绷</td><td>多处酸胀、抽筋前兆</td></tr>
      <tr><td>出汗/脱水</td><td>微汗、口不渴</td><td>出汗多、轻度口渴</td><td>大量出汗、明显口干头晕</td></tr>
      <tr><td>体温/呼吸</td><td>呼吸平稳</td><td>呼吸偏快但能控制</td><td>胸口发烫、呼吸紊乱</td></tr></table>
      <p><strong>任一红灯</strong> → 下局优先选择"借力打力"（挡/抽/挑），减少主动发力；<strong>任一黄灯</strong> → 战术维持，避免冒险球。</p>

      <h3>战术自检清单（3 维）</h3>
      <p>复盘只回答 3 个问题，不要试图面面俱到：</p>
      <ol>
      <li><strong>对手最让我难受的是什么？</strong>（球路？节奏？落点？）</li>
      <li><strong>我刚才得分最有效的战术是什么？</strong>（记下 1 个套路，下局开 0-3 分再用一次）</li>
      <li><strong>下一局要保留 / 改变 / 放弃的各是什么？</strong>（用 3 个关键词标记）</li>
      </ol>
      <p><strong>复用套路</strong>：把你最稳定的 2 个战术写在球拍袋的小纸条上，局间不用回忆，看一眼即可。</p>

      <h3>心态自检清单（4 维）</h3>
      <table><tr><th>维度</th><th>问自己</th><th>应对</th></tr>
      <tr><td>情绪</td><td>我现在是兴奋/平静/沮丧？</td><td>兴奋 → 提示自己稳住；沮丧 → 用 4-7-8 呼吸；平静 → 保持</td></tr>
      <tr><td>专注</td><td>我还在想上一局的失误吗？</td><td>用一句"清零口令"（如"下一局 0-0"）打断反刍</td></tr>
      <tr><td>自信</td><td>我现在 1–10 分打几分？</td><td>≤6 → 提醒自己已得的分；≥8 → 警惕盲目冒险</td></tr>
      <tr><td>决断</td><td>下一局第一球我要打哪里？</td><td>回答"前场/中场/后场" + "正手/反手"，明确执行点</td></tr></table>

      <h3>90 秒快速自检 SOP（5 个 yes/no）</h3>
      <p>把上面 3 个清单压缩成 5 个问题，<strong>全部 yes 才上场</strong>。任何一项 no，立即处理后再上场：</p>
      <ul>
      <li>✅ 已补水（温水或运动饮料 ≥100 ml）</li>
      <li>✅ 已降温（毛巾擦汗 + 呼吸调整 ≥3 轮）</li>
      <li>✅ 已复盘（用 3 问清单明确"保留/改变"）</li>
      <li>✅ 心态已清零（情绪稳定、能说出下一局第一球的执行点）</li>
      <li>✅ 装备已就绪（拍线/鞋带/毛巾/水壶到位）</li>
      </ul>
      <p><strong>业余选手最常见错误</strong>：复盘时喋喋不休讨论"刚才那个球"，忘记喝水和降温。建议把"先补水、再复盘、最后心态"作为硬性顺序。</p>

      <h3>不同比分 + 状态组合的调整矩阵</h3>
      <p>把"比分情况"和"自检结果"叠加，得到更具体的调整方向：</p>
      <table><tr><th>比分 \ 体能</th><th>体能=绿</th><th>体能=黄</th><th>体能=红</th></tr>
      <tr><td>领先 5+</td><td>维持战术，主动控网</td><td>控制失误，多打对手弱点</td><td>借力打力，简化球路</td></tr>
      <tr><td>接近胶着</td><td>坚持节奏，1 球 1 球打</td><td>主动减速，打多拍消耗</td><td>只打最稳的 1 个套路</td></tr>
      <tr><td>落后 5+</td><td>立即变阵，祭出未展示战术</td><td>改变节奏（快→慢或反之）</td><td>减少主动进攻，只求不失分</td></tr></table>

      <h3>针对不同比分情况的调整（传统版）</h3>
      <table><tr><th>情况</th><th>调整方向</th></tr><tr><td>领先较多</td><td>维持战术、控制失误、不打冒险球</td></tr><tr><td>落后较多</td><td>主动变化、用未展示过的战术突袭</td></tr><tr><td>比分胶着</td><td>坚持自己的节奏，不要被对手带偏</td></tr><tr><td>第2局失分快</td><td>可能体能/心态问题，简化战术稳住</td></tr></table>

      <h3>教练员局间指导</h3>
      <p>如果带教练比赛：<br>① 教练用最简洁的语言（2-3 句话）<br>② 给 1-2 个具体执行点，不是泛泛建议<br>③ 永远先肯定再提改进<br>④ 注意语气：鼓励 > 指责</p>

      <p class="tip">💡 90 秒局间能做的最重要的事不是讨论战术，而是让身体和心理都"重启"。</p>
      <hr><p><em>参考文献：BWF 官方教练员培训教材 / 中国羽毛球队训练学 / NSCA-CSCS 体能恢复章节 / 林丹《直到世界尽头》局间策略 / Jeukendrup 局间补给建议</em></p>
    </div>`,
    // 9. 赛后复盘
    `<div class="reader-module-content">
      <h2>📝 赛后复盘</h2>
      <p>比赛结束不是终点，而是下一场比赛的起点。真正的成长发生在赛后复盘中。</p>
      <h3>复盘的黄金时间</h3>
      <p><strong>赛后30分钟内</strong>（情绪记忆最清晰）：<br>① 找一个安静的地方坐下<br>② 把即时感受写下来（不管好坏）<br>③ 评分：身体状态、心理状态、技术发挥各10分</p>
      <p><strong>赛后2小时内</strong>（细节记忆还清晰）：<br>① 重新看比赛录像或回忆关键分<br>② 列出3个做的好的地方和3个需要改进的地方<br>③ 标记关键转折分（比分发生重大变化的几个球）</p>
      <p><strong>赛后24小时内</strong>（认知更客观）：<br>① 和教练/球友讨论<br>② 写完整的复盘报告<br>③ 制定下阶段的训练调整计划</p>
      <h3>复盘模板</h3>
      <p>比赛日期/对手/比分/<br>技术表现（正手/反手/网前/杀球/步伐）：<br>战术执行（开局/中期/局末）：<br>心理状态（开局/中期/关键分）：<br>体能分配（三局体能曲线）：<br>亮点（3个）：<br>改进点（3个）：<br>下阶段训练调整：</p>
      <h3>胜负观</h3>
      <p>① <strong>赢了不飘</strong>：分析对手为什么失误而非自己发挥好<br>② <strong>输了不崩</strong>：找具体问题，下次针对性训练<br>③ <strong>过程导向</strong>：关注执行是否到位，而非比分<br>④ <strong>长期思维</strong>：一场比赛是长期训练的一次检验</p>
      <p class="tip">💡 复盘比训练更重要。一场不复盘的比赛=白打。一场深度复盘的比赛=额外获得10次训练。</p>
      <hr><p><em>参考文献：《复盘+》陈中 / 运动训练学复盘理论 / 羽毛球队教练员培训</em></p>
    </div>`,
    // 10. 长期比赛计划
    `<div class="reader-module-content">
      <h2>🎯 长期比赛计划</h2>
      <p>真正的比赛不只是上场那几小时，而是围绕比赛建立的全年/多年规划。</p>
      <h3>年度比赛计划制定</h3>
      <table><tr><th>阶段</th><th>时间</th><th>任务</th></tr><tr><td>赛季规划期</th><td>12-1月</td><th>确定年度比赛清单+目标</td></tr><tr><td>基础积累期</td><td>2-4月</td><th>体能+基本技术强化</td></tr><tr><td>专项强化期</td><td>5-7月</td><th>针对性战术+模拟比赛</td></tr><tr><td>比赛高峰期</th><td>8-10月</td><th>比赛为主+维持训练</td></tr><tr><td>总结调整期</th><td>11月</td><th>全年复盘+下年规划</td></tr></table>
      <h3>比赛分级管理</h3>
      <p><strong>A级（核心目标）</strong>：年度1-3个最重要的比赛，提前3-6个月规划<br><strong>B级（重要赛事）</strong>：月度1-2个重要比赛，提前1-2个月准备<br><strong>C级（练习赛）</strong>：周度训练性比赛，重在练手</p>
      <h3>每场比赛的角色</h3>
      <p>① <strong>核心目标比赛</strong>：调整到最佳状态，全力争胜<br>② <strong>重要比赛</strong>：比平时训练更投入，争取好成绩<br>③ <strong>练习赛</strong>：尝试新战术、新组合，不看重胜负</p>
      <h3>长期运动员发展</h3>
      <p>① <strong>年度目标</strong>：技术提升点+参赛目标+身体指标<br>② <strong>3年规划</strong>：技术全面性+战术体系+心理成熟<br>③ <strong>5年愿景</strong>：定位（业余高手/半专业/教练员）</p>
      <h3>避免的长期陷阱</h3>
      <p>❌ 频繁参赛无规划（过度疲劳+无法集中准备）<br>❌ 一场比赛决定论（单场胜负不代表真实水平）<br>❌ 训练和比赛割裂（每场比赛都应服务长期目标）<br>❌ 缺乏复盘的连续性（不复盘 = 没有进步）</p>
      <p class="tip">💡 业余选手一年能打10-30场比赛，每场比赛都有价值，前提是你有完整的规划。</p>
      <hr><p><em>参考文献：NSCA 长期训练计划理论 / 运动训练学 周期化训练</em></p>
    </div>`,
    // 11. 发接发战术体系
    `<div class="reader-module-content">
      <h2>🎯 发接发战术体系</h2>
      <p><strong>发球是羽毛球唯一完全由你控制的击球</strong>——它不受对手干扰、不依赖身体素质、不要求高超步法。在高水平比赛中，发接发的微小优势往往决定整场胜负。林丹曾说过："赢得比赛的人，往往是发接发做得更好的那个人。"</p>

      <h3>发球三要素</h3>
      <table><tr><th>要素</th><th>描述</th><th>实战标准</th></tr>
      <tr><td>高度</td><td>球过网时距网顶 5-10cm</td><td>越贴近网顶越好，越低越快</td></tr>
      <tr><td>落点</td><td>前发球线内 20-50cm 区域</td><td>贴近前发球线最难接</td></tr>
      <tr><td>速度</td><td>球越过球网后下坠快</td><td>对手反应时间＜0.4s</td></tr></table>

      <h3>单打 4 种基础发球套路</h3>
      <h4>① 反手网前小球（最常用）</h4>
      <p><strong>适用</strong>：90% 的发球场景<br><strong>动作要点</strong>：拍面贴网、手腕轻推、球贴网而过<br><strong>落点变化</strong>：1号位（贴近中线）→ 5号位（贴近边线）<br><strong>优势</strong>：球速最快、对手最难抢攻</p>

      <h4>② 反手高远球（破节奏）</h4>
      <p><strong>适用</strong>：对手网前抢攻凶狠、节奏过快的局面<br><strong>动作要点</strong>：球拍后摆幅度大、击球点高、飞向后场底线<br><strong>落点</strong>：直对角线（避免被中场截杀）<br><strong>战术价值</strong>：打乱对手预判节奏，争取回位时间</p>

      <h4>③ 正手发平快球（偷袭）</h4>
      <p><strong>适用</strong>：对手站位偏后、或接发站位偏左（被发球员的反手位）<br><strong>动作要点</strong>：低手平推、球几乎贴网飞过、速度快<br><strong>落点</strong>：直追身或反手位中场<br><strong>风险</strong>：一旦被识破会被抢攻，仅作为变化球使用</p>

      <h4>④ 反手发追身球（针对性）</h4>
      <p><strong>适用</strong>：对手反应慢、移动范围小<br><strong>落点</strong>：直对对手身体中线<br><strong>价值</strong>：让对手必须侧身接发，移动受限</p>

      <h3>单打发球轮换节奏（推荐模式）</h3>
      <table><tr><th>局点</th><th>发球策略</th><th>理由</th></tr>
      <tr><td>开局 0-5 分</td><td>网前小球 3-4 个 + 高远 1 个</td><td>建立节奏，试探对手接发</td></tr>
      <tr><td>5-15 分</td><td>根据对手站位调整</td><td>针对弱点针对性发球</td></tr>
      <tr><td>15-20 分（关键）</td><td>最稳的发球套路 2-3 个</td><td>避免冒险，稳中求胜</td></tr>
      <tr><td>局点（20+）</td><td>你最熟练的发球</td><td>信任自己的训练</td></tr></table>

      <h3>双打发接发战术（核心是抢攻）</h3>
      <p>双打发接发的核心目标是 <strong>"发接发抢攻"——直接得分或创造封网机会</strong>。业余双打与专业双打的差距，60% 来自发接发前三拍的处理。</p>

      <h4>双打发球 3 种基本形式</h4>
      <table><tr><th>发球形式</th><th>站位要求</th><th>主要落点</th><th>战术意图</th></tr>
      <tr><td>反手网前小球</td><td>前场球员发球</td><td>1 号位（贴近中线）</td><td>让对手无法抢攻，迫使挑高球</td></tr>
      <tr><td>反手 3 号位</td><td>前场球员发球</td><td>3 号位（前场中场）</td><td>中等高度，过网后下坠</td></tr>
      <tr><td>反手平快球</td><td>前场球员发球</td><td>贴近前发球线</td><td>快攻型双打使用，对手接发准备不足</td></tr></table>

      <h4>双打接发站位原则</h4>
      <p><strong>站位</strong>：贴近前发球线 30-50cm，拍头高举，准备抢攻<br><strong>接发准备</strong>：重心在前脚掌，膝盖微弯，随时启动<br><strong>三种接发策略</strong>：</p>
      <ul>
      <li><strong>放网</strong>：对手发球质量不高时，主动放网前</li>
      <li><strong>推扑</strong>：对手发球偏高时，直接推扑对方中场或后场</li>
      <li><strong>挑高</strong>：对手发球质量高或站位有漏洞时，挑到后场底线</li>
      </ul>

      <h3>接发球预判 4 步法</h3>
      <ol>
      <li><strong>看球拍</strong>：拍面角度、击球点高度（前/中/后）</li>
      <li><strong>看动作</strong>：手腕动作幅度（小=网前，大=高远）</li>
      <li><strong>看对手站位</strong>：对手准备往哪个方向移动</li>
      <li><strong>看历史</strong>：对手上一轮发球模式</li>
      </ol>
      <p><strong>预判反应时间</strong>：顶级球员从对手触球到自己击球，全过程＜0.6 秒。</p>

      <h3>关键分发接发处理</h3>
      <table><tr><th>场景</th><th>建议策略</th></tr>
      <tr><td>局点 20 平后接发</td><td>用你最稳的接发方式，不要冒险</td></tr>
      <tr><td>关键分发球</td><td>用你最熟练的发球套路</td></tr>
      <tr><td>对方发球特别好</td><td>改变接发站位（前→后），打乱对手节奏</td></tr>
      <tr><td>决胜局开局</td><td>简单稳定为主，建立信心</td></tr>
      <tr><td>连续丢分</td><td>主动改变发球模式（高远 → 网前 或反之）</td></tr></table>

      <h3>发接发训练方法</h3>
      <ol>
      <li><strong>多球发球训练</strong>：连续发球 20 个，要求落点准确在指定区域</li>
      <li><strong>接发反应训练</strong>：教练随机发球，球员在 0.4 秒内完成接发</li>
      <li><strong>发接发套路串练</strong>：固定 4-5 种发球→接发组合，反复演练</li>
      <li><strong>实战模拟</strong>：模拟关键分发球，记录得分率</li>
      <li><strong>录像复盘</strong>：回看自己比赛中发接发环节，发现模式漏洞</li>
      </ol>

      <h3>常见错误与纠正</h3>
      <table><tr><th>错误</th><th>症状</th><th>纠正方法</th></tr>
      <tr><td>发球过高</td><td>对手可以下压抢攻</td><td>降低击球点 + 拍面更前倾</td></tr>
      <tr><td>发球过长</td><td>球过前发球线</td><td>手腕轻推 + 控制挥拍幅度</td></tr>
      <tr><td>接发站位太后</td><td>反应时间不足</td><td>提前到前发球线附近</td></tr>
      <tr><td>接发动作过大</td><td>击球质量不稳定</td><td>减少引拍，靠手腕发力</td></tr>
      <tr><td>发球套路单一</td><td>被对手预判</td><td>训练 3-4 种发球轮换使用</td></tr>
      <tr><td>接发犹豫</td><td>错失最佳击球时机</td><td>赛前确定 2-3 种接发策略</td></tr></table>

      <h3>业余选手最容易忽视的发接发原则</h3>
      <ul>
      <li>❓ 发球前的呼吸节奏——很多人发球时屏息，影响稳定性</li>
      <li>❓ 发球后的回位准备——发球不是结束，是下一拍的开始</li>
      <li>❓ 接发后第一拍的连贯——接发→中场→下一拍要一气呵成</li>
      <li>❓ 对手接发习惯的观察——很多人打完球不知道分析对手</li>
      </ul>

      <p class="tip">💡 发接发是性价比最高的训练内容。业余选手每天花 10 分钟练习发球的落点和高度稳定性，3 个月后比赛成绩会明显提升。</p>
      <hr><p><em>参考文献：BWF 双打发接发战术指南 / 林丹《直到世界尽头》发接发篇 / 李矛教练战术分析 / 张楠双打发接发教学</em></p>
    </div>`,
  ],
};

// 📋 v3.7.7 STUDENT PROFILE — 个性化问卷 (level + injuries + strengths)
//   存在 localStorage; openLevelDetail 会 base × profile 修正 = effective weight
const PROFILE_KEY = 'lamb_student_profile_v1';
function getProfile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; } }
function setProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e) { console.warn('[setProfile]', e); } }
function hasProfile() { return !!getProfile(); }

// 📝 v3.7.9 STUDENT COMMENTS — 教练评语 (学员看)
//   学员本地存【收到的】评语 (作者+角色+文本+时间)
//   教练模拟写评语用同一个 localStorage key供学员能读到
const COMMENTS_KEY = 'lamb_received_comments_v1';
function getComments() { try { const r = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; } }
function addComment(opts) { try { const list = getComments(); list.push({ id: 'c_' + Date.now().toString(36), author: opts.author || '教练', role: opts.role || 'coach', text: opts.text || '', studentId: opts.studentId || 'self', ts: opts.ts || Date.now() }); localStorage.setItem(COMMENTS_KEY, JSON.stringify(list)); return list[list.length - 1]; } catch(e) { console.warn('[addComment]', e); return null; } }
function deleteComment(id) { try { const list = getComments().filter(c => c.id !== id); localStorage.setItem(COMMENTS_KEY, JSON.stringify(list)); } catch(e) {} }

// 伤病/优势 → 子串匹配 (子串在 ability.name 中则中)
const INJURY_RULES = [
  { id:'knee',     label:'🦵 膝',     match:['步伐','体能','弹跳','跳'],         factor:0.70 },
  { id:'shoulder', label:'💪 肩',     match:['杀球','高远','挥拍'],               factor:0.50 },
  { id:'wrist',    label:'✋ 腕',     match:['反手','握拍','网前'],               factor:0.60 },
  { id:'back',     label:'🔙 腰',     match:['杀球','步伐','体能'],               factor:0.40 },
  { id:'ankle',    label:'🦶 踝',     match:['步伐','体能','跳'],                 factor:0.60 },
  { id:'elbow',    label:'💢 肘',     match:['反手','握拍','网前'],               factor:0.40 },
];
const STRENGTH_RULES = [
  { id:'endurance', label:'🏃 体能好',   match:['体能'],                 factor:1.20 },
  { id:'endurance2',label:'🏃 体能好·步伐加成', match:['步伐'],         factor:1.10 },
  { id:'net',       label:'🎾 网前手感', match:['网前'],                 factor:1.25 },
  { id:'mental',    label:'🧠 心理稳',   match:['比赛','双打','战术'],  factor:1.15 },
  { id:'learning',  label:'⚡ 学习快',   match:[],                       factor:1.20, all: true },
  { id:'left',      label:'🤚 左手优势', match:['反手'],                 factor:1.25 },
  { id:'power',     label:'💥 力量大',   match:['杀球','高远'],          factor:1.25 },
];

// 给一组 abilities + profile → 返回带 effective 权重与 marker 的新 array
function applyProfileToWeights(abilities, profile) {
  if (!profile) return abilities.map(a => ({ ...a, effective: a.weight, marker: '', original: a.weight }));
  const injFired = INJURY_RULES.filter(r => profile.injuries && profile.injuries.includes(r.id));
  const strFired = STRENGTH_RULES.filter(r => profile.strengths && profile.strengths.includes(r.id));
  const allRules = STRENGTH_RULES.filter(r => r.all && profile.strengths && profile.strengths.includes(r.id));
  return abilities.map(ab => {
    let w = ab.weight;
    let marker = '';
    // 伤病 (往下调)
    for (const r of injFired) {
      if (r.match.length === 0) continue;
      if (r.match.some(k => ab.name.indexOf(k) >= 0)) {
        w = w * r.factor;
        marker = '❄️';
      }
    }
    // 优势 (往上调) — 排除与 “学习快” 同类的
    for (const r of strFired) {
      if (r.all) continue;
      if (r.match.length === 0) continue;
      if (r.match.some(k => ab.name.indexOf(k) >= 0)) {
        w = w * r.factor;
        if (!marker) marker = '🔥';
      }
    }
    // 全级优势 (学习快等) — 不带 marker
    for (const r of allRules) {
      w = w * r.factor;
    }
    return { ...ab, effective: Math.round(w), marker, original: ab.weight };
  });
}

// 📋 v3.7.5 LEVELS data — extended with abilities + drills（每个比重具练什么）
const LEVELS = [
  { id:'L0', label:'第零级 · 零基础启蒙', time:'0-1个月', emoji:'🌱',
    desc:'建立正确的神经肌肉控制模式，培养本体感觉和基础运动能力。从零到握拍和基本站位。',
    abilities: [
      { name:'握拍稳定性', weight:35, color:'#0a84ff',
        drills:[
          { name:'虎口对位反复', sets:3, reps:'10次/组', freq:'每天' },
          { name:'正反手切换练习', sets:3, reps:'15次/组', freq:'每天' },
        ]},
      { name:'准备姿势', weight:35, color:'#30d158',
        drills:[
          { name:'并步+持拍还原', sets:3, reps:'20次/组', freq:'每天' },
          { name:'重心转换', sets:2, reps:'15次/组', freq:'每天' },
        ]},
      { name:'高远挥拍空击', weight:20, color:'#0a84ff',
        drills:[
          { name:'无球空挥', sets:2, reps:'30拍/组', freq:'3次/周' },
          { name:'引拍动作分解', sets:2, reps:'15次/组', freq:'3次/周' },
        ]},
      { name:'体能基础', weight:10, color:'#30d158',
        drills:[
          { name:'慢跑+米字步', sets:1, reps:'15分/次', freq:'2次/周' },
          { name:'基础拉伸', sets:1, reps:'10分/次', freq:'每天' },
        ]},
    ]},
  { id:'L1', label:'第一级 · 基础建立', time:'1-3个月', emoji:'🌿',
    desc:'固化基础动作模式，建立关节稳定性和基础力量。高远球、网前小球基本动作定型。',
    abilities: [
      { name:'握拍变换', weight:20, color:'#0a84ff',
        drills:[
          { name:'正反手切换练习', sets:3, reps:'30次/组', freq:'3次/周' },
          { name:'握拍细节调整', sets:2, reps:'20次/组', freq:'3次/周' },
        ]},
      { name:'高远球到位率', weight:35, color:'#0a84ff',
        drills:[
          { name:'定点多球高远', sets:4, reps:'20拍/组', freq:'3次/周' },
          { name:'对拉高远', sets:3, reps:'30拍/组', freq:'2次/周' },
        ]},
      { name:'步伐基础', weight:30, color:'#0a84ff',
        drills:[
          { name:'米字步+并步', sets:3, reps:'20次/组', freq:'3次/周' },
          { name:'前后场移动', sets:3, reps:'10次/组', freq:'3次/周' },
        ]},
      { name:'体能准备', weight:15, color:'#30d158',
        drills:[
          { name:'跳绳+折返跑', sets:1, reps:'30分/次', freq:'2次/周' },
          { name:'核心激活', sets:3, reps:'45秒/组', freq:'3次/周' },
        ]},
    ]},
  { id:'L2', label:'第二级 · 技术入门', time:'3-6个月', emoji:'🌳',
    desc:'掌握基础击球技术，建立步法连贯性和基本战术意识。反手、步伐开始成型。',
    abilities: [
      { name:'反手技术', weight:25, color:'#0a84ff',
        drills:[
          { name:'反手高远对拉', sets:3, reps:'30拍/组', freq:'2次/周' },
          { name:'反手过渡球', sets:3, reps:'20拍/组', freq:'2次/周' },
        ]},
      { name:'网前小球', weight:25, color:'#af52de',
        drills:[
          { name:'网前搓球+勾对角', sets:4, reps:'20拍/组', freq:'2次/周' },
          { name:'网前挑球', sets:3, reps:'15拍/组', freq:'2次/周' },
        ]},
      { name:'步伐连贯', weight:30, color:'#0a84ff',
        drills:[
          { name:'全场 6 点步伐', sets:3, reps:'6点×3轮', freq:'3次/周' },
          { name:'四角跑动', sets:3, reps:'4角×3轮', freq:'3次/周' },
        ]},
      { name:'体能持续', weight:20, color:'#30d158',
        drills:[
          { name:'间歇跑 400m×6', sets:1, reps:'6组/次', freq:'2次/周' },
          { name:'跳绳双飞', sets:3, reps:'100次/组', freq:'3次/周' },
        ]},
    ]},
  { id:'L3', label:'第三级 · 技术熟练', time:'6-12个月', emoji:'🔥',
    desc:'实现技术自动化，掌握技术变化和简单战术应用。杀球、网前勾对角等进阶技术。',
    abilities: [
      { name:'杀球技术', weight:30, color:'#ff453a',
        drills:[
          { name:'原地起跳杀球', sets:3, reps:'15拍/组', freq:'2次/周' },
          { name:'后退杀球', sets:2, reps:'20拍/组', freq:'1次/周' },
        ]},
      { name:'网前勾对角', weight:15, color:'#af52de',
        drills:[
          { name:'多球勾对角', sets:3, reps:'20拍/组', freq:'2次/周' },
          { name:'网前组合', sets:3, reps:'搓勾挑×3', freq:'2次/周' },
        ]},
      { name:'步伐自动化', weight:25, color:'#0a84ff',
        drills:[
          { name:'米字步计时', sets:3, reps:'30秒/组', freq:'3次/周' },
          { name:'全场实战跑动', sets:3, reps:'6点/组', freq:'2次/周' },
        ]},
      { name:'体能专项', weight:30, color:'#30d158',
        drills:[
          { name:'跳绳双飞+折返', sets:1, reps:'20分/次', freq:'2次/周' },
          { name:'深蹲+弓步', sets:3, reps:'15次/组', freq:'3次/周' },
        ]},
    ]},
  { id:'L4', label:'第四级 · 技术精进', time:'1-1.5年', emoji:'💫',
    desc:'技术精细化打磨，掌握高级技术和战术应用。平抽快挡、多拍对抗。',
    abilities: [
      { name:'平抽快挡', weight:30, color:'#ff453a',
        drills:[
          { name:'双打平抽对抽', sets:3, reps:'30拍/组', freq:'2次/周' },
          { name:'网前接杀', sets:3, reps:'20拍/组', freq:'2次/周' },
        ]},
      { name:'杀球变线', weight:20, color:'#ff453a',
        drills:[
          { name:'后场 3 条线杀球', sets:3, reps:'15拍/组', freq:'2次/周' },
          { name:'变速杀球', sets:2, reps:'10拍/组', freq:'1次/周' },
        ]},
      { name:'步伐+体能整合', weight:30, color:'#0a84ff',
        drills:[
          { name:'全场 6 点 + 跳绳', sets:3, reps:'6点+100跳', freq:'2次/周' },
          { name:'多球连贯跑动', sets:3, reps:'20拍/组', freq:'2次/周' },
        ]},
      { name:'战术应用', weight:20, color:'#ffd60a',
        drills:[
          { name:'多球战术套路', sets:1, reps:'60分/次', freq:'1次/周' },
          { name:'录像分析+复盘', sets:1, reps:'30分/次', freq:'1次/周' },
        ]},
    ]},
  { id:'L5', label:'第五级 · 战术应用', time:'1.5-2年', emoji:'👑',
    desc:'建立完整战术体系，提升比赛阅读能力和战术执行。球路组合、节奏变化。',
    abilities: [
      { name:'双打配合', weight:30, color:'#ff453a',
        drills:[
          { name:'双打轮转站位', sets:1, reps:'90分/次', freq:'2次/周' },
          { name:'双打进攻组合', sets:3, reps:'20拍/组', freq:'2次/周' },
        ]},
      { name:'球路组织', weight:30, color:'#ffd60a',
        drills:[
          { name:'战术套路演练', sets:1, reps:'60分/次', freq:'2次/周' },
          { name:'节奏变化训练', sets:3, reps:'变速×3组', freq:'2次/周' },
        ]},
      { name:'杀球节奏', weight:20, color:'#ff453a',
        drills:[
          { name:'后场 5 拍组', sets:3, reps:'5拍×3组', freq:'2次/周' },
          { name:'连续 7 拍杀球', sets:2, reps:'10次/组', freq:'1次/周' },
        ]},
      { name:'比赛心理', weight:20, color:'#ffd60a',
        drills:[
          { name:'模拟赛 + 复盘', sets:1, reps:'90分/次', freq:'1次/周' },
          { name:'关键分演练', sets:3, reps:'5分×3局', freq:'1次/周' },
        ]},
    ]},
  { id:'L6', label:'第六级 · 准专业', time:'2-2.5年', emoji:'🏆',
    desc:'全面发展各项能力，适应专业训练强度和比赛准备。心理韧性、体能分配。',
    abilities: [
      { name:'杀球威力', weight:25, color:'#ff453a',
        drills:[
          { name:'后场全力杀球', sets:5, reps:'10拍/组', freq:'3次/周' },
          { name:'跳杀', sets:3, reps:'8拍/组', freq:'2次/周' },
        ]},
      { name:'双打战术', weight:25, color:'#ffd60a',
        drills:[
          { name:'双打专项战术', sets:1, reps:'90分/次', freq:'2次/周' },
          { name:'接发抢攻', sets:3, reps:'20拍/组', freq:'3次/周' },
        ]},
      { name:'体能极限', weight:25, color:'#30d158',
        drills:[
          { name:'YOYO 测试 + 间歇', sets:1, reps:'45分/次', freq:'2次/周' },
          { name:'全场体能冲刺', sets:6, reps:'30秒冲刺×6', freq:'2次/周' },
        ]},
      { name:'比赛心理强化', weight:25, color:'#ffd60a',
        drills:[
          { name:'压力情境模拟', sets:1, reps:'60分/次', freq:'1次/周' },
          { name:'赛后心理复盘', sets:1, reps:'30分/次', freq:'1次/周' },
        ]},
    ]},
  { id:'L7', label:'第七级 · 专业水平', time:'2.5-3年+', emoji:'🐉',
    desc:'达到专业水平，掌握比赛掌控和心理抗压能力。精英级训练体系。',
    abilities: [
      { name:'杀球全角度', weight:20, color:'#ff453a',
        drills:[
          { name:'后场 9 点杀球', sets:5, reps:'9点/组', freq:'3次/周' },
          { name:'专项杀点练习', sets:3, reps:'15拍/组', freq:'3次/周' },
        ]},
      { name:'网前极致', weight:15, color:'#af52de',
        drills:[
          { name:'网前 4 项全能', sets:4, reps:'搓勾挑拨×5', freq:'2次/周' },
          { name:'高速网前对抗', sets:3, reps:'30拍/组', freq:'2次/周' },
        ]},
      { name:'全场体能', weight:25, color:'#30d158',
        drills:[
          { name:'全场 8 点 + 跳绳', sets:3, reps:'8点+150跳', freq:'3次/周' },
          { name:'间歇冲刺', sets:10, reps:'30秒×10', freq:'3次/周' },
        ]},
      { name:'比赛掌控', weight:40, color:'#ffd60a',
        drills:[
          { name:'实战 + 录像复盘', sets:1, reps:'90分×2', freq:'2次/周' },
          { name:'关键分+局点模拟', sets:3, reps:'5局×3组', freq:'2次/周' },
        ]},
    ]},
];

// ─── 书塔书籍映射（次要入口） ──────────
const TOWER_BOOKS = ['badminton','finance','psychology','engineering-mechanics','nsca-cpt','yin-yang'];

// ═══════════════════════════════════════════════════════════════════
//  🎮 RPG 系统（保持完整）
// ═══════════════════════════════════════════════════════════════════
const RP_KEY = 'lamb_rpg_data';
function getRP() { try { return JSON.parse(localStorage.getItem(RP_KEY)||'{}'); } catch { return {}; } }
function setRP(r) { safeSet(RP_KEY, r); }
function getDefaultRP() { return { level:1, xp:0, xpToNext:100, achievements:{}, quests:{}, totalRead:0, totalQuizCorrect:0, avatar:'🧙', totalReadSeconds:0 }; }
function initRP() { let r=getRP(); if(!r.level){r=getDefaultRP();setRP(r);} r.xpToNext=getXpForLevel(r.level); return r; }
// v3.14.5 阅读时长：累加当前章节已驻留秒数进 RP（在页面可见时才计），供切章/离开时调用
function _tickReadSeconds() {
  if (!readStartTs) return 0;
  // 页面不可见时不计（后台 tab 静默时段）
  if (typeof document !== 'undefined' && document.hidden) return 0;
  const now = Date.now();
  if (now - lastTickTs < 800) return 0; // 节流：少于 0.8s 不动
  const delta = Math.min(5, Math.floor((now - lastTickTs) / 1000)); // 单次最多 5s，防呆防挂机
  if (delta > 0) {
    readSecThisChapter += delta;
    lastTickTs = now;
  }
  return readSecThisChapter;
}
// v3.14.5 阅读时长：切换章节/离开阅读器时，把当前章节驻留秒数持久化到 RP.totalReadSeconds
function _flushReadSeconds() {
  _tickReadSeconds();
  if (readSecThisChapter > 0) {
    try {
      const r = getRP();
      r.totalReadSeconds = (r.totalReadSeconds || 0) + readSecThisChapter;
      setRP(r);
    } catch (_) {}
  }
  readSecThisChapter = 0;
  readStartTs = 0;
  lastTickTs = 0;
}

// ─── 本周阅读目标（产品优化迭代 2026-08-02 新增）──
// ISO 周键（YYYY-Www），跨周自然滚动，永不污染旧周
function _isoWeekKey(d) {
  d = d || new Date();
  // 拷贝到本周一 00:00（ISO 周从周一开始）
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (dt.getUTCDay() + 6) % 7; // 周一=0
  dt.setUTCDate(dt.getUTCDate() - day);
  const year = dt.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  jan4.setUTCDate(jan4.getUTCDate() - jan4Day);
  const weekNo = Math.floor((dt - jan4) / (7 * 24 * 3600 * 1000)) + 1;
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}
function _getWeekReadSec() {
  const wk = safeGet('bk_read_week', {});
  return wk[_isoWeekKey()] || 0;
}
function _addWeekReadSec(delta) {
  if (!delta || delta <= 0) return;
  const wk = safeGet('bk_read_week', {});
  const k = _isoWeekKey();
  wk[k] = (wk[k] || 0) + delta;
  // 只保留近 8 周，防 localStorage 无限增长
  const keys = Object.keys(wk).sort().reverse();
  if (keys.length > 8) {
    for (let i = 8; i < keys.length; i++) delete wk[keys[i]];
  }
  safeSet('bk_read_week', wk);
}
// 触发累加 + 实时刷新阅读器顶部目标条（在 _tickReadSeconds 节流后调用）
function _tickWeekGoal() {
  // 单独维护一个"已计入本周桶"的秒数，避免 _flushReadSeconds 清零后重复加
  if (typeof _weekBucketDelta === 'undefined') _weekBucketDelta = 0;
  // 计算本次应累加 delta：当前 readSecThisChapter 减去上次已累计
  if (typeof _weekBucketBase === 'undefined') _weekBucketBase = 0;
  const pending = readSecThisChapter - _weekBucketBase;
  if (pending > 0) {
    _addWeekReadSec(pending);
    _weekBucketBase = readSecThisChapter;
  }
  _renderReadGoalBar();
}
function _renderReadGoalBar() {
  const bar = document.getElementById('readGoalBar');
  if (!bar) return;
  const sec = _getWeekReadSec();
  // 默认目标 30 分钟/周；用户可在 console：localStorage.setItem('bk_read_goal_min', 60)
  const goalMin = parseInt(safeGet('bk_read_goal_min', 30), 10) || 30;
  const goalSec = goalMin * 60;
  const cur = Math.floor(sec / 60);
  // 不再硬截断 100%：保留真实进度，让超额用户看到自己超越目标多少
  const pctRaw = goalSec > 0 ? (sec / goalSec) * 100 : 0;
  const pctDisplay = Math.round(pctRaw);
  const isDone = pctRaw >= 100;
  // 颜色：未达 60% 蓝，达 100% 金，超额 120% 加紫红强调
  let color, label;
  if (pctRaw >= 120) {
    color = '#a855f7'; // 紫：超额达人
    const overMin = Math.floor(sec / 60) - goalMin;
    label = `🚀 超越目标 ${overMin} 分钟 · 太卷了！`;
  } else if (isDone) {
    color = 'var(--gold)';
    label = `✅ 本周阅读目标已完成`;
  } else if (pctRaw >= 60) {
    color = 'var(--green)';
    label = `📈 本周已读 ${cur} 分钟 · 目标 ${goalMin} 分钟`;
  } else {
    color = 'var(--blue)';
    label = `📈 本周已读 ${cur} 分钟 · 目标 ${goalMin} 分钟`;
  }
  bar.innerHTML = `
    <div class="rgb-row" role="status" aria-live="polite" aria-label="${label}">
      <span class="rgb-label">${label}</span>
      <span class="rgb-pct" style="color:${color}">${pctDisplay}%</span>
    </div>
    <div class="rgb-track"><div class="rgb-fill" style="width:${Math.min(100, pctDisplay)}%;background:${color}"></div></div>
  `;
}
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
function showXpPopup(amt,src){const e=document.createElement('div');e.className='xp-popup';e.textContent=`+${amt} XP ${src}`;document.getElementById('app').appendChild(e);setTimeout(()=>e.remove(),900);}
function showLevelUp(oldLvl,newLvl){const t=['修行者','探索者','学者','智者','大师','宗师','传说'];const ot=t[Math.min(6,Math.floor(oldLvl/3))],nt=t[Math.min(6,Math.floor(newLvl/3))];const tc=ot!==nt;const o=document.createElement('div');o.className='levelup-overlay';o.innerHTML=`<div class="levelup-box"><div class="lu-icon">🎉</div><div class="lu-title">🎊 ${tc?'称号晋升！':'升级！'}</div><div style="font-size:48px;font-weight:700;color:var(--gold);margin:8px 0">Lv.${oldLvl} → Lv.${newLvl}</div>${tc?`<div style="font-size:14px;color:var(--text2);margin-bottom:8px">${ot} → <strong style="color:var(--green)">${nt}</strong></div>`:''}<div class="lu-sub">✨ ${['继续前行！','智慧增长！','每页都是成长！','坚持不懈！','学识如海！'][Math.min(4,Math.floor(newLvl/4))]}</div><div style="margin:12px 0;font-size:12px;color:var(--text3)">🎁 升级奖励：<span style="color:var(--green)">+${Math.floor(newLvl*100)} XP</span></div><button class="lu-btn" onclick="addXP(${Math.floor(newLvl*100)},'🎊 升级');this.closest('.levelup-overlay').remove()">🎯 领取奖励</button></div>`;document.body.appendChild(o);checkAchievements();}
function updateRpgHud(){const r=initRP(),h=$('rpgHud');if(!h)return;const pct=r.xpToNext>0?Math.min(100,Math.round(r.xp/r.xpToNext*100)):0;h.innerHTML=`<div class="rpg-level" onclick="openStats()"><span class="lvl">Lv.${r.level}</span><span>${r.avatar}</span></div><div class="rpg-xp-bar"><div class="rpg-xp-fill" style="width:${pct}%"></div></div><span class="rpg-xp-text">${r.xp}/${r.xpToNext}</span><div class="rpg-badge achievement" onclick="openAchievements()">🏆 ${Object.values(r.achievements||{}).filter(v=>v).length}</div><div class="rpg-badge quest" onclick="openQuests()">📋 任务</div>`;}

// ─── 进度系统 ──────────────────────────────────
const PK='bk_prog';
function getP(){try{return JSON.parse(localStorage.getItem(PK)||'{}');}catch{return {};}}
function setP(p){safeSet(PK,p);}
function markRead(bid,f){const p=getP();if(!p[bid])p[bid]=[];const isNew=!p[bid].includes(f);if(isNew){p[bid].push(f);setP(p);const r=getRP();if(!r.level){setRP(getDefaultRP());}r.totalRead=(r.totalRead||0)+1;setRP(r);addXP(10,'📖');checkAchievements();}updateProgress();return isNew;}
function unmarkRead(bid,f){const p=getP();if(p[bid]){p[bid]=p[bid].filter(x=>x!==f);setP(p);}updateProgress();}
function isRead(bid,f){const p=getP();return p[bid]&&p[bid].includes(f);}
function chProgress(bid){const b=MANIFEST?.books.find(x=>x.id===bid);if(!b||!b.chapters.length)return 0;const p=getP();const d=(p[bid]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/b.chapters.length;}
function totalP(){const total=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;if(!total)return 0;let d=0;const p=getP();for(const b of MANIFEST.books)d+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/total;}
// ─── 学员能力水平系统（取代单纯的读书进度条）───────────
// 五维加权：阅读25%+训练模块解锁25%+测验20%+连续15%+训练方法掌握15%
function calcAbilityScore() {
  const rp = getRP();
  const p = getP();
  if (!MANIFEST) return { score: 0, dims: {read:0,modules:0,quiz:0,streak:0,methods:0,application:50}, streak:0 };
  // 1. 阅读进度 (25%)
  const totalCh = MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0);
  let read = 0;
  for (const b of MANIFEST.books) read += (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
  const readPct = totalCh ? (read/totalCh) : 0;
  // 2. 训练模块解锁 (25%) — 按已访问模块数 / 6
  const visited = (rp.visitedModules || []).length;
  const modulePct = Math.min(1, visited / 6);
  // 3. 测验正确率 (20%)
  const quizTotal = rp.totalQuizCorrect || 0;
  const quizPct = Math.min(1, Math.log10(quizTotal + 1) / Math.log10(201)); // 0~200题满
  // 4. 连续学习 (15%)
  const streakMap = p._streak || {};
  const today = new Date(); today.setHours(0,0,0,0);
  const dayKey = d => d.toISOString().slice(0,10);
  let streak = 0;
  for (let i=0;i<365;i++) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (streakMap[dayKey(d)]) streak++;
    else if (i===0) continue;
    else break;
  }
  const streakPct = Math.min(1, streak / 100); // 100天封顶
  // 5. 训练方法掌握 (15%) — 基于等级（≤30级满）
  const lvlPct = Math.min(1, (rp.level||1) / 30);
  // v3.7.9 — 实战应用 第6维 (10%, 默认 50%起步 — 还没接实战数据)
  // 报名为 role-data 的 self 学员 查看其他学员 本地评语、profile => 计算全等级平均 (xp 排名) 的归一化
  let applicationPct = 0.5; // 默认 50%
  try {
    const appPct = readApplicationProgress();
    if (typeof appPct === 'number') applicationPct = Math.min(1, Math.max(0, appPct));
  } catch(e) {}
  // 总分保持 5 维权重不变, 第6维独立不参加总分 (避免破坏现有口径)
  const score = readPct*25 + modulePct*25 + quizPct*20 + streakPct*15 + lvlPct*15;
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    dims: { read: readPct*100, modules: modulePct*100, quiz: quizPct*100, streak: streakPct*100, methods: lvlPct*100, application: applicationPct*100 },
    streak
  };
}

// v3.7.9 — 计算“实战应用”分数 (0~1)
// 现实仅提供本地有数据处的 null/fallback，v3.7.10 会接入实战记录
function readApplicationProgress() {
  try {
    const local = JSON.parse(localStorage.getItem('lamb_application_v1') || 'null');
    if (local && typeof local.score === 'number') return local.score;
  } catch(e) {}
  return 0.5;  // 默认 50%
}

// 6个段位
const ABILITY_LEVELS = [
  { lv:1, min:0,  max:15, name:'入门预备', emoji:'🌱', color:'#9ca3af', desc:'刚刚开始，专注基础动作' },
  { lv:2, min:16, max:30, name:'基础建立', emoji:'🌿', color:'#3dd68c', desc:'动作模式逐步形成，不要急' },
  { lv:3, min:31, max:50, name:'系统训练中', emoji:'🌳', color:'#4f9aff', desc:'进入正循环，开始综合训练' },
  { lv:4, min:51, max:70, name:'进阶突破', emoji:'⚡', color:'#f59e0b', desc:'挑战新场景，参加实战比赛' },
  { lv:5, min:71, max:88, name:'高水平', emoji:'🏆', color:'#a855f7', desc:'从优秀到卓越，注重专项短板' },
  { lv:6, min:89, max:100, name:'大师级', emoji:'👑', color:'#fbbf24', desc:'触类旁通，传道授业' },
];

function getAbilityLevel(score) {
  return ABILITY_LEVELS.find(l => score >= l.min && score <= l.max) || ABILITY_LEVELS[0];
}

function updateProgress() {
  // 旧的读书进度逻辑：保留作为备份（防止其他代码还在调用）
  const tp = totalP();
  // 新逻辑：能力水平
  const ability = calcAbilityScore();
  const lv = getAbilityLevel(ability.score);
  // 首页 heroBar 显示能力成长进度
  const bar = $('heroBar');
  if (bar) {
    bar.style.width = ability.score + '%';
    bar.style.background = `linear-gradient(90deg, ${lv.color}, ${lv.color}cc)`;
  }
  const barGlow = $('heroBarGlow');
  if (barGlow) barGlow.style.cssText = `background: radial-gradient(circle, ${lv.color}66, transparent 70%);`;
  // badge 显示等级 + 进度
  const badge = $('progressBadge');
  if (badge) {
    badge.innerHTML = `${lv.emoji} Lv.${lv.lv}`;
    badge.style.background = lv.color + '22';
    badge.style.color = lv.color;
    badge.style.borderColor = lv.color + '44';
    badge.title = `${lv.name} · 能力分 ${ability.score}/100`;
  }
  // heroSub 加能力副标题（如果存在 appendChild 区域）
  const heroSub = $('heroSub');
  if (heroSub) {
    const detail = `能力 ${lv.name} · ${ability.score} 分`;
    const dim = `阅读${Math.round(ability.dims.read)}%·模块${Math.round(ability.dims.modules)}%·测验${Math.round(ability.dims.quiz)}%`;
    const exists = document.getElementById('heroAbilitySub');
    if (exists) exists.textContent = `${detail} · ${dim}`;
    else {
      const el = document.createElement('div');
      el.id = 'heroAbilitySub';
      el.style.cssText = 'font-size:11px;color:var(--text3);margin-top:4px;line-height:1.4';
      el.textContent = `${detail} · ${dim}`;
      heroSub.after(el);
    }
  }
  updateRpgHud();
}

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
  // v3.14.5 阅读时长：累计阅读满 30 分钟解锁
  focused_30min:{icon:'⏱️',name:'专注读者',desc:'累计阅读满 30 分钟',check:(r)=>(r.totalReadSeconds||0)>=1800},
  focused_3hr:{icon:'🕰️',name:'沉浸学者',desc:'累计阅读满 3 小时',check:(r)=>(r.totalReadSeconds||0)>=10800},
  // v3.14.6 测验连击：达到连击里程碑解锁
  streak_5:{icon:'🔥',name:'小试牛刀',desc:'测验达成 5 连击',check:(r)=>(r.bestQuizStreak||0)>=5},
  streak_10:{icon:'🔥',name:'势如破竹',desc:'测验达成 10 连击',check:(r)=>(r.bestQuizStreak||0)>=10},
  streak_20:{icon:'🌋',name:'连击大师',desc:'测验达成 20 连击',check:(r)=>(r.bestQuizStreak||0)>=20},
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
// 今日答对计数（每日任务 daily_quiz 用真实今日累计判定）
function _incDailyQuiz() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dk = safeGet('bk_daily_quiz', {});
    dk[today] = (dk[today] || 0) + 1;
    safeSet('bk_daily_quiz', dk);
  } catch (_) {}
}
function _getTodayReadFlag() {
  return safeGet('bk_today_read') === new Date().toISOString().slice(0, 10);
}
function _getTodayQuizCorrect() {
  const today = new Date().toISOString().slice(0, 10);
  const dk = safeGet('bk_daily_quiz', {});
  return dk[today] || 0;
}
function _getTodayReadSec() {
  const wk = safeGet('bk_read_week', {});
  const k = (typeof _isoWeekKey === 'function') ? _isoWeekKey() : '';
  const flushed = wk[k] || 0;
  const live = (typeof readSecThisChapter !== 'undefined') ? readSecThisChapter : 0;
  return flushed + live;
}
function getDailyQuests(){
  const todayRead = _getTodayReadFlag();
  const todayQuiz = _getTodayQuizCorrect();
  const todaySec = _getTodayReadSec();
  const quests = [
    {id:'daily_read', icon:'📖', name:'每日阅读', desc:'读一章', progress: todayRead ? '1/1' : '0/1', reward:'+20 XP', done: todayRead},
    {id:'daily_quiz', icon:'🧪', name:'测验打卡', desc:'今日答对 3 题', progress: Math.min(3, todayQuiz) + '/3', reward:'+15 XP', done: todayQuiz >= 3},
    {id:'daily_streak_min', icon:'⏱️', name:'今日专注', desc:'累计阅读 ≥ 5 分钟', progress: Math.min(5, Math.floor(todaySec/60)) + '/5 分', reward:'+10 XP', done: todaySec >= 300},
  ];
  return quests;
}
function openQuests(){
  const r=getRP();if(!r.quests)r.quests={};
  const qs=getDailyQuests();
  const today=new Date().toISOString().slice(0,10);
  const lastQuestDay=safeGet('bk_quests_day');
  if(lastQuestDay && lastQuestDay!==today){r.quests={};setRP(r);}
  safeSet('bk_quests_day', today);
  const completedCount=qs.filter(function(q){return q.done;}).length;
  let h='<div class="quest-list">';
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    const done=q.done;
    const row='<div class="quest-item '+(done?'completed':'')+'">'
      +'<div class="qi-icon">'+q.icon+'</div>'
      +'<div class="qi-info">'
        +'<div class="qi-name">'+q.name+' <span style="float:right;font-size:10px;color:'+(done?'var(--green)':'var(--text3)')+';font-weight:600">'+q.progress+'</span></div>'
        +'<div class="qi-desc">'+q.desc+'</div>'
        +'<div class="qi-reward">🎁 '+q.reward+(done?' · ✅ 已完成':' · ⏳ 待完成')+'</div>'
      +'</div></div>';
    h+=row;
  }
  h+='</div>';
  if(completedCount===qs.length){
    h+='<div style="margin-top:14px;padding:10px;background:var(--bg3);border-radius:8px;text-align:center;font-size:12px;color:var(--green)">🎉 今日三任务全部完成！坚持就是胜利。</div>';
  } else {
    h+='<div style="margin-top:10px;font-size:11px;color:var(--text3);text-align:center">📅 '+today+' · '+completedCount+'/'+qs.length+' 完成</div>';
  }
  showOverlay('panel-quest','📋 每日任务',h);
}

// ─── Stats ──────────────────────────────
function openStats(){const tp=totalP();const totalCh=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;const p=getP();let totalRead=0;for(const b of MANIFEST.books)totalRead+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;const r=initRP();const achCount=Object.values(r.achievements||{}).filter(v=>v).length;const content=`<div class="stats-grid"><div class="stat-card"><div class="sc-num">${totalRead}</div><div class="sc-label">✅ 已通关</div></div><div class="stat-card"><div class="sc-num">${totalCh-totalRead}</div><div class="sc-label">📖 未读</div></div><div class="stat-card"><div class="sc-num">${MANIFEST.books.length}</div><div class="sc-label">📚 书塔</div></div><div class="stat-card"><div class="sc-num">${Math.round(tp*100)}%</div><div class="sc-label">📊 总进度</div></div></div><div style="text-align:center;margin:14px 0"><span style="font-size:36px">${r.avatar}</span><div style="font-size:14px;font-weight:600;margin:4px 0">Lv.${r.level} · 🧪 ${r.xp}/${r.xpToNext} XP</div><div style="font-size:11px;color:var(--text2)">🏆 ${achCount} 成就 · 🧪 ${r.totalQuizCorrect||0} 测验 · 🔥 最高连击 ${r.bestQuizStreak||0} · ⏱️ 累计阅读 ${Math.floor((r.totalReadSeconds||0)/60)} 分钟</div></div>`;showOverlay('panel-stats','📊 训练报告',content);}

// ═══════════════════════════════════════════════════════════════════
//  🏠 Dashboard 首页渲染（对标参考站风格）
// ═══════════════════════════════════════════════════════════════════

// 渲染首页"继续阅读"入口卡片。无最近阅读记录则不渲染。
// v3.21.5 升级：支持多本书最近阅读（bk_history 数组），每本书单独一行卡片。
// 旧数据 bk_last_read（单值）会在首次访问时被迁移。
function renderContinueReading() {
  const sec = $('principlesSection');
  if (!sec) return;
  // 移除旧条目（重渲染时）
  const old = document.getElementById('continueReadingSection');
  if (old) old.remove();

  const history = _getReadHistory();
  if (!history.length) return;
  // MANIFEST 尚未就绪时跳过
  const books = (typeof MANIFEST !== 'undefined' && MANIFEST && MANIFEST.books) ? MANIFEST.books : null;
  if (!books) return;
  // 过滤掉书不在 MANIFEST / 章节已下架的条目（防御性）
  const valid = history.filter(h => {
    const b = books.find(x => x.id === h.bookId);
    return !!(b && b.chapters[h.chapterIdx]);
  });
  if (!valid.length) return;

  const fmtAgo = (ts) => {
    if (!ts) return '继续上次的进度';
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    if (min < 60 * 24) return `${Math.floor(min / 60)} 小时前`;
    return `${Math.floor(min / 1440)} 天前`;
  };

  const cardsHtml = valid.map((h) => {
    const book = books.find(b => b.id === h.bookId);
    const ch = book.chapters[h.chapterIdx];
    const total = book.chapters.length;
    const idx = Math.max(0, Math.min(h.chapterIdx, total - 1));
    const pct = Math.round(((idx + 1) / total) * 100);
    const ago = fmtAgo(h.ts);
    const bookTitle = escapeHTML(book.title || book.id);
    const chTitle = escapeHTML(ch.title || '');
    return `
      <div class="cr-card ios-press" onclick="resumeLastRead('${book.id}')" role="button" tabindex="0"
           aria-label="继续阅读 ${escapeAttr(book.title || book.id)} 第 ${idx + 1} 节">
        <div class="cr-icon">📚</div>
        <div class="cr-body">
          <div class="cr-book">${bookTitle}</div>
          <div class="cr-chapter">第 ${idx + 1}/${total} 节 · ${chTitle}</div>
          <div class="cr-bar"><div class="cr-bar-fill" style="width:${pct}%"></div></div>
          <div class="cr-meta">
            <span>${pct}% · ${ago}</span>
            <span class="cr-arrow">继续 →</span>
          </div>
        </div>
        <button class="cr-dismiss" onclick="event.stopPropagation();_removeFromReadHistory('${book.id}')"
                aria-label="从继续阅读移除《${escapeAttr(book.title || book.id)}》"
                title="移除此书">✕</button>
      </div>`;
  }).join('');

  const html = `
    <div id="continueReadingSection" class="continue-reading">
      <div class="section-divider"><span class="sd-label">📖 继续阅读</span><div class="sd-line"></div></div>
      <div class="cr-list">${cardsHtml}</div>
    </div>`;
  sec.insertAdjacentHTML('beforebegin', html);
}

// 读取最近阅读历史（多本书）。迁移旧格式 bk_last_read → bk_history。
// 返回数组按 ts 倒序：首项是最近一次阅读。
function _getReadHistory() {
  // 优先新格式
  const arr = safeGet('bk_history');
  if (Array.isArray(arr) && arr.length) return arr;
  // 迁移旧格式
  const legacy = safeGet('bk_last_read');
  if (legacy && legacy.bookId && typeof legacy.chapterIdx === 'number') {
    const migrated = [legacy];
    safeSet('bk_history', migrated);
    return migrated;
  }
  return [];
}

// 从"继续阅读"历史移除单本书（不影响章节进度，仅清掉首页入口）。
// 用于清理「打开过一次再也不读」的死条目，避免挤掉真正活跃的书。
function _removeFromReadHistory(bookId) {
  const list = _getReadHistory().filter(h => h && h.bookId !== bookId);
  safeSet('bk_history', list);
  renderContinueReading();
  showToast('🗑️ 已从继续阅读移除', 1800);
}

// 记录一次阅读事件：把特定书推到历史最前（一次刷新同一书只挪位置，不重复占位）。
// 容量上限 6 本（覆盖多本书切换 + 老书罕见复活两种场景）。
function _pushReadHistory(bookId, chapterIdx) {
  let list = _getReadHistory();
  // 同书只保留最新一次（其它更旧的位置剔除，避免列表被同一本书反复刷掉）
  list = list.filter(h => h && h.bookId !== bookId);
  list.unshift({ bookId, chapterIdx, ts: Date.now() });
  if (list.length > 6) list = list.slice(0, 6);
  safeSet('bk_history', list);
  // 同步旧键，避免旧逻辑/外部分析读到
  try { localStorage.removeItem('bk_last_read'); } catch (_) {}
}

// 点击"继续阅读"卡片：跳转到指定书/章节。bookId 可选，不传则跳最近的一本。
function resumeLastRead(bookId) {
  const history = _getReadHistory();
  if (!history.length) return;
  const target = bookId
    ? history.find(h => h.bookId === bookId)
    : history[0];
  if (!target) return;
  const books = (typeof MANIFEST !== 'undefined' && MANIFEST && MANIFEST.books) ? MANIFEST.books : null;
  if (!books) return;
  const book = books.find(b => b.id === target.bookId);
  if (!book || !book.chapters[target.chapterIdx]) return;
  currentBookId = target.bookId;
  openChapter(target.chapterIdx);
  setTimeout(() => showToast(`📖 已回到《${book.title || book.id}》第 ${target.chapterIdx + 1} 节`, 2400), 80);
}

function renderDashboard() {
  currentModule = 'dashboard';
  showView('dashboard');
  const r = initRP();

  // ── Stats ──
  $('sModules').textContent = TRAIN_MODULES.length;
  $('sDocs').textContent = TRAIN_MODULES.reduce((s,m)=>s+m.docs,0);
  $('sCycle').textContent = '3yr';
  $('heroSub').textContent = `${TRAIN_MODULES.length}大训练模块 · 融合心理学·营养学·比赛策略 · 基于NSCA-CSCS科学体系`;
  // 版本号（首页可见）
  const verEl = document.createElement('div');
  verEl.style.cssText = 'font-size:9px;color:var(--text4);margin-top:4px;cursor:pointer';
  verEl.textContent = `${APP_VERSION} · ${APP_DATE}`;
  verEl.onclick = () => openStats();
  const heroSub = $('heroSub');
  if (heroSub && !document.getElementById('heroVersion')) {
    verEl.id = 'heroVersion';
    heroSub.after(verEl);
  } else {
    const existing = document.getElementById('heroVersion');
    if (existing) existing.textContent = `${APP_VERSION} · ${APP_DATE}`;
  }

  // ── 📖 继续阅读（如有最近阅读记录） ──
  renderContinueReading();

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

  // ── 🏆 训练等级体系（金字塔 v2 安全版，2026-07-06）──
  // 设计原则：JS 逆序渲染（L7→L0），CSS 正向堆叠，不依赖 column-reverse
  // 色系使用双主题兼容的 solid gradient，不依赖任何仅在 [data-theme="dark"] 中定义的变量
  $('levelSection').innerHTML = LEVELS.slice().reverse().map((l, idx) => {
    // idx 0 = 顶层 L7 窄顶，idx 7 = 底层 L0 宽底
    const isBase = idx === 7;  // L0 最底层
    const isApex = idx === 0;  // L7 最顶层
    // 颜色：底层 L0 绿色顶层 L7 金色，中间 8 级用三色 gradient
    const tierColors = ['#ffd60a', '#fbbf24', '#f59e0b', '#a855f7', '#7c3aed', '#3b82f6', '#10b981', '#3dd68c'];
    const color = tierColors[idx] || '#3dd68c';
    return `<div class="level-pyramid-tier" data-tier="${idx}" style="background:linear-gradient(135deg, ${color}, ${color}cc); width:${50 + idx * 5}%; cursor:pointer" onclick="openLevelDetail('${l.id}')">
      <div class="lp-emoji">${l.emoji}</div>
      <div class="lp-info">
        <div class="lp-label">${l.label}</div>
        <div class="lp-time">${l.time} · ${l.id}</div>
        <div class="lp-desc">${l.desc}</div>
      </div>
    </div>`;
  }).join('') + `<div id="profileEntry" style="text-align:center;margin-top:14px">
    <button onclick="openStudentProfile()" class="ios-press" style="background:linear-gradient(135deg,var(--blue),var(--purple));color:#fff;border:none;padding:9px 18px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer">📋 我的个性化训练方案</button>
    <div id="profileStatus" style="font-size:10px;color:var(--text3);margin-top:4px"></div>
  </div>`;
  // v3.7.7: 表明问卷状态
  try {
    const p = getProfile();
    const el = $('profileStatus');
    if (el) {
      if (p) el.textContent = '✅ 已根据你的伤病/优势调整 (点上面重填)';
      else el.textContent = '⏱ 30 秒填一下 · 根据你身体定制每个训练等级的比重';
    }
  } catch(e) {}

  // ── 🎯 教练系统 (仅次于首页) ──
  $('moduleSection').innerHTML = `
    <div class="module-card coach-highlight" onclick="openCoach()" style="border-top:3px solid var(--gold);background:linear-gradient(135deg,var(--bg2),rgba(255,214,10,.04))">
      <div class="mc-icon">🎯</div>
      <div class="mc-title">教练系统 <span style="font-size:9px;background:var(--gold);color:#000;padding:1px 6px;border-radius:8px;margin-left:4px;font-weight:600">RECOMMEND</span></div>
      <div class="mc-desc">AI教练辅助 · 训练计划编排 · 动作分析 · 6专家21轮研讨体系</div>
      <div class="mc-tags">
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">学员评估</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">计划设计</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">课例模板</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">速查手册</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">教练系统</span>
      </div>
      <div class="mc-foot"><span>🏆 6专家 · 21轮研讨</span><span class="mc-arrow">进入教练工作台 →</span></div>
    }</div>` + TRAIN_MODULES.filter(m=>m.id!=='coach').map(m => {
    const colors = {'var(--blue)':'#4f9aff','var(--green)':'#3dd68c','var(--purple)':'#a855f7','var(--orange)':'#f59e0b','var(--red)':'#f06060'};
    const c = colors[m.color]||'#4f9aff';
    // 计算模块进度：累加映射书籍下已完成章节数 / 该模块声明的章节数
    const total = m.chapters.length || m.docs || 0;
    let done = 0;
    if (m.books && m.books.length && typeof MANIFEST !== 'undefined' && MANIFEST) {
      const p = (typeof getP === 'function') ? getP() : {};
      for (const bid of m.books) {
        const book = MANIFEST.books.find(x => x.id === bid);
        if (!book) continue;
        const readFiles = (p[bid] || []);
        done += book.chapters.filter(ch => readFiles.includes(ch.file)).length;
      }
    }
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const progressHTML = total ? `
      <div class="mc-progress" aria-label="模块完成度 ${pct}%">
        <div class="mc-progress-bar"><div class="mc-progress-fill" style="width:${pct}%;background:${c}"></div></div>
        <div class="mc-progress-meta"><span>${done}/${total} 节</span><span style="color:${c};font-weight:600">${pct}%</span></div>
      </div>` : '';
    // 计算"继续下一节"按钮：找该模块映射书籍里的第一个未读章节
    let nextActionHTML = '';
    if (m.books && m.books.length && typeof MANIFEST !== 'undefined' && MANIFEST && total) {
      const prog = (typeof getP === 'function') ? getP() : {};
      let nextTarget = null; // { bookId, chIdx, title }
      // 优先：模块内第一本未完成书的第一个未读章节
      for (const bid of m.books) {
        const book = MANIFEST.books.find(x => x.id === bid);
        if (!book) continue;
        const read = prog[bid] || [];
        const idx = book.chapters.findIndex(ch => !read.includes(ch.file));
        if (idx >= 0) { nextTarget = { bookId: bid, chIdx: idx, title: (book.chapters[idx].title || ('第' + (idx+1) + '节')) }; break; }
      }
      const isComplete = pct >= 100;
      if (isComplete) {
        // 🔄 完成态对称闭环：给一个「重读最后一节」的具体去处，避免完成态用户只剩「回顾」空按钮
        let lastTarget = null;
        for (const bid of m.books) {
          const book = MANIFEST.books.find(x => x.id === bid);
          if (!book) continue;
          const lastIdx = book.chapters.length - 1;
          if (lastIdx >= 0) lastTarget = { bookId: bid, chIdx: lastIdx, title: (book.chapters[lastIdx].title || ('第' + (lastIdx+1) + '节')) };
        }
        if (lastTarget) {
          const titleRaw = lastTarget.title || ('第 ' + (lastTarget.chIdx+1) + ' 节');
          const titleShort = titleRaw.length > 14 ? (titleRaw.slice(0, 13) + '…') : titleRaw;
          nextActionHTML = `<button class="mc-cta mc-cta-done" onclick="event.stopPropagation();openModuleChapterById('${m.id}','${lastTarget.bookId}',${lastTarget.chIdx})" aria-label="重读最后一节">🔄 重读最后一节 · ${escapeHTML(titleShort)}</button>`;
        } else {
          nextActionHTML = `<button class="mc-cta mc-cta-done" onclick="event.stopPropagation();openTrainModule('${m.id}')" aria-label="回顾已完成模块">✅ 已完成 · 回顾</button>`;
        }
      } else if (nextTarget) {
        const titleRaw = nextTarget.title || ('第 ' + (nextTarget.chIdx+1) + ' 节');
        const titleShort = titleRaw.length > 14 ? (titleRaw.slice(0, 13) + '…') : titleRaw;
        // 直接调 openModuleChapterById，跳过 topic 模运算的取模路径
        nextActionHTML = `<button class="mc-cta" style="--cta:${c}" onclick="event.stopPropagation();openModuleChapterById('${m.id}','${nextTarget.bookId}',${nextTarget.chIdx})" aria-label="继续第 ${nextTarget.chIdx+1} 节">▶ 继续第 ${nextTarget.chIdx+1} 节 · ${escapeHTML(titleShort)}</button>`;
      } else {
        nextActionHTML = `<button class="mc-cta mc-cta-start" style="--cta:${c}" onclick="event.stopPropagation();openModuleTopic('${m.id}',0)" aria-label="开始第 1 节">🚀 开始第 1 节</button>`;
      }
    }
    return `<div class="module-card ${pct>=100?'module-complete':''}" onclick="openTrainModule('${m.id}')" style="border-top:3px solid ${c}">
      <div class="mc-icon">${m.icon}</div>
      <div class="mc-title">${m.title}${pct>=100?' <span class="mc-badge-done">已完成</span>':''}</div>
      <div class="mc-desc">${m.desc}</div>
      <div class="mc-tags">${m.tags.map(t=>`<span class="mc-tag" style="border-color:${c}20;color:${c}">${t}</span>`).join('')}</div>
      ${progressHTML}
      ${nextActionHTML}
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
  let html = '';
  
  // ── 顶部导航（始终可见）──
  html += '<div class="side-section side-section-links">';
  html += `<div class="side-link ${currentModule==='dashboard'?'active':''}" onclick="goHome()"><span class="sl-icon">🏠</span> 首页</div>`;
  html += `<div class="side-link ${currentModule==='coach'?'active':''}" onclick="openCoach()"><span class="sl-icon">🎯</span> 教练</div>`;
  html += `<div class="side-link" onclick="openEyeSystem()"><span class="sl-icon">📊</span> 数据中心</div>`;
  html += '</div>';

  // ── 训练系统（折叠）──
  const isTrainingActive = ['badminton-tech','strength','psychology','nutrition','competition','personal'].includes(currentModule);
  html += `<div class="side-section"><div class="side-title collapsible" onclick="toggleSideSection(this)">🏸 训练模块 ${isTrainingActive?'▼':'▶'}</div>`;
  html += `<div class="side-collapsible" ${isTrainingActive?'':'style="display:none"'}>${renderTrainingItems()}</div>`;
  html += '</div>';

  // ── 工具集（折叠）──
  html += `<div class="side-section"><div class="side-title collapsible" onclick="toggleSideSection(this)">🛠️ 工具 ▼</div>`;
  html += `<div class="side-collapsible" style="display:none">${renderToolItems()}</div>`;
  html += '</div>';

  list.innerHTML = html;
}

function renderBookListItems() {
  if (!MANIFEST) return '';
  return MANIFEST.books.filter(b=>TOWER_BOOKS.includes(b.id)).map(b => {
    const p = chProgress(b.id);
    return `<div class="b-item ${currentBookId===b.id?'active':''}" data-bid="${b.id}" onclick="goToBook('${b.id}')">
      <span class="be">${b.emoji}</span><span class="bt">${b.title}</span>
      <span class="bc">${b.chapters.length}</span><span class="bp" style="width:${Math.round(p*100)}%"></span>
    </div>`;
  }).join('');
}

function renderTrainingItems() {
  return TRAIN_MODULES.filter(m=>m.id!=='coach').map(m => {
    return `<div class="side-link sub ${currentModule===m.id?'active':''}" onclick="openTrainModule('${m.id}')"><span class="sl-icon">${m.icon}</span> ${m.title}</div>`;
  }).join('');
}

// 🐑眼系统 - 观察者视角
function openEyeSystem() {
  showView('book');
  currentModule = 'eye';
  navStack.push({view:'dashboard'});
  historyPush('eye', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🐑 🐑眼系统</h1>
    <div class="vm">观察者视角 · 全局洞察 · 趋势分析</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">📊</span><span class="bs-label">数据总览</span></div>
    <div class="bs-item"><span class="bs-num">📈</span><span class="bs-label">趋势追踪</span></div>
    <div class="bs-item"><span class="bs-num">🎯</span><span class="bs-label">目标进度</span></div>`;
  $('contentGrid').innerHTML = `
    <div class="calc-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--purple);border-radius:var(--radius);padding:16px;grid-column:1/-1">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="font-size:32px">🐑</div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;color:var(--purple)">🐑眼系统 · 观察者视角</div>
          <div style="font-size:11px;color:var(--text2);line-height:1.5">
            从全局视角观察训练数据、学习进度、能力成长趋势<br>
            📊 仪表盘 · 📈 趋势图 · 🎯 目标追踪
          </div>
        </div>
        <button onclick="openEyeDashboard()" class="tb-btn" style="font-size:12px;padding:6px 14px;background:var(--purple);color:#fff;border:none;font-weight:600">🚀 打开仪表盘</button>
      </div>
    </div>
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3)">功能开发中...</div>`;
}

function openEyeDashboard() {
  // 🐏眼 v3.14.9 — 从「3 卡 + 进度条 + 占位」升级为多面板观察者仪表盘
  // 数据源：getRP()·getP()·getComments()·calcAbilityScore()·p._streak·lamb_application_v1
  const rp = getRP();
  const p = getP();
  const totalXp = rp.xp || 0;
  const level = rp.level || 1;
  const streak = rp.streak || 0;

  // ── 阅读进度 ─────────────────────────────
  let totalRead = 0, totalChapters = 0, readPct = 0;
  let bookProgress = [];
  if (MANIFEST) {
    MANIFEST.books.forEach(b => {
      const readList = p[b.id] || [];
      const readCount = b.chapters.filter(c => readList.includes(c.file)).length;
      totalChapters += b.chapters.length;
      totalRead += readCount;
      bookProgress.push({ id: b.id, title: b.title, emoji: b.emoji, color: b.color || 'var(--blue)', read: readCount, total: b.chapters.length, pct: b.chapters.length ? Math.round(readCount / b.chapters.length * 100) : 0 });
    });
    if (totalChapters) readPct = Math.round(totalRead / totalChapters * 100);
  }

  // ── 本周 7 天热力图（基于 p._streak 日期 map） ─
  const streakMap = p._streak || {};
  const heatDays = [];
  const labels = ['日','一','二','三','四','五','六'];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    heatDays.push({ key, label: labels[d.getDay()], date: d.getDate(), active: !!streakMap[key], isToday: i === 0 });
  }
  const weekActive = heatDays.filter(d => d.active).length;
  const heatHtml = heatDays.map(d => {
    const bg = d.active ? 'linear-gradient(135deg,var(--green),var(--blue))' : 'var(--bg2)';
    const txt = d.active ? '#fff' : 'var(--text3)';
    return `<div title="${d.key}${d.active?' · 已学习':''}" style="flex:1;aspect-ratio:1/1;border-radius:6px;background:${bg};color:${txt};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;font-weight:600;${d.isToday?'outline:1.5px solid var(--gold);outline-offset:1px':''}">
      <div style="opacity:.75">${d.label}</div>
      <div style="font-size:11px;font-weight:700">${d.date}</div>
      ${d.active ? '<div style="font-size:8px">🔥</div>' : ''}
    </div>`;
  }).join('');

  // ── 每本书进度条 ─────────────────────────────
  const bookRows = bookProgress.sort((a,b) => b.pct - a.pct).map(b => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="font-size:14px;width:18px;text-align:center">${b.emoji}</span>
      <span style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${b.title}</span>
      <span style="font-size:10px;color:var(--text3);width:46px;text-align:right">${b.read}/${b.total}</span>
      <span style="width:90px;height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
        <span style="display:block;height:100%;width:${b.pct}%;background:${b.color};border-radius:3px"></span>
      </span>
      <span style="font-size:10px;font-weight:600;width:32px;text-align:right;color:${b.color}">${b.pct}%</span>
    </div>`).join('');

  // ── 6 维能力雷达（小尺寸 SVG） ─────────────
  let radarMini = '';
  try {
    if (typeof calcAbilityScore === 'function') {
      const a = calcAbilityScore();
      const dims = a.dims || {};
      const radarDims = [
        { key:'read',       name:'阅读',  angle:-90 },
        { key:'modules',    name:'模块',  angle:-30 },
        { key:'quiz',       name:'测验',  angle: 30 },
        { key:'streak',     name:'连续',  angle: 90 },
        { key:'methods',    name:'掌握',  angle:150 },
        { key:'application',name:'实战',  angle:210 },
      ];
      const cx = 60, cy = 60, maxR = 44;
      const pts = radarDims.map(d => {
        const v = Math.min(100, Math.max(0, dims[d.key] || 0));
        const r = maxR * v / 100;
        const rad = d.angle * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad), lx: cx + (maxR + 9) * Math.cos(rad), ly: cy + (maxR + 9) * Math.sin(rad), v, name: d.name };
      });
      const dataPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const gridPolys = [25, 50, 75, 100].map(pct => {
        const r = maxR * pct / 100;
        const ps = radarDims.map(d => {
          const rad = d.angle * Math.PI / 180;
          return `${(cx + r * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${ps}" fill="none" stroke="#475569" stroke-width="0.4" opacity="${pct===100?0.6:0.25}"/>`;
      }).join('');
      const dots = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2" fill="#3b82f6" stroke="var(--bg3)" stroke-width="0.8"/>`).join('');
      const labels = pts.map(p => `<text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="var(--text2)">${p.name}${Math.round(p.v)}</text>`).join('');
      radarMini = `<svg viewBox="0 0 120 120" style="width:140px;height:140px;display:block">
        ${gridPolys}${dots}${labels}
        <polygon points="${dataPts}" fill="rgba(99,140,255,0.18)" stroke="#3b82f6" stroke-width="1.3" stroke-linejoin="round"/>
        <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--gold)">${a.score}</text>
        <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="6" fill="var(--text3)">/ 100</text>
      </svg>`;
    }
  } catch(e) { /* calc not ready */ }

  // ── 教练评语 feed（最近 3 条） ─────────────
  const comments = getComments().slice().sort((a,b) => (b.ts||0) - (a.ts||0)).slice(0, 3);
  const commentHtml = comments.length === 0
    ? '<div style="text-align:center;color:var(--text3);padding:10px;font-size:11px">暂无评语 · 写一条试试 →</div>'
    : comments.map(c => `<div style="background:var(--bg2);border-left:3px solid var(--purple);padding:7px 9px;border-radius:5px;margin-bottom:5px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
          <span style="font-size:10px;font-weight:600">${c.role==='coach'?'🎓':'🧑'}${c.author||'教练'}</span>
          <span style="font-size:9px;color:var(--text3)">${new Date(c.ts).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'})}</span>
        </div>
        <div style="font-size:11px;line-height:1.5;color:var(--text2)">${(c.text||'').replace(/</g,'&lt;').slice(0,80)}${(c.text||'').length>80?'…':''}</div>
      </div>`).join('');

  // ── 实战数据读取 ─────────────────────────────
  let appBadge = '', appRaw = null;
  try { appRaw = JSON.parse(localStorage.getItem('lamb_application_v1') || 'null'); } catch(e) {}
  if (appRaw && typeof appRaw.score === 'number') {
    const pct = Math.round(appRaw.score * 100);
    const col = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--orange)';
    appBadge = `<span style="font-size:16px;font-weight:700;color:${col}">${pct}%</span>`;
  } else {
    appBadge = `<span style="font-size:11px;color:var(--text3)">未接入</span>`;
  }

  // ── 成就徽章（6 维度解锁提示） ─────────────
  let ability = null;
  try { ability = (typeof calcAbilityScore === 'function') ? calcAbilityScore() : null; } catch(e) {}
  const badges = [
    { emoji:'📖', label:'阅读', val: ability?.dims?.read || 0, col:'var(--blue)' },
    { emoji:'🏋️', label:'模块', val: ability?.dims?.modules || 0, col:'var(--blue)' },
    { emoji:'🧪', label:'测验', val: ability?.dims?.quiz || 0, col:'var(--blue)' },
    { emoji:'🔥', label:'连续', val: ability?.dims?.streak || 0, col:'var(--blue)' },
    { emoji:'🎓', label:'掌握', val: ability?.dims?.methods || 0, col:'var(--blue)' },
    { emoji:'⚔️', label:'实战', val: ability?.dims?.application || 0, col:'#a855f7' },
  ];
  const badgeHtml = badges.map(b => {
    const unlocked = b.val >= 60;
    const op = unlocked ? 1 : 0.35;
    return `<div title="${b.label} ${Math.round(b.val)}%" style="text-align:center;padding:6px 4px;background:var(--bg2);border-radius:7px;opacity:${op}">
      <div style="font-size:18px">${b.emoji}</div>
      <div style="font-size:9px;color:var(--text2);margin-top:2px">${b.label}</div>
      <div style="font-size:10px;font-weight:700;color:${b.col}">${Math.round(b.val)}</div>
    </div>`;
  }).join('');

  // ── 教练智能评语（基于本期数据自动生成） ───
  const insights = [];
  if (streak >= 7) insights.push(`🔥 已连续 ${streak} 天学习，保持节奏`);
  else if (streak === 0) insights.push(`⏱ 今日还未学习，开始一次吧`);
  else insights.push(`📅 连续 ${streak} 天，离 7 天差 ${Math.max(0,7-streak)} 天`);
  if (readPct >= 80) insights.push(`📚 阅读进度 ${readPct}%，进入巩固阶段`);
  else if (readPct < 20) insights.push(`📖 阅读进度 ${readPct}%，建议先攻一本书`);
  if (weekActive >= 5) insights.push(`✅ 本周活跃 ${weekActive}/7 天，状态良好`);
  else if (weekActive <= 2) insights.push(`⚠️ 本周活跃 ${weekActive}/7 天，需加把劲`);
  if (ability && ability.score >= 70) insights.push(`🌟 综合能力 ${ability.score} 分，达到熟练阶段`);
  else if (ability && ability.score < 30) insights.push(`🌱 综合 ${ability.score} 分，从单点突破开始`);
  if (appRaw && typeof appRaw.score === 'number') {
    const pct = Math.round(appRaw.score * 100);
    if (pct >= 70) insights.push(`⚔️ 实战 ${pct}%，可挑战更高水平对手`);
    else insights.push(`⚔️ 实战 ${pct}%，多打比赛积累经验`);
  } else {
    insights.push(`⚔️ 实战未接入 · 在控制台存值：localStorage.setItem('lamb_application_v1', JSON.stringify({score:0.65,note:'',updatedAt:Date.now()}))`);
  }

  // ── 拼装面板 ─────────────────────────────
  showOverlay('panel panel-wide', '🐑 观察者仪表盘', `
    <!-- 行 1：核心数字 (3 列) -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      <div style="background:var(--bg3);padding:10px 8px;border-radius:10px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--purple)">Lv.${level}</div>
        <div style="font-size:9px;color:var(--text2)">当前等级</div>
      </div>
      <div style="background:var(--bg3);padding:10px 8px;border-radius:10px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--gold)">${totalXp}</div>
        <div style="font-size:9px;color:var(--text2)">总经验值</div>
      </div>
      <div style="background:var(--bg3);padding:10px 8px;border-radius:10px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--green)">${streak}</div>
        <div style="font-size:9px;color:var(--text2)">连续天数</div>
      </div>
      <div style="background:var(--bg3);padding:10px 8px;border-radius:10px;text-align:center">
        ${appBadge}
        <div style="font-size:9px;color:var(--text2);margin-top:2px">实战应用</div>
      </div>
    </div>

    <!-- 行 2：本周热力图 + 6维雷达 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--bg3);padding:12px;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <div style="font-size:12px;font-weight:600">📅 本周学习热力</div>
          <div style="font-size:10px;color:var(--text2)">${weekActive}/7 天</div>
        </div>
        <div style="display:flex;gap:4px">${heatHtml}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:6px;line-height:1.5">📍 数据源: <code style="font-size:8.5px;font-family:monospace">lamb_progress._streak</code><br>🟢 已学习 · ⬜ 未学习 · 黄框=今天</div>
      </div>
      <div style="background:var(--bg3);padding:12px;border-radius:10px;display:flex;flex-direction:column;align-items:center">
        <div style="font-size:12px;font-weight:600;align-self:flex-start;margin-bottom:4px">🎯 6 维能力雷达</div>
        ${radarMini || '<div style="font-size:10px;color:var(--text3)">能力算法未就绪</div>'}
      </div>
    </div>

    <!-- 行 3：每本书进度 -->
    <div style="background:var(--bg3);padding:12px;border-radius:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600">📚 各书进度 · 总体 ${readPct}%</div>
        <div style="font-size:10px;color:var(--text2)">${totalRead} / ${totalChapters} 章</div>
      </div>
      <div style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden;margin-bottom:10px">
        <div style="width:${readPct}%;background:linear-gradient(90deg,var(--blue),var(--green));height:100%"></div>
      </div>
      ${bookRows || '<div style="font-size:10px;color:var(--text3)">暂无书塔</div>'}
    </div>

    <!-- 行 4：成就徽章 + 教练评语feed -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--bg3);padding:12px;border-radius:10px">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">🏆 成就徽章 <span style="font-size:9px;color:var(--text3);font-weight:400">≥60 解锁</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${badgeHtml}</div>
      </div>
      <div style="background:var(--bg3);padding:12px;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:600">💬 教练评语 <span style="font-size:9px;color:var(--text3);font-weight:400">最近 ${comments.length}</span></div>
          <button onclick="closeOverlay();openStudentProfile()" style="background:var(--purple);color:#fff;border:none;padding:4px 9px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer">＋ 写</button>
        </div>
        ${commentHtml}
      </div>
    </div>

    <!-- 行 5：智能观察建议 -->
    <div style="background:linear-gradient(135deg,var(--bg3),var(--bg2));border:1px solid var(--purple);border-radius:10px;padding:12px">
      <div style="font-size:12px;font-weight:600;color:var(--purple);margin-bottom:8px">🐑 观察者建议 <span style="font-size:9px;color:var(--text3);font-weight:400">基于本期数据自动生成</span></div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${insights.map(s => `<div style="font-size:11px;line-height:1.55;color:var(--text);padding:6px 9px;background:var(--bg);border-radius:6px;border-left:2px solid var(--purple)">${s}</div>`).join('')}
      </div>
    </div>
  `);
}

// 阅读中心
function renderLibraryContent() {
  if (!MANIFEST) return '<div style="padding:20px;text-align:center;color:var(--text2)">加载中...</div>';
  const books = MANIFEST.books.filter(b => TOWER_BOOKS.includes(b.id));
  const p = getP();
  return books.map(b => {
    const progress = chProgress(b.id);
    const readCount = (p[b.id] || []).length;
    return `<div class="chapter-card fade-in" onclick="goToBook('${b.id}')" style="cursor:pointer">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${b.color||'var(--blue)'};opacity:.6"></div>
      <div style="font-size:32px;margin-bottom:8px">${b.emoji}</div>
      <div class="cc-title" style="font-size:14px;font-weight:600">${b.title}</div>
      <div style="font-size:11px;color:var(--text2);margin-top:4px">${b.chapters.length} 章 · 已读 ${readCount}</div>
      <div style="background:var(--bg);height:4px;border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="width:${Math.round(progress*100)}%;background:${b.color||'var(--blue)'};height:100%"></div>
      </div>
    </div>`;
  }).join('');
}

function showLibrary() {
  showView('library');
  $('libraryContent').innerHTML = renderLibraryContent();
}

function renderToolItems() {
  return [
    `<div class="side-link sub" onclick="openScreening()"><span class="sl-icon">🛡️</span> 损伤筛查</div>`,
    `<div class="side-link sub" onclick="openCalculators()"><span class="sl-icon">🧮</span> 计算工具</div>`,
    `<div class="side-link sub" onclick="openDiagnosis()"><span class="sl-icon">🔍</span> 训练诊断</div>`,
    `<div class="side-link sub" onclick="openWeeklyCheck()"><span class="sl-icon">✅</span> 周检查</div>`,
    `<div class="side-link sub" onclick="openLevelFinder()"><span class="sl-icon">📊</span> 级别定位</div>`,
  ].join('');
}

function toggleSideSection(el) {
  const section = el.parentElement.querySelector('.side-collapsible');
  if (section) {
    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    // 更新箭头方向
    const text = el.textContent.replace(/[▶▼]/g, isHidden ? '▼' : '▶');
    el.textContent = text;
  }
}

// ─── 训练模块详情 ────────────────────────
// 学员端"开始今日训练"专用：直接跳转到书籍章节
function startDailyTraining(bookId, chapterIdx) {
  if (!MANIFEST) return;
  const book = MANIFEST.books.find(b => b.id === bookId);
  if (!book) return;
  currentBookId = bookId;
  currentModule = 'tower';
  showView('reader');
  openChapter(chapterIdx);
}

function openTrainModule(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  currentModule = modId;
  // 记录访问过的训练模块
  try {
    const rp = getRP();
    if (!rp.visitedModules) rp.visitedModules = [];
    if (!rp.visitedModules.includes(modId)) {
      rp.visitedModules.push(modId);
      setRP(rp);
    }
  } catch (_) {}
  showView('book');
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>${mod.icon} ${mod.title}</h1>
    <div class="vm">${mod.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${mod.chapters.length}</span><span class="bs-label">📖 训练主题</span></div>
    <div class="bs-item"><span class="bs-num">${mod.tags.length}</span><span class="bs-label">🏷️ 核心标签</span></div>
    <div class="bs-item"><span class="bs-num">${mod.docs}</span><span class="bs-label">📚 教学文档</span></div>
    ${(modId==='nutrition'||modId==='competition') ? `<div class="bs-item" style="cursor:pointer;background:var(--bg3);border-radius:6px;padding:4px 8px" onclick="${modId==='nutrition'?'openNutritionTools()':'openCompetitionTools()'}"><span class="bs-num">🛠️</span><span class="bs-label">交互工具</span></div>` : ''}
    ${modId==='strength' ? `<div class="bs-item" style="cursor:pointer;background:var(--green);color:#fff;border-radius:6px;padding:4px 8px" onclick="openStrengthHub()"><span class="bs-num">🩺</span><span class="bs-label">疲劳/周期</span></div>` : ''}
    ${modId==='psychology' ? `<div class="bs-item" style="cursor:pointer;background:var(--purple);color:#fff;border-radius:6px;padding:4px 8px" onclick="openPsychHub()"><span class="bs-num">🧠</span><span class="bs-label">心理规划</span></div>` : ''}
    ${modId==='nutrition' ? `<div class="bs-item" style="cursor:pointer;background:var(--orange);color:#fff;border-radius:6px;padding:4px 8px" onclick="openNutrHub()"><span class="bs-num">🍎</span><span class="bs-label">营养规划</span></div>` : ''}
    ${modId==='personal' ? `<div class="bs-item" style="cursor:pointer;background:var(--blue);color:#fff;border-radius:6px;padding:4px 8px" onclick="openPersonalHub()"><span class="bs-num">👤</span><span class="bs-label">个人计划</span></div>` : ''}`;
  const toolBtn = (modId==='nutrition'||modId==='competition') ? `<div class="calc-card" style="grid-column:1/-1;background:linear-gradient(135deg,var(--bg2),var(--bg3));border:2px solid ${mod.color};border-radius:var(--radius);padding:14px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="${modId==='nutrition'?'openNutritionTools()':'openCompetitionTools()'}"><div style="font-size:32px">${modId==='nutrition'?'🍎':'🏆'}</div><div style="flex:1"><div style="font-size:14px;font-weight:600;color:${mod.color}">${modId==='nutrition'?'营养交互工具集':'比赛交互工具集'}</div><div style="font-size:10px;color:var(--text2);margin-top:2px">${modId==='nutrition'?'餐食计算器·出汗率计算·补剂时间表':'赛前清单·对手弱点·赛后自评'}</div></div><div style="font-size:18px">→</div></div>` : '';
  $('contentGrid').innerHTML = toolBtn + mod.chapters.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openModuleTopic('${mod.id}',${i})">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${mod.color};opacity:.6"></div>
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${title}</div>
      <div class="cc-foot"><span>${mod.icon}</span><span style="color:${mod.color}">学习 →</span></div>
    </div>`).join('');
  updateProgress();
}

// ─── 模块主题（跳转到对应书籍章节） ──────
// v3.14.3 — 凭 bookId+chIdx 精准跳转，绕过 topicIdx 取模路径（首页"继续下一节"按钮使用）
function openModuleChapterById(modId, bookId, chIdx) {
  const mod = TRAIN_MODULES.find(m => m.id === modId);
  if (!mod || !MANIFEST) return;
  const book = MANIFEST.books.find(b => b.id === bookId);
  if (!book || !book.chapters[chIdx]) return;
  // 记录模块访问（行为与 openModuleTopic 一致）
  try {
    const rp = getRP();
    if (!rp.visitedModules) rp.visitedModules = [];
    if (!rp.visitedModules.includes(modId)) { rp.visitedModules.push(modId); setRP(rp); }
  } catch (_) {}
  navStack.push({ view: 'module', moduleId: modId });
  currentBookId = bookId;
  currentModule = 'tower';
  openChapter(chIdx);
}

function openModuleTopic(modId, topicIdx) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod || !MANIFEST) return;
  // 保存导航状态：从模块进入
  navStack.push({view:'module', moduleId: modId});
  // 教练板块专用：每个 topic 映射到具体 coach 工具
  if (modId === 'coach') {
    const coachTools = [
      { url:'coach/coach-guide.html', title:'教练速成指导书 · 训练计划设计' },
      { url:'coach/coach-guide.html', title:'教练速成指导书 · 周期化训练' },
      { url:'coach/level-assessment.html', title:'学员水平评估 · 动作质量评估' },
      { url:'coach/coach-manual-v2.html', title:'教练速查手册 · 训练负荷调控' },
      { url:'coach/coach-manual-v2.html', title:'教练速查手册 · 个性化方案制定' },
      { url:'coach/coach-guide.html', title:'教练速成指导书 · 技术诊断方法论' },
      { url:'coach/index.html', title:'教练工作台 · 比赛录像分析' },
      { url:'coach/coach-manual-v2.html', title:'教练速查手册 · 训练日志与复盘' },
      { url:'coach/coach-guide.html', title:'教练速成指导书 · 运动员心理辅导' },
      { url:'coach/index.html', title:'教练工作台 · 智能教练工具' },
    ];
    const tool = coachTools[topicIdx];
    if (tool) { openCoachInline(tool.url, tool.title); return; }
  }
  // 优先使用 topics 精确映射（每个主题对应一个 book+ch）
  if (mod.topics && mod.topics[topicIdx]) {
    const topic = mod.topics[topicIdx];
    const book = MANIFEST.books.find(b=>b.id===topic.book);
    if (book && book.chapters[topic.ch]) {
      currentBookId = topic.book;
      currentModule = 'tower';
      openChapter(topic.ch);
      return;
    }
  }
  // 降级：用 mod.books 和 topicIdx 模运算找章节
  if (mod.books && mod.books.length) {
    for (const bid of mod.books) {
      const book = MANIFEST.books.find(b=>b.id===bid);
      if (book && book.chapters.length > 0) {
        const chIdx = Math.min(topicIdx % book.chapters.length, book.chapters.length - 1);
        currentBookId = bid;
        currentModule = 'tower';
        openChapter(chIdx);
        return;
      }
    }
  }
  // 降级：使用内联内容（营养/比赛等无 book 映射的模块）
  if (MODULE_CONTENT[modId] && MODULE_CONTENT[modId][topicIdx]) {
    renderModuleInline(mod, topicIdx);
    return;
  }
  // 无匹配 → 回到模块视图
  navStack.pop();
  openTrainModule(modId);
}

// ─── 渲染模块内联内容 ───
function renderModuleInline(mod, topicIdx) {
  showView('reader');
  const html = MODULE_CONTENT[mod.id][topicIdx];
  const title = mod.chapters[topicIdx].replace(/^[^\w一-龥]+/, '').trim();
  $('readerTitle').textContent = `${mod.icon} ${mod.title} · ${title}`;
  $('chapterPos').textContent = `${topicIdx+1}/${mod.chapters.length}`;
  $('readMarkBtn').textContent = '📌';
  const hasPrev = topicIdx > 0;
  const hasNext = topicIdx < mod.chapters.length - 1;
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="renderModuleInline(TRAIN_MODULES.find(m=>m.id==='${mod.id}'), ${topicIdx-1})" ${hasPrev?'':'disabled'}>◀ 上一节</button>
    <button class="tb-btn" onclick="openTrainModule('${mod.id}')">⏏ 返回模块</button>
    <button class="tb-btn" onclick="renderModuleInline(TRAIN_MODULES.find(m=>m.id==='${mod.id}'), ${topicIdx+1})" ${hasNext?'':'disabled'}>下一节 ▶</button>`;
  $('article').innerHTML = html;
  $('content').scrollTo({top:0,behavior:'smooth'});
  updateProgress();
  // 进度条归零：新章节从 0 开始
  const _rpFill = $('rpFill'); const _rpThumb = $('rpThumb'); const _rpBar = $('readProgress');
  if (_rpFill) _rpFill.style.width = '0%';
  if (_rpThumb) _rpThumb.style.left = '0%';
  if (_rpBar) _rpBar.classList.remove('show');
  // 与 openChapter 对齐：内联模块同样按节计数（不污染 books 进度），首次阅读给 XP + toast
  const _isNewModuleRead = markModuleRead(mod.id, topicIdx);
  if (_isNewModuleRead) {
    showToast(`✅ 已读完《${mod.title}》第 ${topicIdx+1} 节 · +XP 10`, 2400);
    const pos = document.getElementById('chapterPos');
    if (pos) {
      pos.classList.remove('pulse-read');
      void pos.offsetWidth;
      pos.classList.add('pulse-read');
      setTimeout(() => pos.classList.remove('pulse-read'), 1400);
    }
  }
  historyPush('module-inline', {moduleId: mod.id, topicIdx: topicIdx});
}

// 模块内联阅读计数（仅在 rpgData 里累加，不动 books 进度，因为 MODULE_CONTENT 不是真实书籍）
function markModuleRead(modId, idx) {
  const r = getRP();
  if (!r.moduleRead) r.moduleRead = {};
  const key = `${modId}::${idx}`;
  if (r.moduleRead[key]) return false;
  r.moduleRead[key] = Date.now();
  r.totalRead = (r.totalRead || 0) + 1;
  setRP(r);
  addXP(10, '📖');
  checkAchievements();
  return true;
}

// ─── 营养交互工具集 ────────
function openNutritionTools() {
  showOverlay('panel-tools', '🍎 营养交互工具', `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">🥧 快速餐食计算器</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px">
          <label style="font-size:10px">体重(kg)<input id="npWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px"></label>
          <label style="font-size:10px">目标
            <select id="npGoal" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px">
              <option value="gain">增肌</option><option value="lose" selected>减脂</option><option value="maintain">维持</option>
            </select>
          </label>
        </div>
        <button onclick="calcNutritionPlan()" class="tb-btn" style="width:100%;background:var(--orange);color:#fff">⚖️ 生成每日餐单</button>
        <div id="npResult" style="margin-top:8px;font-size:11px;line-height:1.6"></div>
      </div>

      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">💧 出汗率计算器</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
          <label style="font-size:10px">训练前体重(kg)<input id="swBefore" type="number" value="70.0" step="0.1" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px"></label>
          <label style="font-size:10px">训练后体重(kg)<input id="swAfter" type="number" value="69.4" step="0.1" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px"></label>
          <label style="font-size:10px">训练时长(min)<input id="swDuration" type="number" value="60" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px"></label>
        </div>
        <button onclick="calcSweatRate()" class="tb-btn" style="width:100%;background:var(--blue);color:#fff">💧 计算出汗率</button>
        <div id="swResult" style="margin-top:8px;font-size:11px;line-height:1.6"></div>
      </div>

      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">💊 补剂时间表（点击查证）</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr style="background:var(--bg3)"><th style="padding:5px;text-align:left">补剂</th><th style="padding:5px">剂量</th><th style="padding:5px">时机</th></tr>
          <tr><td style="padding:4px">肌酸</td><td style="text-align:center">3-5g/天</td><td style="text-align:center">任意时间</td></tr>
          <tr style="background:var(--bg3)"><td style="padding:4px">乳清蛋白</td><td style="text-align:center">20-40g</td><td style="text-align:center">训练后</td></tr>
          <tr><td style="padding:4px">咖啡因</td><td style="text-align:center">3-6mg/kg</td><td style="text-align:center">赛前30-60min</td></tr>
          <tr style="background:var(--bg3)"><td style="padding:4px">Beta-丙氨酸</td><td style="text-align:center">3-6g/天</td><td style="text-align:center">随餐</td></tr>
          <tr><td style="padding:4px">Omega-3</td><td style="text-align:center">2-3g EPA/DHA</td><td style="text-align:center">随餐</td></tr>
        </table>
      </div>
    </div>
  `);
}

function calcNutritionPlan() {
  const w = parseFloat(document.getElementById('npWeight')?.value) || 70;
  const g = document.getElementById('npGoal')?.value || 'lose';
  let protein, fat, carb, calories;
  if (g === 'gain') { protein = w*1.8; fat = w*1.0; carb = w*5; calories = protein*4 + fat*9 + carb*4; }
  else if (g === 'lose') { protein = w*2.2; fat = w*0.8; carb = w*3; calories = protein*4 + fat*9 + carb*4; }
  else { protein = w*1.6; fat = w*0.9; carb = w*4; calories = protein*4 + fat*9 + carb*4; }
  const meals = [
    { name:'早餐', p:Math.round(protein*0.25), c:Math.round(carb*0.30), f:Math.round(fat*0.25) },
    { name:'加餐', p:Math.round(protein*0.15), c:Math.round(carb*0.10), f:Math.round(fat*0.10) },
    { name:'午餐', p:Math.round(protein*0.30), c:Math.round(carb*0.30), f:Math.round(fat*0.30) },
    { name:'训练后', p:Math.round(protein*0.15), c:Math.round(carb*0.15), f:Math.round(fat*0.10) },
    { name:'晚餐', p:Math.round(protein*0.15), c:Math.round(carb*0.15), f:Math.round(fat*0.25) },
  ];
  const html = `<div style="background:var(--bg3);padding:8px;border-radius:6px;margin-bottom:6px"><strong>📊 每日总量：</strong>${Math.round(calories)} kcal · P${Math.round(protein)}g · C${Math.round(carb)}g · F${Math.round(fat)}g</div>` +
    meals.map(m => `<div style="padding:4px 0;border-bottom:1px solid var(--border)"><strong>${m.name}</strong> · 蛋白${m.p}g · 碳水${m.c}g · 脂肪${m.f}g</div>`).join('');
  const r = document.getElementById('npResult'); if (r) r.innerHTML = html;
}

function calcSweatRate() {
  const before = parseFloat(document.getElementById('swBefore')?.value);
  const after = parseFloat(document.getElementById('swAfter')?.value);
  const dur = parseFloat(document.getElementById('swDuration')?.value);
  if (!before || !after || !dur || before < after) { const r = document.getElementById('swResult'); if (r) r.innerHTML = '❌ 请输入有效体重差'; return; }
  const loss = before - after;
  const rateL = (loss * 1000) / dur; // ml/min
  const fluidReplace = loss * 1.5; // L
  let status = rateL < 12 ? '🟢 低出汗率' : rateL < 20 ? '🟡 中出汗率' : '🔴 高出汗率';
  document.getElementById('swResult').innerHTML = `<div style="background:var(--bg3);padding:8px;border-radius:6px"><strong>📊 出汗率：</strong>${rateL.toFixed(1)} ml/min · ${status}</div><div style="margin-top:6px">⚠️ 体重损失：<strong>${loss.toFixed(2)} kg</strong> (=脱水 ${(loss*1000).toFixed(0)} ml)<br>💧 需要补充液体：<strong>${fluidReplace.toFixed(1)} L</strong> (训练后1-2小时内)</div>`;
}

// ─── 比赛交互工具集 ────────
function openCompetitionTools() {
  showOverlay('panel-tools', '🏆 比赛交互工具', `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">📋 赛前检查清单</div>
        <div style="display:grid;gap:4px;font-size:11px">
          ${['🏸 球拍穿线（赛前24h内）','👟 球鞋状态检查','🍌 能量棒/香蕉','💧 充足补水','🧖 赛前30min热身','🎯 比赛计划关键词','👕 比赛服+备用衣','📱 关闭通知','🧊 冰袋/冷却毛巾','📝 记分卡'].map(t => `<label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" class="match-check" data-item="${t}"><span>${t}</span></label>`).join('')}
        </div>
        <div style="margin-top:8px;display:flex;gap:6px"><button onclick="document.querySelectorAll('.match-check').forEach(c=>c.checked=true)" class="tb-btn" style="background:var(--green);color:#fff;font-size:11px">✅ 全选</button><button onclick="document.querySelectorAll('.match-check').forEach(c=>c.checked=false)" class="tb-btn" style="background:var(--bg3);color:var(--text);font-size:11px">↺ 重置</button><span id="checkCount" style="margin-left:auto;font-size:11px;color:var(--text2);align-self:center">已选 0/10</span></div>
      </div>

      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">🔍 对手弱点速判</div>
        <div style="display:grid;gap:6px;font-size:11px">
          <label>对手类型
            <select id="oppType" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px">
              <option value="atk">进攻型</option><option value="def">防守型</option><option value="ctl">控制型</option><option value="mix">均衡型</option>
            </select>
          </label>
          <label>主要弱点
            <select id="oppWeak" style="display:block;width:100%;margin-top:2px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:12px">
              <option>反手位</option><option>网前小球</option><option>中场球</option><option>后退速度</option><option>上网速度</option><option>关键分心理</option>
            </select>
          </label>
        </div>
        <button onclick="genOppTactic()" class="tb-btn" style="width:100%;margin-top:6px;background:var(--red);color:#fff">🎯 生成战术</button>
        <div id="oppResult" style="margin-top:8px;font-size:11px;line-height:1.6"></div>
      </div>

      <div class="calc-card" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">📝 赛后自评模板</div>
        <div style="display:grid;gap:4px;font-size:11px">
          <label>技术发挥<input type="range" id="selfTech" min="1" max="10" value="7" style="width:100%"></label>
          <label>心理状态<input type="range" id="selfPsych" min="1" max="10" value="7" style="width:100%"></label>
          <label>体能分配<input type="range" id="selfFit" min="1" max="10" value="7" style="width:100%"></label>
          <label>战术执行<input type="range" id="selfTact" min="1" max="10" value="7" style="width:100%"></label>
        </div>
        <div id="selfResult" style="margin-top:6px;font-size:10px;color:var(--text3)">调整滑块查看评分</div>
        <button onclick="exportSelfEval()" class="tb-btn" style="width:100%;margin-top:6px;background:var(--blue);color:#fff;font-size:11px">📤 复制到剪贴板</button>
      </div>
    </div>
  `);
  // Bind checkbox counter
  setTimeout(() => {
    const checks = document.querySelectorAll('.match-check');
    const counter = document.getElementById('checkCount');
    checks.forEach(c => c.addEventListener('change', () => {
      const cnt = document.querySelectorAll('.match-check:checked').length;
      if (counter) counter.textContent = `已选 ${cnt}/${checks.length}`;
    }));
    // Bind sliders
    ['selfTech','selfPsych','selfFit','selfTact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateSelfEval);
    });
    updateSelfEval();
  }, 100);
}

function genOppTactic() {
  const type = document.getElementById('oppType')?.value;
  const weak = document.getElementById('oppWeak')?.value;
  const tactics = {
    atk: '⚔️ 对手是进攻型：\n• 不跟他对拉，主动控网前\n• 用防守反击消耗对手体力\n• 抓住他失误后的空当期',
    def: '🛡️ 对手是防守型：\n• 耐心拉吊找机会\n• 突然加速变线打破节奏\n• 用重复吊球+杀对角组合',
    ctl: '🎯 对手是控制型：\n• 加快节奏，用速度压制\n• 主动进攻破坏他的控球\n• 发球变化打乱他的节奏',
    mix: '🎲 对手是均衡型：\n• 试探2-3种战术，找到弱点\n• 持续攻击其薄弱环节\n• 保持变化不让他适应'
  };
  const weakTactic = `\n\n🔍 针对 ${weak}：\n• 比赛开局多打这个位置\n• 重复3-5次让对手不适应\n• 关键分优先攻击`;
  document.getElementById('oppResult').innerHTML = `<div style="background:var(--bg3);padding:8px;border-radius:6px;white-space:pre-line">${tactics[type]}${weakTactic}</div>`;
}

function updateSelfEval() {
  const tech = +document.getElementById('selfTech')?.value || 0;
  const psych = +document.getElementById('selfPsych')?.value || 0;
  const fit = +document.getElementById('selfFit')?.value || 0;
  const tact = +document.getElementById('selfTact')?.value || 0;
  const total = tech + psych + fit + tact;
  const avg = (total / 4).toFixed(1);
  let level = avg >= 8 ? '🌟 出色' : avg >= 6.5 ? '👍 良好' : avg >= 5 ? '⚠️ 一般' : '🔴 需改进';
  document.getElementById('selfResult').innerHTML = `<div style="background:var(--bg3);padding:6px;border-radius:6px"><strong>综合 ${avg}/10</strong> · ${level}<br><span style="font-size:10px;color:var(--text3)">技术${tech} · 心理${psych} · 体能${fit} · 战术${tact}</span></div>`;
}

function exportSelfEval() {
  const tech = +document.getElementById('selfTech')?.value || 0;
  const psych = +document.getElementById('selfPsych')?.value || 0;
  const fit = +document.getElementById('selfFit')?.value || 0;
  const tact = +document.getElementById('selfTact')?.value || 0;
  const avg = ((tech + psych + fit + tact) / 4).toFixed(1);
  const checks = [...document.querySelectorAll('.match-check:checked')].map(c => c.dataset.item).join(' / ');
  const txt = `🏸 赛后自评 ${new Date().toISOString().slice(0,10)}\n综合 ${avg}/10\n· 技术 ${tech}/10\n· 心理 ${psych}/10\n· 体能 ${fit}/10\n· 战术 ${tact}/10${checks ? '\n赛前准备：' + checks : ''}`;
  navigator.clipboard.writeText(txt).then(() => showToast('✅ 已复制到剪贴板', 2000));
}
function renderModuleOnly(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
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

// ─── 级别详情 (v3.7.5：权重 + 具体动作 + 5 维雷达) ────────────
function openLevelDetail(levelId) {
  const lvl = LEVELS.find(l=>l.id===levelId);
  if (!lvl) return;
  // v3.7.7: 根据 profile 修正权重
  const profile = getProfile();
  const effectiveAbilities = applyProfileToWeights(lvl.abilities || [], profile);
  let abilityHtml = '';
  if (effectiveAbilities && effectiveAbilities.length) {
    const profileBadge = profile
      ? `<div style="font-size:10px;color:var(--text3);margin-top:-2px;margin-bottom:8px">🎯 已根据你的问卷调整 <a onclick="openStudentProfile()" style="color:var(--blue);text-decoration:underline;cursor:pointer">重填</a></div>`
      : `<div style="font-size:10px;color:var(--text3);margin-top:-2px;margin-bottom:8px">💡 未填写个性化问卷 <a onclick="openStudentProfile()" style="color:var(--blue);text-decoration:underline;cursor:pointer">填一下获得定制方案 →</a></div>`;
    abilityHtml = `<div style="text-align:left;margin-top:6px;padding:0 4px">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--blue);border-bottom:1px solid var(--border);padding-bottom:6px">📊 点击饼图各部分查看训练项目</div>${profileBadge}
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:12px">
        <div style="position:relative;width:160px;height:160px;cursor:pointer" onclick="toggleAbilityDetail()">
          <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)">
            ${(function(){
              let cum = 0, paths = '';
              effectiveAbilities.forEach((ab, i) => {
                const start = cum, end = cum + ab.effective;
                const large = end - start > 50 ? 1 : 0;
                const x1 = 50 + 40 * Math.cos(2 * Math.PI * start / 100);
                const y1 = 50 + 40 * Math.sin(2 * Math.PI * start / 100);
                const x2 = 50 + 40 * Math.cos(2 * Math.PI * end / 100);
                const y2 = 50 + 40 * Math.sin(2 * Math.PI * end / 100);
                paths += `<path d="M50,50 L${x1},${y1} A40,40 0 ${large},1 ${x2},${y2} Z" fill="${ab.color}" stroke="var(--bg)" stroke-width="1" onclick="event.stopPropagation();showAbilityDrills('${ab.name}', ${i})"/>`;
                cum = end;
              });
              return paths;
            })()}
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
            <div style="font-size:11px;color:var(--text3)">点击查看</div>
            <div style="font-size:18px;font-weight:700;color:var(--text)">${effectiveAbilities.length}</div>
            <div style="font-size:10px;color:var(--text3)">项训练</div>
          </div>
        </div>
        <div style="flex:1;min-width:140px">
          <div style="font-size:11px;font-weight:600;margin-bottom:6px;color:var(--text2)">图例</div>
          ${effectiveAbilities.map(ab => {
            const marker = ab.marker ? `<span title="${ab.marker === '❄️' ? '伤病减权重' : '优势加权'}">${ab.marker}</span> ` : '';
            return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer;padding:4px;border-radius:4px;transition:background .2s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'" onclick="showAbilityDrills('${ab.name}', ${effectiveAbilities.findIndex(x=>x.name===ab.name)})">
              <span style="width:12px;height:12px;border-radius:3px;background:${ab.color};flex-shrink:0"></span>
              <span style="font-size:11px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${marker}${ab.name}</span>
              <span style="font-size:10px;color:var(--text3)">${ab.effective}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div id="abilityDrillDetail"></div>`;
    abilityHtml += `</div>`;
  }
  // v3.8.7: 饼图点击显示训练项目
  let _currentAbilities = effectiveAbilities;
  window.showAbilityDrills = function(name, idx) {
    const ab = _currentAbilities[idx];
    if (!ab || !ab.drills) return;
    const marker = ab.marker ? `<span title="${ab.marker === '❄️' ? '伤病减权重' : '优势加权'}">${ab.marker}</span> ` : '';
    const diff = ab.marker ? `<span style="color:var(--text3);font-size:10px">(原 ${ab.original}%)</span>` : '';
    const drillsHtml = ab.drills.map(d => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px;border-left:3px solid ${ab.color}">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--text)">${d.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${d.sets}组 × ${d.reps} · ${d.freq}</div>
        </div>
        <div style="font-size:18px">🏸</div>
      </div>`).join('');
    document.getElementById('abilityDrillDetail').innerHTML = `
      <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-top:12px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <span style="width:14px;height:14px;border-radius:4px;background:${ab.color};display:inline-block;vertical-align:middle;margin-right:6px"></span>
            <span style="font-size:14px;font-weight:700;color:var(--text)">${marker}${ab.name}</span>
            <span style="color:var(--text3);font-size:11px;margin-left:6px">${ab.effective}% ${diff}</span>
          </div>
          <button onclick="document.getElementById('abilityDrillDetail').innerHTML=''" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:4px">✕</button>
        </div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">针对性训练项目 · 点击可关闭</div>
        ${drillsHtml}
      </div>`;
  };
  window.toggleAbilityDetail = function() {
    const el = document.getElementById('abilityDrillDetail');
    if (el.innerHTML) { el.innerHTML = ''; }
    else if (_currentAbilities.length > 0) { showAbilityDrills(_currentAbilities[0].name, 0); }
  };
  let radarHtml = '';
  try {
    const a = (typeof calcAbilityScore === 'function') ? calcAbilityScore() : null;
    if (a && a.dims) {
      // v3.8.6 实用版: 雷达下方加「数据明细」—— 每个维度的原始数、公式、localStorage 来源
      const _p = getP(), _rp = getRP();
      const _totalCh = MANIFEST.books.reduce((s,b)=>s+b.chapters.length, 0);
      const _readCount = MANIFEST.books.reduce((s,b)=>s+(_p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length, 0);
      const _visitedCount = (_rp.visitedModules || []).length;
      const _quizCount = _rp.totalQuizCorrect || 0;
      const _levelCount = _rp.level || 1;
      let _appRaw = null;
      try { _appRaw = JSON.parse(localStorage.getItem('lamb_application_v1') || 'null'); } catch(e) {}
      const _appValid = _appRaw && typeof _appRaw.score === 'number';
      const _detailRows = [
        { emoji:'📖', name:'阅读', key:'read',       val:a.dims.read,       raw:`${_readCount}/${_totalCh} 章`,            src:'localStorage["lamb_progress"]',          formula:'已读数 ÷ 总章数 × 100', placeholder:false },
        { emoji:'🏋️', name:'模块', key:'modules',    val:a.dims.modules,    raw:`${_visitedCount}/6 个模块`,              src:'localStorage["lamb_role_data.visitedModules"]', formula:'访问数 ÷ 6 × 100',       placeholder:false },
        { emoji:'🧪', name:'测验', key:'quiz',       val:a.dims.quiz,       raw:`${_quizCount} 题对 (满≈200)`,          src:'localStorage["lamb_role_data.totalQuizCorrect"]', formula:'log10(正确+1) ÷ log10(201) × 100', placeholder:false },
        { emoji:'🔥', name:'连续', key:'streak',     val:a.dims.streak,     raw:`${a.streak} 天 (封顶 100)`,             src:'localStorage["lamb_progress._streak"]',  formula:'连续天数 ÷ 100 × 100',  placeholder:false },
        { emoji:'🎓', name:'掌握', key:'methods',    val:a.dims.methods,    raw:`${_levelCount}/30 级`,                   src:'localStorage["lamb_role_data.level"]',   formula:'等级 ÷ 30 × 100',       placeholder:false },
        { emoji:'⚔️', name:'实战', key:'application',val:a.dims.application,raw: _appValid ? `${Math.round(_appRaw.score*100)}% · ${_appRaw.note||'本地存值'}` : '暂无数据·默认 50%', src:'localStorage["lamb_application_v1"]', formula:_appValid?'读取本地值':'无值时取 0.5', placeholder:!_appValid },
      ];
      // v3.8.5: 6 维能力雷达改 SVG 多边形 (取代水平条形) | v3.8.6 实用版: 下方加「数据明细」(原始数+公式+localStorage 来源)
      // 6 维按学习流程顺时针: 阅读→模块→测验(输入)→连续→掌握(过程)→实战应用(输出)
      const radarDims = [
        { key:'read',       name:'阅读',  emoji:'📖', angle:-90, color:'#3b82f6' },
        { key:'modules',    name:'模块',  emoji:'🏋️', angle:-30, color:'#3b82f6' },
        { key:'quiz',       name:'测验',  emoji:'🧪', angle: 30, color:'#3b82f6' },
        { key:'streak',     name:'连续',  emoji:'🔥', angle: 90, color:'#3b82f6' },
        { key:'methods',    name:'掌握',  emoji:'🎓', angle:150, color:'#3b82f6' },
        { key:'application',name:'实战',  emoji:'⚔️', angle:210, color:'#a855f7' },
      ];
      const center = 110, maxR = 70;
      // 6 个顶点的实际位置 (按分数 0~100 缩放)
      const points = radarDims.map(d => {
        const v = Math.min(100, Math.max(0, a.dims[d.key] || 0));
        const r = maxR * v / 100;
        const rad = d.angle * Math.PI / 180;
        return {
          ...d,
          v,
          x: center + r * Math.cos(rad),
          y: center + r * Math.sin(rad),
          lx: center + (maxR + 16) * Math.cos(rad),
          ly: center + (maxR + 16) * Math.sin(rad),
        };
      });
      const dataPts = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      // 4 圈背景网格 (25/50/75/100%)
      const gridPolys = [25, 50, 75, 100].map(pct => {
        const r = maxR * pct / 100;
        const pts = radarDims.map(d => {
          const rad = d.angle * Math.PI / 180;
          return `${(center + r*Math.cos(rad)).toFixed(1)},${(center + r*Math.sin(rad)).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="#475569" stroke-width="0.5" opacity="${pct===100?0.7:0.3}"/>`;
      }).join('');
      // 6 条轴线
      const axisLines = radarDims.map(d => {
        const rad = d.angle * Math.PI / 180;
        const x2 = center + maxR * Math.cos(rad);
        const y2 = center + maxR * Math.sin(rad);
        return `<line x1="${center}" y1="${center}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#475569" stroke-width="0.5" opacity="0.4"/>`;
      }).join('');
      // 6 个顶点圆点 + 外围标签 (含数值)
      const dots = points.map(p => {
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${p.color}" stroke="var(--bg3)" stroke-width="1"/>
          <text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="var(--text2)">${p.emoji}${Math.round(p.v)}</text>`;
      }).join('');
      // 中心显示总分
      const centerText = `<text x="${center}" y="${center - 4}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--gold)">${a.score}</text>
        <text x="${center}" y="${center + 9}" text-anchor="middle" font-size="8" fill="var(--text3)">/ 100</text>`;
      radarHtml = `<div style="margin-top:14px;padding:10px;background:var(--bg3);border-radius:10px">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--gold);text-align:left">🎯 6 维能力雷达 <span style="font-size:9px;color:var(--text3);font-weight:400">v3.8.6 实用版 · 数据全公开</span></div>
        <svg viewBox="0 0 220 230" style="width:100%;max-width:240px;height:auto;display:block;margin:0 auto">
          ${gridPolys}
          ${axisLines}
          <polygon points="${dataPts}" fill="rgba(99,140,255,0.18)" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round"/>
          ${dots}
          ${centerText}
        </svg>
        <div style="text-align:center;font-size:9px;color:var(--text3);margin-top:4px;line-height:1.5">
          蓝 5 维权重: 阅读25% + 模块25% + 测验20% + 连续15% + 掌握15%<br>
          紫⚔️实战应用: 独立维度, 不进总分
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);text-align:left">
          <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:6px">📊 各维度数据明细 <span style="font-size:9px;color:var(--text3);font-weight:400">— 数据怎么来的</span></div>
          ${_detailRows.map(r => {
            const w = Math.min(100, Math.max(0, r.val));
            const col = r.placeholder ? 'var(--text3)' : 'var(--blue)';
            const bgCol = r.placeholder ? 'var(--text3)' : (r.key==='application' ? '#a855f7' : 'var(--blue)');
            return `<div style="margin-bottom:5px">
              <div style="display:flex;align-items:center;gap:5px;font-size:10px">
                <span style="width:46px;flex-shrink:0;color:var(--text)">${r.emoji} ${r.name}</span>
                <span style="width:34px;flex-shrink:0;font-weight:700;color:${col};text-align:right">${Math.round(r.val)}%</span>
                <span style="flex:1;height:5px;background:var(--bg2);border-radius:3px;overflow:hidden;min-width:30px">
                  <span style="display:block;height:100%;width:${w}%;background:${bgCol};border-radius:3px"></span>
                </span>
                <span style="flex-shrink:0;color:${r.placeholder?'var(--text3)':'var(--text2)'};font-size:9px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.raw}</span>
              </div>
              <div style="font-size:8.5px;color:var(--text3);padding-left:51px;margin-top:1px;line-height:1.45;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                <span>公式: <span style="color:var(--text2)">${r.formula}</span></span>
                <span>·</span>
                <span>来源: <code style="font-size:8.5px;background:var(--bg2);padding:0 3px;border-radius:2px;font-family:monospace">${r.src}</code></span>
              </div>
            </div>`;
          }).join('')}
          ${!_appValid ? `<div style="margin-top:7px;padding:6px 8px;background:var(--bg2);border-radius:5px;font-size:9px;color:var(--text3);line-height:1.55">
            <div style="color:var(--text2);font-weight:600;margin-bottom:3px">⚔️ 实战应用·接入指南</div>
            当前 <code style="font-size:9px">localStorage["lamb_application_v1"]</code> 暂未存值或格式不对，所以取默认 0.5。<br>
            <strong style="color:var(--text2)">手动设值</strong> (浏览器控制台 / F12 → Console):
            <code style="display:block;margin-top:3px;padding:4px 6px;background:var(--bg);border-radius:3px;font-size:9px;line-height:1.5;font-family:monospace;color:var(--text2)">localStorage.setItem('lamb_application_v1', JSON.stringify({score: 0.65, note: '最近 5 场 4 胜 1 负', updatedAt: Date.now()}))</code>
            <strong style="color:var(--text2)">计划接入</strong>: 比赛成绩 (胜率) + 训练日志 (动作完成率) + 对手评估。
          </div>` : `<div style="margin-top:7px;padding:5px 8px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.2);border-radius:5px;font-size:9px;color:var(--text2);line-height:1.5">
            ✅ 实战数据已从 localStorage 读取:<br>
            <code style="font-size:9px;font-family:monospace">${JSON.stringify(_appRaw).slice(0,120)}${JSON.stringify(_appRaw).length>120?'…':''}</code>
          </div>`}
        </div>
      </div>`;
    }
  } catch(e) { /* calc not yet defined, skip radar */ }
  const html = `<div style="text-align:center;padding:8px 4px">
    <div style="font-size:48px;margin-bottom:6px">${lvl.emoji}</div>
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">${lvl.label}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">⏱ ${lvl.time}</div>
    <div style="font-size:12px;line-height:1.55;color:var(--text2);margin-bottom:14px;text-align:left;padding:0 6px">${lvl.desc}</div>
    ${abilityHtml}
    ${radarHtml}
  </div>`;
  showOverlay('panel-sm', `${lvl.emoji} ${lvl.label}`, html);
}

// ─── 学员问卷 v3.7.7 (3 步 · 水平/伤病/优势) ─────────────
// v3.13.1: 草稿持久化 — 填到一半刷新/误关不再丢失
const PROFILE_DRAFT_KEY = 'lamb_student_profile_draft_v1';
function loadProfileDraft() {
  try {
    const raw = localStorage.getItem(PROFILE_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      level: d.level || null,
      injuries: Array.isArray(d.injuries) ? d.injuries : [],
      strengths: Array.isArray(d.strengths) ? d.strengths : [],
    };
  } catch { return null; }
}
function saveProfileDraft() {
  try { localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(_profileDraft)); } catch {}
}
function clearProfileDraft() {
  try { localStorage.removeItem(PROFILE_DRAFT_KEY); } catch {}
}
let _profileDraft = loadProfileDraft() || { level: null, injuries: [], strengths: [] };
function openStudentProfile() {
  // 优先恢复未提交的草稿；没有草稿时再用已保存的 profile 兜底
  const draft = loadProfileDraft();
  if (draft && (draft.level || draft.injuries.length || draft.strengths.length)) {
    _profileDraft = draft;
  } else {
    const cur = getProfile();
    _profileDraft = cur ? { level: cur.level, injuries: [...(cur.injuries||[])], strengths: [...(cur.strengths||[])] } : { level: null, injuries: [], strengths: [] };
  }
  showOverlay('panel-md', '📋 我的个性化方案', renderProfileMain());
}

// v3.7.9: 主入口 - 问卷 + 评语 二合一
function renderProfileMain() {
  const cur = getProfile();
  const hasProf = !!cur;
  const comments = getComments();
  const commentList = comments.length === 0
    ? '<div style="text-align:center;color:var(--text3);padding:14px;font-size:11px">暂无评语</div>'
    : comments.map(c => `<div style="background:var(--bg3);border-left:3px solid var(--purple);padding:9px 12px;border-radius:6px;margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:11px;font-weight:600">${c.role==='coach'?'🎓':'🧑‍🦱'} ${c.author}</span>
          <span style="font-size:9px;color:var(--text3)">${new Date(c.ts).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'})}</span>
        </div>
        <div style="font-size:12px;line-height:1.55;color:var(--text2)">${c.text.replace(/</g,'&lt;')}</div>
      </div>`).join('');
  return `<div style="padding:6px 4px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">v3.7.9 · 6维 + 评语 ⌽</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">📋 我的个性化训练方案</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">下面是你的 问卷 / 评语 / 模拟教练写评语 三块内容。v3.7.7 你填的问卷 → v3.7.9 串到了实战应用。</div>

    <!-- 问卷状态卡 -->
    <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;font-weight:600;margin-bottom:4px">${hasProf?'✅ 你已填问卷':'⏱ 还未填问卷'}</div>
          <div style="font-size:10px;color:var(--text3)">${hasProf?`水平 ${cur.level} · 伤病 ${(cur.injuries||[]).length}项 · 优势 ${(cur.strengths||[]).length}项`:'30秒填一下,根据你身体定制每个训练等级的比重'}</div>
        </div>
        <button onclick="showOverlayContent(renderProfileStep1())" class="ios-press" style="background:var(--blue);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${hasProf?'重填':'填一下'}</button>
      </div>
    </div>

    <!-- 教练评语 -->
    <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;font-weight:600">💬 教练评语 <span style="font-size:10px;color:var(--text3);font-weight:400">${comments.length}条</span></div>
      <button onclick="showOverlayContent(renderCommentWriter())" class="ios-press" style="background:linear-gradient(135deg,var(--purple),var(--blue));color:#fff;border:none;padding:6px 10px;border-radius:7px;font-size:10px;font-weight:600;cursor:pointer">＋ 模拟教练写评语</button>
    </div>
    <div>${commentList}</div>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeProfileOverlay()" class="ios-press" style="flex:1;background:var(--bg3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text2)">关闭</button>
    </div>
  </div>`;
}

// v3.7.9: 模拟教练写评语
function renderCommentWriter() {
  return `<div style="padding:6px 4px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">v3.7.9 · 模拟教练写评语</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">🎓 写一条评语</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">选择作者 (代表是谁写的)+ 写评语 · 点保存后会在你【收到的评语】里看到</div>

    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">作者</div>
      <input id="cmAuthor" type="text" value="李教练" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-size:13px;outline:none">
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">评语</div>
      <textarea id="cmText" rows="5" placeholder="例:近期双打接发质量提升不错,但网前推球仍偏急。建议下一阶段重点跟人配合,多练牌 6/7 点……" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-size:12px;outline:none;resize:vertical;font-family:inherit"></textarea>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="showOverlayContent(renderProfileMain())" class="ios-press" style="flex:1;background:var(--bg3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text2)">← 返回</button>
      <button onclick="submitComment()" class="ios-press" style="flex:2;background:linear-gradient(135deg,var(--purple),var(--blue));color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✓ 保存评语</button>
    </div>
  </div>`;
}
function submitComment() {
  try {
    var author = (document.getElementById('cmAuthor').value || '').trim() || '教练';
    var text = (document.getElementById('cmText').value || '').trim();
    if (!text) { try { document.getElementById('cmText').focus(); } catch(e) {} return; }
    addComment({ author, role:'coach', text, studentId:'self' });
    showToast('✅ 已保存评语');
    showOverlayContent(renderProfileMain());
  } catch(e) { console.warn('[submitComment]', e); }
}
function renderProfileStep1() {
  const opts = LEVELS.map(l => `<button onclick="_profileDraft.level='${l.id}';showOverlayContent(renderProfileStep2())" class="ios-press" style="display:block;width:100%;text-align:left;background:${_profileDraft.level===l.id?'var(--blue)':'var(--bg3)'};color:${_profileDraft.level===l.id?'#fff':'var(--text)'};border:1px solid ${_profileDraft.level===l.id?'var(--blue)':'var(--border)'};padding:9px 12px;border-radius:8px;margin-bottom:5px;cursor:pointer;font-size:12px">${l.emoji} <strong>${l.id}</strong> · ${l.label} <span style="float:right;font-size:10px;opacity:.7">${l.time}</span></button>`).join('');
  return `<div style="padding:6px 4px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">第 1/3 步 · ⏱ 10秒</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">🎯 你现在是什么水平？</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">选一个你实际能稳定打的质量·可重填</div>
    <div style="max-height:50vh;overflow-y:auto;padding-right:2px">${opts}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeProfileOverlay()" class="ios-press" style="flex:1;background:var(--bg3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text2)">取消</button>
      <button onclick="showOverlayContent(renderProfileStep2())" class="ios-press" style="flex:2;background:var(--blue);color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer" ${_profileDraft.level?'':'disabled style="flex:2;background:var(--bg3);color:var(--text3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:not-allowed"'}>下一步 →</button>
    </div>
  </div>`;
}
function renderProfileStep2() {
  if (!_profileDraft.level) return renderProfileStep1();
  const opts = INJURY_RULES.map(r => {
    const checked = _profileDraft.injuries.includes(r.id);
    return `<label class="ios-press" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:${checked?'var(--blue)':'var(--bg3)'};color:${checked?'#fff':'var(--text)'};border-radius:8px;margin-bottom:5px;cursor:pointer">
      <input type="checkbox" ${checked?'checked':''} onchange="toggleInjury('${r.id}', this.checked)" style="width:16px;height:16px;cursor:pointer">
      <span style="font-size:13px;flex:1">${r.label}</span>
      <span style="font-size:10px;opacity:.7">×${r.factor}</span>
    </label>`;
  }).join('');
  return `<div style="padding:6px 4px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">第 2/3 步 · ⏱ 10秒</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">🤕 你现在有哪些伤病/不适？</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">多选 · 勾上的会下调相关动作比重·可重填</div>
    <div>${opts}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="showOverlayContent(renderProfileStep1())" class="ios-press" style="flex:1;background:var(--bg3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text2)">← 上一步</button>
      <button onclick="showOverlayContent(renderProfileStep3())" class="ios-press" style="flex:2;background:var(--blue);color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">下一步 →</button>
    </div>
  </div>`;
}
function renderProfileStep3() {
  const opts = STRENGTH_RULES.map(r => {
    const checked = _profileDraft.strengths.includes(r.id);
    return `<label class="ios-press" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:${checked?'var(--purple)':'var(--bg3)'};color:${checked?'#fff':'var(--text)'};border-radius:8px;margin-bottom:5px;cursor:pointer">
      <input type="checkbox" ${checked?'checked':''} onchange="toggleStrength('${r.id}', this.checked)" style="width:16px;height:16px;cursor:pointer">
      <span style="font-size:13px;flex:1">${r.label}</span>
      <span style="font-size:10px;opacity:.7">${r.all?'全级 +20%':`×${r.factor}`}</span>
    </label>`;
  }).join('');
  return `<div style="padding:6px 4px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">第 3/3 步 · ⏱ 10秒</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px">💪 你的强项是什么？</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px;line-height:1.5">多选 · 勾上的会上调相关动作比重·可重填</div>
    <div>${opts}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="showOverlayContent(renderProfileStep2())" class="ios-press" style="flex:1;background:var(--bg3);border:none;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text2)">← 上一步</button>
      <button onclick="submitProfile()" class="ios-press" style="flex:2;background:linear-gradient(135deg,var(--blue),var(--purple));color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✓ 保存并应用</button>
    </div>
  </div>`;
}
function toggleInjury(id, on) {
  const i = _profileDraft.injuries.indexOf(id);
  if (on && i<0) _profileDraft.injuries.push(id);
  if (!on && i>=0) _profileDraft.injuries.splice(i,1);
  saveProfileDraft();
  showOverlayContent(renderProfileStep2());
}
function toggleStrength(id, on) {
  const i = _profileDraft.strengths.indexOf(id);
  if (on && i<0) _profileDraft.strengths.push(id);
  if (!on && i>=0) _profileDraft.strengths.splice(i,1);
  saveProfileDraft();
  showOverlayContent(renderProfileStep3());
}
function submitProfile() {
  const p = {
    level: _profileDraft.level,
    injuries: _profileDraft.injuries,
    strengths: _profileDraft.strengths,
    taken_at: new Date().toISOString(),
  };
  setProfile(p);
  clearProfileDraft(); // v3.13.1: 提交后清草稿，避免下次误以为没保存
  closeProfileOverlay();
  // 顶栏提示 + 重渲 level pyramid 状态文本
  try {
    const el = $('profileStatus');
    if (el) el.textContent = '✅ 已根据你的伤病/优势调整 (点上面重填)';
  } catch(e) {}
  // 轻提示
  showToast('✅ 已应用个性化方案 · 训练等级比重已调整');
}
function closeProfileOverlay() {
  // 关闭所有当前可见的 overlay（包括角色/profile 系列）
  document.querySelectorAll('.overlay').forEach(o => o.remove());
}
// showOverlay 创建后定位 body 容器、后续调用可重渲
// 注意：showOverlayContent 现在直接对最新一个 .overlay 生效（已移除共享 _tmpOverlay id）
function showOverlayContent(body) {
  const ovs = document.querySelectorAll('.overlay');
  if (!ovs.length) return;
  const ov = ovs[ovs.length - 1]; // 最新一个
  const bd = ov.querySelector('.panel-bd');
  if (bd) bd.innerHTML = body;
}
// 小 toast
function showToast(text, ms) {
  try {
    const t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:10px;font-size:12px;z-index:9999999;backdrop-filter:blur(20px);box-shadow:0 8px 24px rgba(0,0,0,.3);animation:iosFadeUp .3s';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2200);
  } catch(e) {}
}

// 自定义确认弹窗（替代原生 confirm()，与现有 overlay 风格统一）
// 回调形式：showConfirm('真的要删除？', () => { /* 用户点确认 */ });
function showConfirm(text, onOk, opts) {
  try {
    opts = opts || {};
    const okText = opts.okText || '确认';
    const cancelText = opts.cancelText || '取消';
    const danger = !!opts.danger;
    const overlay = document.createElement('div');
    overlay.className = 'overlay showConfirm-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); } };
    overlay.innerHTML = `<div class="panel showConfirm-panel" onclick="event.stopPropagation()" style="max-width:340px;width:calc(100vw - 40px);padding:20px 18px 16px;text-align:center;animation:slideUp .3s ease">
      <div style="font-size:14px;color:var(--text);line-height:1.6;margin-bottom:16px;word-break:break-word">${text}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button data-act="cancel" style="flex:1;padding:9px 0;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit">${cancelText}</button>
        <button data-act="ok" style="flex:1;padding:9px 0;background:${danger ? '#ff3b30' : 'var(--blue)'};color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600">${okText}</button>
      </div>
    </div>`;
    overlay.querySelector('[data-act="cancel"]').onclick = () => overlay.remove();
    overlay.querySelector('[data-act="ok"]').onclick = () => {
      overlay.remove();
      try { onOk && onOk(); } catch (e) { console.warn('[showConfirm onOk]', e); }
    };
    document.body.appendChild(overlay);
    // Esc 关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  } catch (e) {
    // 兜底：极端情况下退回原生 confirm，保证流程不中断
    if (confirm(text)) { try { onOk && onOk(); } catch (_) {} }
  }
}

// 自定义输入弹窗（替代原生 prompt()，与 showConfirm 风格统一）
// 回调形式：showPrompt('计划名称', (val) => { if (val) {...} }, { placeholder: '...', defaultValue: '🎯', title: '新建计划' });
function showPrompt(text, onOk, opts) {
  try {
    opts = opts || {};
    const title = opts.title || '';
    const placeholder = opts.placeholder || '';
    const defaultValue = opts.defaultValue || '';
    const okText = opts.okText || '确认';
    const cancelText = opts.cancelText || '取消';
    const overlay = document.createElement('div');
    overlay.className = 'overlay showPrompt-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); } };
    overlay.innerHTML = `<div class="panel showPrompt-panel" onclick="event.stopPropagation()" style="max-width:340px;width:calc(100vw - 40px);padding:20px 18px 16px;text-align:left;animation:slideUp .3s ease">
      ${title ? `<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px">${title}</div>` : ''}
      <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">${text}</div>
      <input type="text" data-prompt-input value="${(defaultValue+'').replace(/"/g,'&quot;')}" placeholder="${(placeholder+'').replace(/"/g,'&quot;')}" style="width:100%;padding:9px 11px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:14px" />
      <div style="display:flex;gap:10px;justify-content:center">
        <button data-act="cancel" style="flex:1;padding:9px 0;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit">${cancelText}</button>
        <button data-act="ok" style="flex:1;padding:9px 0;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600">${okText}</button>
      </div>
    </div>`;
    const input = overlay.querySelector('[data-prompt-input]');
    input.focus(); input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); overlay.remove(); }
    });
    overlay.querySelector('[data-act="cancel"]').onclick = () => overlay.remove();
    overlay.querySelector('[data-act="ok"]').onclick = commit;
    function commit() {
      const val = (input.value || '').trim();
      overlay.remove();
      try { onOk && onOk(val); } catch (e) { console.warn('[showPrompt onOk]', e); }
    }
    document.body.appendChild(overlay);
  } catch (e) {
    // 兜底：极端情况下退回原生 prompt，保证流程不中断
    const fallback = prompt(text, defaultValue);
    try { onOk && onOk((fallback || '').trim()); } catch (_) {}
  }
}

// ─── 交互式损伤筛查 v2.0 ────────────────────────────
// 损伤部位数据
const injuryBodyParts = {
  shoulder: {
    name: '肩部', icon: '💪', color: '#0a84ff',
    questions: [
      { id: 'pain', text: '肩部是否有疼痛？', options: [{v:0,t:'无疼痛'},{v:1,t:'轻微酸痛'},{v:2,t:'明显疼痛'},{v:3,t:'严重疼痛'}], type: 'select' },
      { id: 'raise', text: '能否举手过头？', options: [{v:0,t:'完全没问题'},{v:1,t:'能举但受限'},{v:2,t:'只能举到肩部'},{v:3,t:'完全举不起来'}], type: 'select' },
      { id: 'serve', text: '发球/杀球时肩部感觉？', options: [{v:0,t:'正常发力'},{v:1,t:'轻微不适'},{v:2,t:'明显酸软'},{v:3,t:'无法发力'}], type: 'select' },
      { id: 'sound', text: '肩部是否有弹响/摩擦声？', options: [{v:0,t:'无'},{v:1,t:'偶尔有'},{v:2,t:'经常有'},{v:3,t:'每次活动都有'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '肩袖炎', symptoms: '举手过顶疼痛+夜间痛醒', severity: '中', solution: '① 弹力带外旋训练 ② 肩部保暖 ③ 暂停过头动作 ④ 每周2次理疗' },
      { name: '肱二头肌腱炎', symptoms: '屈臂时肩前疼痛', severity: '轻', solution: '① 减轻训练量 ② 冰敷 ③ 伸展肱二头肌' },
      { name: '肩关节不稳', symptoms: '举手时肩部"脱落感"', severity: '重', solution: '① 立刻就医 ② 停止扣杀 ③ 强化肩袖深层肌' }
    ]
  },
  wrist: {
    name: '腕部', icon: '🤲', color: '#30d158',
    questions: [
      { id: 'pain', text: '腕部是否有疼痛？', options: [{v:0,t:'无疼痛'},{v:1,t:'轻微酸痛'},{v:2,t:'明显疼痛'},{v:3,t:'剧痛'}], type: 'select' },
      { id: 'grip', text: '握拍时疼痛程度？', options: [{v:0,t:'正常'},{v:1,t:'轻微不适'},{v:2,t:'明显疼痛'},{v:3,t:'无法握拍'}], type: 'select' },
      { id: 'twist', text: '手腕扭转是否受限？', options: [{v:0,t:'完全正常'},{v:1,t:'轻微受限'},{v:2,t:'明显受限'},{v:3,t:'无法扭转'}], type: 'select' },
      { id: 'swelling', text: '腕部是否肿胀？', options: [{v:0,t:'无'},{v:1,t:'轻微'},{v:2,t:'明显肿胀'},{v:3,t:'严重肿胀'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '网球肘(肱骨外上髁炎)', symptoms: '握拍+反手击球时腕部外侧疼痛', severity: '中', solution: '① 停止握拍发力 ② 前臂拉伸 ③ 护具固定 ④ 必要时就医' },
      { name: '腕管综合征', symptoms: '手指麻木+夜间加重', severity: '重', solution: '① 就医检查 ② 减少手腕屈伸 ③ 营养神经' },
      { name: '三角纤维软骨损伤', symptoms: '手腕小指侧疼痛+扭毛巾无力', severity: '中', solution: '① 护腕固定 ② 避免手腕翻转 ③ 康复训练' }
    ]
  },
  waist: {
    name: '腰部', icon: '🧘', color: '#ff9f0a',
    questions: [
      { id: 'pain', text: '腰部是否有疼痛？', options: [{v:0,t:'无疼痛'},{v:1,t:'轻微酸痛'},{v:2,t:'明显疼痛'},{v:3,t:'剧痛难忍'}], type: 'select' },
      { id: 'bend', text: '弯腰是否受限？', options: [{v:0,t:'完全正常'},{v:1,t:'轻微受限'},{v:2,t:'明显受限'},{v:3,t:'无法弯腰'}], type: 'select' },
      { id: 'twist', text: '腰部扭转是否疼痛？', options: [{v:0,t:'无'},{v:1,t:'轻微'},{v:2,t:'明显疼痛'},{v:3,t:'无法扭转'}], type: 'select' },
      { id: 'leg', text: '是否有腿麻/放射痛？', options: [{v:0,t:'无'},{v:1,t:'偶尔'},{v:2,t:'经常'},{v:3,t:'持续麻木'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '腰肌劳损', symptoms: '久坐+弯腰酸痛+晨起僵硬', severity: '轻', solution: '① 核心训练 ② 避免久坐 ③ 热敷 ④ 拉伸髂腰肌' },
      { name: '腰椎间盘突出', symptoms: '腰疼+腿麻+咳嗽加重', severity: '重', solution: '① 立刻就医 ② 避免弯腰搬重物 ③ 睡硬板床' },
      { name: '急性腰扭伤', symptoms: '突然疼痛+活动受限', severity: '中', solution: '① 立刻冰敷 ② 卧床休息 ③ 48小时后热敷' }
    ]
  },
  knee: {
    name: '膝盖', icon: '🦵', color: '#ff453a',
    questions: [
      { id: 'pain', text: '膝盖是否有疼痛？', options: [{v:0,t:'无疼痛'},{v:1,t:'轻微酸痛'},{v:2,t:'明显疼痛'},{v:3,t:'剧痛'}], type: 'select' },
      { id: 'stair', text: '上下楼梯感觉？', options: [{v:0,t:'完全正常'},{v:1,t:'轻微不适'},{v:2,t:'明显疼痛'},{v:3,t:'无法上下楼'}], type: 'select' },
      { id: 'squat', text: '深蹲时膝盖感觉？', options: [{v:0,t:'正常'},{v:1,t:'轻微不适'},{v:2,t:'明显疼痛'},{v:3,t:'无法深蹲'}], type: 'select' },
      { id: 'swelling', text: '膝盖是否肿胀/积液？', options: [{v:0,t:'无'},{v:1,t:'轻微'},{v:2,t:'明显肿胀'},{v:3,t:'严重肿胀'}], type: 'select' },
      { id: 'sound', text: '膝盖活动时有弹响？', options: [{v:0,t:'无'},{v:1,t:'偶尔'},{v:2,t:'经常'},{v:3,t:'每次活动都有'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '髌腱炎(跳跃膝)', symptoms: '膝盖下方疼痛+跳跃加重', severity: '中', solution: '① 停止跳跃 ② 冰敷 ③ 强化股四头肌 ④ 佩戴髌腱带' },
      { name: '半月板损伤', symptoms: '膝盖卡住+肿胀+活动受限', severity: '重', solution: '① 就医检查 ② 避免深蹲 ③ 康复训练 ④ 严重需手术' },
      { name: '髂胫束综合征', symptoms: '膝盖外侧疼痛+跑步加重', severity: '中', solution: '① 停止跑步 ② 泡沫轴放松 ③ 侧卧抬腿强化' },
      { name: '前交叉韧带损伤', symptoms: '膝盖"错位"感+肿胀', severity: '重', solution: '① 立刻就医 ② RICE原则 ③ 手术+康复' }
    ]
  },
  ankle: {
    name: '脚踝', icon: '🦶', color: '#bf5af2',
    questions: [
      { id: 'pain', text: '脚踝是否有疼痛？', options: [{v:0,t:'无疼痛'},{v:1,t:'轻微酸痛'},{v:2,t:'明显疼痛'},{v:3,t:'剧痛'}], type: 'select' },
      { id: 'twist', text: '是否容易崴脚？', options: [{v:0,t:'从不'},{v:1,t:'偶尔'},{v:2,t:'经常'},{v:3,t:'反复崴脚'}], type: 'select' },
      { id: 'stable', text: '单腿站立是否稳定？', options: [{v:0,t:'非常稳定'},{v:1,t:'轻微晃动'},{v:2,t:'明显不稳'},{v:3,t:'无法站立'}], type: 'select' },
      { id: 'swelling', text: '脚踝是否肿胀？', options: [{v:0,t:'无'},{v:1,t:'轻微'},{v:2,t:'明显肿胀'},{v:3,t:'严重肿胀'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '踝关节扭伤', symptoms: '崴脚+肿胀+疼痛', severity: '中', solution: '① RICE原则 ② 护踝固定 ③ 康复训练 ④ 3周内避免运动' },
      { name: '慢性踝关节不稳', symptoms: '反复崴脚+"打软腿"', severity: '中', solution: '① 本体感觉训练 ② 平衡板训练 ③ 强化腓骨肌 ④ 护踝' },
      { name: '跟腱炎', symptoms: '脚后跟疼痛+晨起僵硬', severity: '中', solution: '① 停止跑跳 ② 拉伸小腿 ③ 冰敷 ④ 避免赤脚' }
    ]
  },
  muscle: {
    name: '肌肉', icon: '💪', color: '#64d2ff',
    questions: [
      { id: 'soreness', text: '肌肉酸痛程度？', options: [{v:0,t:'无'},{v:1,t:'轻微(24h内消失)'},{v:2,t:'明显(48h消失)'},{v:3,t:'严重(>3天)'}], type: 'select' },
      { id: 'cramp', text: '是否经常抽筋？', options: [{v:0,t:'从不'},{v:1,t:'偶尔'},{v:2,t:'经常'},{v:3,t:'每次运动都抽筋'}], type: 'select' },
      { id: 'tight', text: '肌肉是否经常紧绷？', options: [{v:0,t:'否'},{v:1,t:'轻微'},{v:2,t:'明显'},{v:3,t:'严重紧绷'}], type: 'select' },
      { id: 'tear', text: '是否有肌肉撕裂感？', options: [{v:0,t:'无'},{v:1,t:'轻微拉伤'},{v:2,t:'中度拉伤'},{v:3,t:'严重撕裂'}], type: 'select' }
    ],
    commonInjuries: [
      { name: '肌肉拉伤', symptoms: '发力时突然剧痛+"被踢"感', severity: '中', solution: '① 立刻停止 ② 冰敷 ③ 加压包扎 ④ 72小时后热敷+拉伸' },
      { name: '延迟性肌肉酸痛(DOMS)', symptoms: '训练后24-48h酸痛', severity: '轻', solution: '① 轻度活动 ② 泡沫轴放松 ③ 补充电解质 ④ 等待自愈' },
      { name: '肌肉痉挛', symptoms: '突发抽筋+剧烈疼痛', severity: '轻', solution: '① 拉伸痉挛肌群 ② 补充盐水 ③ 按摩 ④ 热敷' }
    ]
  }
};

// 打开损伤筛查
function openInjuryScreening() {
  showView('book');
  currentModule = 'injury-screening';
  navStack.push({view:'dashboard'});
  historyPush('injury-screening', {});
  
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🩹 损伤筛查系统</h1>
    <div class="vm">交互式 · 6部位 · 智能诊断</div>`;
  $('bookStats').innerHTML = '';
  
  // 显示身体部位选择
  const bodyPartsHtml = Object.entries(injuryBodyParts).map(([key, part]) => `
    <div onclick="selectInjuryPart('${key}')" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:all .2s" onmouseover="this.style.borderColor='${part.color}'" onmouseout="this.style.borderColor='var(--border)'">
      <span style="font-size:28px">${part.icon}</span>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:600;color:var(--text)">${part.name}</div>
        <div style="font-size:11px;color:var(--text2)">${part.commonInjuries.length}种常见损伤</div>
      </div>
      <span style="color:var(--text3);font-size:18px">›</span>
    </div>`).join('');
  
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1;background:linear-gradient(135deg,var(--bg3),var(--bg2));border-radius:var(--radius);padding:20px;margin-bottom:12px;text-align:center">
      <div style="font-size:22px;margin-bottom:8px">🏸 羽毛球损伤全面筛查</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6">选择身体部位，回答几个简单问题<br>生成个性化损伤清单和解决方案</div>
    </div>
    <div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
      ${bodyPartsHtml}
    </div>`;
}

// 选择损伤部位
function selectInjuryPart(partKey) {
  const part = injuryBodyParts[partKey];
  if (!part) return;
  
  window._currentInjuryPart = partKey;
  window._injuryAnswers = {};
  
  const questionsHtml = part.questions.map((q, idx) => `
    <div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;border-left:3px solid ${part.color}">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">${idx+1}. ${q.text}</div>
      <select id="injury_q_${q.id}" onchange="saveInjuryAnswer('${q.id}', this.value)" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:13px">
        <option value="">请选择...</option>
        ${q.options.map(o => `<option value="${o.v}">${o.t}</option>`).join('')}
      </select>
    </div>`).join('');
  
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div onclick="openInjuryScreening()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg2);border-radius:20px;margin-bottom:12px;cursor:pointer;font-size:12px;color:var(--text2)">
        <span>‹</span> 返回部位选择
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
        <span style="font-size:32px">${part.icon}</span>
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--text)">${part.name}损伤筛查</div>
          <div style="font-size:11px;color:var(--text2)">请如实回答以下问题</div>
        </div>
      </div>
      ${questionsHtml}
      <button onclick="generateInjuryReport()" style="width:100%;padding:14px;background:${part.color};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px">
        📋 生成损伤报告
      </button>
    </div>`;
}

// 保存答案
function saveInjuryAnswer(qId, value) {
  window._injuryAnswers[qId] = parseInt(value) || 0;
}

// 生成损伤报告
function generateInjuryReport() {
  const partKey = window._currentInjuryPart;
  const part = injuryBodyParts[partKey];
  const answers = window._injuryAnswers || {};
  
  // 计算总分
  let totalScore = 0;
  let answeredCount = 0;
  Object.values(answers).forEach(v => {
    totalScore += v;
    answeredCount++;
  });
  
  if (answeredCount < 2) {
    showConfirm('请至少回答 2 个问题以便生成报告', null, { okText: '知道了', cancelText: '' });
    return;
  }
  
  // 计算风险等级
  const maxScore = answeredCount * 3;
  const riskLevel = totalScore / maxScore;
  let riskText, riskColor, riskAdvice;
  
  if (riskLevel < 0.25) {
    riskText = '低风险'; riskColor = '#30d158'; riskAdvice = '继续保持良好的训练习惯，注意热身和拉伸';
  } else if (riskLevel < 0.5) {
    riskText = '中等风险'; riskColor = '#ff9f0a'; riskAdvice = '需要注意训练强度，加强相关部位的力量和灵活性训练';
  } else if (riskLevel < 0.75) {
    riskText = '较高风险'; riskColor = '#ff7500'; riskAdvice = '建议减少训练强度，及时进行康复训练，必要时就医';
  } else {
    riskText = '高风险'; riskColor = '#ff453a'; riskAdvice = '强烈建议立即停止训练，就医检查，遵医嘱进行康复';
  }
  
  // 根据得分推荐相关损伤
  const relevantInjuries = part.commonInjuries.filter((inj, idx) => {
    // 根据答案相关性展示
    if (answers.pain >= 2 && idx < 2) return true;
    if (answers.pain >= 1 && idx < 3) return true;
    return idx === 0;
  });
  
  // 构建报告HTML
  const injuriesHtml = relevantInjuries.map(inj => `
    <div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;border-left:3px solid ${inj.severity==='重'?'#ff453a':inj.severity==='中'?'#ff9f0a':'#30d158'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600;color:var(--text)">${inj.name}</span>
        <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${inj.severity==='重'?'#ff453a22':inj.severity==='中'?'#ff9f0a22':'#30d15822'};color:${inj.severity==='重'?'#ff453a':inj.severity==='中'?'#ff9f0a':'#30d158'}">${inj.severity}度</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">📍 症状: ${inj.symptoms}</div>
      <div style="font-size:12px;color:var(--blue);background:var(--bg3);padding:10px;border-radius:8px">💡 ${inj.solution}</div>
    </div>`).join('');
  
  const reportHtml = `
    <div style="padding:20px;max-height:80vh;overflow-y:auto">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:10px">${part.icon}</div>
        <div style="font-size:18px;font-weight:700;color:var(--text)">${part.name}损伤评估报告</div>
      </div>
      
      <div style="background:linear-gradient(135deg,${riskColor}22,${riskColor}11);border:2px solid ${riskColor};border-radius:12px;padding:16px;text-align:center;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">综合风险等级</div>
        <div style="font-size:28px;font-weight:700;color:${riskColor}">${riskText}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:8px">${riskAdvice}</div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;text-align:center">
        <div style="background:var(--bg2);border-radius:8px;padding:10px">
          <div style="font-size:20px;font-weight:700;color:var(--text)">${answeredCount}</div>
          <div style="font-size:10px;color:var(--text2)">回答问题</div>
        </div>
        <div style="background:var(--bg2);border-radius:8px;padding:10px">
          <div style="font-size:20px;font-weight:700;color:${riskColor}">${Math.round(riskLevel*100)}%</div>
          <div style="font-size:10px;color:var(--text2)">风险指数</div>
        </div>
        <div style="background:var(--bg2);border-radius:8px;padding:10px">
          <div style="font-size:20px;font-weight:700;color:var(--text)">${relevantInjuries.length}</div>
          <div style="font-size:10px;color:var(--text2)">相关损伤</div>
        </div>
      </div>
      
      <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px">📋 可能的相关损伤及建议</div>
      ${injuriesHtml}
      
      <div style="background:var(--bg3);border-radius:10px;padding:14px;margin-top:16px;border:1px dashed var(--border)">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">🛡️ 预防建议</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          • 每次训练前充分热身（10-15分钟）<br>
          • 训练后进行针对性拉伸<br>
          • 加强相关部位的力量训练<br>
          • 注意训练强度，循序渐进<br>
          • 如有不适及时停止并冰敷<br>
          • 严重疼痛建议就医检查
        </div>
      </div>
      
      <button onclick="closeOverlayPopup(this)" style="width:100%;padding:12px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:13px;margin-top:16px;cursor:pointer">关闭报告</button>
    </div>`;
  
  showOverlay('panel-lg', '📋 损伤筛查报告', reportHtml);
}

// 旧版功能筛查（兼容调用新系统）
function openScreening() {
  openInjuryScreening();
}

// ─── 工具页面 ────────────────────────────
function openCalculators() {
showView("book");
currentModule="calculators";
navStack.push({view:"dashboard"});
historyPush("calculators",{});
document.getElementById("bookHeader").innerHTML='<div class="back" onclick="goBack()">← 返回</div><h1>🧮 训练计算工具</h1><div class="vm">选参数→自动结果</div>';
document.getElementById("bookStats").innerHTML="";
document.getElementById("contentGrid").innerHTML="<div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">🔥 TDEE</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>性别<select id=\"tdeeGender\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=male>男</option><option value=female>女</option></select></label><label>体重(kg)<input id=\"tdeeWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>身高(cm)<input id=\"tdeeHeight\" type=number value=175 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>年龄<input id=\"tdeeAge\" type=number value=25 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>活动<select id=\"tdeeActivity\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=1.2>久坐</option><option value=1.375>轻度</option><option value=1.55 selected>中度</option><option value=1.725>高度</option><option value=1.9>极高</option></select></label></div><button onclick=\"calcTDEE()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">🔥 计算 TDEE</button><div id=\"tdeeResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--green)\">🥩 营养素</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>体重<input id=\"macroWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>目标<select id=\"macroGoal\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=maintain>维持</option><option value=gain>增肌</option><option value=lose>减脂</option></select></label><label>TDEE<input id=\"macroTDEE\" type=number value=2500 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label></div><button onclick=\"calcMacro()\" class=\"qw-btn\" style=\"background:var(--green);color:#fff;border:none;width:100%\">🥩 计算营养素</button><div id=\"macroResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">💧 水合</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>体重<input id=\"waterWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>训练(分钟)<input id=\"waterTrain\" type=number value=60 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>温度<select id=\"waterTemp\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=1>常温</option><option value=1.2>&gt;30°C</option></select></label></div><button onclick=\"calcWater()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">💧 计算水合</button><div id=\"waterResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--gold)\">⏰ 恢复时间线</div><div style=\"display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:var(--text2)\"><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">0-30分</strong><br>快速碳水1-1.2g/kg+蛋白0.3-0.4g/kg</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">30分-2h</strong><br>正餐(碳水+蛋白+蔬菜)</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">2h-睡前</strong><br>泡沫轴10-15分钟</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--gold)\">睡眠7-9h</strong><br>⭐ 组织修复</div></div></div>";
updateProgress();
}function openDiagnosis() {
  showOverlay('panel-lg', '🔍 训练问题诊断', `
    <div style="padding:10px;max-height:70vh;overflow-y:auto">
      <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:16px">点击问题查看详细解决方案</div>
      
      <div onclick="toggleDiagnosisDetail(0)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">动作标准但没进步</strong>
          <span id="diag_icon_0" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_0" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">可能原因：</strong><br>
          • 训练强度不够/周期太长<br>
          • 恢复不足导致适应<br>
          • 技术动作已定型但缺乏比赛检验<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 用VBT等工具检测是否真的没进步<br>
          ② 尝试新的训练变式（重量/次数/节奏）<br>
          ③ 加入比赛场景训练

        </div>
      </div>
      
      <div onclick="toggleDiagnosisDetail(1)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">动作越练越差</strong>
          <span id="diag_icon_1" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_1" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">可能原因：</strong><br>
          • 疲劳累积（神经疲劳/肌肉疲劳）<br>
          • 加量太快，没有循序渐进<br>
          • 睡眠/营养不足<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 连续休息2-3天<br>
          ② 检查睡眠是否7-9小时<br>
          ③ 下次训练减量30%
        </div>
      </div>
      
      <div onclick="toggleDiagnosisDetail(2)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">训练中某个部位痛</strong>
          <span id="diag_icon_2" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_2" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">判断方法：</strong><br>
          • 刺痛 = 立刻停止，可能严重损伤<br>
          • 酸胀 = 正常乳酸堆积，可继续<br>
          • 锐痛 = 停止，冷敷<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 刺痛立即停止，冰敷<br>
          ② 48小时内冰敷，之后热敷<br>
          ③ 严重就就医
        </div>
      </div>
      
      <div onclick="toggleDiagnosisDetail(3)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">能完成但"使不上劲"</strong>
          <span id="diag_icon_3" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_3" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">可能原因：</strong><br>
          • 动力链断裂（力传导不畅）<br>
          • 核心不稳导致力量泄漏<br>
          • 肌张力不平衡<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 检查动作流畅度<br>
          ② 加强核心训练<br>
          ③ 从慢动作开始重建动力链
        </div>
      </div>
      
      <div onclick="toggleDiagnosisDetail(4)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">体能跟不上技术训练</strong>
          <span id="diag_icon_4" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_4" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">可能原因：</strong><br>
          • 有氧基础薄弱<br>
          • 糖原储备不足<br>
          • 训练模式单一<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 增加有氧训练（跑步/跳绳）<br>
          ② 训练前补足碳水<br>
          ③ 尝试间歇训练
        </div>
      </div>
      
      <div onclick="toggleDiagnosisDetail(5)" style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;border-left:3px solid var(--orange)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--text);font-size:13px">比赛时技术变形</strong>
          <span id="diag_icon_5" style="color:var(--text3)">›</span>
        </div>
        <div id="diag_detail_5" style="display:none;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.8;background:var(--bg3);padding:12px;border-radius:8px">
          <strong style="color:var(--blue)">可能原因：</strong><br>
          • 心理压力导致动作僵硬<br>
          • 对手打乱节奏<br>
          • 体能下降后技术变形<br>
          <br><strong style="color:var(--green)">建议方案：</strong><br>
          ① 模拟比赛场景训练<br>
          ② 简化技术在压力下使用<br>
          ③ 增强体能延长技术保持时间
        </div>
      </div>
      
      <button onclick="closeOverlayPopup(this)" style="width:100%;margin-top:10px;padding:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">关闭</button>
    </div>`);
}

function toggleDiagnosisDetail(idx) {
  var detail = document.getElementById('diag_detail_' + idx);
  var icon = document.getElementById('diag_icon_' + idx);
  if (detail.style.display === 'none') {
    detail.style.display = 'block';
    icon.innerHTML = 'ˇ';
  } else {
    detail.style.display = 'none';
    icon.innerHTML = '›';
  }
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

// ─── 🎯 教练板块 ──────────────────────────
function openCoach() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🎯 教练板块</h1>
    <div class="vm">教练工作台 · 学员评估 · 训练设计 · 6专家21轮研讨体系</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">6</span><span class="bs-label">📚 教学模块</span></div>
    <div class="bs-item"><span class="bs-num">13</span><span class="bs-label">📖 知识章节</span></div>
    <div class="bs-item"><span class="bs-num">30+</span><span class="bs-label">🧪 测评题目</span></div>
    <div class="bs-item"><span class="bs-num">21</span><span class="bs-label">🔄 研讨轮次</span></div>`;
  $('contentGrid').innerHTML = `
    <!-- 教练系统主入口 -->
    <div class="calc-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--gold);border-radius:var(--radius);padding:16px;grid-column:1/-1">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="font-size:32px">🏟️</div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;color:var(--gold)">羽毛球教练系统 · 教练工作台</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.5">
            6位专家联合21轮研讨出品 · 从零基础到独立执教的系统化教练成长路径<br>
            📊 评估 → 📋 计划 → 📚 学习 → ⚡ 速查 → 🎬 实战
          </div>
        </div>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/index.html','教练工作台')" class="tb-btn" style="font-size:12px;padding:6px 14px;background:var(--gold);color:#000;border:none;font-weight:600">🚀 打开教练工作台</a>
      </div>
    </div>

    <!-- 核心工具卡片 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">📊</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">学员水平评估</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        省队/市队/国家队选材级测评。<br>
        30+题目，6大维度，7级结果。
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/level-assessment.html','学员水平评估')" class="tb-btn">📋 开始评估 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">📚</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">教练速成指导书</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        13章完整体系：教练素养→运动科学→训练方法→体能→营养→康复→心理→课例模板
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-guide.html','教练速成指导书')" class="tb-btn">📖 开始学习 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">⚡</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">教练速查手册</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        7-16岁训练路径总览。<br>
        按年龄给答案：教什么/不教什么/怎么教。
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','教练速查手册')" class="tb-btn">⚡ 快速查阅 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">🧒</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">儿童训练方案</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        分龄训练详细方案：<br>
        7-9岁 · 9-11岁 · 11-13岁 · 13-16岁
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/kids-training-program-part1.html','儿童训练方案')" class="tb-btn">📋 查看方案 →</a>
    </div>

    <!-- 训练计划制定 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">📋 周期性训练计划</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:8px">
        <strong>大周期</strong>（6-12个月 · 赛季规划）<br>
        <strong>中周期</strong>（3-6周 · 专项阶段）<br>
        <strong>小周期</strong>（1周 · 具体执行）
      </div>
      <button onclick="goToBook('nsca-cpt');setTimeout(()=>openChapter(0),200)" class="tb-btn">📖 NSCA-CPT入门</button>
    </div>

    <!-- 训练负荷调控 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">📊 训练负荷调控</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        <strong>RPE</strong> 1-10 · <strong>训练量</strong> 次×组×重<br>
        <strong>恢复窗口</strong> 24-72h
      </div>
      <div style="font-size:9px;color:var(--text3);padding:4px 8px;background:var(--bg3);border-radius:4px">
        💡 每周总增幅不超10% · 4周后减量
      </div>
    </div>

    <!-- 个性化方案 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;grid-column:span 2">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">🧑‍🏫 个性化训练方案生成</div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:10px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="flex:1;min-width:120px">① 级别
            <select id="coachLevel" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${['L0零基础','L1基础','L2入门','L3熟练','L4精进','L5战术','L6准专业','L7专业'].map((l,i)=>`<option value="${i}">${l}</option>`).join('')}
            </select>
          </label>
          <label style="flex:1;min-width:80px">② 频率
            <select id="coachFreq" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${[2,3,4,5,6].map(f=>`<option value="${f}"${f===3?' selected':''}>${f}次/周</option>`).join('')}
            </select>
          </label>
          <label style="flex:1;min-width:80px">③ 时长
            <select id="coachTime" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${[60,90,120,150].map(t=>`<option value="${t}"${t===90?' selected':''}>${t}分钟</option>`).join('')}
            </select>
          </label>
        </div>
        <button onclick="generateCoachPlan()" style="margin-top:4px;padding:6px 16px;border:none;border-radius:6px;background:var(--blue);color:#fff;font-size:12px;cursor:pointer">🎯 生成训练方案</button>
        <div id="coachResult" style="margin-top:4px"></div>
      </div>
    </div>

    <!-- 教练腰带 · 教练系统融合区 -->
    <div class="calc-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--blue);border-radius:var(--radius);padding:16px;grid-column:1/-1">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--blue)">🎯 教练工作台 · 教练系统融合</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:10px">6专家21轮研讨产出的一体化教练工具，直接在新窗口打开使用</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px">
        <a href="javascript:void(0)" onclick="openCoachInline('coach/index.html','教练工作台')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">🏟️</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">教练工作台</div>
          <div style="font-size:9px;color:var(--text3)">总入口 · 所有工具跳转</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/level-assessment.html','学员水平评估')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📊</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">学员水平评估</div>
          <div style="font-size:9px;color:var(--text3)">30+题 · 6维度 · 7级结果</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-guide.html','教练速成指导书')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📚</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">教练速成指导书</div>
          <div style="font-size:9px;color:var(--text3)">13章系统体系</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','训练前速查手册')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">⚡</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">训练前速查手册</div>
          <div style="font-size:9px;color:var(--text3)">7-16岁按龄速查</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/kids-training-program-part1.html','儿童训练分龄方案')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">🧒</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">儿童训练分龄方案</div>
          <div style="font-size:9px;color:var(--text3)">7-9·9-11·11-13·13-16</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','课例模板库')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📋</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">课例模板库</div>
          <div style="font-size:9px;color:var(--text3)">含课时间接实例</div>
        </a>
      </div>
    </div>

    <!-- 多球训练参数速查 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">🥇 多球训练参数速查</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        <strong>启蒙期</strong>（6-9岁）：球速·20个/组 · 间隔·休息15s · 重点·动作模式<br>
        <strong>基础期</strong>（9-11岁）：30个/组 · 间隔·休息10s · 重点·重复精度<br>
        <strong>提高期</strong>（11-13岁）：50个/组 · 间隔·休息8s · 重点·变化<br>
        <strong>强化期</strong>（13-16岁）：80个/组 · 间隔·休息5s · 重点·组合技术
      </div>
      <div style="font-size:9px;color:var(--text3);padding:4px 8px;background:var(--bg3);border-radius:4px">💡 年龄越小间休越长，以保证动作质量</div>
    </div>

    <!-- 动作质量记录表 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">📋 动作质量记录模板</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.7">
        <div style="background:var(--bg3);border-radius:6px;padding:8px;margin-bottom:6px">
          <div>📅 训练日期：__________</div>
          <div>⏱ 总时长：____ 分钟</div>
          <div>🎯 主要内容：__________________</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:6px">
          <div>🥔 高远球：________球/____ 个</div>
          <div>🔥 杀球：______球/____ 个</div>
          <div>🌐 抽球：______球/____ 个</div>
          <div>💧 控球：______球/____ 个</div>
        </div>
        <div>📊 RPE（1-10）：____</div>
        <div>💪 状态：🟢 黄亮 ____ 🔴 差 ____</div>
        <div>📝 备注：________________________</div>
      </div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:10px;color:var(--text3)">
      🎯 教练板块 · NSCA-CPT科学体系 + 6专家21轮研讨体系融合 · v3.5.0
    </div>`;
  updateProgress();
}

// ─── 生成训练方案 (v3.8.7: 饼图交互+科学训练算法) ────────────────────────
function generateCoachPlan() {
  const level = parseInt(document.getElementById('coachLevel')?.value);
  const freq = parseInt(document.getElementById('coachFreq')?.value);
  const time = parseInt(document.getElementById('coachTime')?.value);
  if (isNaN(level) || isNaN(freq)) { return; }

  // ========== 科学训练算法：基于NSCA周期化原则 + 羽毛球专项 ==========
  // 根据级别和频率计算各模块占比
  const getPct = (base, slope) => Math.max(10, base + slope * level);
  
  // 技术训练：初学者占比高，随着级别提升逐渐降低（动作定型后需要更多体能支撑）
  const techniquePct = Math.round(getPct(55, -5));
  // 力量训练：级别越高需要更多力量支撑技术输出
  const strengthPct = Math.round(getPct(12, 3));
  // 体能训练：专业级需要更强体能
  const cardioPct = Math.round(getPct(13, 2));
  // 恢复：保证训练质量
  const recoveryPct = 100 - techniquePct - strengthPct - cardioPct;

  // 根据频率调整每次训练内容分配
  const timePerSession = time;
  const sessionsPerWeek = freq;
  
  // 训练类别数据（根据级别动态生成）
  const categories = [
    { 
      name: '技术训练', 
      pct: techniquePct, 
      color: '#0a84ff',
      timeAlloc: Math.round(timePerSession * techniquePct / 100),
      drills: getTechniqueDrills(level, sessionsPerWeek, timePerSession)
    },
    { 
      name: '力量训练', 
      pct: strengthPct, 
      color: '#30d158',
      timeAlloc: Math.round(timePerSession * strengthPct / 100),
      drills: getStrengthDrills(level, sessionsPerWeek, timePerSession)
    },
    { 
      name: '体能训练', 
      pct: cardioPct, 
      color: '#ff9f0a',
      timeAlloc: Math.round(timePerSession * cardioPct / 100),
      drills: getCardioDrills(level, sessionsPerWeek, timePerSession)
    },
    { 
      name: '恢复放松', 
      pct: recoveryPct, 
      color: '#a855f7',
      timeAlloc: Math.round(timePerSession * recoveryPct / 100),
      drills: getRecoveryDrills(level, sessionsPerWeek)
    }
  ];

  // 生成饼图 SVG
  let cum = 0;
  const piePaths = categories.map((cat, i) => {
    const start = cum;
    const end = cum + cat.pct;
    const large = end - start > 50 ? 1 : 0;
    const x1 = 50 + 35 * Math.cos(2 * Math.PI * start / 100);
    const y1 = 50 + 35 * Math.sin(2 * Math.PI * start / 100);
    const x2 = 50 + 35 * Math.cos(2 * Math.PI * end / 100);
    const y2 = 50 + 35 * Math.sin(2 * Math.PI * end / 100);
    cum = end;
    return `<path d="M50,50 L${x1},${y1} A35,35 0 ${large},1 ${x2},${y2} Z" fill="${cat.color}" stroke="var(--bg)" stroke-width="1" onclick="event.stopPropagation();toggleCoachDrills(${i})" style="cursor:pointer;transition:opacity .2s" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1"/>`;
  }).join('');

  const levelNames = ['零基础','基础','入门','熟练','精进','战术','准专业','专业'];
  
  // 训练建议
  const freqAdvice = getFrequencyAdvice(freq, level);

  // 保存数据供点击使用
  window._coachCategories = categories;

  document.getElementById('coachResult').innerHTML = `
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:12px;margin-top:8px;font-size:11px;line-height:1.6">
      <div style="font-weight:600;margin-bottom:8px;color:var(--gold)">🎯 ${levelNames[level] || '自定义'} · 每周${freq}次 · 每次${time}分钟</div>
      
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;margin-bottom:10px">
        <!-- 饼图 -->
        <div style="position:relative;width:120px;height:120px;flex-shrink:0">
          <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)">
            ${piePaths}
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
            <div style="font-size:9px;color:var(--text3)">点击</div>
            <div style="font-size:14px;font-weight:700;color:var(--text)">${categories.length}</div>
            <div style="font-size:8px;color:var(--text3)">类</div>
          </div>
        </div>
        
        <!-- 图例 -->
        <div style="flex:1;min-width:120px">
          <div style="font-size:10px;font-weight:600;margin-bottom:6px;color:var(--text2)">图例 · 点击查看详情</div>
          ${categories.map((cat, i) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer;padding:3px 5px;border-radius:4px;transition:background .2s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'" onclick="toggleCoachDrills(${i})">
              <span style="width:10px;height:10px;border-radius:2px;background:${cat.color};flex-shrink:0"></span>
              <span style="font-size:11px;color:var(--text);flex:1">${cat.name}</span>
              <span style="font-size:10px;color:var(--text3)">${cat.pct}%</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div id="coachDrillsDetail"></div>
      
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:10px;color:var(--text2)">${freqAdvice}</div>
      <div style="margin-top:4px;font-size:9px;color:var(--text3)">💡 每4周重新评估调整比例 · 遵循周期化训练原则</div>
    </div>`;
}

// 切换训练详情显示
function toggleCoachDrills(idx) {
  const el = document.getElementById('coachDrillsDetail');
  const cat = window._coachCategories?.[idx];
  if (!cat) return;
  
  // 如果当前显示的就是这个分类，则关闭
  if (el.dataset.currentIdx == idx && el.innerHTML) {
    el.innerHTML = '';
    el.dataset.currentIdx = '';
    return;
  }
  
  const drillsHtml = cat.drills.map(d => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px;border-left:3px solid ${cat.color}">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${d.name}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${d.sets}组 × ${d.reps} · ${d.freq}</div>
        ${d.rest ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">组间休息: ${d.rest}</div>` : ''}
      </div>
      <div style="font-size:16px">🏸</div>
    </div>`).join('');
  
  el.innerHTML = `
    <div style="background:var(--bg2);border-radius:10px;padding:12px;margin-top:10px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <span style="width:14px;height:14px;border-radius:4px;background:${cat.color};display:inline-block;vertical-align:middle;margin-right:6px"></span>
          <span style="font-size:14px;font-weight:700;color:var(--text)">${cat.name}</span>
          <span style="color:var(--text3);font-size:11px;margin-left:8px">${cat.pct}% · ${cat.timeAlloc}分钟/次</span>
        </div>
        <button onclick="this.closest('#coachDrillsDetail') ? this.closest('#coachDrillsDetail').innerHTML = '' : document.getElementById('coachDrillsDetail').innerHTML = ''" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:4px">✕</button>
      </div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:8px">针对性训练项目 · ${cat.drills.length}项</div>
      ${drillsHtml}
    </div>`;
  el.dataset.currentIdx = idx;
}

// 暴露到全局（兼容旧调用）
window.showCoachDrills = toggleCoachDrills;

// ========== 科学训练动作库（根据级别、频率、时长动态生成）==========

// 技术训练动作
function getTechniqueDrills(level, freq, time) {
  const drills = [];
  const timeForTech = Math.round(time * (55 - level * 5) / 100 * 0.01 * time);
  
  if (level <= 1) { // 零基础
    drills.push({ name: '握拍挥拍空击', sets: 3, reps: '20次', freq: '每次训练', rest: '30秒' });
    drills.push({ name: '基本站姿与步伐', sets: 2, reps: '15分钟', freq: '每次训练', rest: '1分钟' });
    drills.push({ name: '无球挥拍练习', sets: 4, reps: '30拍', freq: '3次/周', rest: '1分钟' });
    if (freq >= 3) drills.push({ name: '发球基础（正手）', sets: 2, reps: '50个', freq: '3次/周', rest: '2分钟' });
  } else if (level <= 3) { // 入门-熟练
    drills.push({ name: '高远球对练', sets: 4, reps: '20拍', freq: '3次/周', rest: '1分钟' });
    drills.push({ name: '网前小球练习', sets: 3, reps: '15分钟', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '吊球+上网', sets: 3, reps: '20组', freq: '2次/周', rest: '2分钟' });
    if (level >= 3) drills.push({ name: '杀球连贯', sets: 3, reps: '15拍', freq: '2次/周', rest: '2分钟' });
  } else { // 精进以上
    drills.push({ name: '实战对抗练习', sets: 4, reps: '21分', freq: '2次/周', rest: '5分钟' });
    drills.push({ name: '多球突击训练', sets: 4, reps: '30拍', freq: '2次/周', rest: '2分钟' });
    drills.push({ name: '假动作与变速', sets: 3, reps: '20分钟', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '战术组合演练', sets: 3, reps: '15组', freq: '1次/周', rest: '3分钟' });
  }
  return drills;
}

// 力量训练动作
function getStrengthDrills(level, freq, time) {
  const drills = [];
  const timeForStrength = Math.round(time * (12 + level * 3) / 100 * 0.01 * time);
  
  if (level <= 1) {
    drills.push({ name: '核心稳定性（平板支撑）', sets: 3, reps: '30秒', freq: '2次/周', rest: '45秒' });
    drills.push({ name: '徒手深蹲', sets: 3, reps: '15次', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '跳箱基础', sets: 3, reps: '10次', freq: '1次/周', rest: '2分钟' });
  } else if (level <= 3) {
    drills.push({ name: '负重深蹲', sets: 4, reps: '12次', freq: '2次/周', rest: '2分钟' });
    drills.push({ name: '核心旋转爆发力', sets: 3, reps: '20次', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '哑铃划船', sets: 3, reps: '12次', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '弹跳力训练', sets: 3, reps: '10次', freq: '1次/周', rest: '2分钟' });
  } else {
    drills.push({ name: '杠铃硬拉', sets: 4, reps: '10次', freq: '2次/周', rest: '3分钟' });
    drills.push({ name: '爆发力训练（药球）', sets: 4, reps: '12次', freq: '2次/周', rest: '2分钟' });
    drills.push({ name: '专项力量（挥重拍）', sets: 3, reps: '20次', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '单腿蹲跳', sets: 3, reps: '10次/腿', freq: '1次/周', rest: '2分钟' });
  }
  return drills;
}

// 体能训练动作
function getCardioDrills(level, freq, time) {
  const drills = [];
  
  if (level <= 1) {
    drills.push({ name: '间歇跑 200m×6', sets: 1, reps: '6组', freq: '2次/周', rest: '2分钟' });
    drills.push({ name: '跳绳基础', sets: 3, reps: '3分钟', freq: '3次/周', rest: '1分钟' });
  } else if (level <= 3) {
    drills.push({ name: '间歇跑 400m×6', sets: 1, reps: '6组', freq: '2次/周', rest: '3分钟' });
    drills.push({ name: '跳绳双飞', sets: 4, reps: '100次', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '折返跑×10', sets: 3, reps: '10次', freq: '1次/周', rest: '2分钟' });
  } else {
    drills.push({ name: 'YOYO体测模拟', sets: 2, reps: '20分钟', freq: '2次/周', rest: '5分钟' });
    drills.push({ name: '冲刺×20m往返', sets: 4, reps: '10组', freq: '2次/周', rest: '1分钟' });
    drills.push({ name: '跳绳速度耐力', sets: 5, reps: '2分钟', freq: '2次/周', rest: '2分钟' });
    drills.push({ name: '专项步伐体能', sets: 3, reps: '6点×5轮', freq: '1次/周', rest: '3分钟' });
  }
  return drills;
}

// 恢复放松动作
function getRecoveryDrills(level, freq) {
  const drills = [];
  drills.push({ name: '全身静态拉伸', sets: 1, reps: '15分钟', freq: '每次训练后' });
  drills.push({ name: '泡沫轴放松', sets: 1, reps: '10分钟', freq: '每次训练后' });
  if (freq >= 4) {
    drills.push({ name: '主动恢复（游泳/骑车）', sets: 1, reps: '30分钟', freq: '1次/周' });
  }
  drills.push({ name: '睡眠质量优化', sets: 1, reps: '建议7-8小时', freq: '每天' });
  return drills;
}

// 频率建议
function getFrequencyAdvice(freq, level) {
  if (freq <= 2) return '低频率训练建议：集中技术专项训练，每次90分钟，以技术为主，避免过度消耗。力量和体能可安排在技术训练后的20分钟内。';
  if (freq <= 3) return '标准频率训练建议：技术+体能交替进行。力量训练每周2次，安排在非技术日。注意训练后的拉伸恢复。';
  if (freq <= 5) return '高频率训练建议：采用分化训练（技术日/力量日/体能日交替）。每4周安排一周减量恢复，防止过度训练。';
  return '超高频率训练建议：需要科学周期化安排。建议采用力量→技术→体能→恢复的循环。注意监测疲劳指标，每4周必须减量一周。';
}

// ═══════════════════════════════════════════════════════════════════
//  🎯 教练交互式工具（全可点击选择 → 输出方案）
// ═══════════════════════════════════════════════════════════════════

// ─── 训练方案向导（多步点击式） ──────────
function openCoachWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🎯 训练方案向导</h1>
    <div class="vm">三步选择 → 自动生成完整周期训练方案</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div id="qwStep1" class="qw-step">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ①：选择训练目标</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
          <button onclick="qwSetGoal(0)" class="qw-btn">🏋️ 增肌塑形</button>
          <button onclick="qwSetGoal(1)" class="qw-btn">⚡ 爆发力提升</button>
          <button onclick="qwSetGoal(2)" class="qw-btn">🏃 耐力提升</button>
          <button onclick="qwSetGoal(3)" class="qw-btn">🤸 综合体能</button>
          <button onclick="qwSetGoal(4)" class="qw-btn">🏸 羽毛球专项</button>
          <button onclick="qwSetGoal(5)" class="qw-btn">🔄 伤病后恢复</button>
        </div>
      </div>

      <div id="qwStep2" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ②：选择当前级别</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">
          <button onclick="qwSetLevel(0)" class="qw-btn qw-sm">🟢 L0-L1 零基础</button>
          <button onclick="qwSetLevel(1)" class="qw-btn qw-sm">🟡 L2-L3 入门</button>
          <button onclick="qwSetLevel(2)" class="qw-btn qw-sm">🟠 L4-L5 进阶</button>
          <button onclick="qwSetLevel(3)" class="qw-btn qw-sm">🔴 L6-L7 专业</button>
        </div>
      </div>

      <div id="qwStep3" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ③：选择每周训练频率</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:500px">
          <button onclick="qwSetFreq(2)" class="qw-btn">2次</button>
          <button onclick="qwSetFreq(3)" class="qw-btn">3次</button>
          <button onclick="qwSetFreq(4)" class="qw-btn">4次</button>
          <button onclick="qwSetFreq(5)" class="qw-btn">5次</button>
          <button onclick="qwSetFreq(6)" class="qw-btn">6次</button>
        </div>
      </div>

      <div id="qwResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

// Wizard state
let QW = { goal: -1, level: -1, freq: 3 };

function qwSetGoal(g) { QW.goal = g; document.getElementById('qwStep1').style.display='none'; document.getElementById('qwStep2').style.display='block'; }
function qwSetLevel(l) { QW.level = l; document.getElementById('qwStep2').style.display='none'; document.getElementById('qwStep3').style.display='block'; }

const GOALS = ['增肌塑形','爆发力提升','耐力提升','综合体能','羽毛球专项','伤病后恢复'];
const QW_LEVELS = ['L0-L1 零基础','L2-L3 入门','L4-L5 进阶','L6-L7 专业'];

function qwSetFreq(f) {
  QW.freq = f;
  document.getElementById('qwStep3').style.display='none';
  const g = GOALS[QW.goal], l = LEVELS[QW.level];
  // Generate plan based on selections
  const plans = [
    /* 增肌 */   ['3组×8-12次 力量','2组×15-20次 耐力','渐进超载+隔天练','RPE6-8'],
    /* 爆发力 */ ['5组×3-5次 爆发','2组×10次 辅助','Olympic lift+跳箱','RPE7-9'],
    /* 耐力 */   ['3-4组×20+次','动作循环训练','间歇训练每周3次','RPE5-7'],
    /* 综合 */   ['2组各×12次','力量+有氧混合','每周编排不同','RPE6-8'],
    /* 羽毛球 */ ['步法+多球+体能','技术60%+体能40%','每周3-5练','RPE5-8'],
    /* 恢复 */   ['低强度+纠正','激活+拉伸','监控RPE不过6','RPE3-5'],
  ];
  const p = plans[QW.goal] || plans[0];
  
  let planHtml = `<div style="background:var(--surface);border:1px solid var(--blue);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px">
    <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--purple)">🎯 ${g} · ${l} · 每周${f}次</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">基于NSCA-CPT周期训练理论 · 教练参考方案</div>`;
  
  // Training week structure
  planHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">核心训练</div>
        <div style="font-size:12px;line-height:1.8">${p[0]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">辅助训练</div>
        <div style="font-size:12px;line-height:1.8">${p[1]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">编排建议</div>
        <div style="font-size:12px;line-height:1.8">${p[2]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">强度监控</div>
        <div style="font-size:12px;line-height:1.8">${p[3]}</div>
      </div>
    </div>`;
  
  // Weekly schedule
  const days = ['周一','周二','周三','周四','周五','周六','周日'];
  const types = ['力量','有氧','休息','技术','体能','比赛模拟','恢复'];
  if (g === '羽毛球专项') types[0]='技术训练'; types[2]='积极性恢复';
  planHtml += `<div style="margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">📅 本周安排</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
  for (let d = 0; d < 7; d++) {
    const active = d < f;
    const type = active ? types[d % types.length] : '休息';
    const isRest = type === '休息' || type === '恢复';
    planHtml += `<div style="background:${isRest||!active?'var(--surface3)':'var(--blue)'}15;border-radius:var(--radius-sm);padding:8px;text-align:center">
      <div style="font-size:9px;color:var(--text3)">${days[d]}</div>
      <div style="font-size:10px;font-weight:600;color:${isRest||!active?'var(--text3)':'var(--blue)'};margin-top:2px">${isRest?'—':type}</div>
    </div>`;
  }
  planHtml += `</div></div>`;
  
  // Nutrition tip based on goal
  const nutrition = [
    /* 增肌 */   '高蛋白（1.6-2.2g/kg）+ 热量盈余300-500kcal · 训练前后补充快慢蛋白',
    /* 爆发力 */ '肌酸5g/天 + 碳水足量 · 训练前2h高碳低脂',
    /* 耐力 */   '碳水负载 + 充足电解质 · 训练中补充运动饮料',
    /* 综合 */   '均衡膳食 50%碳水30%蛋白20%脂肪',
    /* 羽毛球 */ '中等碳水 + 充分补水 · 赛前3h进食',
    /* 恢复 */   '抗炎饮食 + Omega-3 · 充足蛋白质修复',
  ];
  planHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:12px">
    <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--green)">🍎 饮食建议</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.6">${nutrition[QW.goal]}</div>
  </div>`;
  
  // Case study / note for coaches
  planHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:8px">
    <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--orange)">📋 教练备注</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.6">
      <strong>案例：</strong>${g}项目水平${l}的训练者——<br>
      • 前2周重点建立动作模式，不加负荷<br>
      • 第3-4周渐进加载，每两周调整一次<br>
      • 第4周后安排减量周，防止累积疲劳<br>
      • 每月评估一次，根据进展调整下月计划
    </div>
  </div>`;
  
  planHtml += `</div>`;
  
  document.getElementById('qwResult').innerHTML = planHtml + `
    <div style="text-align:center;margin-top:12px">
      <button onclick="openCoachWizard()" class="tb-btn" style="background:var(--blue);color:#fff;border:none;padding:8px 20px">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回教练系统</button>
    </div>`;
  document.getElementById('qwResult').style.display='block';
  document.getElementById('qwResult').scrollIntoView({behavior:'smooth'});
}

// ─── 饮食方案向导 ──────────────────────────
function openDietWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🍎 饮食方案向导</h1>
    <div class="vm">点击选择 → 生成个性化饮食建议</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div id="dwStep1" class="qw-step">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--green)">步骤 ①：你的身体类型</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:450px">
          <button onclick="dwNext(0)" class="qw-btn">🏋️ 肌肉型</button>
          <button onclick="dwNext(1)" class="qw-btn">🧘 匀称型</button>
          <button onclick="dwNext(2)" class="qw-btn">🦵 纤细型</button>
        </div>
      </div>
      <div id="dwStep2" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--green)">步骤 ②：你的目标</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:450px">
          <button onclick="dwSetGoal(0)" class="qw-btn">💪 增肌</button>
          <button onclick="dwSetGoal(1)" class="qw-btn">🔥 减脂</button>
          <button onclick="dwSetGoal(2)" class="qw-btn">⚖️ 维持</button>
        </div>
      </div>
      <div id="dwResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

let DW = { body: -1, goal: -1 };
const BODY_TYPES = ['肌肉型','匀称型','纤细型'];
const DIET_GOALS = ['增肌','减脂','维持'];

function dwNext(b) { DW.body = b; document.getElementById('dwStep1').style.display='none'; document.getElementById('dwStep2').style.display='block'; }
function dwSetGoal(g) {
  DW.goal = g;
  document.getElementById('dwStep2').style.display='none';
  
  const plans = [
    // 增肌 per body type
    [
      '热量盈余350-500kcal · 蛋白质2.0g/kg · 碳水量4-6g/kg<br>• 加餐：训练前香蕉+花生酱，训练后蛋白粉+燕麦<br>• 推荐：鸡胸肉、鸡蛋、牛肉、糙米、红薯、牛油果',
      '热量盈余250-350kcal · 蛋白质1.8g/kg · 碳水3-5g/kg<br>• 注意：你容易长脂肪，蛋白质要均匀分配每餐<br>• 推荐：三文鱼、鸡腿肉、藜麦、豆类、坚果',
      '热量盈余200-300kcal · 蛋白质2.0g/kg · 碳水量5-6g/kg<br>• 加餐频率要高：一日5-6餐<br>• 推荐：瘦牛羊肉、全蛋、全麦、土豆、奶制品',
    ],
    // 减脂 per body type
    [
      '热量缺口300-500kcal · 蛋白质2.2-2.6g/kg · 低碳<br>• 注意降低碳水但不降蛋白<br>• 推荐：鸡胸、蛋白、绿叶菜、鱼、花椰菜',
      '热量缺口300-400kcal · 蛋白质2.0g/kg · 碳水2-4g/kg<br>• 均衡缺脂，避免肌肉流失<br>• 推荐：瘦牛肉、鱼肉、燕麦、西兰花、蓝莓',
      '热量缺口200-300kcal · 蛋白质2.2g/kg · 碳水3-4g/kg<br>• 你最需要保留肌肉量<br>• 推荐：红瘦肉、鸡蛋、藜麦、南瓜、菠菜',
    ],
    // 维持 per body type
    [
      'TDEE±100kcal · 蛋白质1.6-1.8g/kg<br>• 保持现有饮食，重点监控体重<br>• 推荐：多样化饮食，注意蔬果摄入',
      'TDEE水平 · 蛋白质1.6g/kg · 均衡三大营养素<br>• 周中一次自由餐<br>• 推荐：地中海饮食模式',
      'TDEE+100-150kcal · 蛋白质1.8g/kg · 碳水足量<br>• 你代谢高，要多吃才能维持体重<br>• 推荐：全谷物、蛋白质、优质脂肪',
    ],
  ];
  
  const plan = plans[DW.goal][DW.body];
  const body = BODY_TYPES[DW.body];
  const goal = DIET_GOALS[DW.goal];
  const calTip = ['增肌期间推荐每3周调整热量','减脂期间关注体脂率而非体重变化','维持期每月做一次饮食回顾'][DW.goal];
  
  document.getElementById('dwResult').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--green);border-radius:var(--radius-lg);padding:20px">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--green)">🍎 ${body} · ${goal}饮食方案</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">基于NSCA-CPT营养学 + 运动营养指南</div>
      <div style="font-size:12px;line-height:2;color:var(--text)">${plan}</div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text2)">💡 教练提示</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">${calTip}</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-top:8px">
        <div style="font-size:11px;font-weight:600;color:var(--orange)">📋 案例参考</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.6">
          <strong>案例</strong> — ${body}运动员，目标${goal}：<br>
          • 前2周先调整饮食模式，不急减/增热量<br>
          • 第3周开始按计划执行，同时监控训练表现<br>
          • 每2周称重+围度（不要每天称）<br>
          • 4周后评估效果，如有必要调整10%热量<br>
          • ⚠️ 减脂期如果训练表现下降，适当增加碳水
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px">
      <button onclick="openDietWizard()" class="tb-btn" style="background:var(--green);color:#fff;border:none;padding:8px 20px">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回教练系统</button>
    </div>`;
  document.getElementById('dwResult').style.display='block';
  document.getElementById('dwResult').scrollIntoView({behavior:'smooth'});
}

// ─── 症状分析与解决方案 ────────────────────
function openSymptomWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🔍 症状分析 + 解决方案</h1>
    <div class="vm">点击症状 → 获取分析和教练策略</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--red)">选择常见问题 / 症状</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px">
        <button onclick="showSymptomSolution(0)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🏃 膝盖前方疼痛</button>
        <button onclick="showSymptomSolution(1)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🤲 肩部弹响/疼痛</button>
        <button onclick="showSymptomSolution(2)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🦶 脚踝扭伤恢复慢</button>
        <button onclick="showSymptomSolution(3)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">💪 下背酸痛/紧张</button>
        <button onclick="showSymptomSolution(4)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🖐️ 手腕痛（高球/扣杀）</button>
        <button onclick="showSymptomSolution(5)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🏃 跟腱炎/足跟痛</button>
        <button onclick="showSymptomSolution(6)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">👋 网球肘/肱骨外上髁炎</button>
        <button onclick="showSymptomSolution(7)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🦵 腿后侧拉伤</button>
      </div>
      <div id="symptomResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

const SYMPTOMS = [
  { name:'膝盖前方疼痛', cause:'股四头肌紧张+髌腱压力过大，常见于频繁弓箭步/蹲跳训练',
    solution:'① 泡沫轴放松股四头肌+髂胫束 ② 强化臀部（单腿臀桥）③ 减少跳跃类训练2周 ④ 冰敷运动后10分钟',
    coachNote:'案例：15岁男选手起跳扣杀落地屈膝不足，前两周休息做等长训练，第三周恢复50%量，一个月后完全恢复' },
  { name:'肩部弹响/疼痛', cause:'肩袖肌群疲劳+肱骨头前移，常见于过头类动作过多',
    solution:'① 每天做肩袖外旋+YTWL激活 ② 训练前用弹力带做肩部热身 ③ 暂停过头举重/频繁杀球 ④ 避免内旋超过生理范围',
    coachNote:'案例：运动员抱怨杀球时肩痛，检查发现肩袖外旋不足+胸大肌紧张。2周矫正训练（拉伸胸大肌+强化下斜方肌+外旋肌群训练），症状完全消失。' },
  { name:'脚踝扭伤恢复慢', cause:'距腓前韧带损伤+本体感觉下降+腓骨肌群弱化',
    solution:'① RICE原则前48小时 ② 72小时后无负重关节活动 ③ 第5天平衡板训练 ④ 弹力带抗阻外翻训练',
    coachNote:'案例：运动员脚踝反复扭伤5次，强制休息12周+本体感觉训练+跟腱钉，之后2年未再扭伤。' },
  { name:'下背酸痛/紧张', cause:'久坐+髋屈肌紧张+核心弱+腰椎代偿',
    solution:'① 每天猫牛式+儿童式放松 ② 平板支撑+死虫式 ③ 臀桥激活 ④ 暂停直腿硬拉',
    coachNote:'案例：35岁业余选手下背痛2周，专注核心+臀肌+髋灵活性训练2周，症状消失。' },
  { name:'手腕痛（高球/扣杀）', cause:'腕伸肌腱过度使用+握拍过紧+球拍扭力大',
    solution:'① 暂停发力动作 ② 握力球热身+伸腕屈腕 ③ 换轻拍 ④ 握拍60%力度',
    coachNote:'案例：杀球150个/天改80个+增加手腕热身+放松握拍，1周后好转。' },
  { name:'跟腱炎/足跟痛', cause:'跑跳过密+小腿柔韧不足+落地冲击大',
    solution:'① 跟腱离心训练（台阶边缘慢放）3组×15次 ② 停跳1周 ③ 冰敷 ④ 支撑鞋',
    coachNote:'案例：跟腱离心训练+停跳+减量50%→一个月完全无症状。' },
  { name:'网球肘/肱骨外上髁炎', cause:'腕伸肌群起点慢性炎症+反手动作过多',
    solution:'① 暂停发力10-14天 ② 伸腕离心训练 ③ 冰敷3次/天 ④ 护肘',
    coachNote:'案例：改为转体代替小臂发力+离心训练2周→逐步恢复4周→无痛训练。' },
  { name:'腿后侧拉伤', cause:'腘绳肌柔韧不足+股四腘绳不平衡+疲劳',
    solution:'① RICE 48h ② 72h无痛活动 ③ 等长收缩 ④ 北欧腘绳肌训练',
    coachNote:'案例：恢复6周+每周2次北欧腘绳肌训练→半年未复发。' },
];

function showSymptomSolution(idx) {
  const s = SYMPTOMS[idx];
  if (!s) return;
  document.getElementById('symptomResult').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--red);border-radius:var(--radius-lg);padding:20px;margin-top:8px">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--red)">🔍 ${s.name}</div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:2px">📌 原因</div>
        <div style="font-size:12px;color:var(--text);line-height:1.6">${s.cause}</div>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--green)">✅ 解决方案</div>
        <div style="font-size:12px;color:var(--text);line-height:1.8">${s.solution}</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:11px;font-weight:600;color:var(--orange)">📋 教练案例</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">${s.coachNote}</div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px">
      <button onclick="openSymptomWizard()" class="tb-btn" style="background:var(--red);color:#fff;border:none">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回</button>
    </div>`;
  document.getElementById('symptomResult').style.display='block';
  document.getElementById('symptomResult').scrollIntoView({behavior:'smooth'});
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
  historyPush('book', {bookId: bid});
  const p = chProgress(bid);
  const readCount = Math.round(p * book.chapters.length);

  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
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
  // 记录来源（如果栈顶没有重复 book 条目）
  const top = navStack.length > 0 ? navStack[navStack.length-1] : null;
  if (!top || top.view !== 'book') {
    if (!top || top.view !== 'module') {
      navStack.push({view:'book', bookId:currentBookId});
    }
  }
  // v3.14.5 阅读时长追踪：离开/切换前一节时，先把上一节已驻留秒数累加进 RP（避免重入清零）
  _flushReadSeconds();
  // v3.14.6 测验连击：切章时把本节最佳连击刷回 RP，避免下一节从旧 best 开始
  _flushQuizStreak();
  currentChapterIdx = idx;
  showView('reader');
  renderChapter();
  historyPush('reader', {bookId: currentBookId, chapterIdx: idx});
  // v3.21.5 推送"多本书最近阅读"历史（首页继续阅读入口用），同书只挪位置不重复占位
  _pushReadHistory(currentBookId, idx);
  // v3.14.5 阅读时长：进入章节时打点（用作当前章节驻留秒数的基准）
  readStartTs = Date.now();
  lastTickTs = Date.now();
  // 2026-08-02 新增：进入章节时初始化本周目标条基准
  _weekBucketBase = 0;
  _renderReadGoalBar();
}

async function renderChapter() {
  const book = MANIFEST?.books.find(b=>b.id===currentBookId);
  if (!book || !book.chapters[currentChapterIdx]) return;
  const ch = book.chapters[currentChapterIdx];

  $('readerTitle').textContent = `📖 ${String(currentChapterIdx+1).padStart(2,'0')}/${book.chapters.length} · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx+1}/${book.chapters.length}`;
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
  // v3.21.8 顶部分页按钮预览：左侧/右侧揭示下一节标题，让「按 → 之前先知道去哪」
  // 与底部 next-ch-cta 风格一致；标题过长时 CSS 截断；最后/最前一节显示「已是最末/首节」
  const _prevCh = currentChapterIdx > 0 ? book.chapters[currentChapterIdx - 1] : null;
  const _nextCh = currentChapterIdx < book.chapters.length - 1 ? book.chapters[currentChapterIdx + 1] : null;
  const _prevLabel = _prevCh
    ? `◀ ${escapeHTML(_prevCh.title || '')}`
    : `◀ 已是首节`;
  const _nextLabel = _nextCh
    ? `${escapeHTML(_nextCh.title || '')} ▶`
    : `已是末节 ▶`;
  // v3.21.9 顶部分页进度条：中间塞「23/41 · ▓▓▓░░░ 56%」迷你进度条，让读者一眼看到「已读到哪里、还剩多少」
  // 用 RP 推断整本书已读章节数（避免重新解析整本书只为了一个整数）；无数据时回退为单章节计数
  const _total = book.chapters.length;
  const _cur = currentChapterIdx + 1;
  let _readSoFar = 0;
  try { const _p = getP(); const _list = _p[currentBookId] || []; _readSoFar = book.chapters.filter(c => _list.includes(c.file)).length; } catch (_) {}
  const _pct = Math.round((_readSoFar / Math.max(1, _total)) * 100);
  const _barWidth = 14; // 14 格迷你条
  const _filled = Math.round((_readSoFar / Math.max(1, _total)) * _barWidth);
  const _miniBar = '▓'.repeat(_filled) + '░'.repeat(_barWidth - _filled);
  const _progressHtml = `<div class="reader-nav-progress" aria-label="书籍进度 ${_readSoFar}/${_total} 章 · ${_pct}%">`
    + `<span class="rnp-pos">${_cur}/${_total}</span>`
    + `<span class="rnp-bar" title="已读 ${_readSoFar}/${_total} · ${_pct}%">${_miniBar}</span>`
    + `<span class="rnp-pct">${_pct}%</span>`
    + `</div>`;
  $('readerNav').innerHTML = `
    <button class="tb-btn nav-preview ${_prevCh ? '' : 'nav-stub'}" onclick="prevChapter()" ${currentChapterIdx<=0?'disabled':''}
            title="${_prevCh ? escapeAttr(_prevCh.title || '') : '已是首节 · 没有上一节'}">${_prevLabel}</button>
    ${_progressHtml}
    <button class="tb-btn" onclick="openFullQuiz()">🧪 测验</button>
    <button class="tb-btn nav-preview ${_nextCh ? '' : 'nav-stub'}" onclick="nextChapter()" ${currentChapterIdx>=book.chapters.length-1?'disabled':''}
            title="${_nextCh ? escapeAttr(_nextCh.title || '') : '已是末节 · 没有下一节'}">${_nextLabel}</button>`;
  buildToc(ch);

  // v3.21.5 章节切换 fade 过渡：先加一个 0.15s 淡出（用户先看到「接住了」），加载完后在渲染末尾 fade-in
  const _article = $('article');
  _article.classList.add('article-fade-out');
  _article.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载…</div>';
  // 0.15s 后切到加载占位（vs 跨网络延迟里的空白，看起来"在响应"）
  await new Promise(r => setTimeout(r, 150));
  _article.classList.remove('article-fade-out');
  _article.classList.add('article-fade-in');
  let md = null;
  const localUrl = `books/${currentBookId}/${ch.file}`;
  // 8秒超时兜底，防止 fetch 卡死
  const fetchWithTimeout = (url, ms=8000) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      fetch(url).then(r => { clearTimeout(timer); resolve(r); }).catch(() => { clearTimeout(timer); resolve(null); });
    });
  };
  try {
    const r1 = await fetchWithTimeout(localUrl);
    if (r1 && r1.ok) md = await r1.text();
  } catch(e) {}
  if (!md) {
    try {
      const r2 = await fetchWithTimeout(`${RAW}/books/${currentBookId}/${ch.file}`);
      if (r2 && r2.ok) md = await r2.text();
    } catch(e2) {}
  }
  if (md) {
    // 文章末尾「下一节」CTA：把"读完→下一章"路径从"滚顶→点按钮"压成"滚底→点按钮"
    // 与首页完成态「重读最后一节」对称；最后一节显示「结业庆贺 + 下一本」闭环 CTA
    const _isLast = currentChapterIdx >= book.chapters.length - 1;
    const _nextCh = _isLast ? null : book.chapters[currentChapterIdx + 1];
    const _nextCta = (!_isLast && _nextCh) ? `
      <div class="next-ch-cta" onclick="nextChapter()" role="button" tabindex="0"
           aria-label="进入下一节 ${escapeAttr(_nextCh.title || '')}"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();nextChapter();}">
        <div class="nc-label">下一节 · 第 ${currentChapterIdx + 2} 节</div>
        <div class="nc-title">${escapeHTML(_nextCh.title || '')}</div>
        <div class="nc-arrow">▶ 继续阅读</div>
      </div>` : '';
    // 最后一节：结业 CTA —— 庆祝掌握 + 智能推荐下一本（看其它书的首个未读章节；无则回首页）
    let _finishCta = '';
    if (_isLast) {
      // 找下一本：当前书之外，找"未读章节最多"的那本；都没有就回首页
      let nextBookHtml = '';
      try {
        const _p = getP();
        const _candidates = (MANIFEST?.books || [])
          .filter(b => b.id !== currentBookId)
          .map(b => {
            const readList = _p[b.id] || [];
            const unread = b.chapters.filter(c => !readList.includes(c.file)).length;
            return { b, unread, total: b.chapters.length };
          })
          .filter(x => x.unread > 0)
          .sort((a, b) => (b.unread / b.total) - (a.unread / a.total));
        const _next = _candidates[0]?.b;
        if (_next) {
          const _firstUnread = (() => {
            const readList = _p[_next.id] || [];
            const idx = _next.chapters.findIndex(c => !readList.includes(c.file));
            return idx >= 0 ? idx : 0;
          })();
          nextBookHtml = `
            <button class="finish-next-btn" onclick="goToBook('${_next.id}');setTimeout(()=>openChapter(${_firstUnread}),200)"
                    aria-label="下一本：《${escapeAttr(_next.title)}》第 ${_firstUnread + 1} 节">
              <span class="fn-label">📚 下一本推荐</span>
              <span class="fn-title">${escapeHTML(_next.title || _next.id)}</span>
              <span class="fn-sub">从第 ${_firstUnread + 1} 节继续 · 还有 ${_candidates[0].unread} 节未读</span>
              <span class="fn-arrow">开始阅读 →</span>
            </button>`;
        }
      } catch (_) { /* 推荐失败时只显示庆祝区 */ }
      _finishCta = `
        <div class="finish-cta" role="region" aria-label="本书读完">
          <div class="finish-icon">🎉</div>
          <div class="finish-title">《${escapeHTML(book.title || currentBookId)}》通关！</div>
          <div class="finish-sub">${book.chapters.length} 节全部读完 · 知识内化需要复盘，欢迎 7 天后回看</div>
          <div class="finish-actions">
            <button class="finish-btn finish-btn-home" onclick="goHome()" aria-label="返回首页">🏠 返回首页</button>
            <button class="finish-btn finish-btn-chapters" onclick="goToBook('${currentBookId}')" aria-label="回到本书目录">📑 本书目录</button>
          </div>
          ${nextBookHtml}
        </div>`;
    }
    $('article').innerHTML = mdParse(md)
      + _nextCta
      + _finishCta
      + `<hr style="margin-top:60px;opacity:0.3"><div style="text-align:center;font-size:11px;color:var(--text3);padding:20px 0 10px;border-top:1px solid var(--border);margin-top:30px">📚 知识书塔 · ${APP_VERSION} &nbsp;|&nbsp; ${APP_DATE} &nbsp;|&nbsp; 🐏 by Lamb</div>`;
    makeCollapsible(); setupQuiz(ch); markStreak();
    // v3.18.9 TOC 观察器：文章 DOM 已挂载，挂 IntersectionObserver 监听所有 H2
    requestAnimationFrame(_setupTocObserver);
    // 自动标记已读：用户实际看到正文即视为完成（markRead 内部已对已读章节短路，不会重复加 XP/弹成就）
    const _isNewRead = markRead(currentBookId, ch.file);
    if (_isNewRead) {
      // v3.14.5 阅读时长：带出本章驻留分钟数，让用户「看到」自己真读了多久
      _tickReadSeconds();
      const mins = readSecThisChapter >= 30 ? `${Math.max(1, Math.round(readSecThisChapter / 60))} 分钟` : `${readSecThisChapter}s`;
      // 首次读完本节：轻 toast + 顶栏位置微脉冲，让用户「看到」系统收到了
      showToast(`✅ 读了 ${mins} · 《${book.title || currentBookId}》第 ${currentChapterIdx+1} 节 完成 · +XP 10`, 2800);
      const pos = document.getElementById('chapterPos');
      if (pos) {
        pos.classList.remove('pulse-read'); // 重置可重启动画
        // 强制 reflow，确保 class 重新挂载时浏览器重新跑一次动画
        void pos.offsetWidth;
        pos.classList.add('pulse-read');
        setTimeout(() => pos.classList.remove('pulse-read'), 1400);
      }
    }
    // 搜索跳转：定位到匹配行并高亮关键词
    if (pendingSearchJump && pendingSearchJump.bookId === currentBookId && pendingSearchJump.file === ch.file) {
      applySearchJump();
    }
  } else {
    $('article').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">❌ 加载失败</div>`;
  }
  // v3.22.3 阅读位置记忆：进入新章节后，让 _restoreScrollPos() 用新章节 key 去 localStorage 取 saved
  // 并滚回上次位置 — 不再「先 clear 再 restore」（那个调用顺序 bug 在 _scrollPosKey() 已切到新章节的前提下
  // 会把要恢复的 saved 提前删掉，导致 _restoreScrollPos 永远拿到 undefined 直接 return，
  // 结果用户阅读长文章后切走/重进都被静默擦回顶部，看起来像「页面被强制刷新」）
  $('content').scrollTo({top:0,behavior:'smooth'});
  updateProgress();
  // v3.18.5 阅读位置记忆：若该章节有上次保存的中间位置，layout 完成后自动滚回并提示
  // 但搜索跳转场景下必须跳过 — applySearchJump 已经把页面滚到匹配位置，
  // 否则会被 saved position 拉回去，导致用户落在「离匹配很远的地方」+ 看到矛盾的「已回到上次位置」toast
  if (!_searchMatches.length) {
    _restoreScrollPos();
  }
}

function buildToc(ch) {
  const list = $('tocList');
  const h2s = ch.h2s || [];
  if (!h2s.length) { list.innerHTML = '<div style="font-size:10px;color:var(--text3)">无子章节</div>'; return; }
  list.innerHTML = h2s.map((h,i)=>{
    // 序号补 0：让长章节的子目录条目一眼可数（02/12 比 2/12 在密集列表里更易扫）
    const num = String(i + 1).padStart(2, '0');
    return `<div class="toc-item toc-h2" data-toc-idx="${i}" onclick="scrollToToc(${i})"><span class="toc-num">${num}</span><span class="toc-text">${escapeHTML(h.title)}</span></div>`;
  }).join('');
  // 渲染完后立即按当前滚动位置点亮对应条目（用户从外部跳进章节时也能命中）
  requestAnimationFrame(updateTocActive);
}
function scrollToToc(idx) {
  const h=$$('article h2');
  if (h[idx]) {
    h[idx].scrollIntoView({behavior:'smooth',block:'start'});
    _tocActiveIdx = idx; // 立即同步，避免 IO 异步回调到来前用户已切到下一节
  }
  closeMobileToc();
}
// 阅读滚动时联动侧边目录：用 IntersectionObserver 找出当前可见的第一条 h2，高亮对应 TOC 条目
// 滚动节流由 IO 自带（不重复 fire），比 scroll 事件 + 计算距离更准也更省
let _tocIO = null;
let _tocScrollPending = false;
// 记录当前高亮的 H2 序号：reader 内键盘 J/K 跳转、急切 scrollToToc 后兜底同步都依赖它
let _tocActiveIdx = 0;
// scroll 节流：rAF 合并多次滚动事件，避免长章节快速滚动时反复重算
function _tocScrollTick() {
  if (_tocScrollPending) return;
  _tocScrollPending = true;
  requestAnimationFrame(() => {
    _tocScrollPending = false;
    updateTocActive();
  });
}

// 初始化 TOC 的 IntersectionObserver：监听所有 article h2，自动同步高亮
// 比 onscroll + getBoundingClientRect 更省：浏览器只在 ref/raf 合并后回调一次
function _setupTocObserver() {
  if (_tocIO) { try { _tocIO.disconnect(); } catch(_){} _tocIO = null; }
  // 已渲染过的 H2 不存在就别建 observer（用户打开了无 H2 的章节）
  const h2s = $$('article h2');
  if (!h2s.length) return;
  _tocIO = new IntersectionObserver((entries) => {
    // 同一帧内多次回调取「最靠顶部且仍在视口内」的 H2 作为当前
    let best = null;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (!best || e.boundingClientRect.top < best.boundingClientRect.top) best = e;
    }
    if (!best) return;
    // h2s 是 NodeList，没有 indexOf 方法；用 Array.prototype.indexOf.call 跨上下文查节点位置
    // v3.22.4 修复「h2s.indexOf is not a function」— NodeList 不支持 indexOf，需走原型链
    const idx = Array.prototype.indexOf.call(h2s, best.target);
    if (idx >= 0) {
      _tocActiveIdx = idx;
      _highlightTocByIdx(idx);
    }
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
  h2s.forEach(h => _tocIO.observe(h));
  // 初始兜底：刚进入章节时按当前滚动位置立刻点亮，否则用户切到页面啥都没高亮
  requestAnimationFrame(updateTocActive);
}

// 纯高亮切换（与 _setupTocObserver 解耦），给键盘快捷键和点击 scrollToToc 复用
function _highlightTocByIdx(idx) {
  const list = $('tocList');
  if (!list) return;
  const items = list.querySelectorAll('.toc-item');
  if (!items.length) return;
  items.forEach((el, i) => el.classList.toggle('toc-active', i === idx));
  // 让活动条目滚到 TOC 列表可见区（仅当被遮挡时），长章节翻到后面再回来很有用
  const activeEl = items[idx];
  if (activeEl) {
    const tocBox = list.parentElement?.getBoundingClientRect();
    if (tocBox) {
      const elTop = activeEl.offsetTop;
      const elBottom = elTop + activeEl.offsetHeight;
      const visTop = list.scrollTop;
      const visBottom = visTop + tocBox.height;
      if (elTop < visTop || elBottom > visBottom) {
        list.scrollTo({ top: elTop - 8, behavior: 'smooth' });
      }
    }
  }
}

// 键盘 J/K 跳到上一/下一节 H2：让桌面用户在长章节里不必滚轮就能一段段跳
function gotoTocByOffset(delta) {
  const h2s = $$('article h2');
  if (!h2s.length) return;
  const next = Math.max(0, Math.min(h2s.length - 1, _tocActiveIdx + delta));
  if (next === _tocActiveIdx) {
    // 已到边界：给个微提示，让用户知道按了没反应是「已经到底/顶」不是没生效
    showToast(delta > 0 ? '⬇️ 已到本节末尾' : '⬆️ 已在当前章节首段', 1200);
    return;
  }
  scrollToToc(next);
}

function updateTocActive() {
  const list = $('tocList');
  if (!list) return;
  const h2s = $$('article h2');
  if (!h2s.length) return;
  // 顶部安全区：viewport 上 25% 处作为"当前阅读锚点"（避免被 sticky 顶栏盖住）
  const anchorY = window.innerHeight * 0.25;
  let activeIdx = 0;
  for (let i = 0; i < h2s.length; i++) {
    const r = h2s[i].getBoundingClientRect();
    if (r.top - anchorY <= 0) activeIdx = i;
    else break;
  }
  _tocActiveIdx = activeIdx;
  _highlightTocByIdx(activeIdx);
}
function toggleTocFn() {
  const toc = $('readerToc');
  const isMobile = window.innerWidth <= 480;
  if (isMobile) {
    const isOpen = toc.classList.toggle('mobile-drawer', true) && toc.classList.contains('mobile-drawer');
    // 抽屉模式：用 class 切换显示
    const opened = toc.classList.toggle('open');
    let bd = document.querySelector('.reader-toc.mobile-backdrop');
    if (opened) {
      if (!bd) {
        bd = document.createElement('div');
        bd.className = 'reader-toc mobile-backdrop';
        bd.addEventListener('click', closeMobileToc);
        document.body.appendChild(bd);
      }
      requestAnimationFrame(() => bd.classList.add('show'));
    } else {
      closeMobileToc();
    }
  } else {
    toc.style.display = toc.style.display === 'none' ? 'block' : 'none';
  }
}
function closeMobileToc() {
  const toc = $('readerToc');
  if (toc) toc.classList.remove('open');
  const bd = document.querySelector('.reader-toc.mobile-backdrop');
  if (bd) {
    bd.classList.remove('show');
    setTimeout(() => bd.remove(), 250);
  }
}
// v3.21.7 专注模式：localStorage 持久化 + 启动恢复 + Toast 反馈 + 按钮 active 态
function toggleFocus() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
  try { localStorage.setItem('bk_focus_mode', focusMode ? '1' : '0'); } catch (_) {}
  const btn = document.getElementById('focusModeBtn');
  if (btn) btn.classList.toggle('active', focusMode);
  showToast(focusMode ? '🧘 专注模式：已隐藏导航，边距舒展' : '🧘 专注模式：已关闭');
}
function initFocusMode() {
  let saved = false;
  try { saved = localStorage.getItem('bk_focus_mode') === '1'; } catch (_) {}
  if (saved) {
    focusMode = true;
    document.body.classList.add('focus-mode');
    const btn = document.getElementById('focusModeBtn');
    if (btn) btn.classList.add('active');
  }
}
const FONT_MIN = 12, FONT_MAX = 22, FONT_DEFAULT = 15;
function increaseFont() {
  if (fontBase < FONT_MAX) { fontBase++; applyFont(); showToast(`🔼 字号 ${fontBase}px`); }
  else showToast(`已达最大字号 ${FONT_MAX}px`);
  _updateFontBtnState();
}
function decreaseFont() {
  if (fontBase > FONT_MIN) { fontBase--; applyFont(); showToast(`🔽 字号 ${fontBase}px`); }
  else showToast(`已达最小字号 ${FONT_MIN}px`);
  _updateFontBtnState();
}
function resetFont() {
  if (fontBase === FONT_DEFAULT) { showToast(`已是默认字号 ${FONT_DEFAULT}px`); return; }
  fontBase = FONT_DEFAULT;
  applyFont();
  showToast(`🔄 字号已重置为默认 ${FONT_DEFAULT}px`);
  _updateFontBtnState();
}
function applyFont() {
  document.documentElement.style.setProperty('--font-base', fontBase+'px');
  localStorage.setItem('bk_font', fontBase);
  document.dispatchEvent(new CustomEvent('fontchange', { detail: { size: fontBase } }));
}
function _updateFontBtnState() {
  const min = document.getElementById('fontMinBtn');
  const max = document.getElementById('fontMaxBtn');
  const reset = document.getElementById('fontResetBtn');
  if (min) min.style.opacity = fontBase <= FONT_MIN ? '0.4' : '1';
  if (max) max.style.opacity = fontBase >= FONT_MAX ? '0.4' : '1';
  if (reset) reset.style.opacity = fontBase === FONT_DEFAULT ? '0.4' : '1';
}
function toggleTheme() { 
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bk_theme', next);
  document.getElementById('themeBtn').textContent = next === 'dark' ? '☀️' : '🌓';
}
// 羽毛球拍光标切换 (2026-07-18)
function toggleBadmintonCursor() {
  const body = document.body;
  const enabled = body.classList.toggle('badminton-cursor');
  localStorage.setItem('bk_badminton_cursor', enabled);
  return enabled;
}
function initBadmintonCursor() {
  const enabled = localStorage.getItem('bk_badminton_cursor') === 'true';
  if (enabled) {
    document.body.classList.add('badminton-cursor');
    initHitAnimation(); // 初始化击球动画
  }
}

// 羽毛球击球动画 (2026-07-18) - 直接注入式
// v3.19.0 体验优化: ① 排除 input/textarea/select/contentEditable 等文字输入场景,避免抢文字选区焦点
// ② 排除模态遮罩内点击(避免与 toast/按钮反馈视觉冲突) ③ 绑定幂等性守卫,避免重复监听
function playHitAnimation(e) {
  if (!document.body.classList.contains('badminton-cursor')) return;
  const t = e.target;
  if (!t) return;
  // 跳过文字输入场景
  if (t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
  // 跳过模态/侧边栏内部场景(交互动画会更乱)
  if (t.closest && t.closest('.overlay, .modal, .toast, [role="dialog"]')) return;
  // 跳过纯文本/段落点击(只在「可点击」元素上才有击球感)
  const clickable = t.closest && t.closest('button, a, .module-card, .tool-card, .book-card, .side-link, .h-btn, .tb-btn, [role="button"]');
  if (!clickable) return;

  const hit = document.createElement('div');
  hit.className = 'hit-anim';
  hit.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;font-size:28px;left:' + (e.clientX-16) + 'px;top:' + (e.clientY-16) + 'px;animation:hitPop 0.3s ease-out forwards';
  hit.textContent = '🏸';
  document.body.appendChild(hit);
  setTimeout(() => hit.remove(), 300);
}

// 注入动画关键帧(幂等)
if (!document.getElementById('hit-anim-style')) {
  const style = document.createElement('style');
  style.id = 'hit-anim-style';
  style.textContent = '@keyframes hitPop {0%{transform:scale(0.5);opacity:1}50%{transform:scale(1.3);opacity:1}100%{transform:scale(1) translateY(-30px);opacity:0}}';
  document.head.appendChild(style);
}

// 绑定幂等守卫: 防止多次调用导致重复监听(每次点击多次触发 🏸)
let _hitAnimBound = false;
function initHitAnimation() {
  if (_hitAnimBound) return;
  _hitAnimBound = true;
  document.addEventListener('click', playHitAnimation, true);
  console.log('[羽毛球] 击球动画已启用');
}
function toggleReadMark() { const ch=getCurChapter(); if(!ch)return; if(isRead(currentBookId,ch.file)) unmarkRead(currentBookId,ch.file); else markRead(currentBookId,ch.file); $('readMarkBtn').textContent=isRead(currentBookId,ch.file)?'✅':'📌'; }
function getCurChapter() { if(!currentBookId||currentChapterIdx<0) return null; const b=MANIFEST?.books.find(x=>x.id===currentBookId); return b?.chapters[currentChapterIdx]||null; }
function prevChapter() { if(currentChapterIdx>0) openChapter(currentChapterIdx-1); }
function nextChapter() { const b=MANIFEST?.books.find(x=>x.id===currentBookId); if(b && currentChapterIdx<b.chapters.length-1) openChapter(currentChapterIdx+1); }
function makeCollapsible() { $$('article h2, article h3').forEach(el=>{el.addEventListener('click',()=>el.classList.toggle('collapsed'));}); }
function markStreak() { const p=getP(); if(!p._streak) p._streak={}; const t=new Date().toISOString().slice(0,10); if(!p._streak[t]){p._streak[t]=true;setP(p);} }

// ─── Quiz ──────────────────────────────────────
let quizItems=[], fontBase=15, focusMode=false, tocBtnState=true, studyQuestions=[], studyIdx=0;
function setupQuiz(ch) { quizItems=[]; const h2s=ch.h2s||[]; if(!h2s.length){$('quizContent').innerHTML='<div style="font-size:10px;color:var(--text3);text-align:center;padding:12px">🤷 无测试点</div>';return;} const n=Math.min(3,h2s.length); const picked=[...h2s].sort(()=>Math.random()-.5).slice(0,n); quizItems=picked.map(h=>({q:`「${h.title}」主要讲什么？`,a:h.title,options:shuffle([h.title,...getRandomH2s(ch,h,3)])})); quizStreak=0; quizBestSession=0; renderQuizSidebar(); }
function getRandomH2s(ch,exclude,count){const others=(ch.h2s||[]).filter(h=>h.title!==exclude.title);return[...others].sort(()=>Math.random()-.5).slice(0,count).map(h=>h.title);}
function shuffle(arr){return[...arr].sort(()=>Math.random()-.5);}
// ─── Quiz 连击 Streak 系统 ───────────────────────
// 当前会话连击数（每答对一题 +1，答错归 0 或刷新章节归 0）
let quizStreak = 0;
let quizBestSession = 0;
function renderQuizSidebar(){
  // v3.17.3 顶部连击状态条：移到 .quiz-streak-bar CSS (更易主题化)，最佳值取 session 与 RP 终身最佳 的较大值
  const lifetimeBest = (getRP() && getRP().bestQuizStreak) || 0;
  const showBest = Math.max(quizStreak, quizBestSession, lifetimeBest);
  const streakHtml = `<div id="quizStreakBar" class="quiz-streak-bar">
    <span class="qs-cur">🔥 当前连击 <b id="qsCur">${quizStreak}</b></span>
    <span class="qs-best">⭐ 最佳 <b id="qsBest">${showBest}</b></span>
  </div>`;
  $('quizContent').innerHTML = streakHtml + quizItems.map((item,qi)=>`<div class="quiz-card" id="qc-${qi}"><div class="qc-q">${item.q}</div>${item.options.map((o,oi)=>`<button class="qc-btn" onclick="checkQuiz(${qi},${oi})" id="qcb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>`).join('')}<div class="qc-result" id="qcr-${qi}"></div></div>`).join('');
  $('quizSidebar').style.display='block';
}
function _updateStreakBar(){
  const cur=$('qsCur'); if(cur) cur.textContent=quizStreak;
  const best=$('qsBest'); if(best) best.textContent=Math.max(quizStreak, quizBestSession, (getRP()&&getRP().bestQuizStreak)||0);
}
// v3.17.3 里程碑触发动画：连击数换档 (进入新里程碑) 时让状态条染暖色 + 弹一下
function _pulseStreakBar(){
  const bar=$('quizStreakBar');
  if(!bar) return;
  bar.classList.remove('milestone');
  // 强制 reflow 让动画可以重复触发
  void bar.offsetWidth;
  bar.classList.add('milestone');
  setTimeout(()=>bar.classList.remove('milestone'), 700);
}
function checkQuiz(qi,oi){
  const item=quizItems[qi];const correctIdx=item.options.indexOf(item.a);const correct=oi===correctIdx;
  for(let i=0;i<item.options.length;i++){const btn=$(`qcb-${qi}-${i}`);if(btn){btn.disabled=true;btn.classList.add(i===correctIdx?'correct':i===oi&&!correct?'wrong':'');}}
  const r=$(`qcr-${qi}`);if(r)r.textContent=correct?'✅ 正确！':`❌ 答案是 ${item.a}`;
  if(correct){
    quizStreak += 1;
    if (quizStreak > quizBestSession) quizBestSession = quizStreak;
    const rp=getRP();
    rp.totalQuizCorrect=(rp.totalQuizCorrect||0)+1;
    rp.bestQuizStreak = Math.max(rp.bestQuizStreak || 0, quizStreak);
    _incDailyQuiz();
    setRP(rp);
    addXP(5,'🧪');
    // 连击里程碑奖励：5/10/15 给额外 XP + toast 反馈，让用户感受到「越连越爽」
    const milestones = { 5: 15, 10: 40, 15: 80, 20: 150 };
    if (milestones[quizStreak]) {
      addXP(milestones[quizStreak], `🔥 ${quizStreak}连击`);
      showToast(`🔥 ${quizStreak} 连击！+${milestones[quizStreak]} XP 奖励`, 2200);
      _pulseStreakBar(); // v3.17.3: 里程碑瞬间让状态条染暖色 + 弹一下
    } else if (quizStreak >= 3) {
      showToast(`🔥 ${quizStreak} 连击 · 继续！`, 1200);
    }
    _updateStreakBar();
    checkAchievements();
  } else {
    // 答错：streak 归零，给温和提示而不是负反馈
    if (quizStreak >= 3) showToast(`💔 连击中断（${quizStreak}）· 下一题重新开始`, 1500);
    quizStreak = 0;
    _updateStreakBar();
  }
  // v3.14.6 测验闭环：所有题答完后注入本节总结卡，让连击 streak 的成果被「看见」
  _maybeRenderQuizSummary();
}
// 本节测验完成总结卡：3 题全答完后展示得分 + 最高连击 + 累计 XP + 再答一节入口
// 让刚加的连击系统形成闭环，避免答完 3 题后只剩「下一节」按钮、连击感被切断
function _maybeRenderQuizSummary() {
  if (!quizItems.length) return;
  // 检测所有题目是否都已作答（所有 qc-btn 都 disabled）
  const allAnswered = Array.from(document.querySelectorAll('#quizContent .qc-btn')).every(b => b.disabled);
  if (!allAnswered) return;
  // 防止重复注入
  if (document.getElementById('quizSummary')) return;
  // 按 qcr- 的文案统计更准（避免按钮重复挂多个 class 误计）
  let correct = 0;
  quizItems.forEach((_, i) => {
    const r = document.getElementById(`qcr-${i}`);
    if (r && r.textContent && r.textContent.includes('✅')) correct++;
  });
  const total = quizItems.length;
  const best = Math.max(quizStreak, quizBestSession);
  const pct = Math.round((correct / total) * 100);
  // 总结等级：满分/优秀/加油 三档视觉反馈
  const tier = pct === 100 ? 'perfect' : (pct >= 60 ? 'good' : 'try');
  const tierIcon = tier === 'perfect' ? '🏆' : (tier === 'good' ? '✨' : '💪');
  const tierText = tier === 'perfect' ? '全对！本节测验完美通关' : (tier === 'good' ? '不错！阅读理解基本到位' : '再读一遍正文，巩固关键点');
  const xpEarned = correct * 5; // 基础 XP（每题 +5）
  const summary = document.createElement('div');
  summary.id = 'quizSummary';
  summary.style.cssText = 'margin-top:10px;padding:12px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);text-align:center;animation:iosFadeUp .35s ease';
  summary.innerHTML = `
    <div style="font-size:24px;margin-bottom:4px">${tierIcon}</div>
    <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:6px">${tierText}</div>
    <div style="display:flex;justify-content:space-around;margin:8px 0;padding:8px 4px;background:var(--bg3);border-radius:6px">
      <div style="flex:1"><div style="font-size:18px;font-weight:700;color:var(--green)">${correct}/${total}</div><div style="font-size:9px;color:var(--text3);margin-top:1px">本节得分</div></div>
      <div style="flex:1;border-left:1px solid var(--border)"><div style="font-size:18px;font-weight:700;color:var(--orange)">🔥 ${best}</div><div style="font-size:9px;color:var(--text3);margin-top:1px">最高连击</div></div>
      <div style="flex:1;border-left:1px solid var(--border)"><div style="font-size:18px;font-weight:700;color:var(--gold)">+${xpEarned}</div><div style="font-size:9px;color:var(--text3);margin-top:1px">本节 XP</div></div>
    </div>
    <button onclick="setupQuiz(getCurChapter());showToast('🔄 已重置本节测验',1200);" style="margin-top:4px;padding:6px 14px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit">🔄 再答一次</button>
  `;
  const qc = $('quizContent');
  if (qc) qc.appendChild(summary);
  // 顶部展示一次大局反馈：让用户感受到「已完成本节测验」的事件
  if (pct === 100) showToast(`🏆 本节测验全对 · +${xpEarned} XP`, 2200);
  else if (pct >= 60) showToast(`✨ 本节测验 ${correct}/${total} · +${xpEarned} XP`, 1800);
  else showToast(`💪 本节 ${correct}/${total} · 回到正文再读一遍效果更好`, 2400);
}
// 切章/离开阅读器时把本节 best 连击刷回 RP（避免下次进入看到旧值）
function _flushQuizStreak() {
  try {
    const rp = getRP();
    rp.bestQuizStreak = Math.max(rp.bestQuizStreak || 0, quizBestSession);
    setRP(rp);
  } catch (_) {}
  quizStreak = 0;
  quizBestSession = 0;
}
function openFullQuiz(){
  const b=MANIFEST?.books.find(x=>x.id===currentBookId);
  const ch=b?.chapters[currentChapterIdx];
  if(!ch)return;
  const h2s=ch.h2s||[];
  if(!h2s.length){showToast('📝 本章暂无测试点', 2000);return;}
  // v3.18.4 修复：原函数只弹 toast 不开面板，导致顶部"🧪 测验"按钮是死按钮
  setupQuiz(ch);
  const qs=$('quizSidebar');
  if(qs)qs.style.display='block';
  showToast(`🧪 本章 ${h2s.length} 个测试点 · 答对加 XP`, 1800);
}
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
const VIEW_MAP = { dashboard:'viewDashboard', book:'viewBook', reader:'viewReader', library:'viewLibrary' };
function showView(v) {
  for (const [key, id] of Object.entries(VIEW_MAP)) {
    const el = $(id);
    if (el) el.style.display = key === v ? 'block' : 'none';
  }
  $('content').scrollTo({top:0,behavior:'smooth'});
  // FAB 可见性：首页隐藏 home FAB，非首页显示
  const homeFab = document.getElementById('fabHome');
  if (homeFab) homeFab.classList.toggle('show', v !== 'dashboard');
  // 搜索 FAB 始终可见（只是位置不同）
  const searchFab = document.getElementById('fabSearch');
  if (searchFab) searchFab.classList.toggle('show', v !== 'dashboard');
  // 顶部 FAB：仅阅读器视图显示（其它视图隐藏，避免首页/列表页干扰）
  // scroll 显隐已由 #content 的 scroll 监听器（scrollTop>300 时挂 .show）控制
  const topFab = document.getElementById('fab');
  if (topFab) topFab.classList.toggle('show', v === 'reader');
}

// ─── 返回首页 ───
function goHome() {
  // 关闭所有可能打开的 overlay
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  // 重置状态
  currentBookId = null;
  currentChapterIdx = -1;
  currentModule = 'dashboard';
  const chSection = $('chSection');
  if (chSection) chSection.style.display = 'none';
  // 关闭侧边栏（手机端）
  document.querySelector('.sidebar')?.classList.remove('open');
  // 重置导航
  navStack = [];
  historyReplace('dashboard', {});
  // 显示首页
  showView('dashboard');
  renderDashboard();
  // 滚到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const content = $('content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  // 触发一次resize以让 chart 重新计算
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  // 更新底部Tab状态
  updateBottomTab('dashboard');
}

// ─── 底部Tab切换 ───
function switchTab(tab) {
  // 更新Tab激活状态
  updateBottomTab(tab);
  
  // 关闭可能存在的浮层
  document.querySelectorAll('.overlay, .panel').forEach(o => {
    if (o.id !== 'pwOverlay' && o.id !== 'adminOverlay') o.remove();
  });
  document.querySelector('.sidebar')?.classList.remove('open');
  
  // 根据Tab切换视图
  switch(tab) {
    case 'dashboard':
      showView('dashboard');
      renderDashboard();
      break;
    case 'library':
      showView('library');
      if (typeof renderLibrary === 'function') renderLibrary();
      break;
  }
  
  // 滚动到顶部
  const content = $('content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── 更新底部Tab激活状态 ───
function updateBottomTab(activeTab) {
  const tabBar = document.getElementById('bottomTabBar');
  if (!tabBar) return;
  
  tabBar.querySelectorAll('.btb-item').forEach(item => {
    const view = item.dataset.view;
    item.classList.toggle('active', view === activeTab);
  });
}

// ─── 打开工具面板 ───
function openToolsPanel() {
  // 更新Tab激活状态
  updateBottomTab('tools');
  
  if (typeof openTools === 'function') {
    openTools();
  } else {
    // 备用：打开工具面板
    const panel = document.getElementById('toolsPanel');
    if (panel) {
      panel.style.display = 'block';
    } else {
      // 简单的工具列表弹窗
      showToast('🛠️ 工具面板开发中...');
    }
  }
}

// ─── 打开个人面板 ───
function openProfilePanel() {
  // 更新Tab激活状态
  updateBottomTab('profile');
  
  // 打开个人中心/设置
  if (typeof openSettings === 'function') {
    openSettings();
  } else {
    // 备用：显示简单的个人面板
    showToast('👤 个人中心开发中...');
  }
}

// ─── Toast 提示 ───
// v3.21.6 修复：旧实现每次调用都立刻 remove 已存在的 toast，导致连续触发时被覆盖、
// 用户只看到最后一条（J/K 切章时 4-5 条通知堆叠，前几条根本来不及读）。
// 新行为：① 同一条消息（去空格后相等）短时间内不重复显示；② 不同消息排队堆叠，
// 最多同时 3 条，每条独立计时；③ 用稳定 toast-stack 容器便于统一样式与动画。
const _toastSeen = new Map(); // msg -> 上次显示时间戳，去重冷却
const TOAST_STACK_MAX = 3;
const TOAST_DEDUP_MS = 1200;
function showToast(msg, duration = 2000) {
  try {
    const key = String(msg || '').trim();
    if (!key) return;
    const last = _toastSeen.get(key) || 0;
    if (Date.now() - last < TOAST_DEDUP_MS) return;
    _toastSeen.set(key, Date.now());

    // 找到/创建堆叠容器（append 到固定容器，避免多 toast 互相影响定位）
    let stack = document.getElementById('toastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toastStack';
      stack.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none';
      document.body.appendChild(stack);
    }
    // 超过堆叠上限：移除最早一条
    const items = stack.querySelectorAll('.toast-msg');
    if (items.length >= TOAST_STACK_MAX) items[0].remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    toast.style.cssText = `
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      max-width: min(80vw, 480px);
      text-align: center;
      animation: fadeIn 0.2s ease;
      pointer-events: auto;
    `;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.2s ease';
      // 200ms 是 fadeOut 动画时长，与原实现一致
      setTimeout(() => toast.remove(), 200);
    }, duration);
  } catch (e) { /* 极端情况下吞错，避免 toast 自身打断主流程 */ }
}

// ─── 返回上一页 ───
function goBack() {
  if (navStack.length === 0) { goHome(); return; }
  const prev = navStack.pop();
  if (navStack.length > 0) {
    historyReplace(navStack[navStack.length-1].view, navStack[navStack.length-1]);
  } else {
    historyReplace('dashboard', {});
  }
  switch (prev.view) {
    case 'dashboard': goHome(); break;
    case 'module':
      currentModule = prev.moduleId;
      showView('book');
      $('content').className='content view-page';
      openTrainModule(prev.moduleId);
      break;
    case 'book':
      currentBookId = prev.bookId;
      showView('book');
      goToBook(prev.bookId);
      break;
    default: goHome();
  }
}

// 搜索面板当前选中项索引（用于键盘 ↑↓ 导航）
let _srSelIdx = -1;
let _srLastQuery = '';
let _srDebounceTimer = null;
// v3.18.0 搜索范围：'all' | 'title' | 'module'
let _srScope = 'all';
// v3.22.3 保存最近一次搜索的完整结果列表：点击任一结果时据此生成「跨章节匹配链」
let _srLastResults = [];

// 📜 v3.9.3 搜索历史：去重 + 最新置顶 + 最多 8 条，关闭弹窗后保留
const SEARCH_HISTORY_KEY = 'lamb_search_history_v1';
const SEARCH_HISTORY_MAX = 8;
// 🔖 收藏搜索：用户主动 pin 的关键词，最多 6 条，跨会话保留
const PINNED_SEARCH_KEY = 'lamb_pinned_search_v1';
const PINNED_SEARCH_MAX = 6;
function getPinnedSearch() {
  const arr = safeGet(PINNED_SEARCH_KEY, []);
  return Array.isArray(arr) ? arr : [];
}
function togglePinSearch(q) {
  if (!q || !q.trim()) return false;
  q = q.trim();
  const arr = getPinnedSearch();
  const idx = arr.indexOf(q);
  if (idx >= 0) { arr.splice(idx, 1); safeSet(PINNED_SEARCH_KEY, arr); return false; }
  arr.unshift(q);
  if (arr.length > PINNED_SEARCH_MAX) arr.length = PINNED_SEARCH_MAX;
  safeSet(PINNED_SEARCH_KEY, arr);
  return true;
}
function clearPinnedSearch() {
  safeSet(PINNED_SEARCH_KEY, []);
}
function getSearchHistory() {
  const arr = safeGet(SEARCH_HISTORY_KEY, []);
  return Array.isArray(arr) ? arr : [];
}
function addSearchHistory(q) {
  if (!q || !q.trim()) return;
  q = q.trim();
  const arr = getSearchHistory().filter(x => x !== q);
  arr.unshift(q);
  if (arr.length > SEARCH_HISTORY_MAX) arr.length = SEARCH_HISTORY_MAX;
  safeSet(SEARCH_HISTORY_KEY, arr);
}
function clearSearchHistory() {
  safeSet(SEARCH_HISTORY_KEY, []);
  renderSearchHistory();
}
// v3.21.3 单条删除：只删除指定项，不影响其它历史/收藏
function removeHistoryOne(q) {
  if (!q) return;
  const arr = getSearchHistory().filter(x => x !== q);
  safeSet(SEARCH_HISTORY_KEY, arr);
  renderSearchHistory();
}
function removePinnedOne(q) {
  if (!q) return;
  const arr = getPinnedSearch().filter(x => x !== q);
  safeSet(PINNED_SEARCH_KEY, arr);
  renderSearchHistory();
}

/** 防抖搜索：输入即查，避免每个按键都跑全文搜索。
 *  空查询走快路径（无防抖）—— 用户 ⌫ 清空时，立即恢复历史面板，250ms 等待会很扎眼。 */
function scheduleSearch(input) {
  const q = input.value.trim();
  // 空查询：取消待执行的搜索，恢复历史面板（不防抖，0 延迟）
  if (!q) {
    clearTimeout(_srDebounceTimer);
    _srLastQuery = '';
    doSearch('');
    return;
  }
  clearTimeout(_srDebounceTimer);
  _srLastQuery = q;
  _srDebounceTimer = setTimeout(() => {
    if (_srLastQuery === q) doSearch(q);
  }, 250);
}

/** 处理搜索面板内的键盘事件（↑↓ 导航，Enter 跳转） */
function handleSearchKey(e, input) {
  const items = document.querySelectorAll('.sr-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!items.length) return;
    _srSelIdx = Math.min(items.length - 1, _srSelIdx + 1);
    updateSelHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    _srSelIdx = Math.max(0, _srSelIdx - 1);
    updateSelHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // 优先跳转选中项；无选中则把当前 input 文本加到历史后重新跑一次搜索（保证「输入完直接回车」也能搜）
    if (_srSelIdx >= 0 && items[_srSelIdx]) {
      items[_srSelIdx].click();
    } else {
      const q = input.value.trim();
      if (q) doSearch(q);
    }
  }
}

/** 更新选中项视觉态，并滚入视图 */
function updateSelHighlight(items) {
  items.forEach((el, i) => el.classList.toggle('active', i === _srSelIdx));
  if (_srSelIdx >= 0 && items[_srSelIdx]) {
    items[_srSelIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function openSearch() {
  _srSelIdx = -1;
  _srScope = 'all';
  const overlay = document.createElement('div');
  overlay.className='overlay';overlay.onclick=function(e){if(e.target===this)this.remove();};
  // v3.18.0 搜索范围过滤：全部 / 当前模块 / 仅标题 — 一个有问题时快速切换，
  // 例：搜「营养」太多结果 → 切「当前模块」缩小范围；只想粗筛 → 切「仅标题」跳过正文
  // 当前模块的判定：currentBookId + currentChapterIdx 都有效时视为「在某个模块/书里」
  const inModule = (typeof currentBookId === 'string' && currentBookId) ? 1 : 0;
  const scopeChips = [
    { k: 'all',    l: '🔍 全部', tip: '全书库 + 正文全文' },
    { k: 'module', l: '📂 当前模块', tip: '只搜当前正在看的书', disabled: inModule ? '' : 'disabled style="opacity:0.35;cursor:not-allowed" title="先进入一本书再切到这里"' },
    { k: 'title',  l: '📑 仅标题', tip: '只匹配章节标题 / H2，最快' }
  ].map(c => `<button class="sr-scope ${c.k === _srScope ? 'active' : ''}" data-scope="${c.k}" ${c.disabled} onclick="setSearchScope('${c.k}')" title="${c.tip}">${c.l}</button>`).join('');
  overlay.innerHTML=`<div class="panel panel-search" onclick="event.stopPropagation()"><div class="panel-hd"><input type="text" id="searchInput" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-size:14px;outline:none" placeholder="🔍 搜索训练内容·知识书塔 · ↑↓ 选 · ↵ 跳转" autofocus oninput="scheduleSearch(this)" onkeydown="handleSearchKey(event,this)"><button id="pinSearchBtn" class="h-btn" title="收藏当前关键词" onclick="togglePinCurrent()" style="opacity:0.6">🔖</button><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div><div class="panel-meta" id="searchMeta" style="font-size:11px;color:var(--text3);padding:4px 12px;text-align:right">⌨️ ↑↓ 选 · ↵ 跳转 · Esc 关闭</div><div class="sr-scopes" id="searchScopes" style="display:flex;gap:6px;padding:6px 12px;border-bottom:1px solid var(--border);background:var(--bg2)">${scopeChips}</div><div class="panel-bd" id="searchResults">${renderSearchHistoryHTML()}</div></div>`;
  document.body.appendChild(overlay);setTimeout(()=>{document.getElementById('searchInput')?.focus();refreshPinBtn();},100);
}

/** 切换搜索范围并立即重跑当前查询（无查询时不做事） */
function setSearchScope(scope) {
  if (_srScope === scope) return;
  _srScope = scope;
  // 更新 chip 视觉态
  const chips = document.querySelectorAll('#searchScopes .sr-scope');
  chips.forEach(el => el.classList.toggle('active', el.getAttribute('data-scope') === scope));
  // 重新跑当前查询
  const inp = document.getElementById('searchInput');
  if (inp && inp.value.trim()) doSearch(inp.value.trim());
  else {
    // 无查询时给个 prompt 提示
    const meta = document.getElementById('searchMeta');
    if (meta) meta.textContent = scope === 'title' ? '📑 仅标题模式 · 输入关键词开始搜索' : scope === 'module' ? '📂 当前模块模式 · 输入关键词开始搜索' : '⌨️ ↑↓ 选 · ↵ 跳转 · Esc 关闭';
  }
}

/** 根据当前输入框内容更新「收藏」按钮的状态（已收藏则高亮） */
function refreshPinBtn() {
  const btn = document.getElementById('pinSearchBtn');
  const inp = document.getElementById('searchInput');
  if (!btn || !inp) return;
  const q = (inp.value || '').trim();
  const pinned = getPinnedSearch().includes(q);
  btn.style.opacity = pinned ? '1' : '0.6';
  btn.textContent = pinned ? '📌' : '🔖';
  btn.title = pinned ? '已收藏（点击取消）' : '收藏当前关键词';
}

/** 切换当前输入框关键词的收藏状态 */
function togglePinCurrent() {
  const inp = document.getElementById('searchInput');
  if (!inp) return;
  const q = (inp.value || '').trim();
  if (!q) { showToast('🔖 请先输入要收藏的关键词', 1800); return; }
  const added = togglePinSearch(q);
  refreshPinBtn();
  showToast(added ? `🔖 已收藏「${q}」` : `📌 已取消收藏「${q}」`, 1600);
  // 刷新历史面板（保留区会立即反映状态）
  if (document.getElementById('searchResults') && !document.getElementById('searchInput').value) {
    renderSearchHistory();
  }
}

/** 渲染搜索历史面板 HTML（空历史时回退到原提示） */
function renderSearchHistoryHTML() {
  const pinned = getPinnedSearch();
  const hist = getSearchHistory();
  if (!pinned.length && !hist.length) {
    return '<div class="search-hint">⌨️ 输入 → 自动搜索<br><span style="opacity:0.6;font-size:11px">试搜：发球 / 杀球 / 营养 / 战术（输入后点 🔖 收藏）</span></div>';
  }
  // v3.21.3 词条右上角加 × 按钮：单项删除（不破坏其它记录），与「🗑️ 清空」配套
  const pinnedItems = pinned.length ? `<div style="margin-bottom:10px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;color:var(--gold);font-weight:600">🔖 收藏的关键词</span><a onclick="clearPinnedSearch();renderSearchHistory();" style="font-size:10px;color:var(--text3);cursor:pointer;opacity:0.7">🗑️ 清空</a></div><div style="line-height:1.8">${pinned.map(q => `<span class="sr-sugg-wrap"><a class="sr-sugg sr-pinned" data-pin-q="${escapeAttr(q)}" onclick="var i=document.getElementById('searchInput');i.value=this.dataset.pinQ;scheduleSearch(i);i.focus();">📌 ${escapeHTML(q)}</a><a class="sr-sugg-del" data-pin-del="${escapeAttr(q)}" onclick="removePinnedOne(this.dataset.pinDel);" title="删除这条收藏">×</a></span>`).join(' ')}</div></div>` : '';
  const histBlock = hist.length ? `<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:11px;color:var(--text3);font-weight:600">📜 最近搜索</span><a onclick="clearSearchHistory()" style="font-size:10px;color:var(--text3);cursor:pointer;opacity:0.7">🗑️ 清空</a></div><div style="line-height:1.8">${hist.map(q => `<span class="sr-sugg-wrap"><a class="sr-sugg sr-hist" data-hist-q="${escapeAttr(q)}" onclick="var i=document.getElementById('searchInput');i.value=this.dataset.histQ;scheduleSearch(i);i.focus();">🔁 ${escapeHTML(q)}</a><a class="sr-sugg-del" data-hist-del="${escapeAttr(q)}" onclick="removeHistoryOne(this.dataset.histDel);" title="删除这条记录">×</a></span>`).join(' ')}</div></div>` : '';
  return `<div class="search-hint" style="text-align:left;padding:14px 12px 8px">${pinnedItems}${histBlock}<div style="margin-top:8px;font-size:10px;color:var(--text3);opacity:0.7">⌨️ 输入关键字开始搜索 · 🔖 收藏常用词 · 点 × 单条删除</div></div>`;
}

/** 把搜索历史区域重渲染（点击"清空"后调用） */
function renderSearchHistory() {
  const box = document.getElementById('searchResults');
  if (box) box.innerHTML = renderSearchHistoryHTML();
}

/** 转义 HTML 防止 XSS（搜索历史来自用户输入） */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) {
  return escapeHTML(s);
}

const MAX_RESULTS = 30;
const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;
// v3.18.1 搜索并发 + 缓存：缓存已 fetch 的章节 markdown，避免每次输入/切 scope 都重拉网络
const CHAPTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const CHAPTER_CACHE_MAX = 80;               // 最多缓存 80 章，超出 LRU 淘汰
const SEARCH_FETCH_CONCURRENCY = 4;        // 同时跑的网络请求上限
const _chapterCache = new Map();           // key: 'bookId/file' -> { md, ts }
const _chapterInFlight = new Map();        // key: 'bookId/file' -> Promise<md|null>（去重并发请求）

/** Escape special regex characters in a query string */
function escapeRegex(s) { return s.replace(RE_SPECIAL, '\\$&'); }

/** 从缓存取章节 markdown，未命中或过期返回 null */
function _cacheGet(bookId, file) {
  const k = bookId + '/' + file;
  const hit = _chapterCache.get(k);
  if (!hit) return null;
  if (Date.now() - hit.ts > CHAPTER_CACHE_TTL_MS) {
    _chapterCache.delete(k);
    return null;
  }
  // LRU：命中后重新插到队尾
  _chapterCache.delete(k);
  _chapterCache.set(k, hit);
  return hit.md;
}

/** 写入缓存，超出上限时淘汰最旧的 */
function _cacheSet(bookId, file, md) {
  if (md == null) return;
  const k = bookId + '/' + file;
  if (_chapterCache.has(k)) _chapterCache.delete(k);
  _chapterCache.set(k, { md, ts: Date.now() });
  while (_chapterCache.size > CHAPTER_CACHE_MAX) {
    const oldest = _chapterCache.keys().next().value;
    if (!oldest) break;
    _chapterCache.delete(oldest);
  }
}

/** 限制并发地逐项调用 worker(items, fn)，所有项跑完 resolve 全量结果 */
async function _runWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** 计算搜索结果的相关度分数（越大越相关）
 *  - 章节标题完全匹配：+100
 *  - 章节标题包含：+50（开头再 +10）
 *  - H2 标题完全匹配：+40
 *  - H2 标题包含：+20（开头再 +10）
 *  - 正文行匹配：+5（词频再加权，最高 +15）
 */
function scoreSearchResult(r, ql, contentHits) {
  let score = 0;
  const t = r.ch.title.toLowerCase();
  if (t === ql) score += 100;
  else if (t.includes(ql)) { score += 50; if (t.startsWith(ql)) score += 10; }
  const preview = (r.preview || '').toLowerCase();
  if (preview.startsWith('📌 ')) {
    const h2 = preview.slice(2).trim();
    if (h2 === ql) score += 40;
    else if (h2.includes(ql)) { score += 20; if (h2.startsWith(ql)) score += 10; }
  }
  if (r.line > 0) {
    const hits = contentHits[r.ch.file] || 0;
    score += 5 + Math.min(10, hits);
  }
  return score;
}

/** Search chapter titles and H2 headings (no network needed, fast) */
function searchMetadata(ql, results) {
  const books = booksForScope();
  for (const book of books) {
    for (const ch of book.chapters) {
      if (results.length >= MAX_RESULTS) break;
      if (ch.title.toLowerCase().includes(ql) || ch.file.toLowerCase().includes(ql)) {
        results.push({ book, ch, preview: '📑 章节标题匹配', line: 0 });
        continue;
      }
      if (ch.h2s) {
        for (const h of ch.h2s) {
          if (results.length >= MAX_RESULTS) break;
          if (h.title.toLowerCase().includes(ql)) {
            results.push({ book, ch, preview: '📌 ' + h.title, line: 0 });
          }
        }
      }
    }
    if (results.length >= MAX_RESULTS) break;
  }
}

/** Search chapter content (fetches markdown, slower)
 *  v3.18.1：并发拉取 + 缓存复用 — 之前每次搜索都串行 fetch 几十章，切换 scope/输入新词都会重拉
 *  现在：首次扫描全量加载到缓存（带 4 路并发），后续搜索直接复用缓存
 */
async function searchContent(ql, results, queryOrig) {
  const books = booksForScope();
  const todo = [];
  for (const book of books) {
    for (const ch of book.chapters) {
      if (results.length >= MAX_RESULTS) break;
      if (results.some(r => r.ch === ch)) continue;
      todo.push({ book, ch });
    }
    if (results.length >= MAX_RESULTS) break;
  }
  if (!todo.length) return;

  const scoreOne = async ({ book, ch }) => {
    if (results.length >= MAX_RESULTS) return;
    const md = await fetchChapterContent(book.id, ch.file);
    if (!md) return;
    const lines = md.split('\n');
    let firstMatchLine = -1;
    let totalHits = 0;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].toLowerCase();
      if (ln.startsWith('#')) continue;
      if (ln.includes(ql)) {
        totalHits++;
        if (firstMatchLine < 0) firstMatchLine = i + 1;
      }
    }
    if (firstMatchLine > 0) {
      const raw = lines[firstMatchLine - 1];
      // v3.22.2 搜索预览扩上下文：除了首匹配行，再抓它前 1 行 + 后 1 行作为上下文，
      // 让用户一眼能判断「这段是不是我要找的内容」，避免点进去才发现走偏。
      // 严格裁剪 160 字以内，过长用 … 收尾，保持结果列表不撑爆。
      const before = firstMatchLine > 1 ? lines[firstMatchLine - 2] : '';
      const after = firstMatchLine < lines.length ? lines[firstMatchLine] : '';
      const joined = [before, raw, after].filter(Boolean).join(' / ').replace(/\s+/g, ' ').trim();
      const p = joined.length > 160 ? joined.slice(0, 160) + '…' : joined;
      results.push({ book, ch, preview: p, line: firstMatchLine, hits: totalHits });
    }
  };

  await _runWithLimit(todo, SEARCH_FETCH_CONCURRENCY, scoreOne);
}

/** v3.18.0 根据当前搜索范围返回应遍历的 book 列表
 *  - 'all'    : 全部书（默认）
 *  - 'module' : 当前正在阅读的书（缩小范围）
 *  - 'title'  : 全部书（仅在调用方跳过正文搜索，由 doSearch 控制）
 */
function booksForScope() {
  if (_srScope === 'module' && currentBookId) {
    const b = MANIFEST.books.find(x => x.id === currentBookId);
    return b ? [b] : MANIFEST.books;
  }
  return MANIFEST.books;
}

/** Try to fetch chapter markdown from local then remote (8s timeout)
 *  v3.18.1：加内存缓存 + 并发去重 — 同一章多处拉取时只发一次网络请求
 */
async function fetchChapterContent(bookId, file) {
  // 1) 缓存命中直接返回
  const cached = _cacheGet(bookId, file);
  if (cached != null) return cached;

  const k = bookId + '/' + file;
  // 2) 同一章已在请求中：直接复用 in-flight Promise（避免重复 fetch）
  if (_chapterInFlight.has(k)) return _chapterInFlight.get(k);

  const fetchWithTimeout = (url, ms = 8000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
  };

  const p = (async () => {
    try {
      const localUrl = 'books/' + bookId + '/' + file;
      const r1 = await fetchWithTimeout(localUrl);
      if (r1.ok) { const md = await r1.text(); _cacheSet(bookId, file, md); return md; }
    } catch (_) { /* ignore local */ }
    try {
      const r2 = await fetchWithTimeout(RAW + '/books/' + bookId + '/' + file);
      if (r2.ok) { const md = await r2.text(); _cacheSet(bookId, file, md); return md; }
    } catch (_) { /* ignore remote */ }
    return null;
  })().finally(() => { _chapterInFlight.delete(k); });

  _chapterInFlight.set(k, p);
  return p;
}

/** 常见搜索建议（无结果时给出） */
const SEARCH_SUGGESTIONS = ['发球', '杀球', '接发', '营养', '战术', '体能', '训练计划', '损伤', '柔韧', '心理'];

/** Render search results into the DOM */
function renderSearchResults(results, queryOrig) {
  _srSelIdx = -1;
  const meta = document.getElementById('searchMeta');
  if (!results.length) {
    // 🎯 优先推荐「包含 query 子串」的关键词（命中用户意图），其次回退到通用建议
    const q = (queryOrig || '').trim();
    let sugg;
    if (q) {
      const starts = SEARCH_SUGGESTIONS.filter(s => s.startsWith(q));
      const contains = SEARCH_SUGGESTIONS.filter(s => !s.startsWith(q) && s.includes(q));
      const others = SEARCH_SUGGESTIONS.filter(s => !s.includes(q));
      sugg = [...starts, ...contains, ...others].slice(0, 5);
    } else {
      sugg = SEARCH_SUGGESTIONS.slice(0, 5);
    }
    // 🔒 转义防 XSS，并对 query 子串做高亮（视觉提示「这些词和你的输入相关」）
    const safeQ = escapeHTML(q);
    const chipHtml = sugg.map(s => {
      const safeS = escapeHTML(s);
      const hi = q && s.includes(q)
        ? safeS.replace(new RegExp('(' + escapeRegex(q) + ')', 'g'), '<em style="color:var(--blue);font-style:normal;font-weight:700">$1</em>')
        : safeS;
      return `<a class="sr-sugg" data-q="${escapeAttr(s)}" onclick="var i=document.getElementById('searchInput');i.value=this.dataset.q;scheduleSearch(i);i.focus();">${hi}</a>`;
    }).join(' · ');
    $('searchResults').innerHTML = `<div class="search-hint">😅 未找到「<strong>${safeQ}</strong>」<br><span style="opacity:0.7;font-size:11px">试试这些（已按相关度排序）：</span><br><div style="margin-top:6px">${chipHtml}</div></div>`;
    if (meta) meta.textContent = '0 条结果';
    return;
  }
  const escaped = escapeRegex(queryOrig);
  const re = new RegExp('(' + escaped + ')', 'gi');
  // 📍 当前正在阅读的章节（仅在阅读器视图时有值）；用于在搜索结果中标记「当前章节」方便一眼定位
  const here = (typeof currentBookId === 'string' && currentChapterIdx >= 0)
    ? { bookId: currentBookId, chapterIdx: currentChapterIdx }
    : null;
  if (meta) meta.textContent = `${results.length} 条结果（按相关度 · ↑↓ 选 · ↵ 跳转）`;
  // 📚 v3.22.1 累计：按书分组 + n/Shift+N 循环跳转 + 笔误修复（科普→搜索、镉定→锚定、所以→所有）
  // 性价比：搜「营养」可能命中 5 本书里 8 章节，分组后用户一眼看清「这本书命中 3 章」，决策更快
  const byBook = new Map();
  results.forEach(r => {
    if (!byBook.has(r.book.id)) byBook.set(r.book.id, { book: r.book, items: [] });
    byBook.get(r.book.id).items.push(r);
  });
  const groupHtml = Array.from(byBook.values()).map(g => {
    const totalHits = g.items.reduce((s, r) => s + (r.hits || 1), 0);
    const head = `<div class="sr-group-hd">${g.book.emoji} ${escapeHTML(g.book.title)} <span class="sr-group-cnt">${g.items.length} 章节 · ${totalHits} 次命中</span></div>`;
    const itemsHtml = g.items.map(r => {
      const titleHTML = `${r.book.emoji} ${r.book.title.replace(re, '<em class="sr-hl">$1</em>')} · ${r.ch.title.replace(re, '<em class="sr-hl">$1</em>')}`;
      const highlighted = r.preview.replace(re, '<em class="sr-hl">$1</em>');
      const lineAttr = r.line ? r.line : '';
      const chIdx = r.book.chapters.findIndex(c => c.file === r.ch.file);
      const total = r.book.chapters.length;
      const posLabel = chIdx >= 0 ? `第 ${chIdx + 1}/${total} 节` : '';
      const isHere = here && here.bookId === r.book.id && chIdx === here.chapterIdx;
      const hereBadge = isHere ? '<span class="sr-here">📍 当前章节</span>' : '';
      const meta2 = posLabel + (r.line ? ' · <span class="sr-m">第' + r.line + '行</span>' : '') + (r.hits > 1 ? ' <span class="sr-hits">命中 ' + r.hits + ' 次</span>' : '');
      return `<div class="sr-item" onclick="this.closest('.overlay').remove();goSearchResult('${r.book.id}','${r.ch.file}',${lineAttr ? r.line : 'null'},'${escapeRegex(queryOrig).replace(/'/g, "\\'")}')">
        <div class="sr-b">${titleHTML} ${hereBadge}</div>
        <div class="sr-p">${highlighted}</div>
        ${meta2 ? `<div class="sr-meta-row">${meta2}</div>` : ''}
      </div>`;
    }).join('');
    return head + itemsHtml;
  }).join('');
  $('searchResults').innerHTML = groupHtml;
}

async function doSearch(query) {
  query = query.trim();
  if (!query) {
    _srSelIdx = -1;  // 输入清空后重置选中态，避免 ↑↓ 跳到历史项外的位置
    $('searchResults').innerHTML = renderSearchHistoryHTML();
    const meta = document.getElementById('searchMeta');
    if (meta) meta.textContent = '⌨️ ↑↓ 选 · ↵ 跳转 · Esc 关闭';
    return;
  }
  // 📜 记录到搜索历史（去重 + 最新置顶）
  addSearchHistory(query);
  $('searchResults').innerHTML = '<div class="search-hint">⏳ 搜索中…</div>';
  const ql = query.toLowerCase();
  const results = [];

  // Phase 1: fast metadata search (titles, H2s)
  searchMetadata(ql, results);

  // Phase 2: slower content search (fetch markdown) — 'title' 模式跳过，跳过所有网络请求
  if (results.length < MAX_RESULTS && _srScope !== 'title') {
    await searchContent(ql, results, query);
  }

  // 🎯 v3.9.3 按相关度排序：标题完全匹配 > 标题包含 > H2 匹配 > 正文匹配（词频加权）
  const contentHits = {};
  for (const r of results) {
    if (r.hits && r.ch) contentHits[r.ch.file] = r.hits;
  }
  results.forEach(r => { r._score = scoreSearchResult(r, ql, contentHits); });
  results.sort((a, b) => b._score - a._score);

  // v3.22.3 缓存本次结果列表：点进任何章节时保存为「跨章节匹配链」，n/Shift+N 在章节末尾可继续跨章节跳转
  _srLastResults = results;

  renderSearchResults(results, query);
}
function goSearchResult(bid,file,line,query){
  // v3.22.3 跨章节匹配链：点击结果时把当前搜索结果列表的「章节摘要」快照记下来
  // 之后 n/Shift+N 在章节内循环到末尾时，自动跳到下一个/上一个有命中的章节
  _searchChain = (_srLastResults || []).map(r => ({
    bookId: r.book.id,
    bookTitle: r.book.title,
    bookEmoji: r.book.emoji,
    file: r.ch.file,
    chTitle: r.ch.title,
    hits: r.hits || 1
  }));
  _searchChainIdx = _searchChain.findIndex(s => s.bookId === bid && s.file === file);
  pendingSearchJump={bookId:bid,file:file,line:line||0,query:query||''};
  goToBook(bid);
  const b=MANIFEST.books.find(x=>x.id===bid);
  const idx=b?.chapters.findIndex(c=>c.file===file);
  if(idx>=0)setTimeout(()=>openChapter(idx),300);
}

/** 在章节渲染完成后定位搜索匹配：滚动到匹配行 + 高亮关键词 + 锚定标记 */
function applySearchJump() {
  const jump = pendingSearchJump;
  if (!jump) return;
  const article = $('article');
  if (!article) return;
  // v3.22.1 切换章节 → 清理掉旧章节的搜索卡（导航栏 + 匹配节点 + 序号）
  // 如果这次进入的就是同一章节（重复触发 applySearchJump），先重置避免重复 push
  _searchMatches = [];
  _searchCurrIdx = -1;
  closeSearchNav();
  // 先清除上次的高亮与锚定
  article.querySelectorAll('.search-hl,.search-anchor').forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;
    if (el.classList.contains('search-anchor')) {
      el.classList.remove('search-anchor');
    } else {
      // 还原文本节点
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  });
  // 锚定指定行：如果有 line，则找到第 N 个段落（近似对应 markdown 行）
  let anchorEl = null;
  if (jump.line > 0) {
    const blocks = article.querySelectorAll('p,li,h2,h3,h4,pre,blockquote,table');
    if (blocks.length) {
      // 按比例近似跳转（markdown 行 → HTML 块）
      const idx = Math.min(blocks.length - 1, Math.max(0, Math.floor((jump.line - 1) * blocks.length / Math.max(jump.line + 5, 30))));
      anchorEl = blocks[idx];
    }
  }
  // 如果没有 line 或没找到锚定，则高亮第一个出现位置所在的祖先块
  if (!anchorEl && jump.query) {
    const first = findFirstMatchInArticle(article, jump.query);
    if (first) anchorEl = first.closest('p,li,h2,h3,h4,pre,blockquote,table,article') || article;
  }
  // 在正文中高亮所有匹配关键词
  if (jump.query) {
    const safe = jump.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (safe) {
      const re = new RegExp(safe, 'gi');
      walkTextNodes(article, (text) => {
        re.lastIndex = 0;
        if (!re.test(text)) return null;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const em = document.createElement('em');
          em.className = 'search-hl';
          em.textContent = m[0];
          frag.appendChild(em);
          last = m.index + m[0].length;
          if (m[0].length === 0) re.lastIndex++;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        return frag;
      });
    }
  }
  // 定位滚动：锚定元素出现在视口上方 20% 处
  if (anchorEl) {
    anchorEl.classList.add('search-anchor');
    requestAnimationFrame(() => {
      const content = $('content');
      if (!content) return;
      const rect = anchorEl.getBoundingClientRect();
      const containerRect = content.getBoundingClientRect();
      const offset = rect.top - containerRect.top + content.scrollTop - content.clientHeight * 0.2;
      content.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      // 4秒后移除锚定动画
      setTimeout(() => anchorEl && anchorEl.classList.remove('search-anchor'), 4000);
    });
  }
  // v3.22.1 收集所有匹配节点 + 渲染导航栏：搜索跳进章节后用户可以 n / Shift+N 循环跳转
  // 在「锚定动画」设置完后跑，确保首个匹配有足够突出 — 顶部匹配还有 scroll-anchor 描边
  _searchMatches = Array.from(article.querySelectorAll('em.search-hl'));
  if (_searchMatches.length > 0) {
    _searchCurrIdx = 0;
    _searchMatches[0].classList.add('search-hl-current');
    renderSearchNavBar();
  }
  pendingSearchJump = null;
}

/** 渲染/更新阅读器顶部搜索导航栏（1/N · ‹ ‹ › › · ×）。只在有匹配时显示。
 *  v3.22.4 跨章节进度：在有搜索链时显示「第 X/Y 章」小徽标，让用户清楚自己在整条结果链中的位置 */
function renderSearchNavBar() {
  let bar = document.getElementById('searchNavBar');
  if (!_searchMatches.length) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'searchNavBar';
    bar.className = 'search-nav-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '搜索匹配导航');
    bar.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(bar);
  }
  const total = _searchMatches.length;
  const idx = Math.max(0, _searchCurrIdx + 1);
  // v3.22.4 跨章节位置：只在有「章节链」且超过 1 章时才显示，避免单章搜索多一个噪音
  const chainTotal = _searchChain.length;
  const showChain = chainTotal > 1 && _searchChainIdx >= 0;
  const chainBadge = showChain
    ? `<span class="sn-chain" title="在搜索结果中共 ${chainTotal} 章有匹配">第 ${_searchChainIdx + 1}/${chainTotal} 章</span>`
    : '';
  bar.innerHTML = `
    <button class="sn-btn" onclick="gotoSearchMatch(-1)" title="上一个匹配（Shift+N）" aria-label="上一个匹配">‹</button>
    <span class="sn-cnt" title="第 ${idx} / ${total} 个匹配">${idx} / ${total}</span>
    <button class="sn-btn" onclick="gotoSearchMatch(1)" title="下一个匹配（N）" aria-label="下一个匹配">›</button>
    ${chainBadge}
    <span class="sn-key">搜索 ${escapeHTML(pendingSearchJump?.query || '')}</span>
    <button class="sn-close" onclick="closeSearchNav()" title="关闭（Esc）" aria-label="关闭搜索导航">×</button>
  `;
}

/** 跳转搜索匹配；delta = +1 下一个 / -1 上一个，循环 wrap
 *  v3.22.3 在当前章节末尾/开头自动跨章节跳转：n 跳到下一章首个匹配；Shift+N 跳到上一章最后一个匹配
 *  跨章节跳转用 pendingSearchJump + goSearchResult 复用高亮/滚动/导航栏渲染整条链路
 */
function gotoSearchMatch(delta) {
  if (!_searchMatches.length) return;
  const n = _searchMatches.length;
  // 检测跨章节：正向 = 已经在最后一个；反向 = 已经在第一个
  const wantCross = (delta > 0 && _searchCurrIdx >= n - 1) || (delta < 0 && _searchCurrIdx <= 0);
  if (wantCross && _searchChain.length > 1 && _searchChainIdx >= 0) {
    const nextIdx = _searchChainIdx + (delta > 0 ? 1 : -1);
    // 链两端的 wrap：链尾 → 链头；链头 → 链尾，让用户能一直按 n 循环翻遍全部结果
    const wrapped = (nextIdx + _searchChain.length) % _searchChain.length;
    if (wrapped !== _searchChainIdx) {
      jumpToSearchChainItem(wrapped, delta);
      return;
    }
  }
  const prev = _searchMatches[_searchCurrIdx];
  if (prev) prev.classList.remove('search-hl-current');
  _searchCurrIdx = ((_searchCurrIdx + delta) % n + n) % n; // 允许负数 wrap
  const next = _searchMatches[_searchCurrIdx];
  if (!next) return;
  next.classList.add('search-hl-current');
  // 滚动到当前匹配：让它出现在视口上方 20% 处（与初始 applySearchJump 同一规则）
  const content = $('content');
  if (content) {
    const rect = next.getBoundingClientRect();
    const cRect = content.getBoundingClientRect();
    const offset = rect.top - cRect.top + content.scrollTop - content.clientHeight * 0.2;
    content.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  }
  renderSearchNavBar();
}

/** v3.22.3 跨章节跳转：复用 goSearchResult 同一条高亮/滚动链路，并用 toast 提示跨章事实 */
function jumpToSearchChainItem(idx, delta) {
  const item = _searchChain[idx];
  if (!item) return;
  showToast((delta > 0 ? '⏭️ 下一章：' : '⏮️ 上一章：') + `${item.bookEmoji || ''} ${item.chTitle}（${item.hits} 处匹配）`, 1600);
  // 复用已有的跳转 + 跨章节链位置更新逻辑（不用 openChapter 直接调，避免链路索引漏更新）
  goSearchResult(item.bookId, item.file, 0, pendingSearchJump?.query || '');
  // goSearchResult 内部已经按 bid+file 落 correct 索引，这里保险再写一次
  _searchChainIdx = idx;
}

/** 关闭搜索导航栏：清除状态 + 移除导航栏 + 恢复所有匹配为非“当前”态 */
function closeSearchNav() {
  const bar = document.getElementById('searchNavBar');
  if (bar) bar.remove();
  _searchMatches.forEach(el => el.classList.remove('search-hl-current'));
  _searchMatches = [];
  _searchCurrIdx = -1;
}

/** 遍历 article 内的文本节点（不进 script/style） */
function walkTextNodes(root, cb) {
  const skip = new Set(['SCRIPT', 'STYLE']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let p = node.parentNode;
      while (p && p !== root) {
        if (p.nodeType === 1 && (skip.has(p.tagName) || p.classList.contains('search-hl'))) {
          return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  const replacements = [];
  while ((n = walker.nextNode())) replacements.push(n);
  for (const node of replacements) {
    const result = cb(node.nodeValue);
    if (result && node.parentNode) {
      node.parentNode.replaceChild(result, node);
    }
  }
}

/** 在 article 中查找首个匹配文本的节点 */
function findFirstMatchInArticle(root, query) {
  if (!query) return null;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safe) return null;
  const re = new RegExp(safe, 'i');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      re.lastIndex = 0;
      return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  return walker.nextNode();
}

// ─── Sidebar ──────────────────────────────────
// 抽屉式侧栏：在 ≤1023px 设备上打开时显示全屏遮罩，点击遮罩可关闭侧栏
function getSidebarBackdrop() {
  let bd = document.getElementById('sidebarBackdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'sidebarBackdrop';
    bd.className = 'sidebar-backdrop hidden';
    bd.setAttribute('aria-hidden', 'true');
    bd.addEventListener('click', () => toggleSidebar(false));
    document.body.appendChild(bd);
  }
  return bd;
}
function toggleSidebar(show){
  if(show===undefined) show=!sidebarOpen;
  $('sidebar').classList.toggle('closed',!show);
  sidebarOpen=show;
  // 仅在抽屉模式（≤1023px）下显示遮罩
  const bd = getSidebarBackdrop();
  if (bd) bd.classList.toggle('hidden', !show || window.innerWidth > 1023);
}
let sidebarOpen=true;

// 通用关闭弹窗函数
function closeOverlayPopup(btn) {
  var overlay = btn.closest('.overlay');
  if (overlay) overlay.remove();
}

// ─── Overlay ──────────────────────────────────
// 每次创建独立 id（避免 _tmpOverlay 重复导致旧 overlay 泄漏）
let _overlaySeq = 0;
function nextOverlayId() { return `_overlay_${++_overlaySeq}`; }
function showOverlay(cls,title,body){const overlay=document.createElement('div');overlay.className='overlay';overlay.id=nextOverlayId();overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title||'弹窗');overlay.onclick=function(e){if(e.target===this)this.remove();};overlay.innerHTML=`<div class="${cls}" onclick="event.stopPropagation()"><div class="panel-hd"><span>${title}</span><button class="h-btn" onclick="this.closest('.overlay').remove()" aria-label="关闭">✕</button></div><div class="panel-bd">${body}</div></div>`;document.body.appendChild(overlay);return overlay;}

// ─── 教练系统内嵌 iframe 加载 ────────
function openCoachInline(url, title) {
  // 移除已有 overlay
  const existing = document.querySelector('.overlay.coach-inline-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay coach-inline-overlay';
  overlay.id = nextOverlayId();
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label', title || '教练系统');
  overlay.onclick = function(e) { if (e.target === this) this.remove(); };
  overlay.innerHTML = `<div class="coach-inline-wrap" onclick="event.stopPropagation()">
    <div class="panel-hd coach-inline-hd">
      <span>🎯 ${title}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <a href="${url}" target="_blank" class="h-btn" title="新窗口打开">↗</a>
        <button class="h-btn" onclick="this.closest('.overlay').remove()" title="关闭">✕</button>
      </div>
    </div>
    <iframe src="${url}" class="coach-inline-iframe" referrerpolicy="no-referrer"></iframe>
  </div>`;
  document.body.appendChild(overlay);
}

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const bar = $('splashBar');
  if(!bar)return;
  bar.style.width='25%';await sleep(150);
  MANIFEST = MANIFEST_DATA;
  bar.style.width='60%';await sleep(120);
  const theme = localStorage.getItem('bk_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌓';
  const savedFont=localStorage.getItem('bk_font');if(savedFont){fontBase=parseInt(savedFont);document.documentElement.style.setProperty('--font-base',fontBase+'px');}
  setTimeout(_updateFontBtnState, 300); // 让工具栏 DOM 就绪后再同步按钮状态
  bar.style.width='90%';await sleep(200);
  initRP();
  initBadmintonCursor(); // 初始化羽毛球拍光标
  initFocusMode(); // v3.21.7 恢复专注模式偏好
  bar.style.width='100%';await sleep(200);
  $('splash').style.display='none';$('app').style.display='block';
  renderDashboard();updateProgress();
  $('content').addEventListener('scroll',()=>{$('fab').classList.toggle('show',$('content').scrollTop>300);updateReadProgress();_tickReadSeconds();_tickWeekGoal();_tocScrollTick();_saveScrollPosThrottled();});
  _rpInitDrag(); // v3.14.2 阅读进度条拖拽初始化
  if(window.innerWidth<=768)toggleSidebar(false);
  setTimeout(checkAchievements,2000);
});

// ─── History API（浏览器后退键支持） ──
function historyPush(view, state) {
  history.pushState({view, ...state}, '', window.location.pathname);
}
function historyReplace(view, state) {
  history.replaceState({view, ...state}, '', window.location.pathname);
}
window.addEventListener('popstate', (e) => {
  if (!e.state || !e.state.view) { goHome(); return; }
  if (navStack.length === 0 && e.state.view !== 'dashboard') { goHome(); }
});

function calcTDEE(){
var g=(document.getElementById("tdeeGender")||{}).value||"male";
var w=parseFloat((document.getElementById("tdeeWeight")||{}).value)||70;
var h=parseFloat((document.getElementById("tdeeHeight")||{}).value)||175;
var a=parseInt((document.getElementById("tdeeAge")||{}).value)||25;
var act=parseFloat((document.getElementById("tdeeActivity")||{}).value)||1.55;
var bmr=g==="male"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;
var tdee=Math.round(bmr*act);

// 弹窗展示结果
var advice = act < 1.4 ? '你活动量较小，建议增加运动' : act < 1.6 ? '你活动量适中，保持目前的运动习惯' : '你活动量很大，注意补充营养';
showOverlay('panel-sm', '🔥 TDEE 计算结果', `
  <div style="text-align:center;padding:10px">
    <div style="font-size:14px;color:var(--text2);margin-bottom:8px">你的基础代谢</div>
    <div style="font-size:36px;font-weight:700;color:var(--blue)">${Math.round(bmr)}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:16px">千卡/天</div>
    <div style="background:var(--bg2);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">每日总消耗(TDEE)</div>
      <div style="font-size:28px;font-weight:700;color:var(--green)">${tdee}</div>
      <div style="font-size:11px;color:var(--text3)">千卡/天</div>
    </div>
    <div style="font-size:12px;color:var(--text2);text-align:left;line-height:1.8">
      <strong>📋 通俗解读：</strong><br>
      • 你每天躺着不动会消耗 <strong>${Math.round(bmr)}</strong> 千卡<br>
      • 加上日常活动后大约 <strong>${tdee}</strong> 千卡<br>
      • ${advice}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;text-align:center">
      <div style="background:var(--bg2);border-radius:8px;padding:10px">
        <div style="font-size:11px;color:var(--text2)">减脂</div>
        <div style="font-size:16px;font-weight:600;color:var(--red)">${tdee-400}</div>
        <div style="font-size:10px;color:var(--text3)">千卡/天</div>
      </div>
      <div style="background:var(--bg2);border-radius:8px;padding:10px">
        <div style="font-size:11px;color:var(--text2)">增肌</div>
        <div style="font-size:16px;font-weight:600;color:var(--green)">${tdee+300}</div>
        <div style="font-size:10px;color:var(--text3)">千卡/天</div>
      </div>
    </div>
    <button onclick="closeOverlayPopup(this)" style="width:100%;margin-top:12px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">知道了</button>
  </div>`);
}

function calcMacro(){
var w=parseFloat((document.getElementById("macroWeight")||{}).value)||70;
var g=(document.getElementById("macroGoal")||{}).value||"maintain";
var tdee=parseFloat((document.getElementById("macroTDEE")||{}).value)||2500;
var pMult={maintain:1.7,gain:2,lose:2.2};
var calAdj={maintain:0,gain:350,lose:-400};
var protein=Math.round(pMult[g]*w);
var fat=Math.round(0.8*w);
var cal=tdee+calAdj[g];
var carb=Math.round((cal-protein*4-fat*9)/4);

// 弹窗展示结果
var goalText = {maintain:'维持体重',gain:'增肌',lose:'减脂'}[g];
var goalAdvice = {maintain:'保持现有饮食，注意营养均衡',gain:'要多吃才能长肌肉，建议增加500大卡',lose:'要控制饮食，建议减少400大卡'}[g];
showOverlay('panel-sm', '🥩 营养素计算结果', `
  <div style="text-align:center;padding:10px">
    <div style="font-size:14px;color:var(--text2);margin-bottom:12px">目标：${goalText}</div>
    <div style="background:linear-gradient(135deg,var(--green),var(--blue));border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="font-size:12px;color:rgba(255,255,255,0.8)">每日总热量</div>
      <div style="font-size:32px;font-weight:700;color:#fff">${cal}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7)">千卡</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div style="background:var(--bg2);border-radius:10px;padding:12px">
        <div style="font-size:20px;font-weight:700;color:var(--green)">${protein}g</div>
        <div style="font-size:10px;color:var(--text2)">蛋白质</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:12px">
        <div style="font-size:20px;font-weight:700;color:var(--gold)">${carb}g</div>
        <div style="font-size:10px;color:var(--text2)">碳水</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:12px">
        <div style="font-size:20px;font-weight:700;color:var(--red)">${fat}g</div>
        <div style="font-size:10px;color:var(--text2)">脂肪</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text2);text-align:left;line-height:1.8;background:var(--bg2);border-radius:10px;padding:12px">
      <strong>📋 通俗解读：</strong><br>
      • 蛋白质 <strong>${protein}g</strong> = 约${Math.round(protein/30)}个鸡蛋的蛋白量<br>
      • 碳水 <strong>${carb}g</strong> = 约${Math.round(carb/60)}碗米饭<br>
      • 脂肪 <strong>${fat}g</strong> = 约${Math.round(fat/9)}勺油<br>
      <br>
      <strong>建议：</strong>${goalAdvice}
    </div>
    <button onclick="closeOverlayPopup(this)" style="width:100%;margin-top:12px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">知道了</button>
  </div>`);
}

function calcWater(){
var w=parseFloat((document.getElementById("waterWeight")||{}).value)||70;
var t=parseInt((document.getElementById("waterTrain")||{}).value)||60;
var temp=parseFloat((document.getElementById("waterTemp")||{}).value)||1;
var daily=Math.round(w*33*temp);
var train=Math.round(t*12);
var total=Math.round(daily+train);

// 弹窗展示结果
var bottles = Math.round(total / 550);
showOverlay('panel-sm', '💧 饮水计算结果', `
  <div style="text-align:center;padding:10px">
    <div style="font-size:40px;margin-bottom:8px">💧</div>
    <div style="font-size:14px;color:var(--text2);margin-bottom:4px">每日建议饮水量</div>
    <div style="font-size:36px;font-weight:700;color:var(--blue)">${total}</div>
    <div style="font-size:14px;color:var(--text3);margin-bottom:16px">毫升（约${(total/1000).toFixed(1)}升）</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">
      <div style="background:var(--bg2);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--text2)">日常饮水</div>
        <div style="font-size:18px;font-weight:600;color:var(--text)">${daily}ml</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--text2)">训练补充</div>
        <div style="font-size:18px;font-weight:600;color:var(--text)">+${train}ml</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text2);text-align:left;line-height:1.8;background:var(--bg2);border-radius:10px;padding:12px">
      <strong>📋 通俗解读：</strong><br>
      • 约等于 <strong>${bottles}</strong> 瓶550ml矿泉水<br>
      • 建议分${Math.min(8, Math.ceil(total/500))}次喝完，不要一次喝太多<br>
      • 训练中每15-20分钟补充${Math.round(t/60*250)}ml水<br>
      ${temp > 1 ? '• 高温天气记得多补充水分！' : ''}
    </div>
    <button onclick="closeOverlayPopup(this)" style="width:100%;margin-top:12px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer">知道了</button>
  </div>`);
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function scrollToTop(){$('content').scrollTo({top:0,behavior:'smooth'});}

// ─── v3.18.5 阅读位置记忆 ──────────────────────────────
// 长章节翻到中间离开后，再次进入同一节应自动滚回上次位置。
// 用「bookId+chapterIdx」做 key，滚动节流 800ms 写一次 localStorage（避免写爆）。
const SCROLL_POS_KEY = 'bk_scroll_pos';
function _scrollPosKey() {
  return currentBookId && currentChapterIdx >= 0 ? `${currentBookId}::${currentChapterIdx}` : '';
}
function _saveScrollPosThrottled() {
  if (!_scrollPosKey()) return;
  clearTimeout(_scrollSaveT);
  _scrollSaveT = setTimeout(() => {
    const c = $('content');
    if (!c) return;
    const max = c.scrollHeight - c.clientHeight;
    if (max <= 0) return;
    // 只记录「中间位置」：在顶 5% 或底 5% 视作「已读完/刚开始」，下次进来走默认行为
    const pct = c.scrollTop / max;
    if (pct < 0.05 || pct > 0.95) return;
    const map = safeGet(SCROLL_POS_KEY, {}) || {};
    map[_scrollPosKey()] = Math.round(c.scrollTop);
    if (Object.keys(map).length > 50) {
      // 上限 50 个章节的位置：超过则按插入顺序剪掉最早 10 个，防止长期使用撑爆 localStorage
      const keys = Object.keys(map);
      keys.slice(0, keys.length - 40).forEach(k => delete map[k]);
    }
    safeSet(SCROLL_POS_KEY, map);
  }, 800);
}
function _restoreScrollPos() {
  const k = _scrollPosKey();
  if (!k) return;
  const map = safeGet(SCROLL_POS_KEY, {}) || {};
  const saved = map[k];
  if (!saved || saved < 200) return; // 太靠顶（200px 内）不需要恢复，避免「几乎没滚还跳一下」的违和感
  // v3.21.3 已完成章节不再恢复位置：用户已标记已读 = 已经读完了，下次重温本应从开头看；
  // 否则一进入就跳到中间 + 弹「已回到上次阅读位置」toast，会让人困惑「我刚才没读完吗？」
  const book = MANIFEST?.books.find(b => b.id === currentBookId);
  const ch = book?.chapters[currentChapterIdx];
  if (ch && isRead(currentBookId, ch.file)) {
    // 顺手清掉残留位置，避免 map 越积越大
    delete map[k];
    safeSet(SCROLL_POS_KEY, map);
    return;
  }
  // 等待 layout 完成后再滚：文章刚 innerHTML 完，scrollHeight 还在算
  const tryRestore = () => {
    const c = $('content');
    if (!c) return;
    const max = c.scrollHeight - c.clientHeight;
    if (max <= 0) return;
    // 防御：保存值超过当前章节可滚动高度（章节内容可能改了），clamp 一下
    const target = Math.min(saved, max);
    c.scrollTo({ top: target, behavior: 'instant' });
    updateReadProgress();
    // 一句短 toast 告诉用户「我接着上次读」，避免「咦怎么直接跳到这里」的困惑
    showToast(`📍 已回到上次阅读位置（${Math.round(target / 100) * 100}px）`, 1600);
  };
  // 双 rAF：保证 innerHTML 完成 + 浏览器已 layout
  requestAnimationFrame(() => requestAnimationFrame(tryRestore));
}
function _clearScrollPosForCurrent() {
  if (!_scrollPosKey()) return;
  const map = safeGet(SCROLL_POS_KEY, {}) || {};
  delete map[_scrollPosKey()];
  safeSet(SCROLL_POS_KEY, map);
}

// ─── v3.14.2 阅读进度条（拖拽跳转） ─────────────────
function updateReadProgress() {
  const c = $('content');
  const bar = $('readProgress');
  if (!c || !bar) return;
  const scrollTop = c.scrollTop;
  const max = c.scrollHeight - c.clientHeight;
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / max) * 100))) : 0;
  const fill = $('rpFill');
  const thumb = $('rpThumb');
  if (fill) fill.style.width = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  bar.classList.toggle('show', max > 60 && (pct > 1 || max > 200));
}

let _rpDragging = false;
function _rpSetFromX(clientX) {
  const track = $('rpTrack');
  const c = $('content');
  if (!track || !c) return;
  const rect = track.getBoundingClientRect();
  const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const max = c.scrollHeight - c.clientHeight;
  c.scrollTop = (pct / 100) * max;
  const fill = $('rpFill');
  const thumb = $('rpThumb');
  const bubble = $('rpBubble');
  if (fill) fill.style.width = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  if (bubble) { bubble.textContent = Math.round(pct) + '%'; bubble.classList.add('show'); }
}
function _rpInitDrag() {
  const track = $('rpTrack');
  const bar = $('readProgress');
  const bubble = $('rpBubble');
  if (!track || !bar) return;
  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    _rpDragging = true;
    bar.setPointerCapture?.(e.pointerId);
    _rpSetFromX(e.clientX);
    if (bubble) bubble.classList.add('show');
  });
  bar.addEventListener('pointermove', (e) => {
    if (!_rpDragging) return;
    _rpSetFromX(e.clientX);
  });
  const stop = () => {
    if (!_rpDragging) return;
    _rpDragging = false;
    setTimeout(() => bubble?.classList.remove('show'), 600);
  };
  bar.addEventListener('pointerup', stop);
  bar.addEventListener('pointercancel', stop);
  track.addEventListener('touchstart', (e) => { if (e.touches[0]) _rpSetFromX(e.touches[0].clientX); }, {passive: true});
}





// ─── 角色系统（校长/教练/学员） ─────────
const ROLE_LSK = 'lamb_role_v1';
const ROLE_DATA_LSK = 'lamb_role_data_v1';
function loadRoleData() {
  try {
    const stored = JSON.parse(localStorage.getItem(ROLE_DATA_LSK));
    if (stored && stored.students && stored.coaches) return stored;
  } catch(e) {}
  // 🐏 以"今天"为锚点动态生成最后活跃日期 — 避免硬编码 2026-07 后所有学员看上去都是 N 天未动
  const today = new Date(); today.setHours(0,0,0,0);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const seed = {
    students: [
      { id:'s1', name:'小明', level:3, xp:245, chaptersRead:12, lastActive:daysAgo(0), quizScore:8 },
      { id:'s2', name:'小红', level:5, xp:480, chaptersRead:28, lastActive:daysAgo(1), quizScore:15 },
      { id:'s3', name:'小华', level:2, xp:120, chaptersRead:5,  lastActive:daysAgo(2), quizScore:3 },
      { id:'s4', name:'小芳', level:4, xp:360, chaptersRead:18, lastActive:daysAgo(5), quizScore:10 },
      { id:'s5', name:'小军', level:1, xp:50,  chaptersRead:2,  lastActive:daysAgo(12), quizScore:1 },
    ],
    coaches: [
      { id:'c1', name:'李教练', students:['s1','s2'], totalXp:1200 },
      { id:'c2', name:'王教练', students:['s3','s4'], totalXp:980 },
      { id:'c3', name:'张教练', students:['s5'], totalXp:650 },
    ],
    principal: { id:'p1', name:'总校长' },
  };
  setRoleData(seed);
  return seed;
}
function setRoleData(d) { try { localStorage.setItem(ROLE_DATA_LSK, JSON.stringify(d)); } catch(e) { console.warn('[setRoleData] failed:', e.message); } }
function getCurrentRole() { try { return JSON.parse(localStorage.getItem(ROLE_LSK)||'null'); } catch { return null; } }
function setCurrentRole(role, userId) { localStorage.setItem(ROLE_LSK, JSON.stringify({ role, userId, ts:Date.now() })); }

function openRoleCenter() {
  const cur = getCurrentRole();
  if (!cur) showRoleSelection();
  else if (cur.role === 'student') showStudentDashboard();
  else if (cur.role === 'coach') showCoachDashboard(cur.userId);
  else if (cur.role === 'principal') showPrincipalDashboard();
}

function showRoleSelection() {
  showOverlay('panel-roles', '🎭 选择身份', `
    <div style="display:grid;gap:10px">
      ${[
        { role:'principal', icon:'🏛️', name:'校长', desc:'查看所有学员和教练的总览' },
        { role:'coach', icon:'👨‍🏫', name:'教练员', desc:'查看所带学员的成长' },
        { role:'student', icon:'🧑‍🎓', name:'学员', desc:'查看自己的成长记录' }
      ].map(r => `
        <div class="calc-card" onclick="selectRole('${r.role}')" style="padding:14px;cursor:pointer;display:flex;align-items:center;gap:12px">
          <div style="font-size:30px">${r.icon}</div>
          <div style="flex:1"><div style="font-size:14px;font-weight:600">${r.name}</div><div style="font-size:10px;color:var(--text3)">${r.desc}</div></div>
          <div style="font-size:18px">→</div>
        </div>`).join('')}
    </div>
  `);
}

function selectRole(role) {
  const data = loadRoleData();
  if (role === 'student') {
    setCurrentRole('student', 'self');
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    showStudentDashboard();
  } else if (role === 'coach') {
    showOverlay('panel-coach-pick', '👨‍🏫 选择教练身份', `
      <div style="display:grid;gap:8px">
        ${data.coaches.map(c => `
          <div class="calc-card" onclick="pickCoach('${c.id}')" style="padding:12px;cursor:pointer;display:flex;align-items:center;gap:10px">
            <div style="font-size:24px">👨‍🏫</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${c.name}</div>
              <div style="font-size:10px;color:var(--text3)">带 ${c.students.length} 名学员 · 总XP ${c.totalXp}</div>
            </div>
            <div style="font-size:14px">→</div>
          </div>`).join('')}
      </div>
    `);
  } else if (role === 'principal') {
    setCurrentRole('principal', data.principal.id);
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    showPrincipalDashboard();
  }
}

function pickCoach(coachId) {
  setCurrentRole('coach', coachId);
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  showCoachDashboard(coachId);
}

function showStudentDashboard() {
  const r = initRP();
  showView('book');
  currentModule = 'role-dashboard';
  navStack.push({view:'dashboard'});
  historyPush('role-student', {});
  const totalCh = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0) : 0;
  const p = getP();
  let read = 0;
  if (MANIFEST) for (const b of MANIFEST.books) read += (p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;
  // ── 计算今日训练任务：根据已读进度推荐下一章 ──
  let nextBook = null, nextChapter = null, nextIdx = -1;
  if (MANIFEST) {
    // 优先级：badminton → nsca-cpt → psychology → finance → engineering → yin-yang
    const priority = ['badminton','nsca-cpt','psychology','finance','engineering-mechanics','yin-yang'];
    for (const bid of priority) {
      const b = MANIFEST.books.find(x=>x.id===bid);
      if (!b) continue;
      const readFiles = p[b.id] || [];
      const unreadIdx = b.chapters.findIndex(c => !readFiles.includes(c.file));
      if (unreadIdx >= 0) { nextBook = b; nextChapter = b.chapters[unreadIdx]; nextIdx = unreadIdx; break; }
    }
  }
  const readPct = totalCh ? Math.round(read / totalCh * 100) : 0;
  // ── 计算连续学习天数（基于 p._streak） ──
  const streakMap = p._streak || {};
  const today = new Date(); today.setHours(0,0,0,0);
  const dayKey = (d) => d.toISOString().slice(0,10);
  let currentStreak = 0;
  // 从今天往回数连续天数；若今天未读但昨天读了，仍保留 streak（宽容到昨天）
  for (let i=0; i<365; i++) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (streakMap[dayKey(d)]) currentStreak++;
    else if (i === 0) continue; // 今天还没读不打断
    else break;
  }
  // 计算累计活跃天数（用于总览）
  const totalActiveDays = Object.values(streakMap).filter(Boolean).length;
  // 近 14 天热力图数据（用于可视化）
  const heatmap14 = [];
  for (let i=13; i>=0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    heatmap14.push({ date: dayKey(d), label: ['日','一','二','三','四','五','六'][d.getDay()], active: !!streakMap[dayKey(d)] });
  }
  // 根据进度决定训练建议
  let dailyHint = '';
  if (read === 0) {
    dailyHint = '? 一切从「握拍」开始，建立正确的动作模式是终身受益的事。';
  } else if (readPct < 20) {
    dailyHint = '? 基础期：专注技术动作定型，不要急。每个动作重复100次比学10个新动作更有效。';
  } else if (readPct < 50) {
    dailyHint = '? 进阶期：开始重视体能和战术，营养恢复板块别忽略。';
  } else if (readPct < 80) {
    dailyHint = '? 提高期：把学到的东西放进实战，多打比赛多复盘。';
  } else {
    dailyHint = '? 精进期：查漏补缺，回顾薄弱环节，从心理学/金融/工程力学中找跨领域灵感。';
  }
  // 连续学习激励语
  let streakHint = '';
  if (currentStreak === 0) streakHint = '今天还没阅读，读一章开启连胜 🔥';
  else if (currentStreak === 1) streakHint = '起步日！坚持 7 天解锁「周行者」成就';
  else if (currentStreak < 7) streakHint = `再坚持 ${7-currentStreak} 天解锁「周行者」`;
  else if (currentStreak < 30) streakHint = `稳定输出！距「月度习惯」还差 ${30-currentStreak} 天`;
  else if (currentStreak < 100) streakHint = `🏆 已是真习惯！距「百日筑基」还差 ${100-currentStreak} 天`;
  else streakHint = '👑 百日筑基达成！你是真正的修行者';
  const dailyTaskHtml = nextBook && nextChapter ? `
    <div class="calc-card" style="grid-column:1/-1;padding:14px;background:linear-gradient(135deg,var(--bg2),rgba(255,214,10,.06));border:2px solid var(--gold)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="font-size:22px">🎯</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">今日训练任务</div>
          <div style="font-size:10px;color:var(--text3)">基于你的已读进度自动推荐</div>
        </div>
        <div style="font-size:10px;background:var(--gold);color:#000;padding:2px 8px;border-radius:8px;font-weight:600">NEXT</div>
      </div>
      <div style="background:var(--bg3);padding:10px;border-radius:6px;margin-bottom:8px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:2px">📘 ${nextBook.title} · 第${nextIdx+1}章</div>
        <div style="font-size:13px;font-weight:600">${nextChapter.title}</div>
      </div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:8px">${dailyHint}</div>
      <button onclick="startDailyTraining('${nextBook.id}', ${nextIdx})" class="tb-btn" style="width:100%;background:var(--gold);color:#000;font-weight:600">▶ 开始今日训练</button>
    </div>
  ` : `
    <div class="calc-card" style="grid-column:1/-1;padding:14px;background:linear-gradient(135deg,var(--bg2),rgba(61,214,140,.08));border:2px solid var(--green);text-align:center">
      <div style="font-size:36px">🎉</div>
      <div style="font-size:14px;font-weight:600;margin:6px 0">全部章节已通关！</div>
      <div style="font-size:11px;color:var(--text3)">进入教练系统持续精进，或挑战更多实战</div>
    </div>
  `;

  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🧑‍🎓 我的成长</h1>
    <div class="vm">学员视角 · 你的训练成长记录</div>`;
  // 能力水平（5维加权）
  const ability = calcAbilityScore();
  const abilLv = getAbilityLevel(ability.score);
  const dimHtml = (label, val, color) => `
    <div style="flex:1">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:2px"><span>${label}</span><span>${Math.round(val)}%</span></div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100,val)}%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;
  $('contentGrid').innerHTML = `
    <div class="calc-card" style="grid-column:1/-1;padding:16px;background:linear-gradient(135deg,var(--bg2),${abilLv.color}11);border:2px solid ${abilLv.color}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-size:42px;line-height:1">${abilLv.emoji}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-size:14px;color:var(--text3)">能力水平</div>
            <div style="font-size:22px;font-weight:700;color:${abilLv.color}">Lv.${abilLv.lv} ${abilLv.name}</div>
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${abilLv.desc} · 能力分 ${ability.score}/100</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:var(--text3)">下一段位</div>
          <div style="font-size:13px;font-weight:600">${abilLv.lv<6?ABILITY_LEVELS[abilLv.lv].name:'已封顶 👑'}</div>
        </div>
      </div>
      <div style="position:relative;height:14px;background:var(--bg3);border-radius:7px;overflow:hidden;margin-bottom:8px">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${ability.score}%;background:linear-gradient(90deg, ${abilLv.color}, ${abilLv.color}cc);transition:width .6s cubic-bezier(.34,1.56,.64,1);border-radius:7px"></div>
        ${[15,30,50,70,88].map(t => `<div style="position:absolute;left:${t}%;top:-2px;bottom:-2px;width:1px;background:var(--border2);opacity:.5"></div>`).join('')}
        <div style="position:absolute;right:6px;top:0;bottom:0;display:flex;align-items:center;font-size:10px;color:#fff;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.3)">${ability.score}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${dimHtml('📖 阅读', ability.dims.read, '#4f9aff')}
        ${dimHtml('🏋️ 模块', ability.dims.modules, '#3dd68c')}
        ${dimHtml('🧪 测验', ability.dims.quiz, '#a855f7')}
        ${dimHtml('🔥 连学', ability.dims.streak, '#f59e0b')}
        ${dimHtml('🥋 方法', ability.dims.methods, '#fbbf24')}
      </div>
    </div>
    ${dailyTaskHtml}
    <div class="calc-card" style="padding:14px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📖 阅读进度</div>
      <div style="font-size:24px;font-weight:700;color:var(--blue)">${read} / ${totalCh}</div>
      <div style="font-size:10px;color:var(--text3)">已读章节 / 总章节 · ${readPct}%</div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;margin-top:6px;overflow:hidden">
        <div style="height:100%;width:${(read/Math.max(totalCh,1))*100}%;background:var(--blue)"></div>
      </div>
    </div>
    <div class="calc-card" style="grid-column:1/-1;padding:14px;background:linear-gradient(135deg,var(--bg2),rgba(255,107,53,.05));border:1px solid ${currentStreak>=7?'var(--orange)':'var(--border)'}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-size:36px;line-height:1">🔥</div>
        <div style="flex:1">
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-size:24px;font-weight:700;color:var(--orange)">${currentStreak}</div>
            <div style="font-size:11px;color:var(--text3)">天连续学习</div>
            <div style="font-size:10px;color:var(--text3);margin-left:auto">累计活跃 ${totalActiveDays} 天</div>
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;line-height:1.5">${streakHint}</div>
        </div>
      </div>
      <div style="display:flex;gap:4px;justify-content:space-between;background:var(--bg3);padding:8px;border-radius:6px">
        ${heatmap14.map((d,i) => {
          const isToday = i === heatmap14.length - 1;
          const bg = d.active ? (isToday ? 'var(--orange)' : 'var(--green)') : 'var(--bg2)';
          const color = d.active ? '#fff' : 'var(--text3)';
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px" title="${d.date}${d.active?' · 已学习':''}">
            <div style="width:100%;height:18px;background:${bg};border-radius:3px;${isToday?'box-shadow:0 0 0 1px var(--orange)':''}"></div>
            <div style="font-size:9px;color:${color}">${d.label}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:9px;color:var(--text3);text-align:center;margin-top:6px">近 14 天学习热力图（绿/橙=已学，灰=未学）</div>
    </div>
    <div class="calc-card" style="padding:14px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🧪 测验成绩</div>
      <div style="font-size:24px;font-weight:700;color:var(--purple)">${r.totalQuizCorrect||0}</div>
      <div style="font-size:10px;color:var(--text3)">累计答对题数</div>
    </div>
    <div class="calc-card" style="padding:14px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🏆 成就</div>
      <div style="font-size:24px;font-weight:700;color:var(--gold)">${Object.values(r.achievements||{}).filter(v=>v).length}</div>
      <div style="font-size:10px;color:var(--text3)">已解锁</div>
    </div>
    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:11px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button onclick="localStorage.removeItem(ROLE_LSK);openRoleCenter()" class="tb-btn">🔄 切换身份</button>
      <button onclick="openCoach()" class="tb-btn" style="background:var(--gold);color:#000;font-weight:600">👨‍🏫 教练工作台</button>
    </div>
  `;
  updateProgress();
}

function showCoachDashboard(coachId) {
  const data = loadRoleData();
  const coach = data.coaches.find(c=>c.id===coachId);
  if (!coach) return;
  showView('book');
  currentModule = 'role-dashboard';
  navStack.push({view:'dashboard'});
  historyPush('role-coach', {coachId});
  const students = coach.students.map(sid=>data.students.find(s=>s.id===sid)).filter(Boolean);
  // 计算活跃状态 + 排序：需关注的（>7天未活跃）排在最前
  const now = Date.now();
  const annotated = students.map(s => {
    const days = Math.floor((now - new Date(s.lastActive).getTime()) / 86400000);
    let status = 'ok'; // 活跃
    let statusLabel = '✅ 活跃';
    if (days > 7) { status = 'urgent'; statusLabel = `🔴 ${days}天未动`; }
    else if (days >= 3) { status = 'warn'; statusLabel = `🟡 ${days}天未动`; }
    return { ...s, _days: days, _status: status, _statusLabel: statusLabel };
  });
  annotated.sort((a, b) => {
    const order = { urgent: 0, warn: 1, ok: 2 };
    return order[a._status] - order[b._status];
  });
  const urgentCount = annotated.filter(s => s._status === 'urgent').length;
  const warnCount = annotated.filter(s => s._status === 'warn').length;
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>👨‍🏫 ${coach.name}的学员</h1>
    <div class="vm">教练视角 · 所带 ${students.length} 名学员 · ${urgentCount>0?`🔴 ${urgentCount}名需关注`:warnCount>0?`🟡 ${warnCount}名待跟进`:'✅ 全部活跃'}</div>`;
  $('contentGrid').innerHTML = `
    ${annotated.length > 0 ? `
      <div class="calc-card" style="grid-column:1/-1;padding:10px 14px;background:linear-gradient(135deg,var(--bg2),rgba(255,107,107,.04));border:1px solid ${urgentCount>0?'var(--red)':warnCount>0?'var(--orange)':'var(--green)'}">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
          <span><strong>本周关注</strong></span>
          <span style="color:var(--text3)">🔴 ${urgentCount} · 🟡 ${warnCount} · ✅ ${annotated.length - urgentCount - warnCount}</span>
        </div>
      </div>
    ` : ''}
    ${annotated.map(s => {
      const borderColor = s._status === 'urgent' ? 'var(--red)' : s._status === 'warn' ? 'var(--orange)' : 'var(--blue)';
      const bgTint = s._status === 'urgent' ? 'rgba(255,107,107,.05)' : s._status === 'warn' ? 'rgba(255,184,77,.05)' : '';
      // 能力水平（教练端能直接看到）
      const sAbility = (() => {
        // 综合：等级占位 + 章节占比 + 测验表现
        const totalChForS = 90; // 估算：6书约90章
        const readPct = Math.min(1, (s.chaptersRead||0) / totalChForS);
        const quizPct = Math.min(1, Math.log10((s.quizScore||0)+1)/Math.log10(201));
        const lvlPct = Math.min(1, (s.level||1)/30);
        const days = s._days || 0;
        const streakPct = Math.min(1, days <= 7 ? days/7 : (7 - Math.min(7, days-7))/7);
        const score = readPct*25 + lvlPct*25 + quizPct*20 + streakPct*15 + readPct*15;
        return Math.round(Math.min(100, Math.max(0, score)));
      })();
      const sAbilLv = ABILITY_LEVELS.find(l => sAbility >= l.min && sAbility <= l.max) || ABILITY_LEVELS[0];
      return `
      <div class="calc-card" style="padding:14px;border-left:3px solid ${borderColor};${bgTint?`background:linear-gradient(135deg,var(--bg2),${bgTint})`:''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:600">${s.name} ${s._status==='urgent'?'<span style="font-size:10px;background:var(--red);color:#fff;padding:1px 6px;border-radius:6px;margin-left:4px">需关注</span>':''}</div>
            <div style="font-size:10px;color:var(--text3)">Lv.${s.level} · ${s.xp} XP · ${s._statusLabel}</div>
          </div>
          <div style="font-size:18px">🧑‍🎓</div>
        </div>
        <div style="background:var(--bg3);border-radius:6px;padding:6px 8px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-bottom:4px">
            <span style="color:var(--text3)">能力水平</span>
            <span style="font-weight:600;color:${sAbilLv.color}">${sAbilLv.emoji} Lv.${sAbilLv.lv} ${sAbilLv.name} · ${sAbility}/100</span>
          </div>
          <div style="position:relative;height:8px;background:var(--bg2);border-radius:4px;overflow:hidden">
            <div style="position:absolute;left:0;top:0;bottom:0;width:${sAbility}%;background:linear-gradient(90deg,${sAbilLv.color},${sAbilLv.color}cc);border-radius:4px"></div>
            ${[15,30,50,70,88].map(t => `<div style="position:absolute;left:${t}%;top:-1px;bottom:-1px;width:1px;background:var(--border);opacity:.4"></div>`).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px">
          <div style="background:var(--bg3);padding:6px;border-radius:4px;text-align:center">
            <div style="font-weight:600;color:var(--blue)">${s.chaptersRead}</div>
            <div style="font-size:9px;color:var(--text3)">已读章节</div>
          </div>
          <div style="background:var(--bg3);padding:6px;border-radius:4px;text-align:center">
            <div style="font-weight:600;color:var(--purple)">${s.quizScore}</div>
            <div style="font-size:9px;color:var(--text3)">测验答对</div>
          </div>
          <div style="background:var(--bg3);padding:6px;border-radius:4px;text-align:center">
            <div style="font-weight:600;color:var(--green)">Lv.${s.level}</div>
            <div style="font-size:9px;color:var(--text3)">训练等级</div>
          </div>
        </div>
        ${s._status === 'urgent' ? `<div style="margin-top:6px;font-size:10px;color:var(--red);text-align:center;padding:4px;background:rgba(255,107,107,.06);border-radius:4px">💡 建议本周主动联系，了解训练状态</div>` : ''}
      </div>
    `}).join('') || '<div class="calc-card" style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text3)">暂无学员，点击右上「⚙️ 管理员设置」分配</div>'}
    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:11px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button onclick="openAdminSettings()" class="tb-btn">⚙️ 管理员设置</button>
      <button onclick="openCoach()" class="tb-btn" style="background:var(--gold);color:#000;font-weight:600">👨‍🏫 教练工作台</button>
      <button onclick="localStorage.removeItem(ROLE_LSK);openRoleCenter()" class="tb-btn">🔄 切换身份</button>
    </div>
  `;
  updateProgress();
}

function showPrincipalDashboard() {
  const data = loadRoleData();
  showView('book');
  currentModule = 'role-dashboard';
  navStack.push({view:'dashboard'});
  historyPush('role-principal', {});
  const totalStudents = data.students.length;
  const avgLevel = totalStudents ? (data.students.reduce((s,x)=>s+x.level,0)/totalStudents).toFixed(1) : '0';
  const avgXp = totalStudents ? Math.round(data.students.reduce((s,x)=>s+x.xp,0)/totalStudents) : 0;
  const activeLast7Days = data.students.filter(s=>{
    const days = (Date.now() - new Date(s.lastActive).getTime())/86400000;
    return days <= 7;
  }).length;
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🏛️ ${data.principal.name} · 总览</h1>
    <div class="vm">校长视角 · 学员与教练的成长总览</div>`;
  // 校长看所有学员的平均能力
  const principalAbility = (() => {
    if (!data.students.length) return {score:0, lv:ABILITY_LEVELS[0]};
    const totalChForS = 90;
    const scores = data.students.map(s => {
      const readPct = Math.min(1, (s.chaptersRead||0) / totalChForS);
      const quizPct = Math.min(1, Math.log10((s.quizScore||0)+1)/Math.log10(201));
      const lvlPct = Math.min(1, (s.level||1)/30);
      const days = Math.floor((Date.now() - new Date(s.lastActive).getTime())/86400000);
      const streakPct = Math.min(1, days <= 7 ? days/7 : 0);
      return readPct*25 + lvlPct*25 + quizPct*20 + streakPct*15 + readPct*15;
    });
    const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
    const score = Math.round(Math.min(100, Math.max(0, avg)));
    return { score, lv: ABILITY_LEVELS.find(l => score >= l.min && score <= l.max) || ABILITY_LEVELS[0] };
  })();
  $('contentGrid').innerHTML = `
    <div class="calc-card" style="padding:14px;grid-column:1/-1;background:linear-gradient(135deg,var(--bg2),${principalAbility.lv.color}11);border:2px solid ${principalAbility.lv.color}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-size:42px">${principalAbility.lv.emoji}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-size:14px;color:var(--text3)">全平均水平</div>
            <div style="font-size:22px;font-weight:700;color:${principalAbility.lv.color}">Lv.${principalAbility.lv.lv} ${principalAbility.lv.name}</div>
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${principalAbility.lv.desc} · 能力分 ${principalAbility.score}/100</div>
        </div>
        <div style="font-size:11px;color:var(--text3);text-align:right">
          ${totalStudents}名学员<br>${data.coaches.length}名教练
        </div>
      </div>
      <div style="position:relative;height:12px;background:var(--bg3);border-radius:6px;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${principalAbility.score}%;background:linear-gradient(90deg,${principalAbility.lv.color},${principalAbility.lv.color}cc);transition:width .6s"></div>
        ${[15,30,50,70,88].map(t => `<div style="position:absolute;left:${t}%;top:-1px;bottom:-1px;width:1px;background:var(--border2);opacity:.5"></div>`).join('')}
        <div style="position:absolute;right:8px;top:0;bottom:0;display:flex;align-items:center;font-size:10px;color:#fff;font-weight:600">${principalAbility.score}</div>
      </div>
    </div>
    <div class="calc-card" style="padding:14px;grid-column:1/-1;background:linear-gradient(135deg,var(--bg2),rgba(255,214,10,.03));border:1px dashed var(--gold)">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">📊 全局概览</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <div style="text-align:center"><div style="font-size:22px;font-weight:700;color:var(--blue)">${totalStudents}</div><div style="font-size:10px;color:var(--text3)">学员</div></div>
        <div style="text-align:center"><div style="font-size:22px;font-weight:700;color:var(--green)">${data.coaches.length}</div><div style="font-size:10px;color:var(--text3)">教练</div></div>
        <div style="text-align:center"><div style="font-size:22px;font-weight:700;color:var(--purple)">${avgLevel}</div><div style="font-size:10px;color:var(--text3)">平均等级</div></div>
        <div style="text-align:center"><div style="font-size:22px;font-weight:700;color:var(--orange)">${activeLast7Days}</div><div style="font-size:10px;color:var(--text3)">7天内活跃</div></div>
      </div>
    </div>
    <div class="calc-card" style="padding:14px;grid-column:1/-1">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">👨‍🏫 教练员列表</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
        ${data.coaches.map(c => {
          const cStudents = c.students.map(sid=>data.students.find(s=>s.id===sid)).filter(Boolean);
          const cAvgLvl = cStudents.length ? (cStudents.reduce((s,x)=>s+x.level,0)/cStudents.length).toFixed(1) : '-';
          return `<div style="background:var(--bg3);padding:10px;border-radius:6px">
            <div style="font-size:13px;font-weight:600">${c.name}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">带 ${cStudents.length} 名学员 · 平均 Lv.${cAvgLvl}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="calc-card" style="padding:14px;grid-column:1/-1">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🧑‍🎓 学员列表</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <tr style="background:var(--bg3)">
            <th style="padding:6px;text-align:left">姓名</th>
            <th style="padding:6px">能力</th>
            <th style="padding:6px">等级</th>
            <th style="padding:6px">XP</th>
            <th style="padding:6px">已读</th>
            <th style="padding:6px">测验</th>
            <th style="padding:6px">最近活跃</th>
            <th style="padding:6px">教练</th>
          </tr>
          ${data.students.map(s => {
            const coach = data.coaches.find(c=>c.students.includes(s.id));
            const days = Math.floor((Date.now() - new Date(s.lastActive).getTime())/86400000);
            const activeColor = days <= 1 ? 'var(--green)' : days <= 7 ? 'var(--orange)' : 'var(--text3)';
            // 能力分（学员行内）
            const totalChForS = 90;
            const readPct = Math.min(1, (s.chaptersRead||0) / totalChForS);
            const quizPct = Math.min(1, Math.log10((s.quizScore||0)+1)/Math.log10(201));
            const lvlPct = Math.min(1, (s.level||1)/30);
            const streakPct = Math.min(1, days <= 7 ? days/7 : 0);
            const sScore = Math.round(Math.min(100, Math.max(0, readPct*25+lvlPct*25+quizPct*20+streakPct*15+readPct*15)));
            const sLvReal = ABILITY_LEVELS.find(l => sScore >= l.min && sScore <= l.max) || ABILITY_LEVELS[0];
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px;font-weight:600">${s.name}</td>
              <td style="padding:6px">
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="font-size:11px;color:${sLvReal.color};font-weight:600">${sLvReal.emoji} Lv.${sLvReal.lv}</span>
                  <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;min-width:40px">
                    <div style="height:100%;width:${sScore}%;background:${sLvReal.color}"></div>
                  </div>
                </div>
              </td>
              <td style="padding:6px;text-align:center">Lv.${s.level}</td>
              <td style="padding:6px;text-align:center;color:var(--blue)">${s.xp}</td>
              <td style="padding:6px;text-align:center">${s.chaptersRead}</td>
              <td style="padding:6px;text-align:center;color:var(--purple)">${s.quizScore}</td>
              <td style="padding:6px;text-align:center;color:${activeColor}">${days === 0 ? '今天' : days+'天前'}</td>
              <td style="padding:6px;text-align:center">${coach?.name||'-'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" style="padding:20px;text-align:center;color:var(--text3)">暂无学员</td></tr>'}
        </table>
      </div>
    </div>
    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:11px;display:flex;gap:8px;justify-content:center">
      <button onclick="openAdminSettings()" class="tb-btn">⚙️ 管理员设置</button>
      <button onclick="localStorage.removeItem(ROLE_LSK);openRoleCenter()" class="tb-btn">🔄 切换身份</button>
    </div>
  `;
  updateProgress();
}

function openAdminSettings() {
  const cursorEnabled = document.body.classList.contains('badminton-cursor');
  const data = loadRoleData();
  showOverlay('panel-admin', '⚙️ 管理员设置', `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:11px;color:var(--text3);text-align:center">本设备数据 · 可添加/编辑学员、教练、分配关系</div>
      
      <!-- 羽毛球拍光标设置 -->
      <div class="calc-card" style="padding:12px;background:linear-gradient(135deg,var(--bg2),rgba(82,183,136,0.08));border:1px solid var(--green)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;font-weight:600">🏸 羽毛球拍光标</div>
          <button onclick="const en=toggleBadmintonCursor();this.textContent=en?'✅ 已开启':'⚪ 关闭';this.style.background=en?'var(--green)':'var(--bg3)';this.style.color=en?'#fff':'var(--text)'" class="tb-btn" style="font-size:11px;background:${cursorEnabled?'var(--green)':'var(--bg3)'};color:${cursorEnabled?'#fff':'var(--text)'}">${cursorEnabled?'✅ 已开启':'⚪ 关闭'}</button>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px">将鼠标光标替换为羽毛球拍样式</div>
      </div>
      
      <div class="calc-card" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:13px;font-weight:600">🧑‍🎓 学员 (${data.students.length})</div>
          <button onclick="addStudent()" class="tb-btn" style="font-size:11px">+ 新增</button>
        </div>
        ${data.students.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg3);border-radius:4px;margin-bottom:4px;font-size:11px">
            <div><strong>${s.name}</strong> · Lv.${s.level} · ${s.xp}XP · ${s.chaptersRead}章</div>
            <button onclick="deleteStudent('${s.id}')" class="tb-btn" style="font-size:10px;background:var(--red);color:#fff">删除</button>
          </div>
        `).join('')}
      </div>
      <div class="calc-card" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:13px;font-weight:600">👨‍🏫 教练 (${data.coaches.length})</div>
          <button onclick="addCoach()" class="tb-btn" style="font-size:11px">+ 新增</button>
        </div>
        ${data.coaches.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg3);border-radius:4px;margin-bottom:4px;font-size:11px">
            <div><strong>${c.name}</strong> · 带 ${c.students.length} 人</div>
            <button onclick="deleteCoach('${c.id}')" class="tb-btn" style="font-size:10px;background:var(--red);color:#fff">删除</button>
          </div>
        `).join('')}
      </div>
      <div class="calc-card" style="padding:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">🔗 分配教练-学员</div>
        ${data.coaches.map(c => `
          <div style="margin-bottom:8px">
            <div style="font-size:11px;font-weight:600">${c.name}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
              ${data.students.map(s => {
                const assigned = c.students.includes(s.id);
                return `<button onclick="toggleAssignment('${c.id}','${s.id}')" style="font-size:10px;padding:3px 8px;border-radius:12px;border:1px solid ${assigned?'var(--green)':'var(--border)'};background:${assigned?'var(--green)':'var(--bg3)'};color:${assigned?'#fff':'var(--text2)'};cursor:pointer">${s.name}${assigned?' ✓':''}</button>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="calc-card" style="padding:12px;border:1px dashed var(--red)">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--red)">⚠️ 数据管理</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button onclick="exportRoleData()" class="tb-btn" style="font-size:11px">📤 导出JSON</button>
          <button onclick="resetRoleData()" class="tb-btn" style="font-size:11px;background:var(--red);color:#fff">🔄 重置默认</button>
        </div>
      </div>
    </div>
  `);
}

function addStudent() {
  showPrompt('学员姓名', (name) => {
    if (!name) return;
    const data = loadRoleData();
    const id = 's' + Date.now();
    data.students.push({ id, name, level:1, xp:0, chaptersRead:0, lastActive:new Date().toISOString().slice(0,10), quizScore:0 });
    setRoleData(data); openAdminSettings();
  }, { title: '添加学员', placeholder: '如：张三' });
}
function addCoach() {
  showPrompt('教练姓名', (name) => {
    if (!name) return;
    const data = loadRoleData();
    const id = 'c' + Date.now();
    data.coaches.push({ id, name, students:[], totalXp:0 });
    setRoleData(data); openAdminSettings();
  }, { title: '添加教练', placeholder: '如：李教练' });
}
function deleteStudent(id) {
  showConfirm('确认删除该学员？此操作不可撤销', () => {
    const data = loadRoleData();
    data.students = data.students.filter(s=>s.id!==id);
    data.coaches.forEach(c=>c.students = c.students.filter(sid=>sid!==id));
    setRoleData(data); openAdminSettings();
  }, { danger: true, okText: '删除' });
}
function deleteCoach(id) {
  showConfirm('确认删除该教练？此操作不可撤销', () => {
    const data = loadRoleData();
    data.coaches = data.coaches.filter(c=>c.id!==id);
    setRoleData(data); openAdminSettings();
  }, { danger: true, okText: '删除' });
}
function toggleAssignment(coachId, studentId) {
  const data = loadRoleData();
  const coach = data.coaches.find(c=>c.id===coachId);
  if (!coach) return;
  const idx = coach.students.indexOf(studentId);
  if (idx >= 0) coach.students.splice(idx, 1);
  else coach.students.push(studentId);
  setRoleData(data); openAdminSettings();
}
function exportRoleData() {
  const data = loadRoleData();
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(()=>showToast('✅ 已复制 JSON 到剪贴板', 2000));
}
function resetRoleData() {
  showConfirm('确认重置为默认数据？当前数据将丢失，且不可恢复', () => {
    localStorage.removeItem(ROLE_DATA_LSK);
    loadRoleData(); openAdminSettings();
    showToast('🔄 已重置为默认数据', 2000);
  }, { danger: true, okText: '重置' });
}

// ─── 全局键盘快捷键 ──────────────────────────────────────
// Esc/Backspace 关闭弹窗 · Ctrl+K 打开搜索 · ←/→ 章节翻页 · Home 回首页
function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

function closeTopOverlay() {
  const overlays = document.querySelectorAll('.overlay');
  if (!overlays.length) return false;
  // 关闭最顶层（最后添加的）
  overlays[overlays.length - 1].remove();
  return true;
}

document.addEventListener('keydown', (e) => {
  // 让 input/textarea/contenteditable 内的按键不触发全局快捷键
  if (isTypingTarget(e.target)) {
    // 例外：Esc 仍可关闭弹窗
    if (e.key === 'Escape') closeTopOverlay();
    return;
  }

  // Esc → 关闭最顶层弹窗；如无弹窗则尝试返回上一页
  if (e.key === 'Escape') {
    if (closeTopOverlay()) { e.preventDefault(); return; }
    // 抽屉模式下也关闭侧边栏
    if (typeof sidebarOpen !== 'undefined' && sidebarOpen && window.innerWidth <= 1023) {
      toggleSidebar(false);
      e.preventDefault();
      return;
    }
    if (typeof navStack !== 'undefined' && navStack.length) {
      e.preventDefault(); goBack();
    }
    return;
  }

  // Ctrl/Cmd + K → 打开搜索
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (typeof openSearch === 'function') openSearch();
    return;
  }

  // 单独按 / 打开搜索（GitHub/VSCode 风格）
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    if (typeof openSearch === 'function') openSearch();
    return;
  }

  // v3.18.9 阅读器内 J/K 跳到上一/下一节 H2：长章节不必滚轮也能一段段跳
  // 只在阅读器视图生效；输入态已由 isTypingTarget 拦截，不会误触
  if (currentModule === 'reader' && (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    gotoTocByOffset(e.key === 'j' || e.key === 'J' ? 1 : -1);
    return;
  }

  // v3.22.1 阅读器内 N / Shift+N 循环跳转搜索匹配：长章节搜「营养」可能命中 20+ 处，
  // 只看首个高亮 = 退动滚轮；n 跳下一个 / Shift+N 上一个，不限修饰键干预 (与 j/k 风格一致)
  // 只在阅读器视图 + 有匹配时生效；输入态已由 isTypingTarget 拦截；任何读者弹窗中不触发
  if (currentModule === 'reader' && _searchMatches.length > 0 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    gotoSearchMatch(e.shiftKey ? -1 : 1);
    return;
  }

  // Backspace 在非输入态 → 应用内后退
  if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    if (typeof goBack === 'function') { e.preventDefault(); goBack(); }
    return;
  }

  // Alt+← 后退（传统桌面浏览器语义）
  if (e.altKey && e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (typeof goBack === 'function') goBack();
    return;
  }

  // Ctrl+Shift+T 切换主题
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'T' || e.key === 't')) {
    e.preventDefault();
    if (typeof toggleTheme === 'function') toggleTheme();
    return;
  }

  // Ctrl+Shift+S 打开训练报告
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'S' || e.key === 's')) {
    e.preventDefault();
    if (typeof openStats === 'function') openStats();
    return;
  }

  // Ctrl + - / = / 0 字号（与浏览器缩放语义一致）
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      if (typeof increaseFont === 'function') increaseFont();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      if (typeof decreaseFont === 'function') decreaseFont();
      return;
    }
    if (e.key === '0') {
      e.preventDefault();
      if (typeof resetFont === 'function') resetFont();
      return;
    }
  }

  // Home 键 → 回首页（与右下角 Home FAB 等价）
  if (e.key === 'Home' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (typeof goHome === 'function') goHome();
    return;
  }

  // ← / → 章节翻页（仅在阅读器视图）
  const inReader = currentBookId && currentChapterIdx >= 0;
  if (inReader && typeof prevChapter === 'function' && typeof nextChapter === 'function') {
    if (e.key === 'ArrowLeft' && currentChapterIdx > 0) {
      e.preventDefault(); prevChapter();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); nextChapter();
    }
  }

  // a11y: Enter/Space 触发当前焦点 [role="button"][tabindex="0"] 的 onclick
  // 让所有「div 当按钮」键盘可达，零侵入、未来加新元素自动生效
  if (e.key === 'Enter' || e.key === ' ') {
    const el = document.activeElement;
    if (el && el.getAttribute && el.getAttribute('role') === 'button'
        && el.getAttribute('tabindex') === '0'
        && typeof el.click === 'function') {
      // 避免双触发：元素已有 onkeydown 自处理时跳过（按其 own handler 优先）
      if (typeof el.onkeydown === 'function') return;
      e.preventDefault();
      el.click();
    }
  }
});

// ─── 快捷键帮助面板（? 键弹出）────────────────────
// v3.21.4 补全：原列表漏掉了 j/k H2 跳转、Ctrl+Shift+S 报告、Ctrl+Shift+T 主题、Ctrl+Home 首页
// v3.22.1 补 N / Shift+N 搜索匹配跳转
// 按使用频率排序：搜索 / 关闭 / 翻页 / 跳转 / 工具
const SHORTCUT_HELP = [
  { k: '/  or  Ctrl+K', d: '🔍 打开搜索' },
  { k: 'Esc', d: '✕ 关闭弹窗 / 侧边栏 / 返回' },
  { k: '←  /  →', d: '📖 上一节 / 下一节' },
  { k: 'J  /  K', d: '📑 阅读器内跳到 下一/上一节标题' },
  { k: 'N  /  Shift+N', d: '🔍 搜索匹配 下一/上一个（仅阅读器）' },
  { k: 'Ctrl + Home', d: '🏠 回首页' },
  { k: 'Backspace  /  Alt+←', d: '← 后退' },
  { k: 'Ctrl + Shift + T', d: '🌓 切换主题' },
  { k: 'Ctrl + Shift + S', d: '📊 训练报告' },
  { k: 'Ctrl + +/-/0', d: '🔠 字号 放大/缩小/重置' },
  { k: '?', d: '⌨️ 打开本帮助' },
];
function openShortcutHelp() {
  const rows = SHORTCUT_HELP.map(s =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);gap:12px">
       <span style="font-size:12px;color:var(--text2);flex:1">${s.d}</span>
       <kbd style="font-family:ui-monospace,monospace;font-size:11px;background:var(--bg3);padding:3px 8px;border:1px solid var(--border);border-radius:5px;color:var(--text);white-space:nowrap">${s.k}</kbd>
     </div>`).join('');
  showOverlay('panel-shortcuts', '⌨️ 键盘快捷键',
    `<div style="padding:4px 2px 2px">${rows}</div>
     <div style="font-size:10px;color:var(--text3);margin-top:10px;text-align:center">💡 在输入框/搜索框内仅 Esc 生效，避免打断输入</div>
     <div style="margin-top:12px;text-align:center">
       <button class="h-btn" onclick="this.closest('.overlay').remove()">关闭</button>
     </div>`);
}
document.addEventListener('keydown', (e) => {
  if (isTypingTarget(e.target)) return;
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    openShortcutHelp();
  }
});
