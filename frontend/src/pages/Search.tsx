import { useState } from 'react';
import { Input, Button, Card, Typography, Space, message, Select } from 'antd';
import { SearchOutlined, StarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/api';
import { useStockStore } from '../store';
import { StockPrice } from '../types';

const { Title, Text } = Typography;

export default function Search() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [stock, setStock] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const { groups, addStockToGroup, addSearchHistory } = useStockStore();

  const handleSearch = async () => {
    if (!code.trim()) {
      message.warning('请输入股票代码');
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.getStockPrice(code.trim());
      if (res.code === 200) {
        setStock(res.data);
        addSearchHistory(code.trim());
      } else {
        setStock(null);
        message.error('获取数据失败');
      }
    } catch (e) {
      setStock(null);
      message.error('请求失败');
    }
    setLoading(false);
  };

  const handleAddToGroup = (groupId: string) => {
    if (!stock) return;
    addStockToGroup(groupId, stock.code);
    message.success(`已添加到 ${groups.find(g => g.id === groupId)?.name}`);
  };

  const getPriceColor = (percent: number) => percent >= 0 ? 'price-up' : 'price-down';

  return (
    <div>
      <Title level={2}>🔍 股票搜索</Title>

      <Space.Compact style={{ width: '100%', marginTop: 24, marginBottom: 32 }}>
        <Input
          size="large"
          placeholder="请输入股票代码（如 000400）"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined />}
        />
        <Button type="primary" size="large" onClick={handleSearch} loading={loading}>
          搜索
        </Button>
      </Space.Compact>

      {stock && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3}>{stock.code}</Title>
              <div style={{ fontSize: 48, fontWeight: 'bold' }} className={getPriceColor(stock.change_percent)}>
                {stock.current_price.toFixed(2)}
              </div>
              <div className={getPriceColor(stock.change_percent)} style={{ fontSize: 24, marginTop: 8 }}>
                {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
              </div>
            </div>
            <div>
              <Select
                placeholder="添加到自选分组"
                style={{ width: 200 }}
                options={groups.map(g => ({ label: g.name, value: g.id }))}
                onSelect={handleAddToGroup}
              />
              <Button
                type="primary"
                style={{ marginTop: 16, width: 200 }}
                onClick={() => navigate(`/stock/${stock.code}`)}
              >
                查看详情
              </Button>
            </div>
          </div>
        </Card>
      )}

      {useStockStore.getState().searchHistory.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Title level={4}>搜索历史</Title>
          <Space wrap style={{ marginTop: 16 }}>
            {useStockStore.getState().searchHistory.map((c) => (
              <Button key={c} onClick={() => { setCode(c); handleSearch(); }}>
                {c}
              </Button>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
}
