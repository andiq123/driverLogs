import type { Vehicle } from "./types";

export function money(amountMDL: number) {
  return `${decimalMoney(amountMDL)} MDL`;
}

export function equivalents(amountEUR: number, amountUSD: number) {
  return `${decimalMoney(amountEUR)} EUR · ${decimalMoney(amountUSD)} USD`;
}

export function km(value: number) {
  return `${new Intl.NumberFormat("ro-MD").format(value)} km`;
}

export function vehicleName(vehicle: Vehicle) {
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return vehicle.nickname || makeModel || vehicle.plate_number;
}

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

function hasFraction(value: number) {
  return Math.abs(value % 1) > Number.EPSILON;
}
