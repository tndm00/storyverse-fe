import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { useMockQuery } from "@/hooks/useMockQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import {
  addComment,
  deleteComment,
  editComment,
  listChapterComments,
  replyToComment,
  type CommentNode,
} from "../../communityService";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

function CommentItem({
  node,
  currentUserId,
  onChanged,
}: {
  node: CommentNode;
  currentUserId: number | null;
  onChanged: () => void;
}) {
  const { busy, run } = useAsyncRunner();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editDraft, setEditDraft] = useState(node.content);

  const deleted = node.status === "Deleted";
  const hidden = node.status === "Hidden";

  return (
    <li className="cb-comment">
      <div className="cb-comment-head">
        <span className="cb-comment-author">{node.authorLabel}</span>
        <span className="cb-comment-time">{timeAgo(node.createdAt)}</span>
      </div>
      {editing ? (
        <>
          <textarea
            className="cb-input"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            style={{ minHeight: 60 }}
          />
          <div className="cb-cta-actions">
            <button
              className="cb-btn cb-ghost cb-btn-sm"
              type="button"
              onClick={() => setEditing(false)}
            >
              Huỷ
            </button>
            <button
              className="cb-btn cb-btn-sm"
              type="button"
              disabled={busy || !editDraft.trim()}
              onClick={() =>
                run(
                  () => editComment(node.id, editDraft),
                  "Đã sửa",
                  () => {
                    setEditing(false);
                    onChanged();
                  },
                )
              }
            >
              Lưu
            </button>
          </div>
        </>
      ) : (
        <p className="cb-comment-body">
          {deleted ? <em>[đã xoá]</em> : hidden ? <em>[đã ẩn bởi kiểm duyệt]</em> : node.content}
        </p>
      )}

      {!editing && !deleted ? (
        <div className="cb-comment-actions">
          {currentUserId != null ? (
            <button type="button" onClick={() => setReplying((v) => !v)}>
              Trả lời
            </button>
          ) : null}
          {node.mine ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditDraft(node.content);
                  setEditing(true);
                }}
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteComment(node.id), "Đã xoá", onChanged)}
              >
                Xoá
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {replying ? (
        <div className="cb-reply-box">
          <textarea
            className="cb-input"
            placeholder="Viết trả lời…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ minHeight: 56 }}
          />
          <button
            className="cb-btn cb-btn-sm"
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() =>
              run(
                () => replyToComment(node.id, draft, node.authorUserId, currentUserId),
                "Đã gửi trả lời",
                () => {
                  setDraft("");
                  setReplying(false);
                  onChanged();
                },
              )
            }
          >
            Gửi
          </button>
        </div>
      ) : null}

      {node.replies.length > 0 ? (
        <ul className="cb-comment-replies">
          {node.replies.map((r) => (
            <CommentItem key={r.id} node={r} currentUserId={currentUserId} onChanged={onChanged} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ChapterComments({ chapterId }: { chapterId: string }) {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const { busy, run } = useAsyncRunner();
  const [draft, setDraft] = useState("");

  const { data, loading, refetch } = useMockQuery(
    () =>
      listChapterComments(chapterId, currentUserId, {
        pageSize: 50,
        currentUserName: user?.displayName,
      }),
    [chapterId, currentUserId],
  );

  return (
    <section className="cb-comments">
      <div className="cb-section-head">
        <h2>Bình luận {data ? `(${data.totalCount})` : ""}</h2>
      </div>

      {isAuthenticated ? (
        <div className="cb-comment-form">
          <textarea
            className="cb-input"
            placeholder="Chia sẻ cảm nghĩ của bạn về chương này…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ minHeight: 72 }}
          />
          <button
            type="button"
            className="cb-btn cb-btn-sm"
            disabled={busy || !draft.trim()}
            onClick={() =>
              run(
                () => addComment(chapterId, draft),
                "Đã đăng bình luận",
                () => {
                  setDraft("");
                  refetch();
                },
              )
            }
          >
            Đăng bình luận
          </button>
        </div>
      ) : (
        <p className="cb-page-intro">
          <Link to={ROUTES.account}>Đăng nhập</Link> để bình luận.
        </p>
      )}

      {loading ? (
        <p className="cb-page-intro">Đang tải bình luận…</p>
      ) : !data || data.roots.length === 0 ? (
        <p className="cb-page-intro">Chưa có bình luận nào.</p>
      ) : (
        <ul className="cb-comment-list">
          {data.roots.map((n) => (
            <CommentItem key={n.id} node={n} currentUserId={currentUserId} onChanged={refetch} />
          ))}
        </ul>
      )}
    </section>
  );
}
