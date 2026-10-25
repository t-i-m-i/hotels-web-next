# 013 — Jest + React Testing Library

First unit-test setup in this repo (the RN app and `hotels-api` already had
Jest; Playwright e2e was the only test here). The first test covers the change
password form, as a template for tests of other components.

## What changed

- `jest.config.ts`: `next/jest` preset, `jsdom` environment, `@/` alias,
  `e2e/` ignored.
- `jest.setup.ts`: loads `@testing-library/jest-dom` matchers.
- `package.json`: `test` and `test:watch` scripts; dev dependencies `jest`,
  `jest-environment-jsdom`, `@testing-library/{react,dom,jest-dom,user-event}`,
  `ts-node`, `@types/jest`.
- `src/components/auth/__tests__/ChangePasswordFormView.test.tsx`: validation
  errors, password mismatch, success path (API call args, success message,
  cleared fields), server error.

## Non-obvious

- **`next/jest` instead of Babel/ts-jest.** It plugs in Next's SWC compiler,
  mocks CSS/images/`next/font` and loads `.env` files, so there is no separate
  transform config to keep in sync with the app. Setup follows
  `node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`.
- **`ts-node` is a dev dependency only so Jest can read `jest.config.ts`.**
- **`e2e/` is excluded** (`testPathIgnorePatterns`), otherwise Jest tries to run
  Playwright's `*.spec.ts` files.
- **Mock the module that talks to the network.** `jest.mock("@/api/authClient")`
  swaps in a fake `changePassword`; the real client would make HTTP calls to
  `hotels-api`. Mocked resolved values are cast `as never` since the component
  only reads `error`/`data`.
- **Query like a user.** `getByLabelText` / `getByRole` rely on correct
  `htmlFor` wiring, which is why a wrong `htmlFor` would fail these tests.
  Use `findBy…` for things that appear after validation or a promise.
- **Async Server Components can't be unit-tested in Jest** (Next's guide says to
  cover those with e2e). Only client components and pure logic are covered.
- **Sanity check done:** flipping `revokeOtherSessions` to `false` made the
  success-path test fail, then was reverted.
- Bun blocked the `@parcel/watcher` postinstall script; it only affects watch
  mode speed. `bun pm trust @parcel/watcher` enables it if needed.
