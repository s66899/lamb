// ==================== 全局变量 ====================
let students = [];
let selectedStudents = new Set();
let currentDay = '星期一';
let selectedPackage = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    // Clear client-side caches to ensure fresh view after restart
    try {
        window.__statsByCoachCache = null;
        window.__mobileStatsByCoachCache = null;
        window.__todayAttendanceCache = null;
    } catch (e) {
        // ignore
    }
    loadStudents();
    loadPackages();
    loadEnrollments();
    loadSchedule();
    loadAttendance();
    loadStats();
    // start online count updater
    updateOnlineCount();
    setInterval(updateOnlineCount, 15000);
    initSearch();
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    const today = new Date().getDay();
    const dayMap = [7,1,2,3,4,5,6];
    const dayNames = ['','星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
    document.getElementById('attendanceDay').value = dayNames[dayMap[today]] || '星期一';
    loadAttendanceSlots();
    loadAttendanceHistory();
    document.getElementById('leaveDate').addEventListener('change', loadLeaveSlots);
    document.getElementById('tempDate').addEventListener('change', loadTempSlots);
    document.getElementById('detailAddDay').addEventListener('change', async function() {
        const day = this.value;
        if (!day) return;
        const res = await fetch('/api/settings');
        const settings = await res.json();
        const slots = settings.time_slots[day] || [];
        document.getElementById('detailAddSlot').innerHTML = '<option value="">选择时间段</option>' + slots.map(s => `<option value="${s}">${s}</option>`).join('');
    });
});

// ==================== 导航 ====================
function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            document.getElementById('tab-' + tab).classList.add('active');
            if (tab === 'students') loadStudents();
            if (tab === 'enroll') { loadPackages(); loadEnrollments(); populateStudentSelect('enrollStudent'); }
            if (tab === 'schedule') loadSchedule();
            if (tab === 'attendance') { loadAttendanceSlots(); loadAttendanceHistory(); }
            if (tab === 'stats') loadStats();
            if (tab === 'attendance-stats') loadMonthlyStats();
            if (tab === 'leaves') { loadLeaves(); populateStudentSelect('leaveStudent'); }
            if (tab === 'temp') { loadTempStudents(); loadTempSlots(); }
            if (tab === 'records') { loadRecords(); loadRecordMonths(); }
            if (tab === 'absences') { loadAbsences(); loadAbsenceMonths(); }
        });
    });
}

// ==================== 搜索 ====================
let searchResults = [];
let searchTimer = null;

// Online users: periodic update
async function updateOnlineCount() {
    try {
        const res = await fetch('/api/online_count');
        const data = await res.json();
        const el = document.getElementById('onlineCount');
        if (el) el.textContent = `在线：${data.online_count || 0}`;
    } catch (e) {
        // ignore
    }
}

function initSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        const keyword = e.target.value.trim();
        if (keyword.length > 0) {
            searchTimer = setTimeout(() => doGlobalSearch(keyword), 300);
        } else {
            hideSearchResults();
        }
    });
    
    searchInput.addEventListener('focus', e => {
        if (searchResults.length > 0) {
            showSearchResultsUI();
        }
    });
    
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-box')) {
            hideSearchResults();
        }
    });
}

async function doGlobalSearch(keyword) {
    try {
        const [studentsRes, schedulesRes, leavesRes] = await Promise.all([
            fetch(`/api/students?search=${encodeURIComponent(keyword)}`),
            fetch('/api/schedules'),
            fetch('/api/leaves')
        ]);
        searchResults = await studentsRes.json();
        const schedules = await schedulesRes.json();
        const leaves = await leavesRes.json();
        showSearchResults(searchResults, schedules, leaves);
    } catch (err) {
        console.error('搜索失败:', err);
    }
}

function showSearchResults(results, schedules, leaves) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#999">未找到匹配的学员</div>';
        container.style.display = 'block';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    container.innerHTML = results.slice(0, 10).map(s => {
        const studentSchedules = schedules.filter(sc => sc.student_id === s.id);
        const scheduleText = studentSchedules.length > 0 
            ? studentSchedules.map(sc => `${sc.week_day} ${sc.time_slot}`).join(', ') 
            : '暂无排课';
        const todayLeave = leaves.find(l => l.student_id === s.id && l.leave_date === today);
        const statusClass = s.status === 'active' ? 'badge-active' : s.status === 'inactive' ? 'badge-inactive' : 'badge-potential';
        const statusText = s.status === 'active' ? '在读' : s.status === 'inactive' ? '已结' : '潜在';
        
        return `<div class="search-result-item" data-id="${s.id}">
            <div class="search-result-main">
                <div class="search-result-left">
                    <strong class="search-name">${s.name}</strong>
                    <span class="search-phone">${s.phone || '-'}</span>
                    ${todayLeave ? '<span class="leave-badge">今日请假</span>' : ''}
                </div>
                <div class="search-result-right">
                    <span class="hours-badge">${s.remaining_hours || 0}节</span>
                    <span class="${statusClass}" style="font-size:11px">${statusText}</span>
                </div>
            </div>
            <div class="search-result-info">
                <span>${s.coach || '-'}</span> | <span>${s.level || '-'}</span> | <span>${studentSchedules.length}节/周</span>
            </div>
            <div class="search-result-schedule">${scheduleText}</div>
        </div>`;
    }).join('');
    
    container.style.display = 'block';
    
    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();
            const id = item.dataset.id;
            if (id) showStudentDetail(id);
        });
    });
}

function showSearchResultsUI() {
    const container = document.getElementById('searchResults');
    if (container && searchResults.length > 0) {
        container.style.display = 'block';
    }
}

function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.style.display = 'none';
    }
}

