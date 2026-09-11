import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import type { ReaderStory } from "../readerService";

// Grid story card — used on Browse and the author profile. HomePage/Featured keep
// their own layout-specific card variants. Text-only: no cover-image/icon
// area (no story has a real cover, and a placeholder-only block just wasted
// vertical space), so the whole card is the info block.
export function StoryCard({ story }: { story: ReaderStory }) {
  return (
    <Link to={ROUTES.story(story.slug)} className="cb-card cb-grid-item">
      <div className="cb-body">
        <div className="cb-body-head">
          <span className="cb-kicker">{story.kicker}</span>
          {story.ratingLabel ? <span className="cb-rating-badge">{story.ratingLabel}</span> : null}
        </div>
        <h3>{story.title}</h3>
        {story.description ? <p className="cb-excerpt">{story.description}</p> : null}
        <div className="cb-meta">{story.reads}</div>
      </div>
    </Link>
  );
}
