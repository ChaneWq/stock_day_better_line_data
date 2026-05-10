import { STOCK_CONFIG } from '@/config/stockConfig';

export function getStockName(code: string): string {
  const mockNames: Record<string, string> = {
    '000400': '许继电气',
    '600519': '贵州茅台',
    '601318': '中国平安',
    '000001': '平安银行',
  };
  return mockNames[code] || '未知股票';
}

export function getStockCodeDisplay(code: string): string {
  const prefix = code.startsWith('6') ? 'SH' : 'SZ';
  return `${prefix}.${code}`;
}

export function isStockUp(price: number, yesterdayClose: number = STOCK_CONFIG.YESTERDAY_CLOSE): boolean {
  return price > yesterdayClose;
}

export function isStockDown(price: number, yesterdayClose: number = STOCK_CONFIG.YESTERDAY_CLOSE): boolean {
  return price < yesterdayClose;
}
