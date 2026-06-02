import type { AppDataResponse, FuelMarketResponse, FuelPriceSuggestion, MoneyTotals } from "./types";

const vehicleID = "demo_vehicle_f10";

const demoTotals: MoneyTotals = {
  total_expenses_mdl: 17384.86,
  total_expenses_eur: 861.33,
  total_expenses_usd: 998.72,
  fuel_mdl: 3769.86,
  maintenance_mdl: 7120,
  insurance_mdl: 2190,
  cost_per_km_mdl: 0,
  expense_count: 10,
  category_totals: [
    { name: "Fuel", amount_mdl: 3769.86, amount_eur: 186.82, amount_usd: 216.59 },
    { name: "Maintenance", amount_mdl: 7120, amount_eur: 352.7, amount_usd: 408.93 },
    { name: "Insurance", amount_mdl: 2190, amount_eur: 108.47, amount_usd: 125.79 },
    { name: "Tires", amount_mdl: 3350, amount_eur: 165.95, amount_usd: 192.38 },
    { name: "Inspection", amount_mdl: 450, amount_eur: 22.29, amount_usd: 25.84 },
    { name: "Parking", amount_mdl: 505, amount_eur: 25.01, amount_usd: 29 },
  ],
  vehicle_totals: [{ vehicle_id: vehicleID, name: "BMW F10 530D", amount_mdl: 17384.86, amount_eur: 861.33, amount_usd: 998.72, entry_count: 10 }],
  trends: [
    { month: "2026-01", amount_mdl: 3050 },
    { month: "2026-02", amount_mdl: 2190 },
    { month: "2026-03", amount_mdl: 4910 },
    { month: "2026-04", amount_mdl: 3021.86 },
    { month: "2026-05", amount_mdl: 4214 },
  ],
  insights: {
    fuel: {
      entry_count: 4,
      total_liters: 177.2,
      average_fill_mdl: 942.47,
      average_price_per_liter_mdl: 21.28,
      average_consumption_l_per_100km: 7.6,
      consumption_samples: 3,
      consumption_confidence: "learned",
    },
    maintenance: {
      entry_count: 3,
      total_mdl: 7120,
      average_mdl: 2373.33,
      last_date: "2026-05-08",
      oil_change: {
        status: "estimated",
        confidence: "learned",
        last_date: "2026-05-08",
        next_date: "2026-11-08",
        last_odometer: 184260,
        next_odometer: 194260,
        remaining_km: 9430,
        interval_days: 184,
        recommended_interval_km: 10000,
      },
    },
    insurance: {
      status: "soon",
      confidence: "yearly",
      last_date: "2025-06-24",
      expires_date: "2026-06-24",
      days_left: 22,
      interval_days: 365,
    },
    inspection: {
      status: "ok",
      confidence: "yearly",
      last_date: "2026-03-12",
      expires_date: "2027-03-12",
      days_left: 283,
      interval_days: 365,
    },
  },
};

