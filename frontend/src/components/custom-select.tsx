"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { controls } from "@/lib/theme";

type CustomSelectProps = {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
  icon?: LucideIcon;
  showLabel?: boolean;
  onChange: (value: string) => void;
};

// ponytail: native <select> — the browser owns the dropdown, positioning, keyboard
// and mobile picker. Closed state keeps the app's control styling; the open list
// is the OS list (the design tradeoff for deleting ~100 lines of portal code).
export function CustomSelect({ label, name, options, value, icon: Icon, showLabel = false, onChange }: CustomSelectProps) {
  return (
    <label className="relative grid min-w-0 gap-1 text-sm font-semibold">
      <span className={showLabel ? "px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#70776a]" : "sr-only"}>{label}</span>
      <span className="relative block">
        {Icon ? <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#62685e]" /> : null}
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#62685e]" />
        <select
          name={name}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.value)}
          className={`${controls.input} cursor-pointer appearance-none truncate pr-9 ${Icon ? "pl-10" : ""}`}
        >
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </span>
    </label>
  );
}
