import type { ComponentType } from "react";

export type View = "Garage" | "Dashboard" | "Timeline" | "Analytics" | "Fuel Prices" | "Settings";

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
  oil_interval_km?: number;
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
  trip_id?: string;
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
  fuel_full_tank?: boolean;
  fuel_price_per_liter_mdl?: number;
  fuel_price_currency?: string;
  fuel_price_per_liter_base?: number;
  fuel_type?: string;
  odometer?: number;
  service_type?: string;
  expires_date?: string;
  date: string;
  description: string;
  exclude_from_analytics?: boolean;
  attachment_count?: number;
  latest_attachment?: ExpenseAttachment;
};

export type Trip = {
  id: string;
  vehicle_id: string;
  name: string;
  start_odometer: number;
  end_odometer?: number;
  started_at: string;
  ended_at?: string;
  distance_km: number;
  fuel_spend_mdl: number;
  fuel_spend_eur: number;
  fuel_spend_usd: number;
  fuel_liters: number;
  fill_count: number;
  average_price_per_liter_mdl: number;
  cost_per_km_mdl: number;
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
  cache?: CacheInfo;
};

export type CacheInfo = {
  expires_at?: string;
  expires_in_seconds: number;
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
  trips: Trip[];
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
  distance?: DistanceInsight;
  spending?: SpendingInsight;
  reminders?: SmartReminder[];
  anomalies?: SmartAnomaly[];
  forecast?: SmartForecast;
};

export type DistanceLog = { label: string; odometer: number; category: string };

export type MonthlyDistance = { month: string; km: number; from_odometer: number; to_odometer: number; logs?: DistanceLog[] };

export type DistanceInsight = {
  status: "tracked" | "not_enough_data";
  this_month_km: number;
  delta_km: number;
  trend: "up" | "down" | "flat" | "first";
  monthly_average_km: number;
  has_current: boolean;
  months: MonthlyDistance[];
};

export type MonthlySpend = { month: string; mdl: number };

export type SpendingCategory = { name: string; mdl: number; share: number; count: number; average_mdl: number };

export type SpendingInsight = {
  this_month_mdl: number;
  delta_mdl: number;
  trend: "up" | "down" | "flat" | "first";
  months: MonthlySpend[];
  categories: SpendingCategory[];
};

export type FuelInsight = {
  entry_count: number;
  total_liters: number;
  average_fill_mdl: number;
  average_price_per_liter_mdl: number;
  average_consumption_l_per_100km?: number;
  consumption_samples?: number;
  consumption_confidence?: "learned" | "low" | "none";
  consumption_breakdown?: FuelConsumptionBreakdown;
};

export type FuelConsumptionInterval = {
  from_date: string;
  to_date: string;
  from_odometer: number;
  to_odometer: number;
  distance_km: number;
  liters: number;
  fill_count?: number;
  l_per_100km: number;
  price_per_liter_mdl?: number;
  from_station?: string;
  station?: string;
  method?: "full_to_full" | "estimated";
  valid?: boolean;
  issue?: string;
};

export type FuelConsumptionTracking = {
  from_date: string;
  to_date: string;
  from_odometer: number;
  to_odometer: number;
  distance_km: number;
  liters: number;
  fill_count: number;
};

export type FuelConsumptionBreakdown = {
  method?: "full_to_full" | "estimated";
  intervals: FuelConsumptionInterval[];
  total_liters: number;
  total_distance_km: number;
  average_l_per_100km: number;
  tracking?: FuelConsumptionTracking;
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
  expense_ids?: string[];
  category?: ExpenseCategory;
  date?: string;
  value?: number;
  baseline_value?: number;
  difference_percent?: number;
  sample_count?: number;
  unit?: "MDL" | "MDL/L";
  reason?: string;
};

export type SmartForecast = {
  next_30_days_mdl: number;
  next_90_days_mdl: number;
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
