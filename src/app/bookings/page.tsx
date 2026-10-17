import { getBookings } from "@/api/bookings";

export default async function BookingsPage() {
  let bookings;
  try {
    bookings = await getBookings();
  } catch {
    return (
      <div className="p-4">
        <p className="text-neutral-600">Couldn&apos;t load bookings.</p>
      </div>
    );
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
          <p>
            Guest: {booking.user.firstName} {booking.user.lastName}
          </p>
        </div>
      ))}
    </div>
  );
}
