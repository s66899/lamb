@echo off
rem Sheep Assistant CLI
setlocal
set "PY=C:\Users\Administrator\AppData\Local\Python\pythoncore-3.14-64\python.exe"
if not exist "%PY%" set "PY=python"
set "PYTHONIOENCODING=utf-8"
"%PY%" "%~dp0sheep.py" %*