async function showStudentDetail(studentId) {
    const studentRes = await fetch('/api/students/' + studentId);
    const student = await studentRes.json();
    if (!student || !student.id) {
        alert('学员不存在');
        return;
    }
    // Load coaches for detailAddCoach dropdown
    try {
        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        const coaches = settings.coaches || [];
        const detailCoachSel = document.getElementById('detailAddCoach');
        if (detailCoachSel) {
            detailCoachSel.innerHTML = '<option value="">-- 选择 --</option>' + coaches.map(c => `<option>${c}</option>`).join('');
        }
    } catch (e) {
        // ignore loading coaches failure in detail view
    }
    
    const schedulesRes = await fetch('/api/schedules');
    const schedules = await schedulesRes.json();
    const studentSchedules = schedules.filter(sc => sc.student_id === studentId);
    
    const leavesRes = await fetch('/api/leaves');
    const leaves = await leavesRes.json();
    const studentLeaves = leaves.filter(l => l.student_id === studentId);
    
    document.getElementById('detailStudentId').value = studentId;
    document.getElementById('detailStudentName').textContent = student.name;
    document.getElementById('detailStudentPhone').textContent = student.phone || '-';
    document.getElementById('detailStudentLevel').textContent = student.level || '-';
    document.getElementById('detailStudentCoach').textContent = student.coach || '-';
    document.getElementById('detailStudentHours').textContent = `${student.remaining_hours || 0} 节`;
    document.getElementById('detailStudentStatus').textContent = student.status === 'active' ? '在读' : student.status === 'inactive' ? '已结' : '潜在';
    
    const scheduleList = document.getElementById('detailScheduleList');
    if (studentSchedules.length > 0) {
        scheduleList.innerHTML = studentSchedules.map(sc => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0">
                <span>${sc.week_day} ${sc.time_slot}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteScheduleFromDetail('${sc.id}')">删除</button>
            </div>
        `).join('');
    } else {
        scheduleList.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:16px">暂无排课</div>';
    }
    
    const leaveList = document.getElementById('detailLeaveList');
    if (studentLeaves.length > 0) {
        leaveList.innerHTML = studentLeaves.slice(0, 5).map(l => `
            <div style="padding:6px 0;font-size:13px">
                ${l.leave_date} ${l.week_day || ''} ${l.time_slot || ''}
                <span style="color:#999">- ${l.reason || '未填写原因'}</span>
            </div>
        `).join('');
    } else {
        leaveList.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:16px">暂无请假记录</div>';
    }
    
    hideSearchResults();
    document.getElementById('globalSearch').value = '';
    document.getElementById('detailAddDay').value = '';
    document.getElementById('detailAddSlot').innerHTML = '<option value="">选择时间段</option>';
    showModal('studentDetailModal');
}

function editStudentFromDetail() {
    const studentId = document.getElementById('detailStudentId').value;
    hideModal('studentDetailModal');
    const student = students.find(s => s.id === studentId);
    if (student) {
        document.getElementById('editStudentId').value = studentId;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentPhone').value = student.phone || '';
        document.getElementById('editStudentLevel').value = student.level || '初级';
        document.getElementById('editStudentStatus').value = student.status || 'active';
        loadStudentCoaches();
        showModal('editStudentModal');
    }
}

async function deleteStudentFromDetail() {
    const studentId = document.getElementById('detailStudentId').value;
    if (!confirm('确定删除此学员？')) return;
    await fetch('/api/students/' + studentId, { method: 'DELETE' });
    hideModal('studentDetailModal');
    alert('删除成功！');
    loadStudents();
    loadStats();
}

function switchToSchedule() {
    const studentId = document.getElementById('detailStudentId').value;
    hideModal('studentDetailModal');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.nav-item[data-tab="schedule"]').classList.add('active');
    document.getElementById('tab-schedule').classList.add('active');
    loadSchedule();
    showModal('addScheduleModal');
    loadScheduleStudents();
    setTimeout(() => {
        document.getElementById('scheduleStudent').value = studentId;
    }, 100);
}

async function deleteScheduleFromDetail(scheduleId) {
    if (!confirm('确定删除该排课？')) return;
    try {
        await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
        const studentId = document.getElementById('detailStudentId').value;
        showStudentDetail(studentId);
        loadSchedule();
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
}

async function addScheduleFromDetail() {
    const studentId = document.getElementById('detailStudentId').value;
    const day = document.getElementById('detailAddDay').value;
    const slot = document.getElementById('detailAddSlot').value;
    const coach = document.getElementById('detailAddCoach') ? document.getElementById('detailAddCoach').value : '';
    
    if (!day) return alert('请选择星期');
    if (!slot) return alert('请选择时间段');
    
    const studentRes = await fetch('/api/students/' + studentId);
    const student = await studentRes.json();
    
    await fetch('/api/schedules', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            student_id: studentId,
            week_day: day,
            time_slot: slot,
            coach: coach || (student ? student.coach : '')
        })
    });
    
    document.getElementById('detailAddDay').value = '';
    document.getElementById('detailAddSlot').innerHTML = '<option value="">选择时间段</option>';
    showStudentDetail(studentId);
    loadSchedule();
    alert('排课成功！');
}

// ==================== 学员管理 ====================
async function loadStudents(search = '') {
    const status = document.getElementById('statusFilter').value;
    let url = '/api/students?';
    if (status) url += `status=${status}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    students = await res.json();
    renderStudents();
}

function renderStudents() {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;
    
    const countEl = document.getElementById('studentCount');
    if (countEl) {
        const active = students.filter(s => s.status === 'active').length;
        const lowHours = students.filter(s => (s.remaining_hours || 0) < 5).length;
        countEl.textContent = `共 ${students.length} 名学员 | 在读 ${active} | 课时不足 ${lowHours}`;
    }
    
    tbody.innerHTML = students.map(s => {
        const hoursClass = (s.remaining_hours || 0) < 5 ? 'style="color:var(--danger);font-weight:700"' : 'style="color:var(--primary);font-weight:700"';
        return `<tr data-id="${s.id}">
            <td><input type="checkbox" ${selectedStudents.has(s.id)?'checked':''} onchange="toggleSelect('${s.id}')"></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.phone || '-'}</td>
            <td>${s.level || '-'}</td>
            <td>${s.coach || '-'}</td>
            <td ${hoursClass}>${s.remaining_hours || 0}</td>
            <td><span class="badge badge-${s.status}">${s.status==='active'?'在读':s.status==='inactive'?'已结':'潜在'}</span></td>
            <td class="actions">
                <button class="btn btn-sm" onclick="showStudentDetail('${s.id}')" title="查看详情和排课">详情</button>
                <button class="btn btn-sm" onclick="editStudent('${s.id}')" title="编辑">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">删除</button>
            </td>
        </tr>`;
    }).join('');
}

function toggleSelect(id) {
    if (selectedStudents.has(id)) selectedStudents.delete(id);
    else selectedStudents.add(id);
}

function toggleSelectAll() {
    const all = document.getElementById('selectAll').checked;
    selectedStudents.clear();
    if (all) students.forEach(s => selectedStudents.add(s.id));
    renderStudents();
}

async function deleteSelected() {
    if (selectedStudents.size === 0) return alert('请选择要删除的学员');
    if (!confirm(`确定删除 ${selectedStudents.size} 名学员？`)) return;
    await fetch('/api/students/batch', {
        method: 'DELETE',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ids: [...selectedStudents]})
    });
    selectedStudents.clear();
    loadStudents();
}

async function deleteStudent(id) {
    if (!confirm('确定删除该学员？')) return;
    await fetch('/api/students/batch', {
        method: 'DELETE',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ids: [id]})
    });
    loadStudents();
}

