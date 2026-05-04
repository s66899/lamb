// 🐏的教务 - 手机端页面逻辑（优化版）

var allStudents = [];
var selectedStudents = new Set();
var selectedCoursePkg = null, selectedCourseHours = 0, selectedPkgId = '';
var tempStudentList = [];
var currentStatsView = 'daily';
var allAttCache = [];
var currentStudentId = null;
var dashboardCache = null;
var studentRateCache = {};

function switchTab(el) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById(el.dataset.page).classList.add('active');
  loadPage(el.dataset.page);
}

function switchTabById(pageId) {
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  var t = document.querySelector('[data-page="' + pageId + '"]');
  if (t) t.classList.add('active');
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById(pageId).classList.add('active');
  loadPage(pageId);
}

function loadPage(page) {
  if (page === 'page-home') loadStats();
  else if (page === 'page-students') loadStudents();
  else if (page === 'page-schedule') loadSchedule();
  else if (page === 'page-attendance') { loadAttSlots(); selectedStudents.clear(); }
  else if (page === 'page-statistics') loadStatistics();
}

function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ==================== 首页 ====================
async function loadStats() {
  Common.showToast('加载中...', 800);
  try {
    var dash = await Common.apiFetch('/api/dashboard');
    dashboardCache = dash;
    var stats = dash.stats;
    var todayRecords = dash.today.records || [];

    // 若 allAttCache 为空则补充完整考勤记录（用于月出勤率/近期请假）
    if (!allAttCache || !allAttCache.length) {
      try { allAttCache = await Common.apiFetch('/api/all_attendance_records'); } catch(e) { allAttCache = []; }
    }

    // 统一字段名（后端原始记录用 student_name，前端习惯用 name）
    var normalizedToday = todayRecords.map(function(a) {
      return {
        id: a.id,
        student_id: a.student_id,
        name: a.student_name || '',
        time_slot: a.time_slot || '',
        coach: a.coach || '',
        status: a.status,
        reason: a.reason
      };
    });

    var presents = normalizedToday.filter(function(a) { return a.status === 'present'; });
    var leaves = normalizedToday.filter(function(a) { return a.status === 'leave' || a.status === 'absence'; });

    document.getElementById('todayCount').textContent = presents.length;
    document.getElementById('todayDate').textContent = dash.today.date;

    var html = '';
    var sorted = presents.slice().reverse();
    for (var i = 0; i < sorted.length; i++) {
      var a = sorted[i];
      html += '<div class="attend-item">';
      html += '<div onclick="showTodayDetail(\'' + Common.esc(a.student_id) + '\',\'' + Common.esc(a.name) + '\',\'' + Common.esc(a.time_slot) + '\',\'' + Common.esc(a.coach) + '\')" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">';
      html += '<div class="attend-avatar">' + Common.esc(a.name.charAt(0)) + '</div>';
      html += '<div class="attend-info"><div class="attend-name">' + Common.esc(a.name) + '</div><div class="attend-meta"><span class="coach-chip" style="background:' + Common.getCoachColor(a.coach) + ';font-size:10px;padding:2px 8px">' + Common.esc(a.coach) + '</span> ' + Common.esc(a.time_slot) + '</div></div>';
      html += '</div>';
      html += '<button class="btn btn-sm" onclick="event.stopPropagation();undoAttendance(\'' + Common.esc(a.id) + '\',true)" style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 10px;font-size:11px;flex-shrink:0;margin-left:6px">撤销</button>';
      html += '</div>';
    }
    document.getElementById('todayList').innerHTML = html || '<div style="opacity:0.6;text-align:center;padding:20px 0;font-size:13px">暂无消课记录</div>';

    if (leaves.length > 0) {
      document.getElementById('todayLeaveCard').style.display = 'block';
      var lhtml = '';
      for (var i = 0; i < leaves.length; i++) {
        var a = leaves[i];
        var color = a.status === 'leave' ? '#faad14' : '#ff4d4f';
        var label = a.status === 'leave' ? '请假' : '旷课';
        lhtml += '<div class="list-item" style="display:flex;align-items:center;gap:10px;justify-content:space-between">';
        lhtml += '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0" onclick="showLeaveReason(\'' + Common.esc(a.name) + '\',\'' + Common.esc(a.reason || '无') + '\')">';
        lhtml += '<div style="width:36px;height:36px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">' + Common.esc(a.name.charAt(0)) + '</div>';
        lhtml += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + Common.esc(a.name) + '</div><div style="font-size:12px;color:#888;margin-top:2px"><span class="tag" style="background:' + color + '">' + label + '</span> ' + Common.esc(a.time_slot) + '</div></div>';
        lhtml += '<div style="color:#ccc;font-size:20px;margin-right:4px">›</div></div>';
        lhtml += '<button class="btn btn-sm" onclick="event.stopPropagation();undoAttendance(\'' + Common.esc(a.id) + '\',false)" style="background:#f5f5f5;color:#666;padding:4px 10px;font-size:11px;flex-shrink:0">撤销</button>';
        lhtml += '</div>';
      }
      document.getElementById('todayLeaveList').innerHTML = lhtml;
    } else {
      document.getElementById('todayLeaveCard').style.display = 'none';
    }

    // 近期请假记录（取全部考勤缓存）
    var allLeaves = allAttCache.filter(function(a) { return a.status === 'leave'; }).slice(0, 10);
    if (allLeaves.length > 0) {
      document.getElementById('recentLeaveCard').style.display = 'block';
      var rlhtml = '';
      for (var i = 0; i < allLeaves.length; i++) {
        var a = allLeaves[i];
        rlhtml += '<div class="list-item" onclick="showLeaveReason(\'' + Common.esc(a.student_name) + '\',\'' + Common.esc(a.reason || '无') + '\')">';
        rlhtml += '<div style="display:flex;align-items:center;gap:10px">';
        rlhtml += '<div style="width:32px;height:32px;border-radius:50%;background:#faad14;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + Common.esc(a.student_name.charAt(0)) + '</div>';
        rlhtml += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + Common.esc(a.student_name) + '</div><div style="font-size:11px;color:#888;margin-top:2px">' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</div></div>';
        rlhtml += '<div style="color:#ccc;font-size:16px">›</div></div></div>';
      }
      document.getElementById('recentLeaveList').innerHTML = rlhtml;
      var rl = document.getElementById('recentLeaveList');
      var arrow = document.getElementById('recentLeaveArrow');
      if (rl) rl.style.display = 'none';
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      document.getElementById('recentLeaveCard').style.display = 'none';
    }

    var totalHours = stats.total_hours || 0, remaining = stats.remaining_hours || 0;
    var rate = totalHours > 0 ? Math.round((totalHours - remaining) / totalHours * 100) : 0;
    var monRate = stats.monthly_attendance_rate || 0;
    var monColor = monRate >= 80 ? '#52c41a' : monRate >= 60 ? '#faad14' : '#ff4d4f';
    document.getElementById('stats').innerHTML =
      '<div class="stat-card"><div class="stat-value">' + stats.total_students + '</div><div class="stat-label">总学员</div></div>' +
      '<div class="stat-card"><div class="stat-value" style="color:#52c41a">' + stats.active_students + '</div><div class="stat-label">在读</div></div>' +
      '<div class="stat-card" onclick="switchTabById(\'page-statistics\');switchStatsView(\'consume\', this)"><div class="stat-value">' + rate + '%</div><div class="stat-label">存销比 ↘</div></div>' +
      '<div class="stat-card" onclick="showAttendanceRateModal()"><div class="stat-value" style="color:' + monColor + '">' + monRate + '%</div><div class="stat-label">月出勤率</div></div>';
    loadHomeSimpleSchedule(dash.schedule_preview || {});
    renderSchedulePreview(dash.schedule_preview || {});
  } catch (e) {
    console.error('loadStats error', e);
  }
}

function renderSchedulePreview(preview) {
  var container = document.getElementById('homeSchedulePreviewContent');
  if (!container) return;
  var days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
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
      bodyHtml += '<div style="flex-shrink:0"><span style="display:inline-block;background:#f0f2ff;color:#667eea;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px">' + Common.esc(day) + '</span></div>';
      bodyHtml += '<div style="flex:1;min-width:0">';
      bodyHtml += '<div style="font-size:12px;font-weight:600;color:#333;margin-bottom:2px">' + info.count + '人上课</div>';
      bodyHtml += '<div style="font-size:11px;color:#666;line-height:1.5;word-break:break-all">' + Common.esc(info.students.join('、')) + '</div>';
      bodyHtml += '</div>';
      bodyHtml += '</div>';
    }
    if (coachHas) {
      hasData = true;
      html += '<div style="margin-bottom:12px;background:#fafafa;border-radius:10px;border-left:4px solid ' + c + ';overflow:hidden">';
      html += '<div style="padding:10px 12px;background:' + c + '15;font-weight:600;font-size:13px;color:#333;display:flex;align-items:center;gap:8px">';
      html += '<span class="coach-chip" style="background:' + c + ';font-size:11px;padding:2px 8px">' + Common.esc(coach) + '</span>';
      html += '<span style="font-size:12px;color:#666">排课表</span>';
      html += '</div>';
      html += '<div style="padding:0 12px">' + bodyHtml + '</div>';
      html += '</div>';
    }
  }
  if (!hasData) {
    html += '<div class="empty" style="padding:20px 0;text-align:center"><div class="empty-icon" style="font-size:24px;margin-bottom:4px">📅</div><div style="font-size:13px;color:#999">暂无排课数据</div></div>';
  }
  container.innerHTML = html;
}

async function loadHomeSimpleSchedule(preview) {
  var container = document.getElementById('homeSimpleScheduleContent');
  if (!container) return;
  var days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  var coaches = Object.keys(preview).sort();
  var hasData = false;
  var html = '';
  for (var ci = 0; ci < coaches.length; ci++) {
    var coach = coaches[ci];
    var coachData = preview[coach];
    if (!coachData) continue;
    var c = Common.getCoachColor(coach);
    var coachHas = false;
    var dayHtml = '';
    for (var di = 0; di < days.length; di++) {
      var day = days[di];
      var info = coachData[day];
      if (!info || !info.count) continue;
      coachHas = true;
      dayHtml += '<div style="padding:6px 0;border-bottom:1px solid #f5f5f5;display:flex;align-items:flex-start;gap:6px">';
      dayHtml += '<span style="background:#f0f2ff;color:#667eea;font-size:11px;padding:2px 6px;border-radius:6px;flex-shrink:0;min-width:44px;text-align:center">' + Common.esc(day.replace('星期','')) + '</span>';
      dayHtml += '<span style="font-size:12px;color:#555;line-height:1.5">' + Common.esc(info.students.join('、')) + '</span>';
      dayHtml += '</div>';
    }
    if (coachHas) {
      hasData = true;
      html += '<div style="margin-bottom:8px">';
      html += '<span class="coach-chip" style="background:' + c + ';font-size:11px;padding:2px 8px;margin-bottom:4px;display:inline-block">' + Common.esc(coach) + '</span>';
      html += '<div style="padding-left:4px">' + dayHtml + '</div></div>';
    }
  }
  if (!hasData) {
    html = '<div style="text-align:center;color:#999;padding:16px 0;font-size:13px">暂无排课数据</div>';
  }
  container.innerHTML = html;
}

