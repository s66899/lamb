var fs = require('fs');

// Read current app.js
var code = fs.readFileSync('app.js', 'utf8');

// 1. Replace version
code = code.replace("const APP_VERSION = 'v3.5.0'", "const APP_VERSION = 'v3.5.3'");

// 2. Replace openCalculators with interactive version
var oldFunc = code.substring(
  code.indexOf('function openCalculators()'),
  code.indexOf('function openDiagnosis()')
);

// Build the new function manually
var newFunc = [
"function openCalculators() {",
'  showView("book");',
'  currentModule = "calculators";',
'  navStack.push({view:"dashboard"});',
'  historyPush("calculators", {});',
'  $("bookHeader").innerHTML = "<div class=\\"back\\" onclick=\\"goBack()\\">\u2190 \u8fd4\u56de</div><h1>\u{1F9EE} \u8bad\u7ec3\u8ba1\u7b97\u5de5\u5177</h1><div class=\\"vm\\">\u9009\u53c2\u6570\u2192\u81ea\u52a8\u7ed3\u679c</div>";',
'  $("bookStats").innerHTML = "";',
'  $("contentGrid").innerHTML = """',
'    <div class="qw-step">',
'      <div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue);">{1F525} TDEE</div>',
'      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">',
'        <label style="font-size:11px;color:var(--text2)">性别<select id="tdeeGender" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="male">男</option><option value="female">女</option></select></label>',
'        <label style="font-size:11px;color:var(--text2)">体重(kg)<input id="tdeeWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">身高(cm)<input id="tdeeHeight" type="number" value="175" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">年龄<input id="tdeeAge" type="number" value="25" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">活动<select id="tdeeActivity" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="1.2">久坐</option><option value="1.375">轻度</option><option value="1.55" selected>中度</option><option value="1.725">高度</option><option value="1.9">极高</option></select></label>',
'      </div>',
'      <button onclick="calcTDEE()" class="qw-btn" style="background:var(--blue);color:#fff;border:none;width:100%;padding:10px">{1F525} 计算 TDEE</button>',
'      <div id="tdeeResult" style="margin-top:8px;font-size:12px"></div>',
'    </div>',
'    <div class="qw-step">',
'      <div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--green)">{1F969} 三大营养素</div>',
'      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">',
'        <label style="font-size:11px;color:var(--text2)">体重(kg)<input id="macroWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">目标<select id="macroGoal" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="maintain">维持</option><option value="gain">增肌</option><option value="lose">减脂</option></select></label>',
'        <label style="font-size:11px;color:var(--text2)">TDEE<input id="macroTDEE" type="number" value="2500" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'      </div>',
'      <button onclick="calcMacro()" class="qw-btn" style="background:var(--green);color:#fff;border:none;width:100%;padding:10px">{1F969} 计算营养素</button>',
'      <div id="macroResult" style="margin-top:8px;font-size:12px"></div>',
'    </div>',
'    <div class="qw-step">',
'      <div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)">{1F4A7} 水合需求</div>',
'      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">',
'        <label style="font-size:11px;color:var(--text2)">体重(kg)<input id="waterWeight" type="number" value="70" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">训练(分钟)<input id="waterTrain" type="number" value="60" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"></label>',
'        <label style="font-size:11px;color:var(--text2)">温度<select id="waterTemp" style="display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px"><option value="1">常温</option><option value="1.2">{3E}30\u00b0C</option></select></label>',
'      </div>',
'      <button onclick="calcWater()" class="qw-btn" style="background:var(--blue);color:#fff;border:none;width:100%;padding:10px">{1F4A7} 计算水合</button>',
'      <div id="waterResult" style="margin-top:8px;font-size:12px"></div>',
'    </div>',
'    <div class="qw-step">',
'      <div style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--gold)">{23F0} 恢复时间线</div>',
'      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:var(--text2)">',
'        <div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">0-30分</strong><br>快速碳水1-1.2g/kg + 蛋白0.3-0.4g/kg</div>',
'        <div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">30分-2h</strong><br>正餐(碳水+蛋白+蔬菜)</div>',
'        <div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--blue)">2h-睡前</strong><br>泡沫轴放松10-15分</div>',
'        <div style="background:var(--surface2);padding:10px;border-radius:var(--radius-sm)"><strong style="color:var(--gold)">睡眠7-9h</strong><br>{2B50} 组织修复</div>',
'      </div>',
'    </div>',
'  "";',
'  updateProgress();',
'}',
].join('\n')
.replace(/{1F525}/g, '\u{1F525}')
.replace(/{1F969}/g, '\u{1F969}')
.replace(/{1F4A7}/g, '\u{1F4A7}')
.replace(/{23F0}/g, '\u23F0')
.replace(/{2B50}/g, '\u2B50')
.replace(/{1F9EE}/g, '\u{1F9EE}')
.replace(/{3E}/g, '>');

