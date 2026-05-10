#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单的后端启动脚本
"""
import sys
import os

# 添加后端目录到路径
backend_dir = os.path.join(os.path.dirname(__file__), '分时后端api')
sys.path.insert(0, backend_dir)

try:
    from main import create_app
    app = create_app()
    
    print("=" * 50)
    print("  股票后端 API 服务启动中...")
    print("=" * 50)
    print(f"  访问地址: http://localhost:5000")
    print(f"  健康检查: http://localhost:5000/api/health")
    print("=" * 50)
    print()
    
    # 启动 Flask 应用
    app.run(host='0.0.0.0', port=5000, debug=True)
    
except KeyboardInterrupt:
    print("\n服务已停止")
except Exception as e:
    print(f"启动失败: {e}")
    import traceback
    traceback.print_exc()
