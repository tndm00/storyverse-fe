import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as reviewService from "@/services/reviewService";
import { formatDate } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, REVIEW_STATUS, ROUTES } from "@/utils/constants";
import type { ReviewStatus } from "@/utils/constants";
import type { ReviewItem } from "@/types/domain";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// The queue only ever holds items still awaiting a decision (Pending or
// Reviewing) — a decided chapter leaves it. So there's nothing to filter by
// status here; "all" fetches every open item.
type StatusFilter = ReviewStatus | "all";
type TypeFilter = "Story" | "Chapter" | "all";

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const { t, tEnum, fromNow } = useAdminLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);

  const { data, loading } = useAsyncQuery(
    () => reviewService.listQueue({ pageNumber: page, pageSize: PAGE_SIZE, status, q, type }),
    [page, q, status, type],
  );

  const onSearch = (value: string) => {
    setPage(1);
    setQ(value);
  };
  const onStatus = (value: StatusFilter) => {
    setPage(1);
    setStatus(value);
  };
  const onType = (value: TypeFilter) => {
    setPage(1);
    setType(value);
  };

  const columns: ColumnsType<ReviewItem> = [
    {
      title: t("common.colTitle"),
      dataIndex: "title",
      render: (title: string, row) => <Link to={ROUTES.admin.reviewItem(row.id)}>{title}</Link>,
    },
    {
      title: t("common.colType"),
      dataIndex: "targetType",
      width: 100,
      render: (v: string) => tEnum("target", v),
    },
    {
      title: t("common.colAuthor"),
      dataIndex: "authorName",
      width: 200,
      render: (v: string | undefined) => v || "—",
    },
    {
      title: t("common.colSubmitted"),
      dataIndex: "submittedAt",
      width: 190,
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
      dataIndex: "reviewStatus",
      width: 120,
      render: (v: ReviewStatus) => <StatusTag value={v} />,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={t("nav.reviewQueue")}
        subtitle={t("reviewQueue.subtitle")}
        extra={
          <Button onClick={() => navigate(ROUTES.admin.rejectedQueue)}>
            {t("nav.rejectedQueue")}
          </Button>
        }
      />

      <Card
        styles={{ body: { paddingTop: 16 } }}
        title={
          <Space wrap>
            <Select
              value={status}
              onChange={onStatus}
              style={{ width: 150 }}
              options={[
                { label: t("common.allStatuses"), value: "all" },
                ...REVIEW_STATUS.map((s) => ({ label: tEnum("status", s), value: s })),
              ]}
            />
            <Select
              value={type}
              onChange={onType}
              style={{ width: 130 }}
              options={[
                { label: t("common.allTypes"), value: "all" },
                { label: tEnum("target", "Chapter"), value: "Chapter" },
                { label: tEnum("target", "Story"), value: "Story" },
              ]}
            />
          </Space>
        }
        extra={
          <Input.Search
            allowClear
            placeholder={t("common.searchTitleOrAuthor")}
            style={{ width: 260 }}
            onSearch={onSearch}
          />
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data?.items ?? []}
          onRow={(row) => ({
            onClick: () => navigate(ROUTES.admin.reviewItem(row.id)),
            style: { cursor: "pointer" },
            "data-testid": `review-row-${row.id}`,
          })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.totalCount ?? 0,
            onChange: setPage,
            showTotal: (total) => t("common.itemsTotal", { count: total }),
          }}
        />
      </Card>
    </div>
  );
}
