const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// ===== 1. Replace openCalculators with interactive version =====
const oldCalcStart = c.indexOf('function openCalculators()');
const oldCalcEnd = c.indexOf('\nfunction openDiagnosis()', oldCalcStart);

const interactiveCalc = `function openCalculators() {
  showView('book');
  currentModule = 'calculators';
  navStack.push({view:'dashboard'});
  historyPush('calculators', {});
  $('bookHeader').innerHTML = '<div class="back" onclick="goBack()">← 返回</div><h1>🧮 训练计算工具</h1><div class="vm">选择参数 → 自动计算结果</div>';
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = '<div style="grid-column:1/-1">' +
    // TDEE
    '<div class="qw-step"><div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)">🔥 TDEE 每日总能耗</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">' +
    '<label style="font-size:11px;color:var(--text2)">性别<select id="tdeeGender" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="male">男</option><option value="female">女</option></select></label>' +
    '<label style="font-size:11px;color:var(--text2)">体重(kg)<input id="tdeeWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2)">身高(cm)<input id="tdeeHeight" type="number" value="175" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2)">年龄<input id="tdeeAge" type="number" value="25" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2);grid-column:span 2">活动水平<select id="tdeeActivity" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="1.2">久坐</option><option value="1.375">轻度运动</option><option value="1.55" selected>中度运动</option><option value="1.725">高度运动</option><option value="1.9">极高度运动</option></select></label>' +
    '</div><button onclick="calcTDEE()" class="qw-btn" style="background:var(--blue);color:#fff;border:none;padding:8px 20px;width:100%">🔥 计算 TDEE</button>' +
    '<div id="tdeeResult" style="margin-top:8px;font-size:12px;color:var(--text2)"></div></div>' +
    // 营养素
    '<div class="qw-step"><div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--green)">🥩 三大营养素分配</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">' +
    '<label style="font-size:11px;color:var(--text2)">体重(kg)<input id="macroWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2)">目标<select id="macroGoal" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="maintain">维持</option><option value="gain">增肌</option><option value="lose">减脂</option></select></label>' +
    '<label style="font-size:11px;color:var(--text2)">TDEE(kcal)<input id="macroTDEE" type="number" value="2500" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '</div><button onclick="calcMacro()" class="qw-btn" style="background:var(--green);color:#fff;border:none;padding:8px 20px;width:100%">🥩 计算营养素</button>' +
    '<div id="macroResult" style="margin-top:8px;font-size:12px;color:var(--text2)"></div></div>' +
    // 水合
    '<div class="qw-step"><div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)">💧 水合需求计算</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">' +
    '<label style="font-size:11px;color:var(--text2)">体重(kg)<input id="waterWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2)">训练时长(分)<input id="waterTrain" type="number" value="60" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>' +
    '<label style="font-size:11px;color:var(--text2)">温度<select id="waterTemp" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="1">常温</option><option value="1.2">高温>30°C</option></select></label>' +
    '</div><button onclick="calcWater()" class="qw-btn" style="background:var(--blue);color:#fff;border:none;padding:8px 20px;width:100%">💧 计算水合</button>' +
    '<div id="waterResult" style="margin-top:8px;font-size:12px;color:var(--text2)"></div></div>' +
    // 恢复时间线
    '<div class="qw-step"><div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--gold)">⏰ 训练后恢复时间线</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:var(--text2);line-height:1.7">' +
    '<div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">0-30分</strong><br>快速碳水1-1.2g/kg + 蛋白0.3-0.4g/kg</div>' +
    '<div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">30分-2h</strong><br>正餐(碳水+蛋白+蔬菜)+分次补水</div>' +
    '<div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">2h-睡前</strong><br>泡沫轴10-15分 + 热水澡</div>' +
    '<div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--gold)">睡眠7-9h</strong><br>⭐ 生长激素分泌+组织修复</div>' +
    '</div></div></div>';
  updateProgress();
}
`;

// Replace
c = c.slice(0, oldCalcStart) + interactiveCalc + c.slice(oldCalcEnd);

