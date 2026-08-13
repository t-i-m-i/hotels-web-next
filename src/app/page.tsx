import Link from "next/link";

import { getHotels } from "@/api/hotels";
import HotelCard from "@/components/HotelCard";
import HotelSearchSection from "@/components/HotelSearchSection";

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
      <Link href="/map" className="text-sm font-medium text-blue-600">
        View all on map
      </Link>

      {/* Pull the list into its own small client wrapper. This is the standard shape for "Server Component data, Client Component pending-state UI": lift the transition to the nearest client component that's a common ancestor of the trigger (input) and the thing you want to visually affect (list). */}
      <HotelSearchSection>
        {hotels.length === 0 ? (
          <p className="text-neutral-600">No hotels found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </HotelSearchSection>


    </div>
  );
}
