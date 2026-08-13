import Link from "next/link";

import { getHotels } from "@/api/hotels";
import HotelCard from "@/components/HotelCard";
import Search from "@/components/Search";

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { search } = await searchParams; // search: string | string[] | undefined
  const normalizedSearch = Array.isArray(search) ? search[0] : search;

  let hotels;
  try {
    hotels = await getHotels(normalizedSearch);
  } catch {
    return (
      <div className="p-4">
        <p className="text-neutral-600">Couldn&apos;t load hotels.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Search />
      <Link href="/map" className="text-sm font-medium text-blue-600">
        View all on map
      </Link>

      {hotels.length === 0 ? (
        <p className="text-neutral-600">No hotels found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      )}
    </div>
  );
}
