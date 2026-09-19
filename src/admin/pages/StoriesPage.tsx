import { useState } from "react";
import { App, Button, Card, Drawer, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult, TableCurrentDataSource } from "antd/es/table/interface";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { StatusTag } from "@/components/StatusTag";
import { StoryDetailContent } from "@/components/StoryDetailContent";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import * as storyService from "@/services/storyService";
import type { StorySortField } from "@/services/storyService";
import { DEFAULT_PAGE_SIZE, STORY_STATUS } from "@/utils/constants";
import type { StoryStatus } from "@/utils/constants";
import type { Story } from "@/types/domain";
import { formatDateShort } from "@/utils/format";

const { Text } = Typography;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type StatusFilter = StoryStatus | "all";

export function StoriesPage() {
  const { t, tEnum, compactNumber } = useAdminLocale();
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
      title: t("stories.deleteTitle"),
      content: t("stories.deleteContent", { title: story.title }),
      okText: t("stories.deleteOk"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        setDeleting(true);
        try {
          await storyService.deleteStory(story.publicId);
          message.success(t("stories.deleted"));
          setSelected(null);
          refetch();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t("stories.deleteFailed"));
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
      title: t("stories.colStory"),
      dataIndex: "title",
      sorter: true,
      render: (title: string, row) => (
        <Space>
          <img
            src={row.coverImageUrl || "/og-default.png"}
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
      title: t("common.colStatus"),
      dataIndex: "status",
      width: 110,
      render: (v: StoryStatus) => <StatusTag value={v} />,
    },
    {
      title: t("stories.colGenres"),
      dataIndex: "genres",
      width: 200,
      render: (genres: string[]) => genres.join(", "),
    },
    { title: t("stories.colChapters"), dataIndex: "chapterCount", width: 100, align: "right" },
    {
      title: t("stories.colViews"),
      dataIndex: "viewCount",
      width: 100,
      align: "right",
      sorter: true,
      render: (v: number) => compactNumber(v),
    },
    {
      title: t("stories.colRating"),
      dataIndex: "ratingAvg",
      width: 100,
      align: "right",
      sorter: true,
      render: (v: number, row) => `${v} (${compactNumber(row.ratingCount)})`,
    },
    {
      title: t("stories.colPublished"),
      dataIndex: "publishedAt",
      width: 120,
      sorter: true,
      render: (v: string | null) => formatDateShort(v),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, row) =>
        row.status === "Draft" ? (
          <Button danger size="small" loading={deleting} onClick={() => doDelete(row)}>
            {t("common.delete")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <AppPageHeader title={t("nav.stories")} subtitle={t("stories.subtitle")} />

      <Card
        title={
          <Space wrap>
            <Select
              value={status}
              onChange={onStatus}
              style={{ width: 160 }}
              options={[
                { label: t("common.allStatuses"), value: "all" },
                ...STORY_STATUS.map((s) => ({ label: tEnum("status", s), value: s })),
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
            showTotal: (total) => t("stories.total", { count: total }),
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
                {t("common.delete")}
              </Button>
            ) : null}
            <Button onClick={() => setSelected(null)}>{t("common.close")}</Button>
          </Space>
        }
      >
        {selected ? <StoryDetailContent story={detail.data ?? selected} /> : null}
      </Drawer>
    </div>
  );
}
