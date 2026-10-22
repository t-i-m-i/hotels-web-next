"use client";
import { Hotel } from "@/api/hotels";
import { buttonClass } from "@/components/auth/styles";
import { DatePicker } from "./DatePicker";
import { DateRange } from "@daypicker/react";
import { useState, useTransition } from "react";
import { CreateBookingDto, type BookingDto } from "@/api/bookings";
import { submitBooking } from "@/app/actions";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export function HotelForm({
  hotel,
  bookings,
}: {
  hotel: Hotel;
  bookings: BookingDto[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bookedRanges = bookings.map((b) => {
    return {
      from: new Date(b.checkIn),
      to: new Date(b.checkOut),
    };
  });

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (range && range.from && range.to) {
      const body: CreateBookingDto = {
        hotelId: hotel.id,
        checkIn: format(range.from, "yyyy-MM-dd"),
        checkOut: format(range.to, "yyyy-MM-dd"),
        // TODO booking form with these fields is still to be done
        guestEmail: "test@test.com", // we need valid email on the backend
        guestFirstName: "John",
        guestLastName: "Doe",
      };
      startTransition(async () => {
        const result = await submitBooking(body);
        if ("error" in result) {
          setError(result.error);
        } else {
          router.push(`/booking/${result.booking.id}`);
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{hotel.name}</h1>
        <p className="text-sm text-neutral-500">{hotel.location}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <DatePicker
          range={range}
          onSelectAction={setRange}
          disabled={bookedRanges}
        />
        <button
          type="submit"
          disabled={isPending || !range?.from || !range?.to}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {isPending ? "Booking..." : "Book"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