function showModal(id) {
    document.getElementById(id).classList.add('show');
    if (id === 'studentModal' && !document.getElementById('editStudentId').value) {
        document.getElementById('studentModalTitle').textContent = '添加学员';
        ['sName','sPhone','sNote'].forEach(f => document.getElementById(f).value = '');
        document.getElementById('sPurchased').value = '0';
        document.getElementById('sBonus').value = '0';
        document.getElementById('sRemaining').value = '0';
        loadCoaches('sCoach');
    }
    if (id === 'leaveModal' && !document.getElementById('editLeaveId').value) {
        document.getElementById('leaveModalTitle').textContent = '添加请假';
        document.getElementById('leaveDate').value = '';
        document.getElementById('leaveSlot').innerHTML = '';
        document.getElementById('leaveReason').value = '';
    }
    if (id === 'tempModal' && !document.getElementById('editTempId').value) {
        document.getElementById('tempModalTitle').textContent = '临时插班生（快速排课消课）';
        ['tempName','tempPhone','tempNote'].forEach(f => document.getElementById(f).value = '');
        document.getElementById('tempLevel').value = '初级';
        document.getElementById('tempDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('tempSelectStudent').value = '';
        loadCoaches('tempCoach');
        loadTempSlots();
        loadTempStudents();
    }
    if (id === 'addScheduleModal') {
        loadScheduleStudents();
        loadScheduleSlots();
        loadScheduleCoaches();
    }
    if (id === 'absenceModal') {
        document.getElementById('absenceDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('absenceReason').value = '';
        loadAbsenceStudents();
        loadAbsenceSlots();
    }
}

async function loadCoaches(selectId) {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const coaches = settings.coaches || [];
    const sel = document.getElementById(selectId);
    sel.innerHTML = coaches.map(c => `<option value="${c}">${c}</option>`).join('');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('show');
    document.getElementById('editStudentId').value = '';
    document.getElementById('editLeaveId').value = '';
    document.getElementById('editTempId').value = '';
}

function editStudent(id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    document.getElementById('editStudentId').value = id;
    document.getElementById('studentModalTitle').textContent = '编辑学员';
    document.getElementById('sName').value = s.name;
    document.getElementById('sPhone').value = s.phone || '';
    document.getElementById('sLevel').value = s.level || '初级';
    document.getElementById('sCoach').value = s.coach || '';
    document.getElementById('sPurchased').value = s.purchased_hours || 0;
    document.getElementById('sBonus').value = s.bonus_hours || 0;
    document.getElementById('sRemaining').value = s.remaining_hours || 0;
    document.getElementById('sNote').value = s.note || '';
    showModal('studentModal');
}

async function saveStudent() {
    const name = document.getElementById('sName').value.trim();
    if (!name) return alert('请输入姓名');
    const editId = document.getElementById('editStudentId').value;
    const body = {
        name,
        phone: document.getElementById('sPhone').value.trim(),
        level: document.getElementById('sLevel').value,
        coach: document.getElementById('sCoach').value.trim(),
        purchased_hours: parseFloat(document.getElementById('sPurchased').value) || 0,
        bonus_hours: parseFloat(document.getElementById('sBonus').value) || 0,
        remaining_hours: parseFloat(document.getElementById('sRemaining').value) || 0,
        note: document.getElementById('sNote').value.trim(),
        status: 'active'
    };
    if (editId) {
        await fetch(`/api/students/${editId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    } else {
        await fetch('/api/students', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    }
    hideModal('studentModal');
    loadStudents();
}

async function importCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return alert('请选择文件');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/students/import-csv', { method: 'POST', body: fd });
    const data = await res.json();
    alert(`成功导入 ${data.imported} 条记录`);
    hideModal('importModal');
    loadStudents();
}

function exportStudents() {
    if (students.length === 0) return alert('无数据');
    let csv = '\uFEFF姓名,电话,等级,教练,购买课时,赠送课时,剩余课时,状态,备注\n';
    students.forEach(s => {
        csv += `${s.name},${s.phone},${s.level},${s.coach},${s.purchased_hours},${s.bonus_hours},${s.remaining_hours},${s.status},${s.note}\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `学员导出_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// ==================== 报课管理 ====================
async function loadPackages() {
    const res = await fetch('/api/packages');
    const packages = await res.json();
    const grid = document.getElementById('packagesGrid');
    grid.innerHTML = packages.map(p => `
        <div class="package-card" onclick="selectPackage('${p.id}', ${p.price_per_hour || p.price}, '${p.type}')">
            <h4>${p.name}</h4>
            <div class="price">${p.type === 'per_hour' ? '¥' + p.price_per_hour + '/节' : '¥' + p.price}</div>
            <div class="desc">${p.description}</div>
        </div>
    `).join('');
}

function selectPackage(id, price, type) {
    selectedPackage = { id, price, type };
    document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('enrollPackage').value = id;
    onPackageChange();
}

function onPackageChange() {
    const pkgId = document.getElementById('enrollPackage').value;
    const hoursGroup = document.getElementById('hoursGroup');
    const priceDisplay = document.getElementById('priceDisplay');
    if (!pkgId) { priceDisplay.textContent = '请选择课程包'; return; }
    fetch('/api/packages').then(r=>r.json()).then(pkgs => {
        const pkg = pkgs.find(p => p.id === pkgId);
        if (!pkg) return;
        if (pkg.type === 'per_hour') {
            hoursGroup.style.display = 'block';
            calcPrice();
        } else {
            hoursGroup.style.display = 'none';
            priceDisplay.textContent = `${pkg.description}`;
        }
    });
}

function calcPrice() {
    const pkgId = document.getElementById('enrollPackage').value;
    const hours = parseInt(document.getElementById('enrollHours').value) || 0;
    fetch('/api/packages').then(r=>r.json()).then(pkgs => {
        const pkg = pkgs.find(p => p.id === pkgId);
        if (pkg && pkg.type === 'per_hour') {
            document.getElementById('priceDisplay').textContent = `总价: ¥${hours * pkg.price_per_hour}`;
        }
    });
}

async function doEnroll() {
    const studentId = document.getElementById('enrollStudent').value;
    const packageId = document.getElementById('enrollPackage').value;
    const hours = parseInt(document.getElementById('enrollHours').value) || 0;
    if (!studentId) return alert('请选择学员');
    if (!packageId) return alert('请选择课程包');
    const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ student_id: studentId, package_id: packageId, hours })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    alert('报课成功！');
    loadEnrollments();
    loadStudents();
}

async function loadEnrollments() {
    const res = await fetch('/api/enrollments');
    const enrollments = await res.json();
    document.getElementById('enrollmentsTable').innerHTML = enrollments.map(e => `
        <tr><td>${e.student_name}</td><td>${e.package_name}</td><td>${e.hours}</td><td>¥${e.price}</td><td>${e.date}</td></tr>
    `).join('');
}

function populateStudentSelect(selectId) {
    fetch('/api/students').then(r=>r.json()).then(list => {
        const sel = document.getElementById(selectId);
        sel.innerHTML = '<option value="">-- 选择学员 --</option>' +
            list.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    });
}

// ==================== 排课管理 ====================
async function loadSchedule() {
    const days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
    const tabsEl = document.getElementById('weekTabs');
    tabsEl.innerHTML = days.map(d => `<div class="week-tab ${d===currentDay?'active':''}" onclick="switchDay('${d}')">${d}</div>`).join('');

    const res = await fetch(`/api/schedules?day=${currentDay}`);
    const schedules = await res.json();
    const settingsRes = await fetch('/api/settings');
    const settings = await settingsRes.json();
    const timeSlots = settings.time_slots[currentDay] || [];
    const coaches = settings.coaches || [];
    const maxPerCoach = settings.max_students_per_coach || 6;

    const studentsRes = await fetch('/api/students');
    const allStudents = await studentsRes.json();
    const studentMap = {};
    allStudents.forEach(s => studentMap[s.id] = s);

    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = timeSlots.map(slot => {
        const slotSchedules = schedules.filter(s => s.time_slot === slot);
        const coachStudents = {};
        coaches.forEach(c => coachStudents[c] = []);
        slotSchedules.forEach(sc => {
            const student = studentMap[sc.student_id] || {};
            const coach = sc.coach || student.coach || coaches[0];
            if (!coachStudents[coach]) coachStudents[coach] = [];
            coachStudents[coach].push({ id: sc.id, name: student.name || '未知', student_id: sc.student_id, hours: student.remaining_hours || 0 });
        });

        // 生成每个教练的饼图HTML
        const coachPieCharts = coaches.map(c => {
            const list = coachStudents[c] || [];
            const count = list.length;
            const percent = Math.round(count / maxPerCoach * 100);
            let color = '#52c41a'; // 绿色-有位
            if (count >= maxPerCoach) color = '#ff4d4f'; // 红色-满员
            else if (count >= maxPerCoach * 0.7) color = '#faad14'; // 橙色-紧张
            const dasharray = `${count * 25.12} ${maxPerCoach * 25.12}`;
            return `<div style="text-align:center;min-width:80px;">
                <div style="position:relative;width:60px;height:60px;margin:0 auto 4px;">
                    <svg viewBox="0 0 100 100" style="transform:rotate(-90deg);">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" stroke-width="10"/>
                        <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${dasharray}" stroke-linecap="round"/>
                    </svg>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:700;color:${color}">${count}</div>
                </div>
                <div style="font-weight:600;font-size:12px;">${c}</div>
                <div style="font-size:10px;color:#666;">${count}/${maxPerCoach}</div>
            </div>`;
        }).join('');

        return `<div style="margin-bottom:20px;background:var(--card);border-radius:12px;padding:16px;box-shadow:var(--shadow);">
            <div style="display:flex;align-items:center;margin-bottom:12px;">
                <div class="schedule-time" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;">${slot}</div>
                <div style="margin-left:auto;display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;">${coachPieCharts}</div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:12px;">
                ${coaches.map(c => {
                    const list = coachStudents[c] || [];
                    if (list.length === 0) return '';
                    return `<div style="margin-bottom:8px;">
                        <div style="font-weight:600;font-size:13px;color:#667eea;margin-bottom:6px;">${c}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${list.map(s => `<span class="student-tag" style="display:inline-flex;align-items:center;gap:4px;background:${s.hours < 5 ? '#fff1f0' : '#f0f5ff'};">
                                ${s.name}<span style="font-size:10px;color:#666;margin-left:4px">(${s.hours}节)</span>
                                <button onclick="deleteSchedule('${s.id}')" style="background:none;border:none;color:#ff4d4f;cursor:pointer;font-size:12px;padding:0;margin-left:2px" title="删除">×</button>
                            </span>`).join('')}
                        </div>
                    </div>`;
                }).join('')}
                ${coaches.every(c => (coachStudents[c] || []).length === 0) ? '<div style="color:#999;font-size:13px;text-align:center;padding:20px">(暂无学员)</div>' : ''}
            </div>
        </div>`;
    }).join('');
}

function switchDay(day) {
    currentDay = day;
    loadSchedule();
}

// ==================== 教练容量饼图 ====================
function showCoachCapacityChart() {
    document.getElementById('coachCapacityChart').style.display = 'block';
    renderCoachCapacity();
}

function hideCoachCapacityChart() {
    document.getElementById('coachCapacityChart').style.display = 'none';
}

async function renderCoachCapacity() {
    const day = currentDay;
    const res = await fetch(`/api/schedules?day=${day}`);
    const schedules = await res.json();
    const settingsRes = await fetch('/api/settings');
    const settings = await settingsRes.json();
    const coaches = settings.coaches || [];
    const maxPerCoach = settings.max_students_per_coach || 6;
    
    const studentsRes = await fetch('/api/students');
    const allStudents = await studentsRes.json();
    const studentMap = {};
    allStudents.forEach(s => studentMap[s.id] = s);
    
    const container = document.getElementById('coachCapacityContent');
    container.innerHTML = coaches.map(coach => {
        const coachSchedules = schedules.filter(s => (s.coach || studentMap[s.student_id]?.coach) === coach);
        const count = coachSchedules.length;
        const percent = Math.round(count / maxPerCoach * 100);
        
        // 饼图颜色
        let color = '#52c41a'; // 绿色-有位
        if (count >= maxPerCoach) color = '#ff4d4f'; // 红色-满员
        else if (count >= maxPerCoach * 0.7) color = '#faad14'; // 橙色-紧张
        
        return `<div style="text-align:center;min-width:100px;">
            <div style="position:relative;width:80px;height:80px;margin:0 auto 8px;">
                <svg viewBox="0 0 100 100" style="transform:rotate(-90deg);">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" stroke-width="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8"
                        stroke-dasharray="${count * 25.12} ${maxPerCoach * 25.12}" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:18px;font-weight:700;color:${color}">${count}</div>
            </div>
            <div style="font-weight:600;font-size:13px;">${coach}</div>
            <div style="font-size:11px;color:#666;">${count}/${maxPerCoach}人</div>
            <div style="font-size:11px;color:#999;">${percent}%</div>
        </div>`;
    }).join('');
}

function showAddScheduleModal() {
    showModal('addScheduleModal');
    loadScheduleStudents();
    loadScheduleSlots();
    loadScheduleCoaches();
}

async function loadScheduleStudents() {
    const res = await fetch('/api/students');
    const students = await res.json();
    const sel = document.getElementById('scheduleStudent');
    sel.innerHTML = '<option value="">-- 选择学员 --</option>' + 
        students.filter(s => s.status === 'active').map(s => `<option value="${s.id}">${s.name} (${s.coach || '未分配'})</option>`).join('');
}

async function loadScheduleSlots() {
    const day = document.getElementById('scheduleDay').value;
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const slots = settings.time_slots[day] || [];
    document.getElementById('scheduleSlot').innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function loadScheduleCoaches() {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const coaches = settings.coaches || [];
    document.getElementById('scheduleCoach').innerHTML = coaches.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function addSchedule() {
    const studentId = document.getElementById('scheduleStudent').value;
    const day = document.getElementById('scheduleDay').value;
    const slot = document.getElementById('scheduleSlot').value;
    const coach = document.getElementById('scheduleCoach').value;
    
    if (!studentId) return alert('请选择学员');
    if (!slot) return alert('请选择时间段');
    
    await fetch('/api/schedules', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ student_id: studentId, week_day: day, time_slot: slot, coach: coach })
    });
    
    hideModal('addScheduleModal');
    loadSchedule();
    alert('排课成功！');
}

async function showMoveScheduleModal() {
    const day = document.getElementById('scheduleDay').value;
    const res = await fetch('/api/schedules?day=' + day);
    const schedules = await res.json();
    const studentsRes = await fetch('/api/students');
    const studentsList = await studentsRes.json();
    const studentMap = {};
    studentsList.forEach(s => studentMap[s.id] = s);
    const select = document.getElementById('moveFromSchedule');
    select.innerHTML = schedules.map(s => `<option value="${s.id}">${studentMap[s.student_id]?.name || '未知'} - ${s.time_slot} (${s.coach})</option>`).join('') || '<option>暂无排课</option>';
    const settings = await fetch('/api/settings').then(r => r.json());
    let coaches = settings.coaches || [];
    if (!coaches.includes('孙教练')) coaches.push('孙教练');
    document.getElementById('moveNewCoach').innerHTML = coaches.map(c => `<option value="${c}">${c}</option>`).join('');
    loadMoveNewSlots();
    showModal('moveScheduleModal');
}

async function loadMoveNewSlots() {
    const day = document.getElementById('moveNewDay').value;
    const settings = await fetch('/api/settings').then(r => r.json());
    document.getElementById('moveNewSlot').innerHTML = (settings.time_slots[day] || []).map(s => `<option>${s}</option>`).join('');
}

async function confirmMoveSchedule() {
    const scheduleId = document.getElementById('moveFromSchedule').value;
    const newDay = document.getElementById('moveNewDay').value;
    const newSlot = document.getElementById('moveNewSlot').value;
    const newCoach = document.getElementById('moveNewCoach').value;
    if (!scheduleId) return alert('请选择要调整的排课');
    await fetch('/api/schedules/' + scheduleId, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ week_day: newDay, time_slot: newSlot, coach: newCoach })
    });
    hideModal('moveScheduleModal');
    loadSchedule();
    alert('调整成功！');
}

async function importSchedule() {
    const file = document.getElementById('scheduleFile').files[0];
    if (!file) return alert('请选择文件');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/schedules/import', { method: 'POST', body: fd });
    const data = await res.json();
    alert(`成功导入 ${data.imported} 条课表记录`);
    hideModal('importScheduleModal');
    loadSchedule();
}

async function clearSchedules() {
    if (!confirm('确定清空所有课表？')) return;
    await fetch('/api/schedules/clear', { method: 'POST' });
    loadSchedule();
}

// ==================== 消课点名 ====================
let attendanceStudents = [];
let selectedAttendance = new Set();

async function loadAttendanceSlots() {
    const day = document.getElementById('attendanceDay').value;
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const slots = settings.time_slots[day] || [];
    const slotSel = document.getElementById('attendanceSlot');
    slotSel.innerHTML = slots.map(s => `<option>${s}</option>`).join('');
}

async function loadAttendanceStudents() {
    const day = document.getElementById('attendanceDay').value;
    const slot = document.getElementById('attendanceSlot').value;
    if (!slot) return alert('请选择时间段');
    const res = await fetch(`/api/schedules?day=${day}`);
    const schedules = await res.json();
    const matched = schedules.filter(s => s.time_slot === slot);
    const studentsRes = await fetch('/api/students');
    const allStudents = await studentsRes.json();
    const studentMap = {};
    allStudents.forEach(s => studentMap[s.id] = s);

    attendanceStudents = [];
    selectedAttendance.clear();
    matched.forEach(s => {
        const student = studentMap[s.student_id] || {};
        attendanceStudents.push({
            schedule_id: s.id,
            student_id: s.student_id,
            student_name: student.name || '未知',
            coach: s.coach || '',
            remaining_hours: student.remaining_hours || 0
        });
    });

    const tbody = document.getElementById('attendanceStudentsTable');
    tbody.innerHTML = attendanceStudents.map((a, i) => `
        <tr>
            <td><input type="checkbox" ${selectedAttendance.has(i)?'checked':''} onchange="toggleAttSelect(${i})"></td>
            <td>${a.student_name}</td>
            <td>${a.coach}</td>
            <td><strong>${a.remaining_hours}</strong></td>
            <td><span class="badge badge-active">待消课</span></td>
        </tr>
    `).join('');
    document.getElementById('attendanceCount').textContent = `共 ${attendanceStudents.length} 名学员`;
}

function toggleAttSelect(i) {
    if (selectedAttendance.has(i)) selectedAttendance.delete(i);
    else selectedAttendance.add(i);
}

function toggleAttSelectAll() {
    const all = document.getElementById('attSelectAll').checked;
    selectedAttendance.clear();
    if (all) attendanceStudents.forEach((_, i) => selectedAttendance.add(i));
    loadAttendanceStudents();
}

async function takeAttendance() {
    if (selectedAttendance.size === 0) return alert('请先选择要消课的学员');
    const date = document.getElementById('attendanceDate').value;
    const day = document.getElementById('attendanceDay').value;
    const slot = document.getElementById('attendanceSlot').value;
    const count = selectedAttendance.size;
    if (!confirm(`确定对 ${count} 名学员消课？`)) return;

    for (const i of selectedAttendance) {
        const a = attendanceStudents[i];
        await fetch('/api/attendance', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ student_id: a.student_id, hours_used: 1, date, time_slot: slot, coach: a.coach, schedule_id: a.schedule_id })
        });
    }
    alert(`已消课 ${count} 名学员`);
    selectedAttendance.clear();
    loadAttendanceStudents();
    loadAttendanceHistory();
}

async function loadAttendanceHistory() {
    const res = await fetch('/api/attendance');
    const attendances = await res.json();
    const studentsRes = await fetch('/api/students');
    const allStudents = await studentsRes.json();
    const studentMap = {};
    allStudents.forEach(s => studentMap[s.id] = s);
    document.getElementById('attendanceTable').innerHTML = attendances.reverse().slice(0, 50).map(a => {
        const s = studentMap[a.student_id] || {};
        return `<tr><td>${a.date || '-'}</td><td>${s.name || a.student_name || '未知'}</td><td>${a.coach || '-'}</td><td>${a.hours_used}</td><td>${a.time_slot || '-'}</td></tr>`;
    }).join('');
}

// 兼容旧函数名
async function loadAttendance() {
    loadAttendanceHistory();
}

// ==================== 统计中心 ====================
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const stats = await res.json();
        const grid = document.getElementById('statsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="stat-card"><div class="value">${stats.total_students || 0}</div><div class="label">总学员数</div></div>
                <div class="stat-card"><div class="value">${stats.active_students || 0}</div><div class="label">在读学员</div></div>
                <div class="stat-card"><div class="value">${stats.potential_students || 0}</div><div class="label">潜在学员</div></div>
                <div class="stat-card"><div class="value">${stats.total_hours || 0}</div><div class="label">总课时</div></div>
                <div class="stat-card"><div class="value">${stats.remaining_hours || 0}</div><div class="label">剩余课时</div></div>
                <div class="stat-card clickable" onclick="showConsumeDetail()"><div class="value">${stats.consumption_rate || 0}%</div><div class="label">消耗率↘</div></div>
                <div class="stat-card clickable" onclick="showStatsDetail()"><div class="value" style="color:${stats.attendance_rate >= 80 ? '#27ae60' : stats.attendance_rate >= 60 ? '#f39c12' : '#e74c3c'}">${stats.attendance_rate || 0}%</div><div class="label">出勤率(周)↘</div></div>
            `;
        }
    } catch(e) { console.error('loadStats failed:', e); }

    // 今日上课数据
    try {
        const attRes = await fetch('/api/attendance_today', { signal: AbortSignal.timeout(5000) });
        const att = await attRes.json();
        const totalEl = document.getElementById('todayTotal');
        const dateEl = document.getElementById('todayDate');
        const attList = document.getElementById('todayAttendees');
        if (totalEl) totalEl.textContent = att.total || 0;
        if (dateEl) dateEl.textContent = att.date || '';
        if (attList) {
            if (att.attendees && att.attendees.length > 0) {
                const lines = att.attendees.map(a => {
                    const coach = a.coach ? `【${a.coach}】` : '';
                    const slot = a.time_slot ? ` ${a.time_slot}` : '';
                    return `${coach}${a.name}${slot}`;
                });
                attList.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
            } else {
                attList.innerHTML = '<div style="opacity:0.7">暂无上课记录</div>';
            }
        }
    } catch(e) {
        const attList = document.getElementById('todayAttendees');
        if (attList) attList.innerHTML = '<div style="opacity:0.7">暂无上课记录</div>';
    }

    // 预加载每周分布
    try {
        const br = await fetch('/api/stats_by_coach', { signal: AbortSignal.timeout(5000) });
        window.__statsByCoachCache = await br.json();
    } catch (e) { window.__statsByCoachCache = {}; }
    
    // 加载教练每日上课统计
    try {
        const dailyRes = await fetch('/api/daily_coach_stats', { signal: AbortSignal.timeout(5000) });
        const daily = await dailyRes.json();
        const dailyContainer = document.getElementById('dailyCoachStats');
        if (dailyContainer && daily.coaches) {
            const coaches = daily.coaches;
            let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">';
            for (const coach in coaches) {
                const c = coaches[coach];
                const color = getCoachColor(coach);
                html += '<div style="background:'+color+';color:#fff;padding:14px;border-radius:10px;text-align:center">';
                html += '<div style="font-size:24px;font-weight:bold">'+c.count+'</div>';
                html += '<div style="font-size:12px;opacity:0.9">'+coach+'</div>';
                if (c.students && c.students.length > 0) {
                    html += '<div style="font-size:11px;margin-top:6px;opacity:0.8">'+c.students.join('、')+'</div>';
                }
                html += '</div>';
            }
            html += '</div>';
            if (Object.keys(coaches).length === 0) {
                html = '<div style="text-align:center;padding:20px;color:#999">今日暂无上课记录</div>';
            }
            dailyContainer.innerHTML = html;
        }
    } catch (e) { 
        const dailyContainer = document.getElementById('dailyCoachStats');
        if (dailyContainer) dailyContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#999">加载失败</div>';
    }
}

const coachColors = {'王教练':'#ff6b35','陈教练':'#1e90ff','孙教练':'#f1c40f','其他':'#9b59b6'};
function getCoachColor(coach) { return coachColors[coach]||coachColors['其他']; }

async function showConsumeDetail() {
    try {
        const res = await fetch('/api/stats');
        const stats = await res.json();
        const cs = stats.course_stats || {};
        let html = '<div style="margin-bottom:16px"><h4 style="margin-bottom:12px">总体</h4><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div style="background:#f8f8f8;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold">'+stats.total_hours+'</div><div style="font-size:12px;color:#666">总课时</div></div><div style="background:#e8f5e9;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold;color:#27ae60">'+(stats.total_hours - stats.remaining_hours)+'</div><div style="font-size:12px;color:#666">已消耗</div></div><div style="background:#fff3e0;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold;color:#f39c12">'+stats.remaining_hours+'</div><div style="font-size:12px;color:#666">剩余</div></div><div style="background:#e3f2fd;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold;color:#1976d2">'+stats.consumption_rate+'%</div><div style="font-size:12px;color:#666">消耗率</div></div></div></div>';
        html += '<div><h4 style="margin-bottom:12px">按课程</h4>';
        for(const course in cs) {
            const c = cs[course];
            if(c.scheduled === 0) continue;
            html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee"><div>'+course+'</div><div style="color:'+(c.rate>=80?'#27ae60':c.rate>=60?'#f39c12':'#e74c3c')+';font-weight:bold">'+c.rate+'%</div></div>';
        }
        document.getElementById('statsDetailContent').innerHTML = html;
        document.querySelector('#statsDetailModal h3').textContent = '存销比详情';
        showModal('statsDetailModal');
    } catch(e) { alert('加载失败: '+e.message); }
}

async function showStatsDetail() {
    try {
        const [statsRes, attRes] = await Promise.all([fetch('/api/stats'), fetch('/api/attendance')]);
        const stats = await statsRes.json();
        const allAtt = await attRes.json();
        const cs = stats.coach_stats || {};
        const today = new Date().toISOString().slice(0, 10);
        const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0, 10);
        const lastWeek = allAtt.filter(a => a.date >= weekAgo && a.date <= today && a.status === 'leave');
        let leaveHtml = '';
        for(const a of lastWeek.slice(0, 20)) {
            leaveHtml += '<div style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px"><span style="background:#f39c12;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px">请假</span> '+a.student_name+' '+a.date+' '+a.time_slot+' <span style="color:#666">('+a.coach+')</span></div>';
        }
        let html = '<div style="margin-bottom:20px"><h4 style="margin-bottom:12px">总体统计</h4><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div style="background:#f8f8f8;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold">'+stats.scheduled+'</div><div style="font-size:12px;color:#666">应到人次</div></div><div style="background:#e8f5e9;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold;color:#27ae60">'+stats.attended+'</div><div style="font-size:12px;color:#666">实到人次</div></div><div style="background:#fff3e0;padding:12px;border-radius:8px"><div style="font-size:24px;font-weight:bold;color:#f39c12">'+stats.leave_days+'</div><div style="font-size:12px;color:#666">请假人次</div></div></div></div>';
        if(leaveHtml) {
            html += '<div style="margin-bottom:20px"><h4 style="margin-bottom:12px">请假明细</h4>'+leaveHtml+'</div>';
        }
        html += '<div><h4 style="margin-bottom:12px">按教练(点击查看详情)</h4>';
        for(const coach in cs) {
            const c = cs[coach];
            html += '<div class="coach-row" onclick="showCoachDetail(\''+coach+'\')" style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;cursor:pointer;background:#fafafa;margin-bottom:4px;border-radius:8px;padding:12px"><div><span style="background:'+getCoachColor(coach)+';color:#fff;padding:4px 10px;border-radius:4px;font-size:14px">'+coach+'</span></div><div><span style="color:'+(c.rate>=80?'#27ae60':c.rate>=60?'#f39c12':'#e74c3c')+';font-weight:bold;font-size:18px">'+c.rate+'%</span> <span style="color:#999;font-size:12px">('+c.attended+'/'+c.scheduled+')</span> →</div></div>';
        }
        document.getElementById('statsDetailContent').innerHTML = html;
        document.querySelector('#statsDetailModal h3').textContent = '出勤率详情(近7天)';
        showModal('statsDetailModal');
    } catch(e) { alert('加载失败: '+e.message); }
}
async function showCoachDetail(coach) {
    try {
        const res = await fetch('/api/stats');
        const stats = await res.json();
        const c = stats.coach_stats[coach] || {};
        let html = '<div style="text-align:center"><h3 style="margin-bottom:16px">'+coach+'</h3></div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px"><div style="background:#f8f8f8;padding:16px;border-radius:8px"><div style="font-size:28px;font-weight:bold">'+c.scheduled+'</div><div style="font-size:13px;color:#666">应到</div></div><div style="background:#e8f5e9;padding:16px;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#27ae60">'+c.attended+'</div><div style="font-size:13px;color:#666">实到</div></div><div style="background:#fff3e0;padding:16px;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#f39c12">'+c.leave+'</div><div style="font-size:13px;color:#666">请假</div></div><div style="background:#ffebee;padding:16px;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#e74c3c">'+c.missed+'</div><div style="font-size:13px;color:#666">旷课</div></div></div>';
        html += '<div style="margin-top:20px;text-align:center;padding:20px;background:linear-gradient(135deg,'+(c.rate>=80?'#e8f5e9':c.rate>=60?'#fff8e1':'#ffebee')+',#fff);border-radius:12px"><div style="font-size:48px;font-weight:bold;color:'+(c.rate>=80?'#27ae60':c.rate>=60?'#f39c12':'#e74c3c')+'">'+c.rate+'%</div><div style="color:#666;font-size:14px">出勤率</div></div>';
        html += '<div style="margin-top:16px;text-align:center"><button onclick="showStatsDetail()" style="padding:8px 16px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer">← 返回</button></div>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } catch(e) { alert('加载失败: '+e.message); }
}

function renderStatsByCoachBranch(data) {
    const container = document.getElementById('statsBranchContent');
    if (!container) return;
    const days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
    let html = '';
    for (const day of days) {
        const dayData = data[day] || {};
        const coaches = Object.keys(dayData);
        if (coaches.length === 0) continue;
        html += `<div style="margin-bottom:10px">
                    <div style="font-weight:700;font-size:14px;padding:6px 0;border-bottom:1px solid #eee">${day}</div>`;
        for (const coach of coaches) {
            const entry = dayData[coach];
            const students = entry.students || [];
            html += `<div style="padding:6px 0;">
                        <span style="font-weight:600;color:#667eea">${coach}</span>
                        <span style="color:#ff4d4f;font-weight:700;margin-left:8px">${entry.count}节</span>
                        <div style="font-size:12px;color:#666;margin-top:4px">${students.join('、') || '-'}</div>
                      </div>`;
        }
        html += `</div>`;
    }
    container.innerHTML = html || '<div style="color:#999;font-size:13px;text-align:center;padding:20px">暂无排课数据</div>';
}

let _statsBranchExpanded = false;
function toggleStatsBranch() {
    const branch = document.getElementById('statsBranch');
    const arrow = document.getElementById('statsBranchArrow');
    if (!branch) return;
    const isHidden = branch.style.display === 'none';
    if (isHidden) {
        branch.style.display = 'block';
        if (arrow) arrow.textContent = '▲';
        if (!_statsBranchExpanded) {
            const data = window.__statsByCoachCache;
            if (data) renderStatsByCoachBranch(data);
            else {
                fetch('/api/stats_by_coach').then(r => r.json()).then(d => {
                    window.__statsByCoachCache = d;
                    renderStatsByCoachBranch(d);
                }).catch(() => {});
            }
            _statsBranchExpanded = true;
        }
    } else {
        branch.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
        _statsBranchExpanded = false;
    }
}

let _statsMonthExpanded = false;
function toggleStatsMonth() {
    var monthDiv = document.getElementById('statsMonth');
    var arrow = document.getElementById('statsMonthArrow');
    if (!monthDiv) return;
    var isHidden = monthDiv.style.display === 'none';
    if (isHidden) {
        monthDiv.style.display = 'block';
        if (arrow) arrow.textContent = '▲';
        if (!_statsMonthExpanded) {
            _statsMonthExpanded = true;
            var content = document.getElementById('statsMonthContent');
            if (content && content.innerHTML.indexOf('加载') > -1) {
                fetch('/api/stats_monthly').then(function(r){return r.json();}).then(function(d){
                    var html = '<table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="padding:8px">月份</th><th style="padding:8px">王教练</th><th style="padding:8px">陈教练</th><th style="padding:8px">孙教练</th><th style="padding:8px">合计</th></tr>';
                    for(var i=0; i<d.months.length; i++) {
                        html += '<tr><td style="padding:8px">'+d.months[i]+'</td><td style="padding:8px">'+d.wang[i]+'</td><td style="padding:8px">'+d.chen[i]+'</td><td style="padding:8px">'+d.sun[i]+'</td><td style="padding:8px;font-weight:bold">'+d.total[i]+'</td></tr>';
                    }
                    html += '</table>';
                    content.innerHTML = html;
                }).catch(function(e){
                    if(content) content.innerHTML = '加载失败';
                });
            }
        }
    } else {
        monthDiv.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
    }
}




        html += '</tbody></table>';
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '渲染错误';
    }
}
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showMonthDetail(month) {
    const data = _monthlyData.find(d => d.month === month);
    if(!data) return;
    const daily = data.daily || {};
    const dates = Object.keys(daily).sort().reverse();
    let html = '<div style="margin-bottom:12px"><button onclick="renderStatsMonthly(_monthlyData)" style="padding:8px 16px;background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer">← 返回</button></div>';
    html += '<h4>'+month+' 每日明细</h4>';
    
    let wangHtml = '<div><h5 style="color:#ff6b35">王教练(含孙)</h5>';
    let chenHtml = '<div><h5 style="color:#1e90ff">陈教练</h5>';
    
    for(const date of dates) {
        const d = daily[date];
        const wang = (d['王教练']||0) + (d['孙教练']||0);
        const chen = d['陈教练']||0;
        if(wang > 0) wangHtml += '<div style="padding:4px;font-size:13px">'+date.slice(5)+'：'+wang+'节</div>';
        if(chen > 0) chenHtml += '<div style="padding:4px;font-size:13px">'+date.slice(5)+'：'+chen+'节</div>';
    }
    wangHtml += '</div>';
    chenHtml += '</div>';
    
    html += '<div style="display:flex;gap:30px">'+wangHtml + chenHtml+'</div>';
    document.getElementById('statsMonthContent').innerHTML = html;
}
    wangHtml += '</div>';
    chenHtml += '</div>';
    
    html += '<div style="display:flex;gap:40px">'+wangHtml + chenHtml+'</div>';
    document.getElementById('statsMonthContent').innerHTML = html;
}

