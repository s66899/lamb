#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🐏的教务 - 一键启动服务器
自动检测环境、安装依赖、启动服务并打开浏览器
"""

import os
import sys
import subprocess
import time
import webbrowser
import socket
from pathlib import Path

# 配置
HOST = "0.0.0.0"
PORT = 5000
URL = f"http://localhost:{PORT}"
REQUIREMENTS = "requirements.txt"
APP_ENTRY = "app.py"


def print_banner():
    """打印启动横幅"""
    banner = """
╔══════════════════════════════════════════╗
║                                          ║
║     🐏 的 教 务 管 理 系 统              ║
║                                          ║
╚══════════════════════════════════════════╝
"""
    print(banner)


def check_python():
    """检查 Python 版本"""
    print("🔍 检查 Python 环境...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"❌ Python 版本过低: {version.major}.{version.minor}")
        print("   请安装 Python 3.10 或更高版本")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True


def install_dependencies():
    """安装/更新依赖"""
    print(f"📦 检查依赖包...")
    req_path = Path(REQUIREMENTS)
    if not req_path.exists():
        print(f"⚠️ 未找到 {REQUIREMENTS}，跳过依赖检查")
        return True

    try:
        # 使用 -q 静默模式，减少输出噪音
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "-r", str(req_path)],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode == 0:
            print("✅ 依赖已就绪")
        else:
            # 如果静默安装失败，再试一次显示详细错误
            print("   正在安装依赖...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "-r", str(req_path)]
            )
            print("✅ 依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖安装失败: {e}")
        return False
    except Exception as e:
        print(f"❌ pip 执行出错: {e}")
        return False


def wait_for_server(host, port, timeout=30):
    """等待服务器启动"""
    print(f"⏳ 正在启动服务...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            time.sleep(0.3)
    return False


def open_browser():
    """自动打开浏览器"""
    print(f"🌐 正在打开浏览器...")
    try:
        webbrowser.open(URL, new=2)  # new=2 表示在新标签页打开
    except Exception as e:
        print(f"   浏览器打开失败（可手动访问）: {e}")


def start_server():
    """启动 Flask 服务器"""
    app_path = Path(APP_ENTRY)
    if not app_path.exists():
        print(f"❌ 入口文件不存在: {APP_ENTRY}")
        return False

    print(f"🚀 启动服务器: {URL}")
    print("-" * 44)
    print("   移动端访问: http://localhost:5000")
    print("   电脑端访问: http://localhost:5000")
    print("-" * 44)
    print("   按 Ctrl+C 停止服务\n")

    # 使用 subprocess 启动，避免阻塞当前脚本的消息循环
    try:
        subprocess.run(
            [sys.executable, str(app_path)],
            cwd=str(Path(__file__).parent)
        )
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    return True


def main():
    """主流程"""
    os.system("cls" if os.name == "nt" else "clear")
    print_banner()

    # 1. 检查 Python
    if not check_python():
        input("\n按 Enter 键退出...")
        sys.exit(1)

    # 2. 安装依赖
    if not install_dependencies():
        input("\n按 Enter 键退出...")
        sys.exit(1)

    # 3. 启动服务器（在后台线程中等待服务器就绪后打开浏览器）
    import threading
    browser_thread = threading.Thread(
        target=lambda: (
            wait_for_server("127.0.0.1", PORT) and (time.sleep(0.5) or open_browser())
        ),
        daemon=True
    )
    browser_thread.start()

    # 4. 启动主服务（阻塞）
    start_server()


if __name__ == "__main__":
    main()
