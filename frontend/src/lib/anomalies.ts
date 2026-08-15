import { dateText } from "./format";
import type { SmartAnomaly } from "./types";

export function anomalyLocation(anomaly: SmartAnomaly) {
  return [anomaly.category, anomaly.date ? dateText(anomaly.date) : ""].filter(Boolean).join(" · ");
}

export function anomalyReason(anomaly: SmartAnomaly) {
  if (anomaly.reason) return anomaly.reason;
  if (anomaly.kind === "duplicate") return "Another record has the same category, date, and amount.";
  if (anomaly.kind === "fuel_price") return "This price per liter is unusually high compared with earlier fuel records.";
  return "This service cost is unusually high compared with earlier maintenance records.";
}

export function anomalyObserved(anomaly: SmartAnomaly) {
  return anomaly.value === undefined ? undefined : formatAnomalyValue(anomaly.value, anomaly.unit);
}

export function anomalyBaseline(anomaly: SmartAnomaly) {
  return anomaly.baseline_value === undefined ? undefined : formatAnomalyValue(anomaly.baseline_value, anomaly.unit);
}

export function anomalyDifference(anomaly: SmartAnomaly) {
  return anomaly.difference_percent === undefined ? undefined : `${formatNumber(anomaly.difference_percent)}% above`;
}

export function anomalyHistory(anomaly: SmartAnomaly) {
  if (anomaly.kind === "duplicate") return `${anomaly.expense_ids?.length ?? 2} matching records`;
  if (!anomaly.sample_count) return undefined;
  const noun = anomaly.kind === "fuel_price" ? "earlier fill" : "earlier service";
  return `${anomaly.sample_count} ${noun}${anomaly.sample_count === 1 ? "" : "s"}`;
}

function formatAnomalyValue(value: number, unit = "MDL") {
  return `${formatNumber(value)} ${unit}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}
