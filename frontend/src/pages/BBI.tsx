import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Typography, Input, Button, Select, Space, message, Statistic } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import { RouteState } from '../types';

const { Title, Text } = Typography;

export default function BBI() {
  const location = useLocation();
  const [code, setCode] = useState((location.state as RouteState)?.code || '');
  const [period, setPeriod] = useState('day');
  const [data, setData] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!code.trim()) {
      message.warning('请输入股票代码');
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.getBBI(code.trim(), period);
      if (res.code === 200) {
        setData(res.data.bbi);
      } else {
        setData(null);
        message.error('获取数据失败');
      }
    } catch (e) {
      setData(null);
      message.error('请求失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (code) {
      loadData();
    }
  }, [period]);

  return (
    <div>
      <Title level={2}>BBI 多空均线</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        BBI（多空均线）是一种将不同日数移动平均线加权平均之后的综合指标，属于均线型指标。
      </Text>

      <Space style={{ marginBottom: 24 }}>
        <Input
          placeholder="请输入股票代码"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={loadData}
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
        />
        <Select
          value={period}
          onChange={setPeriod}
          options={[
            { label: '日K', value: 'day' },
            { label: '周K', value: 'week' },
            { label: '月K', value: 'mon' },
          ]}
          style={{ width: 120 }}
        />
        <Button type="primary" onClick={loadData} loading={loading} icon={<ReloadOutlined />}>
          查询
        </Button>
      </Space>

      {data !== null && (
        <>
          <Card style={{ marginBottom: 24 }}>
            <Statistic title="BBI 多空均线" value={data} precision={2} valueStyle={{ color: '#722ed1', fontSize: 48 }} />
          </Card>

          <Card title="BBI指标说明" style={{ marginTop: 24 }}>
            <ul>
              <li>BBI指标是将不同日数移动平均线加权平均后的综合指标</li>
              <li>股价在高价区以收盘价向下跌破多空线为卖出信号</li>
              <li>股价在低价区以收盘价向上突破多空线为买入信号</li>
              <li>多空指数由下向上递增，股价在多空线上方，表明多头势强，可以继续持股</li>
              <li>多空指数由上向下递减，股价在多空线下方，表明空头势强，一般不宜买入</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
