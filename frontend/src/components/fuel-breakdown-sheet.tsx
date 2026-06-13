"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Divide, Droplets, Milestone, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { FuelConsumptionBreakdown, FuelConsumptionInterval } from "@/lib/types";
import { km } from "@/lib/format";
import { modalBackdropMotion } from "@/lib/theme";

const sheetSpring = { type: "spring", stiffness: 320, damping: 33 } as const;

export function FuelBreakdownSheet({ breakdown, confidence, onClose }: { breakdown?: FuelConsumptionBreakdown; confidence?: string; onClose: () => void }) {
  const open = Boolean(breakdown);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const sheet = (
    <AnimatePresence>
      {breakdown ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Fuel consumption breakdown">
          <motion.button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" {...modalBackdropMotion} />
          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.03, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className="relative z-[1] w-full max-w-lg touch-none rounded-t-[32px] bg-[#fbfcf8] shadow-[0_-18px_64px_rgba(21,23,18,0.24)] ring-1 ring-white/70"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-black/[0.14]" />
            <div className="max-h-[82dvh] touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">Fuel consumption</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{breakdown.average_l_per_100km} <span className="text-base font-bold text-[#62685e]">L/100 km</span></p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/[0.05] text-[#62685e] outline-none transition-[background-color,transform] duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#9db89a] hover:bg-black/[0.08]">
                  <X size={16} />
                </button>
              </header>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetSpring, delay: 0.08 }} className="mt-4 flex items-center justify-center gap-2 rounded-[18px] bg-[#eef3e8] px-3 py-3.5 text-center text-sm font-bold text-[#24603c]">
                <Divide size={15} className="shrink-0 text-[#456148]" />
                {breakdown.total_liters} L ÷ {km(breakdown.total_distance_km)} × 100 = {breakdown.average_l_per_100km} L/100 km
              </motion.div>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{breakdown.intervals.length} odometer interval{breakdown.intervals.length === 1 ? "" : "s"}</p>
              <div className="mt-2 grid gap-2">
                {breakdown.intervals.map((interval, index) => (
                  <IntervalRow key={`${interval.from_odometer}-${interval.to_odometer}`} interval={interval} index={index} />
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[#6b7065]">
                {confidence === "low" ? "One interval is a rough first estimate — it sharpens with every fill-up that includes an odometer reading." : "Accuracy improves as more fill-ups with odometer readings are logged."}
              </p>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document === "undefined" ? null : createPortal(sheet, document.body);
}

function IntervalRow({ interval, index }: { interval: FuelConsumptionInterval; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...sheetSpring, delay: 0.12 + index * 0.05 }} className="rounded-[20px] border border-black/[0.045] bg-white/92 p-3 shadow-[0_6px_20px_rgba(31,41,28,0.045)]">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-bold">{formatDate(interval.from_date)} <ArrowRight size={12} className="inline text-[#9aa193]" /> {formatDate(interval.to_date)}</span>
        <span className="shrink-0 rounded-full bg-[#eef6e9] px-2.5 py-1 text-xs font-bold text-[#24603c]">{interval.l_per_100km} L/100</span>
      </div>
      {interval.station ? <p className="mt-0.5 truncate text-xs text-[#6b7065]">{interval.station}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#62685e]">
        <span className="inline-flex items-center gap-1.5"><Milestone size={13} />{km(interval.from_odometer)} → {km(interval.to_odometer)} · {km(interval.distance_km)}</span>
        <span className="inline-flex items-center gap-1.5"><Droplets size={13} />{interval.liters} L refilled</span>
      </div>
    </motion.div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
