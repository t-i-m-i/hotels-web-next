import type { BookingStatus } from "@/api/bookings";

// full class strings so Tailwind can see them
const STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  completed:
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  no_show:
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
} satisfies Record<BookingStatus, string>;

// terminal statuses: nothing more can happen to these bookings, so lists dim them
export function isInactiveStatus(status: BookingStatus): boolean {
  return (
    status === "cancelled" || status === "completed" || status === "no_show"
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
