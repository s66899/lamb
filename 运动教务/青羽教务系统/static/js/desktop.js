// 🐏的教务 - 电脑端页面逻辑（优化版）

var students = [];
var selectedSet = new Set();
var currentDay = '星期一';
var tabTitles = {home:'首页概览',students:'学员管理',schedule:'课程表',attendance:'消课管理',stats:'数据统计',records:'请假记录','monthly-stats':'月度统计'};
var monthlyData = null;
var dashboardCache = null;
var allAttCache = [];
var editStudentSettings = {};

function switchTab(el) {
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active')});
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
  var tab = el.dataset.tab;
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('topbarTitle').textContent = tabTitles[tab] || tab;
  if(tab==='home') loadStats();
  else if(tab==='students') loadStudents();
  else if(tab==='schedule') loadSchedule();
  else if(tab==='attendance') loadAttSlots();
  else if(tab==='stats') loadDailyStats();
  else if(tab==='monthly-stats') loadMonthlyStats();
  else if(tab==='records') loadRecords();
}

async function loadStats() {
  Common.showToast('加载中...', 800);
  try {
    var dash = await Common.apiFetch('/api/dashboard');
    dashboardCache = dash;
    var result = dash.stats;
    var att = dash.today;
    var todayRecords = att.records || [];
    var totalHours = result.total_hours || 0;
    var remainingHours = result.remaining_hours || 0;
    var consumed = totalHours - remainingHours;
    var rate = totalHours > 0 ? Math.round(consumed / totalHours * 100) : 0;
    var monRate = result.monthly_attendance_rate || 0;
    var monColor = monRate >= 80 ? '#27ae60' : monRate >= 60 ? '#faad14' : '#e74c3c';
    document.getElementById('statsGrid').innerHTML =
      '<div class="stat-card"><div class="value">'+result.total_students+'</div><div class="label">总学员</div></div>'+
      '<div class="stat-card green"><div class="value">'+result.active_students+'</div><div class="label">在读人数</div></div>'+
      '<div class="stat-card orange"><div class="value">'+rate+'%</div><div class="label">消耗率</div></div>'+
      '<div class="stat-card clickable" onclick="showAttendanceRateModal()"><div class="value" style="color:'+monColor+'">'+monRate+'%</div><div class="label">月出勤率</div></div>';
    document.getElementById('todayTotal').textContent = att.total || 0;
    document.getElementById('todayDate').textContent = att.date || '';
    var html = '';
    if (att.attendees && att.attendees.length > 0) {
      for (var i = 0; i < att.attendees.length; i++) {
        var a = att.attendees[i];
        html += '<span class="tag">'+Common.esc(a.name)+'</span> ';
      }
    }
    document.getElementById('todayAttendees').innerHTML = html || '<span style="opacity:0.7">暂无消课</span>';

    // 今日请假/旷课
    var leaves = todayRecords.filter(function(a){return a.status==='leave'||a.status==='absence'});
    if (leaves.length>0) {
      document.getElementById('todayLeaveCard').style.display='block';
      var lhtml='';
      for (var i=0;i<leaves.length;i++) {
        var a=leaves[i];
        var color=a.status==='leave'?'#faad14':'#ff4d4f';
        var label=a.status==='leave'?'请假':'旷课';
        lhtml+='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">';
        lhtml+='<div style="display:flex;align-items:center;gap:10px">';
        lhtml+='<div style="width:36px;height:36px;border-radius:50%;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">'+Common.esc(a.student_name.charAt(0))+'</div>';
        lhtml+='<div><div style="font-weight:600">'+Common.esc(a.student_name)+'</div><div style="font-size:12px;color:#888"><span class="tag" style="background:'+color+'">'+label+'</span> '+Common.esc(a.time_slot)+'</div></div>';
        lhtml+='</div>';
        lhtml+='<button class="btn btn-sm" onclick="undoAttendance(\''+Common.esc(a.id)+'\')" style="background:#f5f5f5;color:#666">撤销</button>';
        lhtml+='</div>';
      }
      document.getElementById('todayLeaveList').innerHTML=lhtml;
    } else {
      document.getElementById('todayLeaveCard').style.display='none';
    }

    // 课程预览
    renderSchedulePreview(dash.schedule_preview||{});

    // 近期请假
    if (!allAttCache||!allAttCache.length) {
      try { allAttCache = await Common.apiFetch('/api/all_attendance_records'); } catch(e){ allAttCache=[]; }
    }
    var allLeaves = allAttCache.filter(function(a){return a.status==='leave'}).slice(0,10);
    if (allLeaves.length>0) {
      document.getElementById('recentLeaveCard').style.display='block';
      var rlhtml='';
      for (var i=0;i<allLeaves.length;i++) {
        var a=allLeaves[i];
        rlhtml+='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">';
        rlhtml+='<div style="display:flex;align-items:center;gap:10px">';
        rlhtml+='<div style="width:32px;height:32px;border-radius:50%;background:#faad14;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">'+Common.esc(a.student_name.charAt(0))+'</div>';
        rlhtml+='<div><div style="font-weight:600;font-size:14px">'+Common.esc(a.student_name)+'</div><div style="font-size:12px;color:#888">'+Common.esc(a.date)+' '+Common.esc(a.time_slot)+'</div></div>';
        rlhtml+='</div></div>';
      }
      document.getElementById('recentLeaveList').innerHTML=rlhtml;
    } else {
      document.getElementById('recentLeaveCard').style.display='none';
    }

    updateOnline();
  } catch (e) {
    console.error('loadStats error', e);
  }
}

var currentRecordTab = 'leave';
function switchRecordTab(tab) {
  currentRecordTab = tab;
  ['leave','absence','attend'].forEach(function(t) {
    var el = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
    if (t === tab) el.classList.add('active');
    else el.classList.remove('active');
  });
  loadRecords();
}

async function loadRecords() {
  try {
    var allAtt = await Common.apiFetch('/api/all_attendance_records');
    allAttCache = allAtt;
    var content = document.getElementById('recordContent');
    var list = allAtt.filter(function(a){return a.status === currentRecordTab}).slice(0, 30);
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var color = a.status === 'leave' ? '#faad14' : '#ff4d4f';
      html += '<div style="padding:12px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">';
      html += '<div><span class="tag" style="background:'+color+'">'+a.status+'</span> '+Common.esc(a.student_name)+' <span style="color:#888;font-size:13px">'+Common.esc(a.date)+' '+Common.esc(a.time_slot)+'</span></div>';
      html += '<button class="btn btn-sm" onclick="undoAttendance(\''+Common.esc(a.id)+'\')" style="background:#f5f5f5;color:#666">撤销</button>';
      html += '</div>';
    }
    content.innerHTML = html || '<div class="empty">暂无记录</div>';
  } catch (e) {
    console.error('loadRecords error', e);
  }
}

