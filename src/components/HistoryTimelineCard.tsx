import { Card, Space, Timeline, Typography } from "antd";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import type { HistoryEntry } from "@/types/domain";
import { formatDate } from "@/utils/format";

const { Text } = Typography;

// Shared "History" card used by ReportDetailPage and ReviewDetailPage — both
// render the same audit-trail shape (HistoryEntry[]) the same way.
export function HistoryTimelineCard({ history }: { history: HistoryEntry[] }) {
  const { t } = useAdminLocale();

  return (
    <Card title={t("common.history")} style={{ marginTop: 16 }}>
      <Timeline
        items={history.map((h) => ({
          children: (
            <Space direction="vertical" size={0}>
              <Text strong>{h.action}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {h.actor} · {formatDate(h.at)}
              </Text>
              {h.note ? <Text>{h.note}</Text> : null}
            </Space>
          ),
        }))}
      />
    </Card>
  );
}
