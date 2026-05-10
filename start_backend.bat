@echo off
chcp 65001 >nul
echo ========================================
echo   启动股票后端 API 服务
echo ========================================
echo.
python start_backend.py
pause