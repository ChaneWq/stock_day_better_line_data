import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Typography, Input, Button, Select, Space, message, Statistic, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import { MACDData, RouteState } from '../types';

const { Title, Text } = Typography;

export default function MACD() {
  const location = useLocation();
  const [code, setCode] = useState((location.state as RouteState)?.code || '');
  const [period, setPeriod] = useState('day');
  const [data, setData] = useState<MACDData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!code.trim()) {
      message.warning('请输入股票代码');
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.getMACD(code.trim(), period);
      if (res.code === 200) {
        setData(res.data.macd);
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

  const getAnalysis = () => {
    if (!data) return '';
    let result = '';
    if (data.dif > 0 && data.dea > 0 && data.macd > 0) {
      result += '多头市场\n';
    } else if (data.dif < 0 && data.dea < 0 && data.macd < 0) {
      result += '空头市场\n';
    }
    if (data.dif > data.dea) {
      result += 'DIF上穿DEA，金叉信号\n';
    } else if (data.dif < data.dea) {
      result += 'DIF下穿DEA，死叉信号\n';
    }
    return result || '中性状态';
  };

  const getMacdColor = () => data?.macd >= 0 ? '#f5222d' : '#52c41a';

  return (
    <div>
      <Title level={2}>MACD 平滑异同移动平均线</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        MACD是股票市场中最常用的技术分析工具之一，主要用于判断股票价格的走势和买卖信号。
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

      {data && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="DIF" value={data.dif} precision={4} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="DEA" value={data.dea} precision={4} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="MACD"
                  value={data.macd}
                  precision={4}
                  valueStyle={{ color: getMacdColor() }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="指标分析">
            <Text>{getAnalysis()}</Text>
          </Card>

          <Card title="MACD指标说明" style={{ marginTop: 24 }}>
            <ul>
              <li>DIF：短期指数平滑移动平均线与长期指数平滑移动平均线之间的差值</li>
              <li>DEA：DIF的移动平均线</li>
              <li>MACD：DIF与DEA的差值的2倍（柱状图）</li>
              <li>DIF上穿DEA，为买入信号；DIF下穿DEA，为卖出信号</li>
              <li>MACD柱状图由负变正为买入信号，由正变负为卖出信号</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
