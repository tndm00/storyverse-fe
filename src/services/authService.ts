// Auth facade used by AuthProvider.
//   POST /v1/auth/login + GET /v1/auth/me (Authentication service)
//
// Login is role-agnostic: any account (Reader / Author / Moderator / PlatformAdmin)
// gets a session. The admin console gate lives in RequireAuth + LoginPage via the
// exported `canUseAdminConsole`.

import { authenticationApi } from "./api/authenticationApi";
import type { CurrentUserResponse } from "./api/types";
import { ADMIN_CONSOLE_ROLES, AUTH_TOKEN_KEY, BEARER_TOKEN_TYPE } from "@/utils/constants";
import type { AdminUser } from "@/types/domain";

export const AUTHOR_ROLE = "Author";

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  user: AdminUser;
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
  // the api client reads the token from localStorage, so persist it before /me.
  localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);

  let me: CurrentUserResponse;
  try {
    me = await authenticationApi.me();
  } catch (err) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    throw err;
  }

  const roles = rolesFrom(me);

  return {
    accessToken: tokens.accessToken,
    tokenType: tokens.tokenType || BEARER_TOKEN_TYPE,
    user: {
      id: String(me.userId),
      email: me.email,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
      roles,
    },
  };
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
