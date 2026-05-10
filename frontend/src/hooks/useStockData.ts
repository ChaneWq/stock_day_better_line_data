import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '@/services/api';
import { StockPrice, StockMinute } from '@/types';
import { useStockStore } from '@/store';

interface UseStockDataResult {
  price: StockPrice | null;
  minutes: StockMinute[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  refresh: () => Promise<void>;
  cacheTimestamp: number | null;
}

export const useStockData = (code: string, date: string): UseStockDataResult => {
  const queryClient = useQueryClient();
  const { getCachedStockData } = useStockStore();

  const { data, isLoading, error, isFetching, isStale } = useQuery({
    queryKey: ['stock', code, date],
    queryFn: async () => {
      const [priceRes, minutesRes] = await Promise.all([
        stockApi.getStockPrice(code),
        stockApi.getStockMinutes(code, date),
      ]);

      const stockPrice = priceRes.data;
      let stockMinutes: StockMinute[] = [];

      if (Array.isArray(minutesRes.data)) {
        stockMinutes = minutesRes.data;
      } else if (minutesRes.data && 'minutes' in minutesRes.data && Array.isArray((minutesRes.data as any).minutes)) {
        stockMinutes = (minutesRes.data as any).minutes;
      }

      return { price: stockPrice, minutes: stockMinutes };
    },
    enabled: !!code && !!date,
    retry: 0,
    staleTime: 5 * 60 * 1000, // 5分钟
  });

  const refresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['stock', code, date] });
  };

  // 从缓存中获取时间戳
  const cachedData = getCachedStockData(code, date);

  return {
    price: data?.price || null,
    minutes: data?.minutes || [],
    loading: isLoading || isFetching,
    error: error instanceof Error ? error.message : null,
    fromCache: !isStale && !!data,
    refresh,
    cacheTimestamp: cachedData?.timestamp || null,
  };
};

export const useAutoRefresh = (
  callback: () => void,
  enable: boolean,
  interval: number,
  dependencies: React.DependencyList = []
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (enable && interval > 0) {
      intervalRef.current = setInterval(() => {
        savedCallback.current();
      }, interval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enable, interval, ...dependencies]);
};