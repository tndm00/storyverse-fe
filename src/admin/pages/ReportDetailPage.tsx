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
  Timeline,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { useMockQuery } from "@/hooks/useMockQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as reportService from "@/services/reportService";
import { LABELS, MESSAGES, MODERATION_ACTION, ROUTES } from "@/utils/constants";
import type { ModerationAction } from "@/utils/constants";
import { formatDate } from "@/utils/format";

const { Paragraph, Text } = Typography;

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAsyncRunner();

  const { data: report, loading, error, refetch } = useMockQuery(() => reportService.get(id), [id]);
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [note, setNote] = useState("");

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (error || !report) {
    return (
      <Result
        status="404"
        title={MESSAGES.report.notFound}
        extra={
          <Button type="primary" onClick={() => navigate(ROUTES.admin.reports)}>
            Back to reports
          </Button>
        }
      />
    );
  }

  const closed = report.status === "Resolved" || report.status === "Dismissed";

  return (
    <div>
      <AppPageHeader
        title={`Report ${report.id}`}
        breadcrumb={[{ title: LABELS.reports, to: ROUTES.admin.reports }, { title: report.id }]}
        subtitle={`${report.targetType} · reported by ${report.reporterName}`}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.admin.reports)}>
            Back
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title="Report">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Target">
                {report.targetRef.title} <Text type="secondary">({report.targetType})</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                <StatusTag value={report.reason} kind="reason" />
              </Descriptions.Item>
              <Descriptions.Item label="Reporter">{report.reporterName}</Descriptions.Item>
              <Descriptions.Item label="Reported at">
                {formatDate(report.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag value={report.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Reporter note">
                <Paragraph style={{ marginBottom: 0 }}>{report.note}</Paragraph>
              </Descriptions.Item>
              {report.action ? (
                <Descriptions.Item label="Action taken">
                  <StatusTag value={report.action} kind="action" /> — {report.resolutionNote}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          {report.story ? (
            <Card title="Reported story" style={{ marginTop: 16 }}>
              <StoryDetailContent story={report.story} />
            </Card>
          ) : null}
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Resolve">
            {closed ? (
              <Result
                status="success"
                subTitle={`This report is ${report.status.toLowerCase()}.`}
                style={{ padding: "12px 0" }}
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {report.status === "Pending" ? (
                  <Button
                    block
                    loading={busy}
                    onClick={() =>
                      run(() => reportService.pickUp(id), MESSAGES.report.pickedUp, refetch)
                    }
                  >
                    Pick up (start reviewing)
                  </Button>
                ) : null}

                <div>
                  <Text type="secondary">Moderation action</Text>
                  <Select<ModerationAction>
                    style={{ width: "100%", marginTop: 4 }}
                    placeholder="Choose an action"
                    value={action ?? undefined}
                    onChange={setAction}
                    options={MODERATION_ACTION.map((a) => ({ label: a, value: a }))}
                  />
                </div>

                <div>
                  <Text type="secondary">
                    Resolution note{" "}
                    {action && action !== "Dismiss" ? (
                      <span style={{ color: "#cf1322" }}>*</span>
                    ) : null}
                  </Text>
                  <Input.TextArea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain the decision — kept in the audit history."
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
                      action === "Dismiss" ? MESSAGES.report.dismissed : MESSAGES.report.resolved,
                      refetch,
                    )
                  }
                >
                  {action === "Dismiss" ? "Dismiss report" : "Apply & resolve"}
                </Button>
              </Space>
            )}
          </Card>

          <Card title="History" style={{ marginTop: 16 }}>
            <Timeline
              items={report.history.map((h) => ({
                children: (
                  <Space direction="vertical" size={0}>
                    <Text strong>{h.action}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {h.actor} · {formatDate(h.at)}
                    </Text>
                    {h.note ? <Text>{h.note}</Text> : null}
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
