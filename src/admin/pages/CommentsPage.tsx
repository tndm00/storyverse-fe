import { useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { ConfirmActionModal } from "@/admin/components/ConfirmActionModal";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as commentService from "@/services/commentModerationService";
import type { AdminComment, AdminCommentStatusFilter } from "@/services/commentModerationService";
import { DEFAULT_PAGE_SIZE, LABELS } from "@/utils/constants";
import { formatDate, fromNow, truncate } from "@/utils/format";

const { Text, Paragraph } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const STATUS_OPTIONS: { value: AdminCommentStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "Visible", label: "Hiển thị" },
  { value: "Hidden", label: "Đã ẩn" },
  { value: "Deleted", label: "Đã xoá" },
];

export function CommentsPage() {
  const [status, setStatus] = useState<AdminCommentStatusFilter>("all");
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [draftChapterId, setDraftChapterId] = useState("");
  const [page, setPage] = useState(1);
  const { busy, run } = useAsyncRunner();
  const [target, setTarget] = useState<{ comment: AdminComment; hide: boolean } | null>(null);

  const { data, loading, error, refetch } = useAsyncQuery(
    () =>
      commentService.listAdmin({
        status,
        q: q || undefined,
        chapterId: chapterId || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }),
    [status, q, chapterId, page],
  );

  const applyFilters = () => {
    setPage(1);
    setQ(draftQ.trim());
    setChapterId(draftChapterId.trim());
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            Chương: {row.chapterId}
          </Text>
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
      <AppPageHeader title={LABELS.comments} subtitle="Ẩn / hiện bình luận vi phạm toàn nền tảng" />

      <Card
        title={
          <Space wrap>
            <Input
              placeholder="Tìm nội dung bình luận"
              style={{ width: 240 }}
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Input
              placeholder="Lọc theo Chapter ID (tuỳ chọn)"
              style={{ width: 260 }}
              value={draftChapterId}
              onChange={(e) => setDraftChapterId(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Select
              style={{ width: 170 }}
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
            <Button type="primary" onClick={applyFilters}>
              Tìm
            </Button>
          </Space>
        }
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Không tải được bình luận"
            description={error.message}
          />
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
