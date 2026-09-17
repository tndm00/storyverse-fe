import { Button, Card, Col, Row, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as storyService from "@/services/storyService";
import type { SearchSyncStatus } from "@/services/storyService";
import { fromNow, formatDate } from "@/utils/format";

// The `search_sync_cursor` table only ever has one row (a single shared
// cursor) — this key is fixed rather than pulled from the API response.
const CURSOR_ROW_KEY = "search_sync_cursor";

export function SearchSyncPage() {
  const { data, loading, refetch } = useAsyncQuery(() => storyService.getSearchSyncStatus(), []);

  const coveragePercent =
    data && data.eligibleStoryCount > 0
      ? Math.round((data.syncedDocumentCount / data.eligibleStoryCount) * 100)
      : null;

  const columns: ColumnsType<SearchSyncStatus> = [
    {
      title: "Đồng bộ tới",
      dataIndex: "lastSyncedAt",
      render: (v: string | null) => (v ? `${formatDate(v)} (${fromNow(v)})` : "Chưa từng chạy"),
    },
    {
      title: "Số dòng đã sync (Elasticsearch)",
      dataIndex: "syncedDocumentCount",
    },
    {
      title: "Tổng truyện đủ điều kiện (Postgres)",
      dataIndex: "eligibleStoryCount",
    },
    {
      title: "Tỉ lệ đồng bộ",
      key: "coverage",
      render: () => (coveragePercent === null ? "—" : `${coveragePercent}%`),
    },
    {
      title: "Ghi (Enabled)",
      dataIndex: "enabled",
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>,
    },
    {
      title: "Đọc (SearchReadEnabled)",
      dataIndex: "searchReadEnabled",
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title="Đồng bộ tìm kiếm (Elasticsearch)"
        subtitle="Trạng thái job nền đồng bộ truyện từ Postgres vào Elasticsearch — chỉ xem, không có thao tác nào ở đây."
        extra={
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={loading}>
            Làm mới
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="Số dòng đã sync vào Elasticsearch"
              value={data?.syncedDocumentCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="Tổng truyện đủ điều kiện (Postgres)"
              value={data?.eligibleStoryCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="Tỉ lệ đồng bộ"
              value={coveragePercent ?? 0}
              suffix="%"
              valueStyle={{ color: coveragePercent === 100 ? "#3f8600" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} styles={{ body: { padding: 0 } }}>
        <Table<SearchSyncStatus>
          rowKey={() => CURSOR_ROW_KEY}
          size="middle"
          loading={loading}
          dataSource={data ? [data] : []}
          columns={columns}
          pagination={false}
        />
      </Card>
    </div>
  );
}
