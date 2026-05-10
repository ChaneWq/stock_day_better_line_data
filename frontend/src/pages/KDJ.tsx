import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Typography, Input, Button, Select, Space, message, Statistic, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import { KDJData, RouteState } from '../types';

const { Title, Text } = Typography;

export default function KDJ() {
  const location = useLocation();
  const [code, setCode] = useState((location.state as RouteState)?.code || '');
  const [period, setPeriod] = useState('day');
  const [data, setData] = useState<KDJData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!code.trim()) {
      message.warning('请输入股票代码');
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.getKDJ(code.trim(), period);
      if (res.code === 200) {
        setData(res.data.kdj);
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
    if (data.k > 80 && data.d > 80) {
      result += '超买区域，注意风险\n';
    } else if (data.k < 20 && data.d < 20) {
      result += '超卖区域，可关注\n';
    }
    if (data.k > data.d) {
      result += 'K线上穿D线，金叉信号\n';
    } else if (data.k < data.d) {
      result += 'K线下穿D线，死叉信号\n';
    }
    return result || '中性状态';
  };

  return (
    <div>
      <Title level={2}>KDJ 随机指标</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        KDJ指标是一种相当新颖、实用的技术分析指标，主要用于分析股票的超买超卖现象。
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
                <Statistic title="K 值" value={data.k} precision={2} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="D 值" value={data.d} precision={2} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="J 值" value={data.j} precision={2} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
          </Row>

          <Card title="指标分析">
            <Text>{getAnalysis()}</Text>
          </Card>

          <Card title="KDJ指标说明" style={{ marginTop: 24 }}>
            <ul>
              <li>K线：快速确认线，数值在90以上为超买，数值在10以下为超卖</li>
              <li>D线：慢速主干线，数值在80以上为超买，数值在20以下为超卖</li>
              <li>J线：方向敏感线，大于100特别是连续5天以上，股价至少会形成短期头部</li>
              <li>K值由下向上突破D线为买入信号，K值由上向下突破D线为卖出信号</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
