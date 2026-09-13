"use server";

// Server Actions live here: functions a *client* component is allowed to
// call. Marking a function "use server" doesn't restrict it to the server —
// both this file and src/api/hotels.ts / src/api/bookings.ts already only
// ever run on the server. It does the opposite: it generates a stub of the
// function for the client bundle that, when called, makes a network request
// back to the real implementation, still running here on the server. See
// docs/guides/next-and-server-components.md for the full explanation.
//
// Every export in a "use server" file becomes independently network-callable
// this way, so this file stays limited to the small set of operations client
// components actually trigger. The underlying data-fetching logic lives in
// src/api/*.ts as plain functions, imported and used freely by Server
// Components with no RPC involved and no extra public surface.

// Client bundle
//     │
//     │  calls stub
//     ▼
//  [ stub() ]
//     │
//     │ network request
//     ▼
// Server
//     │
//     ▼
//  [ real implementation() ]

import {
  createBooking,
  type Booking,
  type CreateBookingDto,
} from "@/api/bookings";
import {
  getHotels,
  getHotelsInBounds,
  type Hotel,
  type PaginatedHotels,
} from "@/api/hotels";
import type { Bounds } from "@/utils/geo";

export async function submitBooking(body: CreateBookingDto): Promise<Booking> {
  return createBooking(body);
}

export async function loadMoreHotels(
  page: number,
  search?: string,
): Promise<PaginatedHotels> {
  return getHotels(search, page);
}

export async function loadHotelsInBounds(
  bounds: Bounds,
  search?: string,
): Promise<Hotel[]> {
  return getHotelsInBounds(bounds, search);
}
