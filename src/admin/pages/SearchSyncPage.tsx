import { Button, Card, Col, Row, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as storyService from "@/services/storyService";
import type { SearchSyncStatus } from "@/services/storyService";
import { formatDate } from "@/utils/format";

// The `search_sync_cursor` table only ever has one row (a single shared
// cursor) — this key is fixed rather than pulled from the API response.
const CURSOR_ROW_KEY = "search_sync_cursor";

export function SearchSyncPage() {
  const { t, fromNow } = useAdminLocale();
  const { data, loading, refetch } = useAsyncQuery(() => storyService.getSearchSyncStatus(), []);

  const coveragePercent =
    data && data.eligibleStoryCount > 0
      ? Math.round((data.syncedDocumentCount / data.eligibleStoryCount) * 100)
      : null;

  const onOff = (v: boolean) => (
    <Tag color={v ? "success" : "default"}>{v ? t("searchSync.on") : t("searchSync.off")}</Tag>
  );

  const columns: ColumnsType<SearchSyncStatus> = [
    {
      title: t("searchSync.syncedTo"),
      dataIndex: "lastSyncedAt",
      render: (v: string | null) =>
        v ? `${formatDate(v)} (${fromNow(v)})` : t("searchSync.neverRun"),
    },
    {
      title: t("searchSync.docsSynced"),
      dataIndex: "syncedDocumentCount",
    },
    {
      title: t("searchSync.eligible"),
      dataIndex: "eligibleStoryCount",
    },
    {
      title: t("searchSync.coverage"),
      key: "coverage",
      render: () => (coveragePercent === null ? "—" : `${coveragePercent}%`),
    },
    {
      title: t("searchSync.writeEnabled"),
      dataIndex: "enabled",
      render: onOff,
    },
    {
      title: t("searchSync.readEnabled"),
      dataIndex: "searchReadEnabled",
      render: onOff,
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={t("searchSync.title")}
        subtitle={t("searchSync.subtitle")}
        extra={
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={loading}>
            {t("common.refresh")}
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title={t("searchSync.docsSyncedCard")}
              value={data?.syncedDocumentCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title={t("searchSync.eligible")} value={data?.eligibleStoryCount ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title={t("searchSync.coverage")}
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
