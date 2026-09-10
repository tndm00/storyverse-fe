import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUnreadCount,
  listMyNotifications,
  markAllRead,
  markRead,
  resolveNotificationRoute,
  type AppNotification,
} from "@/services/notificationService";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`;
  return `${Math.floor(s / 86400)} ngày`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 8;

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60_000);
    return () => clearInterval(t);
  }, [refreshCount]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setPage(1);
      listMyNotifications({ pageNumber: 1, pageSize: PAGE_SIZE })
        .then((p) => {
          setItems(p.items);
          setTotalPages(p.totalPages);
        })
        .catch(() => {});
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    listMyNotifications({ pageNumber: nextPage, pageSize: PAGE_SIZE })
      .then((p) => {
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...p.items.filter((x) => !seen.has(x.id))];
        });
        setPage(nextPage);
        setTotalPages(p.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const onRowClick = (n: AppNotification) => {
    const markThenClose = n.isRead
      ? Promise.resolve()
      : markRead(n.id)
          .then(() => {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
            setCount((c) => Math.max(0, c - 1));
          })
          .catch(() => {});

    markThenClose.then(() => {
      resolveNotificationRoute({ type: n.type, refType: n.refType, refId: n.refId })
        .then((path) => {
          if (path) {
            setOpen(false);
            navigate(path);
          }
        })
        .catch(() => {});
    });
  };

  const onMarkAll = () => {
    markAllRead()
      .then(() => {
        setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
        setCount(0);
      })
      .catch(() => {});
  };

  return (
    <div className="cb-account">
      <button
        type="button"
        className="cb-icon-btn"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 ? <span className="cb-notif-dot">{count > 9 ? "9+" : count}</span> : null}
      </button>
      {open ? (
        <div className="cb-notif-menu" role="menu">
          {items.length === 0 ? (
            <p className="cb-notif-empty">Chưa có thông báo.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`cb-notif-row${n.isRead ? "" : " is-unread"}`}
                onClick={() => onRowClick(n)}
              >
                <span className="cb-notif-title">{n.title}</span>
                <span className="cb-notif-body">{n.body}</span>
                <span className="cb-notif-time">{timeAgo(n.createdAt)}</span>
              </button>
            ))
          )}
          {page < totalPages ? (
            <button
              type="button"
              className="cb-notif-all"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Đang tải…" : "Xem thêm"}
            </button>
          ) : null}
          {items.some((n) => !n.isRead) ? (
            <button type="button" className="cb-notif-all" onClick={onMarkAll}>
              Đánh dấu tất cả đã đọc
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
