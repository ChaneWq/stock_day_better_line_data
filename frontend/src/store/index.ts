import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StockGroup, StockPrice, StockMinute, StockInfo } from '../types';
import { STOCK_CONFIG } from '../config/stockConfig';

// 缓存数据结构
interface CachedStockData {
  price: StockPrice;
  minutes: StockMinute[];
  timestamp: number;
  date: string;
}

// 搜索结果缓存
interface CachedSearchData {
  results: StockInfo[];
  timestamp: number;
}

// 缓存策略类型
type CacheStrategy = 'cache-only' | 'cache-first' | 'network-first';

export interface ImportGroupItem {
  name: string;
  stocks: string[];
}

export interface ImportGroupsData {
  version: string;
  exportTime: string;
  platform: string;
  groups: ImportGroupItem[];
}

interface StockStore {
  // 基础配置
  groups: StockGroup[];
  currentGroupId: string | null;
  searchHistory: string[];
  aStockDate: string;
  
  // UI配置
  miniChartWidth: number;
  miniChartHeight: number;
  showStockName: boolean;
  
  // 个股名称
  stockNames: Record<string, string>;
  
  // 缓存策略配置
  cacheStrategy: CacheStrategy;
  enablePersistentCache: boolean;
  
  // 定时刷新配置
  enableAutoRefresh: boolean;
  refreshInterval: number; // 秒
  
  // 缓存数据
  cachedStockData: Record<string, CachedStockData>;
  cachedSearchData: Record<string, CachedSearchData>;
  
  // 配置方法
  addGroup: (name: string) => void;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  addStockToGroup: (groupId: string, stockCode: string) => void;
  removeStockFromGroup: (groupId: string, stockCode: string) => void;
  setCurrentGroup: (groupId: string | null) => void;
  addSearchHistory: (stockCode: string) => void;
  setAStockDate: (date: string) => void;
  setMiniChartWidth: (width: number) => void;
  setMiniChartHeight: (height: number) => void;
  toggleShowStockName: () => void;
  
  // 个股名称方法
  importStockNames: (names: Record<string, string>) => number;
  clearStockNames: () => void;
  
  // 缓存策略方法
  setCacheStrategy: (strategy: CacheStrategy) => void;
  setEnablePersistentCache: (enable: boolean) => void;
  
