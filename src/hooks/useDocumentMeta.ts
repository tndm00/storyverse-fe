import { useEffect } from "react";

const SITE_NAME = "Truyện ma Canh Ba";
const DEFAULT_DESCRIPTION =
  "Truyện ma Canh Ba — nơi đọc và góp truyện ma, chuyện tâm linh có thật hoặc tự sáng tác bằng tiếng Việt.";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Sets the browser tab title and description/OG meta tags for the current
 * page. Client-side only — helps Google (which renders JS) and real browser
 * tabs/bookmarks/history, but not link-preview bots that don't execute JS
 * (Facebook/Zalo previews still show the static index.html tags).
 */
export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    setMeta("description", desc);
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description]);
}
