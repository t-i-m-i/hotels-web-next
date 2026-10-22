import Link from "next/link";

import type { Hotel } from "@/api/hotels";

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <Link
      href={`/hotel/${hotel.id}`}
      className="block h-full rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <h2 className="font-semibold">{hotel.name}</h2>
      <p className="text-sm text-neutral-500">{hotel.location}</p>
      <p className="mt-1 line-clamp-3 text-sm text-neutral-700 dark:text-neutral-300">
        {hotel.description}
      </p>
    </Link>
  );
}
