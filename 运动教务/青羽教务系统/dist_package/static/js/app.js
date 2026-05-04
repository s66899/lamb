// ==================== 全局变量 ====================
let students = [];
let selectedStudents = new Set();
let currentDay = '星期一';
let selectedPackage = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    loadStudents();
    loadPackages();
    loadEnrollments();
    loadSchedule();
    loadAttendance();
    loadStats();
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
            if (tab === 'leaves') { loadLeaves(); populateStudentSelect('leaveStudent'); }
            if (tab === 'temp') { loadTempStudents(); loadTempSlots(); }
            if (tab === 'records') { loadRecords(); loadRecordMonths(); }
            if (tab === 'absences') { loadAbsences(); loadAbsenceMonths(); }
        });
    });
}

// ==================== 搜索 ====================
let searchResults = [];

function initSearch() {
    let timer;
    document.getElementById('globalSearch').addEventListener('input', e => {
        clearTimeout(timer);
        const keyword = e.target.value.trim();
        if (keyword.length > 0) {
            timer = setTimeout(() => doGlobalSearch(keyword), 300);
        } else {
            hideSearchResults();
        }
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

async function doGlobalSearch(keyword) {
    const res = await fetch(`/api/students?search=${encodeURIComponent(keyword)}`);
    searchResults = await res.json();
    
    const schedulesRes = await fetch('/api/schedules');
    const schedules = await schedulesRes.json();
    
    const leavesRes = await fetch('/api/leaves');
    const leaves = await leavesRes.json();
    
    showSearchResults(searchResults, schedules, leaves);
}

function showSearchResults(results, schedules, leaves) {
    let existing = document.getElementById('searchResults');
    if (existing) existing.remove();
    
    if (results.length === 0) return;
    
    const container = document.createElement('div');
    container.id = 'searchResults';
    container.className = 'search-results-dropdown';
    container.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-height:400px;overflow-y:auto;z-index:1000;margin-top:8px';
    
    container.innerHTML = results.slice(0, 10).map(s => {
        const studentSchedules = schedules.filter(sc => sc.student_id === s.id);
        const scheduleInfo = studentSchedules.length > 0 
            ? studentSchedules.map(sc => `${sc.week_day} ${sc.time_slot}`).join(', ') 
            : '暂无排课';
        const todayLeaves = leaves.filter(l => l.student_id === s.id && l.leave_date === new Date().toISOString().split('T')[0]);
        const leaveStatus = todayLeaves.length > 0 ? '<span style="color:#faad14;margin-left:8px">今日请假</span>' : '';
        
        return `<div class="search-result-item" onclick="showStudentDetail('${s.id}')" style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong style="font-size:15px">${s.name}</strong>
                    <span style="margin-left:8px;font-size:12px;color:#666">${s.phone || '-'}</span>
                    ${leaveStatus}
                </div>
                <strong style="color:var(--primary);font-size:16px">${s.remaining_hours || 0}</strong>
            </div>
            <div style="font-size:12px;color:#999;margin-top:6px">
                <span>教练: ${s.coach || '-'}</span> | 
                <span>等级: ${s.level || '-'}</span> | 
                <span>排课: ${studentSchedules.length}节/周</span>
            </div>
            <div style="font-size:12px;color:#666;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${scheduleInfo}
            </div>
        </div>`;
    }).join('');
    
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
        searchBox.style.position = 'relative';
        searchBox.appendChild(container);
    }
}

function hideSearchResults() {
    const existing = document.getElementById('searchResults');
    if (existing) existing.remove();
}

async function showStudentDetail(studentId) {
    const student = searchResults.find(s => s.id === studentId);
    if (!student) return;
    
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
    showModal('studentDetailModal');
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
    await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
    const studentId = document.getElementById('detailStudentId').value;
    showStudentDetail(studentId);
    loadSchedule();
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
    tbody.innerHTML = students.map(s => `
        <tr>
            <td><input type="checkbox" ${selectedStudents.has(s.id)?'checked':''} onchange="toggleSelect('${s.id}')"></td>
            <td>${s.name}</td>
            <td>${s.phone || '-'}</td>
            <td>${s.level || '-'}</td>
            <td>${s.coach || '-'}</td>
            <td>${s.purchased_hours || 0}</td>
            <td>${s.bonus_hours || 0}</td>
            <td><strong>${s.remaining_hours || 0}</strong></td>
            <td><span class="badge badge-${s.status}">${s.status==='active'?'在读':s.status==='inactive'?'已结':'潜在'}</span></td>
            <td class="actions">
                <button class="btn btn-sm" onclick="editStudent('${s.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">删除</button>
            </td>
        </tr>
    `).join('');
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
        note: document.getElementById('sNote').value.trim(),
        status: 'active'
    };
    if (editId) {
        body.remaining_hours = parseFloat(document.getElementById('sPurchased').value) + parseFloat(document.getElementById('sBonus').value);
        await fetch(`/api/students/${editId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    } else {
        body.remaining_hours = body.purchased_hours + body.bonus_hours;
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
            coachStudents[coach].push({ id: sc.id, name: student.name || '未知', student_id: sc.student_id });
        });

        return `<div class="schedule-row">
            <div class="schedule-time">${slot}</div>
            ${coaches.map(c => {
                const list = coachStudents[c] || [];
                const count = list.length;
                const color = count < maxPerCoach ? 'var(--success)' : count === maxPerCoach ? 'var(--warning)' : 'var(--danger)';
                return `<div class="schedule-coach">
                    <h4><span>${c}</span><span class="count" style="color:${color}">${count}/${maxPerCoach}</span></h4>
                    ${list.length ? list.map(s => `<span class="student-tag" style="display:inline-flex;align-items:center;gap:4px">
                        ${s.name}<button onclick="deleteSchedule('${s.id}')" style="background:none;border:none;color:#ff4d4f;cursor:pointer;font-size:12px;padding:0;margin-left:2px" title="删除">×</button>
                    </span>`).join('') : '<span style="color:#999;font-size:12px">(空)</span>'}
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
}

function switchDay(day) {
    currentDay = day;
    loadSchedule();
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
    const res = await fetch('/api/stats');
    const stats = await res.json();
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="value">${stats.total_students}</div><div class="label">总学员数</div></div>
        <div class="stat-card"><div class="value">${stats.active_students}</div><div class="label">在读学员</div></div>
        <div class="stat-card"><div class="value">${stats.potential_students}</div><div class="label">潜在学员</div></div>
        <div class="stat-card"><div class="value">${stats.total_hours}</div><div class="label">总课时</div></div>
        <div class="stat-card"><div class="value">${stats.remaining_hours}</div><div class="label">剩余课时</div></div>
        <div class="stat-card"><div class="value">${stats.consumption_rate}%</div><div class="label">消耗率</div></div>
    `;
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
