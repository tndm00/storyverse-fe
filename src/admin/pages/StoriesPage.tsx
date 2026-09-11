import { useState } from "react";
import { App, Button, Card, Drawer, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult, TableCurrentDataSource } from "antd/es/table/interface";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as storyService from "@/services/storyService";
import type { StorySortField } from "@/services/storyService";
import { DEFAULT_PAGE_SIZE, LABELS, STORY_STATUS } from "@/utils/constants";
import type { StoryStatus } from "@/utils/constants";
import type { Story } from "@/types/domain";
import { compactNumber, formatDateShort } from "@/utils/format";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StatusFilter = StoryStatus | "all";

export function StoriesPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: StorySortField; sortDir: "asc" | "desc" }>({
    sortBy: "publishedAt",
    sortDir: "desc",
  });
  const [selected, setSelected] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { modal, message } = App.useApp();

  const { data, loading, refetch } = useAsyncQuery(
    () => storyService.listStories({ pageNumber: page, pageSize: PAGE_SIZE, status, q, ...sort }),
    [page, status, q, sort],
  );

  const detail = useAsyncQuery(
    () => (selected ? storyService.get(selected.publicId) : Promise.resolve(null)),
    [selected?.publicId],
  );

  const doDelete = (story: Story) => {
    modal.confirm({
      title: "Xoá truyện?",
      content: `Xoá vĩnh viễn truyện "${story.title}", không thể hoàn tác.`,
      okText: "Xoá vĩnh viễn",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        setDeleting(true);
        try {
          await storyService.deleteStory(story.publicId);
          message.success("Đã xoá truyện");
          setSelected(null);
          refetch();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Không xoá được truyện");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const onStatus = (value: string) => {
    setPage(1);
    setStatus(value as StatusFilter);
  };
  const onSearch = (value: string) => {
    setPage(1);
    setQ(value);
  };

  const onTableChange = (
    _pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<Story> | SorterResult<Story>[],
    extra: TableCurrentDataSource<Story>,
  ) => {
    // AntD Table re-passes the *current* sorter on every change, including a
    // plain page-change click — only react here when the user actually
    // triggered a new sort, or a page click gets silently reset back to 1.
    if (extra.action !== "sort") return;
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s?.field) {
      setSort({
        sortBy: String(s.field) as StorySortField,
        sortDir: s.order === "ascend" ? "asc" : "desc",
      });
      setPage(1);
    }
  };

  const columns: ColumnsType<Story> = [
    {
      title: "Story",
      dataIndex: "title",
      sorter: true,
      render: (title: string, row) => (
        <Space>
          <img
            src={row.coverImageUrl}
            alt=""
            width={32}
            height={44}
            style={{ objectFit: "cover", borderRadius: 4, background: "#eee" }}
          />
          <Space direction="vertical" size={0} align="start">
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              onClick={() => setSelected(row)}
            >
              {title}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.authorName}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v: StoryStatus) => <StatusTag value={v} />,
    },
    {
      title: "Genres",
      dataIndex: "genres",
      width: 200,
      render: (genres: string[]) => genres.join(", "),
    },
    { title: "Chapters", dataIndex: "chapterCount", width: 100, align: "right" },
    {
      title: "Views",
      dataIndex: "viewCount",
      width: 100,
      align: "right",
      sorter: true,
      render: (v: number) => compactNumber(v),
    },
    {
      title: "Rating",
      dataIndex: "ratingAvg",
      width: 100,
      align: "right",
      sorter: true,
      render: (v: number, row) => `${v} (${compactNumber(row.ratingCount)})`,
    },
    {
      title: "Published",
      dataIndex: "publishedAt",
      width: 120,
      sorter: true,
      render: (v: string | null) => formatDateShort(v),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.stories}
        subtitle="Every story on the platform, across all lifecycle states"
      />

      <Card
        title={
          <Space wrap>
            <Select
              value={status}
              onChange={onStatus}
              style={{ width: 160 }}
              options={[
                { label: "All statuses", value: "all" },
                ...STORY_STATUS.map((s) => ({ label: s, value: s })),
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
          rowKey="publicId"
          loading={loading}
          columns={columns}
          dataSource={data?.items ?? []}
          onChange={onTableChange}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.totalCount ?? 0,
            onChange: setPage,
            showTotal: (t) => `${t} stories`,
          }}
        />
      </Card>

      <Drawer
        width={560}
        open={Boolean(selected)}
        title={selected?.title}
        onClose={() => setSelected(null)}
        extra={
          <Space>
            {selected?.status === "Draft" ? (
              <Button danger loading={deleting} onClick={() => selected && doDelete(selected)}>
                Xoá
              </Button>
            ) : null}
            <Button onClick={() => setSelected(null)}>Close</Button>
          </Space>
        }
      >
        {selected ? <StoryDetailContent story={detail.data ?? selected} /> : null}
      </Drawer>
    </div>
  );
}
