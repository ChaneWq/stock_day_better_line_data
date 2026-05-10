import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import localforage from 'localforage'
import App from './App.tsx'
import './index.css'

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5分钟内认为新鲜，直接用缓存
      gcTime: 30 * 60 * 1000,        // 30分钟后垃圾回收
      retry: 2,                       // 失败重试 2 次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
      refetchOnWindowFocus: false,    // 窗口聚焦时不重新请求
    },
  },
})

// 配置持久化到 IndexedDB
persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (client) => {
      await localforage.setItem('REACT_QUERY_CACHE', client)
    },
    restoreClient: async () => {
      const client = await localforage.getItem('REACT_QUERY_CACHE')
      return client as any
    },
    removeClient: async () => {
      await localforage.removeItem('REACT_QUERY_CACHE')
    },
  },
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30天
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)