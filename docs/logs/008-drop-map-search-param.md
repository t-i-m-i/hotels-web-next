# 008 — Drop unused `search` param from map viewport queries

`getHotelsInBounds`/`loadHotelsInBounds`/`HotelMap`'s `search` prop were
speculative plumbing for a map search box that was never built and isn't
planned — neither `/map` nor the hotel detail map has a search input.
Removed per "keep the codebase simple, no future-maybe-useful code."

## What changed

- `src/api/hotels.ts#getHotelsInBounds`: dropped the `search` param.
- `src/app/actions.ts#loadHotelsInBounds`: same.
- `src/components/HotelMap.tsx`: dropped the `search` prop; `refetchForViewport`
  now only depends on `loadHotelsInBoundsAction`.
- `src/api/generated/schema.d.ts` regenerated (backing `/hotels/within-bounds`
  API no longer accepts `search`, see `hotels-api`'s
  `009-drop-within-bounds-search.md`).

`getHotels(search, page)` / `loadMoreHotels` (the list page's real, working
search box) are untouched.
