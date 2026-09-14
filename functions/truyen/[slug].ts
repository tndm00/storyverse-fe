// Cloudflare Pages Function — serves a minimal server-rendered HTML page with
// per-story Open Graph tags to link-preview bots (Facebook, Zalo, ...), which
// don't execute JavaScript and would otherwise all see the same generic
// site-wide tags from index.html (see src/hooks/useDocumentMeta.ts, which only
// sets these client-side). Real browsers are untouched — they fall through to
// context.next() and get the normal SPA.
//
// Talks to the Content service's public hostname directly (not through the
// /api/* gateway Worker) since this runs server-side — no CORS concern, and
// one less hop. Same pattern as functions/sitemap.xml.ts.

const CONTENT_API = "https://svc-content.truyenmacanh3.com";
const SITE_ORIGIN = "https://truyenmacanh3.com";
const SITE_NAME = "Truyện ma Canh Ba";
const DEFAULT_DESCRIPTION =
  "Truyện ma Canh Ba — nơi đọc và góp truyện ma, chuyện tâm linh có thật hoặc tự sáng tác bằng tiếng Việt.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;

const BOT_USER_AGENTS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "zalo",
  "whatsapp",
  "telegrambot",
];

interface StoryDetail {
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
}

function isPreviewBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot));
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPreviewHtml(story: StoryDetail): string {
  const title = `${story.title} — ${SITE_NAME}`;
  const description = story.description?.trim() || DEFAULT_DESCRIPTION;
  const url = `${SITE_ORIGIN}/truyen/${encodeURIComponent(story.slug)}`;
  // Only the default fallback has known, fixed dimensions — a real per-story
  // cover's actual size is unknown, so don't assert width/height for it.
  const imageUrl = story.coverImageUrl || DEFAULT_IMAGE;
  const imageDims = story.coverImageUrl
    ? ""
    : `<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />`;
  const image = `<meta property="og:image" content="${htmlEscape(imageUrl)}" />
${imageDims}`;

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>${htmlEscape(title)}</title>
<meta name="description" content="${htmlEscape(description)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${htmlEscape(title)}" />
<meta property="og:description" content="${htmlEscape(description)}" />
<meta property="og:url" content="${url}" />
${image}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${htmlEscape(title)}" />
<meta name="twitter:description" content="${htmlEscape(description)}" />
</head>
<body></body>
</html>`;
}

export const onRequestGet = async (context: { request: Request; params: Record<string, string>; next: () => Promise<Response> }) => {
  const userAgent = context.request.headers.get("user-agent");
  if (!isPreviewBot(userAgent)) {
    return context.next();
  }

  const slug = context.params.slug;

  try {
    const response = await fetch(`${CONTENT_API}/v1/stories/by-slug/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return context.next();
    }

    const json = (await response.json()) as { data: StoryDetail };
    return new Response(renderPreviewHtml(json.data), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return context.next();
  }
};
