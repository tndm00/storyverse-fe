import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import type { ReaderStory } from "../readerService";

// Single <li> row for a story — the site no longer uses cards anywhere
// (Browse, Featured, author profile all render a <ul className="cb-trend">
// of these, same list pattern as HomePage's "Truyen ma hot"/"moi" and the
// Community page).
export function StoryListRow({ story }: { story: ReaderStory }) {
  return (
    <li>
      <Link to={ROUTES.story(story.slug)} className="cb-trend-left">
        <span className="cb-trend-kicker">{story.kicker}</span>
        <span className="cb-trend-title">{story.title}</span>
      </Link>
      <span className="cb-trend-views">
        {story.reads}
        {story.ratingLabel ? ` · ${story.ratingLabel}` : ""}
      </span>
    </li>
  );
}