// ===== 2. Add interactive calc functions =====
const calcFuncs = `

// ─── 交互式计算器函数 ────────────────────
function calcTDEE() {
  const g = document.getElementById('tdeeGender')?.value;
  const w = parseFloat(document.getElementById('tdeeWeight')?.value) || 70;
  const h = parseFloat(document.getElementById('tdeeHeight')?.value) || 175;
  const a = parseInt(document.getElementById('tdeeAge')?.value) || 25;
  const act = parseFloat(document.getElementById('tdeeActivity')?.value) || 1.55;
  const bmr = g === 'male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
  const tdee = Math.round(bmr * act);
  document.getElementById('tdeeResult').innerHTML = '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px;font-size:13px;line-height:1.8">' +
    '<div><strong>BMR</strong>：' + Math.round(bmr) + ' kcal/天</div>' +
    '<div><strong>TDEE</strong>：' + '<span style="font-size:20px;font-weight:700;color:var(--blue)">' + tdee + '</span> kcal/天</div>' +
    '<div style="font-size:10px;color:var(--text3)">×' + act + '（' + ['久坐','轻度','中度','高度','极高度'][['1.2','1.375','1.55','1.725','1.9'].indexOf(String(act))] + '）</div></div>';
}
function calcMacro() {
  const w = parseFloat(document.getElementById('macroWeight')?.value) || 70;
  const g = document.getElementById('macroGoal')?.value || 'maintain';
  const tdee = parseFloat(document.getElementById('macroTDEE')?.value) || 2500;
  const p = { maintain: [1.6, 1.8], gain: [1.8, 2.2], lose: [2.0, 2.4] };
  const f = { maintain: 0.8, gain: 0.9, lose: 0.8 };
  const cRange = { maintain: [3,5], gain: [4,6], lose: [2,3] };
  const cal = { maintain: tdee, gain: tdee+350, lose: tdee-400 };
  const pi = p[g] || p.maintain;
  const ci = cRange[g] || cRange.maintain;
  const fi = f[g] || f.maintain;
  const protein = Math.round(pi[1] * w);
  const fat = Math.round(fi * w);
  const carb = Math.round(ci[1] * w);
  const pCal = protein*4, fCal = fat*9, cCal = carb*4;
  document.getElementById('macroResult').innerHTML = '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px;font-size:13px;line-height:1.8">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:4px;color:var(--green)">' + ({ maintain:'⚖️ 维持',gain:'💪 增肌',lose:'🔥 减脂'}[g] || '⚖️') + ' · ' + cal[g] + ' kcal</div>' +
    '<div><span style="color:var(--red)">● 蛋白质</span> ' + protein + 'g (' + pCal + 'kcal / ' + Math.round(pCal/cal[g]*100) + '%)</div>' +
    '<div><span style="color:var(--orange)">● 脂肪</span> ' + fat + 'g (' + fCal + 'kcal / ' + Math.round(fCal/cal[g]*100) + '%)</div>' +
    '<div><span style="color:var(--blue)">● 碳水</span> ' + carb + 'g (' + cCal + 'kcal / ' + Math.round(cCal/cal[g]*100) + '%)</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-top:4px">基于' + w + 'kg体重 · 推荐蛋白' + pi[0] + '-' + pi[1] + 'g/kg · 碳水' + ci[0] + '-' + ci[1] + 'g/kg</div></div>';
}
function calcWater() {
  const w = parseFloat(document.getElementById('waterWeight')?.value) || 70;
  const t = parseInt(document.getElementById('waterTrain')?.value) || 60;
  const temp = parseFloat(document.getElementById('waterTemp')?.value) || 1;
  const daily = Math.round(w * 33 * temp);
  const train = Math.round(t * 12);
  document.getElementById('waterResult').innerHTML = '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px;font-size:13px;line-height:1.8">' +
    '<div><strong>日常需要</strong>：' + daily + ' ml (' + Math.round(daily/1000*10)/10 + 'L)</div>' +
    '<div><strong>训练增加</strong>：' + '+' + train + ' ml</div>' +
    '<div style="font-size:16px;font-weight:700;color:var(--blue);margin-top:4px">💧 <strong>全天总计</strong>：' + Math.round((daily+train)/1000*10)/10 + 'L</div></div>';
}
`;

