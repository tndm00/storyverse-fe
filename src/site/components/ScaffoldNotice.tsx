import type { ReactNode } from "react";
import { Alert, Typography } from "antd";

const { Title, Paragraph } = Typography;

export interface ScaffoldNoticeProps {
  title: ReactNode;
  description?: ReactNode;
  backend?: ReactNode;
}

// Placeholder banner for the reader-site pages that are scaffolded but not built.
// `backend` says which backend service backs this page and whether it exists yet.
export function ScaffoldNotice({ title, description, backend }: ScaffoldNoticeProps) {
  return (
    <div>
      <Title level={2} style={{ marginTop: 0 }}>
        {title}
      </Title>
      {description ? <Paragraph type="secondary">{description}</Paragraph> : null}
      <Alert
        type="info"
        showIcon
        message="Scaffold — not implemented yet"
        description={
          <>
            <Paragraph style={{ marginBottom: 4 }}>
              This reader-site page is a placeholder. Layout, route and navigation are wired; the
              content and data still need to be built.
            </Paragraph>
            {backend ? (
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>Backend:</strong> {backend}
              </Paragraph>
            ) : null}
          </>
        }
      />
    </div>
  );
}
