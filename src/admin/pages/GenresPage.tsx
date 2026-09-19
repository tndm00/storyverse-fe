import { useState } from "react";
import { Alert, Button, Card, Form, InputNumber, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as genreService from "@/services/genreService";
import type { Genre } from "@/services/genreService";

interface FormValues {
  name: string;
  description?: string;
  displayOrder: number;
}

export function GenresPage() {
  const { t } = useAdminLocale();
  const { data, loading, refetch } = useAsyncQuery(() => genreService.listAll(), []);
  const { busy, run } = useAsyncRunner();
  const [editing, setEditing] = useState<Genre | "new" | null>(null);
  const [form] = Form.useForm<FormValues>();

  const openCreate = () => {
    form.setFieldsValue({ name: "", description: "", displayOrder: data?.length ?? 0 });
    setEditing("new");
  };
  const openEdit = (g: Genre) => {
    form.setFieldsValue({
      name: g.name,
      description: g.description ?? "",
      displayOrder: g.displayOrder,
    });
    setEditing(g);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const input = {
      name: v.name,
      description: v.description ?? "",
      displayOrder: v.displayOrder,
    };
    await run(
      () =>
        editing === "new"
          ? genreService.create(input)
          : genreService.update(editing!.slug, {
              ...input,
              isActive: (editing as Genre).isActive,
            }),
      editing === "new" ? t("genres.created") : t("common.updated"),
      () => {
        setEditing(null);
        refetch();
      },
    );
  };

  const toggleActive = (g: Genre) =>
    run(
      () =>
        g.isActive
          ? genreService.hide(g.slug)
          : genreService.update(g.slug, {
              name: g.name,
              description: g.description ?? "",
              displayOrder: g.displayOrder,
              isActive: true,
            }),
      g.isActive ? t("genres.nowHidden") : t("genres.nowVisible"),
      refetch,
    );

  const columns: ColumnsType<Genre> = [
    { title: t("genres.colName"), dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug", render: (s: string) => <code>{s}</code> },
    {
      title: t("genres.colDescription"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: t("genres.colOrder"),
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 90,
      sorter: (a, b) => a.displayOrder - b.displayOrder,
      defaultSortOrder: "ascend",
    },
    {
      title: t("common.colStatus"),
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "default"}>{v ? t("genres.visible") : t("genres.hidden")}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, g) => (
        <Space>
          <Button size="small" onClick={() => openEdit(g)}>
            {t("common.edit")}
          </Button>
          <Button size="small" danger={g.isActive} disabled={busy} onClick={() => toggleActive(g)}>
            {g.isActive ? t("common.hide") : t("common.show")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={t("nav.genres")}
        subtitle={t("genres.subtitle")}
        extra={
          <Button type="primary" onClick={openCreate}>
            {t("genres.add")}
          </Button>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Genre>
          rowKey="slug"
          size="middle"
          loading={loading}
          dataSource={data ?? []}
          columns={columns}
          pagination={false}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === "new" ? t("genres.add") : t("genres.editTitle")}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={busy}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("genres.colName")}
            rules={[{ required: true, message: t("genres.nameRequired") }, { max: 100 }]}
          >
            <Input placeholder={t("genres.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("genres.colDescription")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="displayOrder"
            label={t("genres.displayOrder")}
            tooltip={t("genres.displayOrderHint")}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: 160 }} />
          </Form.Item>
          {editing === "new" ? (
            <Alert type="info" showIcon message={t("genres.slugNote")} />
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
