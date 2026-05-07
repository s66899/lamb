@echo off
chcp 65001 >nul
title 青羽教务系统 - 环境安装

echo.
echo ========================================
echo       青羽教务系统 - 环境安装
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python环境
    echo.
    echo 请先安装Python 3.8或更高版本
    echo 下载地址: https://www.python.org/downloads/
    echo.
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo [OK] Python环境检测成功
echo.

REM 安装依赖
echo 正在安装依赖包...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [警告] 部分依赖安装失败，可能不影响使用
    echo.
) else (
    echo.
    echo [OK] 依赖安装完成
)

echo.
echo ========================================
echo       环境安装完成！
echo ========================================
echo.
echo 现在可以双击运行: 青羽教务系统.bat
echo.
pause
