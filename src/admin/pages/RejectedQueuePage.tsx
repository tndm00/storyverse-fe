import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { App, Button, Card, Input, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as reviewService from "@/services/reviewService";
import type { RejectedItem } from "@/services/reviewService";
import { formatDate, fromNow } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, LABELS, MESSAGES, ROUTES } from "@/utils/constants";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// Dedicated admin page for chapters a moderator rejected — separate from the
// open queue (ReviewQueuePage) since a rejected chapter has already left the
// review workflow. Lets a moderator re-approve straight from the list
// (backend approve now accepts Rejected -> Published) instead of hunting the
// item down in the mixed queue's status dropdown.
export function RejectedQueuePage() {
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const { busy, run } = useAsyncRunner();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [reapprovingId, setReapprovingId] = useState<string | null>(null);

  const { data, loading, refetch } = useAsyncQuery(
    () => reviewService.listRejected({ pageNumber: page, pageSize: PAGE_SIZE, q }),
    [page, q],
  );

  const onSearch = (value: string) => {
    setPage(1);
    setQ(value);
  };

  const reapprove = (row: RejectedItem) => {
    modal.confirm({
      title: MESSAGES.review.reapproveConfirmTitle,
      content: (
        <>
          <Text strong>{row.title}</Text>
          <br />
          <Text type="secondary">{MESSAGES.review.reapproveConfirmContent}</Text>
        </>
      ),
      okText: "Duyệt lại",
      onOk: () => {
        setReapprovingId(row.id);
        return run(
          () => reviewService.approve(row.id),
          MESSAGES.review.reapproved,
          refetch,
        ).finally(() => setReapprovingId(null));
      },
    });
  };

  const columns: ColumnsType<RejectedItem> = [
    {
      title: "Tên chương",
      dataIndex: "title",
      render: (title: string, row) => <Link to={ROUTES.admin.reviewItem(row.id)}>{title}</Link>,
    },
    {
      title: "Tác giả",
      dataIndex: "authorName",
      width: 180,
      render: (v: string | undefined) => v || "—",
    },
    {
      title: "Lý do từ chối",
      dataIndex: "decisionReason",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Thời gian bị từ chối",
      dataIndex: "rejectedAt",
      width: 190,
      render: (v: string | null) =>
        v ? (
          <Space direction="vertical" size={0}>
            <span>{formatDate(v)}</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {fromNow(v)}
            </Text>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          loading={busy && reapprovingId === row.id}
          onClick={(e) => {
            e.stopPropagation();
            reapprove(row);
          }}
          data-testid={`reapprove-${row.id}`}
        >
          Duyệt lại
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.rejectedQueue}
        subtitle="Chương đã bị từ chối — duyệt lại để xuất bản ngay, bỏ qua bước gửi lại của tác giả"
        extra={
          <Button onClick={() => navigate(ROUTES.admin.reviewQueue)}>{LABELS.reviewQueue}</Button>
        }
      />

      <Card
        styles={{ body: { paddingTop: 16 } }}
        extra={
          <Input.Search
            allowClear
            placeholder="Tìm theo tên chương hoặc tác giả"
            style={{ width: 280 }}
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
            "data-testid": `rejected-row-${row.id}`,
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
