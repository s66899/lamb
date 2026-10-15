#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🐏的教务 - Web版本（优化版）
Flask后端API + 前端页面
优化点：内存缓存、文件热重载、原子写入、RLock并发保护、批量接口
"""

from flask import Flask, request, jsonify, render_template, g
import time, threading, uuid
import json
import os
import csv
import io
import uuid
import hashlib
from datetime import datetime
from typing import List, Dict, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, 'templates'))

# ==================== 配置 ====================

DATA_FILE = os.path.join(BASE_DIR, "教务数据.json")
BACKUP_FILE = os.path.join(BASE_DIR, "教务数据_backup.json")

COURSE_PACKAGES = [
    {"id": "1v1", "name": "1v1私教课", "type": "per_hour", "price_per_hour": 220, "description": "1对1教学，220元/节"},
    {"id": "1v2", "name": "1v2小班课", "type": "per_hour", "price_per_hour": 120, "description": "1对2教学，120元/节"},
    {"id": "pkg_50", "name": "50节课包", "type": "package", "hours": 50, "price": 3999, "description": "50节课，3999元"},
    {"id": "pkg_30", "name": "30节课包", "type": "package", "hours": 30, "price": 2699, "description": "30节课，2699元"},
    {"id": "pkg_15", "name": "15节课包", "type": "package", "hours": 15, "price": 1499, "description": "15节课，1499元"},
    {"id": "monthly", "name": "月卡", "type": "package", "hours": 7, "price": 569, "description": "月卡7节课，569元"},
]

# ==================== 高性能数据管理 ====================

_data_lock = threading.RLock()
_data_cache = None
_data_mtime = 0
_data_hash = ""

def _compute_hash(obj: dict) -> str:
    """计算数据哈希，用于轻量同步判断"""
    try:
        return hashlib.md5(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:16]
    except Exception:
        return str(time.time())

def _raw_load() -> dict:
    """直接从文件读取，不做缓存"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return create_default_data()
    return create_default_data()

def load_data() -> dict:
    """初始化加载，用于模块启动时"""
    global _data_cache, _data_mtime, _data_hash
    data = _raw_load()
    _data_cache = data
    try:
        _data_mtime = os.path.getmtime(DATA_FILE)
    except Exception:
        _data_mtime = time.time()
    _data_hash = _compute_hash(data)
    return data

def read_data() -> dict:
    """读取数据：优先内存缓存，若文件被外部修改则热重载"""
    global _data_cache, _data_mtime, _data_hash
    with _data_lock:
        try:
            current_mtime = os.path.getmtime(DATA_FILE) if os.path.exists(DATA_FILE) else 0
        except Exception:
            current_mtime = 0
        if current_mtime > _data_mtime + 0.001:
            _data_cache = _raw_load()
            _data_mtime = current_mtime
            _data_hash = _compute_hash(_data_cache)
        return _data_cache

def create_default_data() -> dict:
    return {
        "students": [], "courses": [], "schedules": [], "attendances": [],
        "settings": {
            "time_slots": {
                "星期一": ["17:00-18:30", "19:00-20:30"],
                "星期二": ["17:00-18:30", "19:00-20:30"],
                "星期三": ["17:00-18:30", "19:00-20:30"],
                "星期四": ["17:00-18:30", "18:30-20:00"],
                "星期五": ["17:00-18:30", "19:00-20:30"],
                "星期六": ["09:00-10:30", "10:30-12:00", "14:00-15:30", "15:30-17:00", "17:00-18:30", "19:00-20:30"],
                "星期日": ["09:00-10:30", "10:30-12:00", "14:00-15:30", "15:30-17:00", "17:00-18:30", "18:30-20:00"]
            },
            "coaches": ["王教练", "陈教练", "孙教练"],
            "course_levels": ["初级", "中级", "高级", "竞赛级"],
            "max_students_per_slot": 12,
            "max_students_per_coach": 6
        }
    }

def save_data(new_data: dict):
    """原子写入 + 自动备份 + 更新内存缓存"""
    global _data_cache, _data_mtime, _data_hash
    with _data_lock:
        # 先更新内存
        _data_cache = new_data
        _data_hash = _compute_hash(new_data)
        # 原子写入主文件
        tmp_file = DATA_FILE + ".tmp"
        try:
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_file, DATA_FILE)
        except Exception:
            # 若原子写失败，回退到直接写
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
        # 同步备份
        try:
            with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
        # 更新 mtime
        try:
            _data_mtime = os.path.getmtime(DATA_FILE)
        except Exception:
            _data_mtime = time.time()

def gen_id() -> str:
    return str(uuid.uuid4())[:8]

# 全局数据初始化
data = load_data()

# 启动时清理超过90天的消课记录
cutoff_date = (datetime.now() - __import__('datetime').timedelta(days=90)).strftime("%Y-%m-%d")
original_count = len(data.get("attendances", []))
data["attendances"] = [a for a in data.get("attendances", []) if a.get("date", "") > cutoff_date]
new_count = len(data["attendances"])
if original_count > new_count:
    print(f"启动清理: 删除了 {original_count - new_count} 条超过90天的记录")
    save_data(data)

# ==================== 在线用户统计 ====================

ONLINE_CLIENTS = {}

def prune_online():
    while True:
        now = time.time()
        for cid in list(ONLINE_CLIENTS.keys()):
            if now - ONLINE_CLIENTS[cid] > 60:
                del ONLINE_CLIENTS[cid]
        time.sleep(30)

_online_prune = threading.Thread(target=prune_online, daemon=True)
_online_prune.start()

@app.before_request
def before_request():
    cid = request.cookies.get('client_id')
    if not cid:
        cid = str(uuid.uuid4())
    g.client_id = cid
    ONLINE_CLIENTS[cid] = time.time()

@app.after_request
def set_cookie(response):
    cid = getattr(g, 'client_id', None)
    if not cid:
        cid = request.cookies.get('client_id') or str(uuid.uuid4())
        g.client_id = cid
    response.set_cookie('client_id', cid, max_age=60*60*24*7)
    ONLINE_CLIENTS[cid] = time.time()
    return response

# ==================== 页面路由 ====================

