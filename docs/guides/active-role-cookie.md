# Active role: how the cookie round trip works

A user can hold several roles (`guest`, `host`, `admin`). Which one they are
currently "viewing as" is stored in an `activeRole` cookie, not in a client
store, because Server Components (e.g. `bookings/page.tsx`) must know it while
rendering on the server and can't read Redux/context.

This guide walks through one full round: switching role on `/account`, then
logging out. Object shapes below are **illustrative** (trimmed to the
interesting fields), not copied from a live response.

Two servers are involved, which is the part that is easy to lose track of:

- the **Next server** (this repo, `localhost:3001`)
- **hotels-api** (`NEXT_PUBLIC_API_URL`, owns BetterAuth and the database)

Cookies are keyed by host, not port, so a cookie set by hotels-api on
`localhost` is also sent by the browser to `localhost:3001`.

## Two different cookies

| Cookie                        | Set by      | Contains                             | Purpose                       |
| ----------------------------- | ----------- | ------------------------------------ | ----------------------------- |
| `better-auth.session_token`\* | hotels-api  | opaque signed session token          | "who is this", proves login   |
| `activeRole`                  | Next server | plain role name, e.g. `host`         | "which role tree to show"     |

\* BetterAuth's default name; check the browser's cookies if you customise it.

The session cookie holds **no user data and no roles** — it is only a key to a
row in the `sessions` table. The roles are looked up on every request.

## Part 1 — switching role (`handleSwitchRole("host")`)

1. **Click.** The browser runs `handleSwitchRole("host")` in
   `AccountActions` (a Client Component), which calls the Server Action
   `setActiveRole("host")`.

2. **Browser → Next server (Server Action request).** Next turns the call into
   a `POST` to the current page's URL. What travels:

   ```
   POST /account
   Cookie: better-auth.session_token=<token>.<signature>
   Next-Action: <action id>
   body: ["host"]                 ← the only argument; the role name
   ```

   The browser attaches the cookie automatically. The argument is just
   `"host"` — we deliberately don't send `user.roles`, because anything the
   client sends can be forged.

3. **Next server → hotels-api (inside `getSessionUser()`).** The action needs
   to know who is calling and what roles they really hold. The Next server
   makes its own HTTP request, copying the cookie by hand:

   ```ts
   authClient.getSession({
     fetchOptions: { headers: { cookie: (await headers()).get("cookie") ?? "" } },
   });
   ```

   ```
   GET <NEXT_PUBLIC_API_URL>/api/auth/get-session
   Cookie: better-auth.session_token=<token>.<signature>
   ```

   The copy is necessary: a request made from the server has no browser, so no
   cookies are attached unless we pass them.

4. **hotels-api.** BetterAuth verifies the signature, finds the row in
   `sessions` by token, checks `expires_at`, loads the user, and the
   `customSession` plugin runs a fresh `user_roles` join. This is the "API
   hit" — it happens on every call, and is why the roles can be trusted.

5. **hotels-api → Next server.** The response body:

   ```json
   {
     "session": { "id": "…", "userId": "u1", "expiresAt": "…" },
     "user": { "id": "u1", "name": "…", "email": "…", "roles": ["guest", "host"] }
   }
   ```

   `getSessionUser()` returns `data.user`.

6. **Validation in the action.** `user.roles.includes("host")` → true. (If the
   user didn't hold the role, the action would `console.warn` and return, no
   cookie written.)

7. **Next server sets the cookie.**

   ```ts
   (await cookies()).set({ name: "activeRole", value: "host", httpOnly: true, … });
   ```

   `cookies().set` doesn't touch the browser directly — it queues a header on
   the action's response. `(await cookies())` is just awaiting the async
   cookie store, then calling `.set` on it.