function jumpToDateDetail(date) {
  switchTabById('page-statistics');
  setTimeout(function() {
    switchStatsView('daily', document.querySelector('.stats-tab'));
    var rows = document.querySelectorAll('.grid-table tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var col = rows[i].querySelector('.date-col');
      if (col && col.textContent.includes(date)) {
        rows[i].style.background = '#f0f2ff';
        rows[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { rows[i].style.background = ''; }, 2000);
        break;
      }
    }
  }, 100);
}

async function showTodayDetail(studentId, studentName, timeSlot, coach) {
  var stu = null;
  if (allStudents.length === 0) {
    try { allStudents = await Common.apiFetch('/api/students'); } catch(e) { allStudents = []; }
  }
  stu = allStudents.find(function(s) { return s.id === studentId; });
  var enrollments = [];
  try { enrollments = await Common.apiFetch('/api/enrollments'); } catch(e) {}
  var latest = enrollments.filter(function(e) { return e.student_id === studentId; }).sort(function(a, b) { return b.date.localeCompare(a.date); })[0];
  var html = '<div style="text-align:center;margin-bottom:16px"><div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin:0 auto">' + Common.esc(studentName.charAt(0)) + '</div><div style="font-size:18px;font-weight:700;margin-top:10px">' + Common.esc(studentName) + '</div></div>';
  html += '<div class="info-row"><span class="info-label">授课教练</span><span><span class="coach-chip" style="background:' + Common.getCoachColor(coach) + '">' + Common.esc(coach) + '</span></span></div>';
  html += '<div class="info-row"><span class="info-label">上课时段</span><span class="info-value">' + Common.esc(timeSlot) + '</span></div>';
  html += '<div class="info-row"><span class="info-label">课程名称</span><span class="info-value">' + (latest ? Common.esc(latest.package_name) : '常规课') + '</span></div>';
  html += '<div class="info-row"><span class="info-label">剩余课时</span><span class="info-value green">' + (stu ? stu.remaining_hours : '--') + ' 节</span></div>';
  document.getElementById('modalTodayContent').innerHTML = html;
  showModal('modalTodayDetail');
}

function showLeaveReason(name, reason) {
  document.getElementById('modalLeaveContent').innerHTML = '<div style="text-align:center;margin-bottom:16px"><div style="width:48px;height:48px;border-radius:50%;background:#faad14;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto">' + Common.esc(name.charAt(0)) + '</div><div style="font-size:16px;font-weight:600;margin-top:8px">' + Common.esc(name) + '</div></div><div style="background:#fff8e6;border-radius:12px;padding:16px;font-size:15px;color:#555;line-height:1.8;border-left:4px solid #faad14">' + Common.esc(reason) + '</div>';
  showModal('modalLeaveReason');
}

// ==================== 统计页面 ====================
async function loadStatistics() {
  Common.showToast('加载统计...', 800);
  try {
    var [stats, dailyDetail, allAtt] = await Promise.all([
      Common.apiFetch('/api/stats'),
      Common.apiFetch('/api/daily_detail_stats').catch(function() { return []; }),
      Common.apiFetch('/api/all_attendance_records')
    ]);
    allAttCache = allAtt;
    var totalHours = stats.total_hours || 0, remaining = stats.remaining_hours || 0;
    var rate = totalHours > 0 ? Math.round((totalHours - remaining) / totalHours * 100) : 0;
    var summaryHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
    summaryHtml += '<div class="detail-stat"><div class="val" style="font-size:20px">' + stats.total_students + '</div><div class="lbl">总学员</div></div>';
    summaryHtml += '<div class="detail-stat"><div class="val" style="color:#52c41a;font-size:20px">' + stats.active_students + '</div><div class="lbl">在读</div></div>';
    summaryHtml += '<div class="detail-stat"><div class="val" style="font-size:20px">' + totalHours + '</div><div class="lbl">总课时</div></div>';
    summaryHtml += '<div class="detail-stat"><div class="val" style="color:#52c41a;font-size:20px">' + (totalHours - remaining) + '</div><div class="lbl">已消耗</div></div>';
    summaryHtml += '<div class="detail-stat"><div class="val" style="color:#faad14;font-size:20px">' + remaining + '</div><div class="lbl">剩余</div></div>';
    summaryHtml += '<div class="detail-stat"><div class="val" style="font-size:20px">' + rate + '%</div><div class="lbl">消耗率</div></div>';
    summaryHtml += '</div>';
    document.getElementById('statsSummaryContent').innerHTML = summaryHtml;

    renderDailyGrid(dailyDetail);
    renderLeaveRecords(allAtt);
  } catch (e) {
    console.error('loadStatistics error', e);
  }
}

function renderDailyGrid(dailyDetail) {
  var coaches = ['王教练', '陈教练', '孙教练'];
  var html = '<div class="card">';
  html += '<div class="section-title">每日上课明细（节数 / 人头）</div>';
  html += '<div style="overflow-x:auto">';
  html += '<table class="grid-table">';
  html += '<thead><tr>';
  html += '<th style="text-align:left;padding-left:8px">日期</th>';
  html += '<th style="color:#ff6b35">王教练<br><span style="font-size:10px;font-weight:400">节数/人头</span></th>';
  html += '<th style="color:#1e90ff">陈教练<br><span style="font-size:10px;font-weight:400">节数/人头</span></th>';
  html += '<th style="color:#b8860b">孙教练<br><span style="font-size:10px;font-weight:400">节数/人头</span></th>';
  html += '<th>合计</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < dailyDetail.length; i++) {
    var d = dailyDetail[i];
    var w = d.coaches['王教练'] || { count: 0, headcount: 0 };
    var c = d.coaches['陈教练'] || { count: 0, headcount: 0 };
    var s = d.coaches['孙教练'] || { count: 0, headcount: 0 };
    var total = w.count + c.count + s.count;
    var isToday = d.date === Common.today();
    html += '<tr style="cursor:pointer' + (isToday ? ';background:#f0f2ff' : '') + '" onclick="showDailyStudents(\'' + Common.esc(d.date) + '\')">';
    html += '<td class="date-col' + (isToday ? ' total-col' : '') + '">' + (isToday ? '📌 ' : '') + Common.esc(d.date) + '</td>';
    html += '<td class="coach-wang">' + (w.count > 0 ? w.count + '<br><span style="font-size:10px;font-weight:400">' + w.headcount + '人</span>' : '<span style="color:#ddd">0</span>') + '</td>';
    html += '<td class="coach-chen">' + (c.count > 0 ? c.count + '<br><span style="font-size:10px;font-weight:400">' + c.headcount + '人</span>' : '<span style="color:#ddd">0</span>') + '</td>';
    html += '<td class="coach-sun">' + (s.count > 0 ? s.count + '<br><span style="font-size:10px;font-weight:400">' + s.headcount + '人</span>' : '<span style="color:#ddd">0</span>') + '</td>';
    html += '<td class="total-col">' + (total > 0 ? total : '<span style="color:#ddd">0</span>') + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div></div>';
  document.getElementById('statsDailyView').innerHTML = html;
}

function renderLeaveRecords(allAtt) {
  var leaves = allAtt.filter(function(a) { return a.status === 'leave'; }).slice(0, 20);
  if (leaves.length > 0) {
    var html = '';
    for (var i = 0; i < leaves.length; i++) {
      var a = leaves[i];
      html += '<div class="list-item">';
      html += '<div style="display:flex;align-items:center;gap:10px">';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:#faad14;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + Common.esc(a.student_name.charAt(0)) + '</div>';
      html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + Common.esc(a.student_name) + '</div><div style="font-size:11px;color:#888;margin-top:2px"><span class="tag tag-yellow">请假</span> ' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</div>';
      if (a.reason) html += '<div style="font-size:11px;color:#999;margin-top:2px">原因: ' + Common.esc(a.reason) + '</div>';
      html += '</div></div></div>';
    }
    document.getElementById('statsLeaveList').innerHTML = html;
  } else {
    document.getElementById('statsLeaveList').innerHTML = '<div class="empty"><div class="empty-icon">📋</div>暂无请假记录</div>';
  }
}

function renderRecentAttendView() {
  var html = '<div class="card">';
  html += '<div class="section-title">近期消课记录</div>';
  var atts = allAttCache.filter(function(a) { return a.status === 'present'; }).slice(0, 30);
  if (atts.length > 0) {
    for (var i = 0; i < atts.length; i++) {
      var a = atts[i];
      html += '<div class="list-item">';
      html += '<div style="display:flex;align-items:center;gap:10px">';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + Common.esc(a.student_name.charAt(0)) + '</div>';
      html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + Common.esc(a.student_name) + '</div><div style="font-size:11px;color:#888;margin-top:2px"><span class="coach-chip" style="background:' + Common.getCoachColor(a.coach) + ';font-size:10px;padding:2px 6px">' + Common.esc(a.coach) + '</span> ' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</div></div>';
      html += '<div style="color:#52c41a;font-weight:700;font-size:12px">消课</div></div></div>';
    }
  } else {
    html += '<div class="empty"><div class="empty-icon">✅</div>暂无消课记录</div>';
  }
  html += '</div>';
  document.getElementById('statsRecentView').innerHTML = html;
}

// 修复：接受点击元素作为参数，避免 event.target 指向子元素
function switchStatsView(view, el) {
  currentStatsView = view;
  document.querySelectorAll('.stats-tab').forEach(function(t) { t.classList.remove('active'); });
  if (!el) el = document.querySelectorAll('.stats-tab')[0];
  if (el) el.classList.add('active');
  document.getElementById('statsDailyView').style.display = view === 'daily' ? 'block' : 'none';
  document.getElementById('statsMonthlyView').style.display = view === 'monthly' ? 'block' : 'none';
  document.getElementById('statsConsumeView').style.display = view === 'consume' ? 'block' : 'none';
  document.getElementById('statsRecentView').style.display = view === 'recent' ? 'block' : 'none';
  document.getElementById('statsLeaveCard').style.display = view === 'recent' ? 'none' : 'block';
  if (view === 'monthly') loadMonthlyView();
  else if (view === 'consume') loadConsumeView();
  else if (view === 'recent') renderRecentAttendView();
}