@app.route('/')
@app.route('/m')
def index():
    ua = request.headers.get('User-Agent', '').lower()
    if 'mobile' in ua or 'android' in ua or 'iphone' in ua or 'ipad' in ua or 'windows phone' in ua:
        return render_template('mobile.html')
    if request.args.get('m') == '1':
        return render_template('mobile.html')
    return render_template('index.html')

@app.route('/mobile')
def mobile():
    return render_template('mobile.html')

@app.route('/student')
def student_query():
    return render_template('student.html')

# ==================== 批量/同步 API ====================

@app.route('/api/sync', methods=['GET'])
def api_sync():
    """轻量同步接口：返回数据哈希和时间戳"""
    current_data = read_data()
    return jsonify({
        "hash": _data_hash,
        "timestamp": int(_data_mtime * 1000),
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    """批量首页接口：一次返回首页所需全部核心数据"""
    current_data = read_data()
    students = current_data.get("students", [])
    attendances = current_data.get("attendances", [])
    schedules = current_data.get("schedules", [])
    settings = current_data.get("settings", {})

    # stats
    total_hours = sum(s.get("purchased_hours", 0) + s.get("bonus_hours", 0) for s in students)
    remaining_hours = sum(s.get("remaining_hours", 0) for s in students)
    consumed = total_hours - remaining_hours
    consumption_rate = round(consumed / total_hours * 100, 2) if total_hours > 0 else 0

    # 存销比（金额维度）—— 基于课程包实际价格计算
    enrollments = current_data.get("enrollments", [])
    student_enrollments = {}
    for e in enrollments:
        sid = e.get("student_id")
        if sid not in student_enrollments:
            student_enrollments[sid] = []
        student_enrollments[sid].append(e)
    total_amount = 0.0
    consumed_amount = 0.0
    coach_amount = {}
    for s in students:
        sid = s.get("id")
        packages = student_enrollments.get(sid, [])
        pkg_total_hours = sum(e.get("hours", 0) for e in packages)
        pkg_total_price = sum(e.get("price", 0) for e in packages)
        avg_price = pkg_total_price / pkg_total_hours if pkg_total_hours > 0 else 0
        stu_total_hours = s.get("purchased_hours", 0) + s.get("bonus_hours", 0)
        stu_consumed = max(0, stu_total_hours - s.get("remaining_hours", 0))
        if avg_price > 0 and stu_total_hours > 0:
            stu_consumed_amount = stu_consumed * avg_price
            stu_total_amount = stu_total_hours * avg_price
            total_amount += stu_total_amount
            consumed_amount += stu_consumed_amount
            coach = s.get("coach", "未分配")
            if coach not in coach_amount:
                coach_amount[coach] = {"total": 0, "consumed": 0, "hours_total": 0, "hours_consumed": 0}
            coach_amount[coach]["total"] += stu_total_amount
            coach_amount[coach]["consumed"] += stu_consumed_amount
            coach_amount[coach]["hours_total"] += stu_total_hours
            coach_amount[coach]["hours_consumed"] += stu_consumed
    consumption_amount_rate = round(consumed_amount / total_amount * 100, 2) if total_amount > 0 else 0
    coach_amount_stats = {}
    for coach, amt in coach_amount.items():
        coach_amount_stats[coach] = {
            "total_amount": round(amt["total"], 2),
            "consumed_amount": round(amt["consumed"], 2),
            "rate": round(amt["consumed"] / amt["total"] * 100, 1) if amt["total"] > 0 else 0,
            "hours_total": amt["hours_total"],
            "hours_consumed": amt["hours_consumed"]
        }

    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - __import__('datetime').timedelta(days=7)).strftime("%Y-%m-%d")
    last_week = [a for a in attendances if week_ago <= a.get("date", "") <= today]
    attended = len([a for a in last_week if a.get("status") == "present"])
    leave_days = len([a for a in last_week if a.get("status") == "leave"])
    scheduled = attended + leave_days
    attendance_rate = round(attended / scheduled * 100, 1) if scheduled > 0 else 0

    # 今日考勤
    today_att = [a for a in attendances if a.get("date") == today]
    today_present = [a for a in today_att if a.get("status") == "present"]
    seen = set()
    today_attendees = []
    for a in today_present:
        sid = a.get("student_id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        today_attendees.append({
            "student_id": sid,
            "name": a.get("student_name") or "",
            "time_slot": a.get("time_slot") or "",
            "coach": a.get("coach") or ""
        })

    # 月度出勤率（本月）—— 基数为当月已过天数的应到人次，分子为 present + leave
    import calendar
    now = datetime.now()
    year, month = now.year, now.month
    _, last_day = calendar.monthrange(year, month)
    month_prefix = f"{year}-{month:02d}"
    weekday_names = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日']
    weekday_counts = {wd: 0 for wd in weekday_names}
    for sc in schedules:
        wd = sc.get("week_day")
        if wd in weekday_counts:
            weekday_counts[wd] += 1
    expected_month = 0
    # 只计算到今天的日期（含今天）
    for day in range(1, now.day + 1):
        date_obj = datetime(year, month, day)
        wd = weekday_names[date_obj.weekday()]
        expected_month += weekday_counts.get(wd, 0)
    month_present = len([a for a in attendances if a.get("date", "").startswith(month_prefix) and a.get("status") == "present"])
    month_leave = len([a for a in attendances if a.get("date", "").startswith(month_prefix) and a.get("status") == "leave"])
    month_absence = len([a for a in attendances if a.get("date", "").startswith(month_prefix) and a.get("status") == "absence"])
    monthly_attendance_rate = round((month_present + month_leave) / expected_month * 100, 1) if expected_month > 0 else 0

    # 上课预览（按教练 -> 星期 -> 学员名单）
    name_by_id = {s["id"]: s.get("name", "") for s in students}
    schedule_preview = {}
    for sc in schedules:
        coach = sc.get("coach") or "未分配"
        wd = sc.get("week_day") or "未知"
        if coach not in schedule_preview:
            schedule_preview[coach] = {}
        if wd not in schedule_preview[coach]:
            schedule_preview[coach][wd] = {"count": 0, "students": []}
        sname = name_by_id.get(sc.get("student_id"), "未知")
        if sname and sname not in schedule_preview[coach][wd]["students"]:
            schedule_preview[coach][wd]["students"].append(sname)
        schedule_preview[coach][wd]["count"] = len(schedule_preview[coach][wd]["students"])

    # 精简学员列表（仅首页需要字段）
    mini_students = [
        {"id": s.get("id"), "name": s.get("name"), "phone": s.get("phone"), "coach": s.get("coach"),
         "level": s.get("level"), "remaining_hours": s.get("remaining_hours", 0), "status": s.get("status")}
        for s in students
    ]

    return jsonify({
        "stats": {
            "total_students": len(students),
            "active_students": len([s for s in students if s.get("status") == "active"]),
            "potential_students": len([s for s in students if s.get("status") == "potential"]),
            "total_courses": len(current_data.get("courses", [])),
            "total_hours": total_hours,
            "remaining_hours": remaining_hours,
            "consumption_rate": consumption_rate,
            "consumption_amount_rate": consumption_amount_rate,
            "total_purchase_amount": round(total_amount, 2),
            "consumed_amount": round(consumed_amount, 2),
            "coach_amount_stats": coach_amount_stats,
            "attendance_rate": attendance_rate,
            "attended": attended,
            "leave_days": leave_days,
            "scheduled": scheduled,
            "monthly_attendance_rate": monthly_attendance_rate,
            "month_present": month_present,
            "month_leave": month_leave,
            "month_absence": month_absence,
            "month_expected": expected_month
        },
        "today": {
            "date": today,
            "total": len(today_attendees),
            "attendees": today_attendees,
            "records": today_att
        },
        "schedule_preview": schedule_preview,
        "settings": settings,
        "students": mini_students,
        "schedules": schedules,
        "hash": _data_hash
    })

