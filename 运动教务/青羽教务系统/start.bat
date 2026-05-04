@echo off
cls

echo.
echo ==========================================
echo.
echo        羊的教务管理系统
echo.
echo ==========================================
echo.

echo [检查] Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python
    echo 请安装Python 3.10或更高版本
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('python --version 2^>^&1') do (
    echo [OK] 检测到 %%a
)

echo.
echo [1/3] 检查依赖包...
python -m pip install -q -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo         首次安装，请稍候...
    python -m pip install -r requirements.txt
)
echo [OK] 依赖已就绪

echo.
echo [2/3] 正在启动服务器...
echo ------------------------------------------
echo  访问地址: http://localhost:5000
echo  停止服务: 按Ctrl+C
echo ------------------------------------------
echo.

start /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"

echo [3/3] 服务运行中...
echo.
python app.py

echo.
echo [停止] 服务已关闭
pause
