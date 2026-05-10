#!/bin/bash
# 生产环境启动脚本 (Linux/Mac)

# 激活虚拟环境（如果有的话）
# source venv/bin/activate

# 使用 Gunicorn 启动
echo "Starting Stock API Server in production mode..."
gunicorn -c gunicorn_config.py main:app