async function loadMonthlyView() {
  Common.showToast('加载月度数据...', 800);
  try {
    var mData = await Common.apiFetch('/api/monthly_coach_stats').catch(function() { return []; });
    var coaches = ['王教练', '陈教练', '孙教练'];
    var now = new Date();
    var currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var html = '';
    var months = mData.slice().reverse();
    for (var mi = 0; mi < months.length; mi++) {
      var m = months[mi], month = m[0], days = m[1];
      var tw = 0, tc = 0, ts = 0;
      for (var d in days) { tw += days[d]['王教练'] || 0; tc += days[d]['陈教练'] || 0; ts += days[d]['孙教练'] || 0; }
      var total = tw + tc + ts;
      var isCurrent = month === currentMonth;
      var dayKeys = Object.keys(days).sort();
      html += '<div class="month-group">';
      html += '<div class="month-header" onclick="this.classList.toggle(\'expanded\');var b=this.nextElementSibling;b.style.display=b.style.display==\'none\'?\'block\':\'none\';this.querySelector(\'.month-arrow\').classList.toggle(\'up\')">';
      html += '<div><div class="month-title">' + Common.esc(month) + ' ' + (isCurrent ? '（本月）' : '') + '</div>';
      html += '<div class="month-summary"><span>王 <strong style="color:#ff6b35">' + tw + '</strong></span><span>陈 <strong style="color:#1e90ff">' + tc + '</strong></span><span>孙 <strong style="color:#b8860b">' + ts + '</strong></span><span>合计 <strong>' + total + '</strong></span></div></div>';
      html += '<div class="month-arrow' + (isCurrent ? ' up' : '') + '">▼</div></div>';
      html += '<div class="month-body" style="display:' + (isCurrent ? 'block' : 'none') + '">';
      html += '<div class="month-body-inner">';
      html += '<table class="grid-table"><thead><tr>';
      html += '<th style="text-align:left;padding-left:8px">日期</th>';
      html += '<th style="color:#ff6b35">王教练</th><th style="color:#1e90ff">陈教练</th><th style="color:#b8860b">孙教练</th><th>合计</th>';
      html += '</tr></thead><tbody>';
      for (var di = 0; di < dayKeys.length; di++) {
        var day = dayKeys[di];
        var w = days[day]['王教练'] || 0, c = days[day]['陈教练'] || 0, s = days[day]['孙教练'] || 0;
        var sum = w + c + s;
        html += '<tr><td class="date-col">' + Common.esc(day) + '</td>';
        html += '<td class="coach-wang">' + (w > 0 ? w : '<span style="color:#ddd">0</span>') + '</td>';
        html += '<td class="coach-chen">' + (c > 0 ? c : '<span style="color:#ddd">0</span>') + '</td>';
        html += '<td class="coach-sun">' + (s > 0 ? s : '<span style="color:#ddd">0</span>') + '</td>';
        html += '<td class="total-col">' + (sum > 0 ? sum : '<span style="color:#ddd">0</span>') + '</td></tr>';
      }
      html += '</tbody></table></div></div></div>';
    }
    if (months.length === 0) html = '<div class="empty"><div class="empty-icon">📊</div>暂无数据</div>';
    document.getElementById('statsMonthlyView').innerHTML = html;
  } catch (e) {
    console.error('loadMonthlyView error', e);
  }
}

async function loadConsumeView() {
  try {
    var stats = await Common.apiFetch('/api/stats');
    var totalHours = stats.total_hours || 0, remaining = stats.remaining_hours || 0, consumed = totalHours - remaining;
    var rate = stats.consumption_rate || 0;
    var amountRate = stats.consumption_amount_rate || 0;
    var totalAmount = stats.total_purchase_amount || 0;
    var consumedAmount = stats.consumed_amount || 0;
    var color = rate >= 50 ? '#52c41a' : rate >= 25 ? '#faad14' : '#ff4d4f';
    var amountColor = amountRate >= 50 ? '#52c41a' : amountRate >= 25 ? '#faad14' : '#ff4d4f';
    var html = '<div class="card">';
    html += '<div class="section-title">存销比分析</div>';
    if (totalAmount === 0) {
      html += '<div style="text-align:center;padding:16px;background:#fff8e6;border-radius:8px;margin-bottom:12px;font-size:13px;color:#b8860b">';
      html += '⚠️ 暂无学员的课程包信息（价格/课时），金额存销比无法计算。<br>请进入<span style="font-weight:600">学员管理 → 点击学员 → 编辑信息 → 课程包信息</span>中为学员添加课程包。</div>';
    }
    html += '<div style="text-align:center;margin-bottom:16px;display:flex;justify-content:center;gap:24px">';
    html += '<div style="position:relative;width:100px;height:100px">';
    html += '<svg width="100" height="100" style="transform:rotate(-90deg)">';
    html += '<circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" stroke-width="8"/>';
    html += '<circle cx="50" cy="50" r="42" fill="none" stroke="' + color + '" stroke-width="8" stroke-dasharray="' + (rate * 2.64) + ',264" stroke-linecap="round"/>';
    html += '</svg>';
    html += '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">';
    html += '<div style="font-size:24px;font-weight:700;color:' + color + '">' + rate + '%</div><div style="font-size:10px;color:#999">课时消耗率</div></div></div>';
    if (totalAmount > 0) {
      html += '<div style="position:relative;width:100px;height:100px">';
      html += '<svg width="100" height="100" style="transform:rotate(-90deg)">';
      html += '<circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" stroke-width="8"/>';
      html += '<circle cx="50" cy="50" r="42" fill="none" stroke="' + amountColor + '" stroke-width="8" stroke-dasharray="' + (amountRate * 2.64) + ',264" stroke-linecap="round"/>';
      html += '</svg>';
      html += '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">';
      html += '<div style="font-size:24px;font-weight:700;color:' + amountColor + '">' + amountRate + '%</div><div style="font-size:10px;color:#999">金额消耗率</div></div></div>';
    }
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">';
    html += '<div class="detail-stat"><div class="val">' + totalHours + '</div><div class="lbl">总课时</div></div>';
    html += '<div class="detail-stat"><div class="val" style="color:#52c41a">' + consumed + '</div><div class="lbl">已消耗</div></div>';
    html += '<div class="detail-stat"><div class="val" style="color:#faad14">' + remaining + '</div><div class="lbl">剩余</div></div></div>';
    if (totalAmount > 0) {
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">';
      html += '<div class="detail-stat"><div class="val" style="font-size:20px">¥' + totalAmount.toLocaleString() + '</div><div class="lbl">总购课金额</div></div>';
      html += '<div class="detail-stat"><div class="val" style="color:#52c41a;font-size:20px">¥' + Math.round(consumedAmount).toLocaleString() + '</div><div class="lbl">已消耗金额</div></div>';
      html += '<div class="detail-stat"><div class="val" style="color:#faad14;font-size:20px">¥' + Math.round(totalAmount - consumedAmount).toLocaleString() + '</div><div class="lbl">剩余金额</div></div></div>';
    }
    html += '<div class="section-title">按教练消耗统计</div>';
    for (var coach in stats.coach_stats) {
      var c = stats.coach_stats[coach];
      var cr = c.rate || 0;
      var cc = cr >= 80 ? '#52c41a' : cr >= 50 ? '#faad14' : '#ff4d4f';
      html += '<div class="info-row"><span class="info-label"><span class="coach-chip" style="background:' + Common.getCoachColor(coach) + '">' + coach + '</span></span>';
      html += '<span class="info-value"><span style="font-weight:700;color:' + cc + '">' + cr + '%</span>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + cr + '%;background:' + cc + '"></div></div></span></div>';
    }
    var amtStats = stats.coach_amount_stats || {};
    if (Object.keys(amtStats).length > 0) {
      html += '<div class="section-title" style="margin-top:16px">按教练金额消耗</div>';
      for (var coach2 in amtStats) {
        var ac = amtStats[coach2];
        var ar = ac.rate || 0;
        var acolor = ar >= 80 ? '#52c41a' : ar >= 50 ? '#faad14' : '#ff4d4f';
        html += '<div class="info-row"><span class="info-label"><span class="coach-chip" style="background:' + Common.getCoachColor(coach2) + '">' + coach2 + '</span></span>';
        html += '<span class="info-value"><span style="font-weight:700;color:' + acolor + '">' + ar + '%</span>';
        html += '<div class="progress-bar"><div class="progress-fill" style="width:' + ar + '%;background:' + acolor + '"></div></div></span></div>';
      }
    }
    html += '</div>';
    document.getElementById('statsConsumeView').innerHTML = html;
  } catch (e) {
    console.error('loadConsumeView error', e);
  }
}

// ==================== 学员列表 ====================
async function loadStudents() {
  Common.showToast('加载学员...', 600);
  try {
    allStudents = await Common.apiFetch('/api/students');
    tempStudentList = allStudents.filter(function(s) { return s.status === 'active'; });
    studentRateCache = {};
    renderStudents(allStudents);
  } catch (e) {
    console.error('loadStudents error', e);
  }
}

function renderStudents(list) {
  document.getElementById('studentCount').textContent = list.length;
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var rateInfo = getStudentMonthlyRate(s.id);
    html += '<div class="card" style="margin:0 12px 10px;border-radius:14px"><div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="showStudentDetail(\'' + Common.esc(s.id) + '\')">';
    html += '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0">' + Common.esc(s.name.charAt(0)) + '</div>';
    html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + Common.esc(s.name) + '</div>';
    html += '<div style="font-size:12px;color:#888;margin-top:2px">' + (s.phone || '') + ' · <span class="coach-chip" style="background:' + Common.getCoachColor(s.coach) + ';font-size:11px;padding:2px 8px">' + Common.esc(s.coach) + '</span> · <span style="color:' + (parseFloat(s.remaining_hours) > 0 ? '#52c41a' : '#ff4d4f') + '">' + s.remaining_hours + '课</span></div></div>';
    html += '<div style="text-align:right;cursor:pointer" onclick="event.stopPropagation();showStudentAttendanceDetail(\'' + Common.esc(s.id) + '\')">';
    html += '<div style="font-weight:700;font-size:15px;color:' + rateInfo.color + '">' + rateInfo.rate + '%</div>';
    html += '<div style="font-size:11px;color:#888">月出勤率</div></div>';
    html += '<div style="color:#ccc;font-size:18px;margin-left:4px">›</div></div></div>';
  }
  document.getElementById('studentsList').innerHTML = html || '<div class="empty"><div class="empty-icon">📭</div>暂无学员</div>';
}

function getStudentMonthlyRate(studentId) {
  if (!allAttCache || allAttCache.length === 0) return { rate: '--', color: '#999' };
  if (studentRateCache[studentId]) return studentRateCache[studentId];
  var now = new Date();
  var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var monthAtt = allAttCache.filter(function(a) { return a.student_id === studentId && a.date.slice(0, 7) === ym; });
  var present = monthAtt.filter(function(a) { return a.status === 'present'; }).length;
  var absent = monthAtt.filter(function(a) { return a.status === 'leave' || a.status === 'absence'; }).length;
  var total = present + absent;
  var rate = total > 0 ? Math.round(present / total * 100) : 0;
  var color = rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#ff4d4f';
  studentRateCache[studentId] = { rate: rate, present: present, absent: absent, total: total, color: color };
  return studentRateCache[studentId];
}

