import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as reportService from "@/services/reportService";
import { DEFAULT_PAGE_SIZE, REPORT_REASON, REPORT_STATUS, ROUTES } from "@/utils/constants";
import type { ReportReason, ReportStatus } from "@/utils/constants";
import type { Report } from "@/types/domain";
import { formatDate, truncate } from "@/utils/format";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StatusFilter = ReportStatus | "all";
type ReasonFilter = ReportReason | "all";

export function ReportsQueuePage() {
  const navigate = useNavigate();
  const { t, tEnum, fromNow } = useAdminLocale();
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
      title: t("reports.colTarget"),
      dataIndex: ["targetRef", "title"],
      render: (title: string, row) => (
        <Space direction="vertical" size={0}>
          <Link to={ROUTES.admin.report(row.id)}>{title}</Link>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tEnum("target", row.targetType)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("reports.colReason"),
      dataIndex: "reason",
      width: 130,
      render: (v: ReportReason) => <StatusTag value={v} kind="reason" />,
    },
    { title: t("reports.colReporter"), dataIndex: "reporterName", width: 130 },
    {
      title: t("reports.colNote"),
      dataIndex: "note",
      render: (v: string) => <Text type="secondary">{truncate(v, 70)}</Text>,
    },
    {
      title: t("common.colCreated"),
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
      render: (v: ReportStatus) => <StatusTag value={v} />,
    },
  ];

  return (
    <div>
      <AppPageHeader title={t("nav.reports")} subtitle={t("reports.subtitle")} />

      <Card
        title={
          <Space wrap>
            <Select
              value={status}
              onChange={onStatus}
              style={{ width: 150 }}
              options={[
                { label: t("common.allStatuses"), value: "all" },
                ...REPORT_STATUS.map((s) => ({ label: tEnum("status", s), value: s })),
              ]}
            />
            <Select
              value={reason}
              onChange={onReason}
              style={{ width: 160 }}
              options={[
                { label: t("common.allReasons"), value: "all" },
                ...REPORT_REASON.map((s) => ({ label: tEnum("reason", s), value: s })),
              ]}
            />
          </Space>
        }
        extra={
          <Input.Search
            allowClear
            placeholder={t("reports.search")}
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
            showTotal: (total) => t("common.itemsTotal", { count: total }),
          }}
        />
      </Card>
    </div>
  );
}
