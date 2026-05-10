import React, { useState, useCallback, useRef } from 'react';
import { StockMinute } from '../../types';

interface MinuteChartProps {
  data: StockMinute[];
  yesterdayClose: number;
  height?: number;
}

const MinuteChart: React.FC<MinuteChartProps> = ({ 
  data, 
  yesterdayClose,
  height = 550 
}) => {
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    index: number;
    price: number;
    avgPrice: number;
    volume: number;
    time: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) {
    return (
      <div 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#888',
          fontSize: '14px',
          background: '#ffffff'
        }}
      >
        暂无分时数据
      </div>
    );
  }

  const padding = { top: 40, right: 60, bottom: 40, left: 60 };
  const chartWidth = 1000 - padding.left - padding.right;
  
  const mainChartHeight = Math.floor((height - padding.top - padding.bottom) * 0.6);
  const subChartHeight = Math.floor((height - padding.top - padding.bottom) * 0.35);
  const gapHeight = 10;

  const prices = data.map(d => d.price || yesterdayClose);
  const avgPrices = data.map(d => d.avg_price || yesterdayClose);
  const volumes = data.map(d => d.vol || d.amount || d.volume || 0);
  
  const allPrices = [...prices, ...avgPrices, yesterdayClose];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  
  const pricePadding = priceRange * 0.1;
  const adjustedMin = minPrice - pricePadding;
  const adjustedMax = maxPrice + pricePadding;
  const adjustedRange = adjustedMax - adjustedMin;

  const maxVolume = Math.max(...volumes) || 1;
  const scaleMax = maxVolume * 1.2;

  const upColor = '#f14b4b';
  const downColor = '#3eba4f';
  const avgColor = '#ff8c00';
  const closeLineColor = '#1e90ff';
  const gridColor = '#e8e8e8';
  const textColor = '#666';
  const crosshairColor = '#999';

  const lastPrice = prices[prices.length - 1];
  const lineColor = lastPrice >= yesterdayClose ? upColor : downColor;

  const getX = (index: number) => {
    const step = chartWidth / (data.length - 1 || 1);
    return padding.left + index * step;
  };

  const getPriceY = (price: number) => {
    return padding.top + mainChartHeight - ((price - adjustedMin) / adjustedRange) * mainChartHeight;
  };

  const getVolumeY = (volume: number) => {
    const baseY = padding.top + mainChartHeight + gapHeight;
    const safeVolume = Math.max(0, volume);
    const ratio = safeVolume / scaleMax;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return baseY + subChartHeight - clampedRatio * subChartHeight;
  };

  const getLinePath = (getPrice: (d: StockMinute) => number) => {
    return data.map((d, i) => {
      const x = getX(i);
      const y = getPriceY(getPrice(d));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getBarColor = (index: number) => {
    if (index === 0) {
      return prices[0] >= yesterdayClose ? upColor : downColor;
    }
    return prices[index] >= prices[index - 1] ? upColor : downColor;
  };

  const generateTimeLabels = () => {
    const labels = [];
    const intervals = [
      { hour: 9, minute: 30 },
      { hour: 10, minute: 30 },
      { hour: 11, minute: 30 },
      { hour: 13, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 15, minute: 0 }
    ];
    
    intervals.forEach((time, i) => {
      const index = data.findIndex(d => d.hour === time.hour && d.minute === time.minute);
      if (index !== -1) {
        labels.push({
          index,
          x: getX(index),
          text: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
        });
      }
    });
    return labels;
  };

  const generatePriceLabels = () => {
    const labels = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const price = adjustedMin + (adjustedRange / steps) * i;
      labels.push({
        price,
        y: getPriceY(price)
      });
    }
    return labels;
  };

  const generateVolumeLabels = () => {
    const labels = [];
    const baseY = padding.top + mainChartHeight + gapHeight;
    const steps = 2;
    for (let i = 0; i <= steps; i++) {
      const volume = (scaleMax / steps) * i;
      labels.push({
        volume,
        y: baseY + subChartHeight - (subChartHeight / steps) * i
      });
    }
    return labels;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(1) + '亿';
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(0) + '万';
    }
    return volume.toString();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(ctm.inverse());
    const svgX = svgPoint.x;
    const svgY = svgPoint.y;

    if (svgX < padding.left || svgX > padding.left + chartWidth) {
      setHoverInfo(null);
      return;
    }

    const step = chartWidth / (data.length - 1 || 1);
    const dataIndex = Math.round((svgX - padding.left) / step);
    if (dataIndex < 0 || dataIndex >= data.length) {
      setHoverInfo(null);
      return;
    }

    const d = data[dataIndex];
    setHoverInfo({
      x: getX(dataIndex),
      y: svgY,
      index: dataIndex,
      price: prices[dataIndex],
      avgPrice: avgPrices[dataIndex],
      volume: volumes[dataIndex],
      time: `${d.hour.toString().padStart(2, '0')}:${d.minute.toString().padStart(2, '0')}`
    });
  }, [data, prices, avgPrices, volumes, height, chartWidth, padding.left]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const timeLabels = generateTimeLabels();
  const priceLabels = generatePriceLabels();
  const volumeLabels = generateVolumeLabels();

  return (
    <div style={{ 
      background: '#ffffff', 
      width: '100%',
      height,
      position: 'relative'
    }}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 1000 ${height}`} 
        width="100%" 
        height="100%" 
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {priceLabels.map((label, i) => (
          <line
            key={`price-grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            stroke={gridColor}
            strokeWidth="1"
          />
        ))}

        {volumeLabels.map((label, i) => (
          <line
            key={`vol-grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            stroke={gridColor}
            strokeWidth="1"
          />
        ))}

        {(() => {
          const midIndex = data.findIndex(d => d.hour === 13 && d.minute === 0);
          if (midIndex !== -1) {
            const midX = getX(midIndex);
            return (
              <line
                key="midline"
                x1={midX}
                y1={padding.top}
                x2={midX}
                y2={padding.top + mainChartHeight + gapHeight + subChartHeight}
                stroke={gridColor}
                strokeWidth="1"
              />
            );
          }
          return null;
        })()}

        <line
          x1={padding.left}
          y1={getPriceY(yesterdayClose)}
          x2={padding.left + chartWidth}
          y2={getPriceY(yesterdayClose)}
          stroke={closeLineColor}
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {(() => {
          const linePath = getLinePath(d => d.price || yesterdayClose);
          const lastX = getX(data.length - 1);
          const firstX = getX(0);
          const baseY = getPriceY(yesterdayClose);
          const areaPath = `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
          
          return (
            <path
              d={areaPath}
              fill="url(#fillGradient)"
            />
          );
        })()}

        <path
          d={getLinePath(d => d.price || yesterdayClose)}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
        />

        <path
          d={getLinePath(d => d.avg_price || yesterdayClose)}
          fill="none"
          stroke={avgColor}
          strokeWidth="1.5"
        />

        {priceLabels.map((label, i) => (
          <g key={`price-label-${i}`}>
            <text
              x={padding.left - 10}
              y={label.y + 4}
              textAnchor="end"
              fontSize="10"
              fill={textColor}
            >
              {label.price.toFixed(2)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = getX(i);
          const barWidth = Math.max(2, chartWidth / data.length - 1);
          const startX = x - barWidth / 2;
          const volumeBaseY = padding.top + mainChartHeight + gapHeight + subChartHeight;
          
          const volume = volumes[i];
          const volumeY = getVolumeY(volume);
          const barHeight = Math.max(1, volumeBaseY - volumeY);
          
          return (
            <rect
              key={i}
              x={startX}
              y={volumeBaseY - barHeight}
              width={barWidth}
              height={barHeight}
              fill={getBarColor(i)}
            />
          );
        })}

        {volumeLabels.map((label, i) => (
          <text
            key={`vol-label-${i}`}
            x={padding.left + chartWidth + 10}
            y={label.y + 4}
            textAnchor="start"
            fontSize="10"
            fill={textColor}
          >
            {formatVolume(label.volume)}
          </text>
        ))}

        {timeLabels.map((label, i) => (
          <text
            key={`time-${i}`}
            x={label.x}
            y={height - 15}
            textAnchor="middle"
            fontSize="10"
            fill={textColor}
          >
            {label.text}
          </text>
        ))}

        <circle
          cx={getX(data.length - 1)}
          cy={getPriceY(lastPrice)}
          r="4"
          fill={lineColor}
        />

        {hoverInfo && (
          <>
            <line
              x1={hoverInfo.x}
              y1={padding.top}
              x2={hoverInfo.x}
              y2={padding.top + mainChartHeight + gapHeight + subChartHeight}
              stroke={crosshairColor}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1={padding.left}
              y1={getPriceY(hoverInfo.price)}
              x2={padding.left + chartWidth}
              y2={getPriceY(hoverInfo.price)}
              stroke={crosshairColor}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hoverInfo.x}
              cy={getPriceY(hoverInfo.price)}
              r="5"
              fill={hoverInfo.price >= yesterdayClose ? upColor : downColor}
              stroke="#fff"
              strokeWidth="2"
            />
            <rect
              x={hoverInfo.x - 40}
              y={padding.top - 30}
              width="80"
              height="20"
              rx="4"
              fill="#333"
            />
            <text
              x={hoverInfo.x}
              y={padding.top - 16}
              textAnchor="middle"
              fontSize="11"
              fill="#fff"
            >
              {hoverInfo.time}
            </text>
            <rect
              x={padding.left + chartWidth + 5}
              y={getPriceY(hoverInfo.price) - 10}
              width="55"
              height="20"
              rx="4"
              fill={hoverInfo.price >= yesterdayClose ? upColor : downColor}
            />
            <text
              x={padding.left + chartWidth + 32}
              y={getPriceY(hoverInfo.price) + 4}
              textAnchor="middle"
              fontSize="11"
              fill="#fff"
            >
              {hoverInfo.price.toFixed(2)}
            </text>
          </>
        )}
      </svg>

      {hoverInfo && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 0,
          display: 'flex',
          gap: 16,
          fontSize: 12,
          color: '#333',
          zIndex: 10,
          background: 'rgba(255,255,255,0.9)',
          padding: '4px 10px',
          borderRadius: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <span>
            <span style={{ color: '#999' }}>时间</span>{' '}
            <span style={{ fontWeight: 600 }}>{hoverInfo.time}</span>
          </span>
          <span>
            <span style={{ color: '#999' }}>价格</span>{' '}
            <span style={{ fontWeight: 600, color: hoverInfo.price >= yesterdayClose ? upColor : downColor }}>
              {hoverInfo.price.toFixed(2)}
            </span>
          </span>
          <span>
            <span style={{ color: '#999' }}>均价</span>{' '}
            <span style={{ fontWeight: 600, color: avgColor }}>
              {hoverInfo.avgPrice.toFixed(2)}
            </span>
          </span>
          <span>
            <span style={{ color: '#999' }}>成交量</span>{' '}
            <span style={{ fontWeight: 600 }}>{formatVolume(hoverInfo.volume)}</span>
          </span>
          <span>
            <span style={{ color: '#999' }}>涨跌</span>{' '}
            <span style={{ fontWeight: 600, color: hoverInfo.price >= yesterdayClose ? upColor : downColor }}>
              {((hoverInfo.price - yesterdayClose) / yesterdayClose * 100).toFixed(2)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export { MinuteChart };