var filterStudents = Common.debounce(function() {
  var kw = document.getElementById('searchInput').value.toLowerCase();
  var filtered = allStudents.filter(function(s) { return s.name.toLowerCase().includes(kw) || (s.phone || '').includes(kw); });
  renderStudents(filtered);
}, 300);

async function showStudentDetail(id) {
  var s = allStudents.find(function(x) { return x.id === id; });
  if (!s) return;
  currentStudentId = id;
  Common.showToast('加载详情...', 600);
  try {
    var enrollments = await Common.apiFetch('/api/enrollments').catch(function() { return []; });
    var studentPackages = enrollments.filter(function(e) { return e.student_id === id; }).sort(function(a, b) { return b.date.localeCompare(a.date); });
    var schedules = await Common.apiFetch('/api/schedules').catch(function() { return []; });
    var studentSchedules = schedules.filter(function(sc) { return sc.student_id === id; });

    document.getElementById('modalStudentName').textContent = Common.esc(s.name);
    var html = '<div style="text-align:center;margin-bottom:16px"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin:0 auto">' + Common.esc(s.name.charAt(0)) + '</div></div>';
    html += '<div class="info-row"><span class="info-label">联系电话</span><span class="info-value">' + (s.phone ? '<a href="tel:' + Common.esc(s.phone) + '" style="color:#667eea;text-decoration:none">' + Common.esc(s.phone) + '</a>' : '-') + '</span></div>';
    html += '<div class="info-row"><span class="info-label">授课教练</span><span class="info-value"><span class="coach-chip" style="background:' + Common.getCoachColor(s.coach) + '">' + Common.esc(s.coach) + '</span></span></div>';
    html += '<div class="info-row"><span class="info-label">学员等级</span><span class="info-value">' + (s.level || '-') + '</span></div>';
    html += '<div class="info-row"><span class="info-label">剩余课时</span><span class="info-value green">' + s.remaining_hours + ' 节</span></div>';
    html += '<div class="info-row"><span class="info-label">已购课时</span><span class="info-value">' + (s.purchased_hours || 0) + ' 节</span></div>';
    html += '<div class="info-row"><span class="info-label">赠送课时</span><span class="info-value">' + (s.bonus_hours || 0) + ' 节</span></div>';
    html += '<div class="info-row"><span class="info-label">总课时</span><span class="info-value">' + ((s.purchased_hours || 0) + (s.bonus_hours || 0)) + ' 节</span></div>';
    html += '<div class="info-row"><span class="info-label">状态</span><span class="info-value"><span class="tag tag-' + (s.status === 'active' ? 'green' : 'gray') + '">' + (s.status === 'active' ? '在读' : '已结') + '</span></span></div>';
    html += '<div class="info-row"><span class="info-label">注册日期</span><span class="info-value">' + (s.register_date || '-') + '</span></div>';

    if (studentPackages.length > 0) {
      html += '<div style="margin-top:16px;padding:12px;background:#f5f8ff;border-radius:8px">';
      html += '<div style="font-weight:600;margin-bottom:8px;font-size:14px;color:#667eea">📦 课程包信息</div>';
      for (var i = 0; i < studentPackages.length; i++) {
        var pkg = studentPackages[i];
        html += '<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05)">';
        html += '<div style="font-weight:500;font-size:13px">' + Common.esc(pkg.package_name || '未命名课程包') + '</div>';
        html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-top:4px">';
        html += '<span>课时: ' + (pkg.hours || 0) + '节</span>';
        html += '<span>价格: ¥' + (pkg.price || 0) + '</span>';
        var unitPrice = (pkg.hours > 0 && pkg.price > 0) ? '¥' + Math.round(pkg.price / pkg.hours) + '/节' : '-';
        html += '<span>单价: ' + unitPrice + '</span>';
        html += '<span>日期: ' + (pkg.date || '-') + '</span>';
        html += '</div></div>';
      }
      html += '</div>';
    } else {
      html += '<div style="margin-top:16px;padding:12px;background:#f5f8ff;border-radius:8px;text-align:center;color:#999;font-size:13px">暂无课程包</div>';
    }

    if (studentSchedules.length > 0) {
      html += '<div style="margin-top:16px;padding:12px;background:#fff8e6;border-radius:8px">';
      html += '<div style="font-weight:600;margin-bottom:8px;font-size:14px;color:#faad14">⏰ 上课时间段</div>';
      for (var i = 0; i < studentSchedules.length; i++) {
        var sc = studentSchedules[i];
        html += '<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05)">';
        html += '<div style="font-weight:500;font-size:13px">' + Common.esc(sc.week_day) + ' ' + Common.esc(sc.time_slot) + '</div>';
        html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-top:4px">';
        html += '<span>教练: ' + Common.esc(sc.coach) + '</span>';
        html += '<span>状态: ' + Common.esc(sc.status || '已安排') + '</span>';
        html += '</div></div>';
      }
      html += '</div>';
    } else {
      html += '<div style="margin-top:16px;padding:12px;background:#fff8e6;border-radius:8px;text-align:center;color:#999;font-size:13px">暂无排课</div>';
    }

    html += '<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    html += '<button class="btn" onclick="openEditStudent(\'' + Common.esc(s.id) + '\')" style="background:#52c41a;color:#fff;padding:12px">✏️ 编辑信息</button>';
    html += '<button class="btn btn-danger" onclick="deleteStudent(\'' + Common.esc(s.id) + '\')" style="padding:12px">删除学员</button>';
    html += '</div>';

    document.getElementById('modalStudentContent').innerHTML = html;
    showModal('modalStudentDetail');
  } catch (e) {
    console.error('showStudentDetail error', e);
  }
}

async function showStudentAttendanceDetail(studentId) {
  var s = allStudents.find(function(x) { return x.id === studentId; });
  if (!s) return;
  if (!allAttCache || allAttCache.length === 0) {
    try { allAttCache = await Common.apiFetch('/api/all_attendance_records'); } catch(e) { allAttCache = []; }
  }
  var now = new Date();
  var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var monthAtt = allAttCache.filter(function(a) { return a.student_id === studentId && a.date.slice(0, 7) === ym; }).sort(function(a, b) { return b.date.localeCompare(a.date); });
  var present = monthAtt.filter(function(a) { return a.status === 'present'; });
  var absent = monthAtt.filter(function(a) { return a.status === 'leave' || a.status === 'absence'; });

  var html = '<div style="text-align:center;margin-bottom:16px"><div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto">' + Common.esc(s.name.charAt(0)) + '</div>';
  html += '<div style="font-size:16px;font-weight:700;margin-top:8px">' + Common.esc(s.name) + '</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px">' + ym + ' 月出勤明细</div></div>';

  var rateInfo = getStudentMonthlyRate(studentId);
  var total = rateInfo.total || (present.length + absent.length);
  var color = rateInfo.color || '#999';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">';
  html += '<div class="detail-stat"><div class="val" style="font-size:22px;color:#52c41a">' + present.length + '</div><div class="lbl">出勤</div></div>';
  html += '<div class="detail-stat"><div class="val" style="font-size:22px;color:#faad14">' + absent.length + '</div><div class="lbl">缺勤</div></div>';
  html += '<div class="detail-stat"><div class="val" style="font-size:22px;color:' + color + '">' + rateInfo.rate + '%</div><div class="lbl">出勤率</div></div>';
  html += '</div>';

  if (present.length > 0) {
    html += '<div style="font-weight:600;font-size:13px;color:#52c41a;margin-bottom:8px">✅ 出勤记录（' + present.length + '节）</div>';
    for (var i = 0; i < present.length; i++) {
      var a = present[i];
      html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f5f5f5">';
      html += '<div style="width:28px;height:28px;border-radius:50%;background:#52c41a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">✓</div>';
      html += '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</div><div style="font-size:11px;color:#888"><span class="coach-chip" style="background:' + Common.getCoachColor(a.coach) + ';font-size:10px;padding:1px 6px">' + Common.esc(a.coach) + '</span></div></div>';
      html += '<div style="color:#52c41a;font-size:12px;font-weight:600">消课</div></div>';
    }
  }

  if (absent.length > 0) {
    html += '<div style="font-weight:600;font-size:13px;color:#faad14;margin-top:14px;margin-bottom:8px">⚠️ 缺勤记录（' + absent.length + '节）</div>';
    for (var i = 0; i < absent.length; i++) {
      var a = absent[i];
      var label = a.status === 'leave' ? '请假' : '旷课';
      var clr = a.status === 'leave' ? '#faad14' : '#ff4d4f';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f5f5f5">';
      html += '<div style="width:28px;height:28px;border-radius:50%;background:' + clr + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">✗</div>';
      html += '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</div><div style="font-size:11px;color:#888"><span style="color:' + clr + '">' + label + '</span>' + (a.reason ? ' · ' + Common.esc(a.reason) : '') + '</div></div>';
      html += '<div style="color:' + clr + ';font-size:12px;font-weight:600">' + label + '</div></div>';
    }
  }

  if (monthAtt.length === 0) {
    html += '<div class="empty"><div class="empty-icon">📋</div>本月暂无考勤记录</div>';
  }

  document.getElementById('modalAttStuName').textContent = Common.esc(s.name) + ' 出勤明细';
  document.getElementById('modalStudentAttContent').innerHTML = html;
  showModal('modalStudentAttDetail');
}

// 编辑学员信息
async function openEditStudent(id) {
  closeModal('modalStudentDetail');
  var s = allStudents.find(function(x) { return x.id === id; });
  if (!s) return;
  document.getElementById('editStudentId').value = id;
  document.getElementById('editStudentName').value = s.name || '';
  document.getElementById('editStudentPhone').value = s.phone || '';
  document.getElementById('editStudentHours').value = s.remaining_hours || 0;
  document.getElementById('editStudentBonusHours').value = s.bonus_hours || 0;

  var levelSelect = document.getElementById('editStudentLevel');
  if (levelSelect) {
    for (var i = 0; i < levelSelect.options.length; i++) {
      if (levelSelect.options[i].value === s.level || levelSelect.options[i].text === s.level) {
        levelSelect.selectedIndex = i;
        break;
      }
    }
  }

  var statusSelect = document.getElementById('editStudentStatus');
  if (statusSelect) {
    for (var i = 0; i < statusSelect.options.length; i++) {
      if (statusSelect.options[i].value === s.status) {
        statusSelect.selectedIndex = i;
        break;
      }
    }
  }

  try {
    var settings = await Common.apiFetch('/api/settings');
    editStudentSettings = settings || {};
    var coaches = settings.coaches || [];
    var coachSelect = document.getElementById('editStudentCoach');
    if (coachSelect) {
      coachSelect.innerHTML = '<option value="">选择教练</option>';
      for (var i = 0; i < coaches.length; i++) {
        var option = document.createElement('option');
        option.value = coaches[i];
        option.textContent = coaches[i];
        if (coaches[i] === s.coach) option.selected = true;
        coachSelect.appendChild(option);
      }
    }
  } catch (e) {
    console.error('加载教练列表失败:', e);
  }
  await loadStudentEnrollmentsForEdit(id);
  await loadStudentSchedulesForEdit(id);
  showModal('modalEditStudent');
}

