"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2, Fuel, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import type { OilChangeInsight, SmartInsights, YearlyExpiryInsight } from "@/lib/types";
import { km, money } from "@/lib/format";
import { insightTones } from "@/lib/theme";

type InsightTone = keyof typeof insightTones;

export function SmartInsightsPanel({ insights }: { insights: SmartInsights }) {
  const oil = insights.maintenance.oil_change;
  return (
    <section className="grid w-full max-w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-5">
      <InsightTile index={0} icon={CalendarClock} title="Oil" value={oilValue(oil.next_odometer, oil.next_date)} detail={oilDetail(oil.confidence, oil.recommended_interval_km, oil.remaining_km, oil.next_odometer, oil.interval_days)} tone={oilTone(oil.remaining_km, oil.next_odometer)} badge={oilBadge(oil.remaining_km, oil.next_odometer)} progress={oilProgress(oil)} />
      <InsightTile index={1} icon={Fuel} title="Fuel" value={fuelValue(insights.fuel.average_consumption_l_per_100km, insights.fuel.average_fill_mdl)} detail={fuelDetail(insights.fuel.total_liters, insights.fuel.average_price_per_liter_mdl, insights.fuel.consumption_samples)} />
      <InsightTile index={2} icon={Wrench} title="Service" value={insights.maintenance.average_mdl ? money(insights.maintenance.average_mdl) : "No service yet"} detail={entryDetail(insights.maintenance.entry_count)} />
      <InsightTile index={3} icon={ShieldCheck} title="Insurance" value={expiryValue(insights.insurance)} detail={expiryDetail("insurance", insights.insurance)} tone={expiryTone(insights.insurance)} badge={expiryBadge(insights.insurance)} />
      <InsightTile index={4} icon={CheckCircle2} title="ITP" value={expiryValue(insights.inspection)} detail={expiryDetail("technical inspection", insights.inspection)} tone={expiryTone(insights.inspection)} badge={expiryBadge(insights.inspection)} />
      {insights.anomalies?.length ? <InsightTile index={5} icon={AlertTriangle} title="Check" value={String(insights.anomalies.length)} detail="Unusual records found in this car history." tone="warn" badge="Review" /> : null}
    </section>
  );
}

function InsightTile({ icon: Icon, title, value, detail, tone = "neutral", badge, progress, index = 0 }: { icon: LucideIcon; title: string; value: string; detail: string; tone?: InsightTone; badge?: string; progress?: number; index?: number }) {
  const colors = insightTones[tone];
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 26, delay: index * 0.05 }} className={`relative min-h-[7rem] min-w-0 overflow-hidden rounded-[20px] border p-3 ring-1 transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[8.75rem] sm:rounded-[24px] sm:p-4 ${colors.card}`}>
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${colors.wash}`} />
      <div className={`relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:gap-2 sm:text-[11px] sm:tracking-[0.14em] ${colors.meta}`}>
        <Icon size={14} />
        <span className="min-w-0 truncate">{title}</span>
      </div>
      <p className="relative mt-2 line-clamp-2 text-base font-bold leading-tight sm:mt-3 sm:text-lg">{value}</p>
      <p className={`relative mt-1 line-clamp-2 text-[11px] leading-4 sm:line-clamp-3 sm:text-xs sm:leading-5 ${colors.detail}`}>{detail}</p>
      {progress !== undefined ? (
        <div className={`relative mt-2 sm:mt-3 ${badge ? "pr-14" : ""}`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.25 + index * 0.05 }} className={`h-full rounded-full ${colors.bar}`} />
          </div>
        </div>
      ) : null}
      {badge ? <span className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold sm:bottom-3 sm:right-3 ${colors.badge}`}>{badge}</span> : null}
    </motion.div>
  );
}

function oilProgress(oil: OilChangeInsight) {
  const interval = oil.recommended_interval_km ?? 10000;
  if (!oil.next_odometer || oil.remaining_km === undefined || interval <= 0) return undefined;
  return Math.min(1, Math.max(0, (interval - oil.remaining_km) / interval));
}

function oilValue(nextOdometer?: number, nextDate?: string) {
  if (nextOdometer) return km(nextOdometer);
  if (nextDate) return formatDate(nextDate);
  return "Learning";
}

function oilDetail(confidence: string, intervalKM = 10000, remainingKM?: number, nextOdometer?: number, intervalDays?: number) {
  if (nextOdometer && remainingKM === 0) return `Next oil change is due now.`;
  if (remainingKM) return `${km(remainingKM)} left until next oil change.`;
  if (confidence === "learned") return `Next oil interval: ${km(intervalKM)}.`;
  if (intervalDays) return `Next oil change after ${km(intervalKM)}.`;
  return "Add Service → Oil change with odometer km.";
}

function fuelValue(consumption?: number, averageFill?: number) {
  if (consumption) return `${consumption} L/100 km`;
  if (averageFill) return money(averageFill);
  return "No fuel yet";
}

function fuelDetail(liters: number, averagePrice: number, consumptionSamples = 0) {
  if (!liters) return "Add fuel records with liters and price.";
  if (consumptionSamples) return `Learned from ${consumptionSamples} odometer interval${consumptionSamples === 1 ? "" : "s"}.`;
  const price = averagePrice ? `, ${averagePrice} MDL/L avg` : "";
  return `${liters} L logged${price}.`;
}

function entryDetail(count: number) {
  return count ? `${count} record${count === 1 ? "" : "s"} learned from this car.` : "Waiting for real expenses.";
}

function oilTone(remainingKM?: number, nextOdometer?: number): InsightTone {
  if (!nextOdometer) return "neutral";
  if (remainingKM === undefined) return "neutral";
  if (remainingKM <= 0) return "danger";
  if (remainingKM <= 1000) return "warn";
  return "good";
}

function oilBadge(remainingKM?: number, nextOdometer?: number) {
  if (!nextOdometer || remainingKM === undefined) return undefined;
  if (remainingKM <= 0) return "Due";
  if (remainingKM <= 1000) return "Soon";
  return "OK";
}

function expiryTone(insight: YearlyExpiryInsight): InsightTone {
  if (insight.status === "expired") return "danger";
  if (insight.status === "soon") return "warn";
  if (insight.status === "ok") return "good";
  return "neutral";
}

function expiryBadge(insight: YearlyExpiryInsight) {
  if (insight.status === "expired") return "Expired";
  if (insight.status === "soon") return "Soon";
  if (insight.status === "ok") return "OK";
  return undefined;
}

function expiryValue(insight: YearlyExpiryInsight) {
  if (insight.status === "not_logged") return "Not logged";
  if (insight.status === "expired") return "Expired";
  if (insight.status === "soon") return `${insight.days_left ?? 0} days`;
  return insight.expires_date ? formatDate(insight.expires_date) : "Yearly";
}

function expiryDetail(label: string, insight: YearlyExpiryInsight) {
  if (insight.status === "not_logged") return `Add a ${label} expense to track yearly expiry.`;
  if (insight.status === "expired") return `Expired on ${formatDate(insight.expires_date ?? "")}.`;
  if (insight.status === "soon") return `Ends on ${formatDate(insight.expires_date ?? "")}.`;
  return `Valid until ${formatDate(insight.expires_date ?? "")}.`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
