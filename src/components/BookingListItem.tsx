import { BookingDetailsDto } from "@/api/bookings";

// checkOut is a bare "YYYY-MM-DD" calendar day (see hotels-api docs/logs/004),
// so "today" is built the same way and compared lexically, never routed
// through a UTC-instant Date - that's what caused the original off-by-a-day
// bug this replaced.
//
// Known approximation: this runs in a Server Component, so `now` reflects
// the server's local clock/timezone, not the viewer's and not the hotel's.
// A checkout day genuinely belongs to the hotel's timezone (a guest in
// Warsaw booking a hotel in Tokyo checks out on Tokyo's calendar day, not
// Warsaw's or wherever this server happens to be deployed), so near
// midnight this can disagree with both the viewer and the hotel by however
// many hours separate their timezones from the server's. Harmless here
// since it only dims a past booking in the UI, but if this ever needs to
// be authoritative (e.g. gating cancellation/refund windows) it would need
// the hotel's IANA timezone (not modeled yet) plumbed through the API and
// used here instead of the server's own clock.
function isPastBooking(checkOut: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return checkOut < today;
}

export default function BookingListItem({ booking }: { booking: BookingDetailsDto }) {
  const isPast = isPastBooking(booking.checkOut);

  return (
    <div
      className={`rounded-lg border border-neutral-200 p-4 ${isPast ? "opacity-60" : ""}`}
    >
      <p className="font-semibold">{booking.hotel.name}</p>
      <p className="text-sm text-neutral-500">
        {booking.checkIn} - {booking.checkOut}
      </p>
    </div>
  );
}