var editStudentSettings = {};

function getDayOptionsHtml(selected) {
  var days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  var html = '';
  for (var i = 0; i < days.length; i++) {
    html += '<option value="' + days[i] + '"' + (days[i] === selected ? ' selected' : '') + '>' + days[i] + '</option>';
  }
  return html;
}
function getSlotOptionsHtml(day, selected) {
  var slots = (editStudentSettings.time_slots || {})[day] || [];
  var html = '';
  for (var i = 0; i < slots.length; i++) {
    html += '<option value="' + Common.esc(slots[i]) + '"' + (slots[i] === selected ? ' selected' : '') + '>' + Common.esc(slots[i]) + '</option>';
  }
  return html;
}
function getCoachOptionsHtml(selected) {
  var coaches = editStudentSettings.coaches || [];
  var html = '<option value="">选择教练</option>';
  for (var i = 0; i < coaches.length; i++) {
    html += '<option value="' + Common.esc(coaches[i]) + '"' + (coaches[i] === selected ? ' selected' : '') + '>' + Common.esc(coaches[i]) + '</option>';
  }
  return html;
}

async function loadStudentSchedulesForEdit(studentId) {
  var scheduleList = document.getElementById('editScheduleList');
  if (!scheduleList) return;
  try {
    var schedules = await Common.apiFetch('/api/schedules').catch(function() { return []; });
    var studentSchedules = schedules.filter(function(sc) { return sc.student_id === studentId; });
    var html = '';
    // 新增排课行（默认隐藏）
    html += '<div id="addScheduleRow" style="display:none;padding:10px;margin-bottom:10px;background:#f0f7ff;border-radius:4px;border:1px solid #91d5ff">';
    html += '<div style="font-weight:600;font-size:12px;color:#1890ff;margin-bottom:6px">新增排课</div>';
    html += '<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">';
    html += '<select id="addScheduleDay" onchange="document.getElementById(\'addScheduleSlot\').innerHTML=getSlotOptionsHtml(this.value)" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getDayOptionsHtml('星期一') + '</select>';
    html += '<select id="addScheduleSlot" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getSlotOptionsHtml('星期一') + '</select>';
    html += '<select id="addScheduleCoach" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getCoachOptionsHtml('') + '</select>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn-sm" onclick="saveNewSchedule()" style="background:#52c41a;color:#fff;padding:4px 10px;font-size:11px;flex:1">保存</button>';
    html += '<button class="btn btn-sm" onclick="hideAddScheduleRow()" style="background:#f5f5f5;color:#333;padding:4px 10px;font-size:11px;flex:1">取消</button>';
    html += '</div>';
    html += '</div>';

    if (studentSchedules.length === 0) {
      html += '<div id="emptyScheduleHint" style="text-align:center;color:#999;padding:12px">暂无排课</div>';
    } else {
      for (var i = 0; i < studentSchedules.length; i++) {
        var sc = studentSchedules[i];
        html += '<div id="schedule-row-' + Common.esc(sc.id) + '" style="padding:8px;margin-bottom:8px;background:#fff;border-radius:4px;border:1px solid #e8e8e8">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center">';
        html += '<div>';
        html += '<div style="font-weight:500;font-size:13px">' + Common.esc(sc.week_day) + ' ' + Common.esc(sc.time_slot) + '</div>';
        html += '<div style="font-size:11px;color:#666">教练: ' + Common.esc(sc.coach) + '</div>';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-sm" onclick="editSingleSchedule(\'' + Common.esc(sc.id) + '\', \'' + Common.esc(sc.week_day) + '\', \'' + Common.esc(sc.time_slot) + '\', \'' + Common.esc(sc.coach) + '\')" style="background:#1890ff;color:#fff;padding:2px 8px;margin-right:4px;font-size:11px">修改</button>';
        html += '<button class="btn btn-sm" onclick="deleteSingleSchedule(\'' + Common.esc(sc.id) + '\')" style="background:#ff4d4f;color:#fff;padding:2px 8px;font-size:11px">删除</button>';
        html += '</div>';
        html += '</div></div>';
      }
    }
    scheduleList.innerHTML = html;
  } catch (e) {
    console.error('加载排课失败:', e);
    scheduleList.innerHTML = '<div style="text-align:center;color:#ff4d4f;padding:12px">加载失败</div>';
  }
}

function showAddScheduleRow() {
  var row = document.getElementById('addScheduleRow');
  if (row) row.style.display = 'block';
}
function hideAddScheduleRow() {
  var row = document.getElementById('addScheduleRow');
  if (row) row.style.display = 'none';
}

async function saveNewSchedule() {
  var studentId = document.getElementById('editStudentId').value;
  var day = document.getElementById('addScheduleDay').value;
  var slot = document.getElementById('addScheduleSlot').value;
  var coach = document.getElementById('addScheduleCoach').value;
  if (!slot) { Common.showToast('请选择时间段'); return; }
  try {
    await Common.apiFetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, week_day: day, time_slot: slot, coach: coach })
    });
    await loadStudentSchedulesForEdit(studentId);
  } catch (e) {
    Common.showToast('新增失败: ' + e.message);
  }
}

function editSingleSchedule(scheduleId, weekDay, timeSlot, coach) {
  var row = document.getElementById('schedule-row-' + scheduleId);
  if (!row) return;
  var html = '<div style="padding:8px;background:#fff7e6;border-radius:4px;border:1px solid #ffd591">';
  html += '<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">';
  html += '<select id="edit-sched-day-' + scheduleId + '" onchange="document.getElementById(\'edit-sched-slot-' + scheduleId + '\').innerHTML=getSlotOptionsHtml(this.value)" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getDayOptionsHtml(weekDay) + '</select>';
  html += '<select id="edit-sched-slot-' + scheduleId + '" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getSlotOptionsHtml(weekDay, timeSlot) + '</select>';
  html += '<select id="edit-sched-coach-' + scheduleId + '" style="flex:1;min-width:80px;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">' + getCoachOptionsHtml(coach) + '</select>';
  html += '</div>';
  html += '<div style="display:flex;gap:6px">';
  html += '<button class="btn btn-sm" onclick="saveSingleScheduleEdit(\'' + scheduleId + '\')" style="background:#52c41a;color:#fff;padding:4px 10px;font-size:11px;flex:1">保存</button>';
  html += '<button class="btn btn-sm" onclick="cancelSingleScheduleEdit()" style="background:#f5f5f5;color:#333;padding:4px 10px;font-size:11px;flex:1">取消</button>';
  html += '</div>';
  html += '</div>';
  row.innerHTML = html;
}

async function saveSingleScheduleEdit(scheduleId) {
  var day = document.getElementById('edit-sched-day-' + scheduleId).value;
  var slot = document.getElementById('edit-sched-slot-' + scheduleId).value;
  var coach = document.getElementById('edit-sched-coach-' + scheduleId).value;
  try {
    await Common.apiFetch('/api/schedules/' + scheduleId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_day: day, time_slot: slot, coach: coach })
    });
    var studentId = document.getElementById('editStudentId').value;
    if (studentId) await loadStudentSchedulesForEdit(studentId);
  } catch (e) {
    Common.showToast('保存失败: ' + e.message);
  }
}

function cancelSingleScheduleEdit() {
  var studentId = document.getElementById('editStudentId').value;
  if (studentId) loadStudentSchedulesForEdit(studentId);
}

async function deleteSingleSchedule(scheduleId) {
  if (!confirm('确定要删除这个排课吗？')) return;
  try {
    await Common.apiFetch('/api/schedules/' + scheduleId, { method: 'DELETE' });
    var studentId = document.getElementById('editStudentId').value;
    if (studentId) await loadStudentSchedulesForEdit(studentId);
  } catch (e) {
    console.error('删除失败:', e);
    Common.showToast('删除失败，请检查网络连接');
  }
}

async function saveEditStudent() {
  var id = document.getElementById('editStudentId').value;
  var name = document.getElementById('editStudentName').value.trim();
  var phone = document.getElementById('editStudentPhone').value.trim();
  var coach = document.getElementById('editStudentCoach').value;
  var level = document.getElementById('editStudentLevel').value;
  var status = document.getElementById('editStudentStatus').value;
  var hours = parseInt(document.getElementById('editStudentHours').value) || 0;
  var bonusHours = parseInt(document.getElementById('editStudentBonusHours').value) || 0;
  if (!name) { Common.showToast('请输入学员姓名'); return; }
  try {
    var response = await Common.apiFetch('/api/students/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, phone: phone, coach: coach, level: level, status: status, remaining_hours: hours, bonus_hours: bonusHours })
    });
    Common.showToast('修改成功！');
    closeModal('modalEditStudent');
    await loadStudents();
    if (currentStudentId === id) showStudentDetail(id);
  } catch (e) {
    console.error('保存失败:', e);
    Common.showToast('保存失败，请检查网络连接');
  }
}

// ==================== 课表 ====================
async function loadSchedule() {
  Common.showToast('加载课表...', 600);
  try {
    var day = document.getElementById('scheduleDay').value;
    var settings = await Common.apiFetch('/api/settings');
    var schedules = await Common.apiFetch('/api/schedules?day=' + day);
    var students = await Common.apiFetch('/api/students');
    var slots = settings.time_slots[day] || [];
    var maxPer = settings.max_students_per_coach || 6;
    var studentMap = {}; for (var i = 0; i < students.length; i++) studentMap[students[i].id] = students[i];
    var coaches = settings.coaches || ['王教练', '陈教练', '孙教练'];
    var html = '';
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var ss = schedules.filter(function(s) { return s.time_slot === slot; });
      var count = ss.length;
      var color = count >= maxPer * 2 ? '#ff4d4f' : count >= maxPer ? '#faad14' : '#52c41a';
      html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="showSlotDetail(\'' + Common.esc(day) + '\',\'' + Common.esc(slot) + '\')">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      html += '<div style="font-weight:600;font-size:16px">' + Common.esc(slot) + '</div>';
      html += '<div style="background:' + color + ';color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">' + count + '/' + (maxPer * 2) + '人</div>';
      html += '</div>';
      var coachGroups = {};
      for (var j = 0; j < coaches.length; j++) coachGroups[coaches[j]] = ss.filter(function(s) { return s.coach === coaches[j]; });
      for (var j = 0; j < coaches.length; j++) {
        var coach = coaches[j];
        var list = coachGroups[coach];
        if (list.length > 0) {
          var c = Common.coachColors[coach] || '#9b59b6';
          html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
          html += '<span class="coach-chip" style="background:' + c + ';font-size:11px;padding:2px 8px">' + Common.esc(coach) + '</span>';
          html += '<div style="flex:1;display:flex;flex-wrap:wrap;gap:4px">';
          for (var k = 0; k < list.length; k++) {
            var sc = list[k];
            var sname = studentMap[sc.student_id] ? studentMap[sc.student_id].name : '未知';
            html += '<span style="background:#f0f0f5;padding:2px 8px;border-radius:10px;font-size:11px;color:#555">' + Common.esc(sname) + '</span>';
          }
          html += '</div></div>';
        }
      }
      html += '</div>';
    }
    document.getElementById('scheduleList').innerHTML = html || '<div class="empty"><div class="empty-icon">📅</div>暂无排课</div>';
  } catch (e) {
    console.error('loadSchedule error', e);
  }
}

