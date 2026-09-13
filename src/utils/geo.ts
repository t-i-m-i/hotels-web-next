import type { Hotel } from "@/api/hotels";

export type Bounds = [west: number, south: number, east: number, north: number];

export function hotelToLngLat(hotel: Hotel): [number, number] {
  return [hotel.geo.longitude, hotel.geo.latitude];
}

export function boundsForHotels(hotels: Hotel[]): Bounds | undefined {
  if (hotels.length === 0) {
    // Math.min()/Math.max() of an empty spread is +Infinity/-Infinity —
    // callers fall back to a sane default instead (e.g. DEFAULT_MAP_BOUNDS).
    return undefined;
  }

  const longitudes = hotels.map((hotel) => hotel.geo.longitude);
  const latitudes = hotels.map((hotel) => hotel.geo.latitude);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

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
