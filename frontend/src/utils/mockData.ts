import { StockMinute, StockPrice } from '@/types';
import { STOCK_CONFIG } from '@/config/stockConfig';

export function generateMockStockPrice(code: string): StockPrice {
  const isDefaultStock = code === STOCK_CONFIG.DEFAULT_CODE;
  const basePrice = isDefaultStock ? STOCK_CONFIG.DEFAULT_PRICE : 15 + Math.random() * 10;
  const changePercent = (Math.random() - 0.5) * 5;
  
  return {
    code,
    current_price: basePrice,
    change_percent: changePercent,
  };
}

export function generateMockMinutes(code: string, date: string): StockMinute[] {
  const mockMinutes: StockMinute[] = [];
  
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  const yestClose = code === STOCK_CONFIG.DEFAULT_CODE ? STOCK_CONFIG.YESTERDAY_CLOSE : 15;
  let basePrice = yestClose;
  let cumulativeVolume = 0;
  let cumulativeAmount = 0;
  
  for (let i = 0; i < 120; i++) {
    const hour = 9 + Math.floor((i + 30) / 60);
    const minute = (i + 30) % 60;
    
    const wave1 = Math.sin(i / 15) * 0.15;
    const wave2 = Math.sin(i / 25) * 0.1;
    const noise = (seededRandom() - 0.5) * 0.08;
    
    const newPrice = basePrice + wave1 + wave2 + noise;
    const volume = Math.floor(100000 + seededRandom() * 500000);
    const amount = newPrice * volume;
    
    cumulativeVolume += volume;
    cumulativeAmount += amount;
    const avgPrice = cumulativeAmount / cumulativeVolume;
    
    mockMinutes.push({
      price: newPrice,
      volume,
      vol: volume,
      amount,
      cum_amount: cumulativeAmount,
      cum_vol: cumulativeVolume,
      avg_price: avgPrice,
      hour,
      minute,
      code,
      trade_date: date,
    });
    basePrice = newPrice;
  }
  
  for (let i = 0; i < 120; i++) {
    const hour = 13 + Math.floor(i / 60);
    const minute = i % 60;
    
    const wave1 = Math.sin((i + 120) / 15) * 0.15;
    const wave2 = Math.sin((i + 120) / 25) * 0.1;
    const noise = (seededRandom() - 0.5) * 0.08;
    
    const newPrice = basePrice + wave1 + wave2 + noise;
    const volume = Math.floor(100000 + seededRandom() * 500000);
    const amount = newPrice * volume;
    
    cumulativeVolume += volume;
    cumulativeAmount += amount;
    const avgPrice = cumulativeAmount / cumulativeVolume;
    
    mockMinutes.push({
      price: newPrice,
      volume,
      vol: volume,
      amount,
      cum_amount: cumulativeAmount,
      cum_vol: cumulativeVolume,
      avg_price: avgPrice,
      hour,
      minute,
      code,
      trade_date: date,
    });
    basePrice = newPrice;
  }
  
  return mockMinutes;
}

export function generateMockMiniMinutes(code: string, date: string): StockMinute[] {
  const mockMinutes: StockMinute[] = [];
  
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  const basePrice = code === STOCK_CONFIG.DEFAULT_CODE ? STOCK_CONFIG.DEFAULT_PRICE : 15 + seededRandom() * 10;
  
  for (let i = 0; i < 60; i++) {
    const hour = 9 + Math.floor(i / 60);
    const minute = i % 60;
    
    const wave1 = Math.sin(i / 10) * 0.2;
    const noise = (seededRandom() - 0.5) * 0.15;
    const volume = Math.floor(100000 + seededRandom() * 500000);
    
    mockMinutes.push({
      price: basePrice + wave1 + noise,
      volume,
      vol: volume,
      amount: 0,
      cum_amount: 0,
      cum_vol: 0,
      avg_price: basePrice + wave1 + noise,
      hour,
      minute,
      code,
      trade_date: date,
    });
  }
  
  return mockMinutes;
}
