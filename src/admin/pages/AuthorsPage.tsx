import { useState } from "react";
import { Button, Card, Checkbox, Form, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as authorService from "@/services/authorService";
import type { AuthorProfile } from "@/services/authorService";
import { DEFAULT_PAGE_SIZE, LABELS } from "@/utils/constants";
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
      "Đã tạo tác giả",
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
      "Đã cập nhật",
      () => {
        setEditing(null);
        refetch();
      },
    );
  };

  const toggleStatus = (a: AuthorProfile) =>
    run(
      () => authorService.setStatus(a.authorProfileId, a.status === "Active" ? "Suspended" : "Active"),
      a.status === "Active" ? "Đã vô hiệu hoá tác giả" : "Đã khôi phục tác giả",
      refetch,
    );

  const onSearch = (value: string) => {
    setPage(1);
    setKeyword(value);
  };

  const columns: ColumnsType<AuthorProfile> = [
    { title: "Bút danh", dataIndex: "penName", key: "penName" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Tên hiển thị", dataIndex: "displayName", key: "displayName" },
    {
      title: "Xác minh",
      dataIndex: "verified",
      key: "verified",
      width: 100,
      render: (v: boolean) => (v ? <Tag color="blue">Đã xác minh</Tag> : null),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: AuthorProfile["status"]) => (
        <Tag color={v === "Active" ? "success" : "default"}>
          {v === "Active" ? "Hoạt động" : "Vô hiệu hoá"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
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
            Sửa
          </Button>
          <Button
            size="small"
            danger={a.status === "Active"}
            disabled={busy}
            onClick={() => toggleStatus(a)}
          >
            {a.status === "Active" ? "Xoá" : "Khôi phục"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title={LABELS.authors}
        subtitle="Danh sách tác giả (tài khoản + hồ sơ đăng truyện). Xoá = vô hiệu hoá, không xoá vĩnh viễn — truyện đã đăng vẫn giữ nguyên."
        extra={
          <Button type="primary" onClick={openCreate}>
            Thêm tác giả
          </Button>
        }
      />

      <Card
        extra={
          <Input.Search
            allowClear
            placeholder="Tìm theo bút danh"
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
            showTotal: (t) => `${t} tác giả`,
          }}
        />
      </Card>

      <Modal
        open={creating}
        title="Thêm tác giả"
        onCancel={() => setCreating(false)}
        onOk={submitCreate}
        confirmLoading={busy}
        okText="Tạo"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
          >
            <Input placeholder="ten@vidu.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, min: 8, message: "Ít nhất 8 ký tự, gồm chữ và số" }]}
          >
            <Input.Password placeholder="Ít nhất 8 ký tự, có chữ và số" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="Tên hiển thị"
            rules={[{ required: true, message: "Nhập tên hiển thị" }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="penName"
            label="Bút danh"
            rules={[{ required: true, message: "Nhập bút danh" }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="bio" label="Tiểu sử">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editing !== null}
        title="Sửa tác giả"
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={busy}
        okText="Lưu"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="penName"
            label="Bút danh"
            rules={[{ required: true, message: "Nhập bút danh" }, { max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="bio" label="Tiểu sử">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="avatarUrl" label="Ảnh đại diện (URL)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="bannerUrl" label="Ảnh bìa (URL)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="verified" valuePropName="checked">
            <Checkbox>Đã xác minh</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
