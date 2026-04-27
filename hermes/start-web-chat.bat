@echo off
chcp 65001 >nul
title Hermes Web Chat Launcher
color 0A
cls

echo ==========================================
echo   鈿?Hermes Agent - Web Chat Launcher
echo ==========================================
echo.

REM Check if API server is already running
curl -s http://127.0.0.1:8642/health >nul 2>&1
if %errorlevel% == 0 (
    echo  鉁?API Server 宸插湪杩愯
    goto OPEN_BROWSER
)

echo  馃殌 姝ｅ湪鍚姩 Hermes Gateway (API Server)...
echo.

REM Clean stale state files to prevent startup issues
del /Q "%LOCALAPPDATA%\hermes\gateway_state.json" >nul 2>&1
del /Q "%LOCALAPPDATA%\hermes\gateway.pid" >nul 2>&1

REM Start gateway in a new window using Python directly
REM This bypasses the 'hermes' CLI Unicode issues on Windows
start "Hermes Gateway" cmd /k "cd /d %LOCALAPPDATA%\hermes\hermes-agent ^&^& python -c ""import sys, asyncio; sys.path.insert(0, '.'); from gateway.run import start_gateway; asyncio.run(start_gateway())"""

echo  鈴?绛夊緟 Gateway 鍚姩...
echo.
set /a attempts=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a attempts+=1
curl -s http://127.0.0.1:8642/health >nul 2>&1
if %errorlevel% == 0 (
    echo  鉁?Gateway 鍚姩鎴愬姛锛?    goto OPEN_BROWSER
)
if %attempts% GEQ 15 (
    echo  鉂?绛夊緟瓒呮椂锛孏ateway 鍙兘鍚姩澶辫触銆?    echo     璇锋鏌ユ柊鎵撳紑鐨?Gateway 绐楀彛涓殑閿欒淇℃伅銆?    pause
    exit /b 1
)
echo     浠嶅湪绛夊緟... (%attempts%/15)
goto WAIT_LOOP

:OPEN_BROWSER
echo.
echo  馃寪 姝ｅ湪鎵撳紑缃戦〉鑱婂ぉ鐣岄潰...
start "" "%LOCALAPPDATA%\hermes\chat.html"
echo.
echo ==========================================
echo  缃戦〉鑱婂ぉ鐣岄潰宸叉墦寮€锛?echo.
echo  馃搷 濡傛灉鏈嚜鍔ㄦ墦寮€锛岃鎵嬪姩璁块棶锛?echo    %LOCALAPPDATA%\hermes\chat.html
echo.
echo  馃摗 API 绔偣锛歨ttp://127.0.0.1:8642
echo ==========================================
echo.
echo  馃挕 鎻愮ず锛?echo    - Gateway 鍦ㄧ嫭绔嬬殑鍛戒护琛岀獥鍙ｄ腑杩愯
echo    - 鍏抽棴 Gateway 绐楀彛鍗冲彲鍋滄鏈嶅姟
echo    - 鑱婂ぉ璁板綍鑷姩淇濆瓨鍦ㄦ祻瑙堝櫒鏈湴
echo.
pause
