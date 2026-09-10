import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Input, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as reviewService from "@/services/reviewService";
import { formatDate, fromNow } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, LABELS, ROUTES } from "@/utils/constants";
import type { ReviewStatus } from "@/utils/constants";
import type { ReviewItem } from "@/types/domain";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// The queue only ever holds items still awaiting a decision (Pending or
// Reviewing) — a decided chapter leaves it. So there's nothing to filter by
// status here; "all" fetches every open item.
export function ReviewQueuePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading } = useAsyncQuery(
    () => reviewService.listQueue({ pageNumber: page, pageSize: PAGE_SIZE, status: "all", q }),
    [page, q],
  );

  const onSearch = (value: string) => {
    setPage(1);
    setQ(value);
  };

  const columns: ColumnsType<ReviewItem> = [
    {
      title: "Title",
      dataIndex: "title",
      render: (title: string, row) => <Link to={ROUTES.admin.reviewItem(row.id)}>{title}</Link>,
    },
    { title: "Type", dataIndex: "targetType", width: 100 },
    {
      title: "Author",
      dataIndex: "authorName",
      width: 200,
      render: (v: string | undefined) => v || "—",
    },
    {
      title: "Submitted",
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
      title: "Status",
      dataIndex: "reviewStatus",
      width: 120,
      render: (v: ReviewStatus) => <StatusTag value={v} />,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.reviewQueue}
        subtitle="Chapters submitted by authors, awaiting a publish decision"
      />

      <Card
        styles={{ body: { paddingTop: 16 } }}
        extra={
          <Input.Search
            allowClear
            placeholder="Search title or author"
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
            showTotal: (t) => `${t} items`,
          }}
        />
      </Card>
    </div>
  );
}
