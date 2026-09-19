import { Tag } from "antd";
import { useAdminLocale } from "@/hooks/useAdminLocale";
import type { EnumGroup } from "@/i18n/translate";
import { STATUS_TAG_COLOR, REASON_TAG_COLOR, ACTION_TAG_COLOR } from "@/utils/constants";

const MAPS: Record<string, Record<string, string>> = {
  status: STATUS_TAG_COLOR,
  reason: REASON_TAG_COLOR,
  action: ACTION_TAG_COLOR,
};

export interface StatusTagProps {
  value: string | null | undefined;
  kind?: Extract<EnumGroup, "status" | "reason" | "action">;
}

// <StatusTag value="Pending" /> or <StatusTag value="Spam" kind="reason" />
// Only the admin console uses this, so it reads the admin language; the value itself is never changed.
export function StatusTag({ value, kind = "status" }: StatusTagProps) {
  const { tEnum } = useAdminLocale();
  if (!value) return <span style={{ color: "#999" }}>—</span>;
  const color = (MAPS[kind] ?? STATUS_TAG_COLOR)[value] ?? "default";
  return <Tag color={color}>{tEnum(kind, value)}</Tag>;
}
