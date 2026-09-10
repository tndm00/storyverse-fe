// Shared HTTP client factory for the StoryVerse backend.
//
// Every backend response is a ResponseDto<T>:
//   { success, data, error: { code, message, details }, meta }
// Lists put a PagedResponseDto<T> in `data`:
//   { items, pageNumber, pageSize, totalCount, totalPages }
//
// createApiClient(baseUrl) returns { get, post, put, del } that:
//   - attach `Authorization: Bearer <token>` from localStorage
//   - attach an `X-Correlation-ID` per request (api-guidelines.md §7)
//   - unwrap ResponseDto -> returns `data` directly
//   - throw ApiError on transport failure or `success: false`

import { AUTH_REFRESH_TOKEN_KEY, AUTH_TOKEN_KEY, MESSAGES } from "@/utils/constants";
import { resolveBaseUrl } from "./config";

// Event fired when the access token is rejected (401) and a refresh could not
// recover the session. AuthProvider listens and clears its state.
export const AUTH_EXPIRED_EVENT = "sv:auth-expired";

let refreshInFlight: Promise<boolean> | null = null;

// Single-flight refresh — every concurrent 401 awaits the same call. Uses a bare
// fetch (not an ApiClient) so it can never recurse back through this interceptor.
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${resolveBaseUrl("authentication")}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const env = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        const data = (env?.data ?? env?.Data ?? env) as Record<string, unknown> | null;
        const accessToken = data?.accessToken as string | undefined;
        if (!accessToken) return false;
        localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
        const nextRefresh = data?.refreshToken as string | undefined;
        if (nextRefresh) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, nextRefresh);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function notifyAuthExpired(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

export interface ApiErrorInit {
  code?: string;
  details?: string[];
  status?: number;
}

export class ApiError extends Error {
  code: string;
  details: string[];
  status?: number;

  constructor(message: string, { code = "unknown", details = [], status }: ApiErrorInit = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
}

export interface ApiClient {
  baseUrl: string;
  request: <T>(path: string, opts?: RequestOptions) => Promise<T>;
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) => Promise<T>;
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => Promise<T>;
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => Promise<T>;
  del: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) => Promise<T>;
}

function correlationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Params are passed through as-is. Callers supply backend-style kebab-case keys
// (page-number, page-size, sort-by, sort-direction, status, ...).
function toQuery(params?: QueryParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

const cap = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

// ResponseDto<T> keys can arrive camelCase (MVC) or PascalCase (some error
// paths) — read either.
function readKey(obj: unknown, key: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  return record[key] ?? record[cap(key)];
}

export function createApiClient(baseUrl: string): ApiClient {
  const root = String(baseUrl).replace(/\/$/, "");

  async function doRequest<T>(
    path: string,
    opts: RequestOptions,
    allowRefresh: boolean,
  ): Promise<T> {
    const { method = "GET", body, params, signal } = opts;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    let res: Response;
    try {
      res = await fetch(`${root}${path}${toQuery(params)}`, {
        method,
        headers: {
          Accept: "application/json",
          "X-Correlation-ID": correlationId(),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw new ApiError(MESSAGES.api.unreachable(root), { code: "network_error" });
    }

    // Access token expired — refresh once and retry the original request.
    if (res.status === 401 && allowRefresh && localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return doRequest<T>(path, opts, false);
      notifyAuthExpired();
    }

    const text = await res.text();
    let envelope: unknown = null;
    if (text) {
      try {
        envelope = JSON.parse(text);
      } catch {
        envelope = null;
      }
    }

    const success = readKey(envelope, "success");
    const error = readKey(envelope, "error");

    if (!res.ok || success === false) {
      throw new ApiError(
        (readKey(error, "message") as string) || MESSAGES.api.requestFailed(res.status),
        {
          code: (readKey(error, "code") as string) || `http_${res.status}`,
          details: (readKey(error, "details") as string[]) || [],
          status: res.status,
        },
      );
    }

    if (
      envelope &&
      typeof envelope === "object" &&
      (success !== undefined || "data" in envelope || "Data" in envelope)
    ) {
      return readKey(envelope, "data") as T;
    }
    return envelope as T;
  }

  const request = <T,>(path: string, opts: RequestOptions = {}): Promise<T> =>
    doRequest<T>(path, opts, true);

  return {
    baseUrl: root,
    request,
    get: (path, opts) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
    put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
    del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  };
}

// Wraps a service method so it fails fast with a clear message while that
// backend service has no controllers yet.
export function notImplemented(serviceLabel: string, ref: string) {
  return (): Promise<never> =>
    Promise.reject(
      new ApiError(`${serviceLabel} service is not implemented on the backend yet (${ref}).`, {
        code: "not_implemented",
      }),
    );
}
