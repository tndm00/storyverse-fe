import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { authenticationApi } from "@/services/api/authenticationApi";
import { useMockQuery } from "@/hooks/useMockQuery";
import { browseStories } from "../readerService";
import { StoryCard } from "../components/StoryCard";
import { NotFoundPage } from "@/components/NotFoundPage";

interface PublicAuthor {
  authorProfileId: number;
  penName: string;
  bio: string | null;
  verified: boolean;
}

export function AuthorProfilePage() {
  const { id = "" } = useParams();
  const [author, setAuthor] = useState<PublicAuthor | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    authenticationApi
      .getPublicAuthor(id)
      .then((a) => {
        if (cancelled) return;
        setAuthor(a);
        setState("ok");
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { data: stories } = useMockQuery(
    () => browseStories({ authorProfileId: id, pageSize: 24 }),
    [id],
  );

  if (state === "loading") return <p className="cb-page-intro">Đang tải…</p>;
  if (state === "missing" || !author) return <NotFoundPage />;

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>
            {author.penName}
            {author.verified ? (
              <span className="cb-chip" style={{ marginLeft: 8 }}>
                Đã xác minh
              </span>
            ) : null}
          </h1>
          {author.bio ? <p className="cb-page-intro">{author.bio}</p> : null}
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Truyện đã đăng</h2>
        </div>
        {!stories || stories.items.length === 0 ? (
          <p className="cb-page-intro">Tác giả chưa có truyện công khai nào.</p>
        ) : (
          <div className="cb-featured-grid">
            {stories.items.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
