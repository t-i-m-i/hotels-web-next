import { notFound } from "next/navigation";

import { getHotels } from "@/api/hotels";
import { getCurrentByHotel } from "@/api/bookings";

import HotelMap from "@/components/HotelMap";
import { HotelForm } from "@/components/HotelForm";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;

  const [hotels, bookings] = await Promise.all([
    getHotels(),
    getCurrentByHotel(hotelId),
  ]);

  const hotel = hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[calc(100vh-3rem)] w-full relative">
        <div className="absolute w-1/4 left-4 top-4 z-10 p-4 bg-background rounded-lg">
          <HotelForm hotel={hotel} bookings={bookings} />
        </div>
        <HotelMap hotels={hotels} selectedHotelId={hotelId} />
      </div>
    </div>
  );
}
