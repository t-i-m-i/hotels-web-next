"use client";

import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

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
  DEFAULT_MARKER_COLOR,
  MAP_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  SELECTED_MARKER_COLOR,
} from "@/constants/map";
import { boundsForHotels, hotelToLngLat } from "@/utils/geo";

export default function HotelMap({
  hotels,
  selectedHotelId,
}: {
  hotels: Hotel[];
  selectedHotelId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

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

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: boundsForHotels(hotels),
      fitBoundsOptions: { padding: 60 },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once on mount
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const selectedHotel = hotels.find((hotel) => hotel.id === selectedHotelId);

    // Markers and camera moves only need the map's transform, not a fully
    // loaded style (glyphs/sprites can take a while, or never finish, but
    // that doesn't block positioning markers or moving the camera).
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = hotels.map((hotel) =>
      new Marker({
        color:
          hotel.id === selectedHotel?.id
            ? SELECTED_MARKER_COLOR
            : DEFAULT_MARKER_COLOR,
      })
        .setLngLat(hotelToLngLat(hotel))
        .addTo(map),
    );

    if (selectedHotel) {
      map.flyTo({
        center: hotelToLngLat(selectedHotel),
        zoom: 14,
        duration: 1200,
      });
    } else {
      map.fitBounds(boundsForHotels(hotels), {
        padding: 60,
        duration: 1200,
      });
    }
  }, [hotels, selectedHotelId]);

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
