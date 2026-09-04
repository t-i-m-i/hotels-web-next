# 005 — Playwright happy-path E2E for the booking flow

## Why

The RN app already has a Maestro happy-path flow
(`../hotels/.maestro/booking-flow.yaml`): search "Barcelona", open a
hotel, pick a date range, reserve, land on the confirmation screen. A
"can a user actually book a hotel" journey belongs at the frontend layer
— it's UI navigation and interaction, not something the backend can
meaningfully assert on its own (see `hotels-api`'s
`docs/logs/006-dto-validation-e2e-and-broken-e2e-suite.md` for the
corresponding backend-side call: contract tests there, not journeys). This adds the
same journey here, adapted to browser interactions.

## What was added

```
playwright.config.ts     # chromium project, webServer boots `bun run dev` on :3001
e2e/booking-flow.spec.ts # the happy path
```

`bun run test:e2e` runs it (`playwright test`). Requires `hotels-api`
running separately at `HOTELS_API_URL` (`.env.local`) with the shared
seed data — the Playwright config only boots this app's own dev server,
same division of responsibility as manual dev work (see this repo's
`AGENTS.md`).

## The flow, and why the selectors are what they are

1. `/`, fill the search box with "Barcelona" — same term as the Maestro
   flow, same shared seed data, so the two suites read as equivalent
   journeys side by side.
2. Click the first `a[href^="/hotel/"]` result.
3. `@daypicker/react` is a thin re-export of `react-day-picker` (confirmed
   via `node_modules/@daypicker/react/dist/esm/index.js`: `export * from
"react-day-picker"`), which gives every day button an accessible name of
   `format(date, "PPPP")` (e.g. "Wednesday, September 9th, 2026") — see
   `node_modules/react-day-picker/dist/esm/labels/labelDayButton.js`. The
   test computes that same string with `date-fns` to target check-in/
   check-out days by role+name instead of a CSS class or test id, and
   clicks "Go to the Next Month" (the exact string from
   `labelNext.js`) to reach next month first, mirroring Maestro's
   `booking-calendar.header.rightArrow` tap.
4. Click "Reserve", assert the redirect to `/booking/<uuid>` and the
   "Booking Details" heading.

## This creates a real booking — cleanup

Unlike the RN app's Maestro flow (which never established a cleanup
story either, worth noting as a shared gap), this test does clean up
after itself: `test.afterEach` calls `DELETE {HOTELS_API_URL}/bookings/
:id` via Playwright's `request` fixture, using the id captured from the
post-submit redirect URL. No separate cleanup script — the id only
exists once the booking does, and `BookingsController` already exposes
the delete endpoint (`bookings.controller.ts`), so reusing it beats
inventing a second way to remove a booking. If a run crashes before
`afterEach` (not just before the assertion, actually mid-navigation),
the row is orphaned; there's currently no sweep for that case. Worth a
follow-up if orphaned demo bookings from failed CI runs become annoying —
e.g. a scheduled cleanup job on the `hotels-api` side, or tagging
E2E-created rows with a recognizable marker (a guest tied to a fixed test
user id) that a script can later find and delete in bulk.

## Gotchas hit getting this green

- **Next dev compiles routes on first visit.** A cold run can blow past
  Playwright's 5s default assertion timeout waiting for `/hotel/[id]` to
  render. Bumped `expect.timeout` to 10s and `webServer.timeout` to 60s
  in `playwright.config.ts` rather than adding manual waits in the test.
- **`HotelMap` uses `maplibre-gl` (WebGL), and headless Chromium has no
  GPU by default.** Left unset, a WebGL failure there is a client-side
  exception, which in dev mode manifests as Next's error overlay instead
  of the hotel page rendering — from the test's point of view this looks
  exactly like "click didn't navigate," not like a map bug, which cost
  time to track down. Fixed by forcing software rendering in the
  `chromium` project's `launchOptions.args`: `--use-gl=swiftshader
--enable-webgl --ignore-gpu-blacklist`.
- Chose next month, days 10–13, matching Maestro's range — far enough out
  to be very unlikely to collide with another booking on the same demo
  hotel, but not impossible on a shared instance; a collision would show
  up as the day button being disabled/unclickable rather than a clean
  error, so a flake here is worth a second look before assuming it's
  infra noise.

## Verification

Ran locally against the real `hotels-api` dev server and shared Neon DB.
First attempt failed on the WebGL/dev-compile issue above (surfaced as
"stuck on the search results page" rather than an obvious map or timeout
error) — fixed via the `launchOptions` change above. Left the final
confirmed-green run to be re-verified after applying the fix, since the
dates initially used had, separately, already been booked by that first
attempt; re-run after deleting that stray booking.
