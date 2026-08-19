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
  let footer = `Please pick the first day.`;
  if (range?.from) {
    if (!range.to) {
      footer = format(range.from, "PPP");
    } else if (range.to) {
      footer = `${format(range.from, "PPP")}–${format(range.to, "PPP")}`;
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
        footer={footer}
        disabled={disabled}
        excludeDisabled
      />
      <button type="button" onClick={() => onSelectAction(undefined)}>
        Reset
      </button>
    </div>
  );
}
