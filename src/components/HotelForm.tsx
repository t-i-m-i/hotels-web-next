"use client";
import { Hotel } from "@/api/hotels";
import { DatePicker } from "./DatePicker";
import { DateRange } from "@daypicker/react";
import { useState } from "react";
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

  const bookedRanges = bookings.map((b) => {
    return {
      from: new Date(b.checkIn),
      to: new Date(b.checkOut),
    };
  });

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      const booking = await submitBooking(body);
      router.push(`/booking/${booking.id}`);
    }
  };

  return (
    <>
      <h1 className="text-xl font-semibold">{hotel.name}</h1>
      <p className="text-sm text-neutral-500">{hotel.location}</p>
      <form onSubmit={handleSubmit}>
        <DatePicker
          range={range}
          onSelectAction={setRange}
          disabled={bookedRanges}
        />
        <button type="submit">Reserve</button>
      </form>
    </>
  );
}
