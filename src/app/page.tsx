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

      {/* HotelSearchSection is a client wrapper that holds the search input
          and the list, so it can dim the list (isPending) while a new search
          is loading. The list stays a Server Component child, passed in as
          `children`, so its data is still fetched on the server. */}
      <HotelSearchSection>
        {/* key: HotelList copies `initialData` into state only on first render.
            A new search brings new page-1 data, but without a new key React
            would keep the old state and ignore it. Changing the key remounts
            the list with fresh state. */}
        <HotelList
          key={normalizedSearch ?? ""}
          initialData={initialData}
          search={normalizedSearch}
        />
      </HotelSearchSection>
    </div>
  );
}
