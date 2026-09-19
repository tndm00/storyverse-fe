import { Card, Segmented, Typography } from "antd";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import type { AdminLocale } from "@/i18n/types";

const { Paragraph } = Typography;

// Each language is shown in its OWN language and never translated, so someone who ended up in a
// language they cannot read can still find and pick the one they want.
const LANGUAGE_OPTIONS: { value: AdminLocale; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

export function LanguageSettingsPage() {
  const { t, locale, setLocale } = useAdminLocale();

  return (
    <>
      <AppPageHeader title={t("nav.settings")} />
      <Card title={t("settings.languageTitle")}>
        <Paragraph type="secondary">{t("settings.languageHint")}</Paragraph>
        <Segmented<AdminLocale> value={locale} onChange={setLocale} options={LANGUAGE_OPTIONS} />
      </Card>
    </>
  );
}
