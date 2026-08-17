"use server"
import { apiClient } from "@/api/client";
import type { components } from "@/api/generated/schema";

export type Booking = components["schemas"]["BookingDto"];
export type CreateBookingDto = components["schemas"]["CreateBookingDto"];

export async function submitBooking(body: CreateBookingDto): Promise<Booking> {
  const { data, error } = await apiClient.POST("/bookings", {
    body,
  });
  if (error) {
    throw error;
  }
  return data;
}
