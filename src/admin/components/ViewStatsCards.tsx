import { Link } from "react-router-dom";
import { Alert, Card, Col, List, Row, Statistic, Typography, theme } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as storyService from "@/services/storyService";
import { ROUTES } from "@/utils/constants";

const { Text } = Typography;

// Total / yesterday / today views + today's top stories. Rendered ONLY for a
// PlatformAdmin (see DashboardPage): useAsyncQuery always fetches on mount, and the
// endpoint answers 403 to anyone else, so the gate lives around this component.
export function ViewStatsCards() {
  const { token } = theme.useToken();
  const { t, formatNumber, formatIsoDate } = useAdminLocale();
  const { data, loading, error } = useAsyncQuery(() => storyService.getViewStats(), []);

  const cards = [
    { title: t("viewStats.total"), value: data?.totalViews, color: token.colorPrimary },
    { title: t("viewStats.yesterday"), value: data?.yesterdayViews, color: "#1677ff" },
    { title: t("viewStats.today"), value: data?.todayViews, color: "#389e0d" },
  ];

  if (error) {
    return <Alert type="error" showIcon message={t("viewStats.loadFailed")} style={{ marginBottom: 16 }} />;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col xs={24} sm={8} key={c.title}>
            <Card loading={loading}>
              <Statistic
                title={c.title}
                // null = daily figure unavailable (Redis down): show "—", never a fake 0.
                value={c.value == null ? "—" : formatNumber(c.value)}
                prefix={<EyeOutlined style={{ color: c.color }} />}
                valueStyle={{ color: c.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {data?.trackingSince ? (
        <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
          {t("viewStats.trackingSince", { date: formatIsoDate(data.trackingSince) })}
        </Text>
      ) : null}

      <Card title={t("viewStats.topToday")} loading={loading} style={{ marginTop: 16 }} size="small">
        <List
          size="small"
          dataSource={data?.topStoriesToday ?? []}
          locale={{ emptyText: t("viewStats.noTopToday") }}
          renderItem={(s, i) => (
            <List.Item extra={<Text strong>{formatNumber(s.views)}</Text>}>
              <Text type="secondary" style={{ marginRight: 12 }}>{i + 1}</Text>
              <Link to={ROUTES.story(s.slug)}>{s.title}</Link>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
