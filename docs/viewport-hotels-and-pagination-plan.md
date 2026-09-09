# Plan: paginated list on scroll + viewport (bbox) hotel loading

Cross-repo plan for `hotels-api`, `hotels` (React Native) and `hotels-web-next`.
Written to be implemented by hand; each step explains the *why* and shows
reference code you can adapt. Names (`within-bounds`, `getHotelsInBounds`, …)
are suggestions — rename freely, just keep them consistent across repos.

---

## 1. Why we are here

The API used to return the **whole** hotel table from `GET /hotels`. It now
returns a **page** (`{ data, meta: { pagination } }`, default `pageSize: 20`,
max `80`). Two things broke as a result:

| Surface | Before | Now | Fix in this plan |
| --- | --- | --- | --- |
| List (`/`, RN home tab) | one request, all hotels | only first 20 shown, no way to see more | load pages on scroll |
| `/map` (all hotels) | all pins | 20 pins | load pins for the **visible map area**, refetch on pan/zoom |
| `hotel/[hotelId]` map | all hotels shown around the selected one ("nearby") | 20 arbitrary hotels, often not near | seed with a bbox around the hotel, then behave like `/map` |

RN already loads the list correctly (`useHotels` uses `useInfiniteQuery` with
`onEndReached`). RN's `/map` uses `useAllHotels`, which **drains every page on
mount** — an explicit stopgap. Its own TODO already sketches the fix:

> `TODO: replace with a viewport query, e.g. GET /hotels?swLat=&swLng=&neLat=&neLng=`
> `driven by the map's onRegionChangeComplete. Hotels already carry geo, so the`
> `API only needs the bounds params — no new data.`

That is exactly what we are building, plus the web equivalent.

---

## 2. Open decisions (resolve before/while implementing)

1. **Endpoint shape** — recommended: a **new** `GET /hotels/within-bounds`
   returning a plain (capped) `HotelDto[]`, *not* extending `GET /hotels` with
   bbox params. A viewport result is naturally bounded ("give me every pin in
   view"), so mixing it with page/pageSize semantics on one route just muddies
   both. Downside: one more route.
2. **Cap vs. paginate the bbox result** — recommended: hard `LIMIT` (e.g. 500)
   with no pagination. At current data size the cap will never bite; when it
   might, that is the signal to add clustering, not paging.
3. **`hotel/[hotelId]` map behaviour** — recommended: make it viewport-aware
   like `/map` (seeded with a bbox around the hotel). This *changes* RN's detail
   map, which today shows only the single hotel (`hotels={[hotel]}`). Per the
   "keep RN and web in sync" convention, decide whether RN adopts this too or we
   deliberately diverge and note it.
4. **Web list: infinite scroll vs. "Load more" button** — plan below uses an
   `IntersectionObserver` sentinel (matches RN's `onEndReached`). A button is a
   simpler, more accessible fallback and uses the *same* server action; swap the
   trigger, keep the rest.

---

## 3. Shared conventions

- **Bounds tuple everywhere:** `[west, south, east, north]` (lng/lat order).
  This already matches `utils/geo.ts#boundsForHotels` in both client repos and
  `@maplibre/maplibre-react-native`'s `LngLatBounds` type
  (`[west, south, east, north]`). MapLibre GL JS's `map.getBounds().toArray()`
  gives `[[west, south], [east, north]]` — flatten it.
- **Query params on the wire:** `swLat, swLng, neLat, neLng` (+ optional
  `search`). `sw` = `(south, west)`, `ne` = `(north, east)`.
- Type alias, add to `utils/geo.ts` in both client repos:
  ```ts
  export type Bounds = [west: number, south: number, east: number, north: number];
  ```

---

## 4. `hotels-api` — new viewport endpoint

Stack recap: NestJS, raw `pg` `Pool` (no ORM, no PostGIS), `class-validator` +
`class-transformer`, global `ValidationPipe({ whitelist: true, transform: true })`,
`@nestjs/swagger` decorators drive `docs/openapi.json`.

### 4.1 Query DTO — `src/hotels/dto/hotels-within-bounds-query.dto.ts`

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class HotelsWithinBoundsQueryDto {
  @ApiProperty({ example: 41.0, description: 'South-west corner latitude' })
  @Type(() => Number) // "41.0" -> 41.0 (query params are strings)
  @IsNumber()
  @Min(-90)
  @Max(90)
  swLat!: number;

  @ApiProperty({ example: 2.0, description: 'South-west corner longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  swLng!: number;

  @ApiProperty({ example: 41.6, description: 'North-east corner latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  neLat!: number;

  @ApiProperty({ example: 2.4, description: 'North-east corner longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  neLng!: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive filter matched against name and location',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
```

**Gotcha — don't use `@IsLatitude()` / `@IsLongitude()` here.** They look
right, but when the map is zoomed out the client's visible bounds legitimately
exceed ±90 / ±180, and those validators would 422 a perfectly reasonable
request. `@Min/@Max` + clamping in SQL (below) is the pragmatic choice; a
zoomed-out map just means "return everything", which the clamp produces
naturally.

### 4.2 Response type

Reuse `HotelDto`. The endpoint returns `HotelDto[]` — no wrapper, no `meta`.
That keeps "this is a bounded snapshot, not a pageable collection" legible in
the contract.

### 4.3 Service — `src/hotels/hotels.service.ts`

Add alongside `findAll` / `findOne`:

```ts
async findWithinBounds(
  bounds: { swLat: number; swLng: number; neLat: number; neLng: number },
  search?: string,
): Promise<HotelDto[]> {
  // Clamp latitude to the valid range so a zoomed-out map ("neLat: 140")
  // degrades to "everything" instead of returning nothing.
  const latLo = Math.max(-90, Math.min(bounds.swLat, bounds.neLat));
  const latHi = Math.min(90, Math.max(bounds.swLat, bounds.neLat));

  // Longitude: normal case is swLng <= neLng. A viewport straddling the
  // antimeridian (±180) arrives as swLng > neLng and means
  // "longitude >= swLng OR longitude <= neLng". Our data is all in Europe so
  // this branch is dead today, but it's one line and avoids a silent empty
  // result if that ever changes.
  const crossesAntimeridian = bounds.swLng > bounds.neLng;
  const lonClause = crossesAntimeridian
    ? '(longitude >= $3 OR longitude <= $4)'
    : 'longitude BETWEEN $3 AND $4';

  const sql = /*sql*/ `
    SELECT id, name, description, location, latitude, longitude
    FROM hotels
    WHERE latitude BETWEEN $1 AND $2
      AND ${lonClause}
      AND ($5::text IS NULL OR name ILIKE '%' || $5 || '%' OR location ILIKE '%' || $5 || '%')
    ORDER BY name
    LIMIT 500`;

  const { rows } = await this.pool.query<HotelRow>(sql, [
    latLo,
    latHi,
    bounds.swLng,
    bounds.neLng,
    search ?? null,
  ]);

  return rows.map(toHotelDto);
}
```

Notes:
- `toHotelDto` and `HotelRow` already exist in this file — reuse them.
- `LIMIT 500` is the decision-2 cap. If you later want to know you're clipping,
  `SELECT ... , count(*) OVER() AS total_in_bounds` and log when `total > 500`.
- **Index (optional, future):** at 5–1000 rows a seq scan is fine. If the table
  grows, add `CREATE INDEX hotels_lat_lng_idx ON hotels (latitude, longitude);`
  via `bun run migrate:create -j sql`. True geo scaling would be PostGIS +
  a `GEOGRAPHY` column + GiST index, but that's a separate project.

### 4.4 Controller — `src/hotels/hotels.controller.ts`

```ts
@Get('within-bounds')
@ApiOkResponse({ type: HotelDto, isArray: true })
findWithinBounds(
  @Query() query: HotelsWithinBoundsQueryDto,
): Promise<HotelDto[]> {
  return this.hotelsService.findWithinBounds(query, query.search);
}
```

**Gotcha — route order.** This must be declared **above** the existing
`@Get(':id')`. Nest/Express match in declaration order, so with `:id` first a
request to `/hotels/within-bounds` would be handled by `findOne('within-bounds')`
and 404 as "hotel not found".

### 4.5 Tests — `src/hotels/hotels.service.spec.ts` (+ controller spec)

There are no hotels specs yet; follow `src/bookings/bookings.service.spec.ts` /
`bookings.controller.spec.ts` for the mock-`PG_POOL` pattern. Cover:

- **service:** builds the `BETWEEN` clause and passes `[latLo, latHi, swLng, neLng, null]`;
  clamps `neLat > 90` to `90`; swaps inverted lat inputs; switches to the
  `OR` clause when `swLng > neLng`; forwards `search`; maps rows via `toHotelDto`.
- **controller:** `transform: true` turns string query params into numbers;
  out-of-range (`swLat: 200`) → 400; `within-bounds` resolves to
  `findWithinBounds`, not `findOne`.

### 4.6 Regenerate the contract

```bash
bun run generate:openapi     # rewrites docs/openapi.json
```

Commit `docs/openapi.json` in the same change — both client repos codegen from
that file, not from a running server.

---

## 5. `hotels-web-next` — implementation

Architecture reminder (`AGENTS.md`): **Server Components fetch directly; no
client-side data-fetching hook layer.** The one sanctioned exception is
"client-triggered refetching that URL-driven navigation can't express" — which
is exactly *load-more-on-scroll* and *refetch-on-map-pan*. We satisfy it with
**Server Actions** (already the pattern in `src/api/bookings.ts`), not by
reintroducing TanStack Query.

### 5.1 Pick up the new endpoint

```bash
bun run generate:api-types   # reads ../hotels-api/docs/openapi.json
```

`src/api/generated/schema.d.ts` gains the `/hotels/within-bounds` path.

### 5.2 API wrappers — `src/api/hotels.ts`

Keep `getHotels` paginated as-is. Add:

```ts
import type { Bounds } from "@/utils/geo";

export async function getHotelsInBounds(
  bounds: Bounds,
  search?: string,
): Promise<Hotel[]> {
  const [swLng, swLat, neLng, neLat] = bounds;
  const { data, error } = await apiClient.GET("/hotels/within-bounds", {
    params: { query: { swLat, swLng, neLat, neLng, search } },
  });
  if (error || !data) {
    throw error ?? new Error("Failed to load hotels in bounds");
  }
  return data;
}
```

This file stays a plain server-only module (no `"use server"`), same as today —
it's called by Server Components and by the actions below.

### 5.3 Server Actions — `src/app/actions.ts` (new)

```ts
"use server";

import { getHotels, getHotelsInBounds, type Hotel, type PaginatedHotels } from "@/api/hotels";
import type { Bounds } from "@/utils/geo";

export async function loadMoreHotels(
  page: number,
  search?: string,
): Promise<PaginatedHotels> {
  return getHotels(search, page);
}

export async function loadHotelsInBounds(
  bounds: Bounds,
  search?: string,
): Promise<Hotel[]> {
  return getHotelsInBounds(bounds, search);
}
```

Server Actions are POST RPC endpoints; the API base URL and any credentials
stay on the server. Client components import these directly, or receive them as
props from a Server Component — both work in Next 16.

### 5.4 Infinite-scroll list

**Current:** `src/app/page.tsx` (Server Component) awaits `getHotels`, renders
*all* `hotels.data` inside `<HotelSearchSection>` (a client wrapper that renders
`<Search>` + dims children while a search transition is pending).

**Change:** page 1 is still SSR'd; a new client component owns the accumulated
list and appends pages via `loadMoreHotels`.

#### `src/components/HotelList.tsx` (new, client)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { loadMoreHotels } from "@/app/actions";
import type { Hotel, PaginatedHotels } from "@/api/hotels";
import HotelCard from "@/components/HotelCard";

export default function HotelList({
  initialData,
  search,
}: {
  initialData: PaginatedHotels;
  search?: string;
}) {
  const [hotels, setHotels] = useState<Hotel[]>(initialData.data);
  const [page, setPage] = useState(initialData.meta.pagination.page);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const { pageCount } = initialData.meta.pagination;
  const hasNextPage = page < pageCount;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsLoading(true);
        setError(false);
        try {
          const next = await loadMoreHotels(page + 1, search);
          setHotels((prev) => [...prev, ...next.data]);
          setPage(next.meta.pagination.page);
        } catch {
          setError(true);
        } finally {
          setIsLoading(false);
        }
      },
      { rootMargin: "600px" }, // start fetching before the sentinel is on screen
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isLoading, page, search]);

  if (hotels.length === 0) {
    return <p className="text-neutral-600">No hotels found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {hotels.map((hotel) => (
        <HotelCard key={hotel.id} hotel={hotel} />
      ))}

      {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {isLoading && <p className="py-4 text-center text-neutral-500">Loading…</p>}
      {error && (
        <button
          onClick={() => setError(false) /* re-arms the observer effect */}
          className="py-4 text-center text-sm text-blue-600"
        >
          Couldn&apos;t load more — retry
        </button>
      )}
    </div>
  );
}
```

#### `src/app/page.tsx` (rework)

```tsx
import Link from "next/link";

import { getHotels } from "@/api/hotels";
import HotelList from "@/components/HotelList";
import HotelSearchSection from "@/components/HotelSearchSection";

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { search } = await searchParams;
  const normalizedSearch = Array.isArray(search) ? search[0] : search;

  const initialData = await getHotels(normalizedSearch); // page 1, SSR

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/map" className="text-sm font-medium text-blue-600">
        View all on map
      </Link>

      <HotelSearchSection>
        {/* key: when the search term changes the URL, the Server Component
            re-renders with a fresh page-1 `initialData`. Keying on the term
            forces HotelList to remount so its accumulated pages reset instead
            of appending onto stale results. */}
        <HotelList
          key={normalizedSearch ?? ""}
          initialData={initialData}
          search={normalizedSearch}
        />
      </HotelSearchSection>
    </div>
  );
}
```

`HotelSearchSection` and `Search` are unchanged. The pending-dim still works:
`Search` calls `router.replace` inside a transition, the Server Component
re-renders, `HotelList` remounts via `key`.

**Optional:** add `src/app/loading.tsx` for a first-load skeleton (the page now
does one blocking `getHotels` before streaming).

**Simpler variant:** drop the `IntersectionObserver`; render a `<button>Load
more</button>` that runs the same `loadMoreHotels` call. Keeps everything else.

### 5.5 Viewport-aware map

`src/components/HotelMap.tsx` becomes stateful: seeded with SSR hotels, then it
refetches its own markers whenever the map settles.

#### geo helper — `src/utils/geo.ts`

```ts
export type Bounds = [west: number, south: number, east: number, north: number];

/** Square-ish bbox ~radiusKm around a point. Rough (flat-earth) but fine for
 *  seeding a city-scale map view. */
export function bboxAround(
  center: { latitude: number; longitude: number },
  radiusKm: number,
): Bounds {
  const latDelta = radiusKm / 111; // ~111 km per degree of latitude
  const lonDelta =
    radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return [
    center.longitude - lonDelta,
    center.latitude - latDelta,
    center.longitude + lonDelta,
    center.latitude + latDelta,
  ];
}
```

#### constants — `src/constants/map.ts`

```ts
// Fallback view for /map before the map reports real bounds (roughly western
// + central Europe, where all seed hotels are).
export const DEFAULT_MAP_BOUNDS: Bounds = [-10, 35, 20, 55];
```

#### `HotelMap.tsx` changes

```tsx
"use client";
// ...existing maplibre imports / setWorkerUrl...
import { useCallback, useEffect, useRef, useState } from "react";
import type { Bounds } from "@/utils/geo";

export default function HotelMap({
  initialHotels,
  loadHotelsInBoundsAction,
  selectedHotelId,
  search,
}: {
  initialHotels: Hotel[];
  loadHotelsInBoundsAction: (bounds: Bounds, search?: string) => Promise<Hotel[]>;
  selectedHotelId?: string;
  search?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);

  // Monotonic request id: drop responses that come back after a newer pan.
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refetchForViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const [[west, south], [east, north]] = map.getBounds().toArray();
      const myId = ++reqIdRef.current;
      try {
        const next = await loadHotelsInBoundsAction(
          [west, south, east, north],
          search,
        );
        if (myId === reqIdRef.current) setHotels(next);
      } catch {
        /* keep the pins we have */
      }
    }, 350);
  }, [loadHotelsInBoundsAction, search]);

  // create map once
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: boundsForHotels(initialHotels.length ? initialHotels : undefined) ?? DEFAULT_MAP_BOUNDS,
      fitBoundsOptions: { padding: 60 },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    mapRef.current = map;
    map.on("moveend", refetchForViewport); // fires after pan AND zoom settle
    return () => {
      clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map created once
  }, []);

  // keep the moveend handler's closure current if `search` changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.off("moveend", refetchForViewport);
    map.on("moveend", refetchForViewport);
    return () => map.off("moveend", refetchForViewport);
  }, [refetchForViewport]);

  // markers: now driven by `hotels` state, not a prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const selected = hotels.find((h) => h.id === selectedHotelId);

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = hotels.map((hotel) =>
      new Marker({
        color:
          hotel.id === selected?.id
            ? SELECTED_MARKER_COLOR
            : DEFAULT_MARKER_COLOR,
      })
        .setLngLat(hotelToLngLat(hotel))
        .addTo(map),
    );

    // Only fly to the selection on the detail page. On /map, don't fight the
    // user's pan — the fitBounds-on-every-render behaviour goes away.
    if (selected) {
      map.flyTo({ center: hotelToLngLat(selected), zoom: 14, duration: 1200 });
    }
  }, [hotels, selectedHotelId]);

  // ...unchanged JSX (container div + zoom buttons)...
}
```

Key behavioural changes to be aware of:
- The old `fitBounds(boundsForHotels(hotels))` on *every* `hotels` change is
  gone for `/map` — otherwise each viewport refetch would yank the camera back.
  Initial framing is done once via the constructor `bounds`.
- First `/map` paint shows the SSR pins for `DEFAULT_MAP_BOUNDS`; the first
  `moveend` (which fires once after the initial fit) replaces them with the
  real viewport set. That's the Google-Maps feel — pins update as you move.
- `boundsForHotels` currently throws `Math.min(...[])` → `Infinity` on an empty
  array. Guard it (return `undefined`) or always pass a non-empty seed.

#### `src/app/map/page.tsx`

```tsx
import { getHotelsInBounds } from "@/api/hotels";
import { loadHotelsInBounds } from "@/app/actions";
import HotelMap from "@/components/HotelMap";
import { DEFAULT_MAP_BOUNDS } from "@/constants/map";

export default async function MapPage() {
  const hotels = await getHotelsInBounds(DEFAULT_MAP_BOUNDS);

  return (
    <div className="h-[calc(100vh-3.25rem)] w-full">
      <HotelMap
        initialHotels={hotels}
        loadHotelsInBoundsAction={loadHotelsInBounds}
      />
    </div>
  );
}
```

#### `src/app/hotel/[hotelId]/page.tsx`

Switch the existence check to `getHotel` (the single-resource endpoint that
returns a real 404) and seed the map with a bbox around the hotel:

```tsx
import { notFound } from "next/navigation";

import { getHotel, getHotelsInBounds } from "@/api/hotels";
import { getCurrentByHotel } from "@/api/bookings";
import { loadHotelsInBounds } from "@/app/actions";
import { bboxAround } from "@/utils/geo";
import HotelMap from "@/components/HotelMap";
import { HotelForm } from "@/components/HotelForm";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;

  const hotel = await getHotel(hotelId).catch(() => null);
  if (!hotel) notFound();

  const [nearby, bookings] = await Promise.all([
    getHotelsInBounds(bboxAround(hotel.geo, 25 /* km */)),
    getCurrentByHotel(hotelId),
  ]);

  // Guarantee the selected hotel is present even if the cap/bbox dropped it.
  const initialHotels = nearby.some((h) => h.id === hotel.id)
    ? nearby
    : [hotel, ...nearby];

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-[calc(100vh-3rem)] w-full">
        <div className="absolute left-4 top-4 z-10 w-1/4 rounded-lg bg-background p-4">
          <HotelForm hotel={hotel} bookings={bookings} />
        </div>
        <HotelMap
          initialHotels={initialHotels}
          loadHotelsInBoundsAction={loadHotelsInBounds}
          selectedHotelId={hotelId}
        />
      </div>
    </div>
  );
}
```

This restores "hotels near this one" and, because `HotelMap` now listens for
`moveend`, panning the detail map loads more of the area — same component, no
special-casing.

### 5.6 Log entry

Add `docs/logs/007-viewport-hotels-and-scroll-pagination.md` once done: the
contract change that forced it, the Server-Actions-not-query-lib decision, the
`moveend` debounce + stale-response guard, and the `boundsForHotels` empty-array
gotcha.

---

## 6. `hotels` (React Native)

### 6.1 Pick up the new endpoint

```bash
bun run generate:api-types
```

### 6.2 API wrapper — `src/api/hotels.ts`

```ts
import type { Bounds } from "@/utils/geo";

export async function getHotelsInBounds(
  bounds: Bounds,
  search?: string,
): Promise<Hotel[]> {
  const [swLng, swLat, neLng, neLat] = bounds;
  const { data, error } = await apiClient.GET("/hotels/within-bounds", {
    params: { query: { swLat, swLng, neLat, neLng, search } },
  });
  if (error || !data) {
    throw error ?? new Error("Failed to load hotels in bounds");
  }
  return data;
}
```

Add the `Bounds` alias to `src/utils/geo.ts` (same as web).

### 6.3 Hook — `src/api/hooks/useHotels.ts`

**Delete `useAllHotels`.** Replace with a viewport query:

```ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getHotelsInBounds } from "@/api/hotels";
import type { Bounds } from "@/utils/geo";

export function useHotelsInBounds(bounds: Bounds | null, search?: string) {
  const normalized = search?.trim() || undefined;

  const { data, isLoading, isError } = useQuery({
    // Round the key so sub-pixel pans don't spawn a new request per frame.
    queryKey: [
      "hotels",
      "bounds",
      bounds?.map((n) => Number(n.toFixed(3))),
      normalized,
    ],
    queryFn: () => getHotelsInBounds(bounds!, normalized),
    enabled: bounds !== null,
    placeholderData: keepPreviousData, // hold old pins while the next set loads
    staleTime: 1000 * 30,
  });

  return { hotels: data ?? [], isLoading, isError };
}
```

`useHotels` (the infinite list) is already correct — **leave it alone**. The
list regression was web-only.

### 6.4 `src/components/HotelMap.tsx`

The `onRegionDidChange` event already carries the viewport bounds in the tuple
shape we want. From the installed `@maplibre/maplibre-react-native@^11`:
`ViewStateChangeEvent.bounds: LngLatBounds` where
`LngLatBounds = [west, south, east, north]`.

Add an optional callback prop and fire it debounced:

```tsx
export default function HotelMap({
  hotels,
  selectedHotelId,
  onBoundsChange, // NEW — omit on the detail screen to keep single-hotel behaviour
}: {
  hotels: Hotel[];
  selectedHotelId?: string;
  onBoundsChange?: (bounds: Bounds) => void;
}) {
  const boundsDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleRegionDidChange = (
    e: NativeSyntheticEvent<ViewStateChangeEvent>,
  ) => {
    setZoom(e.nativeEvent.zoom); // existing behaviour
    if (!onBoundsChange) return;
    clearTimeout(boundsDebounce.current);
    const bounds = e.nativeEvent.bounds; // [west, south, east, north]
    boundsDebounce.current = setTimeout(() => onBoundsChange(bounds), 350);
  };
  // ...
  // <Map ... onRegionDidChange={handleRegionDidChange}>
}
```

When `onBoundsChange` is passed, also drop the `fitBounds(boundsForHotels(hotels))`
effect branch (same reason as web — it would fight the user's pan). Keep the
`flyTo(selectedHotel)` branch.

### 6.5 `src/app/(tabs)/map.tsx`

```tsx
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useHotelsInBounds } from "@/api/hooks/useHotels";
import HotelMap from "@/components/HotelMap";
import type { Bounds } from "@/utils/geo";

export default function MapScreen() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const { hotels, isError } = useHotelsInBounds(bounds);

  if (isError) {
    return (
      <View style={styles.center}>
        <Text>Couldn&apos;t load hotels.</Text>
      </View>
    );
  }

  // No full-screen spinner: the map renders immediately and pins stream in
  // after the first onRegionDidChange settles (bounds starts null).
  return <HotelMap hotels={hotels} onBoundsChange={setBounds} />;
}
```

UX change to note in the RN log: `/map` no longer shows a blocking spinner
while every page drains; it shows the map right away and pins appear once the
viewport is known.

### 6.6 `hotel/[hotelId].tsx` (decision 3)

- **If we keep parity with web:** fetch nearby via `getHotelsInBounds(bboxAround(hotel.geo, 25))`
  (a `useQuery`, or a new `useNearbyHotels(hotel)` hook), pass to
  `<HotelMap hotels={nearby} selectedHotelId={hotelId} onBoundsChange={...} />`.
- **If we deliberately diverge:** leave `hotels={[hotel]}` and record in both
  repos' logs that detail-map "nearby" is web-only for now.

### 6.7 Cleanup

- Remove the now-unused `useEffect`/`fetchNextPage` drain and the `useAllHotels`
  export.
- `grep` for `useAllHotels` — only `(tabs)/map.tsx` imports it today.

---

## 7. Sequencing

```
1. hotels-api
   └─ DTO + service + controller (route BEFORE :id) + specs
   └─ bun run generate:openapi  → commit docs/openapi.json
2. Regenerate types in both clients from the committed openapi.json
   ├─ hotels-web-next:  bun run generate:api-types
   └─ hotels:           bun run generate:api-types
3. hotels-web-next and hotels — independent, do in parallel
   ├─ web:  api wrapper → actions.ts → HotelList → page.tsx → HotelMap → map/detail pages
   └─ RN:   api wrapper → useHotelsInBounds → HotelMap prop → map.tsx → delete useAllHotels
4. Logs in each repo. Keep the "RN ⇄ web in sync" note honest re: decision 3.
```

The API is the only hard dependency. `generate:api-types` reads the committed
`docs/openapi.json`, so `hotels-api` does **not** need to be running for client
codegen (it does need to boot for `generate:openapi` itself).

---

## 8. Test checklist

**hotels-api**
- [ ] `GET /hotels/within-bounds?swLat=41&swLng=2&neLat=42&neLng=2.5` → only in-box hotels
- [ ] string params coerced to numbers; `swLat=200` → 400
- [ ] `neLat=140` clamps to 90 (no empty result when zoomed out)
- [ ] `swLng=170&neLng=-170` uses the `OR` clause
- [ ] `search` still filters within the box
- [ ] `/hotels/within-bounds` not swallowed by `/hotels/:id`
- [ ] `LIMIT` cap holds

**hotels-web-next**
- [ ] `/` shows page 1, scrolling appends pages, stops at `pageCount`
- [ ] searching resets the list (no append onto stale results)
- [ ] failed "load more" shows retry, retry works
- [ ] `/map` shows pins, panning/zooming swaps them after ~350ms
- [ ] fast consecutive pans don't leave stale pins (reqId guard)
- [ ] camera doesn't jump back on refetch
- [ ] `hotel/[hotelId]` shows the selected hotel + neighbours; bad id → `not-found`
- [ ] `bun run type-check`, `bun run lint`

**hotels**
- [ ] home list scroll unchanged (regression check)
- [ ] `/map` renders immediately, pins load after settle, update on pan/zoom
- [ ] `keepPreviousData` keeps old pins visible during refetch
- [ ] detail screen matches decision 3
- [ ] `useAllHotels` fully removed
