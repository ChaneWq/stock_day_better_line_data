import { StockMinute } from '@/types';

export function calculateAvgPrices(data: StockMinute[]): number[] {
  let totalValue = 0;
  let totalVolume = 0;
  return data.map((d) => {
    totalValue += d.price * d.volume;
    totalVolume += d.volume;
    return totalVolume > 0 ? totalValue / totalVolume : d.price;
  });
}

export function calculateStrengthScore(minutes: StockMinute[]): number {
  if (!minutes || minutes.length === 0) return 0;
  return minutes.filter(m => m.price >= m.avg_price).length;
}

export function calculateStrengthPercent(minutes: StockMinute[]): number {
  if (!minutes || minutes.length === 0) return 0;
  const aboveCount = minutes.filter(m => m.price >= m.avg_price).length;
  return Math.round((aboveCount / minutes.length) * 100);
}

export function getStrengthColor(percent: number): string {
  if (percent >= 70) return '#f5222d';
  if (percent >= 40) return '#fa8c16';
  return '#52c41a';
}

export function formatTimeLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
