"use client";
import { Hotel } from "@/api/hotels";
import { buttonClass, inputClass } from "@/components/auth/styles";
import { DatePicker } from "./DatePicker";
import { DateRange } from "@daypicker/react";
import { useState } from "react";
import { type BookingDto } from "@/api/bookings";
import { submitBooking } from "@/app/actions";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookingForm, createBookingSchema } from "@/schemas/booking";

export function HotelForm({
  hotel,
  bookings,
}: {
  hotel: Hotel;
  bookings: BookingDto[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [serverError, setServerError] = useState<string>("");

  const bookedRanges = bookings.map((b) => {
    return {
      from: new Date(b.checkIn),
      to: new Date(b.checkOut),
    };
  });

  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      hotelId: hotel.id,
      checkIn: "",
      checkOut: "",
      guestEmail: "",
      guestFirstName: "",
      guestLastName: "",
    },
  });

  const onBook: SubmitHandler<BookingForm> = async (data) => {
    setServerError("");
    const result = await submitBooking(data);
    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    router.push(`/booking/${result.booking.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{hotel.name}</h1>
        <p className="text-sm text-neutral-500">{hotel.location}</p>
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}
      <form
        onSubmit={handleSubmit(onBook)}
        className="flex flex-col gap-3"
        noValidate
      >
        <DatePicker
          range={range}
          onSelectAction={(r) => {
            setRange(r);
            setValue("checkIn", r?.from ? format(r.from, "yyyy-MM-dd") : "", {
              shouldValidate: true,
            });
            setValue("checkOut", r?.to ? format(r.to, "yyyy-MM-dd") : "", {
              shouldValidate: true,
            });
          }}
          disabled={bookedRanges}
        />
        {(errors.checkIn || errors.checkOut) && (
          <p className="text-sm text-red-600">
            {errors.checkIn?.message ?? errors.checkOut?.message}
          </p>
        )}

        {/* guest data */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="guestEmail" className="text-sm font-medium">
              Guest Email
            </label>
            <input
              id="guestEmail"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register("guestEmail")}
            />
            {errors.guestEmail && (
              <p className="text-sm text-red-600">
                {errors.guestEmail.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="guestFirstName" className="text-sm font-medium">
              Guest First Name
            </label>
            <input
              id="guestFirstName"
              type="text"
              autoComplete="given-name"
              className={inputClass}
              {...register("guestFirstName")}
            />
            {errors.guestFirstName && (
              <p className="text-sm text-red-600">
                {errors.guestFirstName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="guestLastName" className="text-sm font-medium">
              Guest Last Name
            </label>
            <input
              id="guestLastName"
              type="text"
              autoComplete="family-name"
              className={inputClass}
              {...register("guestLastName")}
            />
            {errors.guestLastName && (
              <p className="text-sm text-red-600">
                {errors.guestLastName.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {isSubmitting ? "Booking..." : "Book"}
        </button>
      </form>
    </div>
  );
}
