import { CalendarClock, CheckCircle2, Fuel, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import type { SmartInsights, YearlyExpiryInsight } from "@/lib/types";
import { km, money } from "@/lib/format";

export function SmartInsightsPanel({ insights }: { insights: SmartInsights }) {
  const oil = insights.maintenance.oil_change;
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-5">
      <InsightTile wide icon={CalendarClock} title="Oil change" value={oilValue(oil.next_odometer, oil.next_date)} detail={oilDetail(oil.confidence, oil.recommended_interval_km, oil.remaining_km, oil.next_odometer, oil.interval_days)} />
      <InsightTile icon={Fuel} title="Fuel trend" value={fuelValue(insights.fuel.average_consumption_l_per_100km, insights.fuel.average_fill_mdl)} detail={fuelDetail(insights.fuel.total_liters, insights.fuel.average_price_per_liter_mdl, insights.fuel.consumption_samples)} />
      <InsightTile icon={Wrench} title="Service average" value={insights.maintenance.average_mdl ? money(insights.maintenance.average_mdl) : "No service yet"} detail={entryDetail(insights.maintenance.entry_count)} />
      <InsightTile icon={ShieldCheck} title="Insurance" value={expiryValue(insights.insurance)} detail={expiryDetail("insurance", insights.insurance)} />
      <InsightTile icon={CheckCircle2} title="ITP" value={expiryValue(insights.inspection)} detail={expiryDetail("technical inspection", insights.inspection)} />
    </section>
  );
}

function InsightTile({ icon: Icon, title, value, detail, wide = false }: { icon: LucideIcon; title: string; value: string; detail: string; wide?: boolean }) {
  return (
    <div className={`relative min-h-[8.75rem] overflow-hidden rounded-[20px] bg-[#eef3e8] p-3 sm:rounded-[24px] sm:p-4 ${wide ? "sm:col-span-2 2xl:col-span-1" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),transparent_48%),radial-gradient(circle_at_88%_12%,rgba(15,143,104,0.08),transparent_34%)]" />
      <div className="relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#62685e] sm:gap-2 sm:text-[11px] sm:tracking-[0.14em]">
        <Icon size={14} />
        <span className="min-w-0 truncate">{title}</span>
      </div>
      <p className="relative mt-2 text-base font-bold leading-tight sm:mt-3 sm:text-lg">{value}</p>
      <p className="relative mt-1 line-clamp-3 text-xs leading-5 text-[#62685e]">{detail}</p>
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
