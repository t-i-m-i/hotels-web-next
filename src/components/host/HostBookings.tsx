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
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-neutral-600">No bookings found.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {bookings.map((hotel) => (
            <BookingsHotel key={hotel.hotelId} hotel={hotel} />
          ))}
        </div>
      )}
    </div>
  );
}
