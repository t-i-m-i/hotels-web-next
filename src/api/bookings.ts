import { apiClient } from "@/api/client";
import type { components } from "@/api/generated/schema";

export type BookingDto = components["schemas"]["BookingDto"];
export type CreateBookingDto = components["schemas"]["CreateBookingDto"];
export type BookingDetailsDto = components["schemas"]["BookingDetailsDto"];
export type HostHotelBookingsDto =
  components["schemas"]["HostHotelBookingsDto"];
export type HostBookingDto = components["schemas"]["HostBookingDto"];
export type UpdateBookingStatusDto =
  components["schemas"]["UpdateBookingStatusDto"];
export type BookingStatus = UpdateBookingStatusDto["status"];

export async function createBooking(
  body: CreateBookingDto,
): Promise<BookingDto> {
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
    throw (
      error ?? new Error(`Bookings for hotel with id "${hotelId}" not found`)
    );
  }
  return data;
}

export async function getBooking(id: string): Promise<BookingDto> {
  const { data, error } = await apiClient.GET("/bookings/{id}", {
    params: { path: { id } },
  });
  if (error || !data) {
    throw error ?? new Error(`Booking ${id} not found`);
  }
  return data;
}

export async function getBookingsByUser(
  userId: string,
): Promise<BookingDetailsDto[]> {
  const { data, error } = await apiClient.GET("/bookings/user/{userId}", {
    params: { path: { userId } },
  });
  if (error || !data) {
    throw error ?? new Error(`Bookings for guest ${userId} not found`);
  }
  return data;
}

export async function getByHost(hostId: string) {
  const { data, error } = await apiClient.GET("/bookings/host/{hostId}", {
    params: { path: { hostId } },
  });
  if (error || !data) {
    throw error ?? new Error(`Bookings for host ${hostId} not found`);
  }
  return data;
}

export async function updateBookingStatus(
  id: string,
  body: UpdateBookingStatusDto,
): Promise<BookingDto> {
  const { data, error } = await apiClient.PATCH("/bookings/{id}/status", {
    params: { path: { id } },
    body,
  });

  if (error || !data) {
    throw error ?? new Error(`Failed to update booking ${id}`);
  }

  return data;
}
