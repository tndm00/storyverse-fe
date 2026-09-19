import { defineMessages } from "../defineMessages";

// Reports queue, report detail page and comment moderation.
export const reports = defineMessages({
  "reports.subtitle": {
    en: "User-submitted reports on stories, chapters and comments",
    vi: "Báo cáo do người dùng gửi về truyện, chương và bình luận",
  },
  "reports.colTarget": { en: "Target", vi: "Đối tượng" },
  "reports.colReason": { en: "Reason", vi: "Lý do" },
  "reports.colReporter": { en: "Reporter", vi: "Người báo cáo" },
  "reports.colNote": { en: "Note", vi: "Ghi chú" },
  "reports.search": {
    en: "Search target or reporter",
    vi: "Tìm theo đối tượng hoặc người báo cáo",
  },

  "reportDetail.title": { en: "Report {id}", vi: "Báo cáo {id}" },
  "reportDetail.subtitle": {
    en: "{type} · reported by {reporter}",
    vi: "{type} · báo cáo bởi {reporter}",
  },
  "reportDetail.notFound": { en: "Report not found.", vi: "Không tìm thấy báo cáo." },
  "reportDetail.backToReports": { en: "Back to reports", vi: "Về danh sách báo cáo" },
  "reportDetail.cardReport": { en: "Report", vi: "Báo cáo" },
  "reportDetail.cardStory": { en: "Reported story", vi: "Truyện bị báo cáo" },
  "reportDetail.cardResolve": { en: "Resolve", vi: "Xử lý" },
  "reportDetail.reportedAt": { en: "Reported at", vi: "Báo cáo lúc" },
  "reportDetail.reporterNote": { en: "Reporter note", vi: "Ghi chú của người báo cáo" },
  "reportDetail.actionTaken": { en: "Action taken", vi: "Hành động đã thực hiện" },
  "reportDetail.closed": {
    en: "This report is {status}.",
    vi: "Báo cáo này đã ở trạng thái: {status}.",
  },
  "reportDetail.pickUp": {
    en: "Pick up (start reviewing)",
    vi: "Nhận xử lý (bắt đầu xem xét)",
  },
  "reportDetail.moderationAction": { en: "Moderation action", vi: "Hành động kiểm duyệt" },
  "reportDetail.chooseAction": { en: "Choose an action", vi: "Chọn hành động" },
  "reportDetail.resolutionNote": { en: "Resolution note", vi: "Ghi chú xử lý" },
  "reportDetail.notePlaceholder": {
    en: "Explain the decision — kept in the audit history.",
    vi: "Giải thích quyết định, được lưu trong lịch sử kiểm duyệt.",
  },
  "reportDetail.dismiss": { en: "Dismiss report", vi: "Bỏ qua báo cáo" },
  "reportDetail.apply": { en: "Apply & resolve", vi: "Áp dụng và xử lý" },
  "reportDetail.pickedUp": {
    en: "Report moved to Reviewing",
    vi: "Báo cáo đã chuyển sang Đang xem xét",
  },
  "reportDetail.dismissed": { en: "Report dismissed", vi: "Đã bỏ qua báo cáo" },
  "reportDetail.resolved": { en: "Report resolved", vi: "Đã xử lý báo cáo" },

  "comments.subtitle": {
    en: "Hide or show violating comments across the whole platform",
    vi: "Ẩn / hiện bình luận vi phạm toàn nền tảng",
  },
  "comments.colContent": { en: "Content", vi: "Nội dung" },
  "comments.colTime": { en: "Time", vi: "Thời gian" },
  "comments.reply": { en: "↳ reply", vi: "↳ trả lời" },
  "comments.chapter": { en: "Chapter: {id}", vi: "Chương: {id}" },
  "comments.searchText": { en: "Search comment text", vi: "Tìm nội dung bình luận" },
  "comments.filterChapter": {
    en: "Filter by Chapter ID (optional)",
    vi: "Lọc theo Chapter ID (tuỳ chọn)",
  },
  "comments.search": { en: "Search", vi: "Tìm" },
  "comments.loadFailed": { en: "Could not load comments", vi: "Không tải được bình luận" },
  "comments.total": { en: "{count} comments", vi: "{count} bình luận" },
  "comments.hideTitle": { en: "Hide comment", vi: "Ẩn bình luận" },
  "comments.showTitle": { en: "Show comment again", vi: "Hiện lại bình luận" },
  "comments.reasonLabel": {
    en: "Reason (saved to the moderation log)",
    vi: "Lý do (lưu vào nhật ký kiểm duyệt)",
  },
  "comments.hidden": { en: "Comment hidden", vi: "Đã ẩn bình luận" },
  "comments.shown": { en: "Comment shown again", vi: "Đã hiện lại bình luận" },
});
