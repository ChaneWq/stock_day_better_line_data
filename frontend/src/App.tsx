import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Portfolio from './pages/Portfolio';
import PortfolioVisualization from './pages/PortfolioVisualization';
import StockDetail from './pages/StockDetail';
import KDJ from './pages/KDJ';
import MACD from './pages/MACD';
import BBI from './pages/BBI';
import Settings from './pages/Settings';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/portfolio/visualization" element={<PortfolioVisualization />} />
            <Route path="/stock/:code" element={<StockDetail />} />
            <Route path="/analysis/kdj" element={<KDJ />} />
            <Route path="/analysis/macd" element={<MACD />} />
            <Route path="/analysis/bbi" element={<BBI />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
