import type { Vehicle } from "./types";

export function money(amountMDL: number) {
  return `${decimalMoney(amountMDL)} MDL`;
}

export function equivalents(amountEUR: number, amountUSD: number) {
  return `${convertedMoney(amountEUR)} EUR · ${convertedMoney(amountUSD)} USD`;
}

export function km(value: number) {
  return `${new Intl.NumberFormat("ro-MD").format(value)} km`;
}

export function vehicleName(vehicle: Vehicle) {
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return vehicle.nickname || makeModel || vehicle.plate_number;
}

export function dateText(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return value;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(Date.UTC(Number(year), monthIndex, 1)));
}

/** Local calendar date as YYYY-MM-DD. */
export function todayDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Price equality epsilon for fuel comparisons (MDL/L). */
export const PRICE_EPSILON = 0.01;

export function numberValue(value: FormDataEntryValue | null) {
  const normalized = normalizeDecimal(String(value ?? ""));
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function intValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/[^\d-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDecimal(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return compact.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  }
  if (comma >= 0) return compact.replace(",", ".");
  return compact;
}

function decimalMoney(value: number) {
  return new Intl.NumberFormat("ro-MD", {
    minimumFractionDigits: hasFraction(value) ? 2 : 0,
    maximumFractionDigits: 6,
  }).format(value);
}

function convertedMoney(value: number) {
  return new Intl.NumberFormat("ro-MD", {
    minimumFractionDigits: hasFraction(value) ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function hasFraction(value: number) {
  return Math.abs(value % 1) > Number.EPSILON;
}
