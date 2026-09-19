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
  Typography,
  theme,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { HistoryTimelineCard } from "@/components/HistoryTimelineCard";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { ConfirmActionModal } from "@/admin/components/ConfirmActionModal";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as reviewService from "@/services/reviewService";
import { formatDate } from "@/utils/format";
import { ROUTES } from "@/utils/constants";
import type { Chapter, Story } from "@/types/domain";

const { Paragraph, Title, Text } = Typography;

function ChapterContent({ chapter }: { chapter: Chapter | null }) {
  const { token } = theme.useToken();
  const { t, compactNumber } = useAdminLocale();
  if (!chapter) return <Empty description={t("reviewDetail.chapterUnavailable")} />;
  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        {chapter.title}
      </Title>
      <Text type="secondary">
        {t("reviewDetail.chapterMeta", {
          order: String(chapter.orderIndex),
          words: compactNumber(chapter.wordCount),
        })}{" "}
        · <StatusTag value={chapter.status} />
      </Text>
      <div
        style={{
          marginTop: 16,
          maxHeight: 460,
          overflow: "auto",
          padding: 16,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
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
  const { t, tEnum } = useAdminLocale();
  const { busy, run } = useAsyncRunner();

  const { data: item, loading, error, refetch } = useAsyncQuery(() => reviewService.get(id), [id]);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (error || !item) {
    return (
      <Result
        status="404"
        title={t("reviewDetail.notFound")}
        extra={
          <Button type="primary" onClick={() => navigate(ROUTES.admin.reviewQueue)}>
            {t("reviewDetail.backToQueue")}
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
      title: t("reapprove.confirmTitle"),
      content: t("reapprove.confirmContent"),
      okText: t("reapprove.ok"),
      onOk: () =>
        run(() => reviewService.startReview(id), t("reapprove.done"), () =>
          navigate(ROUTES.admin.reviewQueue),
        ),
    });
  };

  return (
    <div>
      <AppPageHeader
        title={item.title}
        breadcrumb={[
          { title: t("nav.reviewQueue"), to: ROUTES.admin.reviewQueue },
          { title: item.id },
        ]}
        subtitle={t("reviewDetail.subtitle", {
          type: tEnum("target", item.targetType),
          author: item.authorName || "—",
        })}
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
                {t("reapprove.button")}
              </Button>
            ) : null}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.admin.reviewQueue)}>
              {t("common.back")}
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title={item.targetType === "Story" ? t("reviewDetail.cardStory") : t("reviewDetail.cardChapter")}
          >
            {item.targetType === "Story" ? (
              <StoryDetailContent story={item.target as Story | null} />
            ) : (
              <ChapterContent chapter={item.target as Chapter | null} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title={t("reviewDetail.cardDecision")}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t("common.colStatus")}>
                <StatusTag value={item.reviewStatus} />
              </Descriptions.Item>
              <Descriptions.Item label={t("reviewDetail.assignedTo")}>
                {item.assignedTo || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("common.colSubmitted")}>
                {formatDate(item.submittedAt)}
              </Descriptions.Item>
            </Descriptions>

            {item.decisionReason ? (
              <Paragraph style={{ marginTop: 8 }}>
                <Text type="secondary">{t("reviewDetail.lastDecisionNote")}</Text>
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
                  run(() => reviewService.startReview(id), t("reviewDetail.started"), refetch)
                }
              >
                {t("reviewDetail.startReview")}
              </Button>
              <Button
                block
                type="primary"
                icon={<CheckOutlined />}
                disabled={!canDecide}
                loading={busy}
                data-testid="approve-publish"
                onClick={() => run(() => reviewService.approve(id), t("reviewDetail.approved"), refetch)}
              >
                {t("reviewDetail.approve")}
              </Button>
              <Button
                block
                danger
                icon={<CloseOutlined />}
                disabled={!canDecide}
                data-testid="reject"
                onClick={() => setRejectOpen(true)}
              >
                {t("reviewDetail.reject")}
              </Button>
            </Space>
            {!canStart && !canDecide ? (
              <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                {t("reviewDetail.alreadyDone", {
                  status: tEnum("status", item.reviewStatus).toLowerCase(),
                })}
              </Text>
            ) : null}
          </Card>

          <HistoryTimelineCard history={item.history} />
        </Col>
      </Row>

      <ConfirmActionModal
        open={rejectOpen}
        title={t("reviewDetail.rejectTitle")}
        okText={t("reviewDetail.reject")}
        okType="danger"
        reasonLabel={t("reviewDetail.rejectReasonLabel")}
        confirmLoading={busy}
        description={<Text type="secondary">{t("reviewDetail.rejectDescription")}</Text>}
        onCancel={() => setRejectOpen(false)}
        onOk={(reason) => {
          void run(
            () => reviewService.reject(id, reason),
            t("reviewDetail.rejected"),
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
