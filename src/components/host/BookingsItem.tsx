import { HostBookingDto } from "@/api/bookings";
import { BookingStatusButtons } from "@/components/common/BookingStatusButtons";

export function BookingsItem({ booking }: { booking: HostBookingDto }) {
  return (
    <div>
      <p>
        {booking.user.firstName} {booking.user.lastName}
      </p>
      <p>
        {booking.checkIn} - {booking.checkOut}
      </p>
      <p>{booking.status}</p>

      {/* client component with buttons so BookingsItem can stay a Server Component */}
      <BookingStatusButtons
        bookingId={booking.id}
        allowedStatusChanges={booking.allowedStatusChanges}
      />
    </div>
  );
}
