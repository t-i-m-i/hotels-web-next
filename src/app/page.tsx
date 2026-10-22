import Link from "next/link";

import { getHotels } from "@/api/hotels";
import HotelSearchSection from "@/components/HotelSearchSection";
import HotelList from "@/components/HotelList";

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { search } = await searchParams; // search: string | string[] | undefined
  const normalizedSearch = Array.isArray(search) ? search[0] : search;

  const initialData = await getHotels(normalizedSearch); // page 1, SSR

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Explore</h1>
        <Link
          href="/map"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          View all on map
        </Link>
      </div>

      {/* Pull the list into its own small client wrapper. This is the standard shape for "Server Component data, Client Component pending-state UI": lift the transition to the nearest client component that's a common ancestor of the trigger (input) and the thing you want to visually affect (list). */}
      <HotelSearchSection>
        {/* key: when the search term changes the URL, the Server Component
            re-renders with a fresh page-1 `initialData`. Keying on the term
            forces HotelList to remount so its accumulated pages reset instead
            of appending onto stale results. */}
        <HotelList
          key={normalizedSearch ?? ""}
          initialData={initialData}
          search={normalizedSearch}
        />
      </HotelSearchSection>
    </div>
  );
}
