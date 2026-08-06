# Hotels (web)

A web app for browsing hotels and viewing them on a map — the Next.js
counterpart to the [Hotels](https://github.com/t-i-m-i/hotels) React Native
app, built to demonstrate the same product as a server-rendered web app.

**What it does:** browse a list of hotels, tap one to see it on the map,
view all hotels at once on a full map. Search and My Bookings exist as UI
shells only, matching the current state of the RN app — see "Project
status" below.

## Why this project

A web port of the RN app's functionality, built with the same "typed
contract across repos" idea: this app, the RN app, and the backend
(`hotels-api`) all share the same OpenAPI-generated types, generated
independently in each client repo from the same committed spec file.

## Tech stack

- **Next.js 16 (App Router) + React 19** — Server Components do all data
  fetching (hotel list, hotel detail, map data), server-to-server against
  `hotels-api`; client components are used only where the DOM is required
  (the map).
- **Tailwind CSS 4** for styling.
- **maplibre-gl** — the vector-tile map SDK's vanilla web JS build, using
  [OpenFreeMap](https://openfreemap.org/) (free, keyless) tiles — the web
  equivalent of the RN app's `@maplibre/maplibre-react-native`.
- **[`hotels-api`](https://github.com/t-i-m-i/hotels-api)** (a sibling
  repo) — the same NestJS backend the RN app uses.
- **openapi-typescript + openapi-fetch** — same typed pipeline as the RN
  app (OpenAPI spec → generated TS types → typed fetch client → domain
  wrapper functions), minus the TanStack Query hook layer: Server
  Components calling `getHotels()`/`getHotel()` directly with `await` is
  the web equivalent seam.
- **TypeScript** in strict mode, **ESLint + Prettier**, **bun** as the
  package manager and script runner — same conventions as both sibling
  repos.

## Running it locally

Requires [bun](https://bun.sh) and a sibling checkout of `hotels-api`
(`hotels-api/` next to this repo — see "Working alongside `hotels-api`"
below).

```bash
bun install
cp .env.example .env.local   # HOTELS_API_URL, defaults to localhost:3000
bun run generate:api-types   # regenerate src/api/generated/schema.d.ts
bun dev                      # starts on http://localhost:3001
```

`hotels-api` must be running locally (`bun run start:dev` in that repo, on
its default port `3000`) for any page to show real data — there's no mock
fallback. This app's own dev server runs on **port 3001** to avoid
colliding with it.

### Scripts

| Command                           | What it does                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `bun dev`                         | Start the Next.js dev server on port 3001.                                                                                          |
| `bun run build`                   | Production build.                                                                                                                   |
| `bun start`                       | Run the production build on port 3001.                                                                                              |
| `bun run generate:api-types`      | Regenerate `src/api/generated/schema.d.ts` from `../hotels-api/docs/openapi.json` — run after any route/DTO change in `hotels-api`. |
| `bun run lint`                    | ESLint.                                                                                                                             |
| `bun run format` / `format:check` | Prettier.                                                                                                                           |

### Working alongside `hotels-api`

Same convention as the RN app: the two repos are meant to be checked out as
siblings. `generate:api-types` reads `../hotels-api/docs/openapi.json` via
a relative path — no running server needed for codegen — but actually
using the app does require `hotels-api`'s dev server running locally.

## Project status

Hotel list, hotel detail, and the full map are real, server-rendered pages
backed by the live `hotels-api`. Search and My Bookings are intentionally
UI-only stubs — exact parity with the current RN app, not a missing
feature. See `docs/logs/` for how this was built.
