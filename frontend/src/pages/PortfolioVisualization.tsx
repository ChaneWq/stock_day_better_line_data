import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Button, Space, Row, Col, Table, Spin, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useStockStore } from '../store';
import { stockApi } from '../services/api';
import { StockPrice, StockMinute } from '../types';
import { calculateStrengthPercent } from '../utils/chartHelpers';

const { Title, Text } = Typography;

interface StockData {
  price: StockPrice;
  minutes: StockMinute[];
  fromCache: boolean;
}

interface GroupStats {
  groupId: string;
  groupName: string;
  stockCount: number;
  dataCount: number;
  avgChange: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  upRatio: number;
  avgStrength: number;
  strongRatio: number;
  strongestCode: string;
  strongestChange: number;
  weakestCode: string;
  weakestChange: number;
  avgAmplitude: number;
}

export default function PortfolioVisualization() {
  const { groups, aStockDate, getCachedStockData, setCachedStockData, stockNames } = useStockStore();
  const [allStockData, setAllStockData] = useState<Map<string, StockData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allStockCodes = useMemo(() => {
    const codes = new Set<string>();
    groups.forEach(g => g.stocks.forEach(s => codes.add(s)));
    return Array.from(codes);
  }, [groups]);

  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (allStockCodes.length === 0) return;
    
    if (forceRefresh) {
      setRefreshing(true);
    } else if (allStockData.size === 0) {
      setLoading(true);
    }

    const data = new Map<string, StockData>();

    if (!forceRefresh) {
      for (const code of allStockCodes) {
        const cached = getCachedStockData(code, aStockDate);
        if (cached) {
          data.set(code, { price: cached.price, minutes: cached.minutes, fromCache: true });
        }
      }
    }

    if (data.size > 0) {
      setAllStockData(new Map(data));
    }

    const fetchCodes = forceRefresh ? allStockCodes : allStockCodes.filter(code => !data.has(code));

    for (const code of fetchCodes) {
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
        data.set(code, { price: res.data, minutes: minuteData, fromCache: false });
        setAllStockData(new Map(data));
      } catch (e) {
        console.error(`股票 ${code} 数据加载失败:`, e);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [allStockCodes, aStockDate, getCachedStockData, setCachedStockData, allStockData.size]);

  useEffect(() => {
    if (allStockCodes.length > 0) {
      loadAllData();
    }
  }, [allStockCodes.length > 0]);

  const groupStatsList = useMemo((): GroupStats[] => {
    return groups.map(group => {
      const stocksData: StockData[] = [];
      group.stocks.forEach(code => {
        const d = allStockData.get(code);
        if (d) stocksData.push(d);
      });

      if (stocksData.length === 0) {
        return {
          groupId: group.id,
          groupName: group.name,
          stockCount: group.stocks.length,
          dataCount: 0,
          avgChange: 0,
          upCount: 0,
          downCount: 0,
          flatCount: 0,
          upRatio: 0,
          avgStrength: 0,
          strongRatio: 0,
          strongestCode: '',
          strongestChange: 0,
          weakestCode: '',
          weakestChange: 0,
          avgAmplitude: 0,
        };
      }

      let upCount = 0, downCount = 0, flatCount = 0;
      let totalChange = 0;
      let totalStrength = 0;
      let strongCount = 0;
      let strongestCode = '', strongestChange = -Infinity;
      let weakestCode = '', weakestChange = Infinity;
      let totalAmplitude = 0;

      stocksData.forEach(d => {
        const change = d.price.change_percent;
        totalChange += change;

        if (change > 0) upCount++;
        else if (change < 0) downCount++;
        else flatCount++;

        const strength = calculateStrengthPercent(d.minutes || []);
        totalStrength += strength;
        if (strength >= 60) strongCount++;

        if (change > strongestChange) {
          strongestChange = change;
          strongestCode = d.price.code;
        }
        if (change < weakestChange) {
          weakestChange = change;
          weakestCode = d.price.code;
        }

        if (d.price.high_price && d.price.low_price && d.price.pre_close) {
          totalAmplitude += ((d.price.high_price - d.price.low_price) / d.price.pre_close) * 100;
        }
      });

      const count = stocksData.length;
      return {
        groupId: group.id,
        groupName: group.name,
        stockCount: group.stocks.length,
        dataCount: count,
        avgChange: totalChange / count,
        upCount,
        downCount,
        flatCount,
        upRatio: (upCount / count) * 100,
        avgStrength: totalStrength / count,
        strongRatio: (strongCount / count) * 100,
        strongestCode,
        strongestChange,
        weakestCode,
        weakestChange,
        avgAmplitude: totalAmplitude / count,
      };
    });
  }, [groups, allStockData]);

  const maxAbsChange = useMemo(() => {
    if (groupStatsList.length === 0) return 1;
    const max = Math.max(...groupStatsList.map(g => Math.abs(g.avgChange)));
    return max > 0 ? max : 1;
  }, [groupStatsList]);

  const radarMaxValues = useMemo(() => {
    return {
      avgChange: maxAbsChange,
      upRatio: 100,
      avgStrength: 100,
      strongRatio: 100,
      avgAmplitude: Math.max(...groupStatsList.map(g => g.avgAmplitude), 1),
    };
  }, [groupStatsList, maxAbsChange]);

  const renderBarChart = () => {
    if (groupStatsList.length === 0) return null;

    return (
      <Card title="分组涨幅对比" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, height: 240, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderBottom: '1px dashed #d9d9d9' }} />
            {groupStatsList.map(g => {
              const height = Math.abs(g.avgChange) / maxAbsChange * 80;
              const isUp = g.avgChange >= 0;
              return (
                <div key={g.groupId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                  <Text style={{ fontSize: 12, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                    {g.groupName}
                  </Text>
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {isUp ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#cf1322', marginBottom: 4 }}>
                          +{g.avgChange.toFixed(2)}%
                        </Text>
                        <div style={{ width: 48, height: Math.max(height, 2), background: '#cf1322', borderRadius: '4px 4px 0 0' }} />
                      </div>
                    ) : (
                      <div style={{ height: 100 }} />
                    )}
                  </div>
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}>
                    {!isUp ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 48, height: Math.max(height, 2), background: '#3f8600', borderRadius: '0 0 4px 4px' }} />
                        <Text style={{ fontSize: 12, color: '#3f8600', marginTop: 4 }}>
                          {g.avgChange.toFixed(2)}%
                        </Text>
                      </div>
                    ) : (
                      <div style={{ height: 100 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  const renderRadarChart = () => {
    if (groupStatsList.length === 0) return null;

    const dimensions = [
      { key: 'avgChange', label: '平均涨幅' },
      { key: 'upRatio', label: '上涨占比' },
      { key: 'avgStrength', label: '平均强势' },
      { key: 'strongRatio', label: '强势占比' },
      { key: 'avgAmplitude', label: '振幅均值' },
    ];

    const numAxes = dimensions.length;
    const cx = 200;
    const cy = 200;
    const maxR = 160;
    const angleStep = (2 * Math.PI) / numAxes;

    const getPoint = (dimIndex: number, value: number, maxVal: number) => {
      const angle = -Math.PI / 2 + dimIndex * angleStep;
      const r = (value / maxVal) * maxR;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    const colors = ['#1890ff', '#cf1322', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96'];

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    return (
      <Card title="分组雷达图" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 24 }}>
          <svg width={400} height={420} viewBox={`0 0 400 420`}>
            {gridLevels.map((level, li) => {
              const points = dimensions.map((_, di) => {
                const p = getPoint(di, level * 100, 100);
                return `${p.x},${p.y}`;
              });
              return <polygon key={li} points={points.join(' ')} fill="none" stroke="#e8e8e8" strokeWidth={1} />;
            })}
            {dimensions.map((dim, di) => {
              const outer = getPoint(di, 100, 100);
              return (
                <g key={dim.key}>
                  <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#d9d9d9" strokeWidth={1} />
                  <text
                    x={outer.x + (outer.x - cx) * 0.12}
                    y={outer.y + (outer.y - cy) * 0.12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 12, fill: '#666' }}
                  >
                    {dim.label}
                  </text>
                </g>
              );
            })}
            {groupStatsList.map((g, gi) => {
              const color = colors[gi % colors.length];
              const values = [
                (g.avgChange + maxAbsChange) / (2 * maxAbsChange) * 100,
                g.upRatio,
                g.avgStrength,
                g.strongRatio,
                g.avgAmplitude / radarMaxValues.avgAmplitude * 100,
              ];
              const points = dimensions.map((_, di) => {
                const p = getPoint(di, values[di], 100);
                return `${p.x},${p.y}`;
              });
              return (
                <g key={g.groupId}>
                  <polygon points={points.join(' ')} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={2} />
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            {groupStatsList.map((g, gi) => (
              <div key={g.groupId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 2, background: colors[gi % colors.length] }} />
                <Text>{g.groupName}</Text>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  const tableColumns = [
    {
      title: '分组',
      dataIndex: 'groupName',
      key: 'groupName',
      fixed: 'left' as const,
      width: 100,
    },
    {
      title: '个股数',
      dataIndex: 'stockCount',
      key: 'stockCount',
      width: 80,
      sorter: (a: GroupStats, b: GroupStats) => a.stockCount - b.stockCount,
    },
    {
      title: '平均涨幅',
      dataIndex: 'avgChange',
      key: 'avgChange',
      width: 110,
      sorter: (a: GroupStats, b: GroupStats) => a.avgChange - b.avgChange,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#cf1322' : '#3f8600', fontWeight: 600 }}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '涨/跌/平',
      key: 'upDownFlat',
      width: 120,
      render: (_: unknown, r: GroupStats) => (
        <span>
          <Text style={{ color: '#cf1322' }}>{r.upCount}涨</Text>
          <Text style={{ margin: '0 4px', color: '#999' }}>/</Text>
          <Text style={{ color: '#3f8600' }}>{r.downCount}跌</Text>
          <Text style={{ margin: '0 4px', color: '#999' }}>/</Text>
          <Text style={{ color: '#999' }}>{r.flatCount}平</Text>
        </span>
      ),
    },
    {
      title: '上涨占比',
      dataIndex: 'upRatio',
      key: 'upRatio',
      width: 100,
      sorter: (a: GroupStats, b: GroupStats) => a.upRatio - b.upRatio,
      render: (v: number) => (
        <div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8, width: '100%' }}>
            <div style={{ background: '#cf1322', borderRadius: 4, height: 8, width: `${v}%` }} />
          </div>
          <Text style={{ fontSize: 12 }}>{v.toFixed(0)}%</Text>
        </div>
      ),
    },
    {
      title: '平均强势',
      dataIndex: 'avgStrength',
      key: 'avgStrength',
      width: 100,
      sorter: (a: GroupStats, b: GroupStats) => a.avgStrength - b.avgStrength,
      render: (v: number) => (
        <div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8, width: '100%' }}>
            <div style={{ background: v >= 60 ? '#52c41a' : '#faad14', borderRadius: 4, height: 8, width: `${v}%` }} />
          </div>
          <Text style={{ fontSize: 12 }}>{v.toFixed(0)}%</Text>
        </div>
      ),
    },
    {
      title: '强势占比',
      dataIndex: 'strongRatio',
      key: 'strongRatio',
      width: 100,
      sorter: (a: GroupStats, b: GroupStats) => a.strongRatio - b.strongRatio,
      render: (v: number) => <Text>{v.toFixed(0)}%</Text>,
    },
    {
      title: '振幅均值',
      dataIndex: 'avgAmplitude',
      key: 'avgAmplitude',
      width: 90,
      sorter: (a: GroupStats, b: GroupStats) => a.avgAmplitude - b.avgAmplitude,
      render: (v: number) => <Text>{v.toFixed(2)}%</Text>,
    },
    {
      title: '最强个股',
      key: 'strongest',
      width: 140,
      render: (_: unknown, r: GroupStats) => {
        if (!r.strongestCode) return '-';
        const name = stockNames[r.strongestCode];
        return (
          <span>
            <Text strong>{r.strongestCode}</Text>
            {name && <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>{name}</Text>}
            <Text style={{ color: '#cf1322', marginLeft: 4 }}>+{r.strongestChange.toFixed(2)}%</Text>
          </span>
        );
      },
    },
    {
      title: '最弱个股',
      key: 'weakest',
      width: 140,
      render: (_: unknown, r: GroupStats) => {
        if (!r.weakestCode) return '-';
        const name = stockNames[r.weakestCode];
        return (
          <span>
            <Text strong>{r.weakestCode}</Text>
            {name && <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>{name}</Text>}
            <Text style={{ color: '#3f8600', marginLeft: 4 }}>{r.weakestChange.toFixed(2)}%</Text>
          </span>
        );
      },
    },
  ];

  if (groups.length === 0) {
    return (
      <div>
        <Title level={2}>📊 分组可视化</Title>
        <Alert
          message="暂无分组数据"
          description="请先在自选股管理中创建分组并添加股票"
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>📊 分组可视化</Title>
        <Space>
          <Text type="secondary">数据日期: {aStockDate}</Text>
          <Button icon={<ReloadOutlined />} onClick={() => loadAllData(true)} loading={refreshing}>
            刷新数据
          </Button>
        </Space>
      </div>

      {loading && allStockData.size === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在加载数据...</Text>
          </div>
        </div>
      ) : (
        <>
          {renderBarChart()}

          <Card title="分组指标对比" style={{ marginBottom: 24 }}>
            <Table
              columns={tableColumns}
              dataSource={groupStatsList}
              rowKey="groupId"
              pagination={false}
              scroll={{ x: 1080 }}
              size="middle"
            />
          </Card>

          {renderRadarChart()}
        </>
      )}
    </div>
  );
}
