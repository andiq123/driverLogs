"use client";

import { motion } from "framer-motion";
import { ArrowRight, Divide, Droplets, Milestone, TrendingDown, TrendingUp } from "lucide-react";
import type { FuelConsumptionBreakdown, FuelConsumptionInterval } from "@/lib/types";
import { km } from "@/lib/format";
import { BreakdownSheet, formatSheetDate, sheetSpring } from "./bottom-sheet";

const PRICE_EPSILON = 0.01;

export function FuelBreakdownSheet({ breakdown, confidence, onClose }: { breakdown?: FuelConsumptionBreakdown; confidence?: string; onClose: () => void }) {
  const intervals = breakdown?.intervals ?? [];
  return (
    <BreakdownSheet
      open={Boolean(breakdown)}
      onClose={onClose}
      label="Fuel consumption breakdown"
      eyebrow="Fuel consumption"
      title={String(breakdown?.average_l_per_100km ?? 0)}
      unit="L/100 km"
      rowsLabel={`${intervals.length} odometer interval${intervals.length === 1 ? "" : "s"}`}
      explanation={confidence === "low" ? "One interval is a rough first estimate — it sharpens with every fill-up that includes an odometer reading." : "Accuracy improves as more fill-ups with odometer readings are logged."}
      stats={breakdown ? (
        <div className="flex items-center justify-center gap-2 rounded-[18px] bg-[#eef3e8] px-3 py-3.5 text-center text-sm font-bold text-[#24603c]">
          <Divide size={15} className="shrink-0 text-[#456148]" />
          {breakdown.total_liters} L ÷ {km(breakdown.total_distance_km)} × 100 = {breakdown.average_l_per_100km} L/100 km
        </div>
      ) : null}
    >
      {intervals.map((interval, index) => (
        <IntervalRow key={`${interval.from_odometer}-${interval.to_odometer}`} interval={interval} previous={intervals[index - 1]} index={index} />
      ))}
    </BreakdownSheet>
  );
}

function IntervalRow({ interval, previous, index }: { interval: FuelConsumptionInterval; previous?: FuelConsumptionInterval; index: number }) {
  const price = interval.price_per_liter_mdl ?? 0;
  const previousPrice = previous?.price_per_liter_mdl ?? 0;
  const priceDelta = price > 0 && previousPrice > 0 ? Math.round((price - previousPrice) * 100) / 100 : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...sheetSpring, delay: 0.12 + index * 0.05 }} className="rounded-[20px] border border-black/[0.045] bg-white/92 p-3 shadow-[0_6px_20px_rgba(31,41,28,0.045)]">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-bold">{formatSheetDate(interval.from_date)} <ArrowRight size={12} className="inline text-[#9aa193]" /> {formatSheetDate(interval.to_date)}</span>
        <span className="shrink-0 rounded-full bg-[#eef6e9] px-2.5 py-1 text-xs font-bold text-[#24603c]">{interval.l_per_100km} L/100</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {interval.station ? <p className="min-w-0 truncate text-xs text-[#6b7065]">{interval.station}</p> : null}
        <PriceBadge price={price} delta={priceDelta} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#62685e]">
        <span className="inline-flex items-center gap-1.5"><Milestone size={13} />{km(interval.from_odometer)} → {km(interval.to_odometer)} · {km(interval.distance_km)}</span>
        <span className="inline-flex items-center gap-1.5"><Droplets size={13} />{interval.liters} L refilled</span>
      </div>
    </motion.div>
  );
}

function PriceBadge({ price, delta }: { price: number; delta: number }) {
  if (price <= 0) return null;
  if (delta > PRICE_EPSILON) {
    return <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff3d6] px-2 py-0.5 text-[10px] font-bold text-[#8a6200]"><TrendingUp size={11} />+{delta.toFixed(2)} MDL/L</span>;
  }
  if (delta < -PRICE_EPSILON) {
    return <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e7f3e1] px-2 py-0.5 text-[10px] font-bold text-[#24603c]"><TrendingDown size={11} />{delta.toFixed(2)} MDL/L</span>;
  }
  return <span className="ml-auto shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold text-[#62685e]">{price.toFixed(2)} MDL/L</span>;
}