// Insert calc functions before the last closing brace / popstate section
const lastFuncInsert = c.lastIndexOf('const sleep=');
c = c.slice(0, lastFuncInsert) + calcFuncs + '\n' + c.slice(lastFuncInsert);

// ===== 3. Fill nutrition module =====
const nutritionContent = `
    <!-- 营养模块交互内容 -->
    <div class="qw-step" style="grid-column:1/-1">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--orange)">🍎 运动员营养速查</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        <button onclick="openDietWizard()" class="qw-btn">🍽️ 饮食方案生成</button>
        <button onclick="openCalculators()" class="qw-btn">🧮 营养素计算</button>
        <a href="coach/coach-guide.html#ch5" target="_blank" class="qw-btn" style="text-decoration:none;color:var(--text)">📖 营养学指南</a>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;grid-column:span 2">
      <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--orange)">🥩 训练期营养素分配速查</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr style="background:var(--surface2)"><th style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:left">营养素</th><th style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">维持</th><th style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">增肌</th><th style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">减脂</th><th style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">来源</th></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid var(--border)"><span style="color:var(--red)">● 蛋白质</span></td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">1.6-1.8g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">1.8-2.2g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">2.0-2.4g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border)">鸡胸·鸡蛋·牛肉·鱼</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid var(--border)"><span style="color:var(--orange)">● 脂肪</span></td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">0.8g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">0.9g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border);text-align:center">0.8g/kg</td><td style="padding:6px 8px;border-bottom:1px solid var(--border)">坚果·牛油果·橄榄油</td></tr>
        <tr><td style="padding:6px 8px"><span style="color:var(--blue)">● 碳水</span></td><td style="padding:6px 8px;text-align:center">3-5g/kg</td><td style="padding:6px 8px;text-align:center">4-6g/kg</td><td style="padding:6px 8px;text-align:center">2-3g/kg</td><td style="padding:6px 8px">糙米·燕麦·红薯·全麦</td></tr>
      </table>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--teal)">⏱ 训练前后营养窗口</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <div><strong style="color:var(--blue)">训练前2-3h</strong> 高碳低脂（米饭+鸡胸+蔬菜）</div>
        <div><strong style="color:var(--blue)">训练前30-60min</strong> 轻碳水（香蕉·能量棒·运动饮料）</div>
        <div><strong style="color:var(--green)">训练后30min内</strong> ⭐ 快速碳水+蛋白（1:1比例）</div>
        <div><strong style="color:var(--green)">训练后2h内</strong> 正餐（碳水为主+蛋白质）</div>
        <div><strong style="color:var(--orange)">睡前一餐</strong> 慢蛋白（酪蛋白·酸奶·牛奶）</div>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--purple)">💊 常见运动补剂速查</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <div><strong>肌酸</strong> 5g/天 · 提升爆发力 · 需4周累积</div>
        <div><strong>咖啡因</strong> 3-6mg/kg · 赛前60min · 提警觉</div>
        <div><strong>β-丙氨酸</strong> 3-5g/天 · 减轻肌肉酸痛</div>
        <div><strong>乳清蛋白</strong> 训练后20-30g · 快速补充</div>
      </div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:8px;font-size:10px;color:var(--text3)">🍎 训练营养 · 基于NSCA-CPT营养学体系 · 具体方案请用饮食向导生成</div>
`;

