import { HostBookingDto } from "@/api/bookings";

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
    </div>
  );
}
