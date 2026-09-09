// Auth facade used by AuthProvider.
//   DATA_SOURCE=mock -> validate against src/services/mock/db.ts
//   DATA_SOURCE=api  -> POST /v1/auth/login + GET /v1/auth/me (Authentication service)
//
// Login is role-agnostic: any account (Reader / Author / Moderator / PlatformAdmin)
// gets a session. The admin console gate lives in RequireAuth + LoginPage via the
// exported `canUseAdminConsole`.

import { users } from "./mock/db";
import { withLatency, failWithLatency } from "./mock/latency";
import { useRealApi } from "./dataSource";
import { authenticationApi } from "./api/authenticationApi";
import type { CurrentUserResponse } from "./api/types";
import {
  ADMIN_CONSOLE_ROLES,
  AUTH_TOKEN_KEY,
  BEARER_TOKEN_TYPE,
  MESSAGES,
} from "@/utils/constants";
import type { AdminUser } from "@/types/domain";

export const AUTHOR_ROLE = "Author";

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  user: AdminUser;
}

interface MockUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
}

function publicUser(u: MockUser): AdminUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    roles: u.roles,
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

async function loginMock(email: string, password: string): Promise<LoginResult> {
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user || user.password !== password) {
    return failWithLatency<LoginResult>(MESSAGES.auth.invalidCredentials);
  }
  return withLatency<LoginResult>({
    accessToken: `mock.${btoa(user.id)}.${Date.now()}`,
    tokenType: BEARER_TOKEN_TYPE,
    user: publicUser(user),
  });
}

async function loginApi(email: string, password: string): Promise<LoginResult> {
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

export function login(email: string, password: string): Promise<LoginResult> {
  return useRealApi ? loginApi(email, password) : loginMock(email, password);
}

// ---- resolve current user from a stored token (app boot / refresh) ------

async function meMock(token: string | null): Promise<AdminUser> {
  const match = /^mock\.([^.]+)\./.exec(token ?? "");
  if (!match) return failWithLatency<AdminUser>(MESSAGES.auth.sessionExpired);
  let userId: string;
  try {
    userId = atob(match[1]);
  } catch {
    return failWithLatency<AdminUser>(MESSAGES.auth.invalidSession);
  }
  const user = users.find((u) => u.id === userId);
  if (!user) return failWithLatency<AdminUser>(MESSAGES.auth.sessionExpired);
  return withLatency<AdminUser>(publicUser(user));
}

async function meApi(): Promise<AdminUser> {
  const me = await authenticationApi.me();
  const roles = rolesFrom(me);
  return {
    id: String(me.userId),
    email: me.email,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl,
    roles,
  };
}

export function me(token: string | null): Promise<AdminUser> {
  return useRealApi ? meApi() : meMock(token);
}
