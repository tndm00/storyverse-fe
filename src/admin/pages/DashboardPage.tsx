import { Link } from "react-router-dom";
import { Card, Col, List, Row, Statistic, Table, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useMockQuery } from "@/hooks/useMockQuery";
import * as reviewService from "@/services/reviewService";
import * as reportService from "@/services/reportService";
import * as storyService from "@/services/storyService";
import { fromNow } from "@/utils/format";
import { LABELS, ROUTES } from "@/utils/constants";

const { Text } = Typography;

export function DashboardPage() {
  const reviewCounts = useMockQuery(() => reviewService.counts(), []);
  const reportCounts = useMockQuery(() => reportService.counts(), []);
  const storyCounts = useMockQuery(() => storyService.counts(), []);
  const recentReview = useMockQuery(
    () => reviewService.listQueue({ status: "all", pageSize: 5 }),
    [],
  );
  const recentReports = useMockQuery(
    () => reportService.listReports({ status: "all", pageSize: 5 }),
    [],
  );

  const stats = [
    {
      title: "Pending review",
      value: reviewCounts.data?.Pending,
      icon: <ClockCircleOutlined />,
      color: "#d48806",
      to: ROUTES.admin.reviewQueue,
    },
    {
      title: "In review",
      value: reviewCounts.data?.Reviewing,
      icon: <CheckCircleOutlined />,
      color: "#1677ff",
      to: ROUTES.admin.reviewQueue,
    },
    {
      title: "Reports pending",
      value: reportCounts.data?.Pending,
      icon: <FlagOutlined />,
      color: "#cf1322",
      to: ROUTES.admin.reports,
    },
    {
      title: "Total stories",
      value: storyCounts.data?.total,
      icon: <BookOutlined />,
      color: "#5b21b6",
      to: ROUTES.admin.stories,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.dashboard}
        subtitle="Overview of the review and moderation workload"
      />

      <Row gutter={[16, 16]}>
        {stats.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
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
            title="Recent submissions"
            extra={<Link to={ROUTES.admin.reviewQueue}>View all</Link>}
          >
            <Table
              size="small"
              rowKey="id"
              loading={recentReview.loading}
              pagination={false}
              dataSource={recentReview.data?.items || []}
              columns={[
                {
                  title: "Title",
                  dataIndex: "title",
                  render: (title, row) => <Link to={ROUTES.admin.reviewItem(row.id)}>{title}</Link>,
                },
                { title: "Type", dataIndex: "targetType", width: 90 },
                {
                  title: "Status",
                  dataIndex: "reviewStatus",
                  width: 110,
                  render: (v) => <StatusTag value={v} />,
                },
                {
                  title: "Submitted",
                  dataIndex: "submittedAt",
                  width: 130,
                  render: (v) => <Text type="secondary">{fromNow(v)}</Text>,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Latest reports" extra={<Link to={ROUTES.admin.reports}>View all</Link>}>
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
