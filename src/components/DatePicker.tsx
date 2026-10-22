"use client";
import { type DateRange, DayPicker, Matcher } from "@daypicker/react";
import { format } from "date-fns";
import "@daypicker/react/style.css";

export function DatePicker({
  range,
  onSelectAction,
  disabled,
}: {
  range: DateRange | undefined;
  onSelectAction: (range: DateRange | undefined) => void;
  disabled?: Matcher | Matcher[];
}) {
  let summary = `Please pick the first day.`;
  if (range?.from) {
    if (!range.to) {
      summary = format(range.from, "PPP");
    } else if (range.to) {
      summary = `${format(range.from, "PPP")}–${format(range.to, "PPP")}`;
    }
  }

  return (
    <div>
      <DayPicker
        mode="range"
        min={1}
        required
        selected={range}
        onSelect={onSelectAction}
        disabled={disabled}
        excludeDisabled
      />
      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <p
          role="status"
          className={`text-sm ${range?.from ? "font-medium" : "text-neutral-500"}`}
        >
          {summary}
        </p>
        <button
          type="button"
          onClick={() => onSelectAction(undefined)}
          disabled={!range?.from}
          className="shrink-0 text-sm font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
