import { Link } from "react-router-dom";
import { Card, Col, List, Row, Statistic, Table, Typography, theme } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { ViewStatsCards } from "@/admin/components/ViewStatsCards";
import { StatusTag } from "@/components/StatusTag";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAuth } from "@/hooks/useAuth";
import { isPlatformAdmin } from "@/services/authService";
import * as reviewService from "@/services/reviewService";
import * as reportService from "@/services/reportService";
import * as storyService from "@/services/storyService";
import { ROUTES } from "@/utils/constants";

const { Text } = Typography;

export function DashboardPage() {
  const { token } = theme.useToken();
  const { t, tEnum, fromNow } = useAdminLocale();
  const { user } = useAuth();
  const reviewCounts = useAsyncQuery(() => reviewService.counts(), []);
  const reportCounts = useAsyncQuery(() => reportService.counts(), []);
  const storyCounts = useAsyncQuery(() => storyService.counts(), []);
  const recentReview = useAsyncQuery(
    () => reviewService.listQueue({ status: "all", pageSize: 5 }),
    [],
  );
  const recentReports = useAsyncQuery(
    () => reportService.listReports({ status: "all", pageSize: 5 }),
    [],
  );

  const stats = [
    {
      title: t("dashboard.pendingReview"),
      value: reviewCounts.data?.Pending,
      icon: <ClockCircleOutlined />,
      color: "#d48806",
      to: ROUTES.admin.reviewQueue,
    },
    {
      title: t("dashboard.inReview"),
      value: reviewCounts.data?.Reviewing,
      icon: <CheckCircleOutlined />,
      color: "#1677ff",
      to: ROUTES.admin.reviewQueue,
    },
    {
      title: t("dashboard.reportsPending"),
      value: reportCounts.data?.Pending,
      icon: <FlagOutlined />,
      color: "#cf1322",
      to: ROUTES.admin.reports,
    },
    {
      title: t("dashboard.totalStories"),
      value: storyCounts.data?.total,
      icon: <BookOutlined />,
      color: token.colorPrimary,
      to: ROUTES.admin.stories,
    },
  ];

  return (
    <div>
      <AppPageHeader title={t("nav.dashboard")} subtitle={t("dashboard.subtitle")} />

      {isPlatformAdmin(user?.roles) ? <ViewStatsCards /> : null}

      <Row gutter={[16, 16]}>
        {stats.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.to + s.title}>
            <Link to={s.to}>
              <Card
                hoverable
                loading={reviewCounts.loading || reportCounts.loading || storyCounts.loading}
              >
                <Statistic
                  title={s.title}
                  value={s.value ?? 0}
                  prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                  valueStyle={{ color: s.color }}
                />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={t("dashboard.recentSubmissions")}
            extra={<Link to={ROUTES.admin.reviewQueue}>{t("common.viewAll")}</Link>}
          >
            <Table
              size="small"
              rowKey="id"
              loading={recentReview.loading}
              pagination={false}
              dataSource={recentReview.data?.items || []}
              columns={[
                {
                  title: t("common.colTitle"),
                  dataIndex: "title",
                  render: (title, row) => <Link to={ROUTES.admin.reviewItem(row.id)}>{title}</Link>,
                },
                {
                  title: t("common.colType"),
                  dataIndex: "targetType",
                  width: 90,
                  render: (v: string) => tEnum("target", v),
                },
                {
                  title: t("common.colStatus"),
                  dataIndex: "reviewStatus",
                  width: 110,
                  render: (v) => <StatusTag value={v} />,
                },
                {
                  title: t("common.colSubmitted"),
                  dataIndex: "submittedAt",
                  width: 130,
                  render: (v) => <Text type="secondary">{fromNow(v)}</Text>,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={t("dashboard.latestReports")}
            extra={<Link to={ROUTES.admin.reports}>{t("common.viewAll")}</Link>}
          >
            <List
              size="small"
              loading={recentReports.loading}
              dataSource={recentReports.data?.items || []}
              renderItem={(r) => (
                <List.Item actions={[<StatusTag key="s" value={r.status} />]}>
                  <List.Item.Meta
                    title={<Link to={ROUTES.admin.report(r.id)}>{r.targetRef.title}</Link>}
                    description={
                      <Text type="secondary">
                        <StatusTag value={r.reason} kind="reason" /> · {fromNow(r.createdAt)}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
