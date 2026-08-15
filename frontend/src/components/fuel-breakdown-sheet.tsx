"use client";

import { motion } from "framer-motion";
import { ArrowRight, Divide, Droplets, Milestone, Route, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import type { FuelConsumptionBreakdown, FuelConsumptionInterval } from "@/lib/types";
import { km, PRICE_EPSILON } from "@/lib/format";
import { newestFirst } from "@/lib/order";
import { BreakdownSheet, formatSheetDate, sheetSpring } from "./bottom-sheet";


export function FuelBreakdownSheet({ breakdown, confidence, onClose }: { breakdown?: FuelConsumptionBreakdown; confidence?: string; onClose: () => void }) {
  const intervals = newestFirst(breakdown?.intervals ?? [], (interval) => `${interval.to_date}:${String(interval.to_odometer).padStart(12, "0")}`);
  const hasAverage = (breakdown?.average_l_per_100km ?? 0) > 0;
  const fullToFull = breakdown?.method === "full_to_full";
  return (
    <BreakdownSheet
      open={Boolean(breakdown)}
      onClose={onClose}
      label="Fuel consumption breakdown"
      eyebrow="Fuel consumption"
      title={hasAverage ? String(breakdown?.average_l_per_100km) : "Learning"}
      unit={hasAverage ? "L/100 km" : undefined}
      rowsLabel={`${intervals.length} driving segment${intervals.length === 1 ? "" : "s"} · newest first`}
      explanation={fullToFull ? "Full-to-full is the reliable method: all fuel added after one full tank is divided by the kilometers driven when the tank is full again." : confidence === "low" ? "This is an estimate from consecutive odometer readings. Mark full tanks on future fills to remove uncertainty from partial refills." : "Older fills are estimated because their tank level was not recorded. Mark full tanks for reliable full-to-full consumption."}
      stats={breakdown ? (
        <div className="grid gap-2">
          {hasAverage ? <div className="flex items-center justify-center gap-2 rounded-[18px] bg-[#eef3e8] px-3 py-3.5 text-center text-sm font-bold text-[#24603c]"><Divide size={15} className="shrink-0 text-[#456148]" />{breakdown.total_liters} L ÷ {km(breakdown.total_distance_km)} × 100 = {breakdown.average_l_per_100km} L/100 km</div> : null}
          {breakdown.tracking ? <TrackingCard tracking={breakdown.tracking} /> : null}
        </div>
      ) : null}
    >
      {intervals.map((interval, index) => (
        <IntervalRow key={`${interval.from_odometer}-${interval.to_odometer}`} interval={interval} previous={intervals[index + 1]} index={index} />
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
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-bold"><Route size={14} className="shrink-0 text-[#58705a]" />{km(interval.distance_km)} driven</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${interval.valid === false ? "bg-[#fff0ec] text-[#9b3226]" : "bg-[#eef6e9] text-[#24603c]"}`}>{interval.valid === false ? "Check data" : `${interval.l_per_100km} L/100`}</span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#7b8177]">{formatSheetDate(interval.from_date)} <ArrowRight size={11} className="inline text-[#a0a69b]" /> {formatSheetDate(interval.to_date)}{interval.method === "full_to_full" ? <span className="ml-2 inline-flex items-center gap-1 font-bold text-[#3f704c]"><ShieldCheck size={11} />Full-to-full</span> : null}</p>
      <div className="mt-1 flex items-center gap-2">
        {interval.station ? <p className="min-w-0 truncate text-xs text-[#6b7065]">{interval.station}</p> : null}
        <PriceBadge price={price} delta={priceDelta} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#62685e]">
        <span className="inline-flex items-center gap-1.5"><Milestone size={13} />{km(interval.from_odometer)} → {km(interval.to_odometer)} · {km(interval.distance_km)}</span>
        <span className="inline-flex items-center gap-1.5"><Droplets size={13} />{interval.liters} L across {interval.fill_count ?? 1} fill{(interval.fill_count ?? 1) === 1 ? "" : "s"}</span>
      </div>
      {interval.issue ? <p className="mt-2 rounded-[12px] bg-[#fff0ec] px-2.5 py-2 text-[11px] font-semibold leading-4 text-[#8b352a]">{interval.issue} This segment is not used in the average.</p> : null}
    </motion.div>
  );
}

function TrackingCard({ tracking }: { tracking: NonNullable<FuelConsumptionBreakdown["tracking"]> }) {
  return (
    <div className="rounded-[18px] border border-[#b9d6b5] bg-[#f1f8ed] px-3 py-3 text-[#315b3b]">
      <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck size={15} />Tracking the next full tank</div>
      <p className="mt-1 text-sm font-bold">{km(tracking.distance_km)} driven · {tracking.liters} L added</p>
      <p className="mt-0.5 text-[11px] leading-4 text-[#58705a]">From {km(tracking.from_odometer)} to {km(tracking.to_odometer)} across {tracking.fill_count} fill{tracking.fill_count === 1 ? "" : "s"}. Fill the tank completely again to close an accurate segment.</p>
    </div>
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
