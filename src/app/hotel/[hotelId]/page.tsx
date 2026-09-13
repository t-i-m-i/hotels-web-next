import { notFound } from "next/navigation";

import { getHotel, getHotelsInBounds } from "@/api/hotels";
import { getCurrentByHotel } from "@/api/bookings";
import { isUuid } from "@/utils/validation";

import HotelMap from "@/components/HotelMap";
import { HotelForm } from "@/components/HotelForm";
import { bboxAround } from "@/utils/geo";
import { loadHotelsInBounds } from "@/app/actions";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;

  if (!isUuid(hotelId)) {
    notFound();
  }

  const hotel = await getHotel(hotelId).catch(() => null);
  if (!hotel) notFound();

  const [nearby, bookings] = await Promise.all([
    getHotelsInBounds(bboxAround(hotel.geo, 25 /* km */)),
    getCurrentByHotel(hotelId), // returns [] for no current bookings for correct hotel id
  ]);

  // Guarantee the selected hotel is present even if the cap/bbox dropped it.
  const initialHotels = nearby.some((h) => h.id === hotel.id)
    ? nearby
    : [hotel, ...nearby];

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-[calc(100vh-3rem)] w-full">
        <div className="absolute left-4 top-4 z-10 w-1/4 rounded-lg bg-background p-4">
          <HotelForm hotel={hotel} bookings={bookings} />
        </div>
        <HotelMap
          initialHotels={initialHotels}
          loadHotelsInBoundsAction={loadHotelsInBounds}
          selectedHotelId={hotelId}
        />
      </div>
    </div>
  );
}