  // 定时刷新方法
  setEnableAutoRefresh: (enable: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  
  // 缓存方法
  setCachedStockData: (code: string, price: StockPrice, minutes: StockMinute[], date: string) => void;
  getCachedStockData: (code: string, date: string) => CachedStockData | null;
  setCachedSearchData: (keyword: string, results: StockInfo[]) => void;
  getCachedSearchData: (keyword: string) => StockInfo[] | null;
  clearCache: () => void;
  clearExpiredCache: () => void;
  importGroups: (importData: ImportGroupsData, mode: 'merge' | 'replace') => { addedGroups: number; mergedGroups: number; addedStocks: number };
}

export const useStockStore = create<StockStore>()(
  persist(
    (set, get) => ({
      // 初始化数据
      groups: [
        { id: 'default', name: '默认分组', stocks: [STOCK_CONFIG.DEFAULT_CODE] }
      ],
      currentGroupId: 'default',
      searchHistory: [],
      aStockDate: '20260508',
      
      // UI配置
      miniChartWidth: 200,
      miniChartHeight: 80,
      showStockName: true,
      
      // 个股名称
      stockNames: {},
      
      // 缓存策略配置
      cacheStrategy: 'cache-first',
      enablePersistentCache: true,
      
      // 定时刷新配置 - 默认不启用
      enableAutoRefresh: false,
      refreshInterval: 300, // 默认5分钟
      
      // 缓存数据
      cachedStockData: {},
      cachedSearchData: {},
      
      // 分组管理
      addGroup: (name: string) => set((state) => ({
        groups: [...state.groups, { id: Date.now().toString(), name, stocks: [] }]
      })),
      
      removeGroup: (groupId: string) => set((state) => ({
        groups: state.groups.filter(g => g.id !== groupId),
        currentGroupId: state.currentGroupId === groupId ? null : state.currentGroupId
      })),
      
      renameGroup: (groupId: string, name: string) => set((state) => ({
        groups: state.groups.map(g => g.id === groupId ? { ...g, name } : g)
      })),
      
      addStockToGroup: (groupId: string, stockCode: string) => set((state) => ({
        groups: state.groups.map(g => 
          g.id === groupId && !g.stocks.includes(stockCode) 
            ? { ...g, stocks: [...g.stocks, stockCode] } 
            : g
        )
      })),
      
      removeStockFromGroup: (groupId: string, stockCode: string) => set((state) => ({
        groups: state.groups.map(g => 
          g.id === groupId 
            ? { ...g, stocks: g.stocks.filter(s => s !== stockCode) } 
            : g
        )
      })),
      
      setCurrentGroup: (groupId: string | null) => set({ currentGroupId: groupId }),
      
      addSearchHistory: (stockCode: string) => set((state) => ({
        searchHistory: [stockCode, ...state.searchHistory.filter(s => s !== stockCode)].slice(0, 10)
      })),
      
      setAStockDate: (date: string) => set({ aStockDate: date }),
      
      setMiniChartWidth: (width: number) => set({ miniChartWidth: width }),
      setMiniChartHeight: (height: number) => set({ miniChartHeight: height }),
      
      toggleShowStockName: () => set((state) => ({ showStockName: !state.showStockName })),
      
      importStockNames: (names: Record<string, string>) => {
        const state = get();
        const merged = { ...state.stockNames, ...names };
        set({ stockNames: merged });
        return Object.keys(names).length;
      },
      
      clearStockNames: () => set({ stockNames: {} }),
      
      // 缓存策略方法
      setCacheStrategy: (strategy: CacheStrategy) => set({ cacheStrategy: strategy }),
      
      setEnablePersistentCache: (enable: boolean) => set({ enablePersistentCache: enable }),
      
      // 定时刷新方法
      setEnableAutoRefresh: (enable: boolean) => set({ enableAutoRefresh: enable }),
      
      setRefreshInterval: (interval: number) => set({ refreshInterval: interval }),
      
      // 股票数据缓存
      setCachedStockData: (code: string, price: StockPrice, minutes: StockMinute[], date: string) => {
        const key = `${code}_${date}`;
        set((state) => ({
          cachedStockData: {
            ...state.cachedStockData,
            [key]: {
              price,
              minutes,
              timestamp: Date.now(),
              date
            }
          }
        }));
      },
      
      getCachedStockData: (code: string, date: string) => {
        const state = get();
        const key = `${code}_${date}`;
        return state.cachedStockData[key] || null;
      },
      
      // 搜索结果缓存
      setCachedSearchData: (keyword: string, results: StockInfo[]) => {
        const key = keyword.toLowerCase();
        set((state) => ({
          cachedSearchData: {
            ...state.cachedSearchData,
            [key]: {
              results,
              timestamp: Date.now()
            }
          }
        }));
      },
      
      getCachedSearchData: (keyword: string) => {
        const state = get();
        const key = keyword.toLowerCase();
        const cached = state.cachedSearchData[key];
        return cached ? cached.results : null;
      },
      
      // 清空缓存
      clearCache: () => set({ cachedStockData: {}, cachedSearchData: {} }),
      
      // 清理过期缓存（保留最近30天数据）
      clearExpiredCache: () => {
        const state = get();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        
        const filteredStockData: Record<string, CachedStockData> = {};
        Object.entries(state.cachedStockData).forEach(([key, data]) => {
          if (data.timestamp > thirtyDaysAgo) {
            filteredStockData[key] = data;
          }
        });
        
        const filteredSearchData: Record<string, CachedSearchData> = {};
        Object.entries(state.cachedSearchData).forEach(([key, data]) => {
          if (data.timestamp > thirtyDaysAgo) {
            filteredSearchData[key] = data;
          }
        });
        
        set({
          cachedStockData: filteredStockData,
          cachedSearchData: filteredSearchData
        });
      },
      
      importGroups: (importData: ImportGroupsData, mode: 'merge' | 'replace') => {
        const state = get();
        let addedGroups = 0;
        let mergedGroups = 0;
        let addedStocks = 0;
        
        if (mode === 'replace') {
          const newGroups: StockGroup[] = importData.groups.map((g, index) => ({
            id: `imported_${Date.now()}_${index}`,
            name: g.name,
            stocks: [...new Set(g.stocks)]
          }));
          set({
            groups: newGroups,
            currentGroupId: newGroups.length > 0 ? newGroups[0].id : null
          });
          addedGroups = newGroups.length;
          return { addedGroups, mergedGroups: 0, addedStocks: 0 };
        }
        
        const existingGroups = [...state.groups];
        
        for (const importGroup of importData.groups) {
          if (!importGroup.name || !importGroup.name.trim()) continue;
          
          const existingGroup = existingGroups.find(g => g.name === importGroup.name);
          
          if (existingGroup) {
            const newStocks = importGroup.stocks.filter(s => !existingGroup.stocks.includes(s));
            existingGroup.stocks = [...existingGroup.stocks, ...newStocks];
            mergedGroups++;
            addedStocks += newStocks.length;
          } else {
            const newGroup: StockGroup = {
              id: `imported_${Date.now()}_${addedGroups}`,
              name: importGroup.name.trim(),
              stocks: [...new Set(importGroup.stocks)]
            };
            existingGroups.push(newGroup);
            addedGroups++;
            addedStocks += newGroup.stocks.length;
          }
        }
        
        set({ groups: existingGroups });
        return { addedGroups, mergedGroups, addedStocks };
      },
    }),
    {
      name: 'stock-storage',
      // 持久化所有数据，包括缓存
      partialize: (state) => ({
        groups: state.groups,
        currentGroupId: state.currentGroupId,
        searchHistory: state.searchHistory,
        aStockDate: state.aStockDate,
        miniChartWidth: state.miniChartWidth,
        miniChartHeight: state.miniChartHeight,
        showStockName: state.showStockName,
        stockNames: state.stockNames,
        cacheStrategy: state.cacheStrategy,
        enablePersistentCache: state.enablePersistentCache,
        enableAutoRefresh: state.enableAutoRefresh,
        refreshInterval: state.refreshInterval,
        cachedStockData: state.enablePersistentCache ? state.cachedStockData : {},
        cachedSearchData: state.enablePersistentCache ? state.cachedSearchData : {}
      })
    }
  )
);

// Selectors - 优化的状态访问
export const useCurrentGroup = () => useStockStore(
  (state) => state.groups.find(g => g.id === state.currentGroupId)
);

export const useStockCache = (code: string, date: string) => useStockStore(
  (state) => state.getCachedStockData(code, date)
);
