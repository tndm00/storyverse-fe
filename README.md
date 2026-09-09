# StoryVerse Web (story-fe-prj)

Two areas in one **React 18 + TypeScript + Vite + Ant Design 5** app:

- **Reader site** (`/`) — public pages readers use: home, browse, story, chapter reader, library, author. _Currently scaffolds only._
- **Admin console** (`/admin`) — content review & moderation, behind a login gate. _Built._

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build
npm run typecheck      # tsc -b
npm run lint           # ESLint 9 (typescript-eslint + react + hooks + jsx-a11y)
npm run format         # Prettier --write
```

Demo login (admin console): `admin@storyverse.local` / `admin123`

Tooling: TypeScript (strict) · ESLint 9 flat config · Prettier · EditorConfig ·
route-level code splitting (`React.lazy`) · top-level `ErrorBoundary` ·
`react` / `antd` in their own vendor chunks.

## Data source

Default is **mock** (`src/services/mock/`) — fully runnable, no backend, state
resets on reload. Switch with `.env.local` → `VITE_DATA_SOURCE=api`.

`src/services/api/` holds one client module per backend microservice (see its
README). Authentications + Contents are implemented; Communities, Libraries,
Moderations, Notifications are backend skeletons and their calls reject with
`ApiError { code: "not_implemented" }` until the backend ships them.

Still missing on the backend for a full switch: a pre-publication review
workflow, the Moderations service, an admin role/claim, and CORS (the Vite dev
proxy covers CORS in dev only).

## Structure

Imports use the `@/` alias for `src/` (`vite.config.ts` + `tsconfig.app.json`).

| Path                       | Purpose                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/App.tsx`              | Composes `siteRoutes` + `/login` + `adminRoutes` via `useRoutes`, inside `ErrorBoundary` + `Suspense` |
| `src/site/`                | **Reader site** — `layouts/SiteLayout`, `pages/*`, `components/ScaffoldNotice`, `siteRoutes.tsx`      |
| `src/admin/`               | **Admin console** — `layouts/AdminLayout`, `pages/*`, `components/*`, `adminRoutes.tsx`               |
| `src/auth/`                | `LoginPage`, `RequireAuth` (redirects to `/login`; admin roles only)                                  |
| `src/components/`          | Shared: `StatusTag`, `StoryDetailContent`, `NotFoundPage`, `ErrorBoundary`, `PageLoader`              |
| `src/context/`             | `AuthContext.ts` (typed context) + `AuthProvider.tsx`; consume via `@/hooks/useAuth`                  |
| `src/hooks/`               | `useAuth`, `useMockQuery<T>`, `useAsyncRunner`                                                        |
| `src/services/api/`        | One client per backend service + `client.ts` / `config.ts` / `types.ts`                               |
| `src/services/*Service.ts` | Facades pages call; branch on `useRealApi`                                                            |
| `src/services/mock/`       | Seed data + latency helpers                                                                           |
| `src/types/domain.ts`      | `Story`, `Chapter`, `ReviewItem`, `Report`, `Paged<T>`, …                                             |
| `src/utils/constants.ts`   | Domain enums (+ union types), tag colors, `ROUTES`, `LABELS`, `MESSAGES`                              |

Routes: reader site at `/`, `/browse`, `/story/:slug`, `/story/:slug/chapter/:order`,
`/library`, `/author/:id`; admin at `/admin`, `/admin/review`, `/admin/reports`,
`/admin/stories` (+ `/:id` detail).
