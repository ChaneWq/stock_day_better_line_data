import { StockMinute } from '@/types';
import { CHART_COLORS } from '@/constants/theme';

interface MiniChartProps {
  data: StockMinute[];
  width?: number;
  height?: number;
}

export function MiniChart({ data, width = 200, height = 80 }: MiniChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
        暂无数据
      </div>
    );
  }

  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const prices = data.map(d => d.price);
  const avgPrices = data.map(d => d.avg_price).filter((p): p is number => p != null);
  const allPrices = [...prices, ...avgPrices];
  const minPrice = Math.min(...allPrices) * 0.999;
  const maxPrice = Math.max(...allPrices) * 1.001;
  const priceRange = maxPrice - minPrice || 1;

  const getX = (index: number) => padding + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (price: number) => padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

  const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.price)}`).join(' ');
  const avgPathData = data.map((d, i) => {
    const y = d.avg_price != null ? getY(d.avg_price) : getY(d.price);
    return `${i === 0 ? 'M' : 'L'} ${getX(i)} ${y}`;
  }).join(' ');

  const firstPrice = data[0]?.price || 0;
  const lastPrice = data[data.length - 1]?.price || 0;
  const isUp = lastPrice >= firstPrice;
  const lineColor = isUp ? CHART_COLORS.UP : CHART_COLORS.DOWN;

  return (
    <svg width={width} height={height} style={{ marginTop: 8, display: 'block' }}>
      <path
        d={avgPathData}
        fill="none"
        stroke={CHART_COLORS.AVG_LINE}
        strokeWidth="1.5"
        // strokeDasharray="3,2"
      />
      <path
        d={pathData}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
      />
    </svg>
  );
}
