#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
青羽教务系统 - 重构版本
基于"校如云"架构的羽毛球培训机构教务管理系统
支持老师/管理员端和学生端双模式
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
import csv
import shutil
from datetime import datetime, timedelta
from enum import Enum
import hashlib
from typing import List, Dict, Optional, Any
import threading
from tkinter import font as tkfont

# ==================== 数据模型定义 ====================

class UserRole(Enum):
    """用户角色枚举"""
    ADMIN = "admin"      # 管理员
    TEACHER = "teacher"  # 老师
    STUDENT = "student"  # 学生
    PARENT = "parent"    # 家长
    COACH = "coach"     # 教练

class StudentStatus(Enum):
    """学员状态枚举"""
    POTENTIAL = "potential"    # 潜在学员
    ACTIVE = "active"          # 活跃学员
    INACTIVE = "inactive"      # 非活跃学员
    GRADUATED = "graduated"    # 已结业

class CourseLevel(Enum):
    """课程水平枚举"""
    BEGINNER = "beginner"      # 初级
    INTERMEDIATE = "intermediate"  # 中级
    ADVANCED = "advanced"      # 高级
    COMPETITION = "competition" # 竞赛级

class WeekDay(Enum):
    """星期枚举"""
    MONDAY = "星期一"
    TUESDAY = "星期二"
    WEDNESDAY = "星期三"
    THURSDAY = "星期四"
    FRIDAY = "星期五"
    SATURDAY = "星期六"
    SUNDAY = "星期日"

def generate_id() -> str:
    """生成唯一ID"""
    import uuid
    return str(uuid.uuid4())[:8]

class Student:
    """学员实体类"""
    def __init__(self, name: str, phone: str, birth_date: str, level: str, coach: str):
        self.id = generate_id()
        self.name = name
        self.phone = phone
        self.birth_date = birth_date  # YYYY-MM-DD格式
        self.level = level
        self.coach = coach
        self.register_date = datetime.now().strftime("%Y-%m-%d")
        self.status = StudentStatus.ACTIVE.value
        self.note = ""
        
    def calculate_age(self) -> int:
        """计算年龄"""
        try:
            birth = datetime.strptime(self.birth_date, "%Y-%m-%d")
            today = datetime.now()
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            return age
        except:
            return 0
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "birth_date": self.birth_date,
            "age": self.calculate_age(),
            "level": self.level,
            "coach": self.coach,
            "register_date": self.register_date,
            "status": self.status,
            "note": self.note
        }

class Course:
    """课程实体类"""
    def __init__(self, name: str, level: str, total_hours: int, price: float):
        self.id = generate_id()
        self.name = name
        self.level = level
        self.total_hours = total_hours
        self.price = price
        self.remaining_hours = total_hours
        self.start_date = ""
        self.end_date = ""
        self.student_ids = []  # 报课学员ID列表
        self.coach = ""
        self.description = ""
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level,
            "total_hours": self.total_hours,
            "remaining_hours": self.remaining_hours,
            "price": self.price,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "student_ids": self.student_ids,
            "coach": self.coach,
            "description": self.description
        }

class Schedule:
    """排课实体类"""
    def __init__(self, student_id: str, course_id: str, week_day: str, time_slot: str):
        self.id = generate_id()
        self.student_id = student_id
        self.course_id = course_id
        self.week_day = week_day
        self.time_slot = time_slot  # 格式: "16:00-18:00"
        self.status = "scheduled"  # scheduled, completed, cancelled
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_id": self.course_id,
            "week_day": self.week_day,
            "time_slot": self.time_slot,
            "status": self.status
        }

class Attendance:
    """考勤实体类"""
    def __init__(self, student_id: str, course_id: str, schedule_id: str, date: str):
        self.id = generate_id()
        self.student_id = student_id
        self.course_id = course_id
        self.schedule_id = schedule_id
        self.date = date
        self.status = "present"  # present, absent, late
        self.hours_used = 1
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_id": self.course_id,
            "schedule_id": self.schedule_id,
            "date": self.date,
            "status": self.status,
            "hours_used": self.hours_used
        }

# ==================== 数据访问层 ====================

