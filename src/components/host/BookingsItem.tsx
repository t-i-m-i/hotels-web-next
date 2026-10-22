import { HostBookingDto } from "@/api/bookings";
import { BookingStatusButtons } from "@/components/common/BookingStatusButtons";
import { isInactiveStatus, StatusBadge } from "@/components/common/StatusBadge";
import { isTodayInRange } from "@/utils/date";

export function BookingsItem({ booking }: { booking: HostBookingDto }) {
  const isInactive = isInactiveStatus(booking.status);

  const stayingNow =
    booking.status === "confirmed" &&
    isTodayInRange(booking.checkIn, booking.checkOut);

  // mutually exclusive, so no two border colors compete in the same class list
  const cardStyle = isInactive
    ? "border-neutral-200 opacity-60 dark:border-neutral-800"
    : stayingNow
      ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
      : "border-neutral-200 dark:border-neutral-800";

  return (
    <div className={`rounded-lg border p-4 ${cardStyle}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          {booking.user.firstName} {booking.user.lastName}
        </p>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {booking.checkIn} - {booking.checkOut}
      </p>
      {stayingNow && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">
          Guest is staying now!
        </p>
      )}

      {/* client component with buttons so BookingsItem can stay a Server Component */}
      <BookingStatusButtons
        bookingId={booking.id}
        allowedStatusChanges={booking.allowedStatusChanges}
      />
    </div>
  );
}
