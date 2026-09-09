# Hotels (web)

A web app for browsing hotels and viewing them on a map — the Next.js
counterpart to the [Hotels](https://github.com/t-i-m-i/hotels) React Native
app, built to demonstrate the same product as a server-rendered web app.

**What it does:** browse and search a list of hotels, click one to see it
on the map and book a stay there, view all hotels at once on a full map,
and see a guest's bookings on "My Bookings". A small set of unauthenticated
admin-ish routes (`/bookings`, `/hotels`) exist as a query/reporting
playground on top of the same data, not a customer-facing feature — see
"Project status" below.

## Why this project

A web port of the RN app's functionality, built with the same "typed
contract across repos" idea: this app, the RN app, and the backend
(`hotels-api`) all share the same OpenAPI-generated types, generated
independently in each client repo from the same committed spec file.

## Tech stack

- **Next.js 16 (App Router) + React 19** — Server Components do all data
  fetching (hotel list, hotel detail, map data, bookings), server-to-server
  against `hotels-api`; booking submission is a Server Action, called
  directly from a client component's `onSubmit` rather than
  `useMutation`/`<form action>`. Client components are used only where the
  DOM is required (the map, the date-range picker, debounced search).
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
| `bun run type-check`              | tsc --noEmit                                                                                                                             |
| `bun run lint`                    | ESLint.                                                                                                                             |
| `bun run format` / `format:check` | Prettier.                                                                                                                           |

### Working alongside `hotels-api`

Same convention as the RN app: the two repos are meant to be checked out as
siblings. `generate:api-types` reads `../hotels-api/docs/openapi.json` via
a relative path — no running server needed for codegen — but actually
using the app does require `hotels-api`'s dev server running locally.

## Project status

Real, server-rendered pages backed by the live `hotels-api`:

- **`/`** — hotel list with debounced, URL-driven search (`?search=`).
- **`/hotel/[hotelId]`** — hotel detail, map, and a booking form (date-range
  picker that disables already-booked ranges for that hotel).
- **`/map`** — full map of every hotel.
- **`/booking/[bookingId]`** — booking confirmation (currently only
  renders the raw id; not fully built out yet).
- **`/my-bookings`** — a guest's bookings, with past ones visually dimmed.
  `userId` is hardcoded (no auth in this app yet).
- **`/bookings`** — admin-ish "every booking with hotel + guest names" list,
  a reporting/SQL-practice route, not part of the customer-facing product.

Deliberately not built out yet:

- **`/hotels`** — empty stub, meant for a future admin "all hotels" view.
- **`/guests`** — linked from `NavBar` but has no route behind it yet
  (404s today).
- No auth anywhere — every "current user" is a hardcoded id.

This app intentionally diverges from strict RN-app parity for the
admin-ish routes (see `docs/logs/003-booking-flow.md`) — they exist to
practice SQL/reporting queries on top of the same data, not to mirror the
RN app's screens. See `docs/logs/` for the full build history and
`docs/logs/004-my-bookings-and-timezone-caveat.md` for a known timezone
approximation in the "past booking" dimming logic.

## Testing

| Command | What it does |
|---|---|
| `bun run test:e2e` | Playwright happy-path e2e (`e2e/booking-flow.spec.ts`): search, open a hotel, book a date range, land on the confirmation page. |

`test:e2e` starts this app's own dev server on `:3001` (`playwright.config.ts`'s `webServer`) but requires
`hotels-api` already running separately on `:3000` with the demo seed data — same requirement as running
the app manually.

The flow creates a real booking against the shared Neon database. It's cleaned up two ways: precisely, by
`afterEach` deleting the exact id captured from the post-booking redirect URL; and as a fallback, by
tagging the booking `X-Synthetic-Booking: true` (only when Playwright itself started the server —
`E2E_TEST_MODE` in `webServer.env` — never for a plain `bun dev`), so `hotels-api`'s
`DELETE /bookings/synthetic` can sweep it up even if a run crashes before `afterEach` runs. See
`docs/logs/005-playwright-booking-e2e.md` and `docs/logs/006-synthetic-booking-tag.md`, and
`hotels-api`'s `docs/guides/testing-against-production-patterns.md` for the reasoning behind tagging
synthetic data instead of matching on hotel name/dates.
