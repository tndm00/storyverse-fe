import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { BACKEND_SERVICES } from "./src/services/api/config";

// Same-origin dev proxy: browser calls /api/<service>/v1/... and Vite forwards
// to that service's port (HTTPS, self-signed -> secure:false). This is what
// lets the frontend reach the backend while it has no CORS config.
const proxy = Object.fromEntries(
  Object.values(BACKEND_SERVICES).map((svc) => [
    svc.devProxyPrefix,
    {
      target: svc.upstream,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(new RegExp(`^${svc.devProxyPrefix}`), ""),
    },
  ]),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // "@/..." -> "src/..." so cross-area imports never need ../../ chains.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // The antd vendor chunk is ~1 MB minified by design — it is isolated here so
    // it is fetched once and long-cached, not re-downloaded on every deploy.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Keep the big, rarely-changing libraries in their own long-cache chunks.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          antd: ["antd", "@ant-design/icons"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy,
  },
});
