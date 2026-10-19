import { getByHost } from "@/api/bookings";
import { BookingsHotel } from "./BookingsHotel";

export async function HostBookings({ userId }: { userId: string }) {
  let bookings;

  try {
    bookings = await getByHost(userId);
  } catch {
    return (
      <div className="p-4">
        <p className="text-neutral-600">Failed to load bookings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-neutral-600">No bookings found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((hotel) => (
            <BookingsHotel key={hotel.hotelId} hotel={hotel} />
          ))}
        </div>
      )}
    </div>
  );
}