// ==================== 请假管理 ====================
async function loadLeaves() {
    const res = await fetch('/api/leaves');
    const leaves = await res.json();
    document.getElementById('leavesTable').innerHTML = leaves.map(l => `
        <tr>
            <td>${l.student_name || '-'}</td>
            <td>${l.leave_date || '-'}</td>
            <td>${l.week_day || '-'}</td>
            <td>${l.time_slot || '-'}</td>
            <td>${l.reason || '-'}</td>
            <td><span class="badge badge-${l.status}">${l.status === 'pending' ? '待处理' : l.status === 'approved' ? '已批准' : '已拒绝'}</span></td>
            <td class="actions">
                <button class="btn btn-sm" onclick="editLeave('${l.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLeave('${l.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

async function editLeave(id) {
    const res = await fetch('/api/leaves');
    const leaves = await res.json();
    const l = leaves.find(x => x.id === id);
    if (!l) return;
    document.getElementById('editLeaveId').value = id;
    document.getElementById('leaveModalTitle').textContent = '编辑请假';
    populateStudentSelect('leaveStudent');
    setTimeout(() => {
        document.getElementById('leaveStudent').value = l.student_id || '';
    }, 100);
    document.getElementById('leaveDate').value = l.leave_date || '';
    document.getElementById('leaveSlot').value = l.time_slot || '';
    document.getElementById('leaveReason').value = l.reason || '';
    showModal('leaveModal');
}

async function deleteLeave(id) {
    if (!confirm('确定删除该请假记录？')) return;
    await fetch(`/api/leaves/${id}`, { method: 'DELETE' });
    loadLeaves();
}

async function saveLeave() {
    const studentId = document.getElementById('leaveStudent').value;
    const leaveDate = document.getElementById('leaveDate').value;
    const timeSlot = document.getElementById('leaveSlot').value;
    const reason = document.getElementById('leaveReason').value.trim();
    if (!studentId) return alert('请选择学员');
    if (!leaveDate) return alert('请选择请假日期');

    const studentsRes = await fetch('/api/students');
    const students = await studentsRes.json();
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : '';

    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const date = new Date(leaveDate);
    const weekDay = weekDays[date.getDay()];

    const editId = document.getElementById('editLeaveId').value;
    const body = {
        student_id: studentId,
        student_name: studentName,
        leave_date: leaveDate,
        week_day: weekDay,
        time_slot: timeSlot,
        reason: reason,
        status: 'pending'
    };

    if (editId) {
        await fetch(`/api/leaves/${editId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
    } else {
        await fetch('/api/leaves', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
    }
    hideModal('leaveModal');
    loadLeaves();
}

// ==================== 临时插班生 ====================
async function loadTempStudents() {
    const res = await fetch('/api/temp-students');
    const tempStudents = await res.json();
    document.getElementById('tempStudentsTable').innerHTML = tempStudents.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.phone || '-'}</td>
            <td>${t.level || '-'}</td>
            <td>${t.coach || '-'}</td>
            <td>${t.course_date || '-'}</td>
            <td>${t.time_slot || '-'}</td>
            <td><strong>${t.hours_remaining || 0}</strong></td>
            <td><span class="badge badge-${t.status}">${t.status === 'active' ? '在读' : '已结'}</span></td>
            <td class="actions">
                <button class="btn btn-sm" onclick="consumeTempHours('${t.id}')">消课</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTempStudent('${t.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

async function editTempStudent(id) {
    const res = await fetch('/api/temp-students');
    const tempStudents = await res.json();
    const t = tempStudents.find(x => x.id === id);
    if (!t) return;
    document.getElementById('editTempId').value = id;
    document.getElementById('tempModalTitle').textContent = '编辑插班生';
    document.getElementById('tempName').value = t.name;
    document.getElementById('tempPhone').value = t.phone || '';
    document.getElementById('tempLevel').value = t.level || '初级';
    document.getElementById('tempCoach').value = t.coach || '';
    document.getElementById('tempDate').value = t.course_date || '';
    document.getElementById('tempSlot').value = t.time_slot || '';
    document.getElementById('tempHours').value = t.hours_remaining || 1;
    document.getElementById('tempNote').value = t.note || '';
    showModal('tempModal');
}

async function deleteTempStudent(id) {
    if (!confirm('确定删除该插班生？')) return;
    await fetch(`/api/temp-students/${id}`, { method: 'DELETE' });
    loadTempStudents();
}

async function consumeTempHours(id) {
    if (!confirm('确定消课1节？')) return;
    await fetch('/api/temp-students/consume', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ temp_id: id, hours: 1 })
    });
    loadTempStudents();
}

