@echo off
REM 一键启动 Flask 微信图片代理服务器
cd /d %~dp0

REM 检查Python环境
where python >nul 2>nul
if errorlevel 1 (
    echo 未检测到Python环境，正在自动下载安装...
    powershell -Command "Start-Process 'https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe' -Wait"
    echo 请手动安装Python，安装完成后请重新运行本脚本。
    pause
    exit /b
)

REM 检查并激活虚拟环境（如有）
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM 自动查找pip路径
set "PIP_CMD="
for %%I in (python.exe) do set "PYTHON_EXE=%%~$PATH:I"
if defined PYTHON_EXE (
    for /f "delims=" %%P in ('"%PYTHON_EXE%" -m pip --version') do set "PIP_CMD=%PYTHON_EXE% -m pip"
)
if not defined PIP_CMD set "PIP_CMD=python -m pip"

REM 安装依赖
%PIP_CMD% install flask flask-cors requests

REM 启动服务器
call python wx_img_proxy_server.py
if %errorlevel% neq 0 (
    echo.
    echo [错误] Python 后端启动失败，请检查 Python 环境和依赖。
)

pause
