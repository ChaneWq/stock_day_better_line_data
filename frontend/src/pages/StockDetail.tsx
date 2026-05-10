import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, message, Tabs, Row, Col, Space, Badge, Spin } from 'antd';
import { ArrowLeftOutlined, StarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStockStore } from '../store';
import { RouteState } from '../types';
import { useStockData } from '../hooks';
import { MinuteChart } from '../components/charts/MinuteChart';
import { STOCK_CONFIG } from '../config/stockConfig';

const { Title, Text } = Typography;

export default function StockDetail() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { groups, addStockToGroup, aStockDate } = useStockStore();
  const { price, minutes, loading, fromCache, refresh, cacheTimestamp } = useStockData(code || '', aStockDate);

  useEffect(() => {
    const routeState = location.state as RouteState | undefined;
    if (routeState?.code) {
    }
  }, [location.state]);

  const handleAddToGroup = (groupId: string) => {
    if (!code) return;
    addStockToGroup(groupId, code);
    message.success('已添加到自选股');
  };

  const getPriceColor = (percent: number) => percent >= 0 ? 'price-up' : 'price-down';

  // 计算昨天收盘价
  const getYesterdayClose = () => {
    if (!price) return STOCK_CONFIG.DEFAULT_PRICE;
    // 从当前价格和涨跌幅反推
    const changePercent = price.change_percent / 100;
    return price.current_price / (1 + changePercent);
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    if (dateStr.length !== 8) return dateStr;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  };

  // 格式化时间戳显示
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  const tabItems = [
    {
      key: 'minute',
      label: '分时图',
      children: (
        <MinuteChart 
          data={minutes} 
          yesterdayClose={getYesterdayClose()} 
        />
      )
    },
    {
      key: 'info',
      label: '股票信息',
      children: (
        <Card>
          <Title level={4}>股票详情</Title>
          {price && (
            <div>
              <Text>代码: {price.code}</Text>
              <br />
              <div style={{ fontSize: 32, fontWeight: 'bold', marginTop: 16 }} className={getPriceColor(price.change_percent)}>
                {price.current_price.toFixed(2)}
              </div>
              <div className={getPriceColor(price.change_percent)} style={{ fontSize: 20, marginTop: 8 }}>
                {price.change_percent >= 0 ? '+' : ''}{price.change_percent.toFixed(2)}%
              </div>
            </div>
          )}
        </Card>
      )
    },
    {
      key: 'indicators',
      label: '技术指标',
      children: (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" onClick={() => navigate('/analysis/kdj', { state: { code } })}>
              查看 KDJ 指标
            </Button>
            <Button type="primary" onClick={() => navigate('/analysis/macd', { state: { code } })}>
              查看 MACD 指标
            </Button>
            <Button type="primary" onClick={() => navigate('/analysis/bbi', { state: { code } })}>
              查看 BBI 指标
            </Button>
          </Space>
        </Card>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
          {fromCache && <Badge status="success" text="缓存" />}
          <Space size="small">
            <Text type="secondary">日期: {formatDate(aStockDate)}</Text>
            {cacheTimestamp && (
              <Text type="secondary">更新: {formatTimestamp(cacheTimestamp)}</Text>
            )}
          </Space>
        </Space>
        <Space>
          <Space.Compact>
            {groups.map(group => (
              <Button
                key={group.id}
                icon={<StarOutlined />}
                onClick={() => handleAddToGroup(group.id)}
              >
                加入 {group.name}
              </Button>
            ))}
          </Space.Compact>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            刷新数据
          </Button>
        </Space>
      </div>

      {price && (
        <>
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <Title level={3} style={{ margin: 0 }}>{code}</Title>
              <div style={{ fontSize: 32, fontWeight: 'bold' }} className={getPriceColor(price.change_percent)}>
                {price.current_price.toFixed(2)}
              </div>
              <div className={getPriceColor(price.change_percent)} style={{ fontSize: 20 }}>
                {price.change_percent >= 0 ? '+' : ''}{price.change_percent.toFixed(2)}%
              </div>
            </div>
          </Card>

          <Tabs items={tabItems} defaultActiveKey="minute" />
        </>
      )}
    </div>
  );
}
