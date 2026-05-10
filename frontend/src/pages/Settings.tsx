import { useState, useEffect } from 'react';
import { Card, Typography, Button, Select, Switch, Space, Alert, Table, Divider, Tag, Row, Col, InputNumber, Input } from 'antd';
import { ReloadOutlined, DeleteOutlined, DatabaseOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useStockStore } from '../store';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Settings() {
  const { 
    cacheStrategy, setCacheStrategy,
    enablePersistentCache, setEnablePersistentCache,
    enableAutoRefresh, setEnableAutoRefresh,
    refreshInterval, setRefreshInterval,
    miniChartWidth, setMiniChartWidth,
    miniChartHeight, setMiniChartHeight,
    cachedStockData, cachedSearchData,
    clearCache, clearExpiredCache,
    aStockDate, setAStockDate
  } = useStockStore();

  const [cacheStats, setCacheStats] = useState({
    stockCount: 0,
    searchCount: 0,
    oldestDate: '',
    newestDate: ''
  });

  useEffect(() => {
    updateCacheStats();
  }, [cachedStockData, cachedSearchData]);

  const updateCacheStats = () => {
    const stockKeys = Object.keys(cachedStockData);
    const searchKeys = Object.keys(cachedSearchData);
    
    let oldestTime = Infinity;
    let newestTime = 0;
    
    stockKeys.forEach(key => {
      const data = cachedStockData[key];
      if (data.timestamp < oldestTime) oldestTime = data.timestamp;
      if (data.timestamp > newestTime) newestTime = data.timestamp;
    });
    
    searchKeys.forEach(key => {
      const data = cachedSearchData[key];
      if (data.timestamp < oldestTime) oldestTime = data.timestamp;
      if (data.timestamp > newestTime) newestTime = data.timestamp;
    });
    
    setCacheStats({
      stockCount: stockKeys.length,
      searchCount: searchKeys.length,
      oldestDate: oldestTime === Infinity ? '' : new Date(oldestTime).toLocaleString(),
      newestDate: newestTime === 0 ? '' : new Date(newestTime).toLocaleString()
    });
  };

  const handleClearCache = () => {
    clearCache();
    updateCacheStats();
  };

  const handleClearExpiredCache = () => {
    clearExpiredCache();
    updateCacheStats();
  };

  const stockColumns = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '缓存时间',
      dataIndex: 'cacheTime',
      key: 'cacheTime',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => price.toFixed(2),
    },
    {
      title: '涨跌幅',
      dataIndex: 'change',
      key: 'change',
      render: (change: number) => (
        <Text type={change >= 0 ? 'success' : 'danger'}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </Text>
      ),
    },
  ];

  const stockData = Object.keys(cachedStockData).map(key => {
    const data = cachedStockData[key];
    const [code, date] = key.split('_');
    return {
      key,
      code,
      date,
      cacheTime: new Date(data.timestamp).toLocaleString(),
      price: data.price.current_price,
      change: data.price.change_percent,
    };
  });

  const searchColumns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '缓存时间',
      dataIndex: 'cacheTime',
      key: 'cacheTime',
    },
    {
      title: '结果数量',
      dataIndex: 'resultCount',
      key: 'resultCount',
    },
  ];

  const searchData = Object.keys(cachedSearchData).map(key => {
    const data = cachedSearchData[key];
    return {
      key,
      keyword: key,
      cacheTime: new Date(data.timestamp).toLocaleString(),
      resultCount: data.results.length,
    };
  });

  const getStrategyDescription = () => {
    switch (cacheStrategy) {
      case 'cache-only':
        return '只使用缓存，不请求API';
      case 'cache-first':
        return '优先使用缓存，手动刷新时请求API';
      case 'network-first':
        return '优先请求API，失败时使用缓存';
      default:
        return '';
    }
  };

  const getStrategyTag = () => {
    switch (cacheStrategy) {
      case 'cache-only':
        return <Tag color="orange">仅缓存</Tag>;
      case 'cache-first':
        return <Tag color="green">缓存优先</Tag>;
      case 'network-first':
        return <Tag color="blue">网络优先</Tag>;
      default:
        return null;
    }
  };



  return (
    <div>
      <Title level={2}>系统设置</Title>

      <Card 
        title={
          <Space>
            <SyncOutlined />
            定时刷新设置
          </Space>
        } 
        style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              启用定时刷新
            </Text>
            <Switch
              checked={enableAutoRefresh}
              onChange={setEnableAutoRefresh}
            />
            <Text type="secondary" style={{ marginLeft: 12 }}>
              {enableAutoRefresh ? '已启用' : '未启用'}
            </Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              刷新间隔
            </Text>
            <Space>
              <InputNumber
                value={refreshInterval}
                onChange={setRefreshInterval}
                min={10}
                step={10}
                style={{ width: 150 }}
                disabled={!enableAutoRefresh}
                addonAfter="秒"
              />
              <Text type="secondary">
                间隔 {refreshInterval} 秒自动刷新数据
              </Text>
            </Space>
          </div>

          <Alert
            message="提示"
            description="只有在当前页面停留时才会自动刷新。页面跳转、返回时不会自动请求接口，节省后端资源。"
            type="info"
            showIcon
          />
        </Space>
      </Card>

      <Card title="缓存策略设置" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              缓存策略 {getStrategyTag()}
            </Text>
            <Select
              value={cacheStrategy}
              onChange={setCacheStrategy}
              style={{ width: 300 }}
            >
              <Option value="cache-only">仅缓存</Option>
              <Option value="cache-first">缓存优先（推荐）</Option>
              <Option value="network-first">网络优先</Option>
            </Select>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {getStrategyDescription()}
            </Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              持久化缓存
            </Text>
            <Switch
              checked={enablePersistentCache}
              onChange={setEnablePersistentCache}
            />
            <Text type="secondary" style={{ marginLeft: 12 }}>
              {enablePersistentCache ? '已启用，缓存数据会保存到本地存储' : '未启用，刷新页面后缓存会丢失'}
            </Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              默认交易日期
            </Text>
            <Space>
              <Input
                value={aStockDate}
                onChange={(e) => setAStockDate(e.target.value)}
                style={{ width: 200 }}
                placeholder="例如：20260508"
              />
              <Text type="secondary">
                格式：YYYYMMDD
              </Text>
            </Space>
          </div>
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              分时卡片尺寸
            </Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Text style={{ width: 60 }}>宽度</Text>
                <InputNumber
                  value={miniChartWidth}
                  onChange={setMiniChartWidth}
                  min={100}
                  max={500}
                  step={10}
                  style={{ width: 150 }}
                  addonAfter="像素"
                />
                <Text style={{ width: 60 }}>高度</Text>
                <InputNumber
                  value={miniChartHeight}
                  onChange={setMiniChartHeight}
                  min={40}
                  max={200}
                  step={10}
                  style={{ width: 150 }}
                  addonAfter="像素"
                />
              </Space>
              <Text type="secondary">
                当前尺寸：{miniChartWidth} × {miniChartHeight} 像素（宽 × 高）
              </Text>
            </Space>
          </div>
        </Space>
      </Card>

      <Card 
        title={
          <Space>
            <DatabaseOutlined />
            缓存数据统计
          </Space>
        } 
        style={{ marginBottom: 24 }}
      >
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={updateCacheStats}>
            刷新统计
          </Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleClearExpiredCache}>
            清理30天前缓存
          </Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleClearCache}>
            清空全部缓存
          </Button>
        </Space>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Text type="secondary">股票缓存数量</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{cacheStats.stockCount}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Text type="secondary">搜索缓存数量</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{cacheStats.searchCount}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Text type="secondary">最早缓存时间</Text>
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>{cacheStats.oldestDate || '-'}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Text type="secondary">最新缓存时间</Text>
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>{cacheStats.newestDate || '-'}</div>
            </Card>
          </Col>
        </Row>

        {cacheStats.stockCount > 0 && (
          <>
            <Divider />
            <Title level={4} style={{ marginTop: 16 }}>股票缓存详情</Title>
            <Table
              columns={stockColumns}
              dataSource={stockData}
              pagination={{ pageSize: 10 }}
            />
          </>
        )}

        {cacheStats.searchCount > 0 && (
          <>
            <Divider />
            <Title level={4}>搜索缓存详情</Title>
            <Table
              columns={searchColumns}
              dataSource={searchData}
              pagination={{ pageSize: 10 }}
            />
          </>
        )}

        {cacheStats.stockCount === 0 && cacheStats.searchCount === 0 && (
          <Alert
            message="暂无缓存数据"
            description="去搜索或查看一些股票，数据会自动缓存。"
            type="info"
            showIcon
          />
        )}
      </Card>

      <Card title="使用说明">
        <ul>
          <li><Text strong>API调用时机：</Text>只在以下3种情况请求接口，节省后端资源</li>
          <ol>
            <li>没有缓存数据时</li>
            <li>手动点击"刷新数据"按钮时</li>
            <li>启用定时刷新后，页面停留期间按间隔自动刷新</li>
          </ol>
          <li><Text strong>页面跳转、返回：</Text>不会自动请求接口，直接使用缓存</li>
          <li><Text strong>缓存优先：</Text>有缓存时直接显示，无需等待API响应，速度快</li>
          <li><Text strong>手动刷新：</Text>点击刷新按钮可强制更新数据</li>
          <li><Text strong>定时刷新：</Text>可在设置中配置，自动按间隔更新数据</li>
        </ul>
      </Card>
    </div>
  );
}
