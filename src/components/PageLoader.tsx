import { Spin } from "antd";

// Suspense fallback for lazily-loaded route chunks.
export function PageLoader() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <Spin size="large" />
    </div>
  );
}