async function showConsumeDetail() {
  if (!dashboardCache) dashboardCache = await Common.apiFetch('/api/dashboard');
  var result = dashboardCache.stats;
  var html = '<div class="stat-row" style="grid-template-columns:repeat(2,1fr)"><div class="stat-card"><div class="value">'+result.total_hours+'</div><div class="label">总课时</div></div><div class="stat-card green"><div class="value">'+(result.total_hours - result.remaining_hours)+'</div><div class="label">已消耗</div></div><div class="stat-card orange"><div class="value">'+result.remaining_hours+'</div><div class="label">剩余</div></div><div class="stat-card"><div class="value">'+result.consumption_rate+'%</div><div class="label">消耗率</div></div></div>';
  if (result.total_purchase_amount) {
    html += '<div class="stat-row" style="grid-template-columns:repeat(2,1fr)"><div class="stat-card"><div class="value">¥'+Math.round(result.total_purchase_amount).toLocaleString()+'</div><div class="label">总购课金额</div></div><div class="stat-card green"><div class="value">¥'+Math.round(result.consumed_amount).toLocaleString()+'</div><div class="label">已消耗金额</div></div></div>';
    html += '<div style="margin:12px 0;font-size:14px;font-weight:600">金额存销比: <span style="color:'+(result.consumption_amount_rate>=50?'#27ae60':result.consumption_amount_rate>=25?'#faad14':'#ff4d4f')+'">'+result.consumption_amount_rate+'%</span></div>';
  }
  html += '<div style="margin-top:16px"><h4 style="margin-bottom:12px">按教练</h4>';
  for (var coach in result.coach_stats) {
    var c = result.coach_stats[coach];
    html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee"><div><span class="tag '+Common.getCoachClass(coach)+'">'+coach+'</span></div><div style="font-weight:bold;color:'+(c.rate>=80?'#27ae60':c.rate>=60?'#faad14':'#ff4d4f')+'">'+c.rate+'%</div></div>';
  }
  html += '</div>';
  showHtmlModal('存销比详情', html);
}

async function showStatsDetail() {
  if (!dashboardCache) dashboardCache = await Common.apiFetch('/api/dashboard');
  var result = dashboardCache.stats;
  var html = '<div class="stat-row" style="grid-template-columns:repeat(3,1fr)"><div class="stat-card"><div class="value">'+result.scheduled+'</div><div class="label">应到人次</div></div><div class="stat-card green"><div class="value">'+result.attended+'</div><div class="label">实到人次</div></div><div class="stat-card orange"><div class="value">'+result.leave_days+'</div><div class="label">请假人次</div></div></div>';
  html += '<div style="margin-top:16px"><h4 style="margin-bottom:12px">按教练</h4>';
  for (var coach in result.coach_stats) {
    var c = result.coach_stats[coach];
    html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee"><div><span class="tag '+Common.getCoachClass(coach)+'">'+coach+'</span></div><div><span style="color:#27ae60;font-weight:bold">'+c.attended+'</span>/<span>'+c.scheduled+'</span> = <span style="font-weight:bold;color:'+(c.rate>=80?'#27ae60':c.rate>=60?'#faad14':'#ff4d4f')+'">'+c.rate+'%</span></div></div>';
  }
  html += '</div>';
  showHtmlModal('出勤详情', html);
}

function showHtmlModal(title, htmlContent) {
  var modalId = 'modalHtmlDetail';
  var modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-content"><div class="modal-header"><h3 id="'+modalId+'Title"></h3><span class="modal-close" onclick="closeModal(\''+modalId+'\')">&times;</span></div><div id="'+modalId+'Body"></div></div>';
    document.body.appendChild(modal);
  }
  document.getElementById(modalId+'Title').textContent = title;
  document.getElementById(modalId+'Body').innerHTML = htmlContent;
  modal.classList.add('show');
}

async function loadStudents() {
  Common.showToast('加载学员...', 600);
  try {
    students = await Common.apiFetch('/api/students');
    var status = document.getElementById('statusFilter').value;
    var list = status ? students.filter(function(s){return s.status === status}) : students;
    document.getElementById('studentCount').textContent = '共 ' + list.length + ' 人';
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      html += '<tr class="student-row" style="cursor:pointer" onclick="showStudentDetail(\''+Common.esc(s.id)+'\')">';
      html += '<td><strong>'+Common.esc(s.name)+'</strong></td><td>'+(s.phone||'-')+'</td><td>'+(s.level||'-')+'</td>';
      html += '<td><span class="tag '+Common.getCoachClass(s.coach)+'">'+Common.esc(s.coach)+'</span></td><td style="color:#52c41a;font-weight:bold">'+s.remaining_hours+'</td>';
      html += '<td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEditStudent(\''+Common.esc(s.id)+'\')">编辑</button> <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteStudent(\''+Common.esc(s.id)+'\')">删除</button></td>';
      html += '</tr>';
    }
    document.getElementById('studentsTable').innerHTML = html || '<tr><td colspan="6" class="empty">暂无学员</td></tr>';
  } catch (e) {
    console.error('loadStudents error', e);
  }
}

async function loadSchedule() {
  Common.showToast('加载课表...', 600);
  try {
    var days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
    var tabsHtml = '';
    for (var i = 0; i < days.length; i++) {
      tabsHtml += '<div class="week-tab '+(days[i]===currentDay?'active':'')+'" onclick="switchDay(\''+days[i]+'\')">'+days[i]+'</div>';
    }
    document.getElementById('weekTabs').innerHTML = tabsHtml;
    var settings = await Common.apiFetch('/api/settings');
    var schedules = await Common.apiFetch('/api/schedules?day='+currentDay);
    var allS = await Common.apiFetch('/api/students');
    var slots = settings.time_slots[currentDay] || [];
    var maxPer = settings.max_students_per_coach || 6;
    var sMap = {}; for (var i = 0; i < allS.length; i++) sMap[allS[i].id] = allS[i];
    var coaches = settings.coaches || [];
    var html = '';
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var ss = schedules.filter(function(s){return s.time_slot===slot});
      html += '<div class="card"><div style="font-weight:600;margin-bottom:12px">'+slot+'</div><div class="grid-2">';
      for (var j = 0; j < coaches.length; j++) {
        var coach = coaches[j];
        var list = ss.filter(function(s){return s.coach===coach});
        var count = list.length;
        var color = count >= maxPer ? '#ff4d4f' : '#52c41a';
        html += '<div class="grid-item"><div style="font-weight:600;margin-bottom:8px">'+coach+'</div><div style="font-size:36px;font-weight:700;color:'+color+'">'+count+'</div><div style="font-size:13px;color:#888">/'+maxPer+'人</div></div>';
      }
      html += '</div></div>';
    }
    document.getElementById('scheduleGrid').innerHTML = html;
  } catch (e) {
    console.error('loadSchedule error', e);
  }
}

