@echo off
chcp 65001 >nul
title 青羽教务系统 - 编译exe

echo.
echo ========================================
echo    青羽教务系统 - 正在编译exe
echo ========================================
echo.

REM 安装PyInstaller
python -m pip install pyinstaller -q

REM 编译
pyinstaller app.spec --clean

if errorlevel 1 (
    echo.
    echo [错误] 编译失败
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] 编译成功！
echo.
echo exe文件位于: dist\青羽教务系统_网页端\
echo.
pause