export const demoAppData: AppDataResponse = {
  vehicles: [
    {
      id: vehicleID,
      plate_number: "KMM 123",
      nickname: "BMW F10 530D",
      make: "BMW",
      model: "530D",
      year: 2016,
      engine_type: "3.0 Diesel",
      vin: "WBAFW51060D123456",
      preferred_fuel_type: "Diesel",
      purchase_price: 248000,
      purchase_currency: "MDL",
      odometer: 184830,
    },
  ],
  expenses: [
    { id: "demo_exp_10", vehicle_id: vehicleID, category: "Fuel", amount_base: 931.86, base_currency: "MDL", amount_mdl: 931.86, amount_eur: 46.17, amount_usd: 53.48, exchange_rate_date: "2026-05-28", exchange_rate_source: "Demo stamped rate", fuel_liters: 32.4, fuel_price_currency: "MDL", fuel_price_per_liter_base: 28.76, fuel_price_per_liter_mdl: 28.76, fuel_type: "Diesel", odometer: 184830, date: "2026-05-28", description: "Petrom" },
    { id: "demo_exp_9", vehicle_id: vehicleID, category: "Maintenance", amount_base: 1850, base_currency: "MDL", amount_mdl: 1850, amount_eur: 91.67, amount_usd: 106.21, exchange_rate_date: "2026-05-08", exchange_rate_source: "Demo stamped rate", odometer: 184260, date: "2026-05-08", description: "Oil change · Filters" },
    { id: "demo_exp_8", vehicle_id: vehicleID, category: "Parking", amount_base: 505, base_currency: "MDL", amount_mdl: 505, amount_eur: 25.01, amount_usd: 29, exchange_rate_date: "2026-05-02", exchange_rate_source: "Demo stamped rate", odometer: 183920, date: "2026-05-02", description: "Monthly parking" },
    { id: "demo_exp_7", vehicle_id: vehicleID, category: "Fuel", amount_base: 1010, base_currency: "MDL", amount_mdl: 1010, amount_eur: 50.05, amount_usd: 58, exchange_rate_date: "2026-04-22", exchange_rate_source: "Demo stamped rate", fuel_liters: 35, fuel_price_currency: "MDL", fuel_price_per_liter_base: 28.86, fuel_price_per_liter_mdl: 28.86, fuel_type: "Diesel", odometer: 183740, date: "2026-04-22", description: "Lukoil" },
    { id: "demo_exp_6", vehicle_id: vehicleID, category: "Tires", amount_base: 3350, base_currency: "MDL", amount_mdl: 3350, amount_eur: 165.95, amount_usd: 192.38, exchange_rate_date: "2026-03-29", exchange_rate_source: "Demo stamped rate", odometer: 182980, date: "2026-03-29", description: "Summer tires" },
    { id: "demo_exp_5", vehicle_id: vehicleID, category: "Inspection", amount_base: 450, base_currency: "MDL", amount_mdl: 450, amount_eur: 22.29, amount_usd: 25.84, exchange_rate_date: "2026-03-12", exchange_rate_source: "Demo stamped rate", odometer: 182600, date: "2026-03-12", description: "ITP" },
    { id: "demo_exp_4", vehicle_id: vehicleID, category: "Fuel", amount_base: 918, base_currency: "MDL", amount_mdl: 918, amount_eur: 45.47, amount_usd: 52.72, exchange_rate_date: "2026-03-04", exchange_rate_source: "Demo stamped rate", fuel_liters: 43.1, fuel_price_currency: "MDL", fuel_price_per_liter_base: 21.3, fuel_price_per_liter_mdl: 21.3, fuel_type: "Diesel", odometer: 182210, date: "2026-03-04", description: "Rompetrol" },
    { id: "demo_exp_3", vehicle_id: vehicleID, category: "Insurance", amount_base: 2190, base_currency: "MDL", amount_mdl: 2190, amount_eur: 108.47, amount_usd: 125.79, exchange_rate_date: "2026-02-24", exchange_rate_source: "Demo stamped rate", odometer: 181780, date: "2026-02-24", description: "RCA insurance" },
    { id: "demo_exp_2", vehicle_id: vehicleID, category: "Maintenance", amount_base: 3970, base_currency: "MDL", amount_mdl: 3970, amount_eur: 196.64, amount_usd: 228.05, exchange_rate_date: "2026-01-18", exchange_rate_source: "Demo stamped rate", odometer: 180910, date: "2026-01-18", description: "Brake pads · Alignment" },
    { id: "demo_exp_1", vehicle_id: vehicleID, category: "Fuel", amount_base: 910, base_currency: "MDL", amount_mdl: 910, amount_eur: 45.08, amount_usd: 52.29, exchange_rate_date: "2026-01-07", exchange_rate_source: "Demo stamped rate", fuel_liters: 61.7, fuel_price_currency: "RON", fuel_price_per_liter_base: 7.38, fuel_price_per_liter_mdl: 14.75, fuel_type: "Diesel", odometer: 180120, date: "2026-01-07", description: "OMV Romania" },
  ],
  settings: { name: "Demo driver", default_currency: "MDL", country: "MD", compare_country: "RO" },
  vehicle_totals: { [vehicleID]: demoTotals },
};

export const demoFuelMarket: FuelMarketResponse = {
  trends: {
    country: "MD",
    currency: "MDL",
    unit: "liter",
    source: "Demo Autotraveler snapshot",
    rows: [
      { fuel_type: "Super 95", now: 31.35, week: { amount: 0.44, percent: 1.42 }, month: { amount: 2.03, percent: 6.92 }, year: { amount: 8.49, percent: 37.14 } },
      { fuel_type: "Premium 95", now: 33.1, week: { amount: 0, percent: 0 }, month: { amount: 0, percent: 0 }, year: { amount: 3.15, percent: 10.52 } },
      { fuel_type: "Diesel", now: 29.15, week: { amount: 0.15, percent: 0.52 }, month: { amount: -1.11, percent: -3.67 }, year: { amount: 10.54, percent: 56.64 } },
      { fuel_type: "LPG", now: 16.05, week: { amount: 0, percent: 0 }, month: { amount: -0.2, percent: -1.23 }, year: { amount: 1.8, percent: 12.63 } },
    ],
  },
  comparison: {
    country: "MD",
    compare_country: "RO",
    currency: "MDL",
    source: "Demo comparison",
    rows: [
      { fuel_type: "Super 95", local_price_mdl: 31.35, compare_price: 8.64, compare_currency: "RON", compare_price_mdl: 33.12, difference_mdl: 1.77, difference_percent: 5.65 },
      { fuel_type: "Diesel", local_price_mdl: 29.15, compare_price: 8.25, compare_currency: "RON", compare_price_mdl: 31.62, difference_mdl: 2.47, difference_percent: 8.47 },
      { fuel_type: "LPG", local_price_mdl: 16.05, compare_price: 3.68, compare_currency: "RON", compare_price_mdl: 14.1, difference_mdl: -1.95, difference_percent: -12.15 },
    ],
  },
};

export function demoFuelSuggestions(fuelType: string): FuelPriceSuggestion[] {
  const normalized = fuelType === "LPG" ? "LPG" : fuelType === "Diesel" ? "Diesel" : "Super 95";
  const price = normalized === "Diesel" ? 29.15 : normalized === "LPG" ? 16.05 : 31.35;
  return [
    {
      brand: "Moldova national reference",
      country: "MD",
      fuel_type: normalized,
      price,
      currency: "MDL",
      unit: "liter",
      source: "Demo Autotraveler snapshot",
      station_level: false,
    },
    {
      brand: "Petrom",
      station_name: "Petrom Chisinau",
      city: "Chisinau",
      country: "MD",
      fuel_type: normalized,
      price: price + 0.12,
      currency: "MDL",
      unit: "liter",
      source: "Demo station suggestion",
      station_level: true,
    },
  ];
}