function switchDay(d) { currentDay = d; loadSchedule(); }

async function loadAttSlots() {
  try {
    var day = document.getElementById('attDay').value;
    var settings = await Common.apiFetch('/api/settings');
    var slots = settings.time_slots[day] || [];
    var html = '';
    for (var i = 0; i < slots.length; i++) html += '<option>'+slots[i]+'</option>';
    document.getElementById('attSlot').innerHTML = html;
    document.getElementById('attDate').value = Common.today();
    // 自动加载当前时间段学员
    await loadAttStudents();
  } catch (e) {
    console.error('loadAttSlots error', e);
  }
}

async function loadAttStudents() {
  try {
    var day = document.getElementById('attDay').value;
    var slot = document.getElementById('attSlot').value;
    if (!slot) return;
    var schedules = await Common.apiFetch('/api/schedules?day='+day);
    var allS = await Common.apiFetch('/api/students');
    var list = schedules.filter(function(s){return s.time_slot===slot});
    var sMap = {}; for (var i = 0; i < allS.length; i++) sMap[allS[i].id] = allS[i];
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      html += '<tr><td><input type="checkbox" onclick="toggleStu(\''+Common.esc(s.student_id)+'\')" id="chk_'+Common.esc(s.student_id)+'"></td><td><strong>'+(sMap[s.student_id]?Common.esc(sMap[s.student_id].name):'未知')+'</strong></td><td><span class="tag '+Common.getCoachClass(s.coach)+'">'+Common.esc(s.coach)+'</span></td><td style="color:#52c41a;font-weight:bold">'+(sMap[s.student_id]?sMap[s.student_id].remaining_hours:0)+'</td></tr>';
    }
    document.getElementById('attTable').innerHTML = html || '<tr><td colspan="4" class="empty">暂无学员</td></tr>';
    document.getElementById('attCount').textContent = '共 ' + list.length + ' 人';
    if (list.length > 0) Common.showToast('当前学员已刷新');
    else Common.showToast('当前时段暂无排课');
  } catch (e) {
    console.error('loadAttStudents error', e);
    Common.showToast('加载失败');
  }
}

function toggleStu(id) {
  var chk = document.getElementById('chk_'+id);
  if (selectedSet.has(id)) { selectedSet.delete(id); chk.checked = false; }
  else { selectedSet.add(id); chk.checked = true; }
}

function toggleAttAll() {
  var all = document.getElementById('attSelectAll').checked;
  var chks = document.querySelectorAll('#attTable input[type="checkbox"]');
  for (var i = 0; i < chks.length; i++) {
    chks[i].checked = all;
    if (all) selectedSet.add(chks[i].id.replace('chk_',''));
    else selectedSet.clear();
  }
}

async function doAttendBatch(status, reason) {
  Common.showToast('处理中...', 2000);
  var date = document.getElementById('attDate').value;
  var day = document.getElementById('attDay').value;
  var slot = document.getElementById('attSlot').value;
  try {
    var schedules = await Common.apiFetch('/api/schedules');
    var allS = await Common.apiFetch('/api/students');
    var sMap = {}; for (var i = 0; i < allS.length; i++) sMap[allS[i].id] = allS[i];
    var arr = Array.from(selectedSet);
    for (var i = 0; i < arr.length; i++) {
      var id = arr[i];
      var s = sMap[id];
      var sc = schedules.find(function(x){return x.student_id===id && x.week_day===day && x.time_slot===slot});
      await Common.apiFetch('/api/attendance', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({student_id:id, student_name:s?s.name:'', date:date, week_day:day, time_slot:slot, coach:sc?sc.coach:(s?s.coach:''), status:status, reason:reason||'', hours_used:status==='present'?1:0})
      });
    }
    selectedSet.clear();
    document.getElementById('attSelectAll').checked = false;
    loadAttStudents();
    loadStats();
    Common.showToast('操作完成');
  } catch (e) {
    Common.showToast('操作失败: ' + e.message);
  }
}

function batchAttend() { if (selectedSet.size === 0) return Common.showToast('请先选择学员'); if (!confirm('确认消课 ' + selectedSet.size + ' 人?')) return; doAttendBatch('present'); }
function batchLeave() { if (selectedSet.size === 0) return Common.showToast('请先选择学员'); var reason = prompt('请输入请假原因'); if (!reason) return; doAttendBatch('leave', reason); }
function batchAbsence() { if (selectedSet.size === 0) return Common.showToast('请先选择学员'); if (!confirm('确认旷课 ' + selectedSet.size + ' 人?')) return; doAttendBatch('absence'); }

async function loadDailyStats() {
  Common.showToast('加载统计...', 600);
  try {
    var daily = await Common.apiFetch('/api/daily_coach_stats');
    var html = '<div class="stat-row" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">';
    var coaches = daily.coaches || {};
    for (var coach in coaches) {
      var c = coaches[coach];
      html += '<div class="stat-card" style="background:'+Common.getCoachColor(coach)+';color:#fff"><div class="value" style="color:#fff">'+c.count+'</div><div class="label" style="color:rgba(255,255,255,0.8)">'+coach+'</div>';
      if (c.students && c.students.length > 0) html += '<div style="font-size:12px;margin-top:8px;opacity:0.9">'+c.students.join(', ')+'</div>';
      html += '</div>';
    }
    html += '</div>';
    if (Object.keys(coaches).length === 0) html += '<div class="empty">今日暂无上课</div>';
    document.getElementById('dailyStats').innerHTML = html;
  } catch (e) {
    console.error('loadDailyStats error', e);
  }
  // 加载近期消课
  if (!allAttCache || !allAttCache.length) {
    try { allAttCache = await Common.apiFetch('/api/all_attendance_records'); } catch(e) { allAttCache = []; }
  }
  renderRecentAttendView();
}

async function loadMonthlyStats() {
  Common.showToast('加载月度统计...', 600);
  try {
    monthlyData = await Common.apiFetch('/api/monthly_coach_stats');
    var list = document.getElementById('monthList');
    var html = '';
    for (var i = 0; i < monthlyData.length; i++) {
      var m = monthlyData[i];
      var month = m[0];
      var days = m[1];
      var total = 0;
      for (var d in days) {
        var dayData = days[d];
        for (var c in dayData) total += dayData[c];
      }
      html += '<span class="month-btn" onclick="showMonth(\''+month+'\')">'+month+' ('+total+'节)</span>';
    }
    list.innerHTML = html || '<div class="empty">暂无数据</div>';
  } catch (e) {
    console.error('loadMonthlyStats error', e);
  }
}

