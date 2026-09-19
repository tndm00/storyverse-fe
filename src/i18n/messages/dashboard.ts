import { defineMessages } from "../defineMessages";

export const dashboard = defineMessages({
  "dashboard.subtitle": {
    en: "Overview of the review and moderation workload",
    vi: "Tổng quan khối lượng duyệt và kiểm duyệt",
  },
  "dashboard.pendingReview": { en: "Pending review", vi: "Chờ duyệt" },
  "dashboard.inReview": { en: "In review", vi: "Đang duyệt" },
  "dashboard.reportsPending": { en: "Reports pending", vi: "Báo cáo chờ xử lý" },
  "dashboard.totalStories": { en: "Total stories", vi: "Tổng số truyện" },
  "dashboard.recentSubmissions": { en: "Recent submissions", vi: "Bài gửi duyệt gần đây" },
  "dashboard.latestReports": { en: "Latest reports", vi: "Báo cáo mới nhất" },

  // Admin-only view statistics cards (the reader-site popup keeps its own fixed Vietnamese text).
  "viewStats.total": { en: "Total views", vi: "Tổng lượt xem" },
  "viewStats.yesterday": { en: "Yesterday", vi: "Hôm qua" },
  "viewStats.today": { en: "Today", vi: "Hôm nay" },
  "viewStats.topToday": { en: "Top stories today", vi: "Top truyện hôm nay" },
  "viewStats.noTopToday": { en: "No views yet today.", vi: "Chưa có lượt xem nào hôm nay." },
  "viewStats.loadFailed": {
    en: "Could not load view statistics.",
    vi: "Không tải được thống kê lượt xem.",
  },
  "viewStats.trackingSince": {
    en: "Daily figures have been recorded since {date}; earlier days were never stored and show 0.",
    vi: "Số liệu theo ngày được ghi từ {date}; các ngày trước đó chưa từng được lưu nên hiển thị 0.",
  },
});