async function loadTempStudents() {
    const res = await fetch('/api/students');
    const students = await res.json();
    const sel = document.getElementById('tempSelectStudent');
    sel.innerHTML = '<option value="">-- 新学员 --</option>' + 
        students.filter(s => s.status === 'active').map(s => `<option value="${s.id}">${s.name} (${s.coach || '未分配'})</option>`).join('');
}

function onTempStudentChange() {
    const studentId = document.getElementById('tempSelectStudent').value;
    if (!studentId) {
        document.getElementById('tempName').value = '';
        document.getElementById('tempPhone').value = '';
        document.getElementById('tempLevel').value = '初级';
        return;
    }
    fetch('/api/students').then(r => r.json()).then(students => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            document.getElementById('tempName').value = student.name || '';
            document.getElementById('tempPhone').value = student.phone || '';
            document.getElementById('tempLevel').value = student.level || '初级';
        }
    });
}

async function saveTempStudent() {
    const name = document.getElementById('tempName').value.trim();
    if (!name) return alert('请输入姓名');

    const selectedStudentId = document.getElementById('tempSelectStudent').value;
    const date = document.getElementById('tempDate').value;
    const coach = document.getElementById('tempCoach').value;
    const timeSlot = document.getElementById('tempSlot').value;
    const attendNow = document.getElementById('tempAttendNow').checked;
    
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    let weekDay = '';
    if (date) {
        const d = new Date(date);
        weekDay = weekDays[d.getDay()];
    }

    let studentId = selectedStudentId;
    
    if (!selectedStudentId) {
        const body = {
            name,
            phone: document.getElementById('tempPhone').value.trim(),
            level: document.getElementById('tempLevel').value,
            coach: coach,
            purchased_hours: 0,
            bonus_hours: 0,
            remaining_hours: 0,
            status: 'active'
        };
        const res = await fetch('/api/students', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const newStudent = await res.json();
        studentId = newStudent.id;
    }

    if (date && timeSlot) {
        const scheduleBody = {
            student_id: studentId,
            week_day: weekDay,
            time_slot: timeSlot,
            coach: coach
        };
        await fetch('/api/schedules', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(scheduleBody)
        });
    }

    if (attendNow && studentId) {
        await fetch('/api/attendance', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                student_id: studentId, 
                hours_used: 1, 
                date: date,
                time_slot: timeSlot,
                coach: coach
            })
        });
    }

    hideModal('tempModal');
    loadTempStudents();
    loadSchedule();
    loadAttendanceHistory();
    alert('操作完成！');
}

