# Backend API layer

One client module per microservice in `story-be-prj/src/Services/*`.
No API gateway exists — each service is its own origin/port.

| Backend service | FE module              | Status              | Dev proxy             | Upstream port (HTTPS) |
| --------------- | ---------------------- | ------------------- | --------------------- | --------------------- |
| Authentications | `authenticationApi.js` | ✅ implemented      | `/api/authentication` | `58626`               |
| Contents        | `contentApi.js`        | ✅ implemented      | `/api/content`        | `52175`               |
| Communities     | `communityApi.js`      | ⛔ backend skeleton | `/api/community`      | `52172`               |
| Libraries       | `libraryApi.js`        | ⛔ backend skeleton | `/api/library`        | `52173`               |
| Moderations     | `moderationApi.js`     | ⛔ backend skeleton | `/api/moderation`     | `52174`               |
| Notifications   | `notificationApi.js`   | ⛔ backend skeleton | `/api/notification`   | `52176`               |

Skeleton services have no controllers or DB yet. Their modules expose the
**planned** routes (from `story-be-prj/rules/product-workflow-context.md`) but
every call rejects with `ApiError { code: "not_implemented" }` until the
`IMPLEMENTED` flag in that module is flipped.

## How the connection works

- `config.ts` — the service table (shared with `vite.config.ts`).
- `client.ts` — `createApiClient(baseUrl)` → `{ get, post, put, del }`: adds the
  Bearer token + `X-Correlation-ID`, unwraps `ResponseDto<T>` to `data`, throws
  `ApiError` on failure.
- Dev: the browser calls same-origin `/api/<service>/v1/...`; the Vite proxy
  (`vite.config.ts`) forwards to the service port. This is also how CORS is
  avoided — the backend has no CORS config.
- Prod / custom: set `VITE_<SERVICE>_API_URL` to an absolute URL.

## Running against the backend

1. Start the backend service(s) + Postgres (`docker compose up -d`, then
   `dotnet run` per service).
2. `npm run dev` — the service facades (`src/services/authService.ts`, etc.)
   always call the real backend through this API layer.

## Usage

```js
import { authenticationApi, contentApi } from "./services/api";

const tokens = await authenticationApi.login(email, password);
const page = await contentApi.listStories({ "page-number": 1, "page-size": 20 });
```
