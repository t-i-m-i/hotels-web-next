import { getBookingsByUser } from "@/api/bookings";
import BookingListItem from "@/components/BookingListItem";

export default async function MyBookingsPage() {
  const userId = "bf721a73-1a8b-4de2-b74b-a747e1197d3f";
  let bookings;

  try {
    bookings = await getBookingsByUser(userId);
  } catch {
    return (
      <div className="p-4">
        <p className="text-neutral-600">Couldn&apos;t load bookings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">My Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-neutral-600">No bookings found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <BookingListItem key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
