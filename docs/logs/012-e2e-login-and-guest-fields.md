# 012 — E2E: login setup and guest fields

The Playwright booking test was stale in two ways: `POST /bookings` has needed
a session since BetterAuth (log 011's predecessor work), and the form now has
guest inputs (log 011). Fixing both, plus a race that hid the real failure.

## What changed

- `e2e/auth.setup.ts` (new): Playwright `setup` project. Logs in via `/login`
  with `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` and saves the session to
  `e2e/.auth/user.json` (gitignored).
- `playwright.config.ts`: `setup` project; `chromium` depends on it and loads
  the saved `storageState`. Calls `loadEnvConfig` from `@next/env` so
  `.env.local` is read (Playwright doesn't do that itself).
- `e2e/booking-flow.spec.ts`: fills the three guest fields; waits for the
  search URL before opening a hotel.
- `.env.example`, `.gitignore`, README: document the new env vars and folder.

## Non-obvious

- **Search race.** The Explore search is debounced, then updates the URL to
  `?search=...`. Clicking the first hotel link as soon as one is visible could
  hit the unfiltered list, and the pending URL update then overrode the click's
  navigation or pulled the page away mid-test (seen as "element was detached"
  on a later date click). `await expect(page).toHaveURL(/search=Barcelona/)`
  before the click removes it.
- **Failing for the right reason.** With the guest fields left empty, the test
  now reaches Book and fails there (Zod messages, no booking created), which is
  what a form change should do to this test.
- **The e2e user** is created once via BetterAuth's sign-up endpoint (see
  `hotels/.maestro/booking-flow.yaml`), not seeded with SQL, so the password
  hash matches what login expects.
