
"""
配置文件
"""
import os

# 项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Flask配置
FLASK_HOST = '0.0.0.0'
FLASK_PORT = 5000
FLASK_DEBUG = True

# A股交易时间
MORNING_MINUTES = 120  # 上午 9:30-11:30
AFTERNOON_MINUTES = 120  # 下午 13:00-15:00
TOTAL_MINUTES = MORNING_MINUTES + AFTERNOON_MINUTES  # 全天240分钟

# Redis配置
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)
REDIS_DB = int(os.getenv('REDIS_DB', 0))

# 缓存过期时间（秒）
CACHE_TTL_MINUTES = 300      # 分时数据缓存时间
CACHE_TTL_PRICE = 60         # 价格缓存时间
CACHE_TTL_INDICATOR = 300    # 指标缓存时间

# Mootdx连接池配置
TDX_POOL_SIZE = 5
TDX_CONNECT_TIMEOUT = 5
TDX_READ_TIMEOUT = 10

