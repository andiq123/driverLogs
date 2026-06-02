import type { ComponentType } from "react";

export type View = "Garage" | "Dashboard" | "Timeline" | "Analytics" | "Fuel Prices" | "Reports" | "Settings";

export type ExpenseCategory =
  | "Fuel"
  | "Maintenance"
  | "Repairs"
  | "Insurance"
  | "Tires"
  | "Road Tax"
  | "Inspection"
  | "Parking"
  | "Car Wash"
  | "Parts"
  | "Upgrades"
  | "Miscellaneous";

export type Vehicle = {
  id: string;
  plate_number: string;
  nickname?: string;
  make?: string;
  model?: string;
  year?: number;
  engine_type?: string;
  vin?: string;
  preferred_fuel_type?: string;
  purchase_price?: number;
  purchase_currency?: string;
  odometer?: number;
  document_count?: number;
  latest_document?: DocumentAttachment;
};

export type VinDecode = {
  vin: string;
  make?: string;
  model?: string;
  model_year?: number;
  vehicle_type?: string;
  body_class?: string;
  engine_cylinders?: string;
  displacement_l?: string;
  fuel_type_primary?: string;
  plant_country?: string;
  manufacturer?: string;
  error_code?: string;
  error_text?: string;
  decoded_clean: boolean;
  source: string;
};

export type Expense = {
  id: string;
  vehicle_id: string;
  category: ExpenseCategory;
  amount_base?: number;
  base_currency?: string;
  amount_mdl: number;
  amount_eur: number;
  amount_usd: number;
  exchange_rate_eur?: number;
  exchange_rate_usd?: number;
  exchange_rate_date?: string;
  exchange_rate_source?: string;
  fuel_liters?: number;
  fuel_price_per_liter_mdl?: number;
  fuel_price_currency?: string;
  fuel_price_per_liter_base?: number;
  fuel_type?: string;
  fuel_full_tank?: boolean;
  odometer?: number;
  service_type?: string;
  expires_date?: string;
  date: string;
  description: string;
  attachment_count?: number;
  latest_attachment?: ExpenseAttachment;
};

export type ExpenseAttachment = {
  id: string;
  expense_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type DocumentAttachment = {
  id: string;
  owner_type: "user" | "vehicle";
  owner_id: string;
  kind: "driver_license" | "car_passport";
  file_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type FuelPriceSuggestion = {
  station_name?: string;
  brand?: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  fuel_type: string;
  price: number;
  currency: string;
  unit: string;
  lat?: number;
  lng?: number;
  updated_at?: string;
  source: string;
  station_level: boolean;
};

export type FuelPriceResponse = {
  country: string;
  region?: string;
  fuel_type: string;
  source: string;
  updated_at?: string;
  suggestions: FuelPriceSuggestion[];
};

export type FuelTrendChange = {
  amount: number;
  percent: number;
};

export type FuelTrendRow = {
  fuel_type: string;
  now: number;
  week: FuelTrendChange;
  month: FuelTrendChange;
  year: FuelTrendChange;
};

export type FuelTrendResponse = {
  country: string;
  currency: string;
  unit: string;
  source: string;
  rows: FuelTrendRow[];
};

export type FuelComparisonRow = {
  fuel_type: string;
  local_price_mdl: number;
  compare_price: number;
  compare_currency: string;
  compare_price_mdl: number;
  difference_mdl: number;
  difference_percent: number;
};

export type FuelComparisonResponse = {
  country: string;
  compare_country: string;
  currency: string;
  source: string;
  rows: FuelComparisonRow[];
};

export type FuelMarketResponse = {
  trends: FuelTrendResponse;
  comparison: FuelComparisonResponse;
};

export type UserSettings = {
  name?: string;
  default_currency: string;
  country: string;
  compare_country: string;
};

export type MoneyTotals = {
  total_expenses_mdl: number;
  total_expenses_eur: number;
  total_expenses_usd: number;
  fuel_mdl: number;
  maintenance_mdl: number;
  insurance_mdl: number;
  cost_per_km_mdl: number;
  expense_count: number;
  category_totals: ChartDatum[];
  vehicle_totals: VehicleTotal[];
  trends: TrendDatum[];
  insights: SmartInsights;
};

export type AppDataResponse = {
  vehicles: Vehicle[];
  expenses: Expense[];
  settings: UserSettings;
  user_documents: DocumentAttachment[];
  vehicle_totals: Record<string, MoneyTotals>;
};

export type TrendDatum = {
  month: string;
  amount_mdl: number;
};

export type SmartInsights = {
  fuel: FuelInsight;
  maintenance: MaintenanceInsight;
  insurance: YearlyExpiryInsight;
  inspection: YearlyExpiryInsight;
  reminders?: SmartReminder[];
  anomalies?: SmartAnomaly[];
  forecast?: SmartForecast;
};

export type FuelInsight = {
  entry_count: number;
  total_liters: number;
  average_fill_mdl: number;
  average_price_per_liter_mdl: number;
  average_consumption_l_per_100km?: number;
  consumption_samples?: number;
  consumption_confidence?: "learned" | "low" | "rough" | "none";
  full_tank_based?: boolean;
};

export type CategoryInsight = {
  entry_count: number;
  total_mdl: number;
  average_mdl: number;
  last_date?: string;
};

export type MaintenanceInsight = CategoryInsight & {
  oil_change: OilChangeInsight;
};

export type OilChangeInsight = {
  status: "estimated" | "not_enough_data";
  confidence: "learned" | "low" | "none";
  last_date?: string;
  next_date?: string;
  last_odometer?: number;
  next_odometer?: number;
  remaining_km?: number;
  interval_days?: number;
  recommended_interval_km?: number;
};

export type YearlyExpiryInsight = {
  status: "ok" | "soon" | "expired" | "not_logged";
  confidence: "yearly" | "none";
  last_date?: string;
  expires_date?: string;
  days_left?: number;
  interval_days?: number;
};

export type SmartReminder = {
  kind: "soon" | "expired";
  title: string;
  category: ExpenseCategory;
  date?: string;
  odometer?: number;
};

export type SmartAnomaly = {
  kind: "duplicate" | "fuel_price" | "service_cost";
  title: string;
  category?: ExpenseCategory;
  date?: string;
  value?: number;
};

export type SmartForecast = {
  next_30_days_mdl: number;
  next_90_days_mdl: number;
  next_service_mdl?: number;
  next_insurance_mdl?: number;
  next_inspection_mdl?: number;
};

export type ChartDatum = {
  name: string;
  amount_mdl: number;
  amount_eur: number;
  amount_usd: number;
};

export type VehicleTotal = ChartDatum & {
  vehicle_id: string;
  entry_count: number;
};

export type NavItem = {
  label: View;
  icon: ComponentType<{ size?: number; className?: string }>;
};

export type AuthSession = {
  token: string;
  login_id?: string;
  expires_in: number;
  max_vehicles: number;
};

export type LoginNotice = {
  loginID: string;
  isOpen: boolean;
  needsName?: boolean;
};

export type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  key?: string;
  kind: ToastKind;
  title: string;
  body?: string;
};
