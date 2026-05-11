import { useState } from 'react';
import { Input, Button, Card, Typography, Space, message, Select, Radio } from 'antd';
import { SearchOutlined, StarOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/api';
import { useStockStore } from '../store';
import { StockPrice } from '../types';

const { Title, Text } = Typography;

interface NameSearchResult {
  code: string;
  name: string;
}

export default function Search() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [stock, setStock] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');
  const [nameResults, setNameResults] = useState<NameSearchResult[]>([]);
  const { groups, addStockToGroup, addSearchHistory, stockNames } = useStockStore();

  const handleSearch = async () => {
    const keyword = code.trim();
    if (!keyword) {
      message.warning(searchMode === 'code' ? '请输入股票代码' : '请输入股票名称');
      return;
    }

    if (searchMode === 'name') {
      const results: NameSearchResult[] = [];
      for (const [sCode, sName] of Object.entries(stockNames)) {
        if (sName.includes(keyword)) {
          results.push({ code: sCode, name: sName });
        }
      }
      setNameResults(results);
      if (results.length > 0) {
        addSearchHistory(keyword);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await stockApi.getStockPrice(keyword);
      if (res.code === 200) {
        setStock(res.data);
        addSearchHistory(keyword);
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

  const handleAddToGroup = (groupId: string, stockCode: string) => {
    addStockToGroup(groupId, stockCode);
    message.success(`已添加到 ${groups.find(g => g.id === groupId)?.name}`);
  };

  const getPriceColor = (percent: number) => percent >= 0 ? 'price-up' : 'price-down';

  return (
    <div>
      <Title level={2}>🔍 股票搜索</Title>

      <Radio.Group 
        value={searchMode} 
        onChange={(e) => { setSearchMode(e.target.value); setStock(null); setNameResults([]); }}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="code">按代码</Radio.Button>
        <Radio.Button value="name">按名称</Radio.Button>
      </Radio.Group>

      <Space.Compact style={{ width: '100%', marginBottom: 32 }}>
        <Input
          size="large"
          placeholder={searchMode === 'code' ? '请输入股票代码（如 000400）' : '请输入股票名称关键词（如 比亚迪）'}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined />}
        />
        <Button type="primary" size="large" onClick={handleSearch} loading={loading}>
          搜索
        </Button>
      </Space.Compact>

      {searchMode === 'code' && stock && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={16}>
              <div>
                <Text strong style={{ fontSize: 18 }}>{stock.code}</Text>
                {stockNames[stock.code] && (
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>{stockNames[stock.code]}</Text>
                )}
              </div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }} className={getPriceColor(stock.change_percent)}>
                {stock.current_price.toFixed(2)}
              </div>
              <div style={{ fontSize: 18 }} className={getPriceColor(stock.change_percent)}>
                {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
              </div>
            </Space>
            <Space>
              <Select
                placeholder="添加到自选"
                style={{ width: 160 }}
                options={groups.map(g => ({ label: g.name, value: g.id }))}
                onSelect={(groupId) => handleAddToGroup(groupId, stock.code)}
              />
              <Button onClick={() => navigate(`/stock/${stock.code}`)}>
                详情
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {searchMode === 'name' && nameResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
            找到 {nameResults.length} 只匹配股票
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            {nameResults.map(item => (
              <Card key={item.code} size="small" hoverable>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={16}>
                    <Text strong style={{ fontSize: 16 }}>{item.code}</Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>{item.name}</Text>
                  </Space>
                  <Space>
                    <Select
                      placeholder="添加到自选"
                      size="small"
                      style={{ width: 140 }}
                      options={groups.map(g => ({ label: g.name, value: g.id }))}
                      onSelect={(groupId) => handleAddToGroup(groupId, item.code)}
                    />
                    <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/stock/${item.code}`)}>
                      详情
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {searchMode === 'name' && nameResults.length === 0 && code.trim() && !loading && (
        <Card style={{ marginBottom: 16 }}>
          <Text type="secondary">未找到匹配的股票名称，请检查关键词或先在设置中导入个股名称数据</Text>
        </Card>
      )}

      {useStockStore.getState().searchHistory.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>搜索历史</Title>
            <Button 
              size="small" 
              icon={<DeleteOutlined />} 
              danger 
              onClick={() => useStockStore.getState().clearSearchHistory()}
            >
              清除历史
            </Button>
          </div>
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
