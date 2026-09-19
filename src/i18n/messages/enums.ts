import { defineMessages } from "../defineMessages";

// Display text for the enum values the API sends. The values themselves (the keys' last part) are
// what is sent to and received from the backend and are never translated.
export const enums = defineMessages({
  // story / chapter / review / report statuses (one group, some values are shared)
  "enum.status.Draft": { en: "Draft", vi: "Nháp" },
  "enum.status.Ongoing": { en: "Ongoing", vi: "Công khai" },
  "enum.status.Completed": { en: "Completed", vi: "Hoàn thành" },
  "enum.status.Hiatus": { en: "Hiatus", vi: "Tạm dừng" },
  "enum.status.Dropped": { en: "Dropped", vi: "Đã bỏ" },
  "enum.status.Scheduled": { en: "Scheduled", vi: "Đã lên lịch" },
  "enum.status.Published": { en: "Published", vi: "Đã xuất bản" },
  "enum.status.Removed": { en: "Removed", vi: "Đã gỡ" },
  "enum.status.Pending": { en: "Pending", vi: "Chờ xử lý" },
  "enum.status.Reviewing": { en: "Reviewing", vi: "Đang xem xét" },
  "enum.status.Approved": { en: "Approved", vi: "Đã duyệt" },
  "enum.status.Rejected": { en: "Rejected", vi: "Bị từ chối" },
  "enum.status.Resolved": { en: "Resolved", vi: "Đã xử lý" },
  "enum.status.Dismissed": { en: "Dismissed", vi: "Đã bỏ qua" },

  "enum.reason.Copyright": { en: "Copyright", vi: "Bản quyền" },
  "enum.reason.Inappropriate": { en: "Inappropriate", vi: "Không phù hợp" },
  "enum.reason.Spam": { en: "Spam", vi: "Spam" },
  "enum.reason.Other": { en: "Other", vi: "Khác" },

  "enum.action.Dismiss": { en: "Dismiss", vi: "Bỏ qua" },
  "enum.action.Warn": { en: "Warn", vi: "Cảnh cáo" },
  "enum.action.Hide": { en: "Hide", vi: "Ẩn" },
  "enum.action.Remove": { en: "Remove", vi: "Gỡ" },

  "enum.target.Story": { en: "Story", vi: "Truyện" },
  "enum.target.Chapter": { en: "Chapter", vi: "Chương" },
  "enum.target.Comment": { en: "Comment", vi: "Bình luận" },

  "enum.commentStatus.Visible": { en: "Visible", vi: "Hiển thị" },
  "enum.commentStatus.Hidden": { en: "Hidden", vi: "Đã ẩn" },
  "enum.commentStatus.Deleted": { en: "Deleted", vi: "Đã xoá" },

  "enum.authorStatus.Active": { en: "Active", vi: "Hoạt động" },
  "enum.authorStatus.Suspended": { en: "Suspended", vi: "Vô hiệu hoá" },
});
