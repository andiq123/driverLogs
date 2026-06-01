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

export const priceCurrencies = ["MDL", "EUR", "USD", "RON"] as const;

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
