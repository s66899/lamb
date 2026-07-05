const fs = require('fs');
var c = fs.readFileSync('app.js', 'utf8');
var changed = 0;

// 1. Replace openCalculators with interactive version
function esc(s) { return s.replace(/[`$]/g, '\\$&'); }

var calcContent = [
'function openCalculators() {',
'  showView("book");',
'  currentModule = "calculators";',
'  navStack.push({view:"dashboard"});',
'  historyPush("calculators", {});',
'  $("bookHeader").innerHTML = `<div class="back" onclick="goBack()">\u2190 \u8fd4\u56de</div>',
'    <h1>\u{1F9EE} \u8bad\u7ec3\u8ba1\u7b97\u5de5\u5177</h1>',
'    <div class="vm">\u9009\u62e9\u53c2\u6570 \u2192 \u81ea\u52a8\u8ba1\u7b97\u7ed3\u679c</div>`;',
'  $("bookStats").innerHTML = "";',
'  $("contentGrid").innerHTML = [',
'    // TDEE',
'    "<div class=\"qw-step\">"',
'    + "<div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">\u{1F525} TDEE</div>"',
'    + "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\">"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u6027\u522b<select id=\"tdeeGender\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=\"male\">\u7537</option><option value=\"female\">\u5973</option></select></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u4f53\u91cd(kg)<input id=\"tdeeWeight\" type=\"number\" value=\"70\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u8eab\u9ad8(cm)<input id=\"tdeeHeight\" type=\"number\" value=\"175\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u5e74\u9f84<input id=\"tdeeAge\" type=\"number\" value=\"25\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u6d3b\u52a8<select id=\"tdeeActivity\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=\"1.2\">\u4e45\u5750</option><option value=\"1.375\">\u8f7b\u5ea6</option><option value=\"1.55\" selected>\u4e2d\u5ea6</option><option value=\"1.725\">\u9ad8\u5ea6</option><option value=\"1.9\">\u6781\u9ad8\u5ea6</option></select></label>"',
'    + "</div><button onclick=\"calcTDEE()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">\u{1F525} \u8ba1\u7b97 TDEE</button>"',
'    + "<div id=\"tdeeResult\" style=\"margin-top:8px;font-size:12px\"></div></div>",',
'    // Macro',
'    "<div class=\"qw-step\">"',
'    + "<div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--green)\">\u{1F969} \u8425\u517b\u7d20</div>"',
'    + "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\">"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u4f53\u91cd<input id=\"macroWeight\" type=\"number\" value=\"70\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u76ee\u6807<select id=\"macroGoal\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=\"maintain\">\u7ef4\u6301</option><option value=\"gain\">\u589e\u808c</option><option value=\"lose\">\u51cf\u8102</option></select></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">TDEE<input id=\"macroTDEE\" type=\"number\" value=\"2500\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "</div><button onclick=\"calcMacro()\" class=\"qw-btn\" style=\"background:var(--green);color:#fff;border:none;width:100%\">\u{1F969} \u8ba1\u7b97\u8425\u517b\u7d20</button>"',
'    + "<div id=\"macroResult\" style=\"margin-top:8px;font-size:12px\"></div></div>",',
'    // Water',
'    "<div class=\"qw-step\">"',
'    + "<div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">\u{1F4A7} \u6c34\u5408</div>"',
'    + "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\">"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u4f53\u91cd<input id=\"waterWeight\" type=\"number\" value=\"70\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u8bad\u7ec3\u5206\u949f<input id=\"waterTrain\" type=\"number\" value=\"60\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label>"',
'    + "<label style=\"font-size:11px;color:var(--text2)\">\u6e29\u5ea6<select id=\"waterTemp\" style=\"display:block;width:100%;margin-top:2px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=\"1\">\u5e38\u6e29</option><option value=\"1.2\">>30\u00b0C</option></select></label>"',
'    + "</div><button onclick=\"calcWater()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">\u{1F4A7} \u8ba1\u7b97\u6c34\u5408</button>"',
'    + "<div id=\"waterResult\" style=\"margin-top:8px\"></div></div>",',
'    // Recovery',
'    "<div class=\"qw-step\">"',
'    + "<div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--gold)\">\u23F0 \u6062\u590d\u65f6\u95f4\u7ebf</div>"',
'    + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:var(--text2)\">"',
'    + "<div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">0-30\u5206</strong><br>\u5feb\u901f\u78b3\u6c341-1.2g + \u86cb\u767d0.3-0.4g</div>"',
'    + "<div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">30\u5206-2h</strong><br>\u6b63\u9910(\u78b3\u6c34+\u86cb\u767d)</div>"',
'    + "<div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">2h-\u7761\u524d</strong><br>\u6ce1\u6cab\u8f7410\u5206</div>"',
'    + "<div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--gold)\">\u7761\u77207-9h</strong><br>\u2B50 \u7ec4\u7ec7\u4fee\u590d</div>"',
'    + "</div></div>",',
'  ].join("");',
'  updateProgress();',
'}',
].join('\n');

var calcFuncs = [
'function calcTDEE(){',
'  var g=document.getElementById("tdeeGender")?.value||"male";',
'  var w=parseFloat(document.getElementById("tdeeWeight")?.value)||70;',
'  var h=parseFloat(document.getElementById("tdeeHeight")?.value)||175;',
'  var a=parseInt(document.getElementById("tdeeAge")?.value)||25;',
'  var act=parseFloat(document.getElementById("tdeeActivity")?.value)||1.55;',
'  var bmr=g==="male"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;',
'  var tdee=Math.round(bmr*act);',
'  var activity={\'1.2\':"\u4e45\u5750","1.375":"\u8f7b\u5ea6","1.55":"\u4e2d\u5ea6","1.725":"\u9ad8\u5ea6","1.9":"\u6781\u9ad8\u5ea6"};',
'  $("tdeeResult").innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">BMR:"+Math.round(bmr)+"kcal | \u2605 TDEE:<strong>"+tdee+"</strong> kcal (<span style=\"font-size:10px;color:var(--text3)\">x"+act+" "+activity[String(act)]+"</span>)</div>";',
'}',
'function calcMacro(){',
'  var w=parseFloat(document.getElementById("macroWeight")?.value)||70;',
'  var g=document.getElementById("macroGoal")?.value||"maintain";',
'  var tdee=parseFloat(document.getElementById("macroTDEE")?.value)||2500;',
'  var goal={"maintain":"\u2611 \u7ef4\u6301","gain":"\u{1F4AA} \u589e\u808c","lose":"\u{1F525} \u51cf\u8102"};',
'  var pMult={"maintain":1.7,"gain":2,"lose":2.2};',
'  var calAdj={"maintain":0,"gain":350,"lose":-400};',
'  var protein=Math.round(pMult[g]*w);',
'  var fat=Math.round(0.8*w);',
'  var carb=Math.round((tdee+calAdj[g]-protein*4-fat*9)/4);',
'  $("macroResult").innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">"',
'    +goal[g]+" "+Math.round(tdee+calAdj[g])+"kcal<br>"',
'    +"<span style=\"color:var(--red)\">\u25CF \u86cb\u767d\u8d28</span> "+protein+"g ("+Math.round(protein*4/(tdee+calAdj[g])*100)+"%)<br>"',
'    +"<span style=\"color:var(--orange)\">\u25CF \u8102\u80aa</span> "+fat+"g ("+Math.round(fat*9/(tdee+calAdj[g])*100)+"%)<br>"',
'    +"<span style=\"color:var(--blue)\">\u25CF \u78b3\u6c34</span> "+carb+"g ("+Math.round(carb*4/(tdee+calAdj[g])*100)+"%)</div>";',
'}',
'function calcWater(){',
'  var w=parseFloat(document.getElementById("waterWeight")?.value)||70;',
'  var t=parseInt(document.getElementById("waterTrain")?.value)||60;',
'  var temp=parseFloat(document.getElementById("waterTemp")?.value)||1;',
'  var daily=Math.round(w*33*temp);',
'  var train=Math.round(t*12);',
'  $("waterResult").innerHTML="<div style=\"background:var(--surface2);border-radius:var(--radius-sm);padding:12px;line-height:1.8\">\u65e5\u5e38:"+daily+"ml + \u8bad\u7ec3:"+train+"ml = <strong>"+Math.round((daily+train)/1000*10)/10+"L</strong></div>";',
'}',
].join('\n');

// Find openCalculators function and replace
var calcStart = c.indexOf('function openCalculators()');
if (calcStart < 0) { console.log('ERROR: openCalculators not found'); process.exit(1); }
var braceStart = c.indexOf('{', calcStart);
var depth = 1, braceEnd = braceStart + 1;
while (depth > 0 && braceEnd < c.length) {
  if (c[braceEnd] === '{') depth++;
  else if (c[braceEnd] === '}') depth--;
  braceEnd++;
}
var oldCalc = c.slice(calcStart, braceEnd);
c = c.replace(oldCalc, calcContent);
changed++;
console.log('1. Replaced openCalculators');

// Find the sleep function (near end of file) and insert calc functions before it
var sleepIdx = c.indexOf('const sleep=');
if (sleepIdx < 0) { console.log('ERROR: sleep not found'); process.exit(1); }
c = c.slice(0, sleepIdx) + '\n' + calcFuncs + '\n\n' + c.slice(sleepIdx);
changed++;
console.log('2. Added calcTDEE/macro/water functions');

// Update nutrition module chapters
var oldNutrient = '{ id:\'nutrition\', icon:\'\u{1F957}\', title:\'\u8425\u517b\u6062\u590d\', color:\'var(--orange)\'';
var nutIdx = c.indexOf(oldNutrient);
if (nutIdx >= 0) {
  var nutEnd = c.indexOf('},', nutIdx) + 2;
  var oldNutBlock = c.slice(nutIdx, nutEnd);
  c = c.replace(oldNutBlock, '{ id:\'nutrition\', icon:\'\u{1F34E}\', title:\'\u8425\u517b\u6062\u590d\', color:\'var(--orange)\',\n    desc:\'\u{1F525}TDEE\u00B7\u{1F969}\u8425\u517b\u7d20\u00B7\u{1F4A7}\u6c34\u5408\u00B7\u23F0\u6062\u590d\u65f6\u95f4\u7ebf\u2014\u2014\u5168\u4ea4\u4e92\u5f0f\u8425\u517b\u5de5\u5177\',\n    tags:[\'\u4ea4\u4e92\u8ba1\u7b97\',\'\u8425\u517b\u7d20\u5206\u914d\',\'\u6c34\u5408\',\'\u6062\u590d\u65f6\u95f4\u7ebf\',\'\u8865\u5242\'], docs:14,\n    books:[],\n    chapters:[\'\u{1F525} TDEE\u6bcf\u65e5\u603b\u80fd\u8017\',\'\u{1F969} \u4e09\u5927\u8425\u517b\u7d20\u5206\u914d\',\'\u{1F4A7} \u786e\u5b9a\u6c34\u5408\u9700\u6c42\',\'\u23F0 \u8bad\u7ec3\u540e\u6062\u590d\u65f6\u95f4\u7ebf\',\'\u{1F37D}\uFE0F \u8bad\u7ec3\u524d\u540e\u8425\u517b\u7a97\u53e3\',\'\u{1F969} \u86cb\u767d\u8d28\u6444\u5165\u7b56\u7565\',\'\u{1F4A7} \u7535\u89e3\u8d28\u5e73\u8861\',\'\u{1F48A} \u8fd0\u52a8\u8865\u5242\u901f\u67e5\',\'\u{1F504} \u5468\u671f\u5316\u8425\u517b\',\'\u2696\uFE0F \u4f53\u91cd\u7ba1\u7406\u4e0e\u6bd4\u8d5b\u79f0\u91cd\'] },');
  changed++;
  console.log('3. Updated nutrition module');
}

// Update competition module chapters
var oldComp = '{ id:\'competition\', icon:\'\u{1F3C6}\', title:\'\u6bd4\u8d5b\u7b56\u7565\', color:\'var(--red)\'';
var compIdx = c.indexOf(oldComp);
if (compIdx >= 0) {
  var compEnd = c.indexOf('},', compIdx) + 2;
  var oldCompBlock = c.slice(compIdx, compEnd);
  c = c.replace(oldCompBlock, '{ id:\'competition\', icon:\'\u{1F3C6}\', title:\'\u6bd4\u8d5b\u7b56\u7565\', color:\'var(--red)\',\n    desc:\'\u2694\uFE0F\u8d5b\u524d\u5012\u8ba1\u65f6\u00B7\u{1F3AF}\u8d5b\u4e2d\u7b56\u7565\u00B7\u{1F9E0}\u5fc3\u7406\u5907\u6218\u00B7\u{1F4CA}\u5bf9\u624b\u5206\u6790\u2014\u2014\u5b8c\u6574\u6bd4\u8d5b\u6307\u5357\',\n    tags:[\'\u8d5b\u524d\u51c6\u5907\',\'\u8d5b\u4e2d\u7b56\u7565\',\'\u5fc3\u7406\u5907\u6218\',\'\u5bf9\u624b\u5206\u6790\',\'\u590d\u76d8\'], docs:14,\n    books:[],\n    chapters:[\'\u2694\uFE0F \u8d5b\u524d1\u5468\u5012\u8ba1\u65f6\',\'\u{1F3AF} \u8d5b\u4e2d\u5173\u952e\u7b56\u7565\',\'\u{1F9E0} \u6bd4\u8d5b\u5fc3\u7406\u51c6\u5907\',\'\u{1F4CA} \u5bf9\u624b\u5206\u6790\u6846\u67b6\',\'\u{1F50D} \u5bf9\u624b\u6280\u672f\u5f31\u70b9\',\'\u{1F3C3} \u4f53\u80fd\u5206\u914d\u7b56\u7565\',\'\u{1F3AC} \u5b9e\u6218\u6848\u4f8b\u5b66\u4e60\',\'\u{1F504} \u5c40\u95f4\u8c03\u6574\',\'\u{1F4DD} \u8d5b\u540e\u590d\u76d8\',\'\u{1F3AF} \u957f\u671f\u6bd4\u8d5b\u8ba1\u5212\'] },');
  changed++;
  console.log('4. Updated competition module');
}

// Re-read file to verify no accidental corruption
if (changed >= 1) {
  try { new Function(c); console.log('SYNTAX OK'); }
  catch(e) { console.log('SYNTAX ERROR: ' + e.message); process.exit(1); }
  fs.writeFileSync('app.js', c, 'utf8');
  console.log('Written successfully. ' + changed + ' modifications.');
} else {
  console.log('No changes made.');
}
