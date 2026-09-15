// story-be-prj/src/Services/Authentications  (Authentication.Api)
// Status: IMPLEMENTED. Routes: Authentication.Api/Controllers/v1/AuthController.cs

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";
import type {
  AuthorProfileResponse,
  CurrentUserResponse,
  LoginResponse,
  RegisterResponse,
} from "./types";

const client = createApiClient(resolveBaseUrl("authentication"));

export const authenticationApi = {
  client,

  register: (body: { email: string; password: string; displayName: string }) =>
    client.post<RegisterResponse>("/v1/auth/register", body),

  login: (email: string, password: string) =>
    client.post<LoginResponse>("/v1/auth/login", { email, password }),

  refresh: (refreshToken: string) =>
    client.post<LoginResponse>("/v1/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) => client.post<void>("/v1/auth/logout", { refreshToken }),

  googleLogin: (idToken: string) => client.post<LoginResponse>("/v1/auth/google", { idToken }),

  me: () => client.get<CurrentUserResponse>("/v1/auth/me"),

  createAuthorProfile: (body: {
    penName: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }) => client.post<AuthorProfileResponse>("/v1/auth/author-profile", body),

  getMyAuthorProfile: () => client.get<AuthorProfileResponse>("/v1/auth/author-profile"),

  // Public author profile by id (anonymous) — reader-site /author/:id page.
  getPublicAuthor: (authorProfileId: string | number) =>
    client.get<{
      authorProfileId: number;
      penName: string;
      bio: string | null;
      avatarUrl: string | null;
      bannerUrl: string | null;
      verified: boolean;
    }>(`/v1/auth/authors/${authorProfileId}`),

  // ---- admin author roster (users.manage, PlatformAdmin) -----------------
  // GET /v1/auth/admin/authors?keyword=&page=&page-size=
  listAuthorProfilesAdmin: (params?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) =>
    client.get("/v1/auth/admin/authors", {
      params: {
        keyword: params?.keyword || undefined,
        page: params?.page,
        "page-size": params?.pageSize,
      },
    }),
  createAuthorProfileAdmin: (body: {
    email: string;
    password: string;
    displayName: string;
    penName: string;
    bio?: string;
  }) => client.post("/v1/auth/admin/authors", body),
  updateAuthorProfileAdmin: (
    authorProfileId: string | number,
    body: { penName: string; bio?: string; avatarUrl?: string; bannerUrl?: string; verified: boolean },
  ) => client.put(`/v1/auth/admin/authors/${authorProfileId}`, body),
  setAuthorProfileStatusAdmin: (authorProfileId: string | number, status: "Active" | "Suspended") =>
    client.put(`/v1/auth/admin/authors/${authorProfileId}/status`, { status }),
};
