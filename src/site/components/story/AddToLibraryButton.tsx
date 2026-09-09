import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import {
  addToLibrary,
  getEntryForStory,
  removeFromLibrary,
  setShelf,
  SHELVES,
  type Shelf,
} from "../../libraryService";

export function AddToLibraryButton({ storyId }: { storyId: string }) {
  const { isAuthenticated } = useAuth();
  const { busy, run } = useAsyncRunner();
  const [shelf, setShelfState] = useState<Shelf | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    getEntryForStory(storyId)
      .then((e) => !cancelled && setShelfState(e ? e.shelf : null))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [storyId, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Link to={ROUTES.account} className="cb-btn cb-ghost cb-btn-sm">
        Đăng nhập để lưu
      </Link>
    );
  }
  if (!loaded) return <span className="cb-btn cb-ghost cb-btn-sm">…</span>;

  if (shelf === null) {
    return (
      <button
        type="button"
        className="cb-btn cb-btn-sm"
        disabled={busy}
        onClick={() =>
          run(
            () => addToLibrary(storyId, "Reading"),
            "Đã thêm vào tủ",
            () => setShelfState("Reading"),
          )
        }
      >
        ＋ Thêm vào tủ
      </button>
    );
  }

  return (
    <span className="cb-inline-form" style={{ marginTop: 0 }}>
      <select
        className="cb-input"
        value={shelf}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value as Shelf;
          run(
            () => setShelf(storyId, next),
            "Đã cập nhật tủ",
            () => setShelfState(next),
          );
        }}
      >
        {SHELVES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="cb-btn cb-ghost cb-btn-sm"
        disabled={busy}
        onClick={() =>
          run(
            () => removeFromLibrary(storyId),
            "Đã xoá khỏi tủ",
            () => setShelfState(null),
          )
        }
      >
        Xoá
      </button>
    </span>
  );
}
