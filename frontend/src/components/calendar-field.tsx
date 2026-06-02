"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calmEase, controls, popoverMotion } from "@/lib/theme";

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
  const [menuRect, setMenuRect] = useState<DOMRect>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!isOpen) return;
    function updateMenuRect() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setMenuRect(rect);
    }
    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [isOpen]);

  function choose(date: Date) {
    onChange(formatDateValue(date));
    setVisibleMonth(startOfMonth(date));
    setIsOpen(false);
  }

  return (
    <label className="relative grid min-w-0 gap-1 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((open) => !open)}
        className={`${controls.trigger} pl-10`}
      >
        <Calendar size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" />
        <span className={value ? "text-[#151712]" : "text-[#62685e]"}>{value ? formatDisplayDate(value) : placeholder}</span>
      </button>
      {typeof document !== "undefined" ? createPortal(
        <AnimatePresence>
          {isOpen && menuRect ? (
            <motion.div onMouseDown={(event) => event.preventDefault()} className="fixed z-[1000] overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#fbfcf8] p-3 shadow-[0_18px_48px_rgba(31,41,28,0.16)]" style={calendarMenuStyle(menuRect)} {...popoverMotion}>
              <div className="mb-3 flex items-center justify-between">
                <AnimatePresence mode="wait">
                  <motion.p key={visibleMonth.toISOString()} initial={{ opacity: 0, y: 6, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -5, filter: "blur(2px)" }} transition={{ duration: 0.24, ease: calmEase }} className="text-sm font-bold">
                    {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                  </motion.p>
                </AnimatePresence>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className={`flex size-10 touch-manipulation items-center justify-center rounded-full hover:bg-[#f1f4ec] ${controls.menuItem}`} aria-label="Previous month"><ChevronLeft size={16} /></button>
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className={`flex size-10 touch-manipulation items-center justify-center rounded-full hover:bg-[#f1f4ec] ${controls.menuItem}`} aria-label="Next month"><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#62685e]">
                {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={visibleMonth.toISOString()} initial={{ opacity: 0, x: 14, filter: "blur(4px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -12, filter: "blur(3px)" }} transition={{ duration: 0.3, ease: calmEase }} className="mt-2 grid grid-cols-7 gap-1">
                  {days.map((date) => {
                    const active = value === formatDateValue(date);
                    const muted = date.getMonth() !== visibleMonth.getMonth();
                    return (
                      <button key={date.toISOString()} type="button" onClick={() => choose(date)} className={`flex aspect-square min-h-9 touch-manipulation items-center justify-center rounded-xl text-sm ${controls.menuItem} ${active ? "bg-[#151712] font-bold text-white" : muted ? "text-[#a0a69a] hover:bg-[#f1f4ec]" : "text-[#151712] hover:bg-[#e6f0df]"}`}>
                        {date.getDate()}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
              <button type="button" onClick={() => choose(new Date())} className={`mt-3 h-11 w-full touch-manipulation rounded-[16px] bg-[#e6f0df] text-sm font-bold text-[#151712] hover:bg-[#dfe7d4] ${controls.menuItem}`}>Today</button>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </label>
  );
}

function calendarMenuStyle(rect: DOMRect) {
  const gap = 8;
  const margin = 12;
  const preferredHeight = 400;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const opensAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
  const top = opensAbove ? Math.max(margin, rect.top - preferredHeight - gap) : rect.bottom + gap;
  const maxHeight = Math.max(260, Math.min(preferredHeight, opensAbove ? spaceAbove - gap : spaceBelow));
  return { left: rect.left, top, width: rect.width, maxHeight };
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
