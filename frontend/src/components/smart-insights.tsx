import { CalendarClock, CheckCircle2, Fuel, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import type { SmartInsights, YearlyExpiryInsight } from "@/lib/types";
import { km, money } from "@/lib/format";
import { insightTones } from "@/lib/theme";

type InsightTone = keyof typeof insightTones;

export function SmartInsightsPanel({ insights }: { insights: SmartInsights }) {
  const oil = insights.maintenance.oil_change;
  return (
    <section className="flex w-full max-w-full min-w-0 snap-x gap-2 overflow-x-auto pb-1 pr-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pr-0 2xl:grid-cols-5">
      <InsightTile icon={CalendarClock} title="Oil" value={oilValue(oil.next_odometer, oil.next_date)} detail={oilDetail(oil.confidence, oil.recommended_interval_km, oil.remaining_km, oil.next_odometer, oil.interval_days)} tone={oilTone(oil.remaining_km, oil.next_odometer)} badge={oilBadge(oil.remaining_km, oil.next_odometer)} />
      <InsightTile icon={Fuel} title="Fuel" value={fuelValue(insights.fuel.average_consumption_l_per_100km, insights.fuel.average_fill_mdl)} detail={fuelDetail(insights.fuel.total_liters, insights.fuel.average_price_per_liter_mdl, insights.fuel.consumption_samples)} />
      <InsightTile icon={Wrench} title="Service" value={insights.maintenance.average_mdl ? money(insights.maintenance.average_mdl) : "No service yet"} detail={entryDetail(insights.maintenance.entry_count)} />
      <InsightTile icon={ShieldCheck} title="Insurance" value={expiryValue(insights.insurance)} detail={expiryDetail("insurance", insights.insurance)} tone={expiryTone(insights.insurance)} badge={expiryBadge(insights.insurance)} />
      <InsightTile icon={CheckCircle2} title="ITP" value={expiryValue(insights.inspection)} detail={expiryDetail("technical inspection", insights.inspection)} tone={expiryTone(insights.inspection)} badge={expiryBadge(insights.inspection)} />
    </section>
  );
}

function InsightTile({ icon: Icon, title, value, detail, tone = "neutral", badge }: { icon: LucideIcon; title: string; value: string; detail: string; tone?: InsightTone; badge?: string }) {
  const colors = insightTones[tone];
  return (
    <div className={`relative min-h-[7.35rem] w-28 shrink-0 snap-start overflow-hidden rounded-[20px] border p-3 ring-1 transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[8.75rem] sm:w-auto sm:rounded-[24px] sm:p-4 ${colors.card}`}>
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${colors.wash}`} />
      <div className={`relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:gap-2 sm:text-[11px] sm:tracking-[0.14em] ${colors.meta}`}>
        <Icon size={14} />
        <span className="min-w-0 truncate">{title}</span>
      </div>
      <p className="relative mt-2 line-clamp-2 text-base font-bold leading-tight sm:mt-3 sm:text-lg">{value}</p>
      <p className={`relative mt-1 line-clamp-2 text-[11px] leading-4 sm:line-clamp-3 sm:text-xs sm:leading-5 ${colors.detail}`}>{detail}</p>
      {badge ? <span className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold sm:bottom-3 sm:right-3 ${colors.badge}`}>{badge}</span> : null}
    </div>
  );
}

function oilValue(nextOdometer?: number, nextDate?: string) {
  if (nextOdometer) return km(nextOdometer);
  if (nextDate) return formatDate(nextDate);
  return "Learning";
}

function oilDetail(confidence: string, intervalKM = 10000, remainingKM?: number, nextOdometer?: number, intervalDays?: number) {
  if (nextOdometer && remainingKM === 0) return `Due now. European default is ${km(intervalKM)} or 12 months.`;
  if (remainingKM) return `${km(remainingKM)} left. European default is ${km(intervalKM)} or 12 months.`;
  if (confidence === "learned") return `Learned from your km history. Typical interval: ${km(intervalKM)}.`;
  if (intervalDays) return `First estimate: ${km(intervalKM)} or about ${intervalDays} days.`;
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
