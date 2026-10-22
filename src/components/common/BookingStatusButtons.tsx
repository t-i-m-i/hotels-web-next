"use client";

import { BookingStatus } from "@/api/bookings";
import { updateBookingStatusAction } from "@/app/actions";
import { useState, useTransition } from "react";

type Status = BookingStatus;

const ACTIONS = {
  confirmed: {
    label: "Confirm booking",
    className: "bg-green-600 hover:bg-green-700",
  },
  cancelled: {
    label: "Cancel booking",
    className: "bg-red-600 hover:bg-red-700",
  },
  no_show: {
    label: "Set as no-show",
    className: "bg-neutral-600 hover:bg-neutral-700",
  },
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

  const actions = allowedStatusChanges.filter(isAction);
  if (actions.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((status) => {
          const { label, className } = ACTIONS[status];
          return (
            <button
              key={status}
              onClick={() => handleClick(status)}
              disabled={isPending}
              className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            >
              {isPending && clicked === status ? "Updating…" : label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
