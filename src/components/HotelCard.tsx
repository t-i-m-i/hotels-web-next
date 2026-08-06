import Link from "next/link";

import type { Hotel } from "@/api/hotels";

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <Link
      href={`/hotel/${hotel.id}`}
      className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400"
    >
      <h2 className="font-semibold">{hotel.name}</h2>
      <p className="text-sm text-neutral-500">{hotel.location}</p>
      <p className="mt-1 text-sm text-neutral-700">{hotel.description}</p>
    </Link>
  );
}