async function showSlotDetail(day, slot) {
  try {
    var schedules = await Common.apiFetch('/api/schedules?day=' + day);
    var students = await Common.apiFetch('/api/students');
    var studentMap = {}; for (var i = 0; i < students.length; i++) studentMap[students[i].id] = students[i];
    var slotSchedules = schedules.filter(function(s) { return s.time_slot === slot; });
    var coaches = ['王教练', '陈教练', '孙教练'];
    var html = '<div style="text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:18px;font-weight:700">' + Common.esc(day) + ' ' + Common.esc(slot) + '</div>';
    html += '<div style="font-size:13px;color:#888;margin-top:4px">共 ' + slotSchedules.length + ' 位学员</div></div>';
    if (slotSchedules.length > 0) {
      for (var j = 0; j < coaches.length; j++) {
        var coach = coaches[j];
        var list = slotSchedules.filter(function(s) { return s.coach === coach; });
        if (list.length > 0) {
          var c = Common.coachColors[coach] || '#9b59b6';
          html += '<div class="section-title" style="margin-top:10px">' + Common.esc(coach) + '</div>';
          for (var k = 0; k < list.length; k++) {
            var sc = list[k];
            var sname = studentMap[sc.student_id] ? studentMap[sc.student_id].name : '未知';
            var srem = studentMap[sc.student_id] ? studentMap[sc.student_id].remaining_hours : 0;
            html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0">';
            html += '<div style="width:36px;height:36px;border-radius:50%;background:' + c + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">' + Common.esc(sname.charAt(0)) + '</div>';
            html += '<div style="flex:1;min-width:0">';
            html += '<div style="font-weight:600;font-size:14px">' + Common.esc(sname) + '</div>';
            html += '<div style="font-size:12px;color:#888;margin-top:2px">剩余 ' + srem + ' 课</div>';
            html += '</div>';
            html += '<button class="btn btn-danger btn-sm" onclick="deleteSchedule(\'' + Common.esc(sc.id) + '\',\'' + Common.esc(day) + '\',\'' + Common.esc(slot) + '\')" style="flex-shrink:0;width:auto;padding:6px 12px">删除</button>';
            html += '</div>';
          }
        }
      }
    } else {
      html += '<div class="empty"><div class="empty-icon">📭</div>该时段暂无排课学员</div>';
    }
    html += '<div style="margin-top:14px"><button class="btn" onclick="showAddStudentToSlot(\'' + Common.esc(day) + '\',\'' + Common.esc(slot) + '\')" style="width:100%">+ 添加学员到此时段</button></div>';
    document.getElementById('modalSlotContent').innerHTML = html;
    document.getElementById('modalSlotTitle').textContent = '时段详情';
    showModal('modalSlotDetail');
  } catch (e) {
    console.error('showSlotDetail error', e);
  }
}

async function deleteSchedule(scheduleId, day, slot) {
  if (!confirm('确定删除该排课记录？')) return;
  try {
    await Common.apiFetch('/api/schedules/' + scheduleId, { method: 'DELETE' });
    showSlotDetail(day, slot);
    loadSchedule();
  } catch (e) {
    console.error('deleteSchedule error', e);
  }
}

async function showAddStudentToSlot(day, slot) {
  if (allStudents.length === 0) {
    try { allStudents = await Common.apiFetch('/api/students'); } catch(e) { allStudents = []; }
  }
  try {
    var schedules = await Common.apiFetch('/api/schedules?day=' + day);
    var slotSchedules = schedules.filter(function(s) { return s.time_slot === slot; });
    var existingIds = {}; for (var i = 0; i < slotSchedules.length; i++) existingIds[slotSchedules[i].student_id] = true;
    var settings = await Common.apiFetch('/api/settings');
    var coaches = settings.coaches || ['王教练', '陈教练', '孙教练'];
    var active = allStudents.filter(function(s) { return s.status === 'active'; });
    var html = '<div style="text-align:center;margin-bottom:14px">';
    html += '<div style="font-size:15px;font-weight:700">' + Common.esc(day) + ' ' + Common.esc(slot) + '</div>';
    html += '<div style="font-size:12px;color:#888;margin-top:4px">选择学员添加到此时段</div></div>';
    html += '<div class="form-group"><label>选择教练</label>';
    html += '<select id="slotAddCoach" style="width:100%;padding:11px;border:1px solid #e0e0e0;border-radius:10px;font-size:14px;background:#fff">';
    for (var i = 0; i < coaches.length; i++) html += '<option>' + coaches[i] + '</option>';
    html += '</select></div>';
    html += '<div class="section-title">可选学员</div>';
    var available = active.filter(function(s) { return !existingIds[s.id]; });
    if (available.length === 0) {
      html += '<div class="empty"><div class="empty-icon">✅</div>所有在读学员已在此时段</div>';
    }
    for (var i = 0; i < available.length; i++) {
      var s = available[i];
      var c = Common.coachColors[s.coach] || '#9b59b6';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" onclick="addStudentToSlot(\'' + Common.esc(s.id) + '\',\'' + Common.esc(day) + '\',\'' + Common.esc(slot) + '\')">';
      html += '<div style="width:36px;height:36px;border-radius:50%;background:' + c + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">' + Common.esc(s.name.charAt(0)) + '</div>';
      html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + Common.esc(s.name) + '</div><div style="font-size:12px;color:#888;margin-top:2px">' + Common.esc(s.coach) + ' · 剩余' + s.remaining_hours + '课</div></div>';
      html += '<div style="color:#52c41a;font-size:20px">+</div></div>';
    }
    document.getElementById('modalSlotContent').innerHTML = html;
    document.getElementById('modalSlotTitle').textContent = '添加学员';
    showModal('modalSlotDetail');
  } catch (e) {
    console.error('showAddStudentToSlot error', e);
  }
}

async function addStudentToSlot(studentId, day, slot) {
  var coach = document.getElementById('slotAddCoach') ? document.getElementById('slotAddCoach').value : '王教练';
  try {
    await Common.apiFetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, week_day: day, time_slot: slot, coach: coach })
    });
    showSlotDetail(day, slot);
    loadSchedule();
  } catch (e) {
    console.error('addStudentToSlot error', e);
  }
}

async function showMoveSchedule() {
  try {
    var schedules = await Common.apiFetch('/api/schedules');
    var students = await Common.apiFetch('/api/students');
    var studentMap = {}; for (var i = 0; i < students.length; i++) studentMap[students[i].id] = students[i];
    var html = '';
    for (var i = 0; i < schedules.length; i++) {
      var sc = schedules[i];
      var name = studentMap[sc.student_id] ? studentMap[sc.student_id].name : '未知';
      html += '<option value="' + Common.esc(sc.id) + '">' + Common.esc(name) + ' ' + Common.esc(sc.week_day) + ' ' + Common.esc(sc.time_slot) + '</option>';
    }
    document.getElementById('moveFromSchedule').innerHTML = html;
    showModal('modalMoveSchedule');
  } catch (e) {
    console.error('showMoveSchedule error', e);
  }
}

async function loadMoveNewSlots() {
  var day = document.getElementById('moveNewDay').value;
  try {
    var settings = await Common.apiFetch('/api/settings');
    var slots = settings.time_slots[day] || [];
    var html = ''; for (var i = 0; i < slots.length; i++) html += '<option>' + slots[i] + '</option>';
    document.getElementById('moveNewSlot').innerHTML = html;
  } catch (e) {
    console.error('loadMoveNewSlots error', e);
  }
}

async function confirmMoveSchedule() {
  var sid = document.getElementById('moveFromSchedule').value;
  var day = document.getElementById('moveNewDay').value;
  var slot = document.getElementById('moveNewSlot').value;
  var coach = document.getElementById('moveNewCoach').value;
  try {
    await Common.apiFetch('/api/schedules/' + sid, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_day: day, time_slot: slot, coach: coach })
    });
    closeModal('modalMoveSchedule');
    loadSchedule();
    Common.showToast('调课成功');
  } catch (e) {
    Common.showToast('调课失败: ' + e.message);
  }
}

// ==================== 消课点名 ====================
async function loadAttSlots() {
  var day = document.getElementById('attDay').value;
  try {
    var settings = await Common.apiFetch('/api/settings');
    var slots = settings.time_slots[day] || [];
    var html = ''; for (var i = 0; i < slots.length; i++) html += '<option>' + slots[i] + '</option>';
    document.getElementById('attSlot').innerHTML = html;
    document.getElementById('attDate').value = Common.today();
    // 自动加载当前时间段学员
    await loadAttStudents();
  } catch (e) {
    console.error('loadAttSlots error', e);
  }
}

async function loadAttStudents() {
  var day = document.getElementById('attDay').value;
  var slot = document.getElementById('attSlot').value;
  if (!slot) return;
  try {
    var schedules = await Common.apiFetch('/api/schedules?day=' + day);
    var students = await Common.apiFetch('/api/students');
    var list = schedules.filter(function(s) { return s.time_slot === slot; });
    if (list.length === 0) { document.getElementById('attList').innerHTML = '<div class="empty"><div class="empty-icon">📭</div>该时段暂无排课</div>'; Common.showToast('当前时段暂无排课'); return; }
    var studentMap = {}; for (var i = 0; i < students.length; i++) studentMap[students[i].id] = students[i];
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var s = list[i]; var stu = studentMap[s.student_id];
      html += '<div class="card" style="margin-bottom:8px;padding:12px"><div style="display:flex;align-items:center;gap:12px">';
      html += '<input type="checkbox" onclick="toggleStudent(\'' + Common.esc(s.student_id) + '\')" id="chk_' + Common.esc(s.student_id) + '" style="width:22px;height:22px;accent-color:#667eea;flex-shrink:0">';
      html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (stu ? Common.esc(stu.name) : '未知') + '</div>';
      html += '<div style="font-size:12px;color:#888;margin-top:2px"><span class="coach-chip" style="background:' + Common.getCoachColor(s.coach) + ';font-size:11px;padding:2px 8px">' + Common.esc(s.coach) + '</span> · 剩余 ' + (stu ? stu.remaining_hours : 0) + ' 课</div></div></div></div>';
    }
    document.getElementById('attList').innerHTML = html;
    Common.showToast('当前学员已刷新');
  } catch (e) {
    console.error('loadAttStudents error', e);
    Common.showToast('加载失败');
  }
}

