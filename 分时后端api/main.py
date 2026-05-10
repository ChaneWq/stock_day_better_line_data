"""
应用入口文件
"""
from flask import Flask, Response
import orjson
from flask_compress import Compress
from flask_caching import Cache
from config.settings import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
from repository.stock_repository import StockRepository
from service.stock_service import StockService
from controller.api_controller import create_api_routes
from utils.cache_util import CacheClient


def orjson_dumps(obj, **kwargs):
    """使用 orjson 加速序列化"""
    return orjson.dumps(obj, option=orjson.OPT_SERIALIZE_NUMPY, **kwargs).decode('utf-8')


def create_app():
    """创建并配置Flask应用"""
    app = Flask(__name__)
    
    # 使用 orjson 替代默认 json 序列化
    app.json_encoder = None
    app.json_serializer = orjson_dumps
    
    # 启用 Gzip 压缩
    Compress(app)
    
    # 配置 Flask-Caching（内存缓存）
    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 60
    app.config['CACHE_THRESHOLD'] = 1000
    cache = Cache(app)
    
    # 初始化各层
    stock_repository = StockRepository()
    cache_client = CacheClient()
    stock_service = StockService(stock_repository, cache_client)
    
    # 注册路由
    create_api_routes(app, stock_service, cache)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)