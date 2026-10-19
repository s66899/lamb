@echo off
chcp 65001 >nul
title Hermes Web Chat Launcher
color 0A
cls

echo ==========================================
echo   ⚕ Hermes Agent - Web Chat Launcher
echo ==========================================
echo.

REM Check if API server is already running
curl -s http://127.0.0.1:8642/health >nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ API Server 已在运行
    goto OPEN_BROWSER
)

echo  🚀 正在启动 Hermes Gateway (API Server)...
echo.

REM Clean stale state files to prevent startup issues
del /Q "%LOCALAPPDATA%\hermes\gateway_state.json" >nul 2>&1
del /Q "%LOCALAPPDATA%\hermes\gateway.pid" >nul 2>&1

REM Start gateway in a new window using Python directly
REM This bypasses the 'hermes' CLI Unicode issues on Windows
start "Hermes Gateway" cmd /k "cd /d %LOCALAPPDATA%\hermes\hermes-agent ^&^& python -c ""import sys, asyncio; sys.path.insert(0, '.'); from gateway.run import start_gateway; asyncio.run(start_gateway())"""

echo  ⏳ 等待 Gateway 启动...
echo.
set /a attempts=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a attempts+=1
curl -s http://127.0.0.1:8642/health >nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ Gateway 启动成功！
    goto OPEN_BROWSER
)
if %attempts% GEQ 15 (
    echo  ❌ 等待超时，Gateway 可能启动失败。
    echo     请检查新打开的 Gateway 窗口中的错误信息。
    pause
    exit /b 1
)
echo     仍在等待... (%attempts%/15)
goto WAIT_LOOP

:OPEN_BROWSER
echo.
echo  🌐 正在打开网页聊天界面...
start "" "%LOCALAPPDATA%\hermes\chat.html"
echo.
echo ==========================================
echo  网页聊天界面已打开！
echo.
echo  📍 如果未自动打开，请手动访问：
echo    %LOCALAPPDATA%\hermes\chat.html
echo.
echo  📡 API 端点：http://127.0.0.1:8642
echo ==========================================
echo.
echo  💡 提示：
echo    - Gateway 在独立的命令行窗口中运行
echo    - 关闭 Gateway 窗口即可停止服务
echo    - 聊天记录自动保存在浏览器本地
echo.
pause
