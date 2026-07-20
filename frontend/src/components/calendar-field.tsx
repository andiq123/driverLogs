"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calmEase, controls, popoverMotion } from "@/lib/theme";
import { useAnchorRect } from "@/lib/use-anchor-rect";

type CalendarFieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarField({ label, name, value, placeholder = "Select date", onChange }: CalendarFieldProps) {
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rect = useAnchorRect(buttonRef, isOpen);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  function choose(date: Date) {
    onChange(formatDateValue(date));
    setVisibleMonth(startOfMonth(date));
    setIsOpen(false);
  }

  return (
    <label className={`relative grid min-w-0 gap-1 text-sm font-semibold ${isOpen ? "z-50" : "z-0"}`}>
      <span className="sr-only">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label}
        onBlur={() => setIsOpen(false)}
        onClick={() => {
          setIsOpen((open) => {
            if (!open) {
              // Always land on the month that shows today (or the selected value).
              setVisibleMonth(startOfMonth(selectedDate ?? new Date()));
            }
            return !open;
          });
        }}
        className={`${controls.trigger} pl-10`}
      >
        <Calendar size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" />
        <span className={value ? "text-[#151712]" : "text-[#62685e]"}>{value ? formatDisplayDate(value) : placeholder}</span>
      </button>
      {typeof document === "undefined" ? null : createPortal(
        <AnimatePresence>
          {isOpen && rect ? (
            <motion.div role="dialog" aria-label={label} onMouseDown={(event) => event.preventDefault()} {...popoverMotion} style={menuStyle(rect)} className="fixed z-[1000] origin-top overflow-hidden rounded-[22px] border border-black/[0.06] bg-[#fbfcf8]/95 p-3 shadow-[0_20px_56px_rgba(31,41,28,0.18)] ring-1 ring-white/70 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <AnimatePresence mode="wait">
                  <motion.p key={visibleMonth.toISOString()} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2, ease: calmEase }} className="text-sm font-bold">
                    {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                  </motion.p>
                </AnimatePresence>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className={`flex size-9 touch-manipulation items-center justify-center rounded-full text-[#62685e] hover:bg-[#f1f4ec] ${controls.menuItem}`} aria-label="Previous month"><ChevronLeft size={16} /></button>
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className={`flex size-9 touch-manipulation items-center justify-center rounded-full text-[#62685e] hover:bg-[#f1f4ec] ${controls.menuItem}`} aria-label="Next month"><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#9aa193]">
                {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={visibleMonth.toISOString()} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22, ease: calmEase }} className="mt-1.5 grid grid-cols-7 gap-1">
                  {days.map((date) => {
                    const active = value === formatDateValue(date);
                    const today = isSameDay(date, new Date());
                    const muted = date.getMonth() !== visibleMonth.getMonth();
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        aria-current={today ? "date" : undefined}
                        aria-pressed={active}
                        onClick={() => choose(date)}
                        className={`flex aspect-square min-h-9 touch-manipulation items-center justify-center rounded-xl text-sm ${controls.menuItem} ${
                          active
                            ? "bg-[#151712] font-bold text-white"
                            : today
                              ? "bg-[#e6f0df] font-bold text-[#151712] ring-1 ring-[#151712]/20"
                              : muted
                                ? "text-[#a0a69a] hover:bg-[#f1f4ec]"
                                : "text-[#151712] hover:bg-[#e6f0df]"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
              <button type="button" onClick={() => choose(new Date())} className={`mt-2.5 h-11 w-full touch-manipulation rounded-[16px] bg-[#e6f0df] text-sm font-bold text-[#151712] hover:bg-[#dfe7d4] ${controls.menuItem}`}>Today</button>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </label>
  );
}

// Open below the field, flipping above when there isn't room.
function menuStyle(rect: DOMRect) {
  const gap = 8;
  const margin = 12;
  const height = 372;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const opensAbove = spaceBelow < height && rect.top - margin > spaceBelow;
  const top = opensAbove ? Math.max(margin, rect.top - height - gap) : rect.bottom + gap;
  return { left: rect.left, top, width: Math.max(rect.width, 268) };
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function parseDate(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
