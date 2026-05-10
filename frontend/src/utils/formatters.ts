export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatChange(change: number): string {
  return `${change >= 0 ? '+' : ''}${formatPrice(change)}`;
}
