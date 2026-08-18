import { getBooking } from "@/api/bookings";
import { notFound } from "next/navigation";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking) {
    notFound();
  }

  return (
    <div>
      <h1>Booking Details</h1>
      <p>Booking ID: {bookingId}</p>
    </div>
  );
}
