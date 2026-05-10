"""
股票数据访问层
"""
import pandas as pd
from utils.indicator_util import KDJ, MACD, BBI
from utils.tdx_pool import TdxConnectionPool


class StockRepository:
    """股票数据仓库"""
    
    def __init__(self):
        """初始化连接池"""
        self.pool = TdxConnectionPool()
    
    def get_bars(self, code: str, frequency: str = 'day', offset: int = 300):
        """
        获取K线数据（使用连接池）
        
        Args:
            code: 股票代码
            frequency: 频率 ('day', 'week', 'mon')
            offset: 偏移量
            
        Returns:
            DataFrame: K线数据
        """
        def fetch_bars(api):
            df = api.bars(symbol=code, frequency=frequency, offset=offset)
            if df is None or df.empty:
                return None
            custom_index = pd.RangeIndex(start=1, stop=len(df)+1, step=1)
            df.set_index(custom_index, inplace=True)
            return df
        
        return self.pool.execute_with_connection(fetch_bars)
    
    def get_minutes(self, code: str, date: str):
        """
        获取分时数据（使用连接池）
        
        Args:
            code: 股票代码
            date: 日期 (YYYYMMDD)
            
        Returns:
            DataFrame: 分时数据
        """
        def fetch_minutes(api):
            df = api.minutes(symbol=code, date=date)
            return df
        
        return self.pool.execute_with_connection(fetch_minutes)
    
    def get_current_price(self, code: str):
        """
        获取指定股票的最新价格
        
        Args:
            code: 股票代码
            
        Returns:
            float: 股票最新价格
        """
        df = self.get_bars(code, 'day', 1)
        
        if df is not None and not df.empty:
            return df['close'].iloc[-1]
        return 0
    
    def get_current_data(self, code: str):
        """
        获取指定股票的最新数据和前一日数据
        
        Args:
            code: 股票代码
            
        Returns:
            tuple: (最新数据, 前一日数据)
        """
        df = self.get_bars(code, 'day', 2)
        
        if df is not None and len(df) >= 2:
            current_data = df.iloc[-1]
            previous_data = df.iloc[-2]
            previous_data = previous_data.add_prefix('prev_')
            return current_data, previous_data
        elif df is not None and len(df) == 1:
            current_data = df.iloc[-1]
            previous_data = pd.Series(dtype='object')
            return current_data, previous_data
        
        return pd.Series(dtype='object'), pd.Series(dtype='object')
    
    def get_kdj(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取KDJ指标
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            tuple: (K, D, J)
        """
        frequency_map = {
            'day': 'day',
            'week': 'week',
            'mon': 'mon'
        }
        
        df = self.get_bars(code, frequency_map[period], 300)
        
        if df is None:
            return 0, 0, 0
            
        try:
            close = df['close']
            high = df['high']
            low = df['low']
        except:
            return 0, 0, 0
            
        K, D, J = KDJ(close, high, low)
        
        if datestr == "":
            return K[-1], D[-1], J[-1]
        else:
            try:
                index = df[df['datetime'].str.contains(datestr)].index - 1
                return K[index][0], D[index][0], J[index][0]
            except:
                return 0, 0, 0
    
    def get_macd(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取MACD指标
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            tuple: (DIF, DEA, MACD)
        """
        frequency_map = {
            'day': 'day',
            'week': 'week',
            'mon': 'mon'
        }
        
        df = self.get_bars(code, frequency_map[period], 300)
        
        if df is None:
            return 0, 0, 0
            
        try:
            close = df['close']
        except:
            return 0, 0, 0
            
        DIF, DEA, MACD_val = MACD(close)
        
        if datestr == "":
            return DIF[-1], DEA[-1], MACD_val[-1]
        else:
            try:
                index = df[df['datetime'].str.contains(datestr)].index - 1
                return DIF[index][0], DEA[index][0], MACD_val[index][0]
            except:
                return 0, 0, 0
    
    def get_bbi(self, code: str, period: str = 'day', datestr: str = ""):
        """
        获取BBI指标
        
        Args:
            code: 股票代码
            period: 周期 ('day', 'week', 'mon')
            datestr: 日期 (YYYY-MM-DD)
            
        Returns:
            float: BBI值
        """
        frequency_map = {
            'day': 'day',
            'week': 'week',
            'mon': 'mon'
        }
        
        df = self.get_bars(code, frequency_map[period], 300)
        
        if df is None:
            return 0
            
        try:
            close = df['close']
        except:
            return 0
            
        BBI_val = BBI(close)
        
        if datestr == "":
            return BBI_val[-1]
        else:
            try:
                index = df[df['datetime'].str.contains(datestr)].index - 1
                return BBI_val[index][0]
            except:
                return 0