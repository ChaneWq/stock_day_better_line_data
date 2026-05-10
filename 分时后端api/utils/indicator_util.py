"""
技术指标工具函数
"""
import pandas as pd
import numpy as np

def RD(N, D=3):
    """四舍五入取3位小数"""
    return np.round(N, D)

def REF(S, N=1):
    """对序列整体下移动N,返回序列(shift后会产生NAN)"""
    return pd.Series(S).shift(N).values

def DIFF(S, N=1):
    """前一个值减后一个值,前面会产生nan"""
    return pd.Series(S).diff(N).values

def STD(S, N):
    """求序列的N日标准差，返回序列"""
    return pd.Series(S).rolling(N).std(ddof=0).values

def SUM(S, N):
    """对序列求N天累计和，返回序列 N=0对序列所有依次求和"""
    return pd.Series(S).rolling(N).sum().values if N > 0 else pd.Series(S).cumsum().values

def CONST(S):
    """返回序列S最后的值组成常量序列"""
    return np.full(len(S), S[-1])

def HHV(S, N):
    """HHV(C, 5) 最近5天收盘最高价"""
    return pd.Series(S).rolling(N).max().values

def LLV(S, N):
    """LLV(C, 5) 最近5天收盘最低价"""
    return pd.Series(S).rolling(N).min().values

def HHVBARS(S, N):
    """求N周期内S最高值到当前周期数, 返回序列"""
    return pd.Series(S).rolling(N).apply(lambda x: np.argmax(x[::-1]), raw=True).values

def LLVBARS(S, N):
    """求N周期内S最低值到当前周期数, 返回序列"""
    return pd.Series(S).rolling(N).apply(lambda x: np.argmin(x[::-1]), raw=True).values

def MA(S, N):
    """求序列的N日简单移动平均值，返回序列"""
    return pd.Series(S).rolling(N).mean().values

def EMA(S, N):
    """指数移动平均,为了精度 S>4*N EMA至少需要120周期 alpha=2/(span+1)"""
    return pd.Series(S).ewm(span=N, adjust=False).mean().values

def SMA(S, N, M=1):
    """中国式的SMA,至少需要120周期才精确 (雪球180周期) alpha=1/(1+com)"""
    return pd.Series(S).ewm(alpha=M/N, adjust=False).mean().values

def DMA(S, A):
    """求S的动态移动平均，A作平滑因子,必须 0<A<1 (此为核心函数，非指标)"""
    return pd.Series(S).ewm(alpha=A, adjust=True).mean().values

def WMA(S, N):
    """通达信S序列的N日加权移动平均 Yn=(1*X1+2*X2+3*X3+...+n*Xn)/(1+2+3+...+Xn)"""
    return pd.Series(S).rolling(N).apply(lambda x: x[::-1].cumsum().sum()*2/N/(N+1), raw=True).values

def AVEDEV(S, N):
    """平均绝对偏差 (序列与其平均值的绝对差的平均值)"""
    return pd.Series(S).rolling(N).apply(lambda x: (np.abs(x-x.mean())).mean()).values

def SLOPE(S, N):
    """返S序列N周期回线性回归斜率"""
    return pd.Series(S).rolling(N).apply(lambda x: np.polyfit(range(N), x, deg=1)[0], raw=True).values

def FORCAST(S, N):
    """返回S序列N周期回线性回归后的预测值"""
    return pd.Series(S).rolling(N).apply(lambda x: np.polyval(np.polyfit(range(N), x, deg=1), N-1), raw=True).values

def LAST(S, A, B):
    """从前A日到前B日一直满足S_BOOL条件, 要求A>B & A>0 & B>=0"""
    return np.array(pd.Series(S).rolling(A+1).apply(lambda x: np.all(x[::-1][B:]), raw=True), dtype=bool)

def ABS(S):
    """返回N的绝对值"""
    return np.abs(S)

def MAX(S1, S2):
    """序列max"""
    return np.maximum(S1, S2)

def MIN(S1, S2):
    """序列min"""
    return np.minimum(S1, S2)

def IF(S, A, B):
    """序列布尔判断 return=A if S==True else B"""
    return np.where(S, A, B)

def AND(S1, S2):
    """AND"""
    return np.logical_and(S1, S2)

def OR(S1, S2):
    """OR"""
    return np.logical_or(S1, S2)

def COUNT(S, N):
    """COUNT(CLOSE>O, N): 最近N天满足S_BOOL的天数 True的天数"""
    return SUM(S, N)

def EVERY(S, N):
    """EVERY(CLOSE>O, 5) 最近N天是否都是True"""
    return IF(SUM(S, N) == N, True, False)

def EXIST(S, N):
    """EXIST(CLOSE>3010, N=5) n日内是否存在一天大于3000点"""
    return IF(SUM(S, N) > 0, True, False)

def CROSS(S1, S2):
    """判断向上金叉穿越"""
    return np.concatenate(([False], np.logical_not((S1 > S2)[:-1]) & (S1 > S2)[1:]))

def KDJ(CLOSE, HIGH, LOW, N=9, M1=3, M2=3):
    """
    超卖超买类
    KDJ指标
    """
    RSV = (CLOSE - LLV(LOW, N)) / (HHV(HIGH, N) - LLV(LOW, N)) * 100
    K = SMA(RSV, M1, 1)
    D = SMA(K, M2, 1)
    J = 3 * K - 2 * D
    return K, D, J

def MACD(CLOSE, SHORT=12, LONG=26, MID=9):
    """
    平滑异同平均线
    """
    DIF = EMA(CLOSE, SHORT) - EMA(CLOSE, LONG)
    DEA = EMA(DIF, MID)
    MACD = (DIF - DEA) * 2
    return DIF, DEA, MACD

def BBI(CLOSE, M1=3, M2=6, M3=12, M4=24):
    """
    多空均线
    """
    BBI = (MA(CLOSE, M1) + MA(CLOSE, M2) + MA(CLOSE, M3) + MA(CLOSE, M4)) / 4
    return BBI
