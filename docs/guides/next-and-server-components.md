# Next and Server Components: the idea

Two different directives look like opposites and aren't: `"use client"` and
`"use server"`. They don't mark two ends of the same switch — they mark two
unrelated things. This guide is the mental model that untangles them, using
this repo's own files.

## Two separate questions, not one axis

1. **Is this a _component_, and where does it render?** → `"use client"`
   (or its absence, which is the default: a Server Component).
2. **Is this a plain _function_, and is it reachable from client code?** →
   `"use server"` (or its absence, which is the default: an ordinary
   function).

There is no `"use server"` for components and no `"use client"` for
functions. They apply to different kinds of things, so "no mark" doesn't mean
the same thing in both cases — that's the part that trips people up, and the
rest of this guide is mostly about question 2.

## 1. Server Components — the default

Every component in `src/app/` is a Server Component unless it says
otherwise. `src/app/page.tsx`, `src/app/map/page.tsx`,
`src/app/hotel/[hotelId]/page.tsx` — none of them have a directive, and none
need one. They:

- run **only** on the server, once per request, to produce HTML/RSC output;
- can `await` directly — database calls, `fetch`, anything async;
- can safely read secrets (`process.env.HOTELS_API_URL`, no `NEXT_PUBLIC_`
  prefix) because their code never ships to the browser;
- send **zero JavaScript** to the client for themselves — the client gets
  rendered output, not the component's code.

```tsx
// src/app/hotel/[hotelId]/page.tsx — Server Component, no directive
const hotel = await getHotel(hotelId).catch(() => null); // plain call, runs on the server
```

## 2. Client Components — `"use client"`

`src/components/HotelMap.tsx`, `HotelForm.tsx`, `HotelList.tsx`,
`HotelSearchSection.tsx`, `Search.tsx` all start with `"use client"`. This is
needed the moment a component uses `useState`, `useEffect`, event handlers,
or browser-only APIs (`IntersectionObserver`, `maplibre-gl`) — things that
only make sense once the component is alive in a browser tab.

