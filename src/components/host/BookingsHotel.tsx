import type { HostHotelBookingsDto } from "@/api/bookings";
import { BookingsItem } from "./BookingsItem";

export function BookingsHotel({ hotel }: { hotel: HostHotelBookingsDto }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{hotel.hotelName}</h2>
        <span className="text-sm text-neutral-500">
          {hotel.bookings.length}{" "}
          {hotel.bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
        {hotel.bookings.map((booking) => (
          <BookingsItem key={booking.id} booking={booking} />
        ))}
      </div>
    </section>
  );
}