function toggleStudent(id) {
  var chk = document.getElementById('chk_' + id);
  if (selectedStudents.has(id)) { selectedStudents.delete(id); chk.checked = false; }
  else { selectedStudents.add(id); chk.checked = true; }
}

function batchAttend() { if (selectedStudents.size === 0) { Common.showToast('请先选择学员'); return; } if (!confirm('确认消课 ' + selectedStudents.size + ' 人?')) return; doAttendBatch('present'); }
function showBatchLeave() { if (selectedStudents.size === 0) { Common.showToast('请先选择学员'); return; } var reason = prompt('请输入请假原因'); if (!reason) return; doAttendBatch('leave', reason); }
function showBatchAbsence() { if (selectedStudents.size === 0) { Common.showToast('请先选择学员'); return; } if (!confirm('确认旷课 ' + selectedStudents.size + ' 人?')) return; doAttendBatch('absence'); }

async function doAttendBatch(status, reason) {
  Common.showToast('处理中...');
  var date = document.getElementById('attDate').value;
  var day = document.getElementById('attDay').value;
  var slot = document.getElementById('attSlot').value;
  try {
    if (allStudents.length === 0) {
      try { allStudents = await Common.apiFetch('/api/students'); } catch(e) { allStudents = []; }
    }
    var schedules = await Common.apiFetch('/api/schedules');
    var arr = Array.from(selectedStudents);
    for (var i = 0; i < arr.length; i++) {
      var id = arr[i];
      var stu = allStudents.find(function(x) { return x.id === id; });
      var sched = schedules.find(function(sc) { return sc.student_id === id && sc.week_day === day && sc.time_slot === slot; });
      var coach = stu ? stu.coach : (sched ? sched.coach : '');
      await Common.apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id, student_name: stu ? stu.name : '', date: date, week_day: day, time_slot: slot, coach: coach, status: status, reason: reason, hours_used: status === 'present' ? 1 : 0 })
      });
    }
    selectedStudents.clear();
    await loadAttStudents();
    allAttCache = []; // 强制下次重新获取完整考勤记录
    dashboardCache = null;
    await loadStats();
    var label = status === 'present' ? '消课成功' : status === 'leave' ? '请假登记成功' : '旷课登记成功';
    Common.showToast(label);
  } catch (e) {
    Common.showToast('操作失败: ' + e.message);
  }
}

// ==================== 添加学员 ====================
function selectPkg(el, name, hours, price, pkgId) {
  document.querySelectorAll('#coursePackageOptions .course-option').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  selectedCoursePkg = name; selectedCourseHours = hours; selectedPkgId = pkgId;
  document.getElementById('vipHoursPanel').style.display = 'none';
}

function selectPkgVip(el, name) {
  document.querySelectorAll('#coursePackageOptions .course-option').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  selectedCoursePkg = name; selectedCourseHours = 10; selectedPkgId = name === '1v1私教' ? '1v1' : '1v2';
  document.getElementById('vipHoursPanel').style.display = 'block';
  document.getElementById('vipHoursLabel').textContent = name === '1v1私教' ? '1V1 私教节数' : '1V2 小班节数';
  document.getElementById('newVipHours').value = '10';
}

async function showAddStudent() {
  try {
    var settings = await Common.apiFetch('/api/settings');
    var coaches = settings.coaches || [];
    if (coaches.indexOf('孙教练') === -1) coaches.push('孙教练');
    var coachHtml = ''; for (var i = 0; i < coaches.length; i++) coachHtml += '<option>' + coaches[i] + '</option>';
    document.getElementById('newCoach').innerHTML = coachHtml;
    selectedCoursePkg = null; selectedCourseHours = 0; selectedPkgId = '';
    document.querySelectorAll('#coursePackageOptions .course-option').forEach(function(o) { o.classList.remove('selected'); });
    document.getElementById('vipHoursPanel').style.display = 'none';
    showModal('modalAddStudent');
  } catch (e) {
    console.error('showAddStudent error', e);
  }
}

async function saveNewStudent() {
  var name = document.getElementById('newName').value.trim();
  if (!name) { Common.showToast('请输入姓名'); return; }
  var hours = selectedCourseHours || parseInt(document.getElementById('newVipHours').value) || 0;
  var data = { name: name, phone: document.getElementById('newPhone').value.trim(), coach: document.getElementById('newCoach').value, level: document.getElementById('newLevel').value, remaining_hours: hours, purchased_hours: hours };
  try {
    Common.showToast('保存中...', 1500);
    var res = await Common.apiFetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    var stu = res;
    if (selectedPkgId && selectedCourseHours > 0) {
      await Common.apiFetch('/api/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: stu.id, package_id: selectedPkgId, hours: selectedCourseHours }) });
    }
    closeModal('modalAddStudent');
    Common.showToast('添加成功!');
    loadStudents();
    loadStats();
  } catch (e) {
    Common.showToast('添加失败: ' + e.message);
  }
}

// ==================== 插班生 ====================
async function showTempEnrollment() {
  if (allStudents.length === 0) {
    try { allStudents = await Common.apiFetch('/api/students'); } catch(e) { allStudents = []; }
  }
  tempStudentList = allStudents.filter(function(s) { return s.status === 'active'; });
  renderTempStudents(tempStudentList);
  try {
    var settings = await Common.apiFetch('/api/settings');
    var coachHtml = ''; for (var i = 0; i < (settings.coaches || []).length; i++) coachHtml += '<option>' + settings.coaches[i] + '</option>';
    document.getElementById('tempCoach').innerHTML = coachHtml;
    var slotHtml = '';
    var fixedSlots = ['09:00-10:30','10:30-12:00','14:00-15:30','15:30-17:00','17:00-18:30','19:00-20:30'];
    for (var i = 0; i < fixedSlots.length; i++) slotHtml += '<option>' + fixedSlots[i] + '</option>';
    document.getElementById('tempSlot').innerHTML = slotHtml;
    document.getElementById('tempDate').value = Common.today();
    showModal('modalTemp');
  } catch (e) {
    console.error('showTempEnrollment error', e);
  }
}

function renderTempStudents(list) {
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    html += '<option value="' + Common.esc(s.id) + '">' + Common.esc(s.name) + ' · ' + Common.esc(s.coach) + ' · 剩' + s.remaining_hours + '课</option>';
  }
  document.getElementById('tempStudent').innerHTML = html;
}

function filterTempStudents() {
  var kw = document.getElementById('tempSearchInput').value.toLowerCase();
  var filtered = tempStudentList.filter(function(s) { return s.name.toLowerCase().includes(kw); });
  renderTempStudents(filtered);
}

async function doTempEnrollment() {
  var studentId = document.getElementById('tempStudent').value;
  if (!studentId) return Common.showToast('请选择学员');
  var date = document.getElementById('tempDate').value;
  var slot = document.getElementById('tempSlot').value;
  var coach = document.getElementById('tempCoach').value;
  var s = allStudents.find(function(x) { return x.id === studentId; });
  closeModal('modalTemp');
  try {
    Common.showToast('处理中...');
    await Common.apiFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, student_name: s ? s.name : '', date: date, week_day: '', time_slot: slot, coach: coach, status: 'present', hours_used: 1 })
    });
    allAttCache = [];
    dashboardCache = null;
    await loadStats();
    Common.showToast('插班生消课成功');
  } catch (e) {
    Common.showToast('消课失败: ' + e.message);
  }
}

async function deleteStudent(id) {
  if (!confirm('确定删除该学员？')) return;
  try {
    await Common.apiFetch('/api/students/' + id, { method: 'DELETE' });
    closeModal('modalStudentDetail');
    loadStudents();
    Common.showToast('已删除');
  } catch (e) {
    Common.showToast('删除失败: ' + e.message);
  }
}

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

