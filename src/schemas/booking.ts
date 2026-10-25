import { z } from "zod";

export const createBookingSchema = z
  .object({
    hotelId: z.uuid(),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    guestEmail: z.email(),
    guestFirstName: z.string().min(1, "Guest first name is required"),
    guestLastName: z.string().min(1, "Guest last name is required"),
  })
  .refine((v) => v.checkOut > v.checkIn, {
    message: "Check-out date must be after check-in date",
    path: ["checkOut"],
  });

export type BookingForm = z.infer<typeof createBookingSchema>;
