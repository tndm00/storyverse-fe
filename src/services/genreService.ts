// Genre taxonomy admin facade — Content service /v1/genres.
// Genres live in the database (content.genres); the dev GenreSeeder only
// bootstraps a starter set. Create / edit / hide require the genres.manage
// permission (PlatformAdmin).

import { contentApi } from "./api/contentApi";

export interface Genre {
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface GenreInput {
  name: string;
  description: string;
  displayOrder: number;
}

// Every genre incl. hidden, ordered by displayOrder then name.
export async function listAll(): Promise<Genre[]> {
  const rows = await contentApi.client.get<Genre[]>("/v1/genres", {
    params: { "include-inactive": true },
  });
  return rows ?? [];
}

export async function create(input: GenreInput): Promise<Genre> {
  return contentApi.client.post<Genre>("/v1/genres", {
    name: input.name.trim(),
    description: input.description.trim() || null,
    displayOrder: input.displayOrder,
  });
}

export async function update(
  slug: string,
  input: GenreInput & { isActive: boolean },
): Promise<Genre> {
  return contentApi.client.put<Genre>(`/v1/genres/${encodeURIComponent(slug)}`, {
    name: input.name.trim(),
    description: input.description.trim() || null,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
  });
}

// Hide (soft-delete). To un-hide, use `update(slug, { ...fields, isActive: true })`.
export async function hide(slug: string): Promise<Genre> {
  return contentApi.client.post<Genre>(`/v1/genres/${encodeURIComponent(slug)}/hide`);
}
