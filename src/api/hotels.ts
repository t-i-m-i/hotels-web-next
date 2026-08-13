// TODO add Zod response validation -> see: hotels-alt-web-start/src/api/hotels/get-hotels.ts
//
import { apiClient } from "@/api/client";
import type { components } from "@/api/generated/schema";

export type Hotel = components["schemas"]["HotelDto"];

export async function getHotels(search?: string): Promise<Hotel[]> {
  const { data, error } = await apiClient.GET("/hotels", {
    params: { query: { search } },
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
