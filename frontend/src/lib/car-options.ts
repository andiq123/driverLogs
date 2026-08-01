export const engineOptions = [
  "1.0 Petrol",
  "1.2 Petrol",
  "1.4 Petrol",
  "1.6 Petrol",
  "1.6 Diesel",
  "1.8 Petrol",
  "2.0 Petrol",
  "2.0 Diesel",
  "2.5 Hybrid",
  "3.0 Diesel",
  "Hybrid",
  "Plug-in Hybrid",
  "Electric",
];

export const priceCurrencies = ["MDL", "RON", "EUR", "USD", "UAH", "BGN", "HUF", "PLN", "CZK", "GBP", "CHF", "TRY"] as const;

export const fuelTypes = ["Super 95", "Diesel", "LPG", "Hybrid", "Electric"] as const;

export const gasStationBrands = [
  "Petrom",
  "OMV",
  "Lukoil",
  "Rompetrol",
  "MOL",
  "SOCAR",
  "Bemol",
  "Vento",
  "Tirex Petrol",
  "Avante",
  "ANP",
  "Oscar Downstream",
  "Gazprom",
  "Shell",
  "TotalEnergies",
  "Circle K",
  "Agip",
  "Efix",
];

export function normalizeFuelType(value?: string) {
  const fuelType = value?.trim().toLowerCase();
  if (fuelType === "diesel") return "Diesel";
  if (fuelType === "lpg" || fuelType === "gpl") return "LPG";
  if (fuelType === "hybrid") return "Hybrid";
  if (fuelType === "electric") return "Electric";
  return "Super 95";
}

export function oilIntervalForVehicle(fuelType?: string, engineType?: string) {
  const value = `${fuelType ?? ""} ${engineType ?? ""}`.trim().toLowerCase();
  if (value.includes("diesel")) return 10000;
  if (value.includes("lpg") || value.includes("gpl")) return 10000;
  if (value.includes("hybrid")) return 12000;
  if (value.includes("petrol") || value.includes("gasoline") || value.includes("super 95")) return 12000;
  return 10000;
}

export const servicePresetOptions = [
  { label: "Oil change", value: "oil_change" },
  { label: "Regular service", value: "regular_service" },
  { label: "Filters", value: "filters" },
  { label: "Alignment", value: "alignment" },
] as const;

export function serviceTypeLabel(value: string) {
  const labels: Record<string, string> = {
    oil_change: "Oil change",
    regular_service: "Regular service",
    filters: "Filters",
    alignment: "Alignment",
  };
  return labels[value] ?? value;
}

export function serviceTypeKeys(value: string) {
  return value.split(",").map((key) => key.trim()).filter(Boolean);
}

export function toggleServiceTypeKey(value: string, key: string) {
  const keys = serviceTypeKeys(value);
  const next = keys.includes(key) ? keys.filter((existing) => existing !== key) : [...keys, key];
  return next.join(",");
}

export function serviceDetail(serviceType?: string) {
  if (!serviceType) return "";
  return serviceTypeKeys(serviceType).map(serviceTypeLabel).join(" · ");
}
