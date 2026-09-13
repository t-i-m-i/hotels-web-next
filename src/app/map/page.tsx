import { getHotelsInBounds } from "@/api/hotels";
import { loadHotelsInBounds } from "@/app/actions";
import HotelMap from "@/components/HotelMap";
import { DEFAULT_MAP_BOUNDS } from "@/constants/map";

export default async function MapPage() {
  const hotels = await getHotelsInBounds(DEFAULT_MAP_BOUNDS);

  return (
    <div className="h-[calc(100vh-3.25rem)] w-full">
      <HotelMap
        initialHotels={hotels}
        loadHotelsInBoundsAction={loadHotelsInBounds}
      />
    </div>
  );
}
