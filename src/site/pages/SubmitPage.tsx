import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { MESSAGES, ROUTES } from "@/utils/constants";
import { listGenres } from "../readerService";
import {
  buildGenreSelection,
  guestPublish,
  hasAuthorProfile,
  quickPublish,
  rememberStory,
  type AuthorStory,
} from "../authorService";
import { TagInput } from "../components/author/TagInput";

const DEFAULT_GENRE = "sang-tac";

// Static submission guidelines — house rules, not data pulled from the backend.
const SUBMIT_GUIDELINES: string[] = [
  "Câu chuyện do bạn tự viết hoặc được kể lại có xin phép người kể gốc.",
  "Không sao chép nguyên văn từ nguồn khác chưa được cho phép.",
  "Hạn chế mô tả quá mức bạo lực, máu me hoặc nội dung nhạy cảm.",
  "Đội biên tập có thể liên hệ để chỉnh sửa trước khi đăng.",
  "Thời gian phản hồi thường trong vòng 3–5 ngày.",
];

export function SubmitPage() {
  const { isAuthenticated } = useAuth();
  const { busy, run } = useAsyncRunner();

  // Logged-in author (has a profile) → the story is theirs and editable at /tac-gia.
  // Everyone else → anonymous guest publish.
  const [authorPenName, setAuthorPenName] = useState<string | null>(null);
  const isAuthor = authorPenName !== null;

  const [genres, setGenres] = useState<{ name: string; slug: string }[] | null>(null);
  const [published, setPublished] = useState<AuthorStory | null>(null);

  const [title, setTitle] = useState("");
  const [penName, setPenName] = useState("");
  const [genreSlug, setGenreSlug] = useState(DEFAULT_GENRE);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    listGenres()
      .then((rows) => {
        setGenres(rows);
        if (rows.length && !rows.some((g) => g.slug === DEFAULT_GENRE)) setGenreSlug(rows[0].slug);
      })
      .catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthorPenName(null);
      return;
    }
    let cancelled = false;
    hasAuthorProfile()
      .then((p) => {
        if (cancelled) return;
        setAuthorPenName(p?.penName ?? null);
        if (p?.penName) setPenName(p.penName);
      })
      .catch(() => !cancelled && setAuthorPenName(null));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const genresEmpty = genres !== null && genres.length === 0;

  const canSubmit = useMemo(
    () =>
      !busy &&
      !genresEmpty &&
      title.trim().length > 0 &&
      penName.trim().length > 0 &&
      genreSlug.length > 0 &&
      content.trim().length > 0,
    [busy, genresEmpty, title, penName, genreSlug, content],
  );

  const submit = () =>
    run(async () => {
      let story: AuthorStory;
      if (isAuthor) {
        const res = await quickPublish({
          title,
          description,
          genres: buildGenreSelection(genreSlug, []),
          tags,
          chapterContent: content,
        });
        rememberStory(res.story);
        story = res.story;
      } else {
        const res = await guestPublish({
          penName,
          title,
          description,
          genreSlug,
          chapterContent: content,
        });
        story = res.story;
      }
      setPublished(story);
    }, "Đã gửi duyệt");

  const resetForm = () => {
    setPublished(null);
    setTitle("");
    setDescription("");
    setTags([]);
    setContent("");
    if (!isAuthor) setPenName("");
  };

  if (published) {
    return (
      <section className="cb-section">
        <div className="cb-form-card cb-form-card-centered cb-form-success" style={{ maxWidth: 520 }}>
          <div className="cb-check" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m5 13 4 4 10-10" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18 }}>Đã gửi duyệt</h2>
          <p>
            Truyện {published.title} đã được gửi và đang chờ duyệt. Truyện sẽ hiển thị công khai sau
            khi được kiểm duyệt
            {isAuthor
              ? " — theo dõi trạng thái ở trang “Truyện của tôi”."
              : " — vì bạn đăng ẩn danh nên hãy lưu lại tên truyện, chưa có cách quay lại xem trạng thái."}
          </p>
          <div className="cb-cta-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            {published.status !== "Draft" ? (
              <Link to={ROUTES.story(published.slug)} className="cb-btn cb-ghost">
                Xem truyện
              </Link>
            ) : null}
            {isAuthor ? (
              <Link to={ROUTES.authorStory(published.slug)} className="cb-btn cb-ghost">
                Thêm chương / phần
              </Link>
            ) : null}
            <button type="button" className="cb-btn" onClick={resetForm}>
              Đăng truyện khác
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Đăng truyện</h1>
          <p className="cb-page-intro">
            Điền thông tin truyện và đăng ngay — không cần đăng nhập.
            {isAuthor
              ? " Truyện sẽ thuộc tài khoản của bạn và quản lý được ở mục Truyện của tôi."
              : ""}
          </p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-submit-grid">
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Trước khi đăng, lưu ý</h2>
            <ul className="cb-guideline-list">
              {SUBMIT_GUIDELINES.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>

          <div className="cb-form-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) submit();
              }}
            >
              <div className="cb-field">
                <label className="cb-field-label" htmlFor="s-title">
                  Tên truyện *
                </label>
                <input
                  className="cb-input"
                  id="s-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Căn gác trọ số 4"
                  required
                />
              </div>

              <div className="cb-field">
                <label className="cb-field-label" htmlFor="s-pen">
                  Tên tác giả *
                </label>
                <input
                  className="cb-input"
                  id="s-pen"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  placeholder="Bút danh hiển thị cùng truyện"
                  readOnly={isAuthor}
                  required
                />
              </div>

              <div className="cb-field">
                <label className="cb-field-label" htmlFor="s-genre">
                  Thể loại *
                </label>
                {genres === null ? (
                  <select className="cb-input" id="s-genre" disabled>
                    <option>Đang tải…</option>
                  </select>
                ) : genresEmpty ? (
                  <p className="cb-genre-empty">{MESSAGES.auth.genresEmpty}</p>
                ) : (
                  <select
                    className="cb-input"
                    id="s-genre"
                    value={genreSlug}
                    onChange={(e) => setGenreSlug(e.target.value)}
                  >
                    {genres.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isAuthor ? (
                <div className="cb-field">
                  <label className="cb-field-label" htmlFor="s-tags">
                    Thẻ (tuỳ chọn)
                  </label>
                  <div id="s-tags">
                    <TagInput value={tags} onChange={setTags} />
                  </div>
                </div>
              ) : null}

              <div className="cb-field">
                <label className="cb-field-label" htmlFor="s-desc">
                  Mô tả ngắn (tuỳ chọn)
                </label>
                <textarea
                  className="cb-input"
                  id="s-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: 70 }}
                />
              </div>

              <div className="cb-field">
                <label className="cb-field-label" htmlFor="s-content">
                  Nội dung *
                </label>
                <textarea
                  className="cb-input"
                  id="s-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Bắt đầu câu chuyện của bạn ở đây..."
                  style={{ minHeight: 260 }}
                  required
                />
              </div>

              <button className="cb-btn cb-block" type="submit" disabled={!canSubmit}>
                {busy ? "Đang đăng…" : "Đăng truyện"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
