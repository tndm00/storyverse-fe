// Author roster admin facade — Authentication service /v1/auth/admin/authors.
// Create / edit / suspend require the users.manage permission (PlatformAdmin).
// "Delete" is a soft suspend — stories already published under a profile are
// unaffected; suspending only changes the profile's own lifecycle status.

import { authenticationApi } from "./api/authenticationApi";

export interface AuthorProfile {
  authorProfileId: number;
  userId: number;
  email: string;
  displayName: string;
  penName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
  status: "Active" | "Suspended";
  createdAt: string;
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export interface AuthorListParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuthors(p: AuthorListParams = {}): Promise<Paged<AuthorProfile>> {
  const page = p.page ?? 1;
  const pageSize = p.pageSize ?? DEFAULT_PAGE_SIZE;
  const paged = await authenticationApi.listAuthorProfilesAdmin({
    keyword: p.keyword,
    page,
    pageSize,
  }) as PagedDto<AuthorProfile>;
  return {
    items: paged.items,
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

export interface CreateAuthorInput {
  email: string;
  password: string;
  displayName: string;
  penName: string;
  bio?: string;
}

export function create(input: CreateAuthorInput): Promise<AuthorProfile> {
  return authenticationApi.createAuthorProfileAdmin({
    email: input.email.trim(),
    password: input.password,
    displayName: input.displayName.trim(),
    penName: input.penName.trim(),
    bio: input.bio?.trim() || undefined,
  }) as Promise<AuthorProfile>;
}

export interface UpdateAuthorInput {
  penName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  verified: boolean;
}

export function update(authorProfileId: number, input: UpdateAuthorInput): Promise<AuthorProfile> {
  return authenticationApi.updateAuthorProfileAdmin(authorProfileId, {
    penName: input.penName.trim(),
    bio: input.bio?.trim() || undefined,
    avatarUrl: input.avatarUrl?.trim() || undefined,
    bannerUrl: input.bannerUrl?.trim() || undefined,
    verified: input.verified,
  }) as Promise<AuthorProfile>;
}

// Soft-delete (Suspended) / restore (Active). To restore, call with "Active".
export function setStatus(
  authorProfileId: number,
  status: "Active" | "Suspended",
): Promise<AuthorProfile> {
  return authenticationApi.setAuthorProfileStatusAdmin(authorProfileId, status) as Promise<AuthorProfile>;
}
