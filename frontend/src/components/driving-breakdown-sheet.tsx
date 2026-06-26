"use client";

import { motion } from "framer-motion";
import { Milestone } from "lucide-react";
import type { DistanceInsight, MonthlyDistance } from "@/lib/types";
import { km } from "@/lib/format";
import { BreakdownSheet, SheetStat, sheetSpring, trendIcon } from "./bottom-sheet";

export function DrivingBreakdownSheet({ distance, onClose }: { distance?: DistanceInsight; onClose: () => void }) {
  const open = Boolean(distance && distance.months.length > 0);
  const months = distance ? [...distance.months].reverse() : []; // newest first
  const maxKM = months.reduce((peak, entry) => Math.max(peak, entry.km), 0) || 1;
  const thisMonthKey = months[0]?.month;

  return (
    <BreakdownSheet
      open={open}
      onClose={onClose}
      label="Monthly distance breakdown"
      eyebrow="Distance this month"
      title={km(distance?.this_month_km ?? 0)}
      rowsLabel={`${months.length} month${months.length === 1 ? "" : "s"} tracked`}
      explanation="Each month is the odometer at its last reading minus the reading before it began. Log odometer with fuel or service to sharpen it."
      stats={
        <div className="grid grid-cols-2 gap-2">
          <SheetStat label="vs last month" value={distance ? trendText(distance) : "—"} icon={distance ? trendIcon(distance.trend) : undefined} />
          <SheetStat label="Monthly average" value={km(distance?.monthly_average_km ?? 0)} />
        </div>
      }
    >
      {months.map((entry, index) => (
        <MonthRow key={entry.month} entry={entry} index={index} maxKM={maxKM} isCurrent={entry.month === thisMonthKey} />
      ))}
    </BreakdownSheet>
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
      {entry.logs && entry.logs.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.logs.map((log, logIndex) => (
            <span key={`${log.odometer}-${logIndex}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#62685e]">
              <span className="min-w-0 truncate">{log.label}</span>
              <span className="shrink-0 font-bold text-[#4b5147]">{km(log.odometer)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function trendText(distance: DistanceInsight) {
  if (distance.trend === "first") return "First month";
  if (distance.trend === "flat") return "Same";
  return `${km(Math.abs(distance.delta_km))} ${distance.trend === "up" ? "more" : "less"}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const index = Number(month) - 1;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (!year || index < 0 || index > 11) return value;
  return `${names[index]} ${year}`;
}