async function loadLeaveSlots() {
    const leaveDate = document.getElementById('leaveDate').value;
    if (!leaveDate) return;
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(leaveDate);
    const weekDay = weekDays[d.getDay()];
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const slots = settings.time_slots[weekDay] || [];
    const slotSel = document.getElementById('leaveSlot');
    slotSel.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function loadTempSlots() {
    const tempDate = document.getElementById('tempDate').value;
    if (!tempDate) {
        document.getElementById('tempSlot').innerHTML = '<option value="">-- 先选日期 --</option>';
        return;
    }
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(tempDate);
    const weekDay = weekDays[d.getDay()];
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const slots = settings.time_slots[weekDay] || [];
    document.getElementById('tempSlot').innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

// ==================== 消课记录 ====================
let allRecords = [];

async function loadRecordMonths() {
    const res = await fetch('/api/attendance');
    const records = await res.json();
    const months = [...new Set(records.map(r => r.date ? r.date.substring(0, 7) : ''))].filter(Boolean).sort().reverse();
    const sel = document.getElementById('recordsMonth');
    if (sel) {
        sel.innerHTML = '<option value="">全部</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
    }
}

async function loadRecords() {
    const month = document.getElementById('recordsMonth') ? document.getElementById('recordsMonth').value : '';
    const res = await fetch('/api/attendance');
    let records = await res.json();
    if (month) {
        records = records.filter(r => r.date && r.date.startsWith(month));
    }
    allRecords = records;
    
    const studentsRes = await fetch('/api/students');
    const students = await studentsRes.json();
    const studentMap = {};
    students.forEach(s => studentMap[s.id] = s);
    
    const schedulesRes = await fetch('/api/schedules');
    const schedules = await schedulesRes.json();
    
    const tbody = document.getElementById('recordsTable');
    if (!tbody) return;
    
    tbody.innerHTML = records.reverse().map(r => {
        const student = studentMap[r.student_id] || {};
        const schedule = schedules.find(s => s.student_id === r.student_id);
        return `<tr>
            <td>${r.date || '-'}</td>
            <td>${student.name || '未知'}</td>
            <td>${schedule ? (schedule.coach || student.coach || '-') : (student.coach || '-')}</td>
            <td>${r.hours_used || 1}</td>
            <td>${schedule ? (schedule.time_slot || '-') : '-'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#999">暂无记录</td></tr>';
}

function exportRecords() {
    if (allRecords.length === 0) return alert('无数据');
    let csv = '\uFEFF日期,学员,教练,消耗课时,时间段\n';
    allRecords.forEach(r => {
        csv += `${r.date || ''},${r.student_name || ''},${r.coach || ''},${r.hours_used || 1},${r.time_slot || ''}\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `消课记录_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// ==================== 旷课记录 ====================
let allAbsences = [];

async function loadAbsenceMonths() {
    const res = await fetch('/api/absences');
    const absences = await res.json();
    const months = [...new Set(absences.map(r => r.absence_date ? r.absence_date.substring(0, 7) : ''))].filter(Boolean).sort().reverse();
    const sel = document.getElementById('absencesMonth');
    if (sel) {
        sel.innerHTML = '<option value="">全部</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
    }
}

async function loadAbsences() {
    const month = document.getElementById('absencesMonth') ? document.getElementById('absencesMonth').value : '';
    const res = await fetch('/api/absences');
    let absences = await res.json();
    if (month) {
        absences = absences.filter(r => r.absence_date && r.absence_date.startsWith(month));
    }
    allAbsences = absences;
    
    document.getElementById('absencesTable').innerHTML = absences.reverse().map(r => {
        return `<tr>
            <td>${r.student_name || '-'}</td>
            <td>${r.absence_date || '-'}</td>
            <td>${r.week_day || '-'}</td>
            <td>${r.time_slot || '-'}</td>
            <td>${r.coach || '-'}</td>
            <td>${r.reason || '-'}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteAbsence('${r.id}')">删除</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#999">暂无记录</td></tr>';
}

async function deleteAbsence(id) {
    if (!confirm('确定删除该旷课记录？')) return;
    await fetch(`/api/absences/${id}`, { method: 'DELETE' });
    loadAbsences();
}

function showAbsenceModal() {
    showModal('absenceModal');
    loadAbsenceStudents();
}

async function loadAbsenceStudents() {
    const res = await fetch('/api/students');
    const students = await res.json();
    const sel = document.getElementById('absenceStudent');
    sel.innerHTML = '<option value="">-- 选择学员 --</option>' + students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function loadAbsenceSlots() {
    const absenceDate = document.getElementById('absenceDate').value;
    if (!absenceDate) return;
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(absenceDate);
    const weekDay = weekDays[d.getDay()];
    const res = fetch('/api/settings').then(r => r.json()).then(settings => {
        const slots = settings.time_slots[weekDay] || [];
        document.getElementById('absenceSlot').innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
    });
}

async function saveAbsence() {
    const studentId = document.getElementById('absenceStudent').value;
    const absenceDate = document.getElementById('absenceDate').value;
    const reason = document.getElementById('absenceReason').value.trim();
    
    if (!studentId) return alert('请选择学员');
    if (!absenceDate) return alert('请选择旷课日期');
    if (!reason) return alert('请输入旷课原因');
    
    const studentsRes = await fetch('/api/students');
    const students = await studentsRes.json();
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : '';
    
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(absenceDate);
    const weekDay = weekDays[d.getDay()];
    
    await fetch('/api/absences', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            student_id: studentId,
            student_name: studentName,
            absence_date: absenceDate,
            week_day: weekDay,
            time_slot: document.getElementById('absenceSlot').value,
            coach: student ? student.coach : '',
            reason: reason
        })
    });
    
    hideModal('absenceModal');
    loadAbsences();
    alert('旷课记录已保存！');
}

// ==================== 批量旷课 ====================
let batchAbsenceMode = false;
let batchSelectedStudents = [];

function batchAbsence() {
    if (selectedAttendance.size === 0) return alert('请先选择要旷课的学员');
    
    batchAbsenceMode = true;
    batchSelectedStudents = [...selectedAttendance].map(i => attendanceStudents[i]);
    
    const names = batchSelectedStudents.map(s => s.student_name).join('、');
    const reason = prompt(`批量旷课学员：${names}\n\n请输入旷课原因（必填）：`);
    
    if (!reason || !reason.trim()) {
        alert('旷课原因不能为空');
        batchAbsenceMode = false;
        return;
    }
    
    processBatchAbsence(reason.trim());
}

async function processBatchAbsence(reason) {
    const date = document.getElementById('attendanceDate').value;
    const day = document.getElementById('attendanceDay').value;
    const slot = document.getElementById('attendanceSlot').value;
    
    for (const student of batchSelectedStudents) {
        await fetch('/api/absences', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                student_id: student.student_id,
                student_name: student.student_name,
                absence_date: date,
                week_day: day,
                time_slot: slot,
                coach: student.coach,
                reason: reason
            })
        });
    }
    
    alert(`已批量旷课 ${batchSelectedStudents.length} 名学员`);
    batchAbsenceMode = false;
    batchSelectedStudents = [];
    selectedAttendance.clear();
    loadAttendanceStudents();
    loadAbsences();
}

