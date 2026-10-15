@echo off
rem Start realtime watcher + local dashboard server (browser opens automatically)
setlocal
set "PY=C:\Users\Administrator\AppData\Local\Python\pythoncore-3.14-64\python.exe"
if not exist "%PY%" set "PY=python"
set "PYTHONIOENCODING=utf-8"
if "%~1"=="" (
  "%PY%" "%~dp0sheep.py" watch --serve
) else (
  "%PY%" "%~dp0sheep.py" watch "%~1" --serve
)
if errorlevel 1 pause
