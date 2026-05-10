"""
Gunicorn 配置文件
用于生产环境部署
"""
import multiprocessing

# 绑定地址和端口
bind = "0.0.0.0:5000"

#  worker 数量，建议为 CPU 核心数 * 2 + 1
workers = multiprocessing.cpu_count() * 2 + 1

# worker 类型，使用 gevent 提高并发性能
worker_class = "gevent"

# 每个 worker 的线程数
threads = 2

# 最大并发数
worker_connections = 1000

# 超时时间
timeout = 30

# keepalive 时间
keepalive = 2

# 预处理应用（加载一次，多个 worker 共享）
preload_app = True

# 日志级别
loglevel = "info"

# 访问日志路径
accesslog = "-"  # 输出到 stdout

# 错误日志路径
errorlog = "-"   # 输出到 stderr

# 进程名称
proc_name = "stock_api"