**Correction worth internalizing:** `"use client"` does _not_ mean "never
runs on the server." Next still renders a Client Component on the server once,
to produce the initial HTML (so the page isn't blank before JS loads) — then
the same component's code ships to the browser and takes over there
(hydration), re-rendering on state changes, clicks, effects. "Client
Component" means _this ships to and hydrates in the browser_, not _this only
exists in the browser_.

## 3. A plain module has no boundary of its own — it inherits whichever bundle imports it

This is the crux of the earlier confusion. `src/api/hotels.ts` has no
directive:

```ts
// src/api/hotels.ts — no directive, just functions
export async function getHotelsInBounds(bounds, search) {
  const { data, error } = await apiClient.GET("/hotels/within-bounds", ...);
  ...
}
```

That's not a rule that says "this file is locked to the server." It's the
_absence_ of a rule. A plain, undirected module runs wherever it's imported:

- Imported by a Server Component (`page.tsx`) → runs on the server, plain
  function call, no ceremony. This works today for `getHotel`, `getHotels`.
- Imported by a Client Component (`HotelMap.tsx`) → the bundler has no
  reason to treat it specially, so it tries to ship the _real function body_
  into the browser bundle. That body calls `apiClient`, which reads
  `process.env.HOTELS_API_URL` — a var Next deliberately never inlines into
  client code. In the browser that read is `undefined`, and
  `src/api/client.ts`'s `if (!baseUrl) throw` fires immediately.

So "no directive" isn't "server-only, enforced." It's "ordinary code,
enforced nowhere" — and it happens to break in exactly this way when
something server-only crosses into a client bundle. This is _why_
`HotelMap.tsx` can't call `getHotelsInBounds` directly, even though it's a
one-line async function that would be completely fine to call from a Server
Component.

## 4. `"use server"` — Server Actions

This is the piece whose name actively misleads. Read it as **"expose this
function to client code, safely"**, not as **"this runs on the server"** —
everything in `src/api/*.ts` already only ever runs on the server, directive
or not.

```ts
// src/app/actions.ts
"use server";

export async function loadHotelsInBounds(bounds, search) {
  return getHotelsInBounds(bounds, search); // real work still happens here, on the server
}
```

What the directive actually does, per exported `async function` in the file:

- **Called from server code** (another Server Component, or another
  server-only module): it's just a normal function call. No network hop, no
  extra cost — `"use server"` adds nothing here.
- **Called from a Client Component**: the bundler generates a small stub with
  the same name and signature and ships _that_ to the browser instead of the
  real body. Calling the stub makes a `fetch` to a Next-internal endpoint,
  which runs the real function back on the server and returns the result.
  `HotelMap.tsx` calling `loadHotelsInBoundsAction(...)` never executes
  `apiClient` in the browser — it executes it here, on the server, exactly
  like a Server Component would, just triggered remotely.

Two forms exist:

- **File-level** (what this repo uses): `"use server"` as the file's first
  line marks _every_ export as a Server Action.
- **Inline**, inside a single function body — useful when only one function
  in a component-heavy file needs to be an action:
  ```tsx
  export default function Form() {
    async function action(formData: FormData) {
      "use server";
      // ...
    }
    return <form action={action}>...</form>;
  }
  ```

One requirement either form imposes: every Server Action must be an `async`
function — the framework needs it to be awaitable to turn into a network
call.

## 5. Why the file-level marker sits in `actions.ts`, not in `hotels.ts`/`bookings.ts`

File-level `"use server"` is all-or-nothing for that file's exports. Put it
on `hotels.ts` and `getHotels`, `getHotel`, _and_ `getHotelsInBounds` all
become independently network-reachable Server Actions — including the two
that no client component ever calls. Each export in a `"use server"` file is
its own callable endpoint regardless of who actually imports it.

So the split in this repo is deliberate:

- `src/api/hotels.ts`, `src/api/bookings.ts` — plain, undirected, server-only
  helpers. Called freely from Server Components. Nothing here is
  client-reachable.
- `src/app/actions.ts` — the _only_ file with `"use server"`. It re-exports
  thin wrappers for exactly the operations a Client Component needs to
  trigger: `submitBooking` (from `HotelForm`), `loadMoreHotels` (from
  `HotelList`'s scroll-triggered pagination), `loadHotelsInBounds` (from
  `HotelMap`'s pan/zoom-triggered refetch).

```ts
// src/api/bookings.ts — plain helper, not itself an action
export async function createBooking(body: CreateBookingDto): Promise<Booking> { ... }
```

```ts
// src/app/actions.ts — the action wrapper a Client Component actually calls
"use server";
import { createBooking } from "@/api/bookings";

export async function submitBooking(body: CreateBookingDto): Promise<Booking> {
  return createBooking(body);
}
```

`getBooking`, `getBookings`, `getBookingsByUser`, `getCurrentByHotel` stay in
`bookings.ts`, undirected, because every one of them is only ever called from
a Server Component (`booking/[bookingId]/page.tsx`, `bookings/page.tsx`,
`my-bookings/page.tsx`, `hotel/[hotelId]/page.tsx`). Marking the whole file
`"use server"` would have made them public for no reason.

## Quick reference

| You're writing...                                     | Directive               | Runs on server?                     | Runs in browser?                                                                                                                                 |
| ----------------------------------------------------- | ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A component, default                                  | none (Server Component) | ✅ always                           | ❌ never — output only                                                                                                                           |
| A component using state/effects/browser APIs          | `"use client"`          | ✅ once, for initial HTML           | ✅ hydrates, re-renders on interaction                                                                                                           |
| A helper function, called only from Server Components | none                    | ✅                                  | ❌ — and _must_ stay that way; importing it from a Client Component ships its real body to the browser and breaks anything server-only inside it |
| A function a Client Component needs to trigger        | `"use server"`          | ✅ (the real body always runs here) | 🔀 a generated stub ships instead of the real body; calling it makes a network request back to this same server code                             |

## The one-sentence version

`"use client"` decides where a _component_ lives (server-rendered once vs.
hydrated and interactive in the browser). `"use server"` decides whether a
_function_, when called from client code, ships its real body to the browser
(never — by design) or a network stub instead. Absence of either directive
isn't a safety rail; it's just the default, ordinary case — and for plain
functions, that default only stays server-only for as long as nothing
client-side imports them.
