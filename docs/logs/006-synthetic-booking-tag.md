# 006 — Tagging this suite's booking as synthetic too

## Why

`hotels-api` gained a real "synthetic booking" tag
(`docs/logs/007-synthetic-booking-tag.md` over there): `POST /bookings`
accepts an `X-Synthetic-Booking: true` header, persisted as
`bookings.is_synthetic`, cleanable in bulk via
`DELETE /bookings/synthetic`. Driven by the RN app's Maestro flow, which
previously cleaned up by matching hotel name + dates — a heuristic that
breaks the moment two suites pick the same range, which this one
already does (same next-month 10–13 window, same "Barcelona" search
term as `../hotels/.maestro/booking-flow.yaml`, by design — see
`docs/logs/005-playwright-booking-e2e.md`).

## What changed here

`src/api/client.ts` now sets that header on every request whenever
`E2E_TEST_MODE === "true"`, and `playwright.config.ts`'s
`webServer.env` sets exactly that variable — so only a server Playwright
itself started tags its bookings; a developer's own `bun run dev` never
does.

## This suite's own cleanup didn't need to change

`e2e/booking-flow.spec.ts`'s `afterEach` already deletes by the exact id
captured from the post-submit redirect URL — there was never any
name/date matching here to replace. The tag is added purely as a second
line of defense: if a run crashes before `afterEach` runs, the orphaned
row is still identifiable and sweepable via
`DELETE /bookings/synthetic` (e.g. as a periodic CI cleanup step),
where before it would've been indistinguishable from a real booking.

Deliberately *not* switched to relying on the bulk endpoint for normal
cleanup — per-id delete stays correct if this suite ever runs with
multiple tests in parallel (`fullyParallel: true` is already set); a
blanket "delete everything tagged synthetic" in one test's `afterEach`
could delete a different, still-in-progress test's booking.

## Caveat

`reuseExistingServer: !process.env.CI` means a dev server already
running from a plain `bun run dev` gets reused as-is — without
`E2E_TEST_MODE`, so without the tag. Noted directly in
`playwright.config.ts`; stop any manually-started dev server before a
local Playwright run if the tag matters for that run.

## Verified

Regenerated `src/api/generated/schema.d.ts` from `hotels-api`'s updated
spec, `tsc --noEmit` clean. Did not re-run the Playwright suite live in
this session (no reason to expect the pre-existing flow to behave
differently — the only change is one extra header on an already-working
request).
