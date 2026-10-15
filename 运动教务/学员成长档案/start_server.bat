@echo off
title 学员成长档案服务器
cd /d "%~dp0"
echo ========================================
echo  学员成长档案系统 - 一键启动
echo ========================================
echo.
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误：未检测到 Python，请安装 Python 3
    pause
    exit /b 1
)
echo Python 已检测到
echo 正在启动服务器...
echo.
echo 访问地址：
echo   教练端：http://localhost:8080/
echo   家长端：http://localhost:8080/parent
echo   教评库：http://localhost:8080/羽毛球AI教评库.html
echo.
echo 请勿关闭此窗口，关闭后服务器将停止
echo ========================================
echo.
python server.py
echo.
echo 服务器已停止
pause
