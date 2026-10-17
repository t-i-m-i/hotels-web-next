# Aligning hotels-web-next with hotels, and adding BetterAuth

Snapshot taken 2026-10-16. hotels-web-next stops at the state of `hotels` on
2026-09-13 (its last real feature commit matches hotels' `9e6fd7a`; the
10-11 commit is formatting only). Everything below is hotels work from about
2026-09-14 to 2026-10-14.

## 1. Features in hotels that hotels-web-next is missing

### Auth and roles

- **BetterAuth:** email/password and GitHub sign-in, login and register
  screens validated with zod and react-hook-form (`src/schemas/auth.ts`),
  session as the single source of truth.
- **Gating:** guests can't book or see bookings without logging in
  (`LoginPrompt`, `redirectTo` back to the page they came from).
- **Real user id:** bookings and push registration use the session user id.
  `/my-bookings` here still has a hardcoded demo UUID. `POST /bookings`,
  `GET /bookings/user/:id`, `GET /bookings/host/:id` and
  `PATCH /bookings/:id/status` now need a session cookie.
- **Account page:** name, email, role switcher, logout, delete account
  (asks for the password via `authClient.deleteUser`).
- **Multi-role:** `session.user.roles` is a string array added by the
  server's `customSession`. Every signup gets `guest`. The active role is
  persisted and re-validated against `roles`.
- **Host side:** host bookings grouped by hotel (`/bookings/host/{hostId}`).
  The host can confirm or reject bookings via `PATCH /bookings/{id}/status`.
  Statuses: `pending | confirmed | cancelled | completed | no_show`; the API
  returns 409 for an invalid transition.

### Hotel and guest features

- **Favorites:** heart toggle and a Favorites tab. Client-only, no API; stored
  hotels are validated with the zod hotel schema when read back.
- **Image gallery:** slider on the hotel page, fed by `images[]` from the
  backend CMS. web-next doesn't use hotel images anywhere.
- **Nearest hotels:** "Hotels near you" using geolocation, the
  `/hotels/nearest` endpoint, pagination and a distance label per item.
- **Booking phase:** `getBookingPhase` returns ACTIVE / UPCOMING / PAST and
  past bookings are dimmed. web-next only has `isPastBooking`.
- **After booking:** redirect to My Bookings with the new booking marked.
  web-next redirects to `/booking/[id]`.
- **Dark mode:** light and dark theming.
- **Unit tests:** hotel schema, date-range selection, favorite button.

### Backend and generated types (DONE)

- **Stale API types:** web-next's `schema.d.ts` lacks `/me`,
  `/hotels/nearest`, `/bookings/host/{hostId}`, `/bookings/{id}/status` and
  `/push-tokens`. Run `bun run generate:api-types` first.

### Native-only, no web equivalent needed

- Push notifications, deep linking, local notifications.

### Planned navigation changes

- **Remove:** Hotels (admin), Bookings (admin), Guests (admin).
- **Add:** Account page with role switcher, bookings for guests, bookings for
  hosts.
- **Admin role:** hotels has an admin tab tree. Decide whether web-next hides
  the admin role or ignores it, because `roles` can still contain `admin`.

## 2. BetterAuth in Next.js

In hotels, the API (`hotels-api`, NestJS) owns BetterAuth. The client plugin
`expoClient()` stores a token in SecureStore because React Native has no
cookie jar. Next.js doesn't need that: browsers keep the normal cookie
session, so skip `@better-auth/expo` and `expo-secure-store`. The new part is
server-side code in Next: Server Components, Server Actions and `apiClient`
must forward the browser's cookie to the API themselves.

### A. Backend changes in `hotels-api`

1. **`trustedOrigins`** in `src/auth/auth.ts`: keep `'hotels://'` and add the
   web origin (`http://localhost:3001`, plus the prod domain). Without it
   every request fails with `INVALID_ORIGIN`. It also covers the
   `callbackURL` for the GitHub redirect.
2. **CORS in `main.ts`:** the current `app.enableCors()` has no credentials
   support. Browser calls with cookies need
   `app.enableCors({ origin: [web origins], credentials: true })`. Check
   against `@thallesp/nestjs-better-auth`'s docs, since it may take over CORS
   handling.
3. **GitHub OAuth app:** the callback URL stays
   `http://localhost:3000/api/auth/callback/github` (the API still handles
   it). Add a prod callback when deploying.
4. **`skipStateCookieCheck`:** added for a WebKit-on-Expo problem; harmless on
   web, leave it.
5. **Cookies across origins:**
   - Local dev: `localhost:3000` and `localhost:3001` share cookies (cookies
     ignore ports).
   - Production: if web and API are on different registrable domains, the
     session cookie won't reach Next's server. Put them on subdomains of one
     domain and set `advanced.crossSubDomainCookies` with `domain`, or proxy
     `/api/auth/*` through Next with `rewrites` so the browser sees one
     origin.

### B. Next.js setup

1. **Install:** `bun add better-auth`. For forms, probably also
   `bun add react-hook-form @hookform/resolvers` as in hotels. zod is already
   installed.
