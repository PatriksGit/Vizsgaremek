# RuneEmpire Center — frontend

The website of the RuneEmpire Minecraft network: players register and log in
here with the same name and password they use in the game, and see their
overview (runes, playtime, login streak, rank, punishments, friends, their 3D
skin and who is on the Discord). It is a single-page app that talks only to the
Laravel REST API in `../backend`.

## Stack

- Vite 8, React 19, TypeScript (the build and type check run TypeScript 7 as `typescript-native`)
- Tailwind CSS 4, shadcn components on Base UI (`src/components/ui`)
- TanStack Query for server data, React Router for pages
- React Hook Form + Zod for forms, axios for HTTP
- Recharts (the weekly playtime chart), skinview3d (the 3D skin, loaded lazily)
- Vitest + Testing Library (jsdom) for tests

## Running it

```sh
npm ci
npm run dev        # http://localhost:5173
```

The dev server forwards `/api` to the backend on `http://localhost:8000`
(`vite.config.ts`), so the session and XSRF cookies stay on one origin, like in
production. Open the site as **localhost:5173**, not 127.0.0.1: the backend
(Sanctum) only gives that origin a session. Start the backend first
(see `../backend`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type check, then the production build into `dist/` |
| `npm run typecheck` | Type check only |
| `npm run lint` | ESLint |
| `npm test` | All tests once (Vitest, jsdom) |
| `npm run preview` | Serves the production build locally |

## Layout

```
src/
  App.tsx              routes, the session check before any page shows
  lib/api.ts           the axios client: CSRF cookie, one retry on 419, Hungarian error messages
  config/site.ts       site texts and links
  features/
    auth/              login, two-step registration (details, then the e-mailed code)
    app/               the logged-in frame: sidebar, phone tab bar, menu (nav.ts)
    home/              the overview cards and their data (stats.ts)
    account/           account settings
  components/
    ui/                shadcn components (generated, lightly customised)
    app/               shared pieces of the logged-in pages (Panel, PlayerHead, ...)
  test/                test helpers (a fake backend for axios)
```

Tests sit next to the code in `__tests__` folders. They render the real
components and fake only the API, so they read like what a player does:
`src/features/auth/__tests__/double-submit.test.tsx`, for example, clicks
"Belépés" twice and checks that only one login request goes out.

## Conventions

- Every user-facing text is Hungarian; code, comments and docs are English.
- While data loads, a shimmering skeleton stands in its place; when it cannot
  be loaded, a dash (`—`).
- The overview's days and weeks are Budapest days, as the game's playtime
  plugin counts them, whatever the visitor's time zone.