function showMonth(month) {
  var data = null;
  for (var i = 0; i < monthlyData.length; i++) {
    if (monthlyData[i][0] === month) { data = monthlyData[i]; break; }
  }
  if (!data) return;
  document.getElementById('monthDetailCard').style.display = 'block';
  document.getElementById('monthDetailTitle').textContent = month + ' 每日上课统计';
  var days = data[1];
  var sorted = Object.keys(days).sort().reverse();
  var cols = ['王教练','陈教练','孙教练'];
  var colors = {'王教练':'#ff6b35','陈教练':'#1e90ff','孙教练':'#f1c40f'};
  var html = '<table><thead><tr><th style="padding:12px">日期</th>';
  for (var i = 0; i < cols.length; i++) html += '<th style="padding:12px;color:'+colors[cols[i]]+'">'+cols[i]+'</th>';
  html += '<th style="padding:12px">合计</th></tr></thead><tbody>';
  var tw = 0, tc = 0, ts = 0;
  for (var i = 0; i < sorted.length; i++) {
    var day = sorted[i];
    var d = days[day] || {};
    var w = d['王教练']||0, c = d['陈教练']||0, s = d['孙教练']||0, sum = w+c+s;
    tw += w; tc += c; ts += s;
    if (sum > 0) {
      html += '<tr><td style="padding:10px 12px;border-bottom:1px solid #eee">'+day+'</td>';
      html += '<td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center'+(w>0?'font-weight:bold':'')+'">'+w+'</td>';
      html += '<td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center'+(c>0?'font-weight:bold':'')+'">'+c+'</td>';
      html += '<td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center'+(s>0?'font-weight:bold':'')+'">'+s+'</td>';
      html += '<td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold">'+sum+'</td></tr>';
    }
  }
  var totalAll = tw + tc + ts;
  html += '<tr style="background:#667eea;color:#fff;font-weight:bold"><td style="padding:12px">总计</td><td style="padding:12px;text-align:center">'+tw+'</td><td style="padding:12px;text-align:center">'+tc+'</td><td style="padding:12px;text-align:center">'+ts+'</td><td style="padding:12px;text-align:center">'+totalAll+'</td></tr>';
  html += '</tbody></table>';
  document.getElementById('monthDetailContent').innerHTML = html;
}

async function showAddStudent() {
  try {
    var settings = await Common.apiFetch('/api/settings');
    var html = '';
    for (var i = 0; i < settings.coaches.length; i++) html += '<option>'+settings.coaches[i]+'</option>';
    document.getElementById('sCoach').innerHTML = html;
    document.getElementById('modalAddStudent').classList.add('show');
  } catch (e) {
    console.error('showAddStudent error', e);
  }
}

async function saveStudent() {
  var name = document.getElementById('sName').value.trim();
  if (!name) { Common.showToast('请输入姓名'); return; }
  Common.showToast('保存中...', 1500);
  try {
    await Common.apiFetch('/api/students', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name:name, phone:document.getElementById('sPhone').value.trim(), coach:document.getElementById('sCoach').value, level:document.getElementById('sLevel').value, remaining_hours:parseInt(document.getElementById('sHours').value)||0})
    });
    document.getElementById('modalAddStudent').classList.remove('show');
    loadStudents();
    Common.showToast('添加成功!');
  } catch (e) {
    Common.showToast('保存失败: ' + e.message);
  }
}

