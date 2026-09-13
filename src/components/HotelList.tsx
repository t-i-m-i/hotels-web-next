"use client";

import { useEffect, useRef, useState } from "react";

import { loadMoreHotels } from "@/app/actions";
import type { Hotel, PaginatedHotels } from "@/api/hotels";
import HotelCard from "@/components/HotelCard";

export default function HotelList({
  initialData,
  search,
}: {
  initialData: PaginatedHotels;
  search?: string;
}) {
  const [hotels, setHotels] = useState<Hotel[]>(initialData.data);
  const [page, setPage] = useState(initialData.meta.pagination.page);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const { pageCount } = initialData.meta.pagination;
  const hasNextPage = page < pageCount;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsLoading(true);
        setError(false);
        try {
          const next = await loadMoreHotels(page + 1, search);
          setHotels((prev) => [...prev, ...next.data]);
          setPage(next.meta.pagination.page);
        } catch {
          setError(true);
        } finally {
          setIsLoading(false);
        }
      },
      // { rootMargin: "600px" }, // start fetching before the sentinel is on screen
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isLoading, page, search]);

  if (hotels.length === 0) {
    return <p className="text-neutral-600">No hotels found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {hotels.map((hotel) => (
        <HotelCard key={hotel.id} hotel={hotel} />
      ))}

      {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {isLoading && (
        <p className="py-4 text-center text-neutral-500">Loading…</p>
      )}
      {error && (
        <button
          onClick={() => setError(false) /* re-arms the observer effect */}
          className="py-4 text-center text-sm text-blue-600"
        >
          Couldn&apos;t load more - retry
        </button>
      )}
    </div>
  );
}
