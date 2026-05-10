import { apiClient } from './client';
import { StockPrice, StockMinute, KDJData, MACDData, IndicatorResponse } from '@/types';

export const stockApi = {
  async getHealth() {
    return apiClient.get('/health');
  },

  async getStockPrice(code: string) {
    return apiClient.get<StockPrice>('/stock/price/current', { code });
  },

  async getStockMinutes(code: string, date: string) {
    return apiClient.get<{ minutes: StockMinute[] } | StockMinute[]>('/stock/minutes', { code, date });
  },

  async getKDJ(code: string, period = 'day', date?: string) {
    const params: Record<string, string | number> = { code, period };
    if (date) params.date = date;
    return apiClient.get<IndicatorResponse<KDJData>>('/stock/indicator/kdj', params);
  },

  async getMACD(code: string, period = 'day', date?: string) {
    const params: Record<string, string | number> = { code, period };
    if (date) params.date = date;
    return apiClient.get<IndicatorResponse<MACDData>>('/stock/indicator/macd', params);
  },

  async getBBI(code: string, period = 'day', date?: string) {
    const params: Record<string, string | number> = { code, period };
    if (date) params.date = date;
    return apiClient.get<IndicatorResponse<number>>('/stock/indicator/bbi', params);
  },
};
