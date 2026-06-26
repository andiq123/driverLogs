"use client";

import { Calendar } from "lucide-react";
import { controls } from "@/lib/theme";

type CalendarFieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

// ponytail: native <input type="date"> — value is already YYYY-MM-DD, the browser
// supplies the calendar popover and the mobile picker. Display format follows the
// OS locale (the tradeoff for deleting the hand-rolled calendar). `placeholder` is
// accepted for call-site compatibility; native date inputs don't use it.
export function CalendarField({ label, name, value, onChange }: CalendarFieldProps) {
  return (
    <label className="relative grid min-w-0 gap-1 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <Calendar size={17} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#62685e]" />
        <input
          type="date"
          name={name}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.value)}
          className={`${controls.input} cursor-pointer pl-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
        />
      </span>
    </label>
  );
}
