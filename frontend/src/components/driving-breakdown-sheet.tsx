"use client";

import { motion } from "framer-motion";
import { Milestone, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { DistanceInsight, MonthlyDistance } from "@/lib/types";
import { km } from "@/lib/format";
import { BottomSheet, SheetHeader, sheetSpring } from "./bottom-sheet";

export function DrivingBreakdownSheet({ distance, onClose }: { distance?: DistanceInsight; onClose: () => void }) {
  const open = Boolean(distance && distance.months.length > 0);
  const months = distance ? [...distance.months].reverse() : []; // newest first
  const maxKM = months.reduce((peak, entry) => Math.max(peak, entry.km), 0) || 1;
  const thisMonthKey = months[0]?.month;

  return (
    <BottomSheet open={open} onClose={onClose} label="Monthly distance breakdown">
      {distance ? (
        <>
          <SheetHeader eyebrow="Distance this month" title={km(distance.this_month_km)} onClose={onClose} />

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetSpring, delay: 0.08 }} className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="vs last month" value={trendText(distance)} icon={trendIcon(distance.trend)} />
            <Stat label="Monthly average" value={km(distance.monthly_average_km)} />
          </motion.div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{months.length} month{months.length === 1 ? "" : "s"} tracked</p>
          <div className="mt-2 grid gap-2">
            {months.map((entry, index) => (
              <MonthRow key={entry.month} entry={entry} index={index} maxKM={maxKM} isCurrent={entry.month === thisMonthKey} />
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-[#6b7065]">
            Each month is the odometer at its last reading minus the reading before it began. Log odometer with fuel or service to sharpen it.
          </p>
        </>
      ) : null}
    </BottomSheet>
  );
}

function MonthRow({ entry, index, maxKM, isCurrent }: { entry: MonthlyDistance; index: number; maxKM: number; isCurrent: boolean }) {
  const width = `${Math.max(6, Math.round((entry.km / maxKM) * 100))}%`;
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...sheetSpring, delay: 0.12 + index * 0.05 }} className={`rounded-[20px] border p-3 shadow-[0_6px_20px_rgba(31,41,28,0.045)] ${isCurrent ? "border-[#bdd7c0] bg-[#eff7ea]" : "border-black/[0.045] bg-white/92"}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">{monthLabel(entry.month)}{isCurrent ? <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#24603c]">This month</span> : null}</span>
        <span className="shrink-0 font-bold">{km(entry.km)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
        <motion.div initial={{ width: 0 }} animate={{ width }} transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.2 + index * 0.05 }} className={`h-full rounded-full ${isCurrent ? "bg-[#3a8e57]" : "bg-[#b6c8aa]"}`} />
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#62685e]"><Milestone size={13} />{km(entry.from_odometer)} → {km(entry.to_odometer)}</p>
    </motion.div>
  );
}

function Stat({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon?: typeof TrendingUp; tone?: "good" | "warn" | "neutral" }) {
  const color = tone === "good" ? "text-[#24603c]" : tone === "warn" ? "text-[#8a6200]" : "text-[#30342e]";
  return (
    <div className="rounded-[18px] bg-[#eef3e8]/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{label}</p>
      <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-bold ${color}`}>{Icon ? <Icon size={14} className="shrink-0" /> : null}{value}</p>
    </div>
  );
}

function trendText(distance: DistanceInsight) {
  if (distance.trend === "first") return "First month";
  if (distance.trend === "flat") return "Same";
  return `${km(Math.abs(distance.delta_km))} ${distance.trend === "up" ? "more" : "less"}`;
}

function trendIcon(trend: DistanceInsight["trend"]) {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;
  return Minus;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const index = Number(month) - 1;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (!year || index < 0 || index > 11) return value;
  return `${names[index]} ${year}`;
}