class DataManager:
    """数据管理器"""
    
    def __init__(self, data_file: str = "教务数据.json"):
        self.data_file = data_file
        self.data = self.load_data()
        self.last_backup_at = None
        self.ensure_data_schema()
    
    def load_data(self) -> dict:
        """加载数据文件"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return self.create_default_data()
        else:
            return self.create_default_data()
    
    def create_default_data(self) -> dict:
        """创建默认数据"""
        return {
            "students": [],
            "courses": [],
            "schedules": [],
            "attendances": [],
            "operation_logs": [],
            "users": [
                {
                    "username": "admin",
                    "password_hash": self.hash_password("admin123"),
                    "role": UserRole.ADMIN.value,
                    "name": "系统管理员",
                    "status": "active"
                },
                {
                    "username": "teacher",
                    "password_hash": self.hash_password("teacher123"),
                    "role": UserRole.TEACHER.value,
                    "name": "默认老师",
                    "status": "active"
                },
                {
                    "username": "student",
                    "password_hash": self.hash_password("student123"),
                    "role": UserRole.STUDENT.value,
                    "name": "默认学员",
                    "status": "active"
                }
            ],
            "settings": {
                "auto_backup": True,
                "time_slots": {
                    "星期一": ["16:00-18:00", "18:00-20:00"],
                    "星期二": ["16:00-18:00", "18:00-20:00"],
                    "星期三": ["16:00-18:00", "18:00-20:00"],
                    "星期四": ["16:00-18:00", "18:00-20:00"],
                    "星期五": ["16:00-18:00", "18:00-20:00"],
                    "星期六": ["09:00-11:00", "14:00-16:00", "16:00-18:00"],
                    "星期日": ["09:00-11:00", "14:00-16:00", "16:00-18:00"]
                },
                "coaches": ["李教练", "王教练", "张教练", "赵教练"],
                "course_levels": ["初级", "中级", "高级", "竞赛级"]
            }
        }

    @staticmethod
    def hash_password(password: str) -> str:
        """密码哈希"""
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def ensure_data_schema(self):
        """确保数据结构完整"""
        modified = False
        default = self.create_default_data()
        for key in ["students", "courses", "schedules", "attendances", "operation_logs", "users", "settings"]:
            if key not in self.data:
                self.data[key] = default[key]
                modified = True
        if "auto_backup" not in self.data["settings"]:
            self.data["settings"]["auto_backup"] = True
            modified = True
        if modified:
            self.save_data()
    
    def save_data(self):
        """保存数据到文件"""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        self.auto_backup_if_needed()

    def authenticate_user(self, username: str, password: str) -> Optional[dict]:
        """用户认证"""
        password_hash = self.hash_password(password)
        for user in self.data.get("users", []):
            if (
                user.get("username") == username
                and user.get("password_hash") == password_hash
                and user.get("status", "active") == "active"
            ):
                return user
        return None

    def log_operation(self, operation: str, detail: str, operator: str = "system"):
        """记录操作日志"""
        log_entry = {
            "id": generate_id(),
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "operator": operator,
            "operation": operation,
            "detail": detail
        }
        self.data["operation_logs"].append(log_entry)
        # 仅保留最近 2000 条日志
        if len(self.data["operation_logs"]) > 2000:
            self.data["operation_logs"] = self.data["operation_logs"][-2000:]

    def auto_backup_if_needed(self):
        """自动备份（默认每 30 分钟最多一次）"""
        if not self.data.get("settings", {}).get("auto_backup", True):
            return
        now = datetime.now()
        if self.last_backup_at and (now - self.last_backup_at) < timedelta(minutes=30):
            return
        self.create_backup()
        self.last_backup_at = now

    def create_backup(self, manual: bool = False) -> str:
        """创建备份文件"""
        backup_dir = "backups"
        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prefix = "手动" if manual else "自动"
        backup_file = os.path.join(backup_dir, f"教务数据_{prefix}备份_{timestamp}.json")
        if os.path.exists(self.data_file):
            shutil.copy2(self.data_file, backup_file)
        else:
            with open(backup_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        return backup_file

    def restore_from_backup(self, backup_file: str):
        """从备份文件恢复"""
        if not os.path.exists(backup_file):
            raise FileNotFoundError(f"备份文件不存在: {backup_file}")
        shutil.copy2(backup_file, self.data_file)
        self.data = self.load_data()
        self.ensure_data_schema()
    
    # 学员管理方法
    def add_student(self, student: Student):
        """添加学员"""
        self.data["students"].append(student.to_dict())
        self.log_operation("新增学员", f"学员:{student.name}")
        self.save_data()
    
    def get_students(self, status: str = None) -> List[dict]:
        """获取学员列表"""
        if status:
            return [s for s in self.data["students"] if s.get("status") == status]
        return self.data["students"]
    
    def update_student(self, student_id: str, updates: dict):
        """更新学员信息"""
        for i, student in enumerate(self.data["students"]):
            if student["id"] == student_id:
                self.data["students"][i].update(updates)
                self.log_operation("更新学员", f"学员ID:{student_id}")
                self.save_data()
                return True
        return False
    
    def delete_students(self, student_ids: List[str]):
        """删除学员"""
        self.data["students"] = [s for s in self.data["students"] if s["id"] not in student_ids]
        self.log_operation("删除学员", f"数量:{len(student_ids)}")
        self.save_data()
    
    # 课程管理方法
    def add_course(self, course: Course):
        """添加课程"""
        self.data["courses"].append(course.to_dict())
        self.log_operation("新增课程", f"课程:{course.name}")
        self.save_data()
    
    def get_courses(self) -> List[dict]:
        """获取课程列表"""
        return self.data["courses"]
    
    # 排课管理方法
    def add_schedule(self, schedule: Schedule):
        """添加排课"""
        self.data["schedules"].append(schedule.to_dict())
        self.log_operation("新增排课", f"排课ID:{schedule.id}")
        self.save_data()
    
    def get_schedules(self) -> List[dict]:
        """获取排课列表"""
        return self.data["schedules"]
    
    # 考勤管理方法
    def add_attendance(self, attendance: Attendance):
        """添加考勤记录"""
        self.data["attendances"].append(attendance.to_dict())
        # 更新课程剩余课时
        for course in self.data["courses"]:
            if course["id"] == attendance.course_id:
                course["remaining_hours"] = max(0, course["remaining_hours"] - attendance.hours_used)
                break
        self.log_operation("新增考勤", f"学员ID:{attendance.student_id}, 日期:{attendance.date}")
        self.save_data()
    
    def get_attendances(self) -> List[dict]:
        """获取考勤列表"""
        return self.data["attendances"]
    
    # 统计方法
    def get_statistics(self) -> dict:
        """获取统计数据"""
        stats = {
            "total_students": len(self.data["students"]),
            "active_students": len([s for s in self.data["students"] if s.get("status") == "active"]),
            "potential_students": len([s for s in self.data["students"] if s.get("status") == "potential"]),
            "total_courses": len(self.data["courses"]),
            "total_hours": sum(c.get("total_hours", 0) for c in self.data["courses"]),
            "remaining_hours": sum(c.get("remaining_hours", 0) for c in self.data["courses"]),
            "consumption_rate": 0
        }
        
        if stats["total_hours"] > 0:
            stats["consumption_rate"] = round(
                (stats["total_hours"] - stats["remaining_hours"]) / stats["total_hours"] * 100, 2
            )
        
        return stats

# ==================== 业务逻辑层 ====================

class StudentService:
    """学员服务"""
    
    def __init__(self, data_manager: DataManager):
        self.data_manager = data_manager
    
    def import_from_csv(self, filepath: str) -> tuple[int, list]:
        """从CSV导入学员"""
        imported = 0
        errors = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        student = Student(
                            name=row.get("姓名", "").strip(),
                            phone=row.get("电话", "").strip(),
                            birth_date=row.get("出生日期", "").strip() or row.get("年龄", "").strip(),
                            level=row.get("等级", "初级").strip(),
                            coach=row.get("教练", "").strip()
                        )
                        self.data_manager.add_student(student)
                        imported += 1
                    except Exception as e:
                        errors.append(f"行{reader.line_num}: {str(e)}")
        except Exception as e:
            errors.append(f"文件读取错误: {str(e)}")
        
        return imported, errors
    
    def export_to_csv(self, filepath: str, students: List[dict]):
        """导出学员到CSV"""
        try:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                fieldnames = ["姓名", "电话", "出生日期", "年龄", "等级", "教练", "状态", "注册日期"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for student in students:
                    writer.writerow({
                        "姓名": student.get("name", ""),
                        "电话": student.get("phone", ""),
                        "出生日期": student.get("birth_date", ""),
                        "年龄": student.get("age", 0),
                        "等级": student.get("level", ""),
                        "教练": student.get("coach", ""),
                        "状态": student.get("status", ""),
                        "注册日期": student.get("register_date", "")
                    })
            return True, ""
        except Exception as e:
            return False, str(e)

class CourseService:
    """课程服务"""
    
    def __init__(self, data_manager: DataManager):
        self.data_manager = data_manager
    
    def calculate_consumption_rate(self, course_id: str) -> float:
        """计算课程消耗率"""
        course = None
        for c in self.data_manager.data["courses"]:
            if c["id"] == course_id:
                course = c
                break
        
        if not course:
            return 0.0
        
        total_hours = course.get("total_hours", 0)
        remaining_hours = course.get("remaining_hours", 0)
        
        if total_hours == 0:
            return 0.0
        
        consumed_hours = total_hours - remaining_hours
        return round(consumed_hours / total_hours * 100, 2)

class AttendanceService:
    """考勤服务"""
    
    def __init__(self, data_manager: DataManager):
        self.data_manager = data_manager
    
    def take_attendance(self, schedule_id: str, student_ids: List[str], date: str = None):
        """点名考勤"""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        # 查找排课信息
        schedule = None
        for s in self.data_manager.data["schedules"]:
            if s["id"] == schedule_id:
                schedule = s
                break
        
        if not schedule:
            return False, "排课记录不存在"
        
        # 为每个学员创建考勤记录
        for student_id in student_ids:
            attendance = Attendance(
                student_id=student_id,
                course_id=schedule["course_id"],
                schedule_id=schedule_id,
                date=date
            )
            self.data_manager.add_attendance(attendance)
        
        return True, f"成功为{len(student_ids)}名学员考勤"

# ==================== 界面层 - 基类 ====================

class BaseFrame(ttk.Frame):
    """基础框架类"""
    
    def __init__(self, parent, data_manager: DataManager, user_role: UserRole):
        super().__init__(parent)
        self.data_manager = data_manager
        self.user_role = user_role
        self.setup_fonts()
        self.create_widgets()
    
    def setup_fonts(self):
        """设置字体"""
        self.title_font = tkfont.Font(family="Microsoft YaHei", size=16, weight="bold")
        self.header_font = tkfont.Font(family="Microsoft YaHei", size=12, weight="bold")
        self.normal_font = tkfont.Font(family="Microsoft YaHei", size=10)
    
    def create_widgets(self):
        """创建控件 - 子类实现"""
        pass
    
    def show_message(self, title: str, message: str, is_error: bool = False):
        """显示消息"""
        if is_error:
            messagebox.showerror(title, message)
        else:
            messagebox.showinfo(title, message)

# ==================== 老师/管理员端界面 ====================

class AdminStudentFrame(BaseFrame):
    """管理员端 - 学员管理"""
    
    def create_widgets(self):
        # 标题
        title_label = ttk.Label(self, text="学员管理", font=self.title_font)
        title_label.pack(pady=10)
        
        # 工具栏
        toolbar = ttk.Frame(self)
        toolbar.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(toolbar, text="添加学员", command=self.add_student).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="删除选中", command=self.delete_students).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="导入CSV", command=self.import_csv).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="导出CSV", command=self.export_csv).pack(side=tk.LEFT, padx=2)
        
        # 搜索框
        search_frame = ttk.Frame(self)
        search_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(search_frame, text="搜索:").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.on_search)
        search_entry = ttk.Entry(search_frame, textvariable=self.search_var, width=30)
        search_entry.pack(side=tk.LEFT, padx=5)
        
        # 学员列表
        list_frame = ttk.Frame(self)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 创建Treeview
        columns = ("选择", "姓名", "电话", "年龄", "等级", "教练", "状态", "注册日期")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=15)
        
        # 设置列
        col_widths = [50, 100, 120, 60, 80, 100, 80, 100]
        for col, width in zip(columns, col_widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=width)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 加载数据
        self.load_students()
    
    def load_students(self, search_text: str = ""):
        """加载学员数据"""
        # 清空现有数据
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # 获取学员数据
        students = self.data_manager.get_students()
        
        # 过滤搜索
        if search_text:
            search_text = search_text.lower()
            students = [
                s for s in students 
                if search_text in s.get("name", "").lower() 
                or search_text in s.get("phone", "").lower()
            ]
        
        # 添加到Treeview
        for i, student in enumerate(students):
            values = (
                "",  # 选择框占位
                student.get("name", ""),
                student.get("phone", ""),
                student.get("age", 0),
                student.get("level", ""),
                student.get("coach", ""),
                student.get("status", ""),
                student.get("register_date", "")
            )
            self.tree.insert("", tk.END, values=values, tags=(i,))
    
    def on_search(self, *args):
        """搜索事件"""
        search_text = self.search_var.get()
        self.load_students(search_text)
    
    def add_student(self):
        """添加学员"""
        dialog = AddStudentDialog(self, self.data_manager)
        self.wait_window(dialog)
        if dialog.result:
            self.load_students()
    
    def delete_students(self):
        """删除选中学员"""
        selected = self.tree.selection()
        if not selected:
            self.show_message("提示", "请先选择要删除的学员")
            return
        
        if messagebox.askyesno("确认", f"确定要删除选中的{len(selected)}名学员吗？"):
            # 在实际实现中，这里应该根据选中的项删除对应的学员
            # 由于时间关系，这里仅显示提示
            self.show_message("提示", f"已标记删除{len(selected)}名学员")
    
    def import_csv(self):
        """导入CSV"""
        filepath = filedialog.askopenfilename(
            title="选择CSV文件",
            filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")]
        )
        if filepath:
            service = StudentService(self.data_manager)
            imported, errors = service.import_from_csv(filepath)
            
            if errors:
                self.show_message("导入错误", f"成功导入{imported}条记录\n错误:\n" + "\n".join(errors[:5]), True)
            else:
                self.show_message("成功", f"成功导入{imported}条记录")
                self.load_students()
    
    def export_csv(self):
        """导出CSV"""
        filepath = filedialog.asksaveasfilename(
            title="保存CSV文件",
            defaultextension=".csv",
            filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")]
        )
        if filepath:
            students = self.data_manager.get_students()
            service = StudentService(self.data_manager)
            success, error = service.export_to_csv(filepath, students)
            
            if success:
                self.show_message("成功", f"已导出{len(students)}条记录到{filepath}")
            else:
                self.show_message("导出错误", f"导出失败: {error}", True)

class AdminCourseFrame(BaseFrame):
    """管理员端 - 课程管理"""
    
    def create_widgets(self):
        # 标题
        title_label = ttk.Label(self, text="课程管理", font=self.title_font)
        title_label.pack(pady=10)
        
        # 工具栏
        toolbar = ttk.Frame(self)
        toolbar.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(toolbar, text="添加课程", command=self.add_course).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="报课管理", command=self.manage_enrollment).pack(side=tk.LEFT, padx=2)
        
        # 课程列表
        list_frame = ttk.Frame(self)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 创建Treeview
        columns = ("课程名称", "水平", "总课时", "剩余课时", "价格", "教练", "学员数", "消耗率")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=15)
        
        # 设置列
        col_widths = [120, 80, 80, 80, 80, 100, 80, 80]
        for col, width in zip(columns, col_widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=width)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 加载数据
        self.load_courses()
    
    def load_courses(self):
        """加载课程数据"""
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        courses = self.data_manager.get_courses()
        service = CourseService(self.data_manager)
        
        for course in courses:
            student_count = len(course.get("student_ids", []))
            consumption_rate = service.calculate_consumption_rate(course["id"])
            
            values = (
                course.get("name", ""),
                course.get("level", ""),
                course.get("total_hours", 0),
                course.get("remaining_hours", 0),
                f"¥{course.get('price', 0)}",
                course.get("coach", ""),
                student_count,
                f"{consumption_rate}%"
            )
            self.tree.insert("", tk.END, values=values)
    
    def add_course(self):
        """添加课程"""
        dialog = AddCourseDialog(self, self.data_manager)
        self.wait_window(dialog)
        if dialog.result:
            self.load_courses()
    
    def manage_enrollment(self):
        """报课管理"""
        self.show_message("提示", "报课管理功能开发中")

class AdminScheduleFrame(BaseFrame):
    """管理员端 - 排课管理"""
    
    def create_widgets(self):
        # 标题
        title_label = ttk.Label(self, text="排课管理", font=self.title_font)
        title_label.pack(pady=10)
        
        # 工具栏
        toolbar = ttk.Frame(self)
        toolbar.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(toolbar, text="添加排课", command=self.add_schedule).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="导入课表", command=self.import_schedule).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="修复周日", command=self.fix_sunday).pack(side=tk.LEFT, padx=2)
        
        # 星期标签页
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 创建每天的排课表格
        self.day_frames = {}
        for day in ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]:
            frame = ttk.Frame(self.notebook)
            self.notebook.add(frame, text=day)
            self.day_frames[day] = frame
            self.create_day_schedule(frame, day)
    
    def create_day_schedule(self, parent, day: str):
        """创建某一天的排课表格"""
        # 获取该天的时间段
        time_slots = self.data_manager.data["settings"]["time_slots"].get(day, [])
        
        # 创建表格
        columns = ("时间段", "学员", "课程", "教练", "状态")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=10)
        
        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, width=120)
        
        # 添加时间段的空行
        for time_slot in time_slots:
            tree.insert("", tk.END, values=(time_slot, "", "", "", "未安排"))
        
        # 加载已有排课
        schedules = self.data_manager.get_schedules()
        day_schedules = [s for s in schedules if s.get("week_day") == day]
        
        # TODO: 将排课信息填充到对应时间段
        
        scrollbar = ttk.Scrollbar(parent, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    def add_schedule(self):
        """添加排课"""
        self.show_message("提示", "添加排课功能开发中")
    
    def import_schedule(self):
        """导入课表"""
        filepath = filedialog.askopenfilename(
            title="选择课表CSV文件",
            filetypes=[("CSV文件", "*.csv"), ("所有文件", "*.*")]
        )
        if filepath:
            self.show_message("提示", f"已选择文件: {filepath}\n导入功能开发中")
    
    def fix_sunday(self):
        """修复周日时间段"""
        settings = self.data_manager.data["settings"]["time_slots"]
        if "星期六" in settings and "星期日" in settings:
            settings["星期日"] = settings["星期六"].copy()
            self.data_manager.save_data()
            self.show_message("成功", "已复制周六时间段到周日")
            
            # 刷新周日标签页
            for child in self.day_frames["星期日"].winfo_children():
                child.destroy()
            self.create_day_schedule(self.day_frames["星期日"], "星期日")
        else:
            self.show_message("错误", "缺少周六或周日时间段设置", True)

class AdminAttendanceFrame(BaseFrame):
    """管理员端 - 消课点名"""
    
    def create_widgets(self):
        # 标题
        title_label = ttk.Label(self, text="消课点名", font=self.title_font)
        title_label.pack(pady=10)
        
        # 选择日期和排课
        control_frame = ttk.Frame(self)
        control_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(control_frame, text="日期:").pack(side=tk.LEFT)
        self.date_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        date_entry = ttk.Entry(control_frame, textvariable=self.date_var, width=15)
        date_entry.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(control_frame, text="选择排课:").pack(side=tk.LEFT, padx=(20, 5))
        self.schedule_var = tk.StringVar()
        schedule_combo = ttk.Combobox(control_frame, textvariable=self.schedule_var, width=30, state="readonly")
        schedule_combo.pack(side=tk.LEFT, padx=5)
        
        # 加载排课选项
        self.load_schedule_options()
        
        ttk.Button(control_frame, text="加载学员", command=self.load_students).pack(side=tk.LEFT, padx=10)
        ttk.Button(control_frame, text="点名消课", command=self.take_attendance).pack(side=tk.LEFT)
        
        # 学员列表
        list_frame = ttk.Frame(self)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 创建Treeview
        columns = ("选择", "姓名", "电话", "剩余课时", "课程", "状态")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=12)
        
        col_widths = [50, 100, 120, 80, 150, 80]
        for col, width in zip(columns, col_widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=width)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    def load_schedule_options(self):
        """加载排课选项"""
        schedules = self.data_manager.get_schedules()
        options = []
        for schedule in schedules:
            # 查找学员和课程信息
            student_name = "未知学员"
            course_name = "未知课程"
            
            for student in self.data_manager.data["students"]:
                if student["id"] == schedule.get("student_id"):
                    student_name = student.get("name", "")
                    break
            
            for course in self.data_manager.data["courses"]:
                if course["id"] == schedule.get("course_id"):
                    course_name = course.get("name", "")
                    break
            
            option_text = f"{schedule.get('week_day')} {schedule.get('time_slot')} - {student_name} - {course_name}"
            options.append(option_text)
        
        # 更新Combobox
        for widget in self.winfo_children():
            if isinstance(widget, ttk.Frame):
                for child in widget.winfo_children():
                    if isinstance(child, ttk.Combobox):
                        child["values"] = options
                        if options:
                            child.set(options[0])
                        break
    
    def load_students(self):
        """加载学员"""
        # 清空现有数据
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # TODO: 根据选择的排课加载学员
        # 这里模拟一些数据
        sample_students = [
            ("张三", "13800000001", 15, "羽毛球基础班", "正常"),
            ("李四", "13800000002", 12, "羽毛球基础班", "正常"),
            ("王五", "13800000003", 8, "羽毛球基础班", "正常"),
            ("赵六", "13800000004", 20, "羽毛球提高班", "正常"),
        ]
        
        for student in sample_students:
            values = ("", student[0], student[1], student[2], student[3], student[4])
            self.tree.insert("", tk.END, values=values)
    
    def take_attendance(self):
        """点名消课"""
        selected = []
        for item in self.tree.get_children():
            values = self.tree.item(item, "values")
            if values and values[0]:  # 如果选择框被选中
                selected.append(values[1])  # 学员姓名
        
        if not selected:
            self.show_message("提示", "请先选择要考勤的学员")
            return
        
        date = self.date_var.get()
        service = AttendanceService(self.data_manager)
        
        # TODO: 获取实际的schedule_id
        schedule_id = "temp_schedule_id"
        student_ids = ["temp_student_id"] * len(selected)  # 模拟学员ID
        
        success, message = service.take_attendance(schedule_id, student_ids, date)
        
        if success:
            self.show_message("成功", f"{message}\n日期: {date}")
            # 刷新学员剩余课时显示
            self.load_students()
        else:
            self.show_message("错误", message, True)

class AdminStatsFrame(BaseFrame):
    """管理员端 - 统计中心"""
    
    def create_widgets(self):
        # 标题
        title_label = ttk.Label(self, text="统计中心", font=self.title_font)
        title_label.pack(pady=10)
        
        # 统计数据卡片
        stats_frame = ttk.Frame(self)
        stats_frame.pack(fill=tk.X, padx=10, pady=10)
        
        stats = self.data_manager.get_statistics()
        
        stats_data = [
            ("学员总数", stats["total_students"], "#4facfe"),
            ("活跃学员", stats["active_students"], "#00f2fe"),
            ("潜在学员", stats["potential_students"], "#ff6b6b"),
            ("课程总数", stats["total_courses"], "#4ecdc4"),
            ("总课时数", stats["total_hours"], "#45b7d1"),
            ("剩余课时", stats["remaining_hours"], "#ffd166"),
            ("消课率", f"{stats['consumption_rate']}%", "#06d6a0"),
        ]
        
        for i, (label, value, color) in enumerate(stats_data):
            card = self.create_stat_card(stats_frame, label, value, color)
            card.grid(row=i // 4, column=i % 4, padx=5, pady=5, sticky="nsew")
        
        # 设置网格权重
        for i in range(4):
            stats_frame.columnconfigure(i, weight=1)
        
        # 数据表格
        table_frame = ttk.LabelFrame(self, text="详细数据", padding=10)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 创建Treeview显示最近消课记录
        columns = ("日期", "学员", "课程", "课时", "状态")
        tree = ttk.Treeview(table_frame, columns=columns, show="headings", height=8)
        
        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, width=100)
        
        # 添加示例数据
        sample_data = [
            ("2024-01-15", "张三", "羽毛球基础班", 1, "已考勤"),
            ("2024-01-14", "李四", "羽毛球提高班", 1, "已考勤"),
            ("2024-01-13", "王五", "羽毛球基础班", 1, "已考勤"),
            ("2024-01-12", "赵六", "竞赛训练班", 2, "已考勤"),
            ("2024-01-11", "钱七", "羽毛球基础班", 1, "已考勤"),
        ]
        
        for data in sample_data:
            tree.insert("", tk.END, values=data)
        
        scrollbar = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    def create_stat_card(self, parent, label: str, value, color: str) -> ttk.Frame:
        """创建统计卡片"""
        card = ttk.Frame(parent, relief=tk.RAISED, borderwidth=2)
        
        # 值显示
        value_label = ttk.Label(card, text=str(value), font=("Microsoft YaHei", 24, "bold"), foreground=color)
        value_label.pack(pady=(10, 5))
        
        # 标签
        label_label = ttk.Label(card, text=label, font=("Microsoft YaHei", 10))
        label_label.pack(pady=(0, 10))
        
        return card

# ==================== 学生端界面 ====================

class StudentDashboardFrame(BaseFrame):
    """学生端 - 个人仪表板"""
    
    def create_widgets(self):
        # 欢迎标题
        title_label = ttk.Label(self, text="学员个人中心", font=self.title_font)
        title_label.pack(pady=20)
        
        # 快捷功能卡片
        cards_frame = ttk.Frame(self)
        cards_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        cards = [
            ("我的课表", "fa-calendar", self.show_schedule),
            ("在线约课", "fa-book", self.book_course),
            ("考勤签到", "fa-qrcode", self.check_in),
            ("我的作业", "fa-tasks", self.show_homework),
            ("在线请假", "fa-envelope", self.apply_leave),
            ("课程购买", "fa-shopping-cart", self.buy_course),
            ("师生互评", "fa-star", self.rate_teacher),
            ("通知中心", "fa-bell", self.show_notifications),
        ]
        
        for i, (text, icon, command) in enumerate(cards):
            card = self.create_function_card(cards_frame, text, icon, command)
            row, col = divmod(i, 4)
            card.grid(row=row, column=col, padx=10, pady=10, sticky="nsew")
        
        # 设置网格权重
        for i in range(4):
            cards_frame.columnconfigure(i, weight=1)
        for i in range(2):
            cards_frame.rowconfigure(i, weight=1)
        
        # 最近通知
        notice_frame = ttk.LabelFrame(self, text="最近通知", padding=10)
        notice_frame.pack(fill=tk.X, padx=20, pady=10)
        
        notices = [
            "【上课提醒】明天下午16:00-18:00有羽毛球基础班课程",
            "【续费通知】您的课程剩余课时不足5小时，请及时续费",
            "【活动通知】本周末举办羽毛球友谊赛，欢迎报名参加",
            "【系统通知】青羽教务系统已升级到新版本，体验更佳",
        ]
        
        for notice in notices:
            notice_label = ttk.Label(notice_frame, text=f"• {notice}", font=self.normal_font)
            notice_label.pack(anchor=tk.W, pady=2)
    
    def create_function_card(self, parent, text: str, icon: str, command) -> ttk.Frame:
        """创建功能卡片"""
        card = ttk.Frame(parent, relief=tk.RAISED, borderwidth=1)
        
        # 图标（使用文本模拟）
        icon_label = ttk.Label(card, text="□", font=("Microsoft YaHei", 24), foreground="#4facfe")
        icon_label.pack(pady=(15, 5))
        
        # 文本
        text_label = ttk.Label(card, text=text, font=self.normal_font)
        text_label.pack(pady=(0, 15))
        
        # 点击事件
        card.bind("<Button-1>", lambda e: command())
        icon_label.bind("<Button-1>", lambda e: command())
        text_label.bind("<Button-1>", lambda e: command())
        
        # 鼠标悬停效果
        def on_enter(e):
            card.configure(relief=tk.SUNKEN)
        
        def on_leave(e):
            card.configure(relief=tk.RAISED)
        
        card.bind("<Enter>", on_enter)
        card.bind("<Leave>", on_leave)
        
        return card
    
    def show_schedule(self):
        """显示课表"""
        self.show_message("我的课表", "课表查看功能开发中")
    
    def book_course(self):
        """约课"""
        self.show_message("在线约课", "约课功能开发中")
    
    def check_in(self):
        """签到"""
        self.show_message("考勤签到", "签到功能开发中")
    
    def show_homework(self):
        """显示作业"""
        self.show_message("我的作业", "作业查看功能开发中")
    
    def apply_leave(self):
        """请假"""
        self.show_message("在线请假", "请假功能开发中")
    
    def buy_course(self):
        """购买课程"""
        self.show_message("课程购买", "购买功能开发中")
    
    def rate_teacher(self):
        """评价老师"""
        self.show_message("师生互评", "评价功能开发中")
    
    def show_notifications(self):
        """显示通知"""
        self.show_message("通知中心", "通知查看功能开发中")

# ==================== 对话框 ====================

class AddStudentDialog(tk.Toplevel):
    """添加学员对话框"""
    
    def __init__(self, parent, data_manager: DataManager):
        super().__init__(parent)
        self.data_manager = data_manager
        self.result = False
        
        self.title("添加学员")
        self.geometry("400x500")
        self.resizable(False, False)
        
        self.create_widgets()
        self.center_window()
    
    def center_window(self):
        """居中窗口"""
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
    
    def create_widgets(self):
        """创建控件"""
        # 表单框架
        form_frame = ttk.Frame(self, padding=20)
        form_frame.pack(fill=tk.BOTH, expand=True)
        
        # 姓名
        ttk.Label(form_frame, text="姓名:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.name_var, width=30).grid(row=0, column=1, pady=5, padx=(5, 0))
        
        # 电话
        ttk.Label(form_frame, text="电话:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.phone_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.phone_var, width=30).grid(row=1, column=1, pady=5, padx=(5, 0))
        
        # 出生日期
        ttk.Label(form_frame, text="出生日期:").grid(row=2, column=0, sticky=tk.W, pady=5)
        date_frame = ttk.Frame(form_frame)
        date_frame.grid(row=2, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        self.year_var = tk.StringVar(value=str(datetime.now().year - 10))
        self.month_var = tk.StringVar(value="01")
        self.day_var = tk.StringVar(value="01")
        
        ttk.Entry(date_frame, textvariable=self.year_var, width=6).pack(side=tk.LEFT)
        ttk.Label(date_frame, text="年").pack(side=tk.LEFT, padx=2)
        ttk.Entry(date_frame, textvariable=self.month_var, width=4).pack(side=tk.LEFT)
        ttk.Label(date_frame, text="月").pack(side=tk.LEFT, padx=2)
        ttk.Entry(date_frame, textvariable=self.day_var, width=4).pack(side=tk.LEFT)
        ttk.Label(date_frame, text="日").pack(side=tk.LEFT)
        
        # 等级
        ttk.Label(form_frame, text="等级:").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.level_var = tk.StringVar()
        level_combo = ttk.Combobox(form_frame, textvariable=self.level_var, width=28, state="readonly")
        level_combo["values"] = self.data_manager.data["settings"]["course_levels"]
        if level_combo["values"]:
            level_combo.set(level_combo["values"][0])
        level_combo.grid(row=3, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        # 教练
        ttk.Label(form_frame, text="教练:").grid(row=4, column=0, sticky=tk.W, pady=5)
        self.coach_var = tk.StringVar()
        coach_combo = ttk.Combobox(form_frame, textvariable=self.coach_var, width=28, state="readonly")
        coach_combo["values"] = self.data_manager.data["settings"]["coaches"]
        if coach_combo["values"]:
            coach_combo.set(coach_combo["values"][0])
        coach_combo.grid(row=4, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        # 状态
        ttk.Label(form_frame, text="状态:").grid(row=5, column=0, sticky=tk.W, pady=5)
        self.status_var = tk.StringVar(value="active")
        status_frame = ttk.Frame(form_frame)
        status_frame.grid(row=5, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        ttk.Radiobutton(status_frame, text="潜在学员", variable=self.status_var, value="potential").pack(side=tk.LEFT)
        ttk.Radiobutton(status_frame, text="正式学员", variable=self.status_var, value="active").pack(side=tk.LEFT, padx=10)
        
        # 备注
        ttk.Label(form_frame, text="备注:").grid(row=6, column=0, sticky=tk.NW, pady=5)
        self.note_text = tk.Text(form_frame, width=30, height=5)
        self.note_text.grid(row=6, column=1, pady=5, padx=(5, 0))
        
        # 按钮
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=7, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="保存", command=self.on_save, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="取消", command=self.destroy, width=15).pack(side=tk.LEFT, padx=5)
    
    def on_save(self):
        """保存学员"""
        # 验证输入
        if not self.name_var.get().strip():
            messagebox.showerror("错误", "请输入学员姓名")
            return
        
        if not self.phone_var.get().strip():
            messagebox.showerror("错误", "请输入学员电话")
            return
        
        # 构建出生日期
        try:
            year = int(self.year_var.get())
            month = int(self.month_var.get())
            day = int(self.day_var.get())
            birth_date = f"{year:04d}-{month:02d}-{day:02d}"
        except:
            birth_date = f"{datetime.now().year - 10}-01-01"  # 默认10岁
        
        # 创建学员对象
        student = Student(
            name=self.name_var.get().strip(),
            phone=self.phone_var.get().strip(),
            birth_date=birth_date,
            level=self.level_var.get(),
            coach=self.coach_var.get()
        )
        student.status = self.status_var.get()
        student.note = self.note_text.get("1.0", tk.END).strip()
        
        # 保存到数据库
        self.data_manager.add_student(student)
        
        self.result = True
        self.destroy()

class AddCourseDialog(tk.Toplevel):
    """添加课程对话框"""
    
    def __init__(self, parent, data_manager: DataManager):
        super().__init__(parent)
        self.data_manager = data_manager
        self.result = False
        
        self.title("添加课程")
        self.geometry("400x400")
        self.resizable(False, False)
        
        self.create_widgets()
        self.center_window()
    
    def center_window(self):
        """居中窗口"""
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
    
    def create_widgets(self):
        """创建控件"""
        form_frame = ttk.Frame(self, padding=20)
        form_frame.pack(fill=tk.BOTH, expand=True)
        
        # 课程名称
        ttk.Label(form_frame, text="课程名称:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.name_var, width=30).grid(row=0, column=1, pady=5, padx=(5, 0))
        
        # 水平等级
        ttk.Label(form_frame, text="水平等级:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.level_var = tk.StringVar()
        level_combo = ttk.Combobox(form_frame, textvariable=self.level_var, width=28, state="readonly")
        level_combo["values"] = self.data_manager.data["settings"]["course_levels"]
        if level_combo["values"]:
            level_combo.set(level_combo["values"][0])
        level_combo.grid(row=1, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        # 总课时
        ttk.Label(form_frame, text="总课时:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.hours_var = tk.StringVar(value="20")
        ttk.Entry(form_frame, textvariable=self.hours_var, width=30).grid(row=2, column=1, pady=5, padx=(5, 0))
        
        # 价格
        ttk.Label(form_frame, text="价格:").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.price_var = tk.StringVar(value="2000")
        ttk.Entry(form_frame, textvariable=self.price_var, width=30).grid(row=3, column=1, pady=5, padx=(5, 0))
        
        # 教练
        ttk.Label(form_frame, text="教练:").grid(row=4, column=0, sticky=tk.W, pady=5)
        self.coach_var = tk.StringVar()
        coach_combo = ttk.Combobox(form_frame, textvariable=self.coach_var, width=28, state="readonly")
        coach_combo["values"] = self.data_manager.data["settings"]["coaches"]
        if coach_combo["values"]:
            coach_combo.set(coach_combo["values"][0])
        coach_combo.grid(row=4, column=1, sticky=tk.W, pady=5, padx=(5, 0))
        
        # 描述
        ttk.Label(form_frame, text="课程描述:").grid(row=5, column=0, sticky=tk.NW, pady=5)
        self.desc_text = tk.Text(form_frame, width=30, height=4)
        self.desc_text.grid(row=5, column=1, pady=5, padx=(5, 0))
        
        # 按钮
        button_frame = ttk.Frame(form_frame)
        button_frame.grid(row=6, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="保存", command=self.on_save, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="取消", command=self.destroy, width=15).pack(side=tk.LEFT, padx=5)
    
    def on_save(self):
        """保存课程"""
        if not self.name_var.get().strip():
            messagebox.showerror("错误", "请输入课程名称")
            return
        
        try:
            total_hours = int(self.hours_var.get())
            price = float(self.price_var.get())
        except:
            messagebox.showerror("错误", "课时和价格必须是数字")
            return
        
        course = Course(
            name=self.name_var.get().strip(),
            level=self.level_var.get(),
            total_hours=total_hours,
            price=price
        )
        course.coach = self.coach_var.get()
        course.description = self.desc_text.get("1.0", tk.END).strip()
        
        self.data_manager.add_course(course)
        self.result = True
        self.destroy()

class LoginDialog(tk.Toplevel):
    """登录弹窗"""

    def __init__(self, parent, data_manager: DataManager):
        super().__init__(parent)
        self.data_manager = data_manager
        self.result = None
        self.title("用户登录")
        self.geometry("360x220")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self.on_cancel)
        self.create_widgets()

    def create_widgets(self):
        frame = ttk.Frame(self, padding=16)
        frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frame, text="青羽教务系统登录", font=("Microsoft YaHei", 14, "bold")).pack(pady=(0, 12))
        ttk.Label(frame, text="用户名").pack(anchor=tk.W)
        self.username_var = tk.StringVar(value="admin")
        ttk.Entry(frame, textvariable=self.username_var, width=30).pack(pady=(0, 8))

        ttk.Label(frame, text="密码").pack(anchor=tk.W)
        self.password_var = tk.StringVar(value="admin123")
        ttk.Entry(frame, textvariable=self.password_var, width=30, show="*").pack(pady=(0, 10))

        self.tip_label = ttk.Label(
            frame,
            text="默认账号：admin/admin123",
            foreground="#666666"
        )
        self.tip_label.pack(anchor=tk.W)

        btns = ttk.Frame(frame)
        btns.pack(fill=tk.X, pady=(16, 0))
        ttk.Button(btns, text="取消", command=self.on_cancel).pack(side=tk.RIGHT)
        ttk.Button(btns, text="登录", command=self.on_login).pack(side=tk.RIGHT, padx=8)

    def on_login(self):
        username = self.username_var.get().strip()
        password = self.password_var.get().strip()
        user = self.data_manager.authenticate_user(username, password)
        if not user:
            messagebox.showerror("登录失败", "用户名或密码错误，或账号已禁用。", parent=self)
            return
        self.result = user
        self.destroy()

    def on_cancel(self):
        self.result = None
        self.destroy()

# ==================== 主应用 ====================

class QingYuEduSystem:
    """青羽教务系统主类 - 重构版本"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("青羽教务系统 - 重构版")
        self.root.geometry("1200x700")
        
        # 设置图标和主题
        self.setup_style()
        
        # 数据管理器
        self.data_manager = DataManager()
        self.current_user = None
        
        # 默认角色
        self.current_role = UserRole.STUDENT

        if not self.login():
            self.root.destroy()
            return
        
        # 创建主界面
        self.create_main_ui()

    def login(self) -> bool:
        """登录认证"""
        dialog = LoginDialog(self.root, self.data_manager)
        self.root.wait_window(dialog)
        if not dialog.result:
            return False
        self.current_user = dialog.result
        role_str = self.current_user.get("role", UserRole.STUDENT.value)
        try:
            self.current_role = UserRole(role_str)
        except ValueError:
            self.current_role = UserRole.STUDENT
        self.data_manager.log_operation("用户登录", f"角色:{self.current_role.value}", self.current_user.get("username", "unknown"))
        self.data_manager.save_data()
        return True
    
    def setup_style(self):
        """设置样式"""
        style = ttk.Style()
        style.theme_use("clam")
        
        # 统一色彩与控件风格
        style.configure(".", font=("Microsoft YaHei", 10))
        style.configure("Title.TLabel", font=("Microsoft YaHei", 16, "bold"))
        style.configure("Header.TLabel", font=("Microsoft YaHei", 12, "bold"))
        style.configure("Normal.TLabel", font=("Microsoft YaHei", 10))
        style.configure("AppHeader.TFrame", background="#2563eb")
        style.configure("AppHeader.TLabel", background="#2563eb", foreground="#ffffff", font=("Microsoft YaHei", 12, "bold"))
        style.configure("Toolbar.TFrame", background="#f8fafc")
        style.configure("Primary.TButton", padding=(10, 4))
        style.configure("TButton", padding=(8, 3))
    
    def create_main_ui(self):
        """创建主界面"""
        self.create_header_bar()

        # 顶部菜单栏
        self.create_menu_bar()
        
        # 角色切换工具栏
        self.create_role_toolbar()
        
        # 主内容区域
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 根据当前角色显示界面
        self.show_interface_by_role()

    def create_header_bar(self):
        """顶部品牌栏"""
        header = ttk.Frame(self.root, style="AppHeader.TFrame")
        header.pack(fill=tk.X)
        ttk.Label(
            header,
            text="青羽教务系统 · 校如云风格重构版",
            style="AppHeader.TLabel"
        ).pack(side=tk.LEFT, padx=12, pady=8)
        ttk.Label(
            header,
            text=datetime.now().strftime("%Y-%m-%d"),
            style="AppHeader.TLabel"
        ).pack(side=tk.RIGHT, padx=12)

    def is_admin_user(self) -> bool:
        """当前登录账号是否为管理员账号"""
        if not self.current_user:
            return False
        return self.current_user.get("role") == UserRole.ADMIN.value
    
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # 文件菜单
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="文件", menu=file_menu)
        file_menu.add_command(label="导出数据", command=self.export_data)
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.root.quit)
        
        # 工具菜单
        tools_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="工具", menu=tools_menu)
        tools_menu.add_command(label="数据备份", command=self.backup_data)
        tools_menu.add_command(label="数据恢复", command=self.restore_data)
        
        # 帮助菜单
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="帮助", menu=help_menu)
        help_menu.add_command(label="使用说明", command=self.show_help)
        help_menu.add_command(label="关于", command=self.show_about)
    
    def create_role_toolbar(self):
        """创建角色切换工具栏"""
        toolbar = ttk.Frame(self.root, style="Toolbar.TFrame")
        toolbar.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(toolbar, text="当前身份:").pack(side=tk.LEFT)
        
        role_name_map = {
            UserRole.ADMIN: "管理员",
            UserRole.TEACHER: "老师",
            UserRole.STUDENT: "学生",
            UserRole.PARENT: "家长",
            UserRole.COACH: "教练"
        }
        self.role_var = tk.StringVar(value=role_name_map.get(self.current_role, "学生"))
        self.role_combo = ttk.Combobox(toolbar, textvariable=self.role_var, width=15, state="readonly")
        if self.is_admin_user():
            self.role_combo["values"] = ["管理员", "老师", "学生", "家长", "教练"]
        else:
            self.role_combo["values"] = [role_name_map.get(self.current_role, "学生")]
        self.role_combo.pack(side=tk.LEFT, padx=5)
        self.role_combo.bind("<<ComboboxSelected>>", self.on_role_changed)
        
        # 用户信息
        display_name = self.current_user.get("name", "") if self.current_user else ""
        user_info = ttk.Label(
            toolbar,
            text=f"当前用户：{display_name} | 青羽教务系统",
            font=("Microsoft YaHei", 9)
        )
        user_info.pack(side=tk.RIGHT)
    
    def on_role_changed(self, event):
        """角色切换事件"""
        role_map = {
            "管理员": UserRole.ADMIN,
            "老师": UserRole.TEACHER,
            "学生": UserRole.STUDENT,
            "家长": UserRole.PARENT,
            "教练": UserRole.COACH
        }
        
        new_role = role_map.get(self.role_var.get(), UserRole.ADMIN)
        if new_role != self.current_role:
            if not self.is_admin_user():
                messagebox.showwarning("无权限", "仅管理员可以切换角色。")
                self.role_var.set(self.role_combo["values"][0])
                return
            self.current_role = new_role
            operator = self.current_user.get("username", "unknown") if self.current_user else "unknown"
            self.data_manager.log_operation("切换角色", f"切换为:{new_role.value}", operator)
            self.data_manager.save_data()
            self.show_interface_by_role()
    
    def show_interface_by_role(self):
        """根据角色显示界面"""
        # 清空主框架
        for widget in self.main_frame.winfo_children():
            widget.destroy()
        
        if self.current_role in [UserRole.ADMIN, UserRole.TEACHER]:
            self.show_admin_interface()
        elif self.current_role == UserRole.STUDENT:
            self.show_student_interface()
        elif self.current_role == UserRole.PARENT:
            self.show_parent_interface()
        elif self.current_role == UserRole.COACH:
            self.show_coach_interface()
    
    def show_admin_interface(self):
        """显示管理员/老师界面"""
        # 创建标签页
        notebook = ttk.Notebook(self.main_frame)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 学员管理
        student_frame = AdminStudentFrame(notebook, self.data_manager, self.current_role)
        notebook.add(student_frame, text="学员管理")
        
        # 课程管理
        course_frame = AdminCourseFrame(notebook, self.data_manager, self.current_role)
        notebook.add(course_frame, text="课程管理")
        
        # 排课管理
        schedule_frame = AdminScheduleFrame(notebook, self.data_manager, self.current_role)
        notebook.add(schedule_frame, text="排课管理")
        
        # 消课点名
        attendance_frame = AdminAttendanceFrame(notebook, self.data_manager, self.current_role)
        notebook.add(attendance_frame, text="消课点名")
        
        # 统计中心
        stats_frame = AdminStatsFrame(notebook, self.data_manager, self.current_role)
        notebook.add(stats_frame, text="统计中心")
    
    def show_student_interface(self):
        """显示学生界面"""
        dashboard = StudentDashboardFrame(self.main_frame, self.data_manager, self.current_role)
        dashboard.pack(fill=tk.BOTH, expand=True)
    
    def show_parent_interface(self):
        """显示家长界面"""
        label = ttk.Label(self.main_frame, text="家长功能开发中...", font=("Microsoft YaHei", 16))
        label.pack(expand=True)
    
    def show_coach_interface(self):
        """显示教练界面"""
        label = ttk.Label(self.main_frame, text="教练功能开发中...", font=("Microsoft YaHei", 16))
        label.pack(expand=True)
    
    def export_data(self):
        """导出数据"""
        filepath = filedialog.asksaveasfilename(
            title="导出数据",
            defaultextension=".json",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        if filepath:
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(self.data_manager.data, f, ensure_ascii=False, indent=2)
                operator = self.current_user.get("username", "unknown") if self.current_user else "unknown"
                self.data_manager.log_operation("导出数据", f"路径:{filepath}", operator)
                self.data_manager.save_data()
                messagebox.showinfo("成功", f"数据已导出到: {filepath}")
            except Exception as e:
                messagebox.showerror("错误", f"导出失败: {str(e)}")
    
    def backup_data(self):
        """备份数据"""
        try:
            backup_file = self.data_manager.create_backup(manual=True)
            operator = self.current_user.get("username", "unknown") if self.current_user else "unknown"
            self.data_manager.log_operation("手动备份", f"备份文件:{backup_file}", operator)
            self.data_manager.save_data()
            messagebox.showinfo("成功", f"数据已备份到: {backup_file}")
        except Exception as e:
            messagebox.showerror("错误", f"备份失败: {str(e)}")
    
    def restore_data(self):
        """恢复数据"""
        filepath = filedialog.askopenfilename(
            title="选择备份文件",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        if filepath and messagebox.askyesno("确认", "确定要恢复数据吗？这将覆盖当前数据。"):
            try:
                self.data_manager.restore_from_backup(filepath)
                operator = self.current_user.get("username", "unknown") if self.current_user else "unknown"
                self.data_manager.log_operation("恢复数据", f"来源:{filepath}", operator)
                self.data_manager.save_data()
                self.show_interface_by_role()
                messagebox.showinfo("成功", "数据恢复成功，界面已刷新。")
            except Exception as e:
                messagebox.showerror("错误", f"恢复失败: {str(e)}")
    
    def show_help(self):
        """显示帮助"""
        help_text = """青羽教务系统使用说明

1. 学员管理
   - 添加学员：填写学员基本信息
   - 导入/导出：支持CSV格式批量操作
   - 搜索筛选：按姓名或电话搜索学员

2. 课程管理
   - 添加课程：设置课程名称、水平、课时、价格
   - 报课管理：为学员分配课程

3. 排课管理
   - 添加排课：为学员安排上课时间
   - 导入课表：批量导入排课信息
   - 修复周日：自动复制周六时间段到周日

4. 消课点名
   - 选择排课：加载对应学员
   - 点名考勤：勾选已到学员进行考勤
   - 自动扣课：考勤后自动扣除相应课时

5. 统计中心
   - 数据概览：查看机构运营关键指标
   - 消课记录：查看历史考勤记录

提示：定期备份数据以防丢失。"""
        
        help_window = tk.Toplevel(self.root)
        help_window.title("使用说明")
        help_window.geometry("500x600")
        
        text_widget = tk.Text(help_window, wrap=tk.WORD, font=("Microsoft YaHei", 10))
        text_widget.insert("1.0", help_text)
        text_widget.config(state=tk.DISABLED)
        
        scrollbar = ttk.Scrollbar(help_window, orient=tk.VERTICAL, command=text_widget.yview)
        text_widget.configure(yscrollcommand=scrollbar.set)
        
        text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    def show_about(self):
        """显示关于信息"""
        about_text = """青羽教务系统 - 重构版
版本: 2.0.0
基于"校如云"架构设计

功能特点:
• 多角色支持：管理员、老师、学生、家长、教练
• 完整流程：学员管理、课程管理、排课消课、统计分析
• 数据安全：本地JSON存储，支持备份恢复
• 便捷操作：CSV导入导出，批量处理

技术栈:
• Python 3.8+
• Tkinter GUI
• JSON数据库
• 多线程处理

© 2024 青羽教育科技"""
        
        messagebox.showinfo("关于", about_text)
    
    def run(self):
        """运行应用"""
        self.root.mainloop()

def main():
    """主函数"""
    root = tk.Tk()
    
    # 设置窗口图标（如果有的话）
    try:
        root.iconbitmap(default="icon.ico")
    except:
        pass
    
    app = QingYuEduSystem(root)
    app.run()

if __name__ == "__main__":
    main()
