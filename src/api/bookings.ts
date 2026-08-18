"use server"
import { apiClient } from "@/api/client";
import type { components } from "@/api/generated/schema";

export type Booking = components["schemas"]["BookingDto"];
export type CreateBookingDto = components["schemas"]["CreateBookingDto"];
export type BookingDetailsDto = components["schemas"]["BookingDetailsDto"];

export async function submitBooking(body: CreateBookingDto): Promise<Booking> {
  const { data, error } = await apiClient.POST("/bookings", {
    body,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function getCurrentByHotel(hotelId: string) {
  const { data, error } = await apiClient.GET("/bookings/hotel/{hotelId}", {
    params: { path: { hotelId } },
  });
  if (error || !data) {
    throw error ?? new Error(`Bookings for hotel with id "${hotelId}" not found`);
  }
  return data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data, error } = await apiClient.GET("/bookings/{id}", {
    params: { path: { id } },
  });
  if (error || !data) {
    throw error ?? new Error(`Booking ${id} not found`);
  }
  return data;
}

export async function getBookings(): Promise<BookingDetailsDto[]> {
  const { data, error } = await apiClient.GET("/bookings");
  if (error || !data) {
    throw error ?? new Error(`Failed to load bookings`);
  }
  return data;
}
