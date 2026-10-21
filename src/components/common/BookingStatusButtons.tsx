"use client";

import { BookingStatus } from "@/api/bookings";
import { updateBookingStatusAction } from "@/app/actions";
import { useState, useTransition } from "react";

type Status = BookingStatus;

const ACTIONS = {
  confirmed: { label: "Confirm booking", className: "bg-green-600" },
  cancelled: { label: "Cancel booking", className: "bg-red-600" },
  no_show: { label: "Set as no-show", className: "bg-gray-600" },
} satisfies Partial<Record<Status, { label: string; className: string }>>;

type ActionStatus = keyof typeof ACTIONS;
const isAction = (s: Status): s is ActionStatus => s in ACTIONS;

export function BookingStatusButtons({
  bookingId,
  allowedStatusChanges,
}: {
  bookingId: string;
  allowedStatusChanges: BookingStatus[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clicked, setClicked] = useState<Status | null>(null);

  const handleClick = (status: Status) => {
    setError(null);
    setClicked(status);
    startTransition(async () => {
      const result = await updateBookingStatusAction(bookingId, { status });
      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <div className="flex gap-4">
        {allowedStatusChanges.filter(isAction).map((status) => {
          const { label, className } = ACTIONS[status];
          return (
            <button
              key={status}
              onClick={() => handleClick(status)}
              disabled={isPending}
              className={`px-4 py-2 rounded text-white ${className}`}
            >
              {isPending && clicked === status ? "Updating…" : label}
            </button>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
