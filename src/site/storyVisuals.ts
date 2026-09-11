// Cover-art placeholder when a story has no coverImageUrl (always true today —
// there is no upload feature). A single giant first-letter read as a broken
// image to users; this replaces it with a genre-themed icon (immediately
// meaningful, matches the "Canh Ba" ghost-story branding) plus a deterministic
// background tint per story so cards don't all look identical.

const GENRE_ICON: Record<string, string> = {
  "Sáng tác": "🖋️",
  "Chuyện có thật": "📖",
  "Nhà hoang": "🏚️",
  "Miền núi": "⛰️",
  "Bệnh viện": "🏥",
  "Sông nước": "🌊",
  "Học đường": "🏫",
  "Làng quê": "🏡",
  "Thành thị": "🌆",
  "Kinh Dị": "👻",
  "Thời chiến": "⚔️",
};
const DEFAULT_ICON = "🕯️";

export function genreIcon(kicker: string | null | undefined): string {
  if (!kicker) return DEFAULT_ICON;
  return GENRE_ICON[kicker] ?? DEFAULT_ICON;
}

const GRADIENT_VARIANTS = 4;

// Stable per-story pick from GRADIENT_VARIANTS, so the same story always
// renders the same tint (no re-shuffling on refetch) but different stories
// visually vary.
export function gradientVariant(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % GRADIENT_VARIANTS;
}