// ==================== 记录管理 Tab切换 ====================
function switchRecordTab(tab) {
    document.querySelectorAll('#recordTabs .week-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.record-section').forEach(s => s.style.display = 'none');
    
    if (tab === 'attendances') {
        document.querySelector('#recordTabs .week-tab:nth-child(1)').classList.add('active');
        document.getElementById('recordAttendances').style.display = 'block';
        loadRecords();
        loadRecordMonths();
    } else if (tab === 'leaves') {
        document.querySelector('#recordTabs .week-tab:nth-child(2)').classList.add('active');
        document.getElementById('recordLeaves').style.display = 'block';
        loadLeaves();
        loadLeaveMonths();
    } else if (tab === 'absences') {
        document.querySelector('#recordTabs .week-tab:nth-child(3)').classList.add('active');
        document.getElementById('recordAbsences').style.display = 'block';
        loadAbsences();
        loadAbsenceMonths();
    }
}

// Simple modal utilities shared by web/mobile
function showModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = 'block';
    el.classList.add('show');
  }
}
function hideModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    el.classList.remove('show');
  }
}

// ==================== 请假月份筛选 ====================
async function loadLeaveMonths() {
    const res = await fetch('/api/leaves');
    const leaves = await res.json();
    const months = [...new Set(leaves.map(r => r.leave_date ? r.leave_date.substring(0, 7) : ''))].filter(Boolean).sort().reverse();
    const sel = document.getElementById('leavesMonth');
    if (sel) {
        const currentValue = sel.value;
        sel.innerHTML = '<option value="">全部</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
        sel.value = currentValue;
    }
}

