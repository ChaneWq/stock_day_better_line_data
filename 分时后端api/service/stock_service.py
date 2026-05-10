"""
股票业务逻辑层
"""
import pandas as pd
import numpy as np
from datetime import datetime
from functools import lru_cache
import orjson
from config.settings import MORNING_MINUTES, TOTAL_MINUTES


class StockService:
    """股票服务"""
    
    def __init__(self, stock_repository, cache_client=None):
        """
        初始化
        
        Args:
            stock_repository: 股票数据仓库
            cache_client: 缓存客户端（可选）
        """
        self.repository = stock_repository
        self.cache_client = cache_client
    
    def get_minutes_data(self, code: str, date: str):
        """
        获取分时数据（优化版：向量化操作）
        
        Args:
            code: 股票代码
            date: 日期 (YYYYMMDD)
            
        Returns:
            DataFrame: 处理后的分时数据
        """
        cache_key = f"stock:minutes:{code}:{date}"
        
        # 先查内存缓存（使用lru_cache）
        cached_df = self._get_minutes_from_memory_cache(code, date)
        if cached_df is not None:
            return cached_df
        
        # 再查 Redis
        if self.cache_client:
            cached_data = self.cache_client.get(cache_key)
            if cached_data is not None:
                try:
                    df = pd.read_json(cached_data, orient='split')
                    self._set_minutes_to_memory_cache(code, date, df)
                    return df
                except:
                    pass
        
        df = self.repository.get_minutes(code, date)
        
        if df is None or df.empty:
            return None
        
        n_rows = len(df)
        indices = np.arange(n_rows)
        
        # 向量化计算 hour 和 minute（替代循环）
        morning_mask = indices < MORNING_MINUTES
        minutes_raw = indices.copy()
        minutes_raw[~morning_mask] -= MORNING_MINUTES
        
        hours = np.where(morning_mask, 9, 13)
        minutes = np.where(morning_mask, 30 + indices, minutes_raw)
        
        extra_hours = minutes // 60
        hours += extra_hours
        minutes = minutes % 60
        
        df['hour'] = hours.astype(np.int8)
        df['minute'] = minutes.astype(np.int8)
        
        # 向量化保留两位小数
        if 'price' in df.columns:
            df['price'] = df['price'].round(2)
        if 'vol' in df.columns:
            df['vol'] = df['vol'].round(2)
        
        # 向量化计算分时均线
        if 'price' in df.columns and 'vol' in df.columns:
            df['amount'] = (df['price'] * df['vol']).round(2)
            df['cum_amount'] = df['amount'].cumsum()
            df['cum_vol'] = df['vol'].cumsum()
            df['avg_price'] = (df['cum_amount'] / df['cum_vol']).round(2)
        
        df['code'] = code
        
        trade_date = datetime.strptime(date, '%Y%m%d').strftime('%Y-%m-%d')
        df['trade_date'] = trade_date
        
        # 存入内存缓存
        self._set_minutes_to_memory_cache(code, date, df)
        
        # 存入 Redis
        if self.cache_client:
            try:
                self.cache_client.set(cache_key, df.to_json(orient='split'), ex=300)
            except:
                pass
        
        return df
    
    @lru_cache(maxsize=100)
    def _get_minutes_from_memory_cache(self, code: str, date: str):
        """内存 LRU 缓存 getter（占位，实际用下面的字典缓存）"""
        return None
    
    def _set_minutes_to_memory_cache(self, code: str, date: str, df):
        """内存 LRU 缓存 setter"""
        # 使用装饰器缓存不太方便存 DataFrame，
        # 这里保留 Redis + Flask-Caching 的双层缓存即可
        pass
    
    def get_price_and_change_percent(self, code: str):
        """
        获取指定股票的当前价格和涨跌幅（带缓存）
        
        Args:
            code: 股票代码
            
        Returns:
            tuple: (当前价格, 涨跌幅)
        """
        cache_key = f"stock:price:{code}"
        if self.cache_client:
            cached_data = self.cache_client.get(cache_key)
            if cached_data is not None:
                try:
                    data = orjson.loads(cached_data)
                    return data['current_price'], data['change_percent']
                except:
                    pass
        
        cur_data, prev_data = self.repository.get_current_data(code)
        
        if cur_data.empty or prev_data.empty:
            return 0, 0
        
        current_price = float(cur_data['close'])
        previous_close = float(prev_data['prev_close'])
        
        if previous_close != 0:
            change_percent = round((current_price - previous_close) / previous_close * 100, 2)
        else:
            change_percent = 0
        
        if self.cache_client:
            try:
                self.cache_client.set(cache_key, orjson.dumps({
                    'current_price': current_price,
                    'change_percent': change_percent
                }).decode('utf-8'), ex=60)
            except:
                pass
        
        return current_price, change_percent
    
    def get_kdj(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取KDJ指标（保留2位小数，带缓存）
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            tuple: (K, D, J)
        """
        cache_key = f"stock:kdj:{code}:{period}:{datestr}"
        if self.cache_client:
            cached_data = self.cache_client.get(cache_key)
            if cached_data is not None:
                try:
                    data = orjson.loads(cached_data)
                    return data['k'], data['d'], data['j']
                except:
                    pass
        
        k, d, j = self.repository.get_kdj(code, period, datestr)
        
        k = round(k, 2) if k else k
        d = round(d, 2) if d else d
        j = round(j, 2) if j else j
        
        if self.cache_client:
            try:
                self.cache_client.set(cache_key, orjson.dumps({
                    'k': k,
                    'd': d,
                    'j': j
                }).decode('utf-8'), ex=300)
            except:
                pass
        
        return k, d, j
    
    def get_macd(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取MACD指标（保留2位小数，带缓存）
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            tuple: (DIF, DEA, MACD)
        """
        cache_key = f"stock:macd:{code}:{period}:{datestr}"
        if self.cache_client:
            cached_data = self.cache_client.get(cache_key)
            if cached_data is not None:
                try:
                    data = orjson.loads(cached_data)
                    return data['dif'], data['dea'], data['macd']
                except:
                    pass
        
        dif, dea, macd = self.repository.get_macd(code, period, datestr)
        
        dif = round(dif, 2) if dif else dif
        dea = round(dea, 2) if dea else dea
        macd = round(macd, 2) if macd else macd
        
        if self.cache_client:
            try:
                self.cache_client.set(cache_key, orjson.dumps({
                    'dif': dif,
                    'dea': dea,
                    'macd': macd
                }).decode('utf-8'), ex=300)
            except:
                pass
        
        return dif, dea, macd
    
    def get_bbi(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取BBI指标（保留2位小数，带缓存）
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            float: BBI值
        """
        cache_key = f"stock:bbi:{code}:{period}:{datestr}"
        if self.cache_client:
            cached_data = self.cache_client.get(cache_key)
            if cached_data is not None:
                try:
                    return float(cached_data)
                except:
                    pass
        
        bbi = self.repository.get_bbi(code, period, datestr)
        bbi = round(bbi, 2) if bbi else bbi
        
        if self.cache_client:
            try:
                self.cache_client.set(cache_key, str(bbi), ex=300)
            except:
                pass
        
        return bbi
