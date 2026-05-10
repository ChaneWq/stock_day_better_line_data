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

export function formatTimeLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