async function deleteStudent(id) {
  if (!confirm('确定删除该学员?')) return;
  try {
    await Common.apiFetch('/api/students/'+id, {method: 'DELETE'});
    loadStudents();
    Common.showToast('已删除');
  } catch (e) {
    Common.showToast('删除失败: ' + e.message);
  }
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

async function updateOnline() {
  try {
    var result = await Common.apiFetch('/api/online_count');
    document.getElementById('onlineCount').textContent = '在线: '+(result.online_count||0);
  } catch(e) {}
}

document.getElementById('attDate').value = Common.today();
loadStats();
setInterval(updateOnline, 15000);

// ==================== 课程预览折叠 ====================
function toggleSchedulePreview() {
  var content = document.getElementById('homeSchedulePreviewContent');
  var arrow = document.getElementById('schedulePreviewArrow');
  if (!content || !arrow) return;
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    content.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

function renderSchedulePreview(preview) {
  var container = document.getElementById('homeSchedulePreviewContent');
  if (!container) return;
  var days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  var coaches = Object.keys(preview).sort();
  var hasData = false;
  var html = '';
  for (var ci = 0; ci < coaches.length; ci++) {
    var coach = coaches[ci];
    var coachData = preview[coach];
    if (!coachData) continue;
    var c = Common.getCoachColor(coach);
    var coachHas = false;
    var bodyHtml = '';
    for (var di = 0; di < days.length; di++) {
      var day = days[di];
      var info = coachData[day];
      if (!info || !info.count) continue;
      coachHas = true;
      bodyHtml += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #f5f5f5">';
      bodyHtml += '<div style="flex-shrink:0"><span style="display:inline-block;background:#f0f2ff;color:#667eea;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px">'+Common.esc(day)+'</span></div>';
      bodyHtml += '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:#333;margin-bottom:2px">'+info.count+'人上课</div>';
      bodyHtml += '<div style="font-size:11px;color:#666;line-height:1.5;word-break:break-all">'+Common.esc(info.students.join('、'))+'</div></div>';
      bodyHtml += '</div>';
    }
    if (coachHas) {
      hasData = true;
      html += '<div style="margin-bottom:12px;background:#fafafa;border-radius:10px;border-left:4px solid '+c+';overflow:hidden">';
      html += '<div style="padding:10px 12px;background:'+c+'15;font-weight:600;font-size:13px;color:#333;display:flex;align-items:center;gap:8px">';
      html += '<span class="tag" style="background:'+c+'">'+Common.esc(coach)+'</span><span style="font-size:12px;color:#666">排课表</span></div>';
      html += '<div style="padding:0 12px">'+bodyHtml+'</div></div>';
    }
  }
  if (!hasData) html += '<div class="empty" style="padding:20px 0">暂无排课数据</div>';
  container.innerHTML = html;
}

// ==================== 撤销考勤 ====================
async function undoAttendance(id) {
  if (!confirm('确定撤销此记录？')) return;
  try {
    await Common.apiFetch('/api/attendance/' + id, { method: 'DELETE' });
    allAttCache = [];
    dashboardCache = null;
    loadStats();
    loadRecords();
    Common.showToast('已撤销');
  } catch (e) {
    Common.showToast('撤销失败: ' + e.message);
  }
}

// ==================== 出勤率弹窗 ====================
function showAttendanceRateModal() {
  if (!dashboardCache) return;
  var stats = dashboardCache.stats;
  var monRate = stats.monthly_attendance_rate || 0;
  var monColor = monRate >= 80 ? '#27ae60' : monRate >= 60 ? '#faad14' : '#e74c3c';
  var html = '<div style="text-align:center;margin-bottom:16px">';
  html += '<div style="font-size:40px;font-weight:700;color:'+monColor+'">'+monRate+'%</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px">本月总出勤率</div>';
  html += '<div style="font-size:11px;color:#aaa;margin-top:4px">应到 '+(stats.month_expected||0)+' · 实到 '+(stats.month_present||0)+' · 请假 '+(stats.month_leave||0)+'</div></div>';

  var coaches = ['王教练','陈教练','孙教练'];
  var now = new Date();
  var ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var monthAtt = allAttCache.filter(function(a){return a.date&&a.date.slice(0,7)===ym;});

  var nowDay = now.getDate();
  var schedules = dashboardCache.schedules || [];
  var weekdayNames = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  var weekdayCounts = {};
  coaches.forEach(function(c){weekdayCounts[c]={};});
  schedules.forEach(function(sc){
    var c=sc.coach, wd=sc.week_day;
    if (coaches.indexOf(c)!==-1&&wd){weekdayCounts[c][wd]=(weekdayCounts[c][wd]||0)+1;}
  });

  html += '<div style="margin-bottom:8px;font-size:12px;color:#888;font-weight:500">各教练出勤率</div>';
  coaches.forEach(function(coach){
    var expected=0;
    for (var d=1; d<=nowDay; d++) {
      var tmp=new Date(now.getFullYear(),now.getMonth(),d);
      var wd=weekdayNames[tmp.getDay()===0?6:tmp.getDay()-1];
      expected+=(weekdayCounts[coach][wd]||0);
    }
    var coachAtt=monthAtt.filter(function(a){return a.coach===coach;});
    var present=coachAtt.filter(function(a){return a.status==='present';}).length;
    var leave=coachAtt.filter(function(a){return a.status==='leave';}).length;
    var rate=expected>0?Math.round((present+leave)/expected*100):0;
    var color=rate>=80?'#27ae60':rate>=60?'#faad14':'#e74c3c';
    html += '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:10px;cursor:pointer" onclick="toggleCoachAttDetail(this,\''+Common.esc(coach)+'\')">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<div><span class="tag '+Common.getCoachClass(coach)+'">'+Common.esc(coach)+'</span></div>';
    html += '<div style="font-weight:700;color:'+color+'">'+rate+'%</div></div>';
    var detailId='coach-att-detail-'+coach;
    html += '<div id="'+detailId+'" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:12px">';
    var absent=coachAtt.filter(function(a){return a.status==='leave'||a.status==='absence';});
    if (absent.length>0){
      absent.forEach(function(a){
        var lbl=a.status==='leave'?'请假':'旷课';
        var clr=a.status==='leave'?'#faad14':'#ff4d4f';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5">';
        html += '<div>'+Common.esc(a.student_name)+' <span style="color:#888">'+Common.esc(a.date)+' '+Common.esc(a.time_slot)+'</span></div>';
        html += '<span style="color:'+clr+';font-size:11px">'+lbl+'</span></div>';
      });
    } else {
      html += '<div style="color:#999;text-align:center;padding:8px 0">本月无请假/旷课记录</div>';
    }
    html += '</div></div>';
  });
  showHtmlModal('月出勤率详情', html);
}

function toggleCoachAttDetail(el, coach) {
  var detail = document.getElementById('coach-att-detail-'+coach);
  if (!detail) return;
  detail.style.display = detail.style.display==='none'?'block':'none';
}

// ==================== 上课明细弹窗 ====================
async function showDailyStudents(date) {
  try {
    var data = await Common.apiFetch('/api/attendance_by_date?date='+encodeURIComponent(date));
    var html = '<div style="text-align:center;margin-bottom:12px"><div style="font-size:16px;font-weight:700">'+Common.esc(date)+'</div><div style="font-size:12px;color:#888">上课学员</div></div>';
    var coaches = ['王教练','陈教练','孙教练'];
    var hasAny = false;
    coaches.forEach(function(coach){
      var list = (data.coaches&&data.coaches[coach])||[];
      if (list.length>0){
        hasAny=true;
        html += '<div style="font-weight:600;font-size:13px;color:#555;margin:10px 0 6px">'+Common.esc(coach)+'</div>';
        list.forEach(function(item){
          html += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f5f5f5">';
          html += '<div style="width:28px;height:28px;border-radius:50%;background:'+Common.getCoachColor(coach)+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">'+Common.esc(item.student_name.charAt(0))+'</div>';
          html += '<div style="flex:1;min-width:0"><div style="font-weight:500;font-size:13px">'+Common.esc(item.student_name)+'</div><div style="font-size:11px;color:#888">'+Common.esc(item.time_slot)+'</div></div>';
          html += '</div>';
        });
      }
    });
    if (!hasAny) html += '<div class="empty" style="padding:20px 0">当天无上课记录</div>';
    showHtmlModal(date+' 上课学员', html);
  } catch (e) {
    Common.showToast('加载失败: '+e.message);
  }
}

// ==================== 插班生消课 ====================
async function showTempEnrollment() {
  if (students.length===0) students = await Common.apiFetch('/api/students');
  var active = students.filter(function(s){return s.status==='active';});
  renderTempStudents(active);
  try {
    var settings = await Common.apiFetch('/api/settings');
    var coachHtml=''; for (var i=0;i<(settings.coaches||[]).length;i++) coachHtml+='<option>'+settings.coaches[i]+'</option>';
    document.getElementById('tempCoach').innerHTML=coachHtml;
    var slots=(settings.time_slots||{})['星期一']||[];
    var slotHtml=''; for (var i=0;i<slots.length;i++) slotHtml+='<option>'+slots[i]+'</option>';
    document.getElementById('tempSlot').innerHTML=slotHtml;
    document.getElementById('tempDate').value=Common.today();
    document.getElementById('modalTemp').classList.add('show');
  } catch(e){console.error('showTempEnrollment error',e);}
}

function renderTempStudents(list) {
  var html='';
  for (var i=0;i<list.length;i++){
    var s=list[i];
    html+='<option value="'+Common.esc(s.id)+'">'+Common.esc(s.name)+' · '+Common.esc(s.coach)+' · 剩'+s.remaining_hours+'课</option>';
  }
  document.getElementById('tempStudent').innerHTML=html;
}

function filterTempStudents() {
  var kw=document.getElementById('tempSearchInput').value.toLowerCase();
  var active=students.filter(function(s){return s.status==='active'&&s.name.toLowerCase().includes(kw);});
  renderTempStudents(active);
}

async function doTempEnrollment() {
  var studentId=document.getElementById('tempStudent').value;
  if (!studentId) { Common.showToast('请选择学员'); return; }
  var date=document.getElementById('tempDate').value;
  var slot=document.getElementById('tempSlot').value;
  var coach=document.getElementById('tempCoach').value;
  var s=students.find(function(x){return x.id===studentId;});
  closeModal('modalTemp');
  try {
    Common.showToast('处理中...',1500);
    await Common.apiFetch('/api/attendance',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({student_id:studentId, student_name:s?s.name:'', date:date, week_day:'', time_slot:slot, coach:coach, status:'present', hours_used:1})
    });
    allAttCache=[]; dashboardCache=null;
    loadStats();
    Common.showToast('消课成功！');
  } catch(e){Common.showToast('消课失败: '+e.message);}
}

// ==================== 调课 ====================
async function showMoveSchedule() {
  try {
    var schedules = await Common.apiFetch('/api/schedules');
    var allS = await Common.apiFetch('/api/students');
    var sMap={}; for (var i=0;i<allS.length;i++) sMap[allS[i].id]=allS[i];
    var html='';
    for (var i=0;i<schedules.length;i++){
      var sc=schedules[i];
      var name=sMap[sc.student_id]?sMap[sc.student_id].name:'未知';
      html+='<option value="'+Common.esc(sc.id)+'">'+Common.esc(name)+' '+Common.esc(sc.week_day)+' '+Common.esc(sc.time_slot)+'</option>';
    }
    document.getElementById('moveFromSchedule').innerHTML=html;
    await loadMoveNewSlots();
    document.getElementById('modalMoveSchedule').classList.add('show');
  } catch(e){console.error('showMoveSchedule error',e);}
}

async function loadMoveNewSlots() {
  var day=document.getElementById('moveNewDay').value;
  try {
    var settings=await Common.apiFetch('/api/settings');
    var slots=settings.time_slots[day]||[];
    var html=''; for (var i=0;i<slots.length;i++) html+='<option>'+slots[i]+'</option>';
    document.getElementById('moveNewSlot').innerHTML=html;
  } catch(e){console.error('loadMoveNewSlots error',e);}
}

async function confirmMoveSchedule() {
  var sid=document.getElementById('moveFromSchedule').value;
  var day=document.getElementById('moveNewDay').value;
  var slot=document.getElementById('moveNewSlot').value;
  var coach=document.getElementById('moveNewCoach').value;
  try {
    await Common.apiFetch('/api/schedules/'+sid,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({week_day:day, time_slot:slot, coach:coach})
    });
    closeModal('modalMoveSchedule');
    loadSchedule();
    Common.showToast('调课成功');
  } catch(e){Common.showToast('调课失败: '+e.message);}
}

