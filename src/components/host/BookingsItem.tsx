import { HostBookingDto } from "@/api/bookings";
import { BookingStatusButtons } from "@/components/common/BookingStatusButtons";
import { isInactiveStatus, StatusBadge } from "@/components/common/StatusBadge";

export function BookingsItem({ booking }: { booking: HostBookingDto }) {
  const isInactive = isInactiveStatus(booking.status);

  return (
    <div
      className={`rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 ${isInactive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          {booking.user.firstName} {booking.user.lastName}
        </p>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {booking.checkIn} - {booking.checkOut}
      </p>

      {/* client component with buttons so BookingsItem can stay a Server Component */}
      <BookingStatusButtons
        bookingId={booking.id}
        allowedStatusChanges={booking.allowedStatusChanges}
      />
    </div>
  );
}
