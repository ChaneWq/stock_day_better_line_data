import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Typography, Spin, Button, Alert, Badge, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { RiseOutlined, SearchOutlined, StarOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import { StockPrice } from '../types';
import { useStockStore } from '../store';
import { useAutoRefresh } from '../hooks/useStockData';

const { Title, Text } = Typography;

const popularStocks = ['000400', '600519', '601318', '000001'];

export default function Home() {
  const navigate = useNavigate();
  const { 
    getCachedStockData, 
    setCachedStockData, 
    aStockDate, 
    enableAutoRefresh, 
    refreshInterval 
  } = useStockStore();
  const [stockData, setStockData] = useState<Map<string, StockPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiStatusMessage, setApiStatusMessage] = useState('');
  const [cacheInfo, setCacheInfo] = useState<{ cached: number; total: number }>({ cached: 0, total: 0 });

  // 从API获取数据
  const fetchFromApi = useCallback(async (targetMap: Map<string, StockPrice>): Promise<void> => {
    for (const code of popularStocks) {
      try {
        const res = await stockApi.getStockPrice(code);
        if (res.code === 200) {
          targetMap.set(code, res.data);
          // 同时缓存分时数据（空数组，因为首页不需要）
          setCachedStockData(code, res.data, [], aStockDate);
        }
      } catch (e) {
        console.error(`加载股票 ${code} 失败:`, e);
      }
    }
  }, [aStockDate, setCachedStockData]);

  // 加载数据
  const loadStockData = useCallback(async (forceRefresh = false): Promise<void> => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const data = new Map<string, StockPrice>();
    let cachedCount = 0;
    let needsFetch = false;

    // 首先尝试从缓存获取
    for (const code of popularStocks) {
      const cached = getCachedStockData(code, aStockDate);
      if (cached) {
        data.set(code, cached.price);
        cachedCount++;
      } else {
        needsFetch = true;
      }
    }

    // 如果有缓存，先显示缓存数据
    if (data.size > 0) {
      setStockData(new Map(data));
      setCacheInfo({ cached: cachedCount, total: popularStocks.length });
      
      // 如果不强制刷新且不是所有数据都缺失，直接返回
      if (!forceRefresh && cachedCount > 0) {
        if (!forceRefresh) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
        return;
      }
    }

    // 需要从API获取数据的情况
    if (needsFetch || forceRefresh) {
      await fetchFromApi(data);
      
      // 更新缓存计数
      cachedCount = 0;
      for (const code of popularStocks) {
        if (getCachedStockData(code, aStockDate)) {
          cachedCount++;
        }
      }
      
      setStockData(new Map(data));
      setCacheInfo({ cached: cachedCount, total: popularStocks.length });
    }

    if (forceRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, [aStockDate, getCachedStockData, fetchFromApi]);

  // 检查API状态
  const checkApiStatus = useCallback(async (): Promise<void> => {
    setApiStatus('checking');
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const responseTime = Date.now() - startTime;
      setApiResponseTime(responseTime);
      
      if (response.ok) {
        const data = await response.json();
        if (data.code === 200) {
          setApiStatus('online');
          setApiStatusMessage(`API在线 (${responseTime}ms)`);
        } else {
          setApiStatus('offline');
          setApiStatusMessage(`API响应异常: ${data.message || data.code}`);
        }
      } else {
        setApiStatus('offline');
        setApiStatusMessage(`API响应异常: ${response.status}`);
      }
    } catch (e) {
      console.error('API连接错误:', e);
      setApiStatus('offline');
      setApiStatusMessage(`连接失败: ${e instanceof Error ? e.message : '未知错误'}`);
      setApiResponseTime(null);
    }
  }, []);

  // 响应时间状态
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);

  // 定时刷新
  const refreshCallback = useCallback(() => {
    loadStockData(true);
  }, [loadStockData]);

  useAutoRefresh(refreshCallback, enableAutoRefresh, refreshInterval, [aStockDate]);

  // 初始化
  useEffect(() => {
    checkApiStatus();
    loadStockData(false);
  }, []);

  const getPriceColor = (percent: number) => percent >= 0 ? 'price-up' : 'price-down';

  const renderApiStatusBadge = () => {
    switch (apiStatus) {
      case 'online':
        return (
          <Badge 
            status="success" 
            text={
              <span style={{ color: '#52c41a', fontWeight: 500 }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                {apiStatusMessage}
              </span>
            } 
          />
        );
      case 'offline':
        return (
          <Badge 
            status="error" 
            text={
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                <CloseCircleOutlined style={{ marginRight: 4 }} />
                {apiStatusMessage}
              </span>
            } 
          />
        );
      default:
        return (
          <Badge 
            status="processing" 
            text="正在检查API状态..." 
          />
        );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>欢迎来到A股股票分析平台</Title>
        <Space>
          <Badge 
            status={cacheInfo.cached > 0 ? 'success' : 'default'} 
            text={
              <span style={{ color: cacheInfo.cached > 0 ? '#52c41a' : '#999' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                缓存: {cacheInfo.cached}/{cacheInfo.total}
              </span>
            } 
          />
          {enableAutoRefresh && (
            <Badge 
              status="processing" 
              text={`自动刷新: ${refreshInterval}秒`} 
            />
          )}
          {renderApiStatusBadge()}
          <Button 
            icon={<ReloadOutlined />} 
            onClick={checkApiStatus}
            size="small"
          >
            检查API
          </Button>
        </Space>
      </div>
      
      <Text type="secondary">实时行情监控，智能技术分析 - 优先使用缓存，手动刷新更新数据</Text>

      {apiStatus === 'offline' && (
        <Alert
          message="后端API未连接"
          description="请确保后端服务运行在 http://localhost:5000，当前显示缓存数据"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            onClick={() => navigate('/search')}
            style={{ textAlign: 'center' }}
          >
            <SearchOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={4} style={{ marginTop: 16 }}>股票搜索</Title>
            <Text type="secondary">快速查找并分析股票</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            onClick={() => navigate('/portfolio')}
            style={{ textAlign: 'center' }}
          >
            <StarOutlined style={{ fontSize: 48, color: '#faad14' }} />
            <Title level={4} style={{ marginTop: 16 }}>自选股管理</Title>
            <Text type="secondary">多分组管理，多股同列</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            hoverable 
            onClick={() => navigate('/analysis/kdj')}
            style={{ textAlign: 'center' }}
          >
            <RiseOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 16 }}>技术分析</Title>
            <Text type="secondary">KDJ/MACD/BBI指标</Text>
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>热门股票</Title>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={() => loadStockData(true)}
          loading={refreshing}
        >
          刷新数据
        </Button>
      </div>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {Array.from(stockData.values()).map((stock) => {
            const cached = getCachedStockData(stock.code, aStockDate);
            const isCached = !!cached;
            const cacheTime = cached ? new Date(cached.timestamp).toLocaleString() : '';
            
            return (
              <Col xs={24} sm={12} md={6} key={stock.code}>
                <Card 
                  hoverable 
                  onClick={() => navigate(`/stock/${stock.code}`)}
                  extra={
                    isCached ? (
                      <Badge status="success" text="缓存" title={cacheTime} />
                    ) : null
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>{stock.code}</Text>
                      <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 8 }} className={getPriceColor(stock.change_percent)}>
                        {stock.current_price.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={getPriceColor(stock.change_percent)} style={{ fontSize: 18, fontWeight: 'bold' }}>
                        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
        
        {stockData.size === 0 && !loading && (
          <Alert
            message="暂无数据"
            description="请点击刷新按钮从API获取数据，或确保API服务正在运行"
            type="info"
            showIcon
          />
        )}
      </Spin>
    </div>
  );
}
