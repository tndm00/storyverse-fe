import { defineMessages } from "../defineMessages";

// Review queue, rejected queue and the review detail page.
export const review = defineMessages({
  "reviewQueue.subtitle": {
    en: "Chapters submitted by authors, awaiting a publish decision",
    vi: "Chương do tác giả gửi, đang chờ quyết định xuất bản",
  },

  "rejected.subtitle": {
    en: "Rejected chapters: send them back to the review queue to handle them again, skipping the author's resubmit step",
    vi: "Chương đã bị từ chối — đưa về hàng đợi duyệt để xử lý lại, bỏ qua bước gửi lại của tác giả",
  },
  "rejected.colChapter": { en: "Chapter title", vi: "Tên chương" },
  "rejected.colReason": { en: "Rejection reason", vi: "Lý do từ chối" },
  "rejected.colRejectedAt": { en: "Rejected at", vi: "Thời gian bị từ chối" },
  "rejected.search": {
    en: "Search by chapter title or author",
    vi: "Tìm theo tên chương hoặc tác giả",
  },

  // Sending a rejected chapter back to the queue (used by both the rejected list and the detail page)
  "reapprove.button": { en: "Send back to review queue", vi: "Đưa về hàng đợi duyệt" },
  "reapprove.ok": { en: "Send back to queue", vi: "Đưa về hàng đợi" },
  "reapprove.confirmTitle": {
    en: "Send this chapter back to the review queue?",
    vi: "Đưa chương này về hàng đợi duyệt?",
  },
  "reapprove.confirmContent": {
    en: "The chapter moves from Rejected back to Pending. You will Approve or Reject it again from the Review queue.",
    vi: "Chương sẽ chuyển từ Bị từ chối về Đang chờ duyệt. Bạn sẽ Duyệt/Từ chối lại từ Hàng đợi duyệt.",
  },
  "reapprove.done": {
    en: "Chapter sent back to the review queue",
    vi: "Đã đưa chương về hàng đợi duyệt",
  },

  "reviewDetail.notFound": { en: "Review item not found.", vi: "Không tìm thấy mục cần duyệt." },
  "reviewDetail.backToQueue": { en: "Back to queue", vi: "Về hàng đợi" },
  "reviewDetail.subtitle": {
    en: "{type} · submitted by {author}",
    vi: "{type} · gửi bởi {author}",
  },
  "reviewDetail.chapterUnavailable": {
    en: "Chapter content unavailable",
    vi: "Không có nội dung chương",
  },
  "reviewDetail.chapterMeta": {
    en: "Order {order} · {words} words",
    vi: "Thứ tự {order} · {words} từ",
  },
  "reviewDetail.cardStory": { en: "Story", vi: "Truyện" },
  "reviewDetail.cardChapter": { en: "Chapter", vi: "Chương" },
  "reviewDetail.cardDecision": { en: "Decision", vi: "Quyết định" },
  "reviewDetail.assignedTo": { en: "Assigned to", vi: "Người phụ trách" },
  "reviewDetail.lastDecisionNote": {
    en: "Last decision note:",
    vi: "Ghi chú quyết định gần nhất:",
  },
  "reviewDetail.startReview": { en: "Start review", vi: "Bắt đầu duyệt" },
  "reviewDetail.approve": { en: "Approve & publish", vi: "Duyệt và xuất bản" },
  "reviewDetail.reject": { en: "Reject", vi: "Từ chối" },
  "reviewDetail.alreadyDone": {
    en: "This item is already {status}.",
    vi: "Mục này hiện ở trạng thái: {status}.",
  },
  "reviewDetail.started": { en: "Review started", vi: "Đã bắt đầu duyệt" },
  "reviewDetail.approved": { en: "Approved & published", vi: "Đã duyệt và xuất bản" },
  "reviewDetail.rejected": { en: "Submission rejected", vi: "Đã từ chối bài gửi" },
  "reviewDetail.rejectTitle": { en: "Reject submission", vi: "Từ chối bài gửi" },
  "reviewDetail.rejectReasonLabel": { en: "Rejection reason", vi: "Lý do từ chối" },
  "reviewDetail.rejectDescription": {
    en: "The author sees this note and can revise and resubmit. It is kept in the review history.",
    vi: "Tác giả sẽ thấy ghi chú này và có thể sửa rồi gửi lại. Ghi chú được lưu trong lịch sử duyệt.",
  },
});
