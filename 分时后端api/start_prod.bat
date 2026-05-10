@echo off
REM 生产环境启动脚本 (Windows)

REM 激活虚拟环境（如果有的话）
REM call venv\Scripts\activate.bat

echo Starting Stock API Server in production mode...
gunicorn -c gunicorn_config.py main:app
