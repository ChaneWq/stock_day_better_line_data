export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface StockPrice {
  code: string;
  current_price: number;
  change_percent: number;
}

export interface StockMinute {
  price: number;
  vol: number;
  amount: number;
  cum_amount: number;
  cum_vol: number;
  avg_price: number;
  hour: number;
  minute: number;
  code: string;
  trade_date: string;
}

export interface KDJData {
  k: number;
  d: number;
  j: number;
}

export interface MACDData {
  dif: number;
  dea: number;
  macd: number;
}

export interface IndicatorResponse<T> {
  code: string;
  period: string;
  date: string;
  kdj?: T;
  macd?: T;
  bbi?: number;
}

export interface StockGroup {
  id: string;
  name: string;
  stocks: string[];
}

export interface StockInfo extends StockPrice {
  name?: string;
}

export interface RouteState {
  code?: string;
}
