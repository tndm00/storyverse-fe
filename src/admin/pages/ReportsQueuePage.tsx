import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as reportService from "@/services/reportService";
import { DEFAULT_PAGE_SIZE, LABELS, REPORT_REASON, REPORT_STATUS, ROUTES } from "@/utils/constants";
import type { ReportReason, ReportStatus } from "@/utils/constants";
import type { Report } from "@/types/domain";
import { formatDate, fromNow, truncate } from "@/utils/format";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StatusFilter = ReportStatus | "all";
type ReasonFilter = ReportReason | "all";

export function ReportsQueuePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("Pending");
  const [reason, setReason] = useState<ReasonFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading } = useAsyncQuery(
    () => reportService.listReports({ pageNumber: page, pageSize: PAGE_SIZE, status, reason, q }),
    [page, status, reason, q],
  );

  const onStatus = (value: string) => {
    setPage(1);
    setStatus(value as StatusFilter);
  };
  const onReason = (value: string) => {
    setPage(1);
    setReason(value as ReasonFilter);
  };
  const onSearch = (value: string) => {
    setPage(1);
    setQ(value);
  };

  const columns: ColumnsType<Report> = [
    { title: "ID", dataIndex: "id", width: 96 },
    {
      title: "Target",
      dataIndex: ["targetRef", "title"],
      render: (title: string, row) => (
        <Space direction="vertical" size={0}>
          <Link to={ROUTES.admin.report(row.id)}>{title}</Link>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.targetType}
          </Text>
        </Space>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      width: 130,
      render: (v: ReportReason) => <StatusTag value={v} kind="reason" />,
    },
    { title: "Reporter", dataIndex: "reporterName", width: 130 },
    {
      title: "Note",
      dataIndex: "note",
      render: (v: string) => <Text type="secondary">{truncate(v, 70)}</Text>,
    },
    {
      title: "Created",
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
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v: ReportStatus) => <StatusTag value={v} />,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.reports}
        subtitle="User-submitted reports on stories, chapters and comments"
      />

      <Card
        title={
          <Space wrap>
            <Select
              value={status}
              onChange={onStatus}
              style={{ width: 150 }}
              options={[
                { label: "All statuses", value: "all" },
                ...REPORT_STATUS.map((s) => ({ label: s, value: s })),
              ]}
            />
            <Select
              value={reason}
              onChange={onReason}
              style={{ width: 160 }}
              options={[
                { label: "All reasons", value: "all" },
                ...REPORT_REASON.map((s) => ({ label: s, value: s })),
              ]}
            />
          </Space>
        }
        extra={
          <Input.Search
            allowClear
            placeholder="Search target or reporter"
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
            onClick: () => navigate(ROUTES.admin.report(row.id)),
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
