import { Activity, BarChart3, Car, CheckCircle2, Fuel, Gauge, PackagePlus, ReceiptText, Settings, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { ExpenseCategory, MoneyTotals, NavItem } from "./types";

export const palette = ["#0f6bff", "#0f8f68", "#d14836", "#b88700", "#6d5dfc", "#151712"];

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: Gauge },
  { label: "Timeline", icon: Activity },
  { label: "Analytics", icon: BarChart3 },
  { label: "Fuel Prices", icon: TrendingUp },
  { label: "Reports", icon: ReceiptText },
];

export const mobileNavItems: NavItem[] = [
  { label: "Dashboard", icon: Gauge },
  { label: "Timeline", icon: Activity },
  { label: "Analytics", icon: BarChart3 },
  { label: "Fuel Prices", icon: TrendingUp },
  { label: "Settings", icon: Settings },
];

export const categories: ExpenseCategory[] = ["Fuel", "Maintenance", "Insurance", "Tires", "Parking", "Upgrades", "Miscellaneous"];

export const userCurrencies = ["MDL", "EUR", "USD", "RON"] as const;

export const countries = ["MD", "RO", "UA", "US", "DE"] as const;

export const controls = {
  input: "h-12 w-full min-w-0 rounded-[18px] border border-black/[0.08] bg-white/92 px-3 text-[15px] leading-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[#8b9386] hover:bg-white focus:border-black/15 focus:bg-white focus:shadow-[0_0_0_4px_rgba(21,23,18,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]",
  trigger: "relative flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-[18px] border border-black/[0.08] bg-white/92 px-3 text-left text-[15px] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white focus:border-black/15 focus:shadow-[0_0_0_4px_rgba(21,23,18,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]",
  popover: "absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[22px] border border-black/[0.08] bg-[#fbfcf8] shadow-[0_18px_48px_rgba(31,41,28,0.16)]",
  menuItem: "transition-[background-color,color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985]",
};

export const calmEase = [0.22, 1, 0.36, 1] as const;

export const popoverMotion = {
  initial: { opacity: 0, y: -8, scale: 0.97, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, scale: 0.98, filter: "blur(3px)" },
  transition: { duration: 0.28, ease: calmEase },
} as const;

export const softReveal = {
  initial: { opacity: 0, y: 14, filter: "blur(5px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.34, ease: calmEase },
} as const;

export const softSpring = {
  type: "spring",
  stiffness: 260,
  damping: 32,
  mass: 0.9,
} as const;

export const emptyTotals: MoneyTotals = {
  total_expenses_mdl: 0,
  total_expenses_eur: 0,
  total_expenses_usd: 0,
  fuel_mdl: 0,
  maintenance_mdl: 0,
  insurance_mdl: 0,
  cost_per_km_mdl: 0,
  expense_count: 0,
  category_totals: [],
  vehicle_totals: [],
  trends: [],
  insights: {
    fuel: { entry_count: 0, total_liters: 0, average_fill_mdl: 0, average_price_per_liter_mdl: 0 },
    maintenance: { entry_count: 0, total_mdl: 0, average_mdl: 0, oil_change: { status: "not_enough_data", confidence: "none", recommended_interval_km: 10000 } },
  },
};

export function categoryIcon(category: ExpenseCategory) {
  const icons = {
    Fuel,
    Maintenance: Wrench,
    Repairs: Wrench,
    Insurance: ShieldCheck,
    Tires: Gauge,
    "Road Tax": ReceiptText,
    Inspection: CheckCircle2,
    Parking: Car,
    "Car Wash": Sparkles,
    Parts: Settings,
    Upgrades: PackagePlus,
    Miscellaneous: ReceiptText,
  };
  return icons[category];
}
