import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { isPlatformAdmin } from "@/services/authService";
import * as storyService from "@/services/storyService";
import { VIEW_STATS_LABELS } from "@/utils/constants";
import { formatIsoDateVi, formatNumber } from "@/utils/format";

// Kept in memory on purpose (not in sessionStorage): the popup comes back on every page load or
// refresh, but is not re-opened each time the admin navigates back to the homepage within the
// same load.
let shownThisPageLoad = false;

// Admin-only popup on the homepage: total / yesterday / today views. Only a PlatformAdmin
// ever mounts the inner dialog, so nobody else triggers the admin-only API request.
export function AdminViewStatsPopup() {
  const { booting, isAuthenticated, user } = useAuth();

  // user is null while the session boots; wait for it before deciding.
  if (booting || !isAuthenticated || !isPlatformAdmin(user?.roles)) return null;

  return <ViewStatsDialog />;
}

function ViewStatsDialog() {
  // Read in the initializer (not an effect) so React StrictMode's double mount in dev
  // cannot flip the decision between the two passes.
  const [open, setOpen] = useState(() => !shownThisPageLoad);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Mark it as soon as it is shown, so leaving without closing it does not bring it back on
    // the next in-app navigation to the homepage (a refresh resets this and shows it again).
    shownThisPageLoad = true;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    // The backdrop is a click target for mouse/touch only; keyboard users close the popup with
    // Escape (handled above) or the Close button, hence role="presentation".
    <div
      className="cb-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        // Only a click on the backdrop itself closes it, not one that bubbled up from the card.
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        className="cb-form-card cb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cb-views-title"
      >
        <h2 id="cb-views-title">{VIEW_STATS_LABELS.popupTitle}</h2>
        <ViewStatsBody />
        <div className="cb-modal-actions">
          <button type="button" className="cb-btn cb-ghost" ref={closeRef} onClick={() => setOpen(false)}>
            {VIEW_STATS_LABELS.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewStatsBody() {
  const { data, loading, error } = useAsyncQuery(() => storyService.getViewStats(), []);

  if (loading) return <p className="cb-page-intro">{VIEW_STATS_LABELS.loading}</p>;
  if (error || !data) return <p className="cb-page-intro">{VIEW_STATS_LABELS.loadFailed}</p>;

  const items = [
    { label: VIEW_STATS_LABELS.total, value: data.totalViews },
    { label: VIEW_STATS_LABELS.yesterday, value: data.yesterdayViews },
    { label: VIEW_STATS_LABELS.today, value: data.todayViews },
  ];

  return (
    <>
      <div className="cb-views-grid">
        {items.map((item) => (
          <div className="cb-views-item" key={item.label}>
            <span className="cb-views-label">{item.label}</span>
            {/* null = daily figure unavailable: "—" rather than a misleading 0 */}
            <strong className="cb-views-value">{formatNumber(item.value)}</strong>
          </div>
        ))}
      </div>
      {data.todayViews == null ? (
        <p className="cb-views-note">{VIEW_STATS_LABELS.dailyUnavailable}</p>
      ) : data.trackingSince ? (
        <p className="cb-views-note">
          {VIEW_STATS_LABELS.trackingSince(formatIsoDateVi(data.trackingSince))}
        </p>
      ) : null}
    </>
  );
}
