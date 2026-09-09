import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Card, Input, Segmented, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useMockQuery } from "@/hooks/useMockQuery";
import * as reviewService from "@/services/reviewService";
import { formatDate, fromNow } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, LABELS, ROUTES } from "@/utils/constants";
import type { ReviewStatus } from "@/utils/constants";
import type { ReviewItem } from "@/types/domain";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StatusFilter = ReviewStatus | "all";
type TypeFilter = "Story" | "Chapter" | "all";

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("Pending");
  const [type, setType] = useState<TypeFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading } = useMockQuery(
    () => reviewService.listQueue({ pageNumber: page, pageSize: PAGE_SIZE, status, type, q }),
    [page, status, type, q],
  );

  const onStatus = (value: string | number) => {
    setPage(1);
    setStatus(value as StatusFilter);
  };
  const onType = (value: string) => {
    setPage(1);
    setType(value as TypeFilter);
  };
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
        subtitle="Stories and chapters submitted by authors, awaiting a publish decision"
      />

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Dữ liệu giả"
        description="Chưa có backend cho hàng đợi duyệt bài (pre-publication review). Trang này chạy trên mock và mọi thao tác chỉ nằm trong bộ nhớ."
      />

      <Card
        styles={{ body: { paddingTop: 16 } }}
        title={
          <Space wrap>
            <Segmented
              value={status}
              onChange={onStatus}
              options={[
                { label: "Pending", value: "Pending" },
                { label: "Reviewing", value: "Reviewing" },
                { label: "Approved", value: "Approved" },
                { label: "Rejected", value: "Rejected" },
                { label: "All", value: "all" },
              ]}
            />
            <Select
              value={type}
              onChange={onType}
              style={{ width: 140 }}
              options={[
                { label: "All types", value: "all" },
                { label: "Story", value: "Story" },
                { label: "Chapter", value: "Chapter" },
              ]}
            />
          </Space>
        }
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
