import { BookingDetailsDto } from "@/api/bookings";

function isPastBooking(checkOut: string): boolean {
  const now = new Date();
  return new Date(checkOut) < now;
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
