import { notFound } from "next/navigation";

import { getHotel, getHotels } from "@/api/hotels";
import { getCurrentByHotel } from "@/api/bookings";
import { isUuid } from "@/utils/validation";

import HotelMap from "@/components/HotelMap";
import { HotelForm } from "@/components/HotelForm";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;

  if (!isUuid(hotelId)) {
    notFound();
  }

  const [hotel, bookings] = await Promise.all([
    // getHotels(), // api contract changed - now it responds with paginated hotels.
    /** 
     * catch 404 to display notFound, rethrow other errors to be handled by the error boundary
     * */
    getHotel(hotelId).catch((e) => {
      if (e?.statusCode === 404) return null;
      throw e;
    }),
    getCurrentByHotel(hotelId), // returns [] for no current bookings for correct hotel id
  ]);

  // const hotel = hotels.data.find((h) => h.id === hotelId);

  if (!hotel) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[calc(100vh-3rem)] w-full relative">
        <div className="absolute w-1/4 left-4 top-4 z-10 p-4 bg-background rounded-lg">
          <HotelForm hotel={hotel} bookings={bookings} />
        </div>
        <HotelMap hotels={[hotel]} selectedHotelId={hotelId} />
      </div>
    </div>
  );
}
