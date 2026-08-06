<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent instructions

## What this project is

A Next.js (App Router) web app for browsing hotels and viewing them on a
map — the web counterpart to the `hotels` Expo/React Native app. Data comes
from the `hotels-api` sibling repo. See `README.md` for the pitch and
`docs/logs/` for how it was built.

## Stack

- Package manager is bun, not npm — use `bun install` / `bun add` /
  `bun run <script>` (e.g. `bun run lint`, `bun run format`).
- Next.js 16, App Router, React 19, TypeScript strict mode, `@/*` path
  alias to `src/`.
- Tailwind CSS 4.
- `maplibre-gl` (vanilla web SDK) for the map — vector tiles from
  [OpenFreeMap](https://openfreemap.org/), same style as the RN app. No
  native rebuild step needed here (unlike the RN app) — it's a pure JS
  dependency.
- ESLint (`eslint-config-next` flat config) + Prettier
  (`eslint-config-prettier` disables conflicting rules). Run `bun run
lint`, `bun run format` / `format:check`.
- Dev server runs on **port 3001** (`hotels-api` occupies the default 3000) — see `package.json` scripts.

## Data fetching architecture — read before adding a fetch call

**Server Components fetch data directly; there is no client-side
data-fetching hook layer (no TanStack Query, no SWR).** Pages `await
getHotels()` / `getHotel(id)` from `src/api/hotels.ts` directly. If you
need data in a client component, fetch it in the nearest Server Component
ancestor and pass it down as a prop (see `HotelMap`, which receives
`hotels` as a prop rather than fetching itself). Don't reintroduce a
client-side fetching hook unless a page genuinely needs client-triggered
refetching that URL-driven navigation can't express.

## Structure

- `src/app/` — Next.js App Router pages: `page.tsx` (hotel list, "/"),
  `map/page.tsx`, `my-bookings/page.tsx` (stub), `search/page.tsx` (stub,
  intentionally non-functional — matches the RN app), `hotel/[hotelId]/page.tsx`.
- `src/api/` — `client.ts` (typed `openapi-fetch` client), `hotels.ts`
  (`Hotel` type + wrapper functions), `generated/schema.d.ts`
  (`openapi-typescript` output — **do not hand-edit**; regenerate with
  `bun run generate:api-types`, which reads `../hotels-api/docs/openapi.json`
  — requires `hotels-api` checked out as a sibling directory, but not
  running, for codegen).
- `src/components/` — `HotelMap.tsx` (`'use client'`, prop-driven: `hotels`,
  `selectedHotelId`), `NavBar.tsx`, `HotelCard.tsx`.
- `src/constants/`, `src/utils/` — map config, geo helpers (ported from the
  RN app's equivalents).
- `docs/` — reference docs (current-state, edited in place) plus
  `docs/logs/` (append-only, dated work-session notes — never edit old
  entries, correct in a new one instead). See `docs/README.md`.

## Conventions

- Keep the RN app and this app's search/my-bookings stub state in sync
  unless a change is deliberately made to both — don't get ahead of the RN
  app's functionality without discussing it first.
- When you finish a non-trivial chunk of work, add a `docs/logs/NNN-*.md`
  entry (what was done, why, anything non-obvious/gotchas) rather than
  editing an old log entry.
