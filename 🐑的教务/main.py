#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
青羽教务系统 - 主程序
基于Python Tkinter的羽毛球培训机构教务管理系统
"""

import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import datetime

class QingYuEduSystem:
    """青羽教务系统主类"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("青羽教务系统")
        self.root.geometry("1200x700")
        
        # 加载数据
        self.data_file = "教务数据.json"
        self.load_data()
        
        # 创建界面
        self.create_widgets()
        
    def load_data(self):
        """加载数据文件"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            except:
                self.data = {
                    "students": [],
                    "courses": [],
                    "schedules": [],
                    "attendance": []
                }
        else:
            self.data = {
                "students": [],
                "courses": [],
                "schedules": [],
                "attendance": []
            }
    
    def save_data(self):
        """保存数据到文件"""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
    
    def create_widgets(self):
        """创建主界面"""
        # 创建标签页
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 学员管理标签页
        self.student_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.student_frame, text="学员管理")
        
        # 报课管理标签页
        self.course_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.course_frame, text="报课管理")
        
        # 排课管理标签页
        self.schedule_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.schedule_frame, text="排课管理")
        
        # 消课点名标签页
        self.attendance_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.attendance_frame, text="消课点名")
        
        # 统计中心标签页
        self.stats_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.stats_frame, text="统计中心")
        
        # 状态栏
        self.status_bar = ttk.Label(self.root, text="就绪", relief=tk.SUNKEN)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def run(self):
        """运行主循环"""
        self.root.mainloop()

def main():
    root = tk.Tk()
    app = QingYuEduSystem(root)
    app.run()

if __name__ == "__main__":
    main()