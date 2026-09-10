import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Dropdown, Layout, Menu, Typography } from "antd";
import {
  AppstoreOutlined,
  BookOutlined,
  DashboardOutlined,
  FlagOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { LABELS, ROUTES } from "@/utils/constants";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MENU_ITEMS = [
  {
    key: ROUTES.admin.dashboard,
    icon: <DashboardOutlined />,
    label: <Link to={ROUTES.admin.dashboard}>{LABELS.dashboard}</Link>,
  },
  {
    key: ROUTES.admin.reviewQueue,
    icon: <SafetyCertificateOutlined />,
    label: <Link to={ROUTES.admin.reviewQueue}>{LABELS.reviewQueue}</Link>,
  },
  {
    key: ROUTES.admin.reports,
    icon: <FlagOutlined />,
    label: <Link to={ROUTES.admin.reports}>{LABELS.reports}</Link>,
  },
  {
    key: ROUTES.admin.stories,
    icon: <BookOutlined />,
    label: <Link to={ROUTES.admin.stories}>{LABELS.stories}</Link>,
  },
  {
    key: ROUTES.admin.genres,
    icon: <AppstoreOutlined />,
    label: <Link to={ROUTES.admin.genres}>{LABELS.genres}</Link>,
  },
];

function selectedKey(pathname: string): string {
  if (pathname.startsWith(ROUTES.admin.reviewQueue)) return ROUTES.admin.reviewQueue;
  if (pathname.startsWith(ROUTES.admin.reports)) return ROUTES.admin.reports;
  if (pathname.startsWith(ROUTES.admin.stories)) return ROUTES.admin.stories;
  if (pathname.startsWith(ROUTES.admin.genres)) return ROUTES.admin.genres;
  return ROUTES.admin.dashboard;
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 16px",
            color: "#fff",
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          <SafetyCertificateOutlined style={{ fontSize: 20 }} />
          {!collapsed && <span>StoryVerse Admin</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey(location.pathname)]}
          items={MENU_ITEMS}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 20px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "role",
                  disabled: true,
                  label: <Text type="secondary">{user?.roles?.join(", ")}</Text>,
                },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Log out",
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.displayName || "Admin"}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