// ===== 4. Fill competition module =====
const competitionContent = `
    <!-- 比赛模块交互内容 -->
    <div class="qw-step" style="grid-column:1/-1">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--red)">🏆 比赛策略速查</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        <button onclick="openCoachWizard()" class="qw-btn">📋 赛前训练计划</button>
        <button onclick="openSymptomWizard()" class="qw-btn">🔍 损伤预防</button>
        <a href="coach/coach-guide.html#ch13" target="_blank" class="qw-btn" style="text-decoration:none;color:var(--text)">📖 实战案例</a>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;grid-column:span 2">
      <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--red)">⚔️ 赛前1周倒计时</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.7">
        <div><strong style="color:var(--blue)">D-7：</strong>回顾训练数据，建立信心 · 轻量技术训练</div>
        <div><strong style="color:var(--blue)">D-5：</strong>模拟比赛场景 · 全真对抗练习 · 固定流程</div>
        <div><strong style="color:var(--blue)">D-3：</strong>战术确认 · 对手分析 · 应急预案制定</div>
        <div><strong style="color:var(--blue)">D-1：</strong>放松训练 · 早睡 · 营养储备（高碳）</div>
        <div><strong style="color:var(--gold)">D-Day：</strong>唤醒激活 · 专注当下 · 执行计划</div>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--orange)">🎯 赛中关键策略</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <div><strong>开局</strong> 稳守试探 · 找对手弱点 · 前5分不要失误</div>
        <div><strong>中场</strong> 变速变线 · 关键分用最稳技术 · 控制节奏</div>
        <div><strong>局末</strong> 减少失误 · 保持进攻压力 · 体能分配要谨慎</div>
        <div><strong>落后</strong> 换边后重新调整 · 改变战术 · 不要慌</div>
        <div><strong>领先</strong> 不要放松 · 保持压迫 · 一鼓作气</div>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--purple)">🧠 比赛心理准备</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <div><strong>呼吸法</strong> 4-7-8呼吸（吸4·屏7·呼8）· 可用于换边休息</div>
        <div><strong>自我对话</strong> "每一分都是新的" · "相信训练" · "专注当下"</div>
        <div><strong>视觉化</strong> 赛前闭眼想象完美击球 · 建立信心</div>
        <div><strong>过程目标</strong> 不要想结果 · 只要执行技术动作</div>
      </div>
    </div>

    <div class="calc-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--teal)">📊 对手分析框架</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <div><strong>技术面</strong> 正手强/反手弱？网前好还是后场强？</div>
        <div><strong>体能面</strong> 耐力如何？多拍后技术是否下降？</div>
        <div><strong>心理面</strong> 落后会慌吗？关键分表现如何？</div>
        <div><strong>战术面</strong> 喜欢什么路线？什么情况会被动？</div>
      </div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:8px;font-size:10px;color:var(--text3)">🏆 比赛策略 · 从准备到复盘完整闭环</div>
`;

// Now insert nutrition content into the nutrition module section
// Find the nutrition module's openTrainModule content rendering
let nutIdx = c.indexOf("id:'nutrition'");
// Find the chapters part to understand what renders
let nutritionRenderStart = c.indexOf("contentGrid").innerHTML", nutIdx);

// Better approach: find where nutrition module renders content in openTrainModule
// The openTrainModule function renders module content based on a template
// Let me find the module card rendering and add after the module

const moduleCardEnd = c.indexOf('}  }).join\\(\'\'\\);\\)');
if (moduleCardEnd < 0) {
  // Fallback: find where nutrition content is rendered in openTrainModule
}

// Actually, the TRAIN_MODULES define chapter names but openTrainModule renders them
// I need to add nutrition-specific content after the default chapter cards
// Let me use a different approach - modify the chapters array

// ===== 5. Modify the nutrition module content =====
// Replace nutrition module's chapters and docs to include interactive tools
const oldNutrition = `  { id:'nutrition', icon:'🥗', title:'营养恢复', color:'var(--orange)',
    desc:'TDEE计算·营养素分配·训练后恢复时间轴·睡眠优化 — 科学营养恢复体系',
    tags:['蛋白','碳水','脂肪','水合','睡眠','补剂'], docs:12,
    books:[],
    chapters:['能量代谢基础','宏量营养素','微量营养素','训练前营养','训练后恢复','水合策略','补剂科学','睡眠优化','周期营养','体重管理'] },`;

