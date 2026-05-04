#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
青羽教务系统 - 启动器
支持桌面端main.py和网页端app.py的启动
"""

import os
import sys
import subprocess
import webbrowser
import time

def get_script_path():
    return os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe()))) if 'inspect' in dir() else os.path.dirname(os.path.abspath(__file__))

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def show_menu():
    clear_screen()
    print("=" * 50)
    print("      青羽教务系统 - 启动器")
    print("=" * 50)
    print()
    print("  1. 启动桌面端（tkinter界面）")
    print("  2. 启动网页端（浏览器访问）")
    print("  3. 同时启动桌面端和网页端")
    print("  4. 查看访问地址")
    print("  0. 退出")
    print()
    print("=" * 50)

def start_desktop():
    print("正在启动桌面端...")
    try:
        subprocess.Popen([sys.executable, "main.py"], cwd=os.path.dirname(os.path.abspath(__file__)))
        print("桌面端已启动！")
    except Exception as e:
        print(f"启动桌面端失败: {e}")
    input("按回车键返回菜单...")

def start_web():
    print("正在启动网页端...")
    try:
        # 启动项目根目录的 app.py，确保使用最新代码和同一数据文件
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subprocess.Popen([sys.executable, "app.py"], cwd=root_dir)
        time.sleep(2)
        webbrowser.open("http://localhost:5000")
        print("网页端已启动！")
        print("访问地址: http://localhost:5000")
        print("手机端访问: http://localhost:5000/m")
    except Exception as e:
        print(f"启动网页端失败: {e}")
    input("按回车键返回菜单...")

def start_both():
    print("正在启动双端...")
    try:
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subprocess.Popen([sys.executable, "main.py"], cwd=os.path.dirname(os.path.abspath(__file__)))
        subprocess.Popen([sys.executable, "app.py"], cwd=root_dir)
        time.sleep(2)
        webbrowser.open("http://localhost:5000")
        print("双端已启动！")
        print("桌面端: 请查看 tkinter 窗口")
        print("网页端: http://localhost:5000")
        print("手机端: http://localhost:5000/m")
    except Exception as e:
        print(f"启动失败: {e}")
    input("按回车键返回菜单...")

def show_info():
    clear_screen()
    print("=" * 50)
    print("      青羽教务系统 - 访问信息")
    print("=" * 50)
    print()
    print("  电脑IP查询: 在CMD输入 ipconfig")
    print()
    print("  本地访问:")
    print("    - 网页端: http://localhost:5000")
    print("    - 手机端: http://localhost:5000/m")
    print()
    print("  同一局域网访问（替换为你的电脑IP）:")
    print("    - 网页端: http://192.168.x.x:5000")
    print("    - 手机端: http://192.168.x.x:5000/m")
    print()
    print("  数据文件: 教务数据.json")
    print("=" * 50)
    input("按回车键返回菜单...")

def main():
    while True:
        show_menu()
        choice = input("请选择 (0-4): ").strip()
        if choice == '1':
            start_desktop()
        elif choice == '2':
            start_web()
        elif choice == '3':
            start_both()
        elif choice == '4':
            show_info()
        elif choice == '0':
            print("感谢使用！")
            break
        else:
            print("无效选择，请重试")
            time.sleep(1)

if __name__ == '__main__':
    main()
