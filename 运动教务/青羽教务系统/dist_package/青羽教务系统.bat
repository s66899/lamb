@echo off
chcp 65001 >nul
title 青羽教务系统
echo.
echo ========================================
echo       青羽教务系统 - 启动中...
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python，请先安装Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 启动选项
echo 请选择启动模式:
echo   1 - 桌面端（tkinter界面）
echo   2 - 网页端（浏览器访问）
echo   3 - 同时启动桌面端+网页端
echo.

set /p choice="请输入选择 (1/2/3): "

if "%choice%"=="1" (
    echo 正在启动桌面端...
    start "青羽教务-桌面端" python main.py
) else if "%choice%"=="2" (
    echo 正在启动网页端...
    start "青羽教务-网页端" python app.py
    timeout /t 3 /nobreak >nul
    start http://localhost:5000
) else if "%choice%"=="3" (
    echo 正在启动双端...
    start "青羽教务-桌面端" python main.py
    start "青羽教务-网页端" python app.py
    timeout /t 3 /nobreak >nul
    start http://localhost:5000
) else (
    echo 无效选择
)

echo.
echo ========================================
echo  启动成功！
echo ========================================
echo.
pause