2. **Env:** add `NEXT_PUBLIC_API_URL=http://localhost:3000` to `.env.local`
   and `.env.example`. `HOTELS_API_URL` is server-only; the browser auth
   client needs a public one.
3. **`src/api/authClient.ts`:** `createAuthClient` from `better-auth/react`
   with `baseURL: process.env.NEXT_PUBLIC_API_URL` and
   `fetchOptions: { credentials: "include" }`. Use it only in `"use client"`
   components for `signIn.email`, `signUp.email`, `signIn.social`,
   `signOut`, `deleteUser`, `useSession`.
4. **Session type:** copy the hand-written `SessionUser` type with
   `roles: string[]` from hotels' `authClient.ts`. `customSessionClient()`
   can't infer it across repos.
5. **GitHub login:** `authClient.signIn.social({ provider: "github", callbackURL })`
   with an absolute web URL, e.g. `${window.location.origin}/`. A relative
   path would resolve against the API host. Also set `errorCallbackURL` so
   failures land on your login page.
6. **Server session helper:** `src/lib/getSession.ts` with something like
   `getSessionUser()` that reads `await headers()` / `cookies()` from
   `next/headers`, calls `GET {HOTELS_API_URL}/api/auth/get-session` with the
   `Cookie` header (via `authClient.getSession({ fetchOptions: { headers } })`
   or plain `fetch`), and returns `{ user, session }` or `null`. Wrap it in
   React's `cache()` so one request makes one call. Server-side counterpart
   of `useSessionUser`.
7. **Forward the cookie in `apiClient`:** `src/api/client.ts` is a
   module-level singleton, so the cookie can't be baked in at creation. Add
   an `onRequest` middleware (next to the `E2E_TEST_MODE` one) that does
   `request.headers.set("cookie", (await headers()).get("cookie") ?? "")`.
   This is the web version of hotels' `getAuthHeaders()`. Works from Server
   Components and Server Actions, not from the browser.
8. **Replace the hardcoded user:** in `/my-bookings`, use `user.id` from
   `getSessionUser()` and `redirect("/login?redirectTo=...")` when there's no
   session. Host bookings use the same id with `/bookings/host/{id}`.
9. **Route protection:**
   - `proxy.ts`: Next 16 renamed `middleware.ts` to `proxy.ts` (verify
     against the Next 16 docs for your version). Use it only as an optimistic
     check: `getSessionCookie` from `better-auth/cookies`, then redirect to
     `/login`. The cookie is `better-auth.session_token`, with a `__Secure-`
     prefix on https. It only works if the cookie is visible to Next (see
     A5).
   - Real check: server layouts, pages and Server Actions via
     `getSessionUser()`. The cookie check isn't real auth.
10. **Server Actions:** `submitBooking` in `actions.ts` must rely on the
    session. The API takes the user from the cookie, so the DTO needs no
    `userId`.
11. **Gate the Book button:** check `useSession()` in the client component
    (`HotelForm`) and `router.push` to `/login?redirectTo=...` when logged
    out. Also gate the page on the server.

### C. Role switcher (web version)

- **Where the active role lives:** hotels uses Redux plus AsyncStorage. Here
  Server Components render the nav, so store it in a cookie (`activeRole`),
  not client state.
- **Setting it:** a Server Action sets the cookie, checks the role is in
  `session.user.roles`, then `redirect()` or `revalidatePath("/")`.
- **Reading it:** a helper `getActiveRole(roles)` that reads the cookie and
  falls back to `guest`, then `roles[0]`, if the stored role isn't one the
  account holds.
- **Rendering:** `NavBar` becomes async, reads session and active role:
  - Logged out: Explore, Map, Login.
  - Guest: Explore, Map, Favorites, My Bookings, Account.
  - Host: Bookings (host), Account.
- **Guarding by role:** route groups `(guest)`, `(host)`, `(auth)` with
  layouts that redirect on a role mismatch.
- **Hotels' bug to avoid:** one place owns stored-role validation; don't
  validate it in several components.

### D. Smaller things

- **Favorites:** `localStorage` read with `useSyncExternalStore`, or a small
  client context. Server Components can't see it, so render the page
  client-side. Validate with a zod hotel schema and guard against hydration
  mismatches.
- **Playwright e2e:** the booking test needs a logged-in user; sign in once
  via `storageState`. Check the `X-Synthetic-Booking` cleanup still works
  with auth.
- **Docs:** add a `docs/logs/NNN-*.md` entry per the AGENTS.md convention.

### Where to read more

- **BetterAuth in hotels:** `docs/guides/authentication.md`,
  `docs/logs/014-betterauth-login-gating.md`,
  `docs/logs/015-multi-role-switching.md`.
- **Backend config:** `hotels-api/src/auth/auth.ts` (plugins,
  `customSession`, delete-user, role seeding).
- **Caveat:** `proxy.ts` and the exact cookie names come from knowledge
  predating the installed versions; verify against the docs for
  `better-auth` ^1.7.7 and `next` 16.3.
