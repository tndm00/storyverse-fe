import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Dropdown, Layout, Menu, Typography, theme } from "antd";
import {
  AppstoreOutlined,
  BookOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  DashboardOutlined,
  FlagOutlined,
  GlobalOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import { AdminLocaleProvider } from "@/context/AdminLocaleProvider";
import { AdminThemeProvider } from "@/context/AdminThemeProvider";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/utils/constants";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Key of the "Settings" sub-menu (it is a group, not a page, so it is not a route).
const SETTINGS_MENU_KEY = "settings";

function selectedKey(pathname: string): string {
  if (pathname.startsWith(ROUTES.admin.rejectedQueue)) return ROUTES.admin.rejectedQueue;
  if (pathname.startsWith(ROUTES.admin.reviewQueue)) return ROUTES.admin.reviewQueue;
  if (pathname.startsWith(ROUTES.admin.reports)) return ROUTES.admin.reports;
  if (pathname.startsWith(ROUTES.admin.comments)) return ROUTES.admin.comments;
  if (pathname.startsWith(ROUTES.admin.stories)) return ROUTES.admin.stories;
  if (pathname.startsWith(ROUTES.admin.genres)) return ROUTES.admin.genres;
  if (pathname.startsWith(ROUTES.admin.authors)) return ROUTES.admin.authors;
  if (pathname.startsWith(ROUTES.admin.searchSync)) return ROUTES.admin.searchSync;
  if (pathname.startsWith(ROUTES.admin.settingsLanguage)) return ROUTES.admin.settingsLanguage;
  if (pathname.startsWith(ROUTES.admin.settings)) return ROUTES.admin.settingsAppearance;
  return ROUTES.admin.dashboard;
}

const isSettingsPath = (pathname: string) => pathname.startsWith(ROUTES.admin.settings);

// The shell is split from AdminLayout so it can read theme tokens and the language from inside the
// providers.
function AdminShell() {
  const { token } = theme.useToken();
  const { t } = useAdminLocale();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // The Settings group opens by itself when the current page is one of its pages (also when the
  // page is opened by URL), but the admin can still open/close it by hand.
  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    isSettingsPath(location.pathname) ? [SETTINGS_MENU_KEY] : [],
  );
  useEffect(() => {
    if (isSettingsPath(location.pathname)) {
      setOpenKeys((keys) => (keys.includes(SETTINGS_MENU_KEY) ? keys : [...keys, SETTINGS_MENU_KEY]));
    }
  }, [location.pathname]);

  const menuItems = useMemo(
    () => [
      {
        key: ROUTES.admin.dashboard,
        icon: <DashboardOutlined />,
        label: <Link to={ROUTES.admin.dashboard}>{t("nav.dashboard")}</Link>,
      },
      {
        key: ROUTES.admin.reviewQueue,
        icon: <SafetyCertificateOutlined />,
        label: <Link to={ROUTES.admin.reviewQueue}>{t("nav.reviewQueue")}</Link>,
      },
      {
        key: ROUTES.admin.rejectedQueue,
        icon: <CloseCircleOutlined />,
        label: <Link to={ROUTES.admin.rejectedQueue}>{t("nav.rejectedQueue")}</Link>,
      },
      {
        key: ROUTES.admin.reports,
        icon: <FlagOutlined />,
        label: <Link to={ROUTES.admin.reports}>{t("nav.reports")}</Link>,
      },
      {
        key: ROUTES.admin.comments,
        icon: <CommentOutlined />,
        label: <Link to={ROUTES.admin.comments}>{t("nav.comments")}</Link>,
      },
      {
        key: ROUTES.admin.stories,
        icon: <BookOutlined />,
        label: <Link to={ROUTES.admin.stories}>{t("nav.stories")}</Link>,
      },
      {
        key: ROUTES.admin.genres,
        icon: <AppstoreOutlined />,
        label: <Link to={ROUTES.admin.genres}>{t("nav.genres")}</Link>,
      },
      {
        key: ROUTES.admin.authors,
        icon: <TeamOutlined />,
        label: <Link to={ROUTES.admin.authors}>{t("nav.authors")}</Link>,
      },
      {
        key: ROUTES.admin.searchSync,
        icon: <SyncOutlined />,
        label: <Link to={ROUTES.admin.searchSync}>{t("nav.searchSync")}</Link>,
      },
      {
        key: SETTINGS_MENU_KEY,
        icon: <SettingOutlined />,
        label: t("nav.settings"),
        children: [
          {
            key: ROUTES.admin.settingsAppearance,
            icon: <BgColorsOutlined />,
            label: <Link to={ROUTES.admin.settingsAppearance}>{t("nav.settingsAppearance")}</Link>,
          },
          {
            key: ROUTES.admin.settingsLanguage,
            icon: <GlobalOutlined />,
            label: <Link to={ROUTES.admin.settingsLanguage}>{t("nav.settingsLanguage")}</Link>,
          },
        ],
      },
    ],
    [t],
  );

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
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 20px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
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
                  label: t("layout.logout"),
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.displayName || t("layout.defaultUserName")}</span>
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

export function AdminLayout() {
  return (
    <AdminLocaleProvider>
      <AdminThemeProvider>
        <AdminShell />
      </AdminThemeProvider>
    </AdminLocaleProvider>
  );
}
