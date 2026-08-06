import type { Hotel } from "@/api/hotels";

export function hotelToLngLat(hotel: Hotel): [number, number] {
  return [hotel.geo.longitude, hotel.geo.latitude];
}

export function boundsForHotels(
  hotels: Hotel[],
): [number, number, number, number] {
  const longitudes = hotels.map((hotel) => hotel.geo.longitude);
  const latitudes = hotels.map((hotel) => hotel.geo.latitude);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}
