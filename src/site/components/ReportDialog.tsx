import { useState } from "react";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { REPORT_REASON, type ReportReason, type TargetType } from "@/utils/constants";
import { fileReport } from "@/services/reportService";

const REASON_LABEL: Record<ReportReason, string> = {
  Copyright: "Vi phạm bản quyền",
  Inappropriate: "Nội dung không phù hợp",
  Spam: "Spam / quảng cáo",
  Other: "Khác",
};

// Inline cb-styled report panel. Rendered next to a "Báo cáo" button.
export function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: Extract<TargetType, "Story" | "Chapter" | "Comment">;
  targetId: string;
  onClose: () => void;
}) {
  const { busy, run } = useAsyncRunner();
  const [reason, setReason] = useState<ReportReason>("Inappropriate");
  const [description, setDescription] = useState("");

  const submit = () =>
    run(
      () => fileReport({ targetType, targetId, reason, description }),
      "Đã gửi báo cáo. Cảm ơn bạn.",
      onClose,
    );

  return (
    <div className="cb-form-card cb-report-panel">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>
        Báo cáo{" "}
        {targetType === "Chapter" ? "chương" : targetType === "Comment" ? "bình luận" : "truyện"}
      </h3>
      <div className="cb-field">
        <label className="cb-field-label" htmlFor="rp-reason">
          Lý do
        </label>
        <select
          className="cb-input"
          id="rp-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
        >
          {REPORT_REASON.map((r) => (
            <option key={r} value={r}>
              {REASON_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="cb-field">
        <label className="cb-field-label" htmlFor="rp-desc">
          Mô tả
        </label>
        <textarea
          className="cb-input"
          id="rp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 80 }}
          required
        />
      </div>
      <div className="cb-cta-actions">
        <button type="button" className="cb-btn cb-ghost cb-btn-sm" onClick={onClose}>
          Huỷ
        </button>
        <button
          type="button"
          className="cb-btn cb-btn-sm"
          disabled={busy || !description.trim()}
          onClick={submit}
        >
          {busy ? "Đang gửi…" : "Gửi báo cáo"}
        </button>
      </div>
    </div>
  );
}
