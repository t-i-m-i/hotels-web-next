import { notFound } from "next/navigation";

import { getHotels } from "@/api/hotels";
import HotelMap from "@/components/HotelMap";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  const hotels = await getHotels();
  const hotel = hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-4">
        <h1 className="text-xl font-semibold">{hotel.name}</h1>
        <p className="text-sm text-neutral-500">{hotel.location}</p>
      </div>
      <div className="h-[calc(100vh-8rem)] w-full">
        <HotelMap hotels={hotels} selectedHotelId={hotelId} />
      </div>
    </div>
  );
}
