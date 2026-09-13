"use client";

import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";

// Turbopack's dev-mode bundling of maplibre-gl's `new Worker(new URL(...,
// import.meta.url))` resolves to the wrong path (observed colliding with
// this app's own /map route, returning HTML instead of the worker script).
// Point at the prebuilt worker bundle we self-host instead: public/maplibre-gl-worker.mjs
// + public/maplibre-gl-shared.mjs (the worker's own dependency), both copied
// verbatim from node_modules/maplibre-gl/dist/. Must be re-copied whenever
// the maplibre-gl version in package.json changes, or the worker can silently
// go stale relative to the main bundle.
setWorkerUrl("/maplibre-gl-worker.mjs");

import type { Hotel } from "@/api/hotels";
import {
  DEFAULT_MAP_BOUNDS,
  DEFAULT_MARKER_COLOR,
  MAP_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  SELECTED_MARKER_COLOR,
} from "@/constants/map";
import { Bounds, boundsForHotels, hotelToLngLat } from "@/utils/geo";

export default function HotelMap({
  initialHotels,
  loadHotelsInBoundsAction,
  selectedHotelId,
}: {
  initialHotels: Hotel[];
  loadHotelsInBoundsAction: (bounds: Bounds) => Promise<Hotel[]>;
  selectedHotelId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const hotelsRef = useRef<Hotel[]>(initialHotels);

  const handleZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, map.getZoom() + delta),
    );
    map.zoomTo(nextZoom, { duration: 200 });
  };

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
        const next = await loadHotelsInBoundsAction([west, south, east, north]);
        if (myId === reqIdRef.current) setHotels(next);
      } catch {
        /* keep the pins we have */
      }
    }, 350);
  }, [loadHotelsInBoundsAction]);

  // create map once
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: boundsForHotels(initialHotels) ?? DEFAULT_MAP_BOUNDS,
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

  // keep the moveend handler's closure current if `refetchForViewport` changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.off("moveend", refetchForViewport);
    map.on("moveend", refetchForViewport);
    return () => {
      map.off("moveend", refetchForViewport);
    };
  }, [refetchForViewport]);

  // markers: redraw on every `hotels` update (mount + each viewport refetch).
  // No camera movement here — a live map's marker set changes constantly as
  // you pan/zoom, and flying the camera every time would fight your own
  // gesture (see the flyTo effect below for why that used to happen).
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
  }, [hotels, selectedHotelId]);

  // Fly to the selected hotel once, when the selection itself changes — not
  // on every `hotels` update. Reading the list from a ref (instead of adding
  // `hotels` to the dependency array) is what keeps this from re-firing after
  // each viewport refetch; that was the bug where zooming on the detail page
  // snapped the camera back to zoom 14 a moment later.
  useEffect(() => {
    hotelsRef.current = hotels;
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHotelId) return;
    const selected = hotelsRef.current.find((h) => h.id === selectedHotelId);
    if (!selected) return;
    map.flyTo({ center: hotelToLngLat(selected), zoom: 14, duration: 1200 });
  }, [selectedHotelId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-4 bottom-10 overflow-hidden rounded-lg bg-white shadow-md">
        <button
          type="button"
          onClick={() => handleZoom(1)}
          className="flex h-10 w-10 items-center justify-center text-xl font-semibold text-neutral-800 hover:bg-neutral-100"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="h-px bg-neutral-300" />
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          className="flex h-10 w-10 items-center justify-center text-xl font-semibold text-neutral-800 hover:bg-neutral-100"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
