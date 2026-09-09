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
};
