import { Layout as AntLayout, Menu, theme } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  SearchOutlined, 
  StarOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  RiseOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/search', icon: <SearchOutlined />, label: '股票搜索' },
  { key: '/portfolio', icon: <StarOutlined />, label: '自选股' },
  {
    key: 'analysis',
    icon: <BarChartOutlined />,
    label: '技术分析',
    children: [
      { key: '/analysis/kdj', label: 'KDJ指标' },
      { key: '/analysis/macd', label: 'MACD指标' },
      { key: '/analysis/bbi', label: 'BBI指标' },
    ],
  },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/analysis')) {
      return ['analysis'];
    }
    return [path];
  };

  const getOpenKeys = () => {
    if (location.pathname.startsWith('/analysis')) {
      return ['analysis'];
    }
    return [];
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={240}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          fontWeight: 'bold'
        }}>
          <RiseOutlined style={{ marginRight: 8 }} />
          A股平台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
