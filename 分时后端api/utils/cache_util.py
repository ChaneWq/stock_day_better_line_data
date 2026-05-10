"""
缓存工具类 - Redis 客户端封装
"""
import redis
import json
from config.settings import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB


class CacheClient:
    """Redis 缓存客户端"""
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化 Redis 连接"""
        self.client = None
        self._connect()
    
    def _connect(self):
        """建立 Redis 连接"""
        try:
            self.client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                db=REDIS_DB,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
            self.client.ping()
        except Exception as e:
            self.client = None
    
    def get(self, key: str):
        """
        获取缓存值
        
        Args:
            key: 缓存键
            
        Returns:
            str/None: 缓存值或 None
        """
        if not self.client:
            return None
        
        try:
            return self.client.get(key)
        except Exception:
            return None
    
    def set(self, key: str, value: str, ex: int = None):
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            ex: 过期时间（秒）
            
        Returns:
            bool: 是否成功
        """
        if not self.client:
            return False
        
        try:
            self.client.set(key, value, ex=ex)
            return True
        except Exception:
            return False
    
    def delete(self, key: str):
        """
        删除缓存
        
        Args:
            key: 缓存键
            
        Returns:
            bool: 是否成功
        """
        if not self.client:
            return False
        
        try:
            self.client.delete(key)
            return True
        except Exception:
            return False
    
    def exists(self, key: str):
        """
        检查缓存是否存在
        
        Args:
            key: 缓存键
            
        Returns:
            bool: 是否存在
        """
        if not self.client:
            return False
        
        try:
            return self.client.exists(key) > 0
        except Exception:
            return False
    
    def get_json(self, key: str):
        """
        获取 JSON 格式缓存
        
        Args:
            key: 缓存键
            
        Returns:
            dict/list/None: 解析后的 JSON 数据
        """
        value = self.get(key)
        if value is None:
            return None
        
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    
    def set_json(self, key: str, value, ex: int = None):
        """
        设置 JSON 格式缓存
        
        Args:
            key: 缓存键
            value: 要缓存的数据（dict 或 list）
            ex: 过期时间（秒）
            
        Returns:
            bool: 是否成功
        """
        try:
            json_value = json.dumps(value)
            return self.set(key, json_value, ex)
        except (TypeError, ValueError):
            return False
    
    def flush_pattern(self, pattern: str):
        """
        按模式删除缓存
        
        Args:
            pattern: 键模式（如 "stock:*"）
            
        Returns:
            int: 删除的键数量
        """
        if not self.client:
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception:
            return 0
    
    def is_available(self):
        """
        检查缓存是否可用
        
        Returns:
            bool: 是否可用
        """
        if not self.client:
            return False
        
        try:
            self.client.ping()
            return True
        except Exception:
            return False