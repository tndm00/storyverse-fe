import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { ConfirmActionModal } from "@/admin/components/ConfirmActionModal";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as commentService from "@/services/commentModerationService";
import type { AdminComment } from "@/services/commentModerationService";
import { DEFAULT_PAGE_SIZE, LABELS } from "@/utils/constants";
import { formatDate, fromNow, truncate } from "@/utils/format";

const { Text, Paragraph } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// NOTE: the Community service has no platform-wide comment feed — comments are
// listed one chapter at a time (paste / link a chapter id). TODO: switch to a
// global admin feed if the backend adds one.
export function CommentsPage() {
  const [params, setParams] = useSearchParams();
  const chapterId = params.get("chapter-id") ?? "";
  const [draftId, setDraftId] = useState(chapterId);
  const [page, setPage] = useState(1);
  const { busy, run } = useAsyncRunner();
  const [target, setTarget] = useState<{ comment: AdminComment; hide: boolean } | null>(null);

  const { data, loading, error, refetch } = useAsyncQuery(
    () =>
      chapterId
        ? commentService.listChapterComments(chapterId, { pageNumber: page, pageSize: PAGE_SIZE })
        : Promise.resolve(null),
    [chapterId, page],
  );

  const applyChapterId = () => {
    setPage(1);
    setParams(draftId.trim() ? { "chapter-id": draftId.trim() } : {});
  };

  const columns: ColumnsType<AdminComment> = [
    {
      title: "Nội dung",
      dataIndex: "content",
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text delete={row.status === "Deleted"}>{truncate(v, 160)}</Text>
          {row.parentCommentId ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ↳ trả lời
            </Text>
          ) : null}
        </Space>
      ),
    },
    { title: "Tác giả", dataIndex: "authorLabel", width: 160 },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 170,
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <span>{formatDate(v)}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fromNow(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110,
      render: (v: AdminComment["status"]) => (
        <Tag color={v === "Visible" ? "green" : v === "Hidden" ? "orange" : "default"}>{v}</Tag>
      ),
    },
    {
      title: "",
      width: 110,
      render: (_: unknown, row) =>
        row.status === "Deleted" ? null : (
          <Button
            size="small"
            danger={!row.hidden}
            onClick={() => setTarget({ comment: row, hide: !row.hidden })}
          >
            {row.hidden ? "Hiện" : "Ẩn"}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.comments}
        subtitle="Ẩn / hiện bình luận vi phạm theo từng chương"
      />

      <Card
        title={
          <Space wrap>
            <Input
              placeholder="Chapter ID (GUID)"
              style={{ width: 320 }}
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              onPressEnter={applyChapterId}
            />
            <Button type="primary" onClick={applyChapterId}>
              Tải bình luận
            </Button>
          </Space>
        }
      >
        {!chapterId ? (
          <Alert
            type="info"
            showIcon
            message="Nhập ID chương để xem bình luận"
            description="Community service chưa có API liệt kê toàn bộ bình luận cho quản trị — hiện lọc theo từng chương."
          />
        ) : error ? (
          <Alert type="error" showIcon message="Không tải được bình luận" description={error.message} />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={data?.items ?? []}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: data?.totalCount ?? 0,
              onChange: setPage,
              showTotal: (t) => `${t} bình luận`,
            }}
          />
        )}
      </Card>

      <ConfirmActionModal
        open={Boolean(target)}
        title={target?.hide ? "Ẩn bình luận" : "Hiện lại bình luận"}
        okText={target?.hide ? "Ẩn" : "Hiện"}
        okType={target?.hide ? "danger" : "primary"}
        reasonLabel="Lý do (lưu vào nhật ký kiểm duyệt)"
        confirmLoading={busy}
        description={
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {truncate(target?.comment.content ?? "", 200)}
          </Paragraph>
        }
        onCancel={() => setTarget(null)}
        onOk={(reason) => {
          if (!target) return;
          run(
            () => commentService.setVisibility(target.comment.id, target.hide, reason),
            target.hide ? "Đã ẩn bình luận" : "Đã hiện lại bình luận",
            () => {
              setTarget(null);
              refetch();
            },
          );
        }}
      />
    </div>
  );
}
