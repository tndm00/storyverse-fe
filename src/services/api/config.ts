// One entry per backend microservice in story-be-prj/src/Services/*.
//
// Shared by the browser (client modules) and Node (vite.config.js dev proxy),
// so this file must stay free of browser- or Node-only APIs.
//
// `upstream` ports come from each service's Properties/launchSettings.json
// (the HTTPS profile). There is no API gateway — every service is its own origin.

export interface BackendService {
  label: string;
  devProxyPrefix: string;
  upstream: string;
  envKey: keyof ImportMetaEnv;
  implemented: boolean;
}

export const BACKEND_SERVICES = {
  authentication: {
    label: "Authentication",
    devProxyPrefix: "/api/authentication",
    upstream: "https://localhost:58626",
    envKey: "VITE_AUTHENTICATION_API_URL",
    implemented: true,
  },
  content: {
    label: "Content",
    devProxyPrefix: "/api/content",
    upstream: "https://localhost:52175",
    envKey: "VITE_CONTENT_API_URL",
    implemented: true,
  },
  community: {
    label: "Community",
    devProxyPrefix: "/api/community",
    upstream: "https://localhost:52172",
    envKey: "VITE_COMMUNITY_API_URL",
    implemented: true,
  },
  library: {
    label: "Library",
    devProxyPrefix: "/api/library",
    upstream: "https://localhost:52173",
    envKey: "VITE_LIBRARY_API_URL",
    implemented: true,
  },
  moderation: {
    label: "Moderation",
    devProxyPrefix: "/api/moderation",
    upstream: "https://localhost:52174",
    envKey: "VITE_MODERATION_API_URL",
    implemented: true,
  },
  notification: {
    label: "Notification",
    devProxyPrefix: "/api/notification",
    upstream: "https://localhost:52176",
    envKey: "VITE_NOTIFICATION_API_URL",
    implemented: true,
  },
} satisfies Record<string, BackendService>;

export type ServiceKey = keyof typeof BACKEND_SERVICES;

// Base URL the browser client should use for a service.
//   - If VITE_<SERVICE>_API_URL is set, use it verbatim (prod / custom setups).
//   - Otherwise use the same-origin dev proxy prefix; Vite forwards it to the
//     upstream, which also sidesteps the missing CORS config on the backend.
export function resolveBaseUrl(key: ServiceKey, env: ImportMetaEnv = import.meta.env): string {
  const svc = BACKEND_SERVICES[key];
  const override = env[svc.envKey];
  return override ? String(override).replace(/\/$/, "") : svc.devProxyPrefix;
}
