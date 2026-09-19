import { useState } from "react";
import { Button, Card, Checkbox, Form, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as authorService from "@/services/authorService";
import type { AuthorProfile } from "@/services/authorService";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { formatDateShort } from "@/utils/format";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

interface CreateFormValues {
  email: string;
  password: string;
  displayName: string;
  penName: string;
  bio?: string;
}

interface EditFormValues {
  penName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  verified: boolean;
}

export function AuthorsPage() {
  const { t, tEnum } = useAdminLocale();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useAsyncQuery(
    () => authorService.listAuthors({ keyword, page, pageSize: PAGE_SIZE }),
    [keyword, page],
  );
  const { busy, run } = useAsyncRunner();

  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateFormValues>();

  const [editing, setEditing] = useState<AuthorProfile | null>(null);
  const [editForm] = Form.useForm<EditFormValues>();

  const openCreate = () => {
    createForm.resetFields();
    setCreating(true);
  };

  const openEdit = (a: AuthorProfile) => {
    editForm.setFieldsValue({
      penName: a.penName,
      bio: a.bio ?? "",
      avatarUrl: a.avatarUrl ?? "",
      bannerUrl: a.bannerUrl ?? "",
      verified: a.verified,
    });
    setEditing(a);
  };

  const submitCreate = async () => {
    const v = await createForm.validateFields();
    await run(
      () => authorService.create(v),
      t("authors.created"),
      () => {
        setCreating(false);
        setPage(1);
        refetch();
      },
    );
  };

  const submitEdit = async () => {
    const v = await editForm.validateFields();
    await run(
      () => authorService.update(editing!.authorProfileId, v),
      t("common.updated"),
      () => {
        setEditing(null);
        refetch();
      },
    );
  };

  const toggleStatus = (a: AuthorProfile) =>
    run(
      () => authorService.setStatus(a.authorProfileId, a.status === "Active" ? "Suspended" : "Active"),
      a.status === "Active" ? t("authors.deactivated") : t("authors.restored"),
      refetch,
    );

  const onSearch = (value: string) => {
    setPage(1);
    setKeyword(value);
  };

  const columns: ColumnsType<AuthorProfile> = [
    { title: t("authors.colPenName"), dataIndex: "penName", key: "penName" },
    { title: t("authors.email"), dataIndex: "email", key: "email" },
    { title: t("authors.colDisplayName"), dataIndex: "displayName", key: "displayName" },
    {
      title: t("authors.colVerified"),
      dataIndex: "verified",
      key: "verified",
      width: 100,
      render: (v: boolean) => (v ? <Tag color="blue">{t("authors.verified")}</Tag> : null),
    },
    {
      title: t("common.colStatus"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: AuthorProfile["status"]) => (
        <Tag color={v === "Active" ? "success" : "default"}>{tEnum("authorStatus", v)}</Tag>
      ),
    },
    {
      title: t("authors.colCreated"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (v: string) => formatDateShort(v),
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_, a) => (
        <Space>
          <Button size="small" onClick={() => openEdit(a)}>
            {t("common.edit")}
          </Button>
          <Button
            size="small"
            danger={a.status === "Active"}
            disabled={busy}
            onClick={() => toggleStatus(a)}
          >
            {a.status === "Active" ? t("common.delete") : t("authors.restore")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={t("nav.authors")}
        subtitle={t("authors.subtitle")}
        extra={
          <Button type="primary" onClick={openCreate}>
            {t("authors.add")}
          </Button>
        }
      />

      <Card
        extra={
          <Input.Search
            allowClear
            placeholder={t("authors.search")}
            style={{ width: 260 }}
            onSearch={onSearch}
          />
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<AuthorProfile>
          rowKey="authorProfileId"
          size="middle"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.totalCount ?? 0,
            onChange: setPage,
            showTotal: (total) => t("authors.total", { count: total }),
          }}
        />
      </Card>

      <Modal
        open={creating}
        title={t("authors.add")}
        onCancel={() => setCreating(false)}
        onOk={submitCreate}
        confirmLoading={busy}
        okText={t("authors.create")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="email"
            label={t("authors.email")}
            rules={[{ required: true, type: "email", message: t("authors.emailInvalid") }]}
          >
            <Input placeholder={t("authors.emailPlaceholder")} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("authors.password")}
            rules={[{ required: true, min: 8, message: t("authors.passwordRule") }]}
          >
            <Input.Password placeholder={t("authors.passwordRule")} />
          </Form.Item>
          <Form.Item
            name="displayName"
            label={t("authors.colDisplayName")}
            rules={[{ required: true, message: t("authors.displayNameRequired") }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="penName"
            label={t("authors.colPenName")}
            rules={[{ required: true, message: t("authors.penNameRequired") }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="bio" label={t("authors.bio")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editing !== null}
        title={t("authors.editTitle")}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={busy}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="penName"
            label={t("authors.colPenName")}
            rules={[{ required: true, message: t("authors.penNameRequired") }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="bio" label={t("authors.bio")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="avatarUrl" label={t("authors.avatarUrl")}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="bannerUrl" label={t("authors.bannerUrl")}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="verified" valuePropName="checked">
            <Checkbox>{t("authors.verified")}</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