@app.route('/api/online_count', methods=['GET'])
def online_count():
    now = time.time()
    for cid in list(ONLINE_CLIENTS.keys()):
        if now - ONLINE_CLIENTS[cid] > 60:
            del ONLINE_CLIENTS[cid]
    return jsonify({"online_count": len(ONLINE_CLIENTS), "clients": list(ONLINE_CLIENTS.keys())})

# ==================== API: 学员 ====================

@app.route('/api/students', methods=['GET'])
def get_students():
    current_data = read_data()
    status = request.args.get('status')
    search = request.args.get('search', '').lower()
    students = current_data["students"]
    if status:
        students = [s for s in students if s.get("status") == status]
    if search:
        students = [s for s in students if
                    search in s.get("name", "").lower() or
                    search in s.get("phone", "").lower() or
                    search in s.get("note", "").lower() or
                    search in s.get("level", "").lower() or
                    search in s.get("coach", "").lower()]
    return jsonify(students)

@app.route('/api/students/<student_id>', methods=['GET'])
def get_student_by_id(student_id):
    current_data = read_data()
    for s in current_data["students"]:
        if s.get("id") == student_id:
            return jsonify(s)
    return jsonify({"error": "学员不存在"}), 404

@app.route('/api/students', methods=['POST'])
def add_student():
    s = request.json
    student = {
        "id": gen_id(),
        "name": s.get("name", ""),
        "phone": s.get("phone", ""),
        "birth_date": s.get("birth_date", ""),
        "level": s.get("level", "初级"),
        "coach": s.get("coach", ""),
        "status": s.get("status", "active"),
        "note": s.get("note", ""),
        "purchased_hours": float(s.get("purchased_hours", 0)),
        "bonus_hours": float(s.get("bonus_hours", 0)),
        "remaining_hours": float(s.get("remaining_hours", 0)),
        "register_date": datetime.now().strftime("%Y-%m-%d")
    }
    current_data = read_data()
    current_data["students"].append(student)
    save_data(current_data)
    return jsonify(student), 201

