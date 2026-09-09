import type { ReactNode } from "react";
import { Breadcrumb, Space, Typography } from "antd";
import { Link } from "react-router-dom";

const { Title, Text } = Typography;

export interface BreadcrumbItem {
  title: ReactNode;
  to?: string;
}

export interface AppPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  extra?: ReactNode;
}

export function AppPageHeader({ title, subtitle, breadcrumb, extra }: AppPageHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {breadcrumb?.length ? (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumb.map((b) => ({
            title: b.to ? <Link to={b.to}>{b.title}</Link> : b.title,
          }))}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <Space direction="vertical" size={0}>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        </Space>
        {extra ? <div>{extra}</div> : null}
      </div>
    </div>
  );
}
