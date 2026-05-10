"""
Mootdx 连接池管理类
"""
import threading
import time
from mootdx.quotes import Quotes
from config.settings import TDX_POOL_SIZE, TDX_CONNECT_TIMEOUT


class TdxConnection:
    """单个 TDX 连接包装"""
    
    def __init__(self):
        self.api = None
        self.last_used = 0
        self.lock = threading.Lock()
        self._connect()
    
    def _connect(self):
        """建立 TDX 连接"""
        try:
            self.api = Quotes.factory(market='std')
            self.last_used = time.time()
        except Exception:
            self.api = None
    
    def is_connected(self):
        """检查连接是否有效"""
        if not self.api:
            return False
        return True
    
    def disconnect(self):
        """断开连接"""
        if self.api:
            try:
                self.api.close()
            except Exception:
                pass
            self.api = None
    
    def reconnect(self):
        """重新连接"""
        self.disconnect()
        self._connect()


class TdxConnectionPool:
    """TDX 连接池"""
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化连接池"""
        self.pool = []
        self.lock = threading.Lock()
        self._init_pool()
    
    def _init_pool(self):
        """初始化连接池"""
        for _ in range(TDX_POOL_SIZE):
            conn = TdxConnection()
            self.pool.append(conn)
    
    def get_connection(self):
        """获取一个可用连接"""
        with self.lock:
            for conn in self.pool:
                if conn.is_connected():
                    conn.last_used = time.time()
                    return conn
            
            for conn in self.pool:
                conn.reconnect()
                if conn.is_connected():
                    conn.last_used = time.time()
                    return conn
            
            new_conn = TdxConnection()
            if new_conn.is_connected():
                self.pool.append(new_conn)
                return new_conn
            
            return None
    
    def release_connection(self, conn):
        """释放连接（放回池中）"""
        if conn:
            conn.last_used = time.time()
    
    def execute_with_connection(self, func, *args, **kwargs):
        """
        使用连接执行函数
        
        Args:
            func: 执行函数，第一个参数为 api
            *args: 函数参数
            **kwargs: 函数关键字参数
            
        Returns:
            函数返回值或 None
        """
        conn = None
        try:
            conn = self.get_connection()
            if not conn or not conn.api:
                return None
            
            return func(conn.api, *args, **kwargs)
        except Exception:
            if conn:
                conn.reconnect()
            return None
        finally:
            self.release_connection(conn)
    
    def cleanup(self):
        """清理所有连接"""
        with self.lock:
            for conn in self.pool:
                conn.disconnect()
            self.pool.clear()
    
    def get_pool_status(self):
        """获取连接池状态"""
        with self.lock:
            active = sum(1 for conn in self.pool if conn.is_connected())
            return {
                'total': len(self.pool),
                'active': active,
                'idle': len(self.pool) - active
            }