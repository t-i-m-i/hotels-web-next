# 002 — Fix maplibre-gl's worker under Turbopack

## What we did

Fixed the map rendering blank (no tiles, no roads/labels — just markers and
zoom controls, or a bare raster background with no detail) on every page
that renders `HotelMap` in `next dev`.

## Root cause

maplibre-gl offloads tile parsing to a Web Worker, located via the standard
bundler pattern `new Worker(new URL('./maplibre-gl-worker.mjs', import.meta.url))`.
Turbopack (Next.js 16's default dev bundler) resolves that URL incorrectly —
in this app it collided with the `/map` route, so the browser fetched the
`/map` page's HTML instead of the worker's JS and rejected it (`Failed to
load module script: ... MIME type "text/html"`).

Sibling repos (`hotels` RN app doesn't use a browser bundler this way;
`hotels-alt-web-start`, which uses Vite) don't hit this because Vite resolves
the same `import.meta.url` pattern correctly. This is Turbopack-specific —
Next's own docs list a `turbopackWorkerAssetPrefix` config option for Web
Worker URLs, confirming worker-URL resolution is an known rough edge.

Without a working worker, the map object still half-initializes (markers,
camera, raster background render fine — those run on the main thread), but
all vector tile parsing (roads, buildings, labels) silently never happens.
No thrown error for that part — it just looks like a "sketched" map with no
detail, which is easy to mistake for a network/tile-server problem.

## Fix

- `src/components/HotelMap.tsx` calls `setWorkerUrl('/maplibre-gl-worker.mjs')`
  before constructing the `MapLibreMap`, bypassing Turbopack's broken
  `import.meta.url` resolution in favor of a static, self-hosted path.
- `public/maplibre-gl-worker.mjs` and `public/maplibre-gl-shared.mjs` —
  copied verbatim from `node_modules/maplibre-gl/dist/`. The worker bundle
  imports the shared chunk as a relative import (`./maplibre-gl-shared.mjs`),
  so both files have to be present or the worker 404s on its own dependency
  (`maplibre-gl-worker.mjs:5 GET .../maplibre-gl-shared.mjs 404`) — copying
  only the worker file isn't enough, which we found out the hard way.

## Non-obvious things / gotchas

- **These two `public/*.mjs` files are a vendored copy, not generated at
  build time.** They will silently drift out of sync if `maplibre-gl` is
  upgraded in `package.json` without re-running the copy — worth checking
  whenever bumping that dependency. See the comment above `setWorkerUrl(...)`
  in `HotelMap.tsx`.
- **A missing/broken map worker fails silently, not loudly.** The only
  visible symptom is "map looks incomplete" (raster background/markers
  render, vector detail doesn't) — there's no error surfaced in the map UI
  itself. The actual errors are worker-load errors in the console, easy to
  mistake for a tile-server/network issue since they look superficially
  similar to fetch failures.
- **This is dev-only as far as we've verified** — we haven't yet confirmed
  whether `next build && next start` (which may use a different
  Turbopack/webpack path for production) hits the same worker-resolution
  bug. Re-check after a production build before assuming this fix is only
  needed for `next dev`.
