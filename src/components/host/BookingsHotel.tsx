import type { HostHotelBookingsDto } from "@/api/bookings";
import { BookingsItem } from "./BookingsItem";

export function BookingsHotel({ hotel }: { hotel: HostHotelBookingsDto }) {
  return (
    <div>
      <h2>{hotel.hotelName}</h2>
      {hotel.bookings.map((booking) => (
        <BookingsItem key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