@app.route('/api/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    updates = request.json
    current_data = read_data()
    for i, s in enumerate(current_data["students"]):
        if s["id"] == student_id:
            current_data["students"][i].update(updates)
            save_data(current_data)
            return jsonify(current_data["students"][i])
    return jsonify({"error": "学员不存在"}), 404

@app.route('/api/students/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    current_data = read_data()
    current_data["students"] = [s for s in current_data["students"] if s["id"] != student_id]
    save_data(current_data)
    return jsonify({"deleted": 1})

@app.route('/api/students/batch', methods=['DELETE'])
def delete_students():
    current_data = read_data()
    ids = request.json.get("ids", [])
    current_data["students"] = [s for s in current_data["students"] if s["id"] not in ids]
    save_data(current_data)
    return jsonify({"deleted": len(ids)})

@app.route('/api/students/import-csv', methods=['POST'])
def import_csv():
    if 'file' not in request.files:
        return jsonify({"error": "无文件"}), 400
    file = request.files['file']
    content = file.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    fieldnames = reader.fieldnames or []
    col_map = {}
    for name in fieldnames:
        nl = name.replace('*', '').lower().strip()
        if nl in ['姓名', 'name', '学生姓名']: col_map['name'] = name
        elif nl in ['电话', 'phone', '手机', 'mobile', '联系电话']: col_map['phone'] = name
        elif nl in ['出生日期', 'birthday', 'birth_date', '生日']: col_map['birth_date'] = name
        elif nl in ['等级', 'level']: col_map['level'] = name
        elif nl in ['教练', 'teacher', 'coach']: col_map['coach'] = name
        elif nl in ['状态', 'status']: col_map['status'] = name
        elif nl in ['备注', 'note']: col_map['note'] = name
        elif '购买' in nl or '购课' in nl:
            if 'purchased' not in col_map: col_map['purchased'] = name
        elif '赠送' in nl:
            if 'bonus' not in col_map: col_map['bonus'] = name
        elif '剩余' in nl:
            if 'remaining' not in col_map: col_map['remaining'] = name

    use_positional = False
    sample_rows = list(reader)
    if sample_rows and len(fieldnames) >= 11:
        first_vals = list(sample_rows[0].values())
        if len(first_vals) >= 7:
            try:
                float(first_vals[5])
                float(first_vals[6])
                if len(fieldnames) == 12:
                    use_positional = True
            except:
                pass

    current_data = read_data()
    imported = 0
    for row in sample_rows:
        if use_positional:
            raw_vals = list(row.values())
            if len(raw_vals) < 10:
                continue
            name = str(raw_vals[0]).strip()
            if not name:
                continue
            phone = str(raw_vals[1]).strip()
            level = str(raw_vals[9]).strip() if len(raw_vals) > 9 else '初级'
            coach = ''
            status = 'active'
            def _sf(v):
                try: return float(str(v).replace('课时','').strip())
                except: return 0.0
            purchased = _sf(raw_vals[5]) if len(raw_vals) > 5 else 0
            bonus = _sf(raw_vals[6]) if len(raw_vals) > 6 else 0
            remaining = _sf(raw_vals[8]) if len(raw_vals) > 8 else 0
        else:
            name = row.get(col_map.get('name', ''), '').strip()
            if not name:
                continue
            phone = row.get(col_map.get('phone', ''), '').strip()
            level = row.get(col_map.get('level', ''), '').strip() or '初级'
            coach = row.get(col_map.get('coach', ''), '').strip() or ''
            status_raw = row.get(col_map.get('status', ''), '').strip()
            status = 'active' if status_raw in ['在读', 'active'] else 'inactive'
            def _ph(v):
                if not v: return 0
                v = v.replace('课时', '').strip()
                try: return float(v)
                except: return 0
            purchased = _ph(row.get(col_map.get('purchased', ''), ''))
            bonus = _ph(row.get(col_map.get('bonus', ''), ''))
            remaining = _ph(row.get(col_map.get('remaining', ''), ''))

        existing = None
        for s in current_data["students"]:
            if s.get("name") == name:
                existing = s
                break
        if existing:
            existing["purchased_hours"] = existing.get("purchased_hours", 0) + purchased
            existing["bonus_hours"] = existing.get("bonus_hours", 0) + bonus
            existing["remaining_hours"] = existing.get("remaining_hours", 0) + remaining
            if phone: existing["phone"] = phone
            if level: existing["level"] = level
            if coach: existing["coach"] = coach
        else:
            current_data["students"].append({
                "id": gen_id(), "name": name, "phone": phone,
                "birth_date": f"{datetime.now().year - 10}-01-01",
                "level": level, "coach": coach, "status": status,
                "note": "", "purchased_hours": purchased,
                "bonus_hours": bonus, "remaining_hours": remaining,
                "register_date": datetime.now().strftime("%Y-%m-%d")
            })
        imported += 1
    save_data(current_data)
    return jsonify({"imported": imported})

# ==================== API: 报课 ====================

@app.route('/api/packages', methods=['GET'])
def get_packages():
    return jsonify(COURSE_PACKAGES)

@app.route('/api/enroll', methods=['POST'])
def enroll():
    req = request.json
    student_id = req.get("student_id")
    package_id = req.get("package_id")
    hours = req.get("hours", 0)

    pkg = None
    for p in COURSE_PACKAGES:
        if p["id"] == package_id:
            pkg = p
            break
    if not pkg:
        return jsonify({"error": "课程包不存在"}), 404

    current_data = read_data()
    student = None
    for s in current_data["students"]:
        if s["id"] == student_id:
            student = s
            break
    if not student:
        return jsonify({"error": "学员不存在"}), 404

    if pkg["type"] == "per_hour":
        if hours <= 0:
            return jsonify({"error": "请输入有效节数"}), 400
        price = hours * pkg["price_per_hour"]
        total_hours = hours
    else:
        total_hours = pkg["hours"]
        price = pkg["price"]

    student["purchased_hours"] = student.get("purchased_hours", 0) + total_hours
    student["remaining_hours"] = student.get("remaining_hours", 0) + total_hours

    if "enrollments" not in current_data:
        current_data["enrollments"] = []
    enrollment_id = gen_id()
    current_data["enrollments"].append({
        "id": enrollment_id,
        "student_id": student_id,
        "student_name": student["name"],
        "package_id": package_id,
        "package_name": pkg["name"],
        "hours": total_hours,
        "price": price,
        "date": datetime.now().strftime("%Y-%m-%d")
    })
    save_data(current_data)
    return jsonify({"success": True, "hours": total_hours, "price": price})

@app.route('/api/enrollments', methods=['GET'])
def get_enrollments():
    current_data = read_data()
    enrollments = current_data.get("enrollments", [])
    updated = False
    for e in enrollments:
        if "id" not in e:
            e["id"] = gen_id()
            updated = True
    if updated:
        save_data(current_data)
    return jsonify(enrollments)

@app.route('/api/enrollments', methods=['POST'])
def add_enrollment_record():
    """添加课程包记录（不修改学员课时，用于给已有学员补充课程包信息）"""
    req = request.json
    current_data = read_data()
    enrollment = {
        "id": gen_id(),
        "student_id": req.get("student_id", ""),
        "student_name": req.get("student_name", ""),
        "package_id": req.get("package_id", ""),
        "package_name": req.get("package_name", ""),
        "hours": float(req.get("hours", 0)),
        "price": float(req.get("price", 0)),
        "date": req.get("date", datetime.now().strftime("%Y-%m-%d"))
    }
    if "enrollments" not in current_data:
        current_data["enrollments"] = []
    current_data["enrollments"].append(enrollment)
    save_data(current_data)
    return jsonify(enrollment), 201

@app.route('/api/enrollments/<enrollment_id>', methods=['PUT'])
def update_enrollment(enrollment_id):
    updates = request.json
    current_data = read_data()
    enrollments = current_data.get("enrollments", [])
    for i, e in enumerate(enrollments):
        if e.get("id") == enrollment_id:
            old_hours = float(e.get("hours", 0))
            new_hours = float(updates.get("hours", old_hours))
            diff = new_hours - old_hours
            # 同步更新学员的 purchased_hours 和 remaining_hours
            student_id = e.get("student_id")
            if diff != 0:
                for s in current_data["students"]:
                    if s["id"] == student_id:
                        s["purchased_hours"] = max(0, s.get("purchased_hours", 0) + diff)
                        s["remaining_hours"] = max(0, s.get("remaining_hours", 0) + diff)
                        break
            enrollments[i].update(updates)
            save_data(current_data)
            return jsonify(enrollments[i])
    return jsonify({"error": "课程包记录不存在"}), 404

@app.route('/api/enrollments/<enrollment_id>', methods=['DELETE'])
def delete_enrollment(enrollment_id):
    current_data = read_data()
    enrollments = current_data.get("enrollments", [])
    target = None
    for e in enrollments:
        if e.get("id") == enrollment_id:
            target = e
            break
    if target:
        hours = float(target.get("hours", 0))
        student_id = target.get("student_id")
        for s in current_data["students"]:
            if s["id"] == student_id:
                s["purchased_hours"] = max(0, s.get("purchased_hours", 0) - hours)
                s["remaining_hours"] = max(0, s.get("remaining_hours", 0) - hours)
                break
        current_data["enrollments"] = [e for e in enrollments if e.get("id") != enrollment_id]
        save_data(current_data)
        return jsonify({"deleted": 1})
    return jsonify({"error": "课程包记录不存在"}), 404

# ==================== API: 排课 ====================

@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    current_data = read_data()
    day = request.args.get('day')
    if day:
        return jsonify([s for s in current_data["schedules"] if s.get("week_day") == day])
    return jsonify(current_data["schedules"])

@app.route('/api/schedules', methods=['POST'])
def add_schedule():
    s = request.json
    schedule = {
        "id": gen_id(),
        "student_id": s.get("student_id", ""),
        "week_day": s.get("week_day", ""),
        "time_slot": s.get("time_slot", ""),
        "coach": s.get("coach", ""),
        "course_id": s.get("course_id", "")
    }
    current_data = read_data()
    current_data["schedules"].append(schedule)
    save_data(current_data)
    return jsonify(schedule), 201

@app.route('/api/schedules/<schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    updates = request.json
    current_data = read_data()
    for i, s in enumerate(current_data["schedules"]):
        if s["id"] == schedule_id:
            current_data["schedules"][i].update(updates)
            save_data(current_data)
            return jsonify(current_data["schedules"][i])
    return jsonify({"error": "排课不存在"}), 404

@app.route('/api/schedules/import', methods=['POST'])
def import_schedule():
    if 'file' not in request.files:
        return jsonify({"error": "无文件"}), 400
    file = request.files['file']
    content = file.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    imported = 0
    current_data = read_data()
    for row in reader:
        name = row.get('姓名', '').strip()
        day = row.get('星期', '').strip()
        slot = row.get('时间段', '').strip()
        coach = row.get('教练', '').strip()
        if not name or not day or not slot:
            continue
        student = None
        for s in current_data["students"]:
            if s.get("name") == name:
                student = s
                break
        if not student:
            student = {
                "id": gen_id(), "name": name, "phone": "",
                "birth_date": f"{datetime.now().year - 10}-01-01",
                "level": "初级", "coach": coach, "status": "active",
                "note": "", "purchased_hours": 0, "bonus_hours": 0,
                "remaining_hours": 0, "register_date": datetime.now().strftime("%Y-%m-%d")
            }
            current_data["students"].append(student)
        exists = any(
            s.get("student_id") == student["id"] and
            s.get("week_day") == day and
            s.get("time_slot") == slot
            for s in current_data["schedules"]
        )
        if not exists:
            current_data["schedules"].append({
                "id": gen_id(), "student_id": student["id"],
                "week_day": day, "time_slot": slot, "coach": coach, "course_id": ""
            })
            imported += 1
    save_data(current_data)
    return jsonify({"imported": imported})

@app.route('/api/schedules/clear', methods=['POST'])
def clear_schedules():
    current_data = read_data()
    current_data["schedules"] = []
    save_data(current_data)
    return jsonify({"success": True})

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    current_data = read_data()
    current_data["schedules"] = [s for s in current_data["schedules"] if s["id"] != schedule_id]
    save_data(current_data)
    return jsonify({"success": True})

# ==================== API: 消课 ====================

@app.route('/api/attendance', methods=['POST'])
def add_attendance():
    current_data = read_data()
    req = request.json
    student_id = req.get("student_id")
    hours_used = float(req.get("hours_used", 1))
    date = req.get("date", datetime.now().strftime("%Y-%m-%d"))
    time_slot = req.get("time_slot", "")
    coach = req.get("coach", "")
    status = req.get("status", "present")
    reason = req.get("reason", "")
    week_day = req.get("week_day", "")

    student_name = ""
    owner_id = student_id
    for s in current_data["students"]:
        if s["id"] == student_id:
            if s.get("group_owner"):
                owner_id = s["group_owner"]
            student_name = s.get("name", "")
            if not coach:
                coach = s.get("coach", "")
            break

    if status == "present":
        for s in current_data["students"]:
            if s["id"] == owner_id:
                s["remaining_hours"] = max(0, s.get("remaining_hours", 0) - hours_used)
                break

    attendance = {
        "id": gen_id(),
        "student_id": student_id,
        "student_name": student_name,
        "date": date,
        "week_day": week_day,
        "hours_used": hours_used if status == "present" else 0,
        "time_slot": time_slot,
        "coach": coach,
        "status": status,
        "reason": reason
    }
    current_data["attendances"].append(attendance)
    save_data(current_data)
    return jsonify(attendance), 201

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    return jsonify(read_data().get("attendances", []))

@app.route('/api/attendance_by_date', methods=['GET'])
def get_attendance_by_date():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({"error": "缺少 date 参数"}), 400
    current_data = read_data()
    attendances = current_data.get("attendances", [])
    result = {"date": date_str, "coaches": {}}
    for a in attendances:
        if a.get("date") != date_str:
            continue
        coach = a.get("coach", "未分配")
        if coach not in result["coaches"]:
            result["coaches"][coach] = []
        result["coaches"][coach].append({
            "student_id": a.get("student_id", ""),
            "student_name": a.get("student_name", ""),
            "time_slot": a.get("time_slot", ""),
            "status": a.get("status", "")
        })
    return jsonify(result)

@app.route('/api/attendance/<attendance_id>', methods=['DELETE'])
def delete_attendance(attendance_id):
    current_data = read_data()
    record = None
    for a in current_data["attendances"]:
        if a["id"] == attendance_id:
            record = a
            break
    if record and record.get("status") == "present":
        student_id = record.get("student_id")
        hours_used = float(record.get("hours_used", 1))
        for s in current_data["students"]:
            if s["id"] == student_id:
                s["remaining_hours"] = s.get("remaining_hours", 0) + hours_used
                break
    current_data["attendances"] = [a for a in current_data["attendances"] if a["id"] != attendance_id]
    save_data(current_data)
    return jsonify({"deleted": 1})

@app.route('/api/all_attendance_records', methods=['GET'])
def get_all_attendance_records():
    return jsonify(read_data().get("attendances", []))

@app.route('/api/attendance_today', methods=['GET'])
def get_attendance_today():
    current_data = read_data()
    date_str = request.args.get('date')
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    todays = [a for a in current_data.get("attendances", []) if a.get("date") == date_str and a.get("status") == "present"]
    seen = set()
    attendees = []
    for a in todays:
        sid = a.get("student_id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        attendees.append({
            "student_id": sid,
            "name": a.get("student_name") or "",
            "time_slot": a.get("time_slot") or "",
            "coach": a.get("coach") or ""
        })
    return jsonify({"date": date_str, "total": len(attendees), "attendees": attendees})

@app.route('/api/attendance_today_all', methods=['GET'])
def get_attendance_today_all():
    current_data = read_data()
    date_str = request.args.get('date')
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    todays = [a for a in current_data.get("attendances", []) if a.get("date") == date_str]
    result = []
    seen = set()
    for a in todays:
        sid = a.get("student_id") or ""
        key = sid + "_" + a.get("status", "")
        if key in seen:
            continue
        seen.add(key)
        result.append({
            "student_id": sid,
            "name": a.get("student_name") or "",
            "time_slot": a.get("time_slot") or "",
            "coach": a.get("coach") or "",
            "status": a.get("status", ""),
            "reason": a.get("reason") or "",
            "date": date_str
        })
    return jsonify({"date": date_str, "records": result})

# ==================== API: 统计 ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    current_data = read_data()
    total_hours = 0
    remaining_hours = 0
    for s in current_data["students"]:
        total_hours += s.get("purchased_hours", 0) + s.get("bonus_hours", 0)
        remaining_hours += s.get("remaining_hours", 0)

    # 金额维度存销比
    enrollments = current_data.get("enrollments", [])
    student_enrollments = {}
    for e in enrollments:
        sid = e.get("student_id")
        if sid not in student_enrollments:
            student_enrollments[sid] = []
        student_enrollments[sid].append(e)
    total_amount = 0.0
    consumed_amount = 0.0
    coach_amount_stats = {}
    for s in current_data["students"]:
        sid = s.get("id")
        packages = student_enrollments.get(sid, [])
        pkg_total_hours = sum(e.get("hours", 0) for e in packages)
        pkg_total_price = sum(e.get("price", 0) for e in packages)
        avg_price = pkg_total_price / pkg_total_hours if pkg_total_hours > 0 else 0
        stu_total_hours = s.get("purchased_hours", 0) + s.get("bonus_hours", 0)
        stu_consumed = max(0, stu_total_hours - s.get("remaining_hours", 0))
        if avg_price > 0 and stu_total_hours > 0:
            stu_consumed_amount = stu_consumed * avg_price
            stu_total_amount = stu_total_hours * avg_price
            total_amount += stu_total_amount
            consumed_amount += stu_consumed_amount
            coach = s.get("coach", "未分配")
            if coach not in coach_amount_stats:
                coach_amount_stats[coach] = {"total": 0, "consumed": 0, "hours_total": 0, "hours_consumed": 0}
            coach_amount_stats[coach]["total"] += stu_total_amount
            coach_amount_stats[coach]["consumed"] += stu_consumed_amount
            coach_amount_stats[coach]["hours_total"] += stu_total_hours
            coach_amount_stats[coach]["hours_consumed"] += stu_consumed
    consumption_amount_rate = round(consumed_amount / total_amount * 100, 2) if total_amount > 0 else 0
    for coach, amt in coach_amount_stats.items():
        coach_amount_stats[coach] = {
            "total_amount": round(amt["total"], 2),
            "consumed_amount": round(amt["consumed"], 2),
            "rate": round(amt["consumed"] / amt["total"] * 100, 1) if amt["total"] > 0 else 0,
            "hours_total": amt["hours_total"],
            "hours_consumed": amt["hours_consumed"]
        }

    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - __import__('datetime').timedelta(days=7)).strftime("%Y-%m-%d")
    attendances = current_data.get("attendances", [])
    last_week = [a for a in attendances if a.get("date", "") >= week_ago and a.get("date", "") <= today]
    attended = len([a for a in last_week if a.get("status") == "present"])
    leave_days = len([a for a in last_week if a.get("status") == "leave"])
    scheduled = attended + leave_days
    attendance_rate = round(attended / scheduled * 100, 1) if scheduled > 0 else 0

    coach_stats = {}
    for coach in current_data.get("settings", {}).get("coaches", ["王教练", "陈教练", "孙教练"]):
        coach_last_week = [a for a in last_week if a.get("coach") == coach]
        coach_attended = len([a for a in coach_last_week if a.get("status") == "present"])
        coach_leave = len([a for a in coach_last_week if a.get("status") == "leave"])
        coach_scheduled = coach_attended + coach_leave
        coach_stats[coach] = {
            "scheduled": coach_scheduled,
            "attended": coach_attended,
            "leave": coach_leave,
            "missed": 0,
            "rate": round(coach_attended / coach_scheduled * 100, 1) if coach_scheduled > 0 else 0
        }

    course_stats = {}
    for course in current_data.get("courses", []):
        course_name = course.get("name")
        course_last_week = [a for a in last_week if a.get("course") == course_name]
        course_attended = len([a for a in course_last_week if a.get("status") == "present"])
        course_leave = len([a for a in course_last_week if a.get("status") == "leave"])
        course_scheduled = course_attended + course_leave
        course_stats[course_name] = {
            "scheduled": course_scheduled,
            "attended": course_attended,
            "leave": course_leave,
            "missed": 0,
            "rate": round(course_attended / course_scheduled * 100, 1) if course_scheduled > 0 else 0
        }

    stats = {
        "total_students": len(current_data["students"]),
        "active_students": len([s for s in current_data["students"] if s.get("status") == "active"]),
        "potential_students": len([s for s in current_data["students"] if s.get("status") == "potential"]),
        "total_courses": len(current_data["courses"]),
        "total_hours": total_hours,
        "remaining_hours": remaining_hours,
        "consumption_rate": round((total_hours - remaining_hours) / total_hours * 100, 2) if total_hours > 0 else 0,
        "consumption_amount_rate": consumption_amount_rate,
        "total_purchase_amount": round(total_amount, 2),
        "consumed_amount": round(consumed_amount, 2),
        "coach_amount_stats": coach_amount_stats,
        "attendance_rate": attendance_rate,
        "attended": attended,
        "leave_days": leave_days,
        "missed": 0,
        "scheduled": scheduled,
        "coach_stats": coach_stats,
        "course_stats": course_stats
    }
    return jsonify(stats)

@app.route('/api/daily_coach_stats', methods=['GET'])
def get_daily_coach_stats():
    current_data = read_data()
    attendances = current_data.get('attendances', [])
    schedules = current_data.get('schedules', [])
    students = current_data.get('students', [])
    name_by_id = {s['id']: s.get('name', '') for s in students}
    today = datetime.now().strftime('%Y-%m-%d')
    today_att = [a for a in attendances if a.get('date') == today and a.get('status') == 'present']
    result = {'date': today, 'coaches': {}}
    for att in today_att:
        coach = att.get('coach', '')
        if coach:
            if coach not in result['coaches']:
                result['coaches'][coach] = {'count': 0, 'students': []}
            result['coaches'][coach]['count'] += 1
            sn = att.get('student_name', name_by_id.get(att.get('student_id'), ''))
            if sn and sn not in result['coaches'][coach]['students']:
                result['coaches'][coach]['students'].append(sn)
    return jsonify(result)

@app.route('/api/daily_detail_stats', methods=['GET'])
def get_daily_detail_stats():
    current_data = read_data()
    attendances = current_data.get('attendances', [])
    coaches = current_data.get('settings', {}).get('coaches', ['王教练', '陈教练', '孙教练'])
    day_map = {}
    for att in attendances:
        if att.get('status') != 'present':
            continue
        date_str = att.get('date', '')
        if not date_str or len(date_str) < 7:
            continue
        coach = att.get('coach', '')
        sid = att.get('student_id', '')
        if date_str not in day_map:
            day_map[date_str] = {}
        if coach not in day_map[date_str]:
            day_map[date_str][coach] = {'count': 0, 'students': set()}
        day_map[date_str][coach]['count'] += 1
        if sid:
            day_map[date_str][coach]['students'].add(sid)
    result = []
    for day in sorted(day_map.keys(), reverse=True):
        entry = {'date': day, 'coaches': {}}
        for coach in coaches:
            cdata = day_map[day].get(coach, {'count': 0, 'students': set()})
            entry['coaches'][coach] = {
                'count': cdata['count'],
                'headcount': len(cdata['students'])
            }
        result.append(entry)
    return jsonify(result)

@app.route('/api/monthly_coach_stats', methods=['GET'])
def get_monthly_coach_stats():
    current_data = read_data()
    attendances = current_data.get('attendances', [])
    month_data = {}
    for att in attendances:
        if att.get('status') != 'present':
            continue
        date_str = att.get('date', '')
        if not date_str or len(date_str) < 7:
            continue
        month_key = date_str[:7]
        day_key = date_str[:10]
        coach = att.get('coach', '')
        if month_key not in month_data:
            month_data[month_key] = {}
        if day_key not in month_data[month_key]:
            month_data[month_key][day_key] = {}
        if coach not in month_data[month_key][day_key]:
            month_data[month_key][day_key][coach] = 0
        month_data[month_key][day_key][coach] += 1
    result = sorted(month_data.items(), reverse=True)
    return jsonify(result)

@app.route('/api/stats_by_coach', methods=['GET'])
def get_stats_by_coach():
    days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日']
    current_data = read_data()
    name_by_id = {s['id']: s.get('name', '') for s in current_data.get('students', [])}
    result = {}
    schedules = current_data.get('schedules', [])
    for day in days:
        day_map = {}
        for sc in schedules:
            if sc.get('week_day') != day:
                continue
            coach = sc.get('coach', '')
            sid = sc.get('student_id')
            name = name_by_id.get(sid, '')
            if coach not in day_map:
                day_map[coach] = {'count': 0, 'students': []}
            day_map[coach]['count'] += 1
            if name and name not in day_map[coach]['students']:
                day_map[coach]['students'].append(name)
        result[day] = day_map
    return jsonify(result)

@app.route('/api/stats_monthly', methods=['GET'])
def get_stats_monthly():
    current_data = read_data()
    attendances = [a for a in current_data.get("attendances", []) if a.get("status") == "present"]
    months = ["04月", "03月", "02月", "01月", "12月", "11月"]
    wang_counts = []; chen_counts = []; sun_counts = []; total_counts = []
    for m in months:
        w = len([a for a in attendances if a.get("coach") == "王教练" and m in a.get("date", "")])
        c = len([a for a in attendances if a.get("coach") == "陈教练" and m in a.get("date", "")])
        s = len([a for a in attendances if a.get("coach") == "孙教练" and m in a.get("date", "")])
        wang_counts.append(w); chen_counts.append(c); sun_counts.append(s); total_counts.append(w + c + s)
    return jsonify({"months": months, "wang": wang_counts, "chen": chen_counts, "sun": sun_counts, "total": total_counts})

@app.route('/api/cleanup-attendance', methods=['POST'])
def api_cleanup_attendance():
    current_data = read_data()
    cutoff_date = (datetime.now() - __import__('datetime').timedelta(days=90)).strftime("%Y-%m-%d")
    old_count = len(current_data["attendances"])
    current_data["attendances"] = [a for a in current_data["attendances"] if a.get("date", "") > cutoff_date]
    new_count = len(current_data["attendances"])
    if old_count > new_count:
        save_data(current_data)
    return jsonify({"old": old_count, "new": new_count, "cutoff": cutoff_date})

# ==================== API: 设置 ====================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(read_data().get("settings", {}))

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    current_data = read_data()
    current_data["settings"].update(request.json)
    save_data(current_data)
    return jsonify(current_data["settings"])

@app.route('/api/sync-coach-from-schedule', methods=['POST'])
def sync_coach_from_schedule():
    current_data = read_data()
    students = current_data.get("students", [])
    schedules = current_data.get("schedules", [])
    updated = 0
    for s in students:
        sid = s.get("id", "")
        if not sid:
            continue
        student_schedules = [sc for sc in schedules if sc.get("student_id") == sid]
        if not student_schedules:
            continue
        schedule_coach = student_schedules[0].get("coach", "")
        if schedule_coach and not s.get("coach"):
            s["coach"] = schedule_coach
            updated += 1
        elif schedule_coach and s.get("coach") != schedule_coach:
            s["coach"] = schedule_coach
            updated += 1
    save_data(current_data)
    return jsonify({"updated": updated})

# ==================== API: 请假管理 ====================

@app.route('/api/leaves', methods=['GET'])
def get_leaves():
    return jsonify(read_data().get("leaves", []))

@app.route('/api/leaves', methods=['POST'])
def add_leave():
    req = request.json
    leave = {
        "id": gen_id(),
        "student_id": req.get("student_id", ""),
        "student_name": req.get("student_name", ""),
        "leave_date": req.get("leave_date", ""),
        "week_day": req.get("week_day", ""),
        "time_slot": req.get("time_slot", ""),
        "reason": req.get("reason", ""),
        "status": "pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    current_data = read_data()
    if "leaves" not in current_data:
        current_data["leaves"] = []
    current_data["leaves"].append(leave)
    save_data(current_data)
    return jsonify(leave), 201

@app.route('/api/leaves/<leave_id>', methods=['PUT'])
def update_leave(leave_id):
    current_data = read_data()
    for i, l in enumerate(current_data.get("leaves", [])):
        if l["id"] == leave_id:
            current_data["leaves"][i].update(request.json)
            save_data(current_data)
            return jsonify(current_data["leaves"][i])
    return jsonify({"error": "请假记录不存在"}), 404

@app.route('/api/leaves/<leave_id>', methods=['DELETE'])
def delete_leave(leave_id):
    current_data = read_data()
    current_data["leaves"] = [l for l in current_data.get("leaves", []) if l["id"] != leave_id]
    save_data(current_data)
    return jsonify({"success": True})

# ==================== API: 旷课记录 ====================

@app.route('/api/absences', methods=['GET'])
def get_absences():
    return jsonify(read_data().get("absences", []))

@app.route('/api/absences', methods=['POST'])
def add_absence():
    req = request.json
    absence = {
        "id": gen_id(),
        "student_id": req.get("student_id", ""),
        "student_name": req.get("student_name", ""),
        "absence_date": req.get("absence_date", ""),
        "week_day": req.get("week_day", ""),
        "time_slot": req.get("time_slot", ""),
        "coach": req.get("coach", ""),
        "reason": req.get("reason", ""),
        "status": "recorded",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    current_data = read_data()
    if "absences" not in current_data:
        current_data["absences"] = []
    current_data["absences"].append(absence)
    save_data(current_data)
    return jsonify(absence), 201

@app.route('/api/absences/<absence_id>', methods=['DELETE'])
def delete_absence(absence_id):
    current_data = read_data()
    current_data["absences"] = [a for a in current_data.get("absences", []) if a["id"] != absence_id]
    save_data(current_data)
    return jsonify({"success": True})

# ==================== API: 临时插班生 ====================

@app.route('/api/temp-students', methods=['GET'])
def get_temp_students():
    return jsonify(read_data().get("temp_students", []))

@app.route('/api/temp-students', methods=['POST'])
def add_temp_student():
    req = request.json
    temp = {
        "id": gen_id(),
        "name": req.get("name", ""),
        "phone": req.get("phone", ""),
        "level": req.get("level", "初级"),
        "coach": req.get("coach", ""),
        "course_date": req.get("course_date", ""),
        "week_day": req.get("week_day", ""),
        "time_slot": req.get("time_slot", ""),
        "hours_remaining": float(req.get("hours_remaining", 1)),
        "note": req.get("note", ""),
        "status": "active",
        "created_at": datetime.now().strftime("%Y-%m-%d")
    }
    current_data = read_data()
    if "temp_students" not in current_data:
        current_data["temp_students"] = []
    current_data["temp_students"].append(temp)
    save_data(current_data)
    return jsonify(temp), 201

@app.route('/api/temp-students/<temp_id>', methods=['PUT'])
def update_temp_student(temp_id):
    current_data = read_data()
    for i, t in enumerate(current_data.get("temp_students", [])):
        if t["id"] == temp_id:
            current_data["temp_students"][i].update(request.json)
            save_data(current_data)
            return jsonify(current_data["temp_students"][i])
    return jsonify({"error": "插班生不存在"}), 404

@app.route('/api/temp-students/<temp_id>', methods=['DELETE'])
def delete_temp_student(temp_id):
    current_data = read_data()
    current_data["temp_students"] = [t for t in current_data.get("temp_students", []) if t["id"] != temp_id]
    save_data(current_data)
    return jsonify({"success": True})

@app.route('/api/temp-students/<temp_id>/consume', methods=['POST'])
def consume_temp_student():
    req = request.json
    hours = float(req.get("hours", 1))
    current_data = read_data()
    for i, t in enumerate(current_data.get("temp_students", [])):
        if t["id"] == req.get("temp_id"):
            current_data["temp_students"][i]["hours_remaining"] = max(0, t.get("hours_remaining", 0) - hours)
            save_data(current_data)
            return jsonify(current_data["temp_students"][i])
    return jsonify({"error": "插班生不存在"}), 404

# ==================== 启动 ====================

if __name__ == '__main__':
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("🐏的教务 Web版（优化版）")
    print("访问地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