code = code.replace(oldFunc, newFunc);

// 3. Add calc functions before sleep()
var sleepIdx = code.indexOf('const sleep=');
var calcFuncs = [
'function calcTDEE(){',
'  var g=(document.getElementById("tdeeGender")||{}).value||"male";',
'  var w=parseFloat((document.getElementById("tdeeWeight")||{}).value)||70;',
'  var h=parseFloat((document.getElementById("tdeeHeight")||{}).value)||175;',
'  var a=parseInt((document.getElementById("tdeeAge")||{}).value)||25;',
'  var act=parseFloat((document.getElementById("tdeeActivity")||{}).value)||1.55;',
'  var bmr=g==="male"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;',
'  var tdee=Math.round(bmr*act);',
'  var an={}; an["1.2"]="久坐"; an["1.375"]="轻度"; an["1.55"]="中度"; an["1.725"]="高度"; an["1.9"]="极高";',
'  var r=document.getElementById("tdeeResult");',
'  if(r) r.innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">BMR: "+Math.round(bmr)+" kcal | "+tdee+" kcal/天 <span style=\"font-size:10px;color:var(--text3)\">("+an[String(act)]+")</span></div>";',
'}',
'function calcMacro(){',
'  var w=parseFloat((document.getElementById("macroWeight")||{}).value)||70;',
'  var g=(document.getElementById("macroGoal")||{}).value||"maintain";',
'  var tdee=parseFloat((document.getElementById("macroTDEE")||{}).value)||2500;',
'  var gn={maintain:"维持",gain:"增肌",lose:"减脂"};',
'  var pMult={maintain:1.7,gain:2,lose:2.2};',
'  var calAdj={maintain:0,gain:350,lose:-400};',
'  var protein=Math.round(pMult[g]*w);',
'  var fat=Math.round(0.8*w);',
'  var cal=tdee+calAdj[g];',
'  var carb=Math.round((cal-protein*4-fat*9)/4);',
'  var r=document.getElementById("macroResult");',
'  if(r) r.innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">"+gn[g]+" "+cal+"kcal<br>",
'    +"<span style=\"color:var(--red)\">蛋白</span> "+protein+"g ("+Math.round(protein*4/cal*100)+"%)<br>"',
'    +"<span style=\"color:var(--orange)\">脂肪</span> "+fat+"g ("+Math.round(fat*9/cal*100)+"%)<br>"',
'    +"<span style=\"color:var(--blue)\">碳水</span> "+carb+"g ("+Math.round(carb*4/cal*100)+"%)</div>";',
'}',
'function calcWater(){',
'  var w=parseFloat((document.getElementById("waterWeight")||{}).value)||70;',
'  var t=parseInt((document.getElementById("waterTrain")||{}).value)||60;',
'  var temp=parseFloat((document.getElementById("waterTemp")||{}).value)||1;',
'  var daily=Math.round(w*33*temp);',
'  var train=Math.round(t*12);',
'  var r=document.getElementById("waterResult");',
'  if(r) r.innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">日常:"+daily+"ml + 训练:"+train+"ml = "+(Math.round((daily+train)/10)/100)+"L</div>";',
'}',
].join('\n');

code = code.slice(0, sleepIdx) + calcFuncs + '\n\n' + code.slice(sleepIdx);

// 4. Fix the macroResult innerHTML (the str concat had a comma issue)
// The line ` +"<span...` in the actual code needs proper concatenation
code = code.replace(
  'if(r) r.innerHTML="<div style=\\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\\">"+gn[g]+" "+cal+"kcal<br>",\n    +"<span',
  'if(r) r.innerHTML="<div style=\\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\\">"+gn[g]+" "+cal+"kcal<br>"\n    +"<span'
);

// Verify syntax
try {
  new Function(code);
  fs.writeFileSync('app.js', code, 'utf8');
  console.log('OK');
} catch(e) {
  console.log('ERR:' + e.message);
  process.exit(1);
}
