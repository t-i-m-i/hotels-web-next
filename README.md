# Hotels

A **Next.js server-rendered web app** for discovering and booking hotels,
<br />backed by a [NestJS REST API](https://github.com/t-i-m-i/hotels-api).

<img width="1200" height="690" alt="Image" src="https://github.com/user-attachments/assets/c4b45080-b162-439d-b704-9cdebf02eabf" />

## Features

This app is a **web** sibling to the [Hotels - React Native with Expo](https://github.com/t-i-m-i/hotels) app,
sharing the same OpenAPI-generated types with the backend.

See the full feature list in the [Features section](https://github.com/t-i-m-i/hotels/blob/main/README.md#features).

## Tech stack

- **Next.js 16 (App Router) + React 19** - Server Components do all data
  fetching, server-to-server against `hotels-api`; booking submission is a Server Action, called
  directly from a client component's `onSubmit` rather than
  `useMutation`/`<form action>`. Client components are used only where the
  DOM is required (the map, the date-range picker, debounced search).
- **Tailwind CSS 4** for styling.
- **maplibre-gl** - the vector-tile map SDK's vanilla web JS build, using
  [OpenFreeMap](https://openfreemap.org/) (free, keyless) tiles - the web
  equivalent of the RN app's `@maplibre/maplibre-react-native`.
- **[`hotels-api`](https://github.com/t-i-m-i/hotels-api)** (a sibling
  repo) - the same NestJS backend the RN app uses.
- **openapi-typescript + openapi-fetch** - same typed pipeline as the RN
  app (OpenAPI spec → generated TS types → typed fetch client → domain
  wrapper functions), minus the TanStack Query hook layer: Server
  Components calling `getHotels()`/`getHotel()` directly with `await` is
  the web equivalent seam.
- **TypeScript** in strict mode, **ESLint + Prettier**, **bun** as the
  package manager and script runner - same conventions as both sibling
  repos.
- **BetterAuth** for auth.

## Running it locally

Requires [bun](https://bun.sh) and a sibling checkout of `hotels-api`.

```bash
bun install
cp .env.example .env.local   # HOTELS_API_URL, defaults to localhost:3000
bun run generate:api-types   # regenerate src/api/generated/schema.d.ts
bun dev                      # starts on http://localhost:3001
```

`hotels-api` must be running locally (`bun run start:dev` in that repo, on
its default port `3000`).
This app's own dev server runs on **port 3001** to avoid
colliding with it.

### Scripts

| Command                           | What it does                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `bun dev`                         | Start the Next.js dev server on port 3001.                                                                                         |
| `bun run build`                   | Production build.                                                                                                                  |
| `bun start`                       | Run the production build on port 3001.                                                                                             |
| `bun run generate:api-types`      | Regenerate `src/api/generated/schema.d.ts` from `../hotels-api/docs/openapi.json`. Run after any route/DTO change in `hotels-api`. |
| `bun run type-check`              | tsc --noEmit                                                                                                                       |
| `bun run lint`                    | ESLint.                                                                                                                            |
| `bun run format` / `format:check` | Prettier.                                                                                                                          |

## Testing

| Command            | What it does                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `bun run test:e2e` | Playwright happy-path e2e (`e2e/booking-flow.spec.ts`): search, open a hotel, book a date range, land on the confirmation page. |

`test:e2e` starts this app's own dev server on `:3001` (`playwright.config.ts`'s `webServer`) but requires
`hotels-api` already running separately on `:3000` with the demo seed data - same requirement as running
the app manually.

The flow creates a real booking against the shared PostgreSQL database. It's cleaned up two ways: precisely, by
`afterEach` deleting the exact id captured from the post-booking redirect URL; and as a fallback, by
tagging the booking `X-Synthetic-Booking: true` (only when Playwright itself started the server -
`E2E_TEST_MODE` in `webServer.env` - never for a plain `bun dev`), so `hotels-api`'s
`DELETE /bookings/synthetic` can sweep it up even if a run crashes before `afterEach` runs. See
`docs/logs/005-playwright-booking-e2e.md` and `docs/logs/006-synthetic-booking-tag.md`, and
`hotels-api`'s `docs/guides/testing-against-production-patterns.md` for the reasoning behind tagging
synthetic data instead of matching on hotel name/dates.

## About me

Hi, I'm Tymoteusz. I'm a Fullstack Developer working across frontend, backend, and user experience. I build native mobile apps, backend APIs, and work with databases. I'm looking for an opportunity to keep growing as a Software Engineer - Fullstack Node.js React and/or React Native.
