// Auth facade used by AuthProvider.
//   POST /v1/auth/login + GET /v1/auth/me (Authentication service)
//
// Login is role-agnostic: any account (Reader / Author / Moderator / PlatformAdmin)
// gets a session. The admin console gate lives in RequireAuth + LoginPage via the
// exported `canUseAdminConsole`.

import { authenticationApi } from "./api/authenticationApi";
import type { CurrentUserResponse, LoginResponse } from "./api/types";
import {
  ADMIN_CONSOLE_ROLES,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  BEARER_TOKEN_TYPE,
  MESSAGES,
} from "@/utils/constants";
import type { AdminUser } from "@/types/domain";

export const AUTHOR_ROLE = "Author";

export interface LoginResult {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  user: AdminUser;
}

function persistTokens(tokens: { accessToken: string; refreshToken?: string | null }): void {
  localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken);
}

async function resolveSession(tokens: LoginResponse): Promise<LoginResult> {
  persistTokens(tokens);
  let me: CurrentUserResponse;
  try {
    me = await authenticationApi.me();
  } catch (err) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    throw err;
  }
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? null,
    tokenType: tokens.tokenType || BEARER_TOKEN_TYPE,
    user: {
      id: String(me.userId),
      email: me.email,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
      roles: rolesFrom(me),
    },
  };
}

// GET /v1/auth/me returns the caller's role names (Reader / Author / Moderator /
// PlatformAdmin). Fall back to a bare Reader if the field is absent.
function rolesFrom(me: CurrentUserResponse): string[] {
  const roles = Array.isArray(me.roles) ? me.roles : [];
  return roles.length > 0 ? roles : ["Reader"];
}

const normalize = (role: string): string => role.replace(/[_\s-]/g, "").toLowerCase();
const allowedRoleSet = new Set<string>(ADMIN_CONSOLE_ROLES.map(normalize));

// Case/separator-insensitive role check ("PLATFORM_ADMIN" == "PlatformAdmin").
export function hasRole(roles: readonly string[] | undefined, name: string): boolean {
  const target = normalize(name);
  return (roles ?? []).some((role) => normalize(role) === target);
}

// Whether an account may enter /admin. Used by RequireAuth + LoginPage — NOT by
// login/me anymore, so a Reader/Author keeps a normal session on the reader site.
export function canUseAdminConsole(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some((role) => allowedRoleSet.has(normalize(role)));
}

// ---- login --------------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginResult> {
  const tokens = await authenticationApi.login(email, password);
  return resolveSession(tokens);
}

// Sign in with a Google ID token (JWT credential from Google Identity
// Services). The backend validates it and returns the same LoginResponseDto
// shape as a normal email/password login.
export async function loginWithGoogle(idToken: string): Promise<LoginResult> {
  const tokens = await authenticationApi.googleLogin(idToken);
  return resolveSession(tokens);
}

// Register now returns a token pair (Batch 3) — self-authenticate. Falls back to
// an explicit login when an older backend omits the tokens.
export async function registerAndLogin(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<LoginResult> {
  const res = await authenticationApi.register(input);
  if (res.accessToken) {
    return resolveSession(res as LoginResponse);
  }
  return login(input.email, input.password);
}

// Swap the stored refresh token for a fresh access token (picks up new JWT
// claims such as `author_id` after creating an author profile).
export async function refreshSession(): Promise<LoginResult> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error(MESSAGES.auth.reauthNeeded);
  const tokens = await authenticationApi.refresh(refreshToken);
  return resolveSession(tokens);
}

export async function logoutSession(): Promise<void> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (refreshToken) {
    try {
      await authenticationApi.logout(refreshToken);
    } catch {
      /* best-effort — server-side revocation */
    }
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

// ---- resolve current user from a stored token (app boot / refresh) ------
// `token` is unused here (the api client reads it from localStorage) — kept for
// call-site compatibility.

export async function me(_token: string | null): Promise<AdminUser> {
  const meRes = await authenticationApi.me();
  const roles = rolesFrom(meRes);
  return {
    id: String(meRes.userId),
    email: meRes.email,
    displayName: meRes.displayName,
    avatarUrl: meRes.avatarUrl,
    roles,
  };
}
