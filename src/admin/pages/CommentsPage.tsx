import { useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { ConfirmActionModal } from "@/admin/components/ConfirmActionModal";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as commentService from "@/services/commentModerationService";
import type { AdminComment, AdminCommentStatusFilter } from "@/services/commentModerationService";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { formatDate, truncate } from "@/utils/format";

const { Text, Paragraph } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function CommentsPage() {
  const { t, tEnum, fromNow } = useAdminLocale();
  const [status, setStatus] = useState<AdminCommentStatusFilter>("all");
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [draftChapterId, setDraftChapterId] = useState("");
  const [page, setPage] = useState(1);
  const { busy, run } = useAsyncRunner();
  const [target, setTarget] = useState<{ comment: AdminComment; hide: boolean } | null>(null);

  const statusOptions: { value: AdminCommentStatusFilter; label: string }[] = [
    { value: "all", label: t("common.allStatuses") },
    { value: "Visible", label: tEnum("commentStatus", "Visible") },
    { value: "Hidden", label: tEnum("commentStatus", "Hidden") },
    { value: "Deleted", label: tEnum("commentStatus", "Deleted") },
  ];

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
      title: t("comments.colContent"),
      dataIndex: "content",
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text delete={row.status === "Deleted"}>{truncate(v, 160)}</Text>
          {row.parentCommentId ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("comments.reply")}
            </Text>
          ) : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("comments.chapter", { id: row.chapterId })}
          </Text>
        </Space>
      ),
    },
    { title: t("common.colAuthor"), dataIndex: "authorLabel", width: 160 },
    {
      title: t("comments.colTime"),
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
      title: t("common.colStatus"),
      dataIndex: "status",
      width: 110,
      render: (v: AdminComment["status"]) => (
        <Tag color={v === "Visible" ? "green" : v === "Hidden" ? "orange" : "default"}>
          {tEnum("commentStatus", v)}
        </Tag>
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
            {row.hidden ? t("common.show") : t("common.hide")}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <AppPageHeader title={t("nav.comments")} subtitle={t("comments.subtitle")} />

      <Card
        title={
          <Space wrap>
            <Input
              placeholder={t("comments.searchText")}
              style={{ width: 240 }}
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Input
              placeholder={t("comments.filterChapter")}
              style={{ width: 260 }}
              value={draftChapterId}
              onChange={(e) => setDraftChapterId(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Select
              style={{ width: 170 }}
              value={status}
              options={statusOptions}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
            <Button type="primary" onClick={applyFilters}>
              {t("comments.search")}
            </Button>
          </Space>
        }
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            message={t("comments.loadFailed")}
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
              showTotal: (total) => t("comments.total", { count: total }),
            }}
          />
        )}
      </Card>

      <ConfirmActionModal
        open={Boolean(target)}
        title={target?.hide ? t("comments.hideTitle") : t("comments.showTitle")}
        okText={target?.hide ? t("common.hide") : t("common.show")}
        okType={target?.hide ? "danger" : "primary"}
        reasonLabel={t("comments.reasonLabel")}
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
            target.hide ? t("comments.hidden") : t("comments.shown"),
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
