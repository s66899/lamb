#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
青羽教务系统 - 备份主程序
功能与main.py相同，用于紧急恢复
"""

import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import datetime

def backup_main():
    """备份主函数"""
    print("青羽教务系统备份版本")
    print("如需使用完整功能，请运行main.py")
    
    # 检查数据文件
    if os.path.exists("教务数据.json"):
        print("数据文件存在，大小:", os.path.getsize("教务数据.json"), "字节")
    else:
        print("警告: 数据文件不存在")

if __name__ == "__main__":
    backup_main()