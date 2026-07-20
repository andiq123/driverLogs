import type { ExpenseCategory } from "./types";

export { servicePresetOptions, serviceTypeKeys, toggleServiceTypeKey } from "./car-options";

export const draftFuelTypeByVehicle = new Map<string, string>();

export function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function amountPlaceholder(category: ExpenseCategory, currency: string) {
  if (category === "Fuel") return `Total or auto from liters, ${currency}`;
  return `Amount ${currency}`;
}

export function descriptionPlaceholder(category: ExpenseCategory) {
  const placeholders: Record<ExpenseCategory, string> = {
    Fuel: "Station, route, or receipt note",
    Maintenance: "Optional note · workshop, parts",
    Repairs: "Service work or workshop note",
    Insurance: "Policy, provider, or coverage",
    Tires: "Tire set, mounting, balancing",
    "Road Tax": "Tax period or document note",
    Inspection: "Inspection station or result",
    Parking: "Location or subscription",
    "Car Wash": "Wash type or detailing note",
    Parts: "Part name or supplier",
    Upgrades: "Speakers, subwoofer, CarPlay, tune",
    Miscellaneous: "Any other ownership cost",
  };
  return placeholders[category];
}

export function expenseDescription(category: ExpenseCategory, description: string, gasStation: string) {
  const cleanDescription = description.trim();
  const cleanStation = gasStation.trim();
  if (category !== "Fuel" || !cleanStation) return cleanDescription;
  if (!cleanDescription || cleanDescription === cleanStation) return cleanStation;
  return `${cleanStation} · ${cleanDescription}`;
}

export function addYear(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return "";
  const next = new Date(year + 1, month - 1, day);
  const nextYear = String(next.getFullYear()).padStart(4, "0");
  const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
