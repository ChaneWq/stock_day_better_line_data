import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Typography, Button, Input, Modal, Space, Select, message, Row, Col, Radio, Badge, Alert, Upload, Divider, Switch, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ReloadOutlined, ClockCircleOutlined, InboxOutlined, ArrowUpOutlined, ArrowDownOutlined, ExportOutlined, ImportOutlined, CopyOutlined, SnippetsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/api';
import { useStockStore, ImportGroupsData } from '../store';
import { StockPrice, StockMinute } from '../types';
import { MiniChart } from '../components/charts';
import { useAutoRefresh } from '../hooks/useStockData';
import { calculateStrengthPercent, getStrengthColor } from '../utils/chartHelpers';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface StockData {
  price: StockPrice;
  minutes?: StockMinute[];
  fromCache: boolean;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { 
    groups, currentGroupId, addGroup, removeGroup, renameGroup, 
    addStockToGroup, removeStockFromGroup, setCurrentGroup, aStockDate,
    miniChartWidth, miniChartHeight,
    getCachedStockData, setCachedStockData, 
    enableAutoRefresh, refreshInterval,
    importGroups,
    stockNames, showStockName, toggleShowStockName
  } = useStockStore();
  
  const [groupName, setGroupName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [batchStockCodes, setBatchStockCodes] = useState('');
  const [stockData, setStockData] = useState<Map<string, StockData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [columns, setColumns] = useState(2);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'default' | 'strength' | 'change'>('default');
  const [cacheInfo, setCacheInfo] = useState<{ cached: number; total: number }>({ cached: 0, total: 0 });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importPreview, setImportPreview] = useState<ImportGroupsData | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [filterMinChange, setFilterMinChange] = useState<number | null>(null);
  const [filterMaxChange, setFilterMaxChange] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentGroup = groups.find(g => g.id === currentGroupId);

  // 从API获取数据
  const fetchFromApi = useCallback(async (targetMap: Map<string, StockData>): Promise<void> => {
    if (!currentGroup) return;
    
    for (const code of currentGroup.stocks) {
      try {
        const res = await stockApi.getStockPrice(code);
        if (res.code !== 200) continue;
        
        let minuteData: StockMinute[] = [];
        try {
          const minuteRes = await stockApi.getStockMinutes(code, aStockDate);
          if (minuteRes.code === 200) {
            minuteData = minuteRes.data?.minutes || minuteRes.data || [];
          }
        } catch (e) {
          console.error(`股票 ${code} 分时数据加载失败:`, e);
        }
        
        setCachedStockData(code, res.data, minuteData, aStockDate);
        targetMap.set(code, { price: res.data, minutes: minuteData, fromCache: false });
      } catch (e) {
        console.error(`股票 ${code} 数据加载失败:`, e);
      }
    }
  }, [currentGroup, aStockDate, setCachedStockData]);

  // 加载数据
  const loadGroupStocks = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!currentGroup || currentGroup.stocks.length === 0) {
      setStockData(new Map());
      setCacheInfo({ cached: 0, total: 0 });
      if (forceRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const data = new Map<string, StockData>();
    let cachedCount = 0;
    let needsFetch = false;

    // 首先尝试从缓存获取
    for (const code of currentGroup.stocks) {
      const cached = getCachedStockData(code, aStockDate);
      if (cached) {
        data.set(code, { price: cached.price, minutes: cached.minutes, fromCache: true });
        cachedCount++;
      } else {
        needsFetch = true;
      }
    }

    // 如果有缓存，先显示缓存数据
    if (data.size > 0) {
      setStockData(new Map(data));
      setCacheInfo({ cached: cachedCount, total: currentGroup.stocks.length });
      
      // 如果不强制刷新且不是所有数据都缺失，直接返回
      if (!forceRefresh && cachedCount > 0) {
        if (forceRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
    }

    // 需要从API获取数据的情况
    if (needsFetch || forceRefresh) {
      await fetchFromApi(data);
      
      // 更新缓存计数
      cachedCount = 0;
      for (const code of currentGroup.stocks) {
        if (getCachedStockData(code, aStockDate)) {
          cachedCount++;
        }
      }
      
      setStockData(new Map(data));
      setCacheInfo({ cached: cachedCount, total: currentGroup.stocks.length });
    }

    if (forceRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, [currentGroup, aStockDate, getCachedStockData, fetchFromApi]);

  // 定时刷新
  const refreshCallback = useCallback(() => {
    loadGroupStocks(true);
  }, [loadGroupStocks]);

  useAutoRefresh(refreshCallback, enableAutoRefresh, refreshInterval, [currentGroupId, aStockDate]);

  // 初始化
  useEffect(() => {
    if (currentGroup) {
      loadGroupStocks(false);
    }
  }, [currentGroupId]);

  const handleAddGroup = () => {
    setEditingGroupId(null);
    setGroupName('');
    setIsModalOpen(true);
  };

  const handleEditGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setEditingGroupId(groupId);
      setGroupName(group.name);
      setIsModalOpen(true);
    }
  };

  const handleSaveGroup = () => {
    if (!groupName.trim()) return;
    if (editingGroupId) {
      renameGroup(editingGroupId, groupName.trim());
      message.success('分组已更新');
    } else {
      addGroup(groupName.trim());
      message.success('分组已创建');
    }
    setIsModalOpen(false);
  };

  const handleBatchAddStocks = () => {
    if (!currentGroup) return;
    setBatchStockCodes('');
    setIsBatchModalOpen(true);
  };

  const handleSaveBatchStocks = () => {
    if (!currentGroup || !batchStockCodes.trim()) return;
    
    // 解析输入的股票代码，每行一个
    const codes = batchStockCodes
      .split('\n')
      .map(code => code.trim())
      .filter(code => code.length > 0);
    
    if (codes.length === 0) {
      message.warning('请输入至少一个股票代码');
      return;
    }
    
    // 去重
    const uniqueCodes = Array.from(new Set(codes));
    
    // 添加到分组
    let addedCount = 0;
    uniqueCodes.forEach(code => {
      if (!currentGroup.stocks.includes(code)) {
        addStockToGroup(currentGroup.id, code);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      message.success(`成功添加 ${addedCount} 只股票`);
      // 刷新数据
      setTimeout(() => loadGroupStocks(false), 100);
    } else {
      message.info('这些股票已在分组中');
    }
    
    setIsBatchModalOpen(false);
    setBatchStockCodes('');
  };

  const handleExport = () => {
    const exportData: ImportGroupsData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      platform: 'stock_day_better_line_data',
      groups: groups.map(g => ({ name: g.name, stocks: g.stocks }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_groups_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      message.error('请选择 JSON 文件');
      return;
    }

    if (file.size > 1024 * 1024) {
      message.error('文件大小不能超过 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (!data.version || !data.groups || !Array.isArray(data.groups)) {
          message.error('文件格式不正确');
          return;
        }

        const validGroups = data.groups.filter((g: any) => g.name && g.name.trim() && Array.isArray(g.stocks));
        if (validGroups.length === 0) {
          message.error('文件中无有效分组数据');
          return;
        }

        setImportPreview({ ...data, groups: validGroups });
        setImportFileName(file.name);
        setIsImportModalOpen(true);
      } catch {
        message.error('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    
    if (e.target.value) e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const result = importGroups(importPreview, importMode);
    
    if (importMode === 'replace') {
      message.success(`导入成功：覆盖为 ${result.addedGroups} 个分组`);
    } else {
      const parts: string[] = [];
      if (result.addedGroups > 0) parts.push(`新建 ${result.addedGroups} 个分组`);
      if (result.mergedGroups > 0) parts.push(`合并 ${result.mergedGroups} 个分组`);
      if (result.addedStocks > 0) parts.push(`新增 ${result.addedStocks} 只股票`);
      message.success(`导入成功：${parts.join('，') || '无新增数据'}`);
    }

    setIsImportModalOpen(false);
    setImportPreview(null);
    setImportFileName('');
    setImportMode('merge');
  };

  const handleCancelImport = () => {
    setIsImportModalOpen(false);
    setImportPreview(null);
    setImportFileName('');
    setImportMode('merge');
  };

  const getPriceColor = (percent: number) => percent >= 0 ? 'price-up' : 'price-down';

  const sortedStockEntries = useMemo(() => {
    const entries = Array.from(stockData.entries());
    switch (sortBy) {
      case 'strength':
        return entries.sort((a, b) => {
          const scoreA = calculateStrengthPercent(a[1].minutes || []);
          const scoreB = calculateStrengthPercent(b[1].minutes || []);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b[1].price.change_percent - a[1].price.change_percent;
        });
      case 'change':
        return entries.sort((a, b) => b[1].price.change_percent - a[1].price.change_percent);
      default:
        return entries;
    }
  }, [stockData, sortBy]);

  const filteredStockEntries = useMemo(() => {
    if (filterMinChange === null && filterMaxChange === null) return sortedStockEntries;
    return sortedStockEntries.filter(([, data]) => {
      const change = data.price.change_percent;
      if (filterMinChange !== null && change < filterMinChange) return false;
      if (filterMaxChange !== null && change > filterMaxChange) return false;
      return true;
    });
  }, [sortedStockEntries, filterMinChange, filterMaxChange]);

  const groupStats = useMemo(() => {
    const entries = Array.from(stockData.entries());
    if (entries.length === 0) return null;

    const total = entries.length;
    let upCount = 0, downCount = 0, flatCount = 0;
    let totalChange = 0;
    let totalStrength = 0;
    let strongestCode = '', strongestChange = -Infinity;
    let weakestCode = '', weakestChange = Infinity;
    let strongCount = 0;

    const changeRanges = {
      limitUp: 0,
      above5: 0,
      zeroTo5: 0,
      neg5To0: 0,
      belowNeg5: 0,
      limitDown: 0,
    };

    for (const [code, data] of entries) {
      const change = data.price.change_percent;
      totalChange += change;

      if (change > 0) upCount++;
      else if (change < 0) downCount++;
      else flatCount++;

      if (change > strongestChange) { strongestChange = change; strongestCode = code; }
      if (change < weakestChange) { weakestChange = change; weakestCode = code; }

      const strength = calculateStrengthPercent(data.minutes || []);
      totalStrength += strength;
      if (strength >= 60) strongCount++;

      if (change >= 9.9) changeRanges.limitUp++;
      else if (change >= 5) changeRanges.above5++;
      else if (change > 0) changeRanges.zeroTo5++;
      else if (change === 0) changeRanges.neg5To0++;
      else if (change > -5) changeRanges.neg5To0++;
      else if (change > -9.9) changeRanges.belowNeg5++;
      else changeRanges.limitDown++;
    }

    return {
      total,
      avgChange: totalChange / total,
      upCount, downCount, flatCount,
      strongestCode, strongestChange,
      weakestCode, weakestChange,
      avgStrength: totalStrength / total,
      strongCount, strongRatio: strongCount / total * 100,
      changeRanges,
    };
  }, [stockData]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>自选股管理</Title>
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
          {enableAutoRefresh && currentGroup && (
            <Badge 
              status="processing" 
              text={`自动刷新: ${refreshInterval}秒`} 
            />
          )}
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => loadGroupStocks(true)}
            loading={refreshing}
          >
            刷新数据
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup}>
            新建分组
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => fileInputRef.current?.click()}>
            导入
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFileSelect}
          />
        </Space>
      </div>

      <Space wrap style={{ marginBottom: 24 }}>
        {groups.map(group => (
          <Card
            key={group.id}
            size="small"
            style={{ cursor: 'pointer', minWidth: 120 }}
            onClick={() => setCurrentGroup(group.id)}
            bordered={group.id === currentGroupId}
          >
            <Space>
              <Text strong>{group.name}</Text>
              <Text type="secondary">({group.stocks.length})</Text>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={(e) => { e.stopPropagation(); handleEditGroup(group.id); }}
              />
              {group.id !== 'default' && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}
                />
              )}
            </Space>
          </Card>
        ))}
      </Space>

      {currentGroup && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space>
              <Title level={4}>{currentGroup.name}</Title>
              <Select
                value={sortBy}
                onChange={setSortBy}
                size="small"
                style={{ width: 120 }}
                options={[
                  { label: '默认排序', value: 'default' },
                  { label: '强势优先', value: 'strength' },
                  { label: '涨跌排序', value: 'change' },
                ]}
              />
            </Space>
            <Space>
              <Button 
                type="primary" 
                icon={<InboxOutlined />} 
                onClick={handleBatchAddStocks}
              >
                批量添加
              </Button>
              <Button 
                icon={<SnippetsOutlined />} 
                onClick={() => setIsExportModalOpen(true)}
                disabled={!currentGroup || currentGroup.stocks.length === 0}
              >
                批量导出
              </Button>
              <Space size={4}>
                <Text style={{ fontSize: 13 }}>名称</Text>
                <Switch size="small" checked={showStockName} onChange={toggleShowStockName} />
              </Space>
              <Space size={4}>
                <Text style={{ fontSize: 13 }}>涨幅</Text>
                <InputNumber
                  size="small"
                  style={{ width: 60 }}
                  placeholder="最小"
                  value={filterMinChange}
                  onChange={(v) => setFilterMinChange(v)}
                />
                <Text style={{ fontSize: 12 }}>~</Text>
                <InputNumber
                  size="small"
                  style={{ width: 60 }}
                  placeholder="最大"
                  value={filterMaxChange}
                  onChange={(v) => setFilterMaxChange(v)}
                />
                <Text style={{ fontSize: 12 }}>%</Text>
              </Space>
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                <Radio.Button value="list">列表</Radio.Button>
                <Radio.Button value="grid">网格</Radio.Button>
              </Radio.Group>
              {viewMode === 'grid' && (
                <Select
                  value={columns}
                  onChange={setColumns}
                  options={[
                    { label: '1列', value: 1 },
                    { label: '2列', value: 2 },
                    { label: '3列', value: 3 },
                    { label: '4列', value: 4 },
                  ]}
                />
              )}
            </Space>
          </div>

          {currentGroup.stocks.length === 0 && (
            <Alert
              message="该分组暂无股票"
              description="去搜索页面添加一些股票吧！"
              type="info"
              showIcon
              action={
                <Button type="primary" size="small" onClick={() => navigate('/search')}>
                  去搜索
                </Button>
              }
            />
          )}

          {groupStats && (
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Row gutter={[16, 12]}>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>平均涨幅</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: groupStats.avgChange >= 0 ? '#cf1322' : '#3f8600' }}>
                      {groupStats.avgChange >= 0 ? '+' : ''}{groupStats.avgChange.toFixed(2)}%
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>涨跌分布</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      <span style={{ color: '#cf1322' }}>{groupStats.upCount}涨</span>
                      <span style={{ margin: '0 6px', color: '#999' }}>/</span>
                      <span style={{ color: '#3f8600' }}>{groupStats.downCount}跌</span>
                      <span style={{ margin: '0 6px', color: '#999' }}>/</span>
                      <span style={{ color: '#999' }}>{groupStats.flatCount}平</span>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>平均强势</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: getStrengthColor(groupStats.avgStrength) }}>
                      {groupStats.avgStrength.toFixed(0)}%
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 4 }}>
                      <div style={{ width: `${groupStats.avgStrength}%`, height: '100%', background: getStrengthColor(groupStats.avgStrength), borderRadius: 2 }} />
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>强势占比</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1890ff' }}>
                      {groupStats.strongRatio.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {groupStats.strongCount}/{groupStats.total}只 ≥60%
                    </div>
                  </div>
                </Col>
              </Row>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', fontSize: 13 }}>
                <span>
                  最强：<span style={{ fontWeight: 600, color: '#cf1322' }}>{groupStats.strongestCode}</span>
                  <span style={{ color: '#cf1322', marginLeft: 4 }}>+{groupStats.strongestChange.toFixed(2)}%</span>
                </span>
                <span style={{ margin: '0 16px', color: '#d9d9d9' }}>|</span>
                <span>
                  最弱：<span style={{ fontWeight: 600, color: '#3f8600' }}>{groupStats.weakestCode}</span>
                  <span style={{ color: '#3f8600', marginLeft: 4 }}>{groupStats.weakestChange.toFixed(2)}%</span>
                </span>
              </div>
              {(() => {
                const r = groupStats.changeRanges;
                const maxCount = Math.max(r.limitUp, r.above5, r.zeroTo5, r.neg5To0, r.belowNeg5, r.limitDown, 1);
                const bars = [
                  { label: '涨停', count: r.limitUp, color: '#cf1322' },
                  { label: '>5%', count: r.above5, color: '#ff7875' },
                  { label: '0~5%', count: r.zeroTo5, color: '#ffa39e' },
                  { label: '-5~0%', count: r.neg5To0, color: '#95de64' },
                  { label: '<-5%', count: r.belowNeg5, color: '#52c41a' },
                  { label: '跌停', count: r.limitDown, color: '#3f8600' },
                ];
                return (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>涨跌分布</div>
                    {bars.map(bar => bar.count > 0 && (
                      <div key={bar.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ width: 48, fontSize: 12, color: '#666', textAlign: 'right', marginRight: 8 }}>{bar.label}</span>
                        <div style={{ flex: 1, height: 14, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${bar.count / maxCount * 100}%`, height: '100%', background: bar.color, borderRadius: 3, transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ width: 36, fontSize: 12, color: '#666', marginLeft: 8 }}>{bar.count}只</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          )}

          {viewMode === 'grid' ? (
            <Row gutter={[16, 16]}>
              {filteredStockEntries.map(([code, data]) => {
                const cached = getCachedStockData(code, aStockDate);
                const cacheTime = cached ? new Date(cached.timestamp).toLocaleString() : '';
                const strengthPercent = calculateStrengthPercent(data.minutes || []);
                const strengthColor = getStrengthColor(strengthPercent);
                
                return (
                  <Col xs={24} sm={24 / columns} key={code}>
                    <Card
                      hoverable
                      className="stock-card"
                      onClick={() => navigate(`/stock/${code}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space style={{ flex: 1 }}>
                          <div>
                            <Text strong style={{ fontSize: 16 }}>{code}</Text>
                            {showStockName && stockNames[code] && (
                              <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{stockNames[code]}</Text>
                            )}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 'bold' }} className={getPriceColor(data.price.change_percent)}>
                            {data.price.current_price.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 16 }} className={getPriceColor(data.price.change_percent)}>
                            {data.price.change_percent >= 0 ? '+' : ''}{data.price.change_percent.toFixed(2)}%
                          </div>
                          {data.fromCache && (
                            <Badge status="success" text="缓存" title={cacheTime} />
                          )}
                        </Space>
                        <Space size={4} align="center">
                          <span style={{ fontSize: 12, fontWeight: 600, color: strengthColor }}>
                            强势 {strengthPercent}%
                          </span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => { e.stopPropagation(); removeStockFromGroup(currentGroup.id, code); }}
                          />
                        </Space>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#f0f0f0', borderRadius: 2, margin: '6px 0' }}>
                        <div style={{ 
                          width: `${strengthPercent}%`, 
                          height: '100%', 
                          background: strengthColor,
                          borderRadius: 2,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <MiniChart data={data.minutes || []} width={miniChartWidth} height={miniChartHeight} />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {filteredStockEntries.map(([code, data]) => {
                const cached = getCachedStockData(code, aStockDate);
                const cacheTime = cached ? new Date(cached.timestamp).toLocaleString() : '';
                const strengthPercent = calculateStrengthPercent(data.minutes || []);
                const strengthColor = getStrengthColor(strengthPercent);
                
                return (
                  <Card key={code} hoverable onClick={() => navigate(`/stock/${code}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space style={{ flex: 1 }}>
                        <div>
                          <Text strong style={{ fontSize: 18 }}>{code}</Text>
                          {showStockName && stockNames[code] && (
                            <Text type="secondary" style={{ fontSize: 13, marginLeft: 6 }}>{stockNames[code]}</Text>
                          )}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }} className={getPriceColor(data.price.change_percent)}>
                          {data.price.current_price.toFixed(2)}
                        </div>
                        <div className={getPriceColor(data.price.change_percent)} style={{ fontSize: 18, fontWeight: 'bold' }}>
                          {data.price.change_percent >= 0 ? '+' : ''}{data.price.change_percent.toFixed(2)}%
                        </div>
                        {data.fromCache && (
                          <Badge status="success" text="缓存" title={cacheTime} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: strengthColor }}>
                          强势 {strengthPercent}%
                        </span>
                        <div style={{ width: 60, height: 4, background: '#f0f0f0', borderRadius: 2, display: 'inline-block', verticalAlign: 'middle' }}>
                          <div style={{ 
                            width: `${strengthPercent}%`, 
                            height: '100%', 
                            background: strengthColor,
                            borderRadius: 2,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </Space>
                      <Space>
                        <Button icon={<EyeOutlined />} onClick={() => navigate(`/stock/${code}`)}>
                          详情
                        </Button>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => { e.stopPropagation(); removeStockFromGroup(currentGroup.id, code); }}
                        >
                          移除
                        </Button>
                      </Space>
                    </div>
                  </Card>
                );
              })}
            </Space>
          )}

          {stockData.size === 0 && !loading && currentGroup.stocks.length > 0 && (
            <Alert
              message="正在加载数据..."
              description="点击刷新按钮手动更新，或确保API服务正在运行"
              type="info"
              showIcon
            />
          )}
        </>
      )}

      <Modal
        title={editingGroupId ? '编辑分组' : '新建分组'}
        open={isModalOpen}
        onOk={handleSaveGroup}
        onCancel={() => setIsModalOpen(false)}
      >
        <Input
          placeholder="请输入分组名称"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
      </Modal>

      <Modal
        title="批量添加股票"
        open={isBatchModalOpen}
        onOk={handleSaveBatchStocks}
        onCancel={() => { setIsBatchModalOpen(false); setBatchStockCodes(''); }}
        okText="添加"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">请输入股票代码，每行一个：</Text>
        </div>
        <TextArea
          placeholder="例如：&#10;000400&#10;000404&#10;600000"
          value={batchStockCodes}
          onChange={(e) => setBatchStockCodes(e.target.value)}
          rows={8}
          showCount
        />
      </Modal>

      <Modal
        title="批量导出股票"
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsExportModalOpen(false)}>
            关闭
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => {
            const text = currentGroup?.stocks.join('\n') || '';
            navigator.clipboard.writeText(text).then(() => {
              message.success('已复制到剪贴板');
            }).catch(() => {
              const textarea = document.createElement('textarea');
              textarea.value = text;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              message.success('已复制到剪贴板');
            });
          }}>
            复制
          </Button>,
        ]}
        width={500}
      >
        {currentGroup && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Text type="secondary">分组：</Text>
                <Text strong>{currentGroup.name}</Text>
                <Text type="secondary">（{currentGroup.stocks.length}只）</Text>
              </Space>
            </div>
            <TextArea
              value={currentGroup.stocks.join('\n')}
              readOnly
              rows={10}
              style={{ fontFamily: 'monospace', fontSize: 14 }}
            />
          </>
        )}
      </Modal>

      <Modal
        title="导入自选股"
        open={isImportModalOpen}
        onOk={handleConfirmImport}
        onCancel={handleCancelImport}
        okText="确认导入"
        width={560}
      >
        {importPreview && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Text type="secondary">文件：</Text>
                <Text strong>{importFileName}</Text>
              </Space>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Text type="secondary">导出时间：</Text>
                <Text>{new Date(importPreview.exportTime).toLocaleString()}</Text>
              </Space>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>导入模式：</Text>
              <Radio.Group value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="merge">
                    合并模式（同名分组合并去重，不同名新建）
                  </Radio>
                  <Radio value="replace">
                    覆盖模式（清空现有数据，用导入数据替换）
                  </Radio>
                </Space>
              </Radio.Group>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                预览（共 {importPreview.groups.length} 个分组）：
              </Text>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                {importPreview.groups.map((g, index) => (
                  <div key={index} style={{ marginBottom: index < importPreview.groups.length - 1 ? 8 : 0 }}>
                    <Text strong>{g.name}</Text>
                    <Text type="secondary"> ({g.stocks.length}只)</Text>
                    <div style={{ marginLeft: 12, color: '#666', fontSize: 13, wordBreak: 'break-all' }}>
                      {g.stocks.join('  ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
