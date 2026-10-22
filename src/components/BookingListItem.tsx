import { BookingDetailsDto } from "@/api/bookings";
import { isInactiveStatus, StatusBadge } from "@/components/common/StatusBadge";

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

export default function BookingListItem({
  booking,
}: {
  booking: BookingDetailsDto;
}) {
  // a pending booking left past its dates stays "pending", so check the date too
  const isDimmed =
    isInactiveStatus(booking.status) || isPastBooking(booking.checkOut);

  return (
    <div
      className={`rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 ${isDimmed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{booking.hotel.name}</p>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {booking.checkIn} - {booking.checkOut}
      </p>
    </div>
  );
}
