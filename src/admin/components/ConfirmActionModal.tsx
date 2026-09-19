import { useId, useState, type ReactNode } from "react";
import { Alert, Input, Modal } from "antd";
import { useAdminLocale } from "@/hooks/useAdminLocale";

export interface ConfirmActionModalProps {
  open: boolean;
  title: ReactNode;
  okText?: string;
  okType?: "primary" | "danger";
  reasonRequired?: boolean;
  reasonLabel?: string;
  description?: ReactNode;
  confirmLoading?: boolean;
  onOk: (reason: string) => void;
  onCancel: () => void;
}

// Reusable "type a reason, then confirm" modal for Reject / Hide / Remove.
export function ConfirmActionModal({
  open,
  title,
  okText,
  okType = "primary",
  reasonRequired = true,
  reasonLabel,
  description,
  confirmLoading = false,
  onOk,
  onCancel,
}: ConfirmActionModalProps) {
  const { t } = useAdminLocale();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const reasonInputId = useId();

  const invalid = reasonRequired && !reason.trim();

  return (
    <Modal
      open={open}
      title={title}
      okText={okText ?? t("common.confirm")}
      okButtonProps={{
        danger: okType === "danger",
        disabled: invalid,
        "data-testid": "confirm-reject",
      }}
      confirmLoading={confirmLoading}
      onOk={() => {
        setTouched(true);
        if (invalid) return;
        onOk(reason.trim());
      }}
      onCancel={onCancel}
      destroyOnClose
    >
      {description ? <div style={{ marginBottom: 12 }}>{description}</div> : null}
      <label htmlFor={reasonInputId} style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
        {reasonLabel ?? t("common.reason")}
        {reasonRequired ? <span style={{ color: "#cf1322" }}> *</span> : null}
      </label>
      <Input.TextArea
        id={reasonInputId}
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={t("common.noteDefaultPlaceholder")}
        data-testid="reason-input"
      />
      {touched && invalid ? (
        <Alert
          style={{ marginTop: 8 }}
          type="error"
          showIcon
          message={t("common.reasonRequired")}
        />
      ) : null}
    </Modal>
  );
}
