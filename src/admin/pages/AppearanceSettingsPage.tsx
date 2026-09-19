import { Card, Segmented, Typography } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminThemeMode } from "@/context/AdminThemeContext";

const { Paragraph } = Typography;

export function AppearanceSettingsPage() {
  const { t } = useAdminLocale();
  const { mode, setMode } = useAdminTheme();

  return (
    <>
      <AppPageHeader title={t("nav.settings")} />
      <Card title={t("settings.appearanceTitle")}>
        <Paragraph type="secondary">{t("settings.appearanceHint")}</Paragraph>
        <Segmented<AdminThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: t("settings.light"), icon: <SunOutlined /> },
            { value: "dark", label: t("settings.dark"), icon: <MoonOutlined /> },
          ]}
        />
      </Card>
    </>
  );
}
