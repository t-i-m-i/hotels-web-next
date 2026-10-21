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
  updateBookingStatus,
  UpdateBookingStatusDto,
  type BookingDto,
  type CreateBookingDto,
} from "@/api/bookings";
import {
  getHotels,
  getHotelsInBounds,
  type Hotel,
  type PaginatedHotels,
} from "@/api/hotels";
import { getSessionUser } from "@/lib/getSession";
import type { Bounds } from "@/utils/geo";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function submitBooking(
  body: CreateBookingDto,
): Promise<BookingDto> {
  return createBooking(body);
}

export async function updateBookingStatusAction(
  id: string,
  body: UpdateBookingStatusDto,
): Promise<{ error?: string }> {
  try {
    await updateBookingStatus(id, body);
  } catch (e) {
    // api functions `throw error` with the parsed Nest body, a plain object, not an Error
    const message =
      typeof e === "object" && e !== null && "message" in e
        ? String(e.message)
        : "Something went wrong";
    return { error: message };
  }

  // this makes Next send the fresh page data back in the same response as the action result,
  // so there is one round trip (no need to router.refresh() in the client component)
  revalidatePath("/bookings");
  return {};
}

export async function loadMoreHotels(
  page: number,
  search?: string,
): Promise<PaginatedHotels> {
  return getHotels(search, page);
}

export async function loadHotelsInBounds(bounds: Bounds): Promise<Hotel[]> {
  return getHotelsInBounds(bounds);
}

export async function setActiveRole(role: string) {
  const user = await getSessionUser();
  if (!user || !user.roles.includes(role)) {
    console.warn(`Cannot switch to role "${role}": account doesn't hold it.`);
    return;
  }

  (await cookies()).set({
    name: "activeRole",
    value: role,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // without this it's a session cookie and dies when the browser closes
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveRole() {
  (await cookies()).delete("activeRole");
}
