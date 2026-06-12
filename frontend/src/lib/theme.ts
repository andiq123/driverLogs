import { Activity, BarChart3, Car, CheckCircle2, Fuel, Gauge, PackagePlus, ReceiptText, Settings, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { ExpenseCategory, MoneyTotals, NavItem } from "./types";

export const palette = ["#0a7aff", "#23a05e", "#ff5d4f", "#f5a300", "#6a5cf5", "#151712"];

export const insightTones = {
  neutral: {
    card: "border-black/[0.045] bg-[#fffffb]/92 text-[#151712] shadow-[0_8px_24px_rgba(31,41,28,0.055)] ring-white/70",
    wash: "bg-[linear-gradient(135deg,rgba(238,243,232,0.72),transparent_52%),radial-gradient(circle_at_88%_12%,rgba(15,143,104,0.055),transparent_34%)]",
    meta: "text-[#62685e]",
    detail: "text-[#62685e]",
    badge: "bg-[#eef3e8] text-[#62685e]",
    bar: "bg-[#a8b0a0]",
  },
  good: {
    card: "border-[#bdd7c0] bg-[#f1f8ed] text-[#142016] shadow-[0_8px_24px_rgba(54,94,58,0.075)] ring-[#ffffff]/80",
    wash: "bg-[linear-gradient(135deg,rgba(225,241,218,0.86),transparent_50%),radial-gradient(circle_at_88%_12%,rgba(15,143,104,0.18),transparent_34%)]",
    meta: "text-[#456148]",
    detail: "text-[#556a54]",
    badge: "bg-white/82 text-[#24603c]",
    bar: "bg-[#3a8e57]",
  },
  warn: {
    card: "border-[#efd282] bg-[#fff8df] text-[#211b0a] shadow-[0_10px_30px_rgba(173,128,17,0.12)] ring-[#ffffff]/82",
    wash: "bg-[linear-gradient(135deg,rgba(255,236,165,0.62),transparent_50%),radial-gradient(circle_at_88%_12%,rgba(184,135,0,0.24),transparent_34%)]",
    meta: "text-[#7b5a12]",
    detail: "text-[#776224]",
    badge: "bg-white/88 text-[#8a6200]",
    bar: "bg-[#d9a514]",
  },
  danger: {
    card: "border-[#f0b2a8] bg-[#fff0ec] text-[#26100d] shadow-[0_10px_32px_rgba(209,72,54,0.14)] ring-[#ffffff]/82",
    wash: "bg-[linear-gradient(135deg,rgba(255,209,201,0.62),transparent_50%),radial-gradient(circle_at_88%_12%,rgba(209,72,54,0.24),transparent_34%)]",
    meta: "text-[#9b3226]",
    detail: "text-[#855047]",
    badge: "bg-white/88 text-[#a92f22]",
    bar: "bg-[#e05a47]",
  },
} as const;

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

export const categories: ExpenseCategory[] = ["Fuel", "Maintenance", "Insurance", "Inspection", "Tires", "Parking", "Upgrades", "Miscellaneous"];

export const userCurrencies = ["MDL", "EUR", "USD", "RON"] as const;

export const countries = ["MD", "RO", "UA", "US", "DE"] as const;

export const controls = {
  input: "h-12 w-full min-w-0 rounded-[18px] border border-black/[0.08] bg-white/92 px-3 text-[15px] leading-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[#8b9386] hover:bg-white focus:border-black/15 focus:bg-white focus:shadow-[0_0_0_4px_rgba(21,23,18,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]",
  trigger: "relative flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-[18px] border border-black/[0.08] bg-white/92 px-3 text-left text-[15px] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white focus:border-black/15 focus:shadow-[0_0_0_4px_rgba(21,23,18,0.06),inset_0_1px_0_rgba(255,255,255,0.72)]",
  popover: "absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[22px] border border-black/[0.08] bg-[#fbfcf8] shadow-[0_18px_48px_rgba(31,41,28,0.16)]",
  menuItem: "transition-[background-color,color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985]",
};

export const authTheme = {
  page: "relative grid min-h-dvh place-items-center overflow-hidden bg-[#f5f7f2] px-4 py-[max(1rem,env(safe-area-inset-top))] text-[#151712]",
  glow: "pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(223,231,212,0.86),rgba(245,247,242,0))]",
  registerButton: "ml-auto flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-black/[0.06] bg-[#fbfcf8]/92 px-4 text-sm font-bold shadow-[0_10px_34px_rgba(31,41,28,0.10)] backdrop-blur transition-[background-color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70",
  card: "overflow-hidden rounded-[32px] border border-black/[0.06] bg-[#fbfcf8] shadow-[0_24px_82px_rgba(31,41,28,0.14)]",
  cardHeader: "bg-[#eef3e8] px-5 py-5 sm:px-6",
  submitButton: "flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#151712] text-sm font-bold text-white transition-[transform,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_12px_30px_rgba(21,23,18,0.16)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70",
};

export const calmEase = [0.22, 1, 0.36, 1] as const;

export const popoverMotion = {
  initial: { opacity: 0, y: -8, scale: 0.97, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, scale: 0.98, filter: "blur(3px)" },
  transition: { duration: 0.28, ease: calmEase },
} as const;

export const modalBackdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.24, ease: calmEase },
} as const;

export const modalPanelMotion = {
  initial: { opacity: 0, y: 22, scale: 0.975, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: 16, scale: 0.985, filter: "blur(5px)" },
  transition: { duration: 0.32, ease: calmEase },
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
    insurance: { status: "not_logged", confidence: "none", interval_days: 365 },
    inspection: { status: "not_logged", confidence: "none", interval_days: 365 },
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
