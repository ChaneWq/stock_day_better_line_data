# A股股票分析平台 - 前端

基于 React + TypeScript + Vite + Ant Design + ECharts 构建的股票分析平台。

## 功能特性

### 1. 首页
- 大盘概览快速入口
- 热门股票实时展示
- 快捷操作卡片

### 2. 股票搜索
- 支持股票代码搜索
- 实时价格和涨跌幅展示
- 搜索历史记录
- 直接添加到自选分组

### 3. 自选股管理（核心功能）
- **多分组管理**：创建、编辑、删除自选分组
- **多股同列展示**：支持 2列/3列/4列 网格布局
- **分时走势图**：每只股票实时展示分时图
- **列表/网格双视图**：切换不同的展示方式
- **数据持久化**：使用 localStorage 保存分组和自选股

### 4. 股票详情
- 分时走势图
- 技术指标快速入口
- 日期选择查看历史数据

### 5. 技术分析
- **KDJ 指标**：随机指标分析（支持日K/周K/月K）
- **MACD 指标**：平滑异同移动平均线
- **BBI 指标**：多空均线

## 项目结构

```
frontend/
├── src/
│   ├── components/      # 公共组件
│   │   └── Layout.tsx   # 主布局
│   ├── pages/           # 页面组件
│   │   ├── Home.tsx     # 首页
│   │   ├── Search.tsx   # 搜索页
│   │   ├── Portfolio.tsx # 自选股管理
│   │   ├── StockDetail.tsx # 股票详情
│   │   ├── KDJ.tsx      # KDJ指标
│   │   ├── MACD.tsx     # MACD指标
│   │   ├── BBI.tsx      # BBI指标
│   │   └── Settings.tsx # 设置页
│   ├── services/        # API 服务
│   │   └── api.ts
│   ├── store/           # 状态管理
│   │   └── index.ts
│   ├── types/           # 类型定义
│   │   └── index.ts
│   ├── App.tsx          # 主应用
│   ├── main.tsx         # 入口
│   └── index.css        # 样式
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈

- **React 18**：UI 框架
- **TypeScript**：类型安全
- **Vite**：构建工具
- **Ant Design**：UI 组件库
- **ECharts**：图表库
- **React Router**：路由管理
- **Zustand**：状态管理（含持久化）
- **Day.js**：日期处理

## 快速开始

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## API 配置

前端通过代理连接后端 API，配置在 `vite.config.ts` 中：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
}
```

确保后端服务在 http://localhost:5000 启动。

## API 接口

根据后端 API 文档，前端集成了以下接口：

- `GET /api/health` - 健康检查
- `GET /api/stock/minutes` - 获取分时数据
- `GET /api/stock/price/current` - 获取当前价格
- `GET /api/stock/indicator/kdj` - 获取 KDJ 指标
- `GET /api/stock/indicator/macd` - 获取 MACD 指标
- `GET /api/stock/indicator/bbi` - 获取 BBI 指标

## 特性亮点

1. **多股同列**：自选股支持网格布局，同时查看多只股票分时图
2. **分组管理**：灵活的分组创建和管理
3. **数据持久化**：使用 localStorage 自动保存用户配置
4. **模拟数据**：后端不可用时自动使用模拟数据，确保正常使用
5. **响应式设计**：适配不同屏幕尺寸
6. **实时更新**：支持数据刷新和自动刷新配置

## 开发说明

- 所有组件使用 TypeScript 编写
- 状态管理使用 Zustand，简洁高效
- API 调用集中在 services/api.ts
- 图表使用 ECharts，功能强大

## 许可证

MIT
