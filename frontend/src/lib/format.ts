import type { Vehicle } from "./types";

export function money(amountMDL: number) {
  return `${new Intl.NumberFormat("ro-MD").format(amountMDL)} MDL`;
}

export function equivalents(amountEUR: number, amountUSD: number) {
  return `${new Intl.NumberFormat("ro-MD", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amountEUR)} · ${new Intl.NumberFormat("ro-MD", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amountUSD)}`;
}

export function km(value: number) {
  return `${new Intl.NumberFormat("ro-MD").format(value)} km`;
}

export function vehicleName(vehicle: Vehicle) {
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return vehicle.nickname || makeModel || vehicle.plate_number;
}

export function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
