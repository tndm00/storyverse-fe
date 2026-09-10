import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import {
  castVote,
  getMyRating,
  getVoteCount,
  listStoryRatings,
  rateStory,
  type MyRating,
  type RatingRow,
} from "../../communityService";

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <span className="cb-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? "is-on" : undefined}
          onClick={onPick ? () => onPick(n) : undefined}
          disabled={!onPick}
          aria-label={`${n} sao`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export function StoryEngagementBar({
  storyId,
  ratingLabel,
}: {
  storyId: string;
  ratingLabel: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const { busy, run } = useAsyncRunner();

  const [mine, setMine] = useState<MyRating | null>(null);
  const [score, setScore] = useState(0);
  const [review, setReview] = useState("");
  const [votes, setVotes] = useState<number | null>(null);
  const [reviews, setReviews] = useState<RatingRow[]>([]);

  const loadReviews = () => {
    listStoryRatings(storyId, currentUserId, { pageSize: 10 })
      .then((r) => setReviews(r.items))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    getVoteCount(storyId)
      .then((v) => !cancelled && setVotes(v.weekVoteCount))
      .catch(() => {});
    listStoryRatings(storyId, currentUserId, { pageSize: 10 })
      .then((r) => !cancelled && setReviews(r.items))
      .catch(() => {});
    if (isAuthenticated) {
      getMyRating(storyId)
        .then((r) => {
          if (cancelled || !r) return;
          setMine(r);
          setScore(r.score);
          setReview(r.reviewText);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [storyId, isAuthenticated, currentUserId]);

  const submitRating = () =>
    run(async () => {
      const r = await rateStory(storyId, score, review);
      setMine(r);
      loadReviews();
    }, "Đã lưu đánh giá");

  const vote = () =>
    run(async () => {
      const r = await castVote(storyId);
      setVotes(r.weekVoteCount);
      if (!r.recorded) throw new Error("Bạn đã bình chọn truyện này trong tuần rồi.");
    }, "Đã ghi nhận bình chọn");

  return (
    <div className="cb-engage">
      <div className="cb-engage-row">
        <div>
          <div className="cb-field-label">Đánh giá</div>
          <div className="cb-detail-meta">{ratingLabel}</div>
        </div>
        <div>
          <div className="cb-field-label">Bình chọn tuần này</div>
          <div className="cb-detail-meta">{votes ?? "—"} lượt</div>
        </div>
        <button
          type="button"
          className="cb-btn cb-ghost cb-btn-sm"
          disabled={!isAuthenticated || busy}
          onClick={vote}
          title={isAuthenticated ? undefined : "Đăng nhập để bình chọn"}
        >
          ♥ Bình chọn
        </button>
      </div>

      {isAuthenticated ? (
        <div className="cb-rate-box">
          <Stars value={score} onPick={setScore} />
          <textarea
            className="cb-input"
            placeholder="Nhận xét của bạn (tuỳ chọn)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            style={{ minHeight: 64, marginTop: 8 }}
          />
          <button
            type="button"
            className="cb-btn cb-btn-sm"
            disabled={busy || score < 1}
            onClick={submitRating}
            style={{ marginTop: 8 }}
          >
            {mine ? "Cập nhật đánh giá" : "Gửi đánh giá"}
          </button>
        </div>
      ) : (
        <p className="cb-page-intro">
          <Link to={ROUTES.account}>Đăng nhập</Link> để đánh giá và bình chọn.
        </p>
      )}

      {reviews.length > 0 ? (
        <ul className="cb-review-list" style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
          {reviews.map((r) => (
            <li key={r.id} style={{ padding: "8px 0", borderTop: "1px solid var(--cb-border,#eee)" }}>
              <div className="cb-detail-meta">
                <strong>{r.authorLabel}</strong>
                <span>·</span>
                <span>{"★".repeat(r.score)}</span>
              </div>
              {r.reviewText ? <p style={{ margin: "4px 0 0" }}>{r.reviewText}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
