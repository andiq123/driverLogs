"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Fuel, Minus, Route, ShieldCheck, TrendingDown, TrendingUp, Wallet, Wrench, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DistanceInsight, OilChangeInsight, SmartInsights, SpendingInsight, YearlyExpiryInsight } from "@/lib/types";
import { km, money } from "@/lib/format";
import { insightTones } from "@/lib/theme";
import { FuelBreakdownSheet } from "./fuel-breakdown-sheet";

type InsightTone = keyof typeof insightTones;

export function SmartInsightsPanel({ insights }: { insights: SmartInsights }) {
  const oil = insights.maintenance.oil_change;
  const fuelBreakdown = insights.fuel.consumption_breakdown;
  const [showFuelMath, setShowFuelMath] = useState(false);
  return (
    <section className="grid w-full max-w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-5">
      <InsightTile index={0} icon={CalendarClock} title="Oil" value={oilValue(oil.next_odometer, oil.next_date)} detail={oilDetail(oil.confidence, oil.recommended_interval_km, oil.remaining_km, oil.next_odometer, oil.interval_days)} tone={oilTone(oil.remaining_km, oil.next_odometer)} badge={oilBadge(oil.remaining_km, oil.next_odometer)} progress={oilProgress(oil)} />
      <InsightTile index={1} icon={Fuel} title="Fuel" value={fuelValue(insights.fuel.average_consumption_l_per_100km, insights.fuel.average_fill_mdl)} detail={fuelDetail(insights.fuel.total_liters, insights.fuel.average_price_per_liter_mdl, insights.fuel.consumption_samples)} onClick={fuelBreakdown ? () => setShowFuelMath(true) : undefined} />
      <FuelBreakdownSheet breakdown={showFuelMath ? fuelBreakdown : undefined} confidence={insights.fuel.consumption_confidence} onClose={() => setShowFuelMath(false)} />
      {insights.distance ? <InsightTile index={2} icon={Route} title="Driving" value={distanceValue(insights.distance)} detail={distanceDetail(insights.distance)} sparkline={insights.distance.months.map((entry) => entry.km)} /> : null}
      <InsightTile index={3} icon={Wrench} title="Service" value={insights.maintenance.average_mdl ? money(insights.maintenance.average_mdl) : "No service yet"} detail={entryDetail(insights.maintenance.entry_count)} />
      {insights.spending ? <InsightTile index={4} icon={Wallet} title="Spending" value={spendingValue(insights.spending)} detail={spendingDetail(insights.spending)} tone={spendingTone(insights.spending)} sparkline={insights.spending.months.map((entry) => entry.mdl)} /> : null}
      <InsightTile index={5} icon={ShieldCheck} title="Insurance" value={expiryValue(insights.insurance)} detail={expiryDetail("insurance", insights.insurance)} tone={expiryTone(insights.insurance)} badge={expiryBadge(insights.insurance)} />
      <InsightTile index={6} icon={CheckCircle2} title="ITP" value={expiryValue(insights.inspection)} detail={expiryDetail("technical inspection", insights.inspection)} tone={expiryTone(insights.inspection)} badge={expiryBadge(insights.inspection)} />
      <AnimatePresence initial={false}>
        {insights.anomalies?.length ? <InsightTile key="anomalies" index={7} icon={AlertTriangle} title="Check" value={String(insights.anomalies.length)} detail="Unusual records found in this car history." tone="warn" badge="Review" /> : null}
      </AnimatePresence>
    </section>
  );
}

function InsightTile({ icon: Icon, title, value, detail, tone = "neutral", badge, progress, sparkline, index = 0, onClick }: { icon: LucideIcon; title: string; value: string; detail: ReactNode; tone?: InsightTone; badge?: string; progress?: number; sparkline?: number[]; index?: number; onClick?: () => void }) {
  const colors = insightTones[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: index * 0.05 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
      className={`relative min-h-[7rem] min-w-0 overflow-hidden rounded-[20px] border p-3 ring-1 transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[8.75rem] sm:rounded-[24px] sm:p-4 ${colors.card} ${onClick ? "cursor-pointer touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#9db89a]" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${colors.wash}`} />
      <div className={`relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:gap-2 sm:text-[11px] sm:tracking-[0.14em] ${colors.meta}`}>
        <Icon size={14} />
        <span className="min-w-0 truncate">{title}</span>
        {onClick ? <ChevronRight size={13} className="ml-auto shrink-0" /> : null}
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
      {sparkline && sparkline.length > 1 ? <MiniSparkline values={sparkline} className={`relative mt-2 hidden h-7 w-full sm:block ${colors.detail}`} /> : null}
      {badge ? <span className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold sm:bottom-3 sm:right-3 ${colors.badge}`}>{badge}</span> : null}
    </motion.div>
  );
}

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const width = 100;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 4 - ((value - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      <motion.polygon initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: 0.5, delay: 0.2 }} points={area} fill="currentColor" stroke="none" />
      <motion.polyline initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.15 }} points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.85} />
      <circle cx={lastX} cy={lastY} r={2.4} fill="currentColor" />
    </svg>
  );
}

function oilProgress(oil: OilChangeInsight) {
  const interval = oil.recommended_interval_km ?? 10000;
  if (!oil.next_odometer || oil.remaining_km === undefined || interval <= 0) return undefined;
  return Math.min(1, Math.max(0, (interval - oil.remaining_km) / interval));
}

function distanceValue(distance: DistanceInsight) {
  if (distance.status === "not_enough_data") return "Learning";
  if (!distance.has_current) return "No km yet";
  return km(distance.this_month_km);
}

function distanceDetail(distance: DistanceInsight) {
  if (distance.status === "not_enough_data") return "Log odometer with fuel or service to track distance.";
  if (!distance.has_current) {
    return distance.monthly_average_km ? `Usually ${km(distance.monthly_average_km)} a month.` : "No distance logged this month yet.";
  }
  if (distance.trend === "first") return "This month so far · first tracked month.";
  const magnitude = km(Math.abs(distance.delta_km));
  if (distance.trend === "up") return <TrendNote icon={TrendingUp}>{magnitude} more than last month.</TrendNote>;
  if (distance.trend === "down") return <TrendNote icon={TrendingDown}>{magnitude} less than last month.</TrendNote>;
  return <TrendNote icon={Minus}>Same as last month.</TrendNote>;
}

function spendingValue(spending: SpendingInsight) {
  return money(spending.this_month_mdl);
}

function spendingDetail(spending: SpendingInsight) {
  if (spending.trend === "first") return "This month so far · first tracked month.";
  const magnitude = money(Math.abs(spending.delta_mdl));
  if (spending.trend === "up") return <TrendNote icon={TrendingUp}>{magnitude} more than last month.</TrendNote>;
  if (spending.trend === "down") return <TrendNote icon={TrendingDown}>{magnitude} less than last month.</TrendNote>;
  return <TrendNote icon={Minus}>Same as last month.</TrendNote>;
}

function spendingTone(spending: SpendingInsight): InsightTone {
  if (spending.trend === "down") return "good";
  return "neutral";
}

function TrendNote({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={12} className="shrink-0" />
      <span>{children}</span>
    </span>
  );
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
