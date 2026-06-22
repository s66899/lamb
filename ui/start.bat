@echo off
REM 启动书架服务
cd /d "D:\openclaw\workspace\worm-gear-lift-platform\ui"
start "Bookshelf" node server.js
echo 📚 书架服务已启动！
echo   本地: http://localhost:3456
echo   其他设备: http://%COMPUTERNAME%:3456
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:3456