// ==================== 学员详情 / 编辑 / 出勤明细 ====================
async function showStudentDetail(id) {
  var s=students.find(function(x){return x.id===id;});
  if (!s) return;
  try {
    var enrollments=await Common.apiFetch('/api/enrollments').catch(function(){return[];});
    var studentPackages=enrollments.filter(function(e){return e.student_id===id;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    var schedules=await Common.apiFetch('/api/schedules').catch(function(){return[];});
    var studentSchedules=schedules.filter(function(sc){return sc.student_id===id;});

    var html='<div style="text-align:center;margin-bottom:16px"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin:0 auto">'+Common.esc(s.name.charAt(0))+'</div></div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
    html+='<div><div style="font-size:12px;color:#888">电话</div><div style="font-weight:500">'+(s.phone||'-')+'</div></div>';
    html+='<div><div style="font-size:12px;color:#888">教练</div><div style="font-weight:500">'+Common.esc(s.coach)+'</div></div>';
    html+='<div><div style="font-size:12px;color:#888">等级</div><div style="font-weight:500">'+(s.level||'-')+'</div></div>';
    html+='<div><div style="font-size:12px;color:#888">剩余课时</div><div style="font-weight:700;color:#52c41a">'+s.remaining_hours+' 节</div></div>';
    html+='</div>';

    if (studentPackages.length>0){
      html+='<div style="margin-bottom:16px"><div style="font-weight:600;margin-bottom:8px;font-size:14px;color:#667eea">📦 课程包信息</div>';
      for (var i=0;i<studentPackages.length;i++){
        var pkg=studentPackages[i];
        html+='<div style="padding:8px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;font-size:13px">';
        html+='<span>'+Common.esc(pkg.package_name||'未命名')+'</span><span style="color:#888">'+pkg.hours+'课时 · ¥'+pkg.price+'</span></div>';
      }
      html+='</div>';
    }

    if (studentSchedules.length>0){
      html+='<div style="margin-bottom:16px"><div style="font-weight:600;margin-bottom:8px;font-size:14px;color:#faad14">⏰ 上课时间段</div>';
      for (var i=0;i<studentSchedules.length;i++){
        var sc=studentSchedules[i];
        html+='<div style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;display:flex;justify-content:space-between">';
        html+='<span>'+Common.esc(sc.week_day)+' '+Common.esc(sc.time_slot)+'</span><span style="color:#888">'+Common.esc(sc.coach)+'</span></div>';
      }
      html+='</div>';
    }

    html+='<div style="display:flex;gap:10px">';
    html+='<button class="btn btn-primary" onclick="closeModal(\'modalHtmlDetail\');openEditStudent(\''+Common.esc(s.id)+'\')" style="flex:1">编辑信息</button>';
    html+='<button class="btn btn-primary" onclick="closeModal(\'modalHtmlDetail\');showStudentAttendanceDetail(\''+Common.esc(s.id)+'\')" style="flex:1;background:#1890ff">出勤明细</button>';
    html+='</div>';
    showHtmlModal(s.name+' 学员详情', html);
  } catch(e){console.error('showStudentDetail error',e);}
}

async function showStudentAttendanceDetail(studentId) {
  var s=students.find(function(x){return x.id===studentId;});
  if (!s) return;
  if (!allAttCache||!allAttCache.length){
    try {allAttCache=await Common.apiFetch('/api/all_attendance_records');} catch(e){allAttCache=[];}
  }
  var now=new Date();
  var ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var monthAtt=allAttCache.filter(function(a){return a.student_id===studentId&&a.date.slice(0,7)===ym;}).sort(function(a,b){return b.date.localeCompare(a.date);});
  var present=monthAtt.filter(function(a){return a.status==='present';});
  var absent=monthAtt.filter(function(a){return a.status==='leave'||a.status==='absence';});

  var html='<div style="text-align:center;margin-bottom:16px"><div style="font-size:16px;font-weight:700">'+Common.esc(s.name)+'</div><div style="font-size:12px;color:#888">'+ym+' 月出勤明细</div></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">';
  html+='<div style="text-align:center;background:#f8f9fa;border-radius:8px;padding:10px"><div style="font-size:20px;font-weight:700;color:#52c41a">'+present.length+'</div><div style="font-size:12px;color:#888">出勤</div></div>';
  html+='<div style="text-align:center;background:#f8f9fa;border-radius:8px;padding:10px"><div style="font-size:20px;font-weight:700;color:#faad14">'+absent.length+'</div><div style="font-size:12px;color:#888">缺勤</div></div>';
  html+='<div style="text-align:center;background:#f8f9fa;border-radius:8px;padding:10px"><div style="font-size:20px;font-weight:700;color:#667eea">'+(monthAtt.length>0?Math.round(present.length/monthAtt.length*100):0)+'%</div><div style="font-size:12px;color:#888">出勤率</div></div>';
  html+='</div>';

  if (present.length>0){
    html+='<div style="font-weight:600;font-size:13px;color:#52c41a;margin-bottom:8px">✅ 出勤记录（'+present.length+'节）</div>';
    for (var i=0;i<present.length;i++){
      var a=present[i];
      html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px">';
      html+='<span>'+Common.esc(a.date)+' '+Common.esc(a.time_slot)+'</span><span class="tag '+Common.getCoachClass(a.coach)+'">'+Common.esc(a.coach)+'</span></div>';
    }
  }
  if (absent.length>0){
    html+='<div style="font-weight:600;font-size:13px;color:#faad14;margin-top:14px;margin-bottom:8px">⚠️ 缺勤记录（'+absent.length+'节）</div>';
    for (var i=0;i<absent.length;i++){
      var a=absent[i];
      var lbl=a.status==='leave'?'请假':'旷课';
      var clr=a.status==='leave'?'#faad14':'#ff4d4f';
      html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px">';
      html+='<span>'+Common.esc(a.date)+' '+Common.esc(a.time_slot)+' <span style="color:'+clr+'">'+lbl+'</span></span></div>';
    }
  }
  showHtmlModal(s.name+' 出勤明细', html);
}

async function openEditStudent(id) {
  closeModal('modalHtmlDetail');
  var s=students.find(function(x){return x.id===id;});
  if (!s) return;
  document.getElementById('editStudentId').value=id;
  document.getElementById('editStudentName').value=s.name||'';
  document.getElementById('editStudentPhone').value=s.phone||'';
  document.getElementById('editStudentHours').value=s.remaining_hours||0;

  var levelSelect=document.getElementById('editStudentLevel');
  for (var i=0;i<levelSelect.options.length;i++){
    if (levelSelect.options[i].value===s.level||levelSelect.options[i].text===s.level){levelSelect.selectedIndex=i;break;}
  }
  var statusSelect=document.getElementById('editStudentStatus');
  for (var i=0;i<statusSelect.options.length;i++){
    if (statusSelect.options[i].value===s.status){statusSelect.selectedIndex=i;break;}
  }

  try {
    var settings=await Common.apiFetch('/api/settings');
    editStudentSettings=settings||{};
    var coaches=settings.coaches||[];
    var coachSelect=document.getElementById('editStudentCoach');
    coachSelect.innerHTML='<option value="">选择教练</option>';
    for (var i=0;i<coaches.length;i++){
      var option=document.createElement('option');
      option.value=coaches[i]; option.textContent=coaches[i];
      if (coaches[i]===s.coach) option.selected=true;
      coachSelect.appendChild(option);
    }
  } catch(e){console.error('加载教练列表失败:',e);}
  await loadStudentEnrollmentsForEdit(id);
  await loadStudentSchedulesForEdit(id);
  document.getElementById('modalEditStudent').classList.add('show');
}

async function saveEditStudent() {
  var id=document.getElementById('editStudentId').value;
  var name=document.getElementById('editStudentName').value.trim();
  var phone=document.getElementById('editStudentPhone').value.trim();
  var coach=document.getElementById('editStudentCoach').value;
  var level=document.getElementById('editStudentLevel').value;
  var status=document.getElementById('editStudentStatus').value;
  var hours=parseInt(document.getElementById('editStudentHours').value)||0;
  if (!name){Common.showToast('请输入学员姓名');return;}
  try {
    await Common.apiFetch('/api/students/'+id,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:name, phone:phone, coach:coach, level:level, status:status, remaining_hours:hours})
    });
    closeModal('modalEditStudent');
    loadStudents();
    Common.showToast('修改成功！');
  } catch(e){Common.showToast('保存失败: '+e.message);}
}

