import { useState } from "react";
import { Alert, Button, Card, Form, InputNumber, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppPageHeader } from "@/admin/components/AppPageHeader";
import { useMockQuery } from "@/hooks/useMockQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import * as genreService from "@/services/genreService";
import type { Genre } from "@/services/genreService";

interface FormValues {
  name: string;
  description?: string;
  displayOrder: number;
}

export function GenresPage() {
  const { data, loading, refetch } = useMockQuery(() => genreService.listAll(), []);
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
      editing === "new" ? "Đã tạo thể loại" : "Đã cập nhật",
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
      g.isActive ? "Đã ẩn thể loại" : "Đã hiện thể loại",
      refetch,
    );

  const columns: ColumnsType<Genre> = [
    { title: "Tên", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug", render: (s: string) => <code>{s}</code> },
    { title: "Mô tả", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Thứ tự",
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 90,
      sorter: (a, b) => a.displayOrder - b.displayOrder,
      defaultSortOrder: "ascend",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Hiện" : "Ẩn"}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, g) => (
        <Space>
          <Button size="small" onClick={() => openEdit(g)}>
            Sửa
          </Button>
          <Button size="small" danger={g.isActive} disabled={busy} onClick={() => toggleActive(g)}>
            {g.isActive ? "Ẩn" : "Hiện"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        title="Thể loại"
        subtitle="Danh sách thể loại truyện (lưu trong CSDL Content). Ẩn thể loại thay vì xoá — truyện đã gán vẫn giữ nguyên."
        extra={
          <Button type="primary" onClick={openCreate}>
            Thêm thể loại
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
        title={editing === "new" ? "Thêm thể loại" : "Sửa thể loại"}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={busy}
        okText="Lưu"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên"
            rules={[{ required: true, message: "Nhập tên thể loại" }, { max: 100 }]}
          >
            <Input placeholder="Ví dụ: Kinh dị tâm lý" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="displayOrder"
            label="Thứ tự hiển thị"
            tooltip="Số nhỏ hiện trước. Có thể dùng số âm để đưa lên đầu."
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: 160 }} />
          </Form.Item>
          {editing === "new" ? (
            <Alert
              type="info"
              showIcon
              message="Slug được tạo tự động từ tên và không đổi về sau."
            />
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