async function loadLeaves() {
    const month = document.getElementById('leavesMonth') ? document.getElementById('leavesMonth').value : '';
    const res = await fetch('/api/leaves');
    let leaves = await res.json();
    if (month) {
        leaves = leaves.filter(r => r.leave_date && r.leave_date.startsWith(month));
    }
    document.getElementById('leavesTable').innerHTML = leaves.map(l => `
        <tr>
            <td>${l.student_name || '-'}</td>
            <td>${l.leave_date || '-'}</td>
            <td>${l.week_day || '-'}</td>
            <td>${l.time_slot || '-'}</td>
            <td>${l.reason || '-'}</td>
            <td><span class="badge badge-${l.status}">${l.status === 'pending' ? '待处理' : l.status === 'approved' ? '已批准' : '已拒绝'}</span></td>
            <td class="actions">
                <button class="btn btn-sm" onclick="editLeave('${l.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLeave('${l.id}')">删除</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:#999">暂无记录</td></tr>';
}
// Simple ripple animation on click for elements with class 'ripple'
document.addEventListener('click', function(e) {
  const target = e.target.closest('.ripple');
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const circle = document.createElement('span');
  circle.className = 'ripple-effect';
  circle.style.left = (e.clientX - rect.left) + 'px';
  circle.style.top = (e.clientY - rect.top) + 'px';
  target.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
});
// 网页端：插班/现有学员流程相关逻辑
function openExistingEnrollmentModal() {
  // Load existing students
  fetch('/api/students?status=active').then(r => r.json()).then(students => {
    const sel = document.getElementById('existingStudent');
    if (sel) {
      sel.innerHTML = '<option value="">-- 选择学员 --</option>' + students.map(s => {
        const coach = s.coach || '';
        return `<option value="${s.id}">${s.name} (${coach})</option>`;
      }).join('');
    }
  });
  // Load coaches/settings
  fetch('/api/settings').then(r => r.json()).then(settings => {
    let coaches = settings.coaches || [];
    if (!coaches.includes('孙教练')) coaches = coaches.concat(['孙教练']);
    if (!coaches.includes('孙教练')) coaches = coaches.concat(['孙教练']);
    const coachSel = document.getElementById('existingCoach');
    if (coachSel) {
      coachSel.innerHTML = '<option value="">-- 选择教练 --</option>' + coaches.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  });
  // date default
  const today = new Date().toISOString().slice(0,10);
  const dateInput = document.getElementById('existingDate');
  if (dateInput) dateInput.value = today;
  // load slots
  loadExistingSlots();
  showModal('existingStudentModal');
}

function loadExistingSlots() {
  const date = document.getElementById('existingDate') ? document.getElementById('existingDate').value : '';
  if (!date) return;
  fetch('/api/settings').then(r => r.json()).then(settings => {
    // compute weekday name according to date
    const d = new Date(date);
    const weekDay = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
    const slots = settings.time_slots[weekDay] || [];
    const slotSel = document.getElementById('existingSlot');
    if (slotSel) slotSel.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

function executeExistingEnrollment() {
  const studentId = document.getElementById('existingStudent').value;
  const date = document.getElementById('existingDate').value;
  const time_slot = document.getElementById('existingSlot').value;
  const coach = document.getElementById('existingCoach').value;
  if (!studentId || !date || !time_slot) {
    alert('请完整填写学员、日期和时间段');
    return;
  }
  const week_day = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][new Date(date).getDay()];
  fetch('/api/schedules', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ student_id: studentId, week_day, time_slot, coach })
  });
  if (document.getElementById('existingAttendNow') && document.getElementById('existingAttendNow').checked) {
    fetch('/api/attendance', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ student_id: studentId, hours_used: 1, date: date, time_slot: time_slot, coach: coach })
    });
  }
  hideModal('existingStudentModal');
  // Refresh views
  loadStudents();
  loadSchedule();
  loadAttendanceHistory();
  alert('操作完成！');
}
// Mobile: Open existing enrollment modal
function openMobileExistingEnrollmentModal() {
  // Load active students into mobile modal
  fetch('/api/students?status=active').then(r => r.json()).then(students => {
    const sel = document.getElementById('mobileExistingStudent');
    if (sel) {
      sel.innerHTML = '<option value="">-- 选择学员 --</option>' + students.map(s => `<option value="${s.id}">${s.name} (${s.coach || ''})</option>`).join('');
    }
  });
  // Load coaches
  fetch('/api/settings').then(r => r.json()).then(settings => {
    const coachSel = document.getElementById('mobileExistingCoach');
    if (coachSel) coachSel.innerHTML = '<option value="">-- 选择教练 --</option>' + (settings.coaches || []).map(c => `<option value="${c}">${c}</option>`).join('');
  });
  // Date default today and load slots
  const today = new Date().toISOString().slice(0,10);
  const dateInput = document.getElementById('mobileExistingDate');
  if (dateInput) dateInput.value = today;
  // Load slots for today
  fetch('/api/settings').then(r => r.json()).then(settings => {
    loadMobileExistingSlotsForDate(today, settings);
  });
  showModal('mobileExistingModal');
}

function loadMobileExistingSlotsForDate(dateStr, settings) {
  const d = new Date(dateStr);
  const weekDay = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
  const slots = (settings.time_slots && settings.time_slots[weekDay]) || [];
  const slotSel = document.getElementById('mobileExistingSlot');
  if (slotSel) slotSel.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function executeMobileExistingEnrollment() {
  const studentId = document.getElementById('mobileExistingStudent').value;
  const date = document.getElementById('mobileExistingDate').value;
  const slot = document.getElementById('mobileExistingSlot').value;
  const coach = document.getElementById('mobileExistingCoach').value;
  if (!studentId || !date || !slot) { alert('请填写学员、日期与时间段'); return; }
  const week_day = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][new Date(date).getDay()];
  const payload = { student_id: studentId, week_day, time_slot: slot, coach };
  try {
    await fetch('/api/schedules', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  } catch(e) {
    alert('排课失败: ' + e);
    return;
  }
  if (document.getElementById('mobileExistingAttendNow') && document.getElementById('mobileExistingAttendNow').checked) {
    const att = { student_id: studentId, hours_used: 1, date, time_slot: slot, coach };
    try {
      await fetch('/api/attendance', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(att) });
    } catch(e) {
      alert('消课失败: ' + e);
    }
  }
  hideModal('mobileExistingModal');
  loadMobileSchedule();
  if (typeof updateOnlineCount === 'function') updateOnlineCount();
}

// ==================== 月度上课统计 ====================
let monthlyStatsData = null;

async function loadMonthlyStats() {
    try {
        const res = await fetch('/api/monthly_coach_stats');
        monthlyStatsData = await res.json();
        const monthList = document.getElementById('monthList');
        if (!monthList) return;
        
        let html = '';
        for (const m of monthlyStatsData) {
            const month = m[0];
            const days = m[1];
            const total = Object.values(days).reduce((sum, day) => {
                return sum + Object.values(day).reduce((s, c) => s + c, 0);
            }, 0);
            html += '<button class="btn btn-sm" onclick="showMonthDetail(\''+month+'\')" style="margin:4px">'+month+' ('+total+'节)</button>';
        }
        monthList.innerHTML = html || '<div style="text-align:center;padding:20px;color:#999">暂无数据</div>';
    } catch(e) {
        console.error('loadMonthlyStats error:', e);
    }
}

function showMonthDetail(month) {
    if (!monthlyStatsData) return;
    const monthData = monthlyStatsData.find(m => m[0] === month);
    if (!monthData) return;
    
    document.getElementById('monthDetailCard').style.display = 'block';
    document.getElementById('monthDetailTitle').textContent = month + ' 每日上课统计';
    
    const days = monthData[1];
    const sortedDays = Object.keys(days).sort().reverse();
    
    const coaches = ['王教练', '陈教练', '孙教练'];
    const coachColors = {'王教练':'#ff6b35','陈教练':'#1e90ff','孙教练':'#f1c40f'};
    
    let html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    html += '<tr style="background:#f5f5f5"><th style="padding:8px">日期</th>';
    for (const c of coaches) {
        html += '<th style="padding:8px;color:'+coachColors[c]+'">'+c+'</th>';
    }
    html += '<th style="padding:8px">合计</th></tr>';
    
    for (const day of sortedDays) {
        const dayData = days[day] || {};
        let w = dayData['王教练'] || 0;
        let c = dayData['陈教练'] || 0;
        let s = dayData['孙教练'] || 0;
        let sum = w + c + s;
        if (sum > 0) {
            html += '<tr><td style="padding:8px;border-bottom:1px solid #eee">'+day+'</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center'+(w>0?'font-weight:bold':'')+'">'+w+'</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center'+(c>0?'font-weight:bold':'')+'">'+c+'</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center'+(s>0?'font-weight:bold':'')+'">'+s+'</td>';
            html += '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold">'+sum+'</td></tr>';
        }
    }
    html += '</table>';
    document.getElementById('monthDetailContent').innerHTML = html;
}