async function loadStudentEnrollmentsForEdit(studentId) {
  var container=document.getElementById('editEnrollmentList');
  if (!container) return;
  try {
    var enrollments=await Common.apiFetch('/api/enrollments').catch(function(){return[];});
    var list=enrollments.filter(function(e){return e.student_id===studentId;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    var html='';
    if (list.length===0){
      html+='<div style="text-align:center;color:#999;padding:12px">暂无课程包</div>';
    } else {
      list.forEach(function(e){
        html+='<div style="padding:10px;margin-bottom:8px;background:#fff;border-radius:4px;border:1px solid #e8e8e8">';
        html+='<div style="font-weight:600;font-size:13px;margin-bottom:6px">'+Common.esc(e.package_name||'未命名')+'</div>';
        html+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">';
        html+='<div style="flex:1"><label style="font-size:11px;color:#888">课时</label><input type="number" id="enroll-hours-'+Common.esc(e.id)+'" value="'+(e.hours||0)+'" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div>';
        html+='<div style="flex:1"><label style="font-size:11px;color:#888">价格</label><input type="number" id="enroll-price-'+Common.esc(e.id)+'" value="'+(e.price||0)+'" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div>';
        html+='</div>';
        html+='<div style="display:flex;gap:6px">';
        html+='<button class="btn btn-sm btn-success" onclick="saveEnrollment(\''+Common.esc(e.id)+'\')" style="padding:4px 10px;font-size:11px;flex:1">保存</button>';
        html+='<button class="btn btn-sm btn-danger" onclick="deleteEnrollment(\''+Common.esc(e.id)+'\')" style="padding:4px 10px;font-size:11px;flex:1">删除</button>';
        html+='</div></div>';
      });
    }
    container.innerHTML=html;
  } catch(e){container.innerHTML='<div style="text-align:center;color:#ff4d4f;padding:12px">加载失败</div>';}
}

async function saveEnrollment(enrollmentId) {
  var hours=parseFloat(document.getElementById('enroll-hours-'+enrollmentId).value)||0;
  var price=parseFloat(document.getElementById('enroll-price-'+enrollmentId).value)||0;
  try {
    await Common.apiFetch('/api/enrollments/'+enrollmentId,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({hours:hours, price:price})
    });
    var studentId=document.getElementById('editStudentId').value;
    if (studentId) await loadStudentEnrollmentsForEdit(studentId);
    Common.showToast('保存成功');
  } catch(e){Common.showToast('保存失败: '+e.message);}
}

async function deleteEnrollment(enrollmentId) {
  if (!confirm('确定删除该课程包？')) return;
  try {
    await Common.apiFetch('/api/enrollments/'+enrollmentId,{method:'DELETE'});
    var studentId=document.getElementById('editStudentId').value;
    if (studentId) await loadStudentEnrollmentsForEdit(studentId);
    Common.showToast('已删除');
  } catch(e){Common.showToast('删除失败: '+e.message);}
}

// 排课编辑（简化版）
async function loadStudentSchedulesForEdit(studentId) {
  var container=document.getElementById('editScheduleList');
  if (!container) return;
  try {
    var schedules=await Common.apiFetch('/api/schedules').catch(function(){return[];});
    var studentSchedules=schedules.filter(function(sc){return sc.student_id===studentId;});
    var html='';
    html+='<div id="addScheduleRow" style="display:none;padding:10px;margin-bottom:10px;background:#f0f7ff;border-radius:4px;border:1px solid #91d5ff">';
    html+='<div style="font-weight:600;font-size:12px;color:#1890ff;margin-bottom:6px">新增排课</div>';
    html+='<div style="display:flex;gap:6px;margin-bottom:6px">';
    html+='<select id="addScheduleDay" onchange="document.getElementById(\'addScheduleSlot\').innerHTML=getSlotOptionsHtml(this.value)" style="flex:1;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">'+getDayOptionsHtml('星期一')+'</select>';
    html+='<select id="addScheduleSlot" style="flex:1;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">'+getSlotOptionsHtml('星期一')+'</select>';
    html+='<select id="addScheduleCoach" style="flex:1;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">'+getCoachOptionsHtml('')+'</select>';
    html+='</div>';
    html+='<div style="display:flex;gap:6px">';
    html+='<button class="btn btn-sm btn-success" onclick="saveNewSchedule()" style="padding:4px 10px;font-size:11px;flex:1">保存</button>';
    html+='<button class="btn btn-sm" onclick="hideAddScheduleRow()" style="background:#f5f5f5;color:#333;padding:4px 10px;font-size:11px;flex:1">取消</button>';
    html+='</div></div>';

    if (studentSchedules.length===0){
      html+='<div id="emptyScheduleHint" style="text-align:center;color:#999;padding:12px">暂无排课</div>';
    } else {
      for (var i=0;i<studentSchedules.length;i++){
        var sc=studentSchedules[i];
        html+='<div id="schedule-row-'+Common.esc(sc.id)+'" style="padding:8px;margin-bottom:8px;background:#fff;border-radius:4px;border:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center">';
        html+='<div><div style="font-weight:500;font-size:13px">'+Common.esc(sc.week_day)+' '+Common.esc(sc.time_slot)+'</div><div style="font-size:11px;color:#666">教练: '+Common.esc(sc.coach)+'</div></div>';
        html+='<div><button class="btn btn-sm btn-primary" onclick="deleteSingleSchedule(\''+Common.esc(sc.id)+'\')" style="padding:2px 8px;font-size:11px">删除</button></div>';
        html+='</div>';
      }
    }
    container.innerHTML=html;
  } catch(e){container.innerHTML='<div style="text-align:center;color:#ff4d4f;padding:12px">加载失败</div>';}
}

function getDayOptionsHtml(selected) {
  var days=['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  var html='';
  for (var i=0;i<days.length;i++) html+='<option value="'+days[i]+'"'+(days[i]===selected?' selected':'')+'>'+days[i]+'</option>';
  return html;
}
function getSlotOptionsHtml(day, selected) {
  var slots=(editStudentSettings.time_slots||{})[day]||[];
  var html='';
  for (var i=0;i<slots.length;i++) html+='<option value="'+Common.esc(slots[i])+'"'+(slots[i]===selected?' selected':'')+'>'+Common.esc(slots[i])+'</option>';
  return html;
}
function getCoachOptionsHtml(selected) {
  var coaches=editStudentSettings.coaches||[];
  var html='<option value="">选择教练</option>';
  for (var i=0;i<coaches.length;i++) html+='<option value="'+Common.esc(coaches[i])+'"'+(coaches[i]===selected?' selected':'')+'>'+Common.esc(coaches[i])+'</option>';
  return html;
}
function showAddScheduleRow() { var row=document.getElementById('addScheduleRow'); if(row) row.style.display='block'; }
function hideAddScheduleRow() { var row=document.getElementById('addScheduleRow'); if(row) row.style.display='none'; }

async function saveNewSchedule() {
  var studentId=document.getElementById('editStudentId').value;
  var day=document.getElementById('addScheduleDay').value;
  var slot=document.getElementById('addScheduleSlot').value;
  var coach=document.getElementById('addScheduleCoach').value;
  if (!slot) { Common.showToast('请选择时间段'); return; }
  try {
    await Common.apiFetch('/api/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_id:studentId,week_day:day,time_slot:slot,coach:coach})});
    await loadStudentSchedulesForEdit(studentId);
  } catch(e){Common.showToast('新增失败: '+e.message);}
}

async function deleteSingleSchedule(scheduleId) {
  if (!confirm('确定要删除这个排课吗？')) return;
  try {
    await Common.apiFetch('/api/schedules/'+scheduleId,{method:'DELETE'});
    var studentId=document.getElementById('editStudentId').value;
    if (studentId) await loadStudentSchedulesForEdit(studentId);
  } catch(e){Common.showToast('删除失败');}
}

// 近期消课
function renderRecentAttendView() {
  var container=document.getElementById('recentAttendView');
  if (!container) return;
  var atts=allAttCache.filter(function(a){return a.status==='present';}).slice(0,30);
  var html='';
  if (atts.length>0){
    for (var i=0;i<atts.length;i++){
      var a=atts[i];
      html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">';
      html+='<div style="display:flex;align-items:center;gap:10px">';
      html+='<div style="width:32px;height:32px;border-radius:50%;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">'+Common.esc(a.student_name.charAt(0))+'</div>';
      html+='<div><div style="font-weight:600;font-size:13px">'+Common.esc(a.student_name)+'</div><div style="font-size:12px;color:#888"><span class="tag '+Common.getCoachClass(a.coach)+'">'+Common.esc(a.coach)+'</span> '+Common.esc(a.date)+' '+Common.esc(a.time_slot)+'</div></div>';
      html+='</div>';
      html+='<button class="btn btn-sm" onclick="undoAttendance(\''+Common.esc(a.id)+'\')" style="background:#f5f5f5;color:#666">撤销</button>';
      html+='</div>';
    }
  } else {
    html='<div class="empty">暂无消课记录</div>';
  }
  container.innerHTML=html;
}
