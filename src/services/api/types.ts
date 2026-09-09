// Response shapes returned by the backend (after the ResponseDto<T> envelope is
// unwrapped by createApiClient). Keep these aligned with the .NET DTOs.

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: string;
}

export interface CurrentUserResponse {
  userId: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  roles?: string[];
}

export interface RegisterResponse {
  userId: number;
  email: string;
  displayName: string;
}

export interface AuthorProfileResponse {
  authorProfileId: number;
  userId: number;
  penName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
  status: string;
  createdAt: string;
  requiresTokenRefresh?: boolean;
}
