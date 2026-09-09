/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTHENTICATION_API_URL?: string;
  readonly VITE_CONTENT_API_URL?: string;
  readonly VITE_COMMUNITY_API_URL?: string;
  readonly VITE_LIBRARY_API_URL?: string;
  readonly VITE_MODERATION_API_URL?: string;
  readonly VITE_NOTIFICATION_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