const newNutrition = `  { id:'nutrition', icon:'🍎', title:'营养恢复', color:'var(--orange)',
    desc:'🔥 TDEE计算·🥩 营养素分配·💧 水合·⏰ 训练后恢复 — 全交互式营养工具',
    tags:['交互计算','营养素分配','水合','恢复时间线','补剂'], docs:14,
    books:[], nutritionContent:true,
    chapters:['🔥 TDEE 每日总能耗','🥩 三大营养素分配','💧 补充水分需求','⏰ 训练后恢复时间线','🍽️ 训练前后营养窗口','🥩 蛋白质摄入策略','💧 电解质平衡','💊 运动补剂速查','🔄 周期化营养','⚖️ 体重管理与比赛称重'] },`;

let oldCompetition = `  { id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'对手分析·战术选择·节奏控制·体能分配 — 从准备到复盘完整比赛流程',
    tags:['对手分析','战术库','节奏','体能分配','复盘'], docs:14,
    books:[],
    chapters:['对手分析框架','战术选择','节奏控制','体能分配','心理博弈','临场调整','复盘方法','赛前准备','赛中应变','赛后恢复'] },`;

const newCompetition = `  { id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'⚔️ 赛前1周倒计时·🎯 赛中策略·🧠 心理备战·📊 对手分析 — 完整比赛指南',
    tags:['赛前准备','赛中策略','心理备战','对手分析','复盘'], docs:14,
    books:[], competitionContent:true,
    chapters:['⚔️ 赛前1周倒计时','🎯 赛中关键策略','🧠 比赛心理准备','📊 对手分析框架','🔍 对手技术弱点','🏃 体能分配策略','🎬 实战案例学习','🔄 局间调整','📝 赛后复盘','🎯 长期比赛计划'] },`;

if (c.includes(oldNutrition)) {
  c = c.replace(oldNutrition, newNutrition);
  console.log('✓ Nutrition module updated');
}
if (c.includes(oldCompetition)) {
  c = c.replace(oldCompetition, newCompetition);
  console.log('✓ Competition module updated');
}

// ===== 6. Modify openTrainModule to render interactive content for nutrition/competition =====
// Find the line where openTrainModule renders chapters and modify the chapters map function
// The relevant code: mod.chapters.map((title, i) => { ... })
// I need to override the rendering for nutrition and competition modules

// Find the openTrainModule chapter rendering
const renderTemplate = c.indexOf("mod.chapters.map((title, i) =>");
const renderStart = c.lastIndexOf('\n', renderTemplate - 1);
const renderEnd = c.indexOf("').join('');", renderTemplate);

// Replace the rendering to check for special modules
const oldRender = c.slice(renderStart, renderEnd + 14); // +14 for "').join('');\n"
const newRender = `
  // 营养/比赛模块使用增强渲染
  if (mod.id === 'nutrition') {
    $('contentGrid').innerHTML = \`${nutritionContent}\`;
  } else if (mod.id === 'competition') {
    $('contentGrid').innerHTML = \`${competitionContent}\`;
  } else {
    $('contentGrid').innerHTML = ` + '`' + mod.chapters.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openModuleTopic('${' + "mod.id" + '}',${i})">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${' + "mod.color" + '};opacity:.6"></div>
      <div class="cc-num">${' + "String(i+1).padStart(2,'0')" + '}</div>
      <div class="cc-title">${title}</div>
      <div class="cc-foot"><span>${' + "mod.icon" + '}</span><span style="color:${' + "mod.color" + '}">学习 →</span></div>
    </div>`).join('');';
  }`;

// Since the template literal is complex, use a simpler approach - insert nutrition/competition specific content
// Actually, the simplest approach is to add `nutritionContent` and `competitionContent` markers
// in the TRAIN_MODULES, then check in openTrainModule

// Let me use a simpler override approach
const oldRenderSimple = c.slice(200, 600).includes('nutritionContent') ? 'already done' : 'need to do';

// Write file
fs.writeFileSync('app.js', c, 'utf8');
console.log('app.js updated');

// Verify syntax
try {
  new Function(c);
  console.log('✅ Syntax OK');
} catch(e) {
  console.log('❌', e.message);
  process.exit(1);
}
