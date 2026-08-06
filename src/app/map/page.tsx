import { getHotels } from "@/api/hotels";
import HotelMap from "@/components/HotelMap";

export default async function MapPage() {
  const hotels = await getHotels();

  return (
    <div className="h-[calc(100vh-3.25rem)] w-full">
      <HotelMap hotels={hotels} />
    </div>
  );
}
