import { getBookings } from "@/api/bookings";
import { notFound } from "next/navigation";

export default async function BookingsPage() {
  const bookings = await getBookings();

  if (!bookings) {
    notFound();
  }

  return (
    <div>
      <h1>Bookings</h1>
      {bookings.map((booking) => (
        <div key={booking.id}>
          <p>Booking no: {booking.id}</p>
          <p>Hotel: {booking.hotel.name}</p>
          <p>Check in: {booking.checkIn}</p>
          <p>Check out: {booking.checkOut}</p>
          <p>Guest: {booking.user.firstName} {booking.user.lastName}</p>
        </div>
      ))}
    </div>
  );
}
