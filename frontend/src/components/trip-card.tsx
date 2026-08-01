"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, Flag, Fuel, Gauge, Play, Route, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { equivalents, km, money } from "@/lib/format";
import type { Trip, Vehicle } from "@/lib/types";
import { ActionButton, Input } from "./ui";

type TripCardProps = {
  vehicle: Vehicle;
  trips: Trip[];
  busy?: boolean;
  isDemo?: boolean;
  onStart: (vehicleID: string, name?: string, startOdometer?: number) => void;
  onEnd: (tripID: string, endOdometer?: number) => void;
};

export function TripCard({ vehicle, trips, busy, isDemo, onStart, onEnd }: TripCardProps) {
  const [mode, setMode] = useState<"" | "start" | "end">("");
  const active = trips.find((trip) => !trip.ended_at);
  const recent = trips.find((trip) => trip.ended_at);

  function submitStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onStart(vehicle.id, String(data.get("trip_name") ?? "").trim(), numberOrUndefined(data.get("start_odometer")));
    setMode("");
  }

  function submitEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const data = new FormData(event.currentTarget);
    onEnd(active.id, numberOrUndefined(data.get("end_odometer")));
    setMode("");
  }

  return (
    <motion.section layout transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }} className={`relative overflow-hidden rounded-[24px] border p-3.5 shadow-[0_8px_28px_rgba(31,41,28,0.06)] sm:rounded-[28px] sm:p-5 ${active ? "border-[#83a77b]/25 bg-[#1b2c20]/[0.97] text-white shadow-[0_16px_42px_rgba(27,44,32,0.18)]" : "border-black/[0.055] bg-[#fffffb]/96 ring-1 ring-white/70"}`}>
      {active ? <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[#b9d8a8]/10 blur-2xl" /> : null}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-[15px] ${active ? "bg-white/10" : "bg-[#edf4e7]"}`}><Route size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {active ? <motion.span aria-hidden className="size-2 rounded-full bg-[#b9e2a9]" animate={{ opacity: [0.45, 1, 0.45], scale: [0.85, 1, 0.85] }} transition={{ duration: 2, repeat: Infinity }} /> : null}
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${active ? "text-white/55" : "text-[#70776a]"}`}>{active ? "Trip in progress" : "Trips"}</p>
            </div>
            <h2 className="truncate text-base font-semibold sm:text-lg">{active?.name || "Ready to go"}</h2>
          </div>
        </div>
        <button type="button" onClick={() => setMode(active ? (mode === "end" ? "" : "end") : (mode === "start" ? "" : "start"))} disabled={busy} className={`flex h-11 shrink-0 touch-manipulation items-center gap-2 rounded-[16px] px-3.5 text-sm font-bold transition-[background-color,transform,opacity] duration-300 active:scale-[0.98] disabled:opacity-60 ${active ? "bg-white text-[#151712]" : "bg-[#151712] text-white"}`}>
          {active ? <CircleStop size={16} /> : <Play size={16} fill="currentColor" />}
          {active ? "Finish" : "Start trip"}
        </button>
      </div>

      {active ? (
        <div className="relative mt-4">
          <p className="text-xs text-white/55">Started {dateTime(active.started_at)} · from {km(active.start_odometer)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TripMetric index={0} icon={Gauge} label="Distance" value={active.distance_km ? km(active.distance_km) : "Tracking"} />
            <TripMetric index={1} icon={Wallet} label="Spent so far" value={money(active.fuel_spend_mdl)} />
            <TripMetric index={2} icon={Fuel} label="Fuel" value={`${active.fuel_liters || 0} L · ${active.fill_count} fill${active.fill_count === 1 ? "" : "s"}`} />
            <TripMetric index={3} icon={Route} label="Cost / km" value={active.cost_per_km_mdl ? `${active.cost_per_km_mdl} MDL` : "Learning"} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-[11px] leading-4 text-white/48">
            <p>Fuel fills group here and still count in regular totals.</p>
            {active.average_price_per_liter_mdl ? <p className="font-semibold text-white/62">Avg {active.average_price_per_liter_mdl} MDL/L · {equivalents(active.fuel_spend_eur, active.fuel_spend_usd)}</p> : null}
          </div>
        </div>
      ) : recent ? (
        <div className="relative mt-4 flex w-full items-center gap-3 rounded-[18px] bg-[#f3f7ef] p-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[13px] bg-white text-[#376247]"><Flag size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{recent.name}</span>
            <span className="block truncate text-xs text-[#697064]">{km(recent.distance_km)} · {money(recent.fuel_spend_mdl)} · {recent.fill_count} fill{recent.fill_count === 1 ? "" : "s"}</span>
          </span>
          <span className="hidden text-right text-[11px] text-[#7a8175] sm:block">{equivalents(recent.fuel_spend_eur, recent.fuel_spend_usd)}</span>
        </div>
      ) : (
        <p className="relative mt-3 text-xs leading-5 text-[#697064]">Start a trip and every new fuel fill will join one clean distance and spending summary.</p>
      )}

      <AnimatePresence initial={false}>
        {mode ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden">
            {mode === "start" ? (
              <form onSubmit={submitStart} className="mt-3 grid gap-2 border-t border-black/[0.06] pt-3 sm:grid-cols-[1fr_11rem_auto]">
                <Input name="trip_name" label="Trip name" placeholder="Trip name (optional)" maxLength={80} />
                <Input name="start_odometer" label="Start odometer" type="number" min={0} defaultValue={vehicle.odometer || ""} showLabel />
                <ActionButton type="submit" icon={Play} loading={busy} className="px-5">Start</ActionButton>
                {isDemo ? <p className="text-[11px] text-[#7a8175] sm:col-span-3">Demo is read-only. Sign in to start your own trip.</p> : null}
              </form>
            ) : (
              <form onSubmit={submitEnd} className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[1fr_auto]">
                <Input name="end_odometer" label="End odometer" type="number" min={active?.start_odometer ?? 0} defaultValue={vehicle.odometer || active?.start_odometer || ""} showLabel />
                <ActionButton type="submit" icon={Flag} loading={busy} className="bg-[#b9d8a8] px-5 !text-[#162019]">Finish trip</ActionButton>
                <p className="text-[11px] text-white/48 sm:col-span-2">Use the final odometer reading for an exact trip distance.</p>
              </form>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function TripMetric({ icon: Icon, label, value, index }: { icon: typeof Gauge; label: string; value: string; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + index * 0.045, duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 rounded-[16px] border border-white/8 bg-white/[0.075] p-2.5 backdrop-blur-sm">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/48"><Icon size={12} />{label}</span>
      <span className="mt-1.5 block truncate text-xs font-bold text-white sm:text-sm">{value}</span>
    </motion.div>
  );
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