8. **Next server → browser (action response).** Because the action changed a
   cookie, Next doesn't just return the action's result: it **re-renders the
   current page and layouts on the server in the same round trip** and puts the
   fresh RSC payload in the response.

   ```
   200 OK
   Set-Cookie: activeRole=host; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax
   <RSC payload for /account, rendered with the new cookie>
   ```

   To render that page the server runs `requireSessionUser` (step 3–5 again —
   `cache()` doesn't carry over from the action to the render pass) and then
   `getActiveRole(user)`, which now reads `activeRole=host`. It passes
   `activeRole="host"` as a prop to `AccountActions`.

9. **Browser applies the response.** It stores the `activeRole` cookie, and
   React merges the new RSC payload into the page. Client state in
   `AccountActions` is preserved; the bold style moves to "Host" because the
   `activeRole` prop changed. At this point the page is already correct.

10. **`router.replace(ROLE_HOME["host"])`** (`/bookings`). Client-side
    navigation. The browser requests the RSC payload for `/bookings`, sending
    both cookies:

    ```
    GET /bookings?_rsc=…
    Cookie: better-auth.session_token=…; activeRole=host
    ```

    The server renders `bookings/page.tsx`: step 3–5 for the user, then
    `getActiveRole(user)` → `"host"` → fetch host bookings. The result is
    stored in the **client-side Router Cache** keyed by that URL.

11. **`router.refresh()`.** Throws away the Router Cache entry for the current
    route and re-requests it from the server (same request as step 10). It is
    mostly redundant after a cookie-setting action — step 8 already refreshed
    the page you were on — but it guards against `replace` having served a
    previously cached `/bookings` payload rendered under the _old_ role. It
    does **not** clear the server-side Data Cache; that needs `revalidatePath`
    / `revalidateTag`, and isn't needed here because reading cookies already
    makes the render dynamic.

### What if you skip the router calls?

- Skip both → stay on `/account`, UI still correct (step 8–9).
- Only `replace` → navigates; a never-visited target is fetched fresh, but a
  previously visited one might come from the Router Cache with the old role.
- Only `refresh` → stays on the same page, re-fetched. Fine when you don't want
  to navigate.

## Part 2 — logging out

`authClient.signOut()` is **not** a Server Action and doesn't go through the
Next server. `authClient` is created with `baseURL: NEXT_PUBLIC_API_URL` and
`credentials: "include"`, so the browser calls hotels-api directly
(cross-origin):

1. **Browser → hotels-api.**

   ```
   POST <NEXT_PUBLIC_API_URL>/api/auth/sign-out
   Cookie: better-auth.session_token=<token>.<signature>
   Origin: http://localhost:3001      ← must be in trustedOrigins
   ```

2. **hotels-api.** Deletes the row from `sessions` and replies:

   ```
   200 OK
   {"success": true}
   Set-Cookie: better-auth.session_token=; Max-Age=0; Path=/; …
   ```

   The browser applies the `Set-Cookie` and drops the session cookie.

So it isn't fire-and-forget — the API really invalidates the session and the
cookie is really removed. What it can't do is tell the **Next server or the
already-rendered page** anything. The Next server wasn't involved, so nothing
re-renders: the DOM, and the Router Cache's payloads for `/account`, `/`, etc.,
still contain the logged-in user (e.g. the NavBar).

That is the job of `router.replace("/")` + `router.refresh()`:

3. `replace("/")` navigates to the home page, possibly from a cached payload.
4. `refresh()` discards the cache for the current route and re-requests it. Now
   the request carries no session cookie, `getSessionUser()` calls hotels-api
   and gets `session: null`, `user` is `undefined`, and the page renders as
   logged out.

### The `activeRole` cookie on logout

`activeRole` is ours, so the API's sign-out doesn't clear it; `clearActiveRole()`
(a Server Action) does. It is tidiness rather than security: `getActiveRole`
validates the stored value against the user's real roles and falls back to
`roles[0]`, so a stale cookie can't grant anything.

Order matters, though. A Server Action that sets/deletes a cookie triggers the
server re-render from step 8. If `clearActiveRole()` runs **after** `signOut()`,
that re-render of `/account` happens with no session, `requireSessionUser`
redirects to `/login?redirectTo=/account`, and it races with `router.replace("/")`.
Call `clearActiveRole()` **before** `signOut()` so the re-render still has a valid
session.

## Rules of thumb

- The client may _ask_ for a role; the server decides, using the session
  fetched from hotels-api — never an argument the client passes.
- `activeRole` selects a **view**. Authorization still belongs to hotels-api
  and to guards like `host/layout.tsx` (`forbidden()`).
- Read `activeRole` in Server Components via `getActiveRole(user)` and pass it
  down as a prop; the cookie is `httpOnly`, so client JS can't read it (on
  purpose).
- A Server Action that changes a cookie refreshes the current page for free.
  A plain `fetch` to another origin (`authClient.signOut()`) does not — use
  `router.refresh()` there.
