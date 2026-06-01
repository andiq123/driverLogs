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
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function intValue(value: FormDataEntryValue | null) {
  return Math.round(numberValue(value));
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
