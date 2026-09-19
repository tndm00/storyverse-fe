import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { HistoryTimelineCard } from "@/components/HistoryTimelineCard";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as reportService from "@/services/reportService";
import { MODERATION_ACTION, ROUTES } from "@/utils/constants";
import type { ModerationAction } from "@/utils/constants";
import { formatDate } from "@/utils/format";

const { Paragraph, Text } = Typography;

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t, tEnum } = useAdminLocale();
  const { busy, run } = useAsyncRunner();

  const { data: report, loading, error, refetch } = useAsyncQuery(() => reportService.get(id), [id]);
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [note, setNote] = useState("");

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (error || !report) {
    return (
      <Result
        status="404"
        title={t("reportDetail.notFound")}
        extra={
          <Button type="primary" onClick={() => navigate(ROUTES.admin.reports)}>
            {t("reportDetail.backToReports")}
          </Button>
        }
      />
    );
  }

  const closed = report.status === "Resolved" || report.status === "Dismissed";

  return (
    <div>
      <AppPageHeader
        title={t("reportDetail.title", { id: report.id })}
        breadcrumb={[{ title: t("nav.reports"), to: ROUTES.admin.reports }, { title: report.id }]}
        subtitle={t("reportDetail.subtitle", {
          type: tEnum("target", report.targetType),
          reporter: report.reporterName,
        })}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.admin.reports)}>
            {t("common.back")}
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title={t("reportDetail.cardReport")}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t("reports.colTarget")}>
                {report.targetRef.title}{" "}
                <Text type="secondary">({tEnum("target", report.targetType)})</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t("reports.colReason")}>
                <StatusTag value={report.reason} kind="reason" />
              </Descriptions.Item>
              <Descriptions.Item label={t("reports.colReporter")}>
                {report.reporterName}
              </Descriptions.Item>
              <Descriptions.Item label={t("reportDetail.reportedAt")}>
                {formatDate(report.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label={t("common.colStatus")}>
                <StatusTag value={report.status} />
              </Descriptions.Item>
              <Descriptions.Item label={t("reportDetail.reporterNote")}>
                <Paragraph style={{ marginBottom: 0 }}>{report.note}</Paragraph>
              </Descriptions.Item>
              {report.action ? (
                <Descriptions.Item label={t("reportDetail.actionTaken")}>
                  <StatusTag value={report.action} kind="action" /> — {report.resolutionNote}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          {report.story ? (
            <Card title={t("reportDetail.cardStory")} style={{ marginTop: 16 }}>
              <StoryDetailContent story={report.story} />
            </Card>
          ) : null}
        </Col>

        <Col xs={24} lg={9}>
          <Card title={t("reportDetail.cardResolve")}>
            {closed ? (
              <Result
                status="success"
                subTitle={t("reportDetail.closed", {
                  status: tEnum("status", report.status).toLowerCase(),
                })}
                style={{ padding: "12px 0" }}
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {report.status === "Pending" ? (
                  <Button
                    block
                    loading={busy}
                    onClick={() =>
                      run(() => reportService.pickUp(id), t("reportDetail.pickedUp"), refetch)
                    }
                  >
                    {t("reportDetail.pickUp")}
                  </Button>
                ) : null}

                <div>
                  <Text type="secondary">{t("reportDetail.moderationAction")}</Text>
                  <Select<ModerationAction>
                    style={{ width: "100%", marginTop: 4 }}
                    placeholder={t("reportDetail.chooseAction")}
                    value={action ?? undefined}
                    onChange={setAction}
                    options={MODERATION_ACTION.map((a) => ({ label: tEnum("action", a), value: a }))}
                  />
                </div>

                <div>
                  <Text type="secondary">
                    {t("reportDetail.resolutionNote")}{" "}
                    {action && action !== "Dismiss" ? (
                      <span style={{ color: "#cf1322" }}>*</span>
                    ) : null}
                  </Text>
                  <Input.TextArea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("reportDetail.notePlaceholder")}
                    style={{ marginTop: 4 }}
                  />
                </div>

                <Button
                  block
                  type="primary"
                  danger={action === "Remove" || action === "Hide"}
                  loading={busy}
                  disabled={!action}
                  onClick={() =>
                    run(
                      () => reportService.act(id, { action, note }),
                      action === "Dismiss" ? t("reportDetail.dismissed") : t("reportDetail.resolved"),
                      refetch,
                    )
                  }
                >
                  {action === "Dismiss" ? t("reportDetail.dismiss") : t("reportDetail.apply")}
                </Button>
              </Space>
            )}
          </Card>

          <HistoryTimelineCard history={report.history} />
        </Col>
      </Row>
    </div>
  );
}
