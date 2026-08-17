"use client";
import { Hotel } from "@/api/hotels";
import { DatePicker } from "./DatePicker";
import { DateRange } from "@daypicker/react";
import { useState } from "react";
import { submitBooking } from "@/api/bookings";
import { format } from "date-fns";

export function HotelForm({ hotel }: { hotel: Hotel }) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (range && range.from && range.to) {
      const body = {
        hotelId: hotel.id,
        checkIn: format(range.from, "yyyy-MM-dd"),
        checkOut: format(range.to, "yyyy-MM-dd"),
      }
      await submitBooking(body);
    }
  };

  return (
    <>
      <h1 className="text-xl font-semibold">{hotel.name}</h1>
      <p className="text-sm text-neutral-500">{hotel.location}</p>
      <form onSubmit={handleSubmit}>
        <DatePicker range={range} onSelectAction={setRange} />
        <button type="submit">Reserve</button>
      </form>
    </>
  );
}
