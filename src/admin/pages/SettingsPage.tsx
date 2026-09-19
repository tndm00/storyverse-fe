import { Card, Segmented, Typography } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import type { AdminThemeMode } from "@/context/AdminThemeContext";
import { SETTINGS_LABELS } from "@/utils/constants";

const { Paragraph } = Typography;

export function SettingsPage() {
  const { mode, setMode } = useAdminTheme();

  return (
    <>
      <AppPageHeader title={SETTINGS_LABELS.title} />
      <Card title={SETTINGS_LABELS.appearanceTitle}>
        <Paragraph type="secondary">{SETTINGS_LABELS.appearanceHint}</Paragraph>
        <Segmented<AdminThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: SETTINGS_LABELS.light, icon: <SunOutlined /> },
            { value: "dark", label: SETTINGS_LABELS.dark, icon: <MoonOutlined /> },
          ]}
        />
      </Card>
    </>
  );
}
