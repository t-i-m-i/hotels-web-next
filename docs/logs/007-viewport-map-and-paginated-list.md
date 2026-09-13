# 007 — Paginated list + viewport-driven map

Cross-repo change (`hotels-api`, `hotels`, `hotels-web-next`). `GET /hotels`
now returns a page (`{ data, meta: { pagination } }`, default `pageSize: 20`,
max `80`) instead of the whole table, which broke the hotel list (only the
first 20 showed, no way to see more) and the map (`/map` and the hotel detail
page's "nearby" pins) here on web.

## What changed

- `src/api/hotels.ts`: `getHotels(search?, page?, pageSize?)` now returns
  `PaginatedHotels`; added `getHotelsInBounds(bounds, search?)` hitting the
  new `GET /hotels/within-bounds` endpoint.
- `src/utils/geo.ts`: added the `Bounds` tuple (`[west, south, east, north]`)
  and `bboxAround(center, radiusKm)` for seeding a bbox around a single
  hotel. `boundsForHotels` now returns `undefined` for an empty hotel array
  instead of `[Infinity, ...]`/`NaN` from `Math.max()` on nothing.
- `src/app/actions.ts` (new): server actions `loadMoreHotels` and
  `loadHotelsInBounds` — the client-side entry points into the
  Server-Component-only data layer (`HotelList`'s "load more" and
  `HotelMap`'s pan/zoom refetch both need to trigger a fetch from a Client
  Component; per `AGENTS.md` there's no client-fetching hook layer, so these
  are the sanctioned way in).
- `src/components/HotelList.tsx` (new, `'use client'`): renders the first
  page (passed down from the Server Component page) and calls
  `loadMoreHotels` via an `IntersectionObserver` sentinel as the RN
  equivalent's `onEndReached`.
- `src/components/HotelMap.tsx`: added viewport refetching — debounced
  (350ms) `moveend` handler calls `loadHotelsInBoundsAction`, with a
  monotonic request id so a stale response from an earlier pan can't
  clobber a newer one. Accepts an optional `search` prop threaded through to
  the bounds query — plumbing for a future map search box, unused by any UI
  today.
- `src/app/page.tsx`: renders `HotelList` with the first page fetched
  server-side.
- `src/app/map/page.tsx`: seeds `HotelMap` with `getHotelsInBounds(DEFAULT_MAP_BOUNDS)`
  instead of the full table.
- `src/app/hotel/[hotelId]/page.tsx`: seeds nearby pins with
  `getHotelsInBounds(bboxAround(hotel.geo, 25 /* km */))` instead of every
  hotel; force-includes the selected hotel if the bbox/cap ever drops it.

## Gotchas

- Prettier's `--write .` (no path args) reformatted unrelated already-dirty
  files across the repo on this pass — reverted those before committing to
  keep this diff scoped to the feature.
