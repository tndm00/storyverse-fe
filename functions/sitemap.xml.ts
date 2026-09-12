// Cloudflare Pages Function — generates sitemap.xml on every request from the
// live story list. Deployed automatically alongside `dist/` (Pages picks up
// any `functions/` directory at the project root; no wrangler.toml needed).
//
// Talks to the Content service's public Tunnel/nginx hostname directly (not
// through the /api/* gateway Worker) since this runs server-side — no CORS
// concern, and one less hop.

const CONTENT_API = "https://svc-content.truyenmacanh3.com";
const SITE_ORIGIN = "https://truyenmacanh3.com";

interface StorySummary {
  slug: string;
  publishedAt: string | null;
}

interface StoriesPage {
  items: StorySummary[];
  totalPages: number;
}

async function fetchAllStorySlugs(): Promise<StorySummary[]> {
  const pageSize = 100;
  const first = await fetch(
    `${CONTENT_API}/v1/stories?page=1&pageSize=${pageSize}&sort-by=publishedAt&sort-direction=desc`,
  );
  if (!first.ok) return [];
  const firstJson = (await first.json()) as { data: StoriesPage };
  const all = [...firstJson.data.items];
  const totalPages = Math.min(firstJson.data.totalPages, 50); // hard cap, sitemap.xml url-count limits

  const rest = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) =>
      fetch(
        `${CONTENT_API}/v1/stories?page=${i + 2}&pageSize=${pageSize}&sort-by=publishedAt&sort-direction=desc`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { data: StoriesPage } | null) => j?.data.items ?? [])
        .catch(() => []),
    ),
  );
  for (const page of rest) all.push(...page);
  return all;
}

const STATIC_PATHS = [
  "/",
  "/noi-bat",
  "/kham-pha",
  "/theo-chu-de",
  "/cong-dong",
  "/dang-truyen",
];

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const onRequestGet = async () => {
  let stories: StorySummary[] = [];
  try {
    stories = await fetchAllStorySlugs();
  } catch {
    stories = [];
  }

  const urls: string[] = [];
  for (const path of STATIC_PATHS) {
    urls.push(`  <url><loc>${SITE_ORIGIN}${path}</loc></url>`);
  }
  for (const s of stories) {
    const loc = `${SITE_ORIGIN}/truyen/${encodeURIComponent(s.slug)}`;
    const lastmod = s.publishedAt ? `<lastmod>${s.publishedAt.slice(0, 10)}</lastmod>` : "";
    urls.push(`  <url><loc>${xmlEscape(loc)}</loc>${lastmod}</url>`);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
