import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Result,
  Row,
  Skeleton,
  Space,
  Timeline,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { ConfirmActionModal } from "@/admin/components/ConfirmActionModal";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as reviewService from "@/services/reviewService";
import { compactNumber, formatDate } from "@/utils/format";
import { LABELS, MESSAGES, ROUTES } from "@/utils/constants";
import type { Chapter, Story } from "@/types/domain";

const { Paragraph, Title, Text } = Typography;

function ChapterContent({ chapter }: { chapter: Chapter | null }) {
  if (!chapter) return <Empty description="Chapter content unavailable" />;
  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        {chapter.title}
      </Title>
      <Text type="secondary">
        Order {String(chapter.orderIndex)} · {compactNumber(chapter.wordCount)} words ·{" "}
        <StatusTag value={chapter.status} />
      </Text>
      <div
        style={{
          marginTop: 16,
          maxHeight: 460,
          overflow: "auto",
          padding: 16,
          background: "#fafafa",
          borderRadius: 8,
          border: "1px solid #f0f0f0",
        }}
      >
        <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{chapter.content}</Paragraph>
      </div>
    </div>
  );
}

export function ReviewDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const { busy, run } = useAsyncRunner();

  const { data: item, loading, error, refetch } = useAsyncQuery(() => reviewService.get(id), [id]);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (error || !item) {
    return (
      <Result
        status="404"
        title={MESSAGES.review.notFound}
        extra={
          <Button type="primary" onClick={() => navigate(ROUTES.admin.reviewQueue)}>
            Back to queue
          </Button>
        }
      />
    );
  }

  const canStart = item.reviewStatus === "Pending";
  const canDecide = item.reviewStatus === "Reviewing";
  const canReapprove = item.reviewStatus === "Rejected";

  const reapprove = () => {
    modal.confirm({
      title: MESSAGES.review.reapproveConfirmTitle,
      content: MESSAGES.review.reapproveConfirmContent,
      okText: "Duyệt lại",
      onOk: () => run(() => reviewService.approve(id), MESSAGES.review.reapproved, refetch),
    });
  };

  return (
    <div>
      <AppPageHeader
        title={item.title}
        breadcrumb={[
          { title: LABELS.reviewQueue, to: ROUTES.admin.reviewQueue },
          { title: item.id },
        ]}
        subtitle={`${item.targetType} · submitted by ${item.authorName || "—"}`}
        extra={
          <Space>
            {canReapprove ? (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                data-testid="reapprove"
                onClick={reapprove}
              >
                Duyệt lại
              </Button>
            ) : null}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.admin.reviewQueue)}>
              Back
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title={item.targetType === "Story" ? "Story" : "Chapter"}>
            {item.targetType === "Story" ? (
              <StoryDetailContent story={item.target as Story | null} />
            ) : (
              <ChapterContent chapter={item.target as Chapter | null} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Decision">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <StatusTag value={item.reviewStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Assigned to">{item.assignedTo || "—"}</Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {formatDate(item.submittedAt)}
              </Descriptions.Item>
            </Descriptions>

            {item.decisionReason ? (
              <Paragraph style={{ marginTop: 8 }}>
                <Text type="secondary">Last decision note:</Text>
                <br />
                {item.decisionReason}
              </Paragraph>
            ) : null}

            <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
              <Button
                block
                icon={<PlayCircleOutlined />}
                disabled={!canStart}
                loading={busy}
                data-testid="start-review"
                onClick={() =>
                  run(() => reviewService.startReview(id), MESSAGES.review.started, refetch)
                }
              >
                Start review
              </Button>
              <Button
                block
                type="primary"
                icon={<CheckOutlined />}
                disabled={!canDecide}
                loading={busy}
                data-testid="approve-publish"
                onClick={() =>
                  run(() => reviewService.approve(id), MESSAGES.review.approved, () =>
                    navigate(ROUTES.admin.stories),
                  )
                }
              >
                Approve &amp; publish
              </Button>
              <Button
                block
                danger
                icon={<CloseOutlined />}
                disabled={!canDecide}
                data-testid="reject"
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </Space>
            {!canStart && !canDecide ? (
              <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                This item is already {item.reviewStatus.toLowerCase()}.
              </Text>
            ) : null}
          </Card>

          <Card title="History" style={{ marginTop: 16 }}>
            <Timeline
              items={item.history.map((h) => ({
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

      <ConfirmActionModal
        open={rejectOpen}
        title="Reject submission"
        okText="Reject"
        okType="danger"
        reasonLabel="Rejection reason"
        confirmLoading={busy}
        description={
          <Text type="secondary">
            The author sees this note and can revise and resubmit. It is kept in the review history.
          </Text>
        }
        onCancel={() => setRejectOpen(false)}
        onOk={(reason) => {
          void run(
            () => reviewService.reject(id, reason),
            MESSAGES.review.rejected,
            () => {
              refetch();
              setRejectOpen(false);
            },
          );
        }}
      />
    </div>
  );
}
