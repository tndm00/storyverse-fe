import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import type { ReaderStory } from "../readerService";

// Grid story card — used on Browse and the author profile. HomePage/Featured keep
// their own layout-specific card variants.
export function StoryCard({ story }: { story: ReaderStory }) {
  return (
    <Link to={ROUTES.story(story.slug)} className="cb-card cb-grid-item">
      <div className="cb-media">
        {story.ratingLabel ? <span className="cb-readchip">{story.ratingLabel}</span> : null}
        <span className="cb-dropcap" aria-hidden="true">
          {story.letter}
        </span>
      </div>
      <div className="cb-body">
        <div className="cb-kicker">{story.kicker}</div>
        <h3>{story.title}</h3>
        {story.description ? <p className="cb-excerpt">{story.description}</p> : null}
        <div className="cb-meta">{story.reads}</div>
      </div>
    </Link>
  );
}
