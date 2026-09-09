import { Tag } from "antd";
import { STATUS_TAG_COLOR, REASON_TAG_COLOR, ACTION_TAG_COLOR } from "@/utils/constants";

const MAPS: Record<string, Record<string, string>> = {
  status: STATUS_TAG_COLOR,
  reason: REASON_TAG_COLOR,
  action: ACTION_TAG_COLOR,
};

export interface StatusTagProps {
  value: string | null | undefined;
  kind?: "status" | "reason" | "action";
}

// <StatusTag value="Pending" /> or <StatusTag value="Spam" kind="reason" />
export function StatusTag({ value, kind = "status" }: StatusTagProps) {
  if (!value) return <span style={{ color: "#999" }}>—</span>;
  const color = (MAPS[kind] ?? STATUS_TAG_COLOR)[value] ?? "default";
  return <Tag color={color}>{value}</Tag>;
}
