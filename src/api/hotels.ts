import { apiClient } from "@/api/client";
import type { components } from "@/api/generated/schema";
import { Bounds } from "@/utils/geo";

export type Hotel = components["schemas"]["HotelDto"];
export type HotelImage = components["schemas"]["HotelImageDto"];
export type PaginatedHotels = components["schemas"]["PaginatedHotelsDto"];

export async function getHotels(
  search?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedHotels> {
  const { data, error } = await apiClient.GET("/hotels", {
    params: { query: { search, page, pageSize } },
  });
  if (error || !data) {
    throw error ?? new Error("Failed to load hotels");
  }
  return data;
}

export async function getHotel(id: string): Promise<Hotel> {
  const { data, error } = await apiClient.GET("/hotels/{id}", {
    params: { path: { id } },
  });
  if (error || !data) {
    throw error ?? new Error(`Hotel with id "${id}" not found`);
  }
  return data;
}

export async function getHotelsInBounds(bounds: Bounds): Promise<Hotel[]> {
  const [swLng, swLat, neLng, neLat] = bounds;
  const { data, error } = await apiClient.GET("/hotels/within-bounds", {
    params: { query: { swLat, swLng, neLat, neLng } },
  });
  if (error || !data) {
    throw error ?? new Error("Failed to load hotels in bounds");
  }
  return data;
}
