# 001 — Scaffold the Next.js web port

## What we did

Scaffolded `hotels-web-next` as a third sibling repo alongside `hotels`
(Expo/RN) and `hotels-api` (NestJS), porting the RN app's functionality to
a Next.js 16 App Router app:

```
bunx create-next-app@latest hotels-web-next \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Then, mirroring `hotels`' architecture as closely as made sense for a
server-rendered app:

- `src/api/` — same three-piece shape as the RN app's API layer:
  `generated/schema.d.ts` (`openapi-typescript` output, committed),
  `client.ts` (`openapi-fetch` typed client), `hotels.ts` (`Hotel` type +
  `getHotels(search?)`/`getHotel(id)` wrappers). Same
  `generate:api-types` script reading `../hotels-api/docs/openapi.json` via
  a relative path.
- `src/components/HotelMap.tsx` — ported from the RN component's imperative
  camera logic (fit-bounds / fly-to-selected, custom +/− zoom buttons,
  min/max zoom 3–18) onto `maplibre-gl`'s vanilla web API.
- `src/utils/geo.ts` (`hotelToLngLat`, `boundsForHotels`) and
  `src/constants/map.ts` (style URL, zoom bounds, marker colors) ported
  verbatim from the RN app.
- Pages: `/` (list), `/map`, `/hotel/[hotelId]`, `/search` (stub),
  `/my-bookings` (stub) — one Server Component each, plus a `NavBar`
  Server Component in the root layout standing in for the RN app's native
  tab bar (a plain horizontal link row, no active-link highlighting yet).

## Non-obvious things / gotchas

- **No TanStack Query here — Server Components are the equivalent seam.**
  The RN app's `src/api/hooks/` layer doesn't have a web counterpart:
  pages `await getHotels()`/`getHotel()` directly. If "swap mocked → real
  data is a data-layer-only change" was the RN app's guiding principle,
  its Next.js translation is "swap what `src/api/hotels.ts` does under the
  hood without touching any page."
- **`HOTELS_API_URL`, not `EXPO_PUBLIC_API_URL`.** All fetches happen
  server-side inside Server Components/route handlers, never in the
  browser, so the env var deliberately has no `NEXT_PUBLIC_` prefix and is
  never sent to the client bundle. This is a real divergence from the RN
  app's naming, not an oversight — flagging it here so it doesn't read as
  a copy-paste mistake.
- **`hotels-api` and this app's dev server both default to port 3000.**
  Since the two need to run side by side locally, `dev`/`start` are pinned
  to `-p 3001` in `package.json` rather than leaving them to collide.
- **Don't gate marker/camera setup on the map's `'load'` event.** The first
  version of `HotelMap` waited for `'load'` before adding markers or calling
  `fitBounds`/`flyTo`, mirroring the RN component's `isMapReady` guard. On
  the web this event depends on the _entire_ style finishing (including
  glyphs/sprites), which can hang indefinitely on a flaky network — verified
  via a headless-browser check where terrain tiles rendered fine but
  `map.isStyleLoaded()` stayed `false` for 18+ seconds and no markers ever
  appeared. Markers and camera moves only need the map's transform, which is
  ready synchronously after construction, so the fix was to stop waiting for
  `'load'` entirely rather than add a timeout/fallback. Caught by an actual
  Playwright screenshot + marker-count check, not just "it typechecks" —
  worth remembering for the next thing that looks visually fine but isn't.
- **maplibre-gl's Marker API is imperative/DOM-based, not declarative.**
  The RN `HotelMap` renders `<Marker>` as JSX children of `<Map>`; the web
  SDK has no such API — markers are `new maplibregl.Marker().addTo(map)`
  calls, tracked in a ref array and explicitly `.remove()`d before
  recreating them on hotel/selection changes. This is the single biggest
  structural difference between the two `HotelMap` implementations.
- **maplibre-gl needs an explicitly-sized container or it renders blank.**
  The map page and detail page give the map div an explicit height
  (`h-[calc(100vh-...)]`) for exactly this reason — a `flex-1` div without
  a resolved height silently produces an empty map.
- **`notFound()` for a missing hotel id, not an inline error message.**
  The RN detail screen has no real 404 concept (it's a single-stack app);
  this app uses Next's built-in `notFound()` for an invalid `hotelId`,
  which is a legitimate platform idiom here, not scope creep beyond the RN
  behavior.
- **Search is a genuinely inert stub, matching the RN app exactly.** The
  `<input>` on `/search` has no `onChange`, no state, no `'use client'` —
  it doesn't filter anything, on purpose, even though `GET /hotels?search=`
  already works server-side and would be trivial to wire up. Confirmed
  with the user this should match RN's current stub state rather than get
  ahead of it.
- **`openapi-fetch`'s success `data` can still be typed `undefined`.**
  Same gotcha as `hotels/docs/logs/002-typed-api-layer.md`: both
  `getHotels()` and `getHotel()` have to check `error || !data` rather than
  just `if (error) throw error; return data;` — it'll bite again
  independently if a future wrapper function skips the check.

## Env / setup

New files: `.env.example` / `.env.local` (`HOTELS_API_URL=http://localhost:3000`),
already covered by the scaffold's existing `.env*` gitignore pattern.
Requires `hotels-api` running locally (`bun run start:dev` in that repo) for
any page to load real data — no mock/offline fallback.