function toggleRecentLeave() {
  var content = document.getElementById('recentLeaveList');
  var arrow = document.getElementById('recentLeaveArrow');
  if (!content || !arrow) return;
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    content.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

function toggleHomeSimpleSchedule() {
  var content = document.getElementById('homeSimpleScheduleContent');
  var arrow = document.getElementById('homeSimpleScheduleArrow');
  if (!content || !arrow) return;
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    content.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

// ==================== 撤销考勤 ====================
async function undoAttendance(id, isPresent) {
  if (!confirm('确定撤销此记录？')) return;
  try {
    await Common.apiFetch('/api/attendance/' + id, { method: 'DELETE' });
    allAttCache = [];
    dashboardCache = null;
    await loadStats();
    if (document.getElementById('page-attendance').classList.contains('active')) {
      await loadAttStudents();
    }
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
  var monColor = monRate >= 80 ? '#52c41a' : monRate >= 60 ? '#faad14' : '#ff4d4f';
  var html = '<div style="text-align:center;margin-bottom:16px">';
  html += '<div style="font-size:40px;font-weight:700;color:' + monColor + '">' + monRate + '%</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px">本月总出勤率</div>';
  html += '<div style="font-size:11px;color:#aaa;margin-top:4px">应到 ' + (stats.month_expected || 0) + ' · 实到 ' + (stats.month_present || 0) + ' · 请假 ' + (stats.month_leave || 0) + '</div>';
  html += '</div>';

  var coaches = ['王教练', '陈教练', '孙教练'];
  var now = new Date();
  var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var monthAtt = allAttCache.filter(function(a) { return a.date && a.date.slice(0, 7) === ym; });

  // 计算每个教练的出勤率
  var nowDay = now.getDate();
  var schedules = dashboardCache.schedules || [];
  var weekdayNames = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  var weekdayCounts = {};
  coaches.forEach(function(c) { weekdayCounts[c] = {}; });
  schedules.forEach(function(sc) {
    var c = sc.coach;
    var wd = sc.week_day;
    if (coaches.indexOf(c) !== -1 && wd) {
      weekdayCounts[c][wd] = (weekdayCounts[c][wd] || 0) + 1;
    }
  });

  html += '<div style="margin-bottom:8px;font-size:12px;color:#888;font-weight:500">各教练出勤率</div>';
  coaches.forEach(function(coach) {
    var expected = 0;
    for (var d = 1; d <= nowDay; d++) {
      var tmp = new Date(now.getFullYear(), now.getMonth(), d);
      var wd = weekdayNames[tmp.getDay() === 0 ? 6 : tmp.getDay() - 1];
      expected += (weekdayCounts[coach][wd] || 0);
    }
    var coachAtt = monthAtt.filter(function(a) { return a.coach === coach; });
    var present = coachAtt.filter(function(a) { return a.status === 'present'; }).length;
    var leave = coachAtt.filter(function(a) { return a.status === 'leave'; }).length;
    var rate = expected > 0 ? Math.round((present + leave) / expected * 100) : 0;
    var color = rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f';
    html += '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:10px;cursor:pointer" onclick="toggleCoachAttDetail(this, \'' + Common.esc(coach) + '\')">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<div><span class="coach-chip" style="background:' + Common.getCoachColor(coach) + ';font-size:11px;padding:2px 8px">' + Common.esc(coach) + '</span></div>';
    html += '<div style="font-weight:700;color:' + color + '">' + rate + '%</div>';
    html += '</div>';
    // 详情区（请假/旷课记录）
    var detailId = 'coach-att-detail-' + coach;
    html += '<div id="' + detailId + '" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:12px">';
    var absent = coachAtt.filter(function(a) { return a.status === 'leave' || a.status === 'absence'; });
    if (absent.length > 0) {
      absent.forEach(function(a) {
        var lbl = a.status === 'leave' ? '请假' : '旷课';
        var clr = a.status === 'leave' ? '#faad14' : '#ff4d4f';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5">';
        html += '<div>' + Common.esc(a.student_name) + ' <span style="color:#888">' + Common.esc(a.date) + ' ' + Common.esc(a.time_slot) + '</span></div>';
        html += '<span style="color:' + clr + ';font-size:11px">' + lbl + '</span>';
        html += '</div>';
      });
    } else {
      html += '<div style="color:#999;text-align:center;padding:8px 0">本月无请假/旷课记录</div>';
    }
    html += '</div>';
    html += '</div>';
  });

  document.getElementById('modalAttendanceRateContent').innerHTML = html;
  showModal('modalAttendanceRate');
}

function toggleCoachAttDetail(el, coach) {
  var detail = document.getElementById('coach-att-detail-' + coach);
  if (!detail) return;
  detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
}

// ==================== 上课明细弹窗 ====================
async function showDailyStudents(date) {
  try {
    var data = await Common.apiFetch('/api/attendance_by_date?date=' + encodeURIComponent(date));
    document.getElementById('modalDailyStudentsTitle').textContent = date + ' 上课学员';
    var html = '';
    var coaches = ['王教练', '陈教练', '孙教练'];
    var hasAny = false;
    coaches.forEach(function(coach) {
      var list = (data.coaches && data.coaches[coach]) || [];
      if (list.length > 0) {
        hasAny = true;
        html += '<div class="section-title" style="margin-top:10px">' + Common.esc(coach) + '</div>';
        list.forEach(function(item) {
          html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">';
          html += '<div style="width:32px;height:32px;border-radius:50%;background:' + Common.getCoachColor(coach) + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + Common.esc(item.student_name.charAt(0)) + '</div>';
          html += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">' + Common.esc(item.student_name) + '</div><div style="font-size:11px;color:#888">' + Common.esc(item.time_slot) + '</div></div>';
          html += '</div>';
        });
      }
    });
    if (!hasAny) {
      html += '<div class="empty" style="padding:20px 0"><div class="empty-icon" style="font-size:32px">📭</div><div style="font-size:13px;color:#999">当天无上课记录</div></div>';
    }
    document.getElementById('modalDailyStudentsContent').innerHTML = html;
    showModal('modalDailyStudents');
  } catch (e) {
    Common.showToast('加载失败: ' + e.message);
  }
}

// ==================== 编辑学员课程包 ====================
async function loadStudentEnrollmentsForEdit(studentId) {
  var container = document.getElementById('editEnrollmentList');
  if (!container) return;
  try {
    var enrollments = await Common.apiFetch('/api/enrollments').catch(function() { return []; });
    var list = enrollments.filter(function(e) { return e.student_id === studentId; }).sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var html = '';
    html += '<button class="btn btn-sm" onclick="showNewEnrollmentForm()" style="background:#1890ff;color:#fff;padding:4px 12px;font-size:12px;width:100%;margin-bottom:8px">+ 添加课程包</button>';
    html += '<div id="newEnrollmentForm" style="display:none;padding:10px;margin-bottom:10px;background:#f0f7ff;border-radius:4px;border:1px solid #91d5ff">';
    html += '<div style="font-weight:600;font-size:12px;color:#1890ff;margin-bottom:6px">新增课程包</div>';
    html += '<div style="margin-bottom:6px"><label style="font-size:11px;color:#888">课程包</label><select id="new-enroll-name" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px"><option value="常规课·50节">常规课·50节</option><option value="常规课·30节">常规课·30节</option><option value="常规课·15节">常规课·15节</option><option value="月卡7节">月卡7节</option><option value="1v1私教课">1v1私教课</option><option value="1v2小班课">1v2小班课</option></select></div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:6px"><div style="flex:1"><label style="font-size:11px;color:#888">课时</label><input type="number" id="new-enroll-hours" value="50" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div><div style="flex:1"><label style="font-size:11px;color:#888">价格(¥)</label><input type="number" id="new-enroll-price" value="3999" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div></div>';
    html += '<div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="saveNewEnrollment()" style="background:#52c41a;color:#fff;padding:4px 10px;font-size:11px;flex:1">保存</button><button class="btn btn-sm" onclick="hideNewEnrollmentForm()" style="background:#f5f5f5;color:#333;padding:4px 10px;font-size:11px;flex:1">取消</button></div>';
    html += '</div>';
    if (list.length === 0) {
      html += '<div style="text-align:center;color:#999;padding:12px">暂无课程包，请点上方按钮添加</div>';
    } else {
      list.forEach(function(e) {
        html += '<div style="padding:10px;margin-bottom:8px;background:#fff;border-radius:4px;border:1px solid #e8e8e8">';
        html += '<div style="font-weight:600;font-size:13px;margin-bottom:6px">' + Common.esc(e.package_name || '未命名') + '</div>';
        html += '<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:6px">';
        html += '<div style="flex:1"><label style="font-size:11px;color:#888">课程包</label><select id="enroll-name-' + Common.esc(e.id) + '" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px"><option value="1v1私教课"' + (e.package_name === '1v1私教课' ? ' selected' : '') + '>1v1私教课</option><option value="1v2小班课"' + (e.package_name === '1v2小班课' ? ' selected' : '') + '>1v2小班课</option><option value="常规课·50节"' + (e.package_name === '常规课·50节' ? ' selected' : '') + '>常规课·50节</option><option value="常规课·30节"' + (e.package_name === '常规课·30节' ? ' selected' : '') + '>常规课·30节</option><option value="常规课·15节"' + (e.package_name === '常规课·15节' ? ' selected' : '') + '>常规课·15节</option><option value="月卡7节"' + (e.package_name === '月卡7节' ? ' selected' : '') + '>月卡7节</option></select></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:6px">';
        html += '<div style="flex:1"><label style="font-size:11px;color:#888">课时</label><input type="number" id="enroll-hours-' + Common.esc(e.id) + '" value="' + (e.hours || 0) + '" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div>';
        html += '<div style="flex:1"><label style="font-size:11px;color:#888">价格</label><input type="number" id="enroll-price-' + Common.esc(e.id) + '" value="' + (e.price || 0) + '" style="width:100%;padding:6px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px"></div>';
        var unitPrice = (e.hours > 0 && e.price > 0) ? '¥' + Math.round(e.price / e.hours) + '/节' : '-';
        html += '<div style="flex:1;text-align:center"><label style="font-size:11px;color:#888">单价</label><div style="padding:7px 0;font-size:13px;color:#667eea;font-weight:600">' + unitPrice + '</div></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px">';
        html += '<button class="btn btn-sm" onclick="saveEnrollment(\'' + Common.esc(e.id) + '\')" style="background:#52c41a;color:#fff;padding:4px 10px;font-size:11px;flex:1">保存</button>';
        html += '<button class="btn btn-sm" onclick="deleteEnrollment(\'' + Common.esc(e.id) + '\')" style="background:#ff4d4f;color:#fff;padding:4px 10px;font-size:11px;flex:1">删除</button>';
        html += '</div>';
        html += '</div>';
      });
    }
    container.innerHTML = html;
  } catch (e) {
    console.error('加载课程包失败:', e);
    container.innerHTML = '<div style="text-align:center;color:#ff4d4f;padding:12px">加载失败</div>';
  }
}

async function saveEnrollment(enrollmentId) {
  var hours = parseFloat(document.getElementById('enroll-hours-' + enrollmentId).value) || 0;
  var price = parseFloat(document.getElementById('enroll-price-' + enrollmentId).value) || 0;
  var packageName = document.getElementById('enroll-name-' + enrollmentId).value;
  try {
    await Common.apiFetch('/api/enrollments/' + enrollmentId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: hours, price: price, package_name: packageName })
    });
    var studentId = document.getElementById('editStudentId').value;
    if (studentId) await loadStudentEnrollmentsForEdit(studentId);
    Common.showToast('保存成功');
  } catch (e) {
    Common.showToast('保存失败: ' + e.message);
  }
}

async function deleteEnrollment(enrollmentId) {
  if (!confirm('确定删除该课程包？')) return;
  try {
    await Common.apiFetch('/api/enrollments/' + enrollmentId, { method: 'DELETE' });
    var studentId = document.getElementById('editStudentId').value;
    if (studentId) await loadStudentEnrollmentsForEdit(studentId);
    Common.showToast('已删除');
  } catch (e) {
    Common.showToast('删除失败: ' + e.message);
  }
}

function showNewEnrollmentForm() {
  var form = document.getElementById('newEnrollmentForm');
  if (form) form.style.display = 'block';
}

function hideNewEnrollmentForm() {
  var form = document.getElementById('newEnrollmentForm');
  if (form) form.style.display = 'none';
}

async function saveNewEnrollment() {
  var studentId = document.getElementById('editStudentId').value;
  var packageName = document.getElementById('new-enroll-name').value;
  var hours = parseFloat(document.getElementById('new-enroll-hours').value) || 0;
  var price = parseFloat(document.getElementById('new-enroll-price').value) || 0;
  if (!hours || !price) { Common.showToast('请填写课时和价格'); return; }
  try {
    await Common.apiFetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        student_name: '',
        package_name: packageName,
        hours: hours,
        price: price
      })
    });
    hideNewEnrollmentForm();
    await loadStudentEnrollmentsForEdit(studentId);
    Common.showToast('课程包已添加');
  } catch (e) {
    Common.showToast('添加失败: ' + e.message);
  }
}

document.getElementById('attDate').value = Common.today();
loadStats();
