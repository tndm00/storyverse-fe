import { useEffect, useState, type ReactNode } from "react";
import { Alert, Input, Modal } from "antd";
import { MESSAGES } from "@/utils/constants";

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
  okText = "Confirm",
  okType = "primary",
  reasonRequired = true,
  reasonLabel = "Reason",
  description,
  confirmLoading = false,
  onOk,
  onCancel,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const invalid = reasonRequired && !reason.trim();

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger: okType === "danger", disabled: invalid }}
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
      <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
        {reasonLabel}
        {reasonRequired ? <span style={{ color: "#cf1322" }}> *</span> : null}
      </label>
      <Input.TextArea
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="This note is shown to the author and kept in the moderation history."
      />
      {touched && invalid ? (
        <Alert
          style={{ marginTop: 8 }}
          type="error"
          showIcon
          message={MESSAGES.common.reasonRequired}
        />
      ) : null}
    </Modal>
  );
}
