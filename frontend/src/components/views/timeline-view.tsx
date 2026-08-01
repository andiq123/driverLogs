import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Activity, BarChart3, EyeOff, FileText, ListFilter, Pencil, ReceiptText, Route, Trash2, TrendingUp } from "lucide-react";
import type { Expense, ExpenseCategory, Trip, Vehicle } from "@/lib/types";
import { categories, categoryIcon } from "@/lib/theme";
import { dateText, equivalents, km, money, vehicleName } from "@/lib/format";
import { serviceDetail } from "@/lib/car-options";
import { EmptyState, IconButton } from "../ui";
import { ExpenseForm } from "../expense-form";
import { ExpenseAttachments } from "../expense-attachments";
import { CustomSelect } from "../custom-select";
import { FuelFillupWin } from "../fuel-fillup-win";

const allCategoriesFilter = "All";
type TimelineFilter = typeof allCategoriesFilter | ExpenseCategory;

export function TimelineView({ expenses, trips = [], vehicle, token, baseCurrency, country, savingExpense, openExpenseFilesID, onOpenExpenseFiles, onDeleteExpense, onUpdateExpense, onToggleAnalytics }: { expenses: Expense[]; trips?: Trip[]; vehicle?: Vehicle; token: string; baseCurrency: string; country: string; savingExpense?: boolean; openExpenseFilesID?: string; onOpenExpenseFiles?: (id: string) => void; onDeleteExpense: (id: string) => void; onUpdateExpense: (id: string, expense: Partial<Expense>, files?: File[]) => void; onToggleAnalytics: (expense: Expense, excluded: boolean) => void }) {
  const [editingExpense, setEditingExpense] = useState<Expense>();
  const [localFilesExpenseID, setLocalFilesExpenseID] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TimelineFilter>(allCategoriesFilter);
  const filesExpenseID = openExpenseFilesID ?? localFilesExpenseID;
  const presentCategories = useMemo(() => categoryOptions(expenses), [expenses]);
  const odometerGains = useMemo(() => odometerGainsByID(expenses), [expenses]);
  const tripNames = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip.name])), [trips]);
  const activeFilter = categoryFilter === allCategoriesFilter || presentCategories.includes(categoryFilter) ? categoryFilter : allCategoriesFilter;
  const filteredExpenses = activeFilter === allCategoriesFilter ? expenses : expenses.filter((expense) => expense.category === activeFilter);
  const sorted = [...filteredExpenses].sort((a, b) => b.date.localeCompare(a.date));

  function updateExpense(id: string, expense: Partial<Expense>, files?: File[]) {
    onUpdateExpense(id, expense, files);
    setEditingExpense(undefined);
  }
  if (vehicle && editingExpense) {
    return <ExpenseForm key={editingExpense.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} expense={editingExpense} onUpdate={updateExpense} onCancel={() => setEditingExpense(undefined)} />;
  }
  const showFilter = Boolean(vehicle) && expenses.length > 0 && presentCategories.length > 1;
  return (
    <div className="grid gap-3">
      {showFilter ? (
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-[#62685e]">{vehicle ? vehicleName(vehicle) : "Selected vehicle"}</p>
          <div className="w-40 sm:w-52">
            <CustomSelect label="Filter" name="timeline-category-filter" icon={ListFilter} options={[allCategoriesFilter, ...presentCategories]} value={activeFilter} onChange={(value) => setCategoryFilter(value as TimelineFilter)} />
          </div>
        </div>
      ) : null}
      {!vehicle ? <EmptyState icon={Activity} title="No timeline yet" body="Add a vehicle and start logging costs." /> : expenses.length === 0 ? <EmptyState icon={ReceiptText} title="No expenses logged" body="This car's history will appear here as clean chronological records." /> : (
        <section className="overflow-hidden rounded-[24px] border border-black/[0.055] bg-[#fffffb]/96 ring-1 ring-white/70 sm:rounded-[28px]">
          {sorted.length === 0 ? <div className="p-4"><EmptyState icon={ListFilter} title="No matching expenses" body="Choose another category to see more timeline records." /></div> : null}
          {sorted.map((expense, index) => {
            const Icon = categoryIcon(expense.category);
            const priorFuelExpenses = expense.category === "Fuel" ? sorted.slice(index + 1).filter((entry) => entry.category === "Fuel") : [];
            return (
              <div key={expense.id}>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }} className={`min-w-0 p-3 sm:p-3.5 ${index > 0 ? "border-t border-black/[0.05]" : ""}`}>
                  <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-2.5 sm:flex sm:items-center sm:gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#edf4e7] sm:size-11 sm:rounded-[16px]"><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{expense.description || expense.category}</span>
                      <span className="text-xs text-[#6b7065]">{expense.category} · {dateText(expense.date)}</span>
                      {expense.category === "Fuel" && expense.fuel_type ? (
                        <span className="mt-1 block text-xs text-[#6b7065]">{expense.fuel_type} · {expense.fuel_liters || 0} L · {fuelPriceLabel(expense)}</span>
                      ) : null}
                      {expense.trip_id ? <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[#e7f1e2] px-2 py-0.5 text-[10px] font-bold text-[#376247]"><Route size={11} />{tripNames[expense.trip_id] || "Trip fuel"}</span> : null}
                      {serviceDetail(expense.service_type) ? <span className="mt-1 block text-xs text-[#6b7065]">{serviceDetail(expense.service_type)}</span> : null}
                      {expense.expires_date ? <span className="mt-1 block text-xs text-[#8a6a10]">Expires {dateText(expense.expires_date)}</span> : null}
                      {expense.odometer ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#6b7065]">
                          {km(expense.odometer)}
                          {odometerGains[expense.id] ? <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6e9] px-2 py-0.5 text-[10px] font-bold text-[#24603c]"><TrendingUp size={11} />+{km(odometerGains[expense.id])}</span> : null}
                        </span>
                      ) : null}
                      {expense.exclude_from_analytics ? <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[#fff8df] px-2 py-0.5 text-[11px] font-bold text-[#7b5a12]"><EyeOff size={12} /> Excluded</span> : null}
                    </span>
                    <span className="grid min-w-0 justify-items-end gap-1 text-right sm:ml-auto">
                      <span className="block max-w-[7.25rem] truncate text-sm font-bold sm:max-w-none">{money(expense.amount_mdl)}</span>
                      <span className="hidden max-w-[8rem] truncate text-xs text-[#6b7065] min-[430px]:block sm:max-w-none">{equivalents(expense.amount_eur, expense.amount_usd)}</span>
                      {expense.exchange_rate_source ? <span className="hidden truncate text-[11px] text-[#8a9085] sm:block">Rate {dateText(expense.exchange_rate_date)}</span> : null}
                      <div className="mt-1 grid grid-cols-2 justify-end gap-1.5 sm:flex sm:flex-wrap">
                        <IconButton type="button" icon={expense.exclude_from_analytics ? EyeOff : BarChart3} label={expense.exclude_from_analytics ? "Include in analytics" : "Exclude from analytics"} variant={expense.exclude_from_analytics ? "dark" : "soft"} onClick={() => onToggleAnalytics(expense, !expense.exclude_from_analytics)} />
                        <IconButton type="button" icon={FileText} label="Files" variant={filesExpenseID === expense.id ? "dark" : "soft"} onClick={() => toggleFiles(expense.id, filesExpenseID, onOpenExpenseFiles, setLocalFilesExpenseID)} />
                        <IconButton type="button" icon={Pencil} label="Edit" onClick={() => setEditingExpense(expense)} />
                        <IconButton type="button" icon={Trash2} label="Remove" variant="danger" onClick={() => confirmDelete(expense, onDeleteExpense)} />
                      </div>
                    </span>
                  </div>
                  <AnimatePresence>
                    {filesExpenseID === expense.id ? <ExpenseAttachments expenseID={expense.id} token={token} /> : null}
                  </AnimatePresence>
                </motion.div>
                {expense.category === "Fuel" && priorFuelExpenses.length ? <div className="border-t border-black/[0.04] px-3 py-2.5 sm:px-3.5"><FuelFillupWin current={expense} history={priorFuelExpenses} /></div> : null}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function categoryOptions(expenses: Expense[]) {
  const present = new Set(expenses.map((expense) => expense.category));
  return categories.filter((category) => present.has(category));
}

// Maps each expense to the km gained since the previous odometer reading across
// the whole vehicle history, so the badge stays correct even when filtered.
function odometerGainsByID(expenses: Expense[]) {
  const withOdometer = expenses
    .filter((expense) => (expense.odometer ?? 0) > 0)
    .sort((a, b) => (a.date === b.date ? (a.odometer ?? 0) - (b.odometer ?? 0) : a.date.localeCompare(b.date)));
  const gains: Record<string, number> = {};
  for (let index = 1; index < withOdometer.length; index += 1) {
    const delta = (withOdometer[index].odometer ?? 0) - (withOdometer[index - 1].odometer ?? 0);
    if (delta > 0) gains[withOdometer[index].id] = delta;
  }
  return gains;
}

function toggleFiles(expenseID: string, currentID: string, onOpen: ((id: string) => void) | undefined, setLocal: (id: string) => void) {
  const nextID = currentID === expenseID ? "" : expenseID;
  if (onOpen) onOpen(nextID);
  else setLocal(nextID);
}

function confirmDelete(expense: Expense, onDelete: (id: string) => void) {
  if (window.confirm(`Remove ${expense.description || expense.category}?`)) {
    onDelete(expense.id);
  }
}

function fuelPriceLabel(expense: Expense) {
  const base = expense.fuel_price_per_liter_base && expense.fuel_price_currency ? `${expense.fuel_price_per_liter_base} ${expense.fuel_price_currency}/L` : "";
  const mdl = expense.fuel_price_per_liter_mdl ? `${expense.fuel_price_per_liter_mdl} MDL/L` : "";
  if (base && mdl && expense.fuel_price_currency !== "MDL") return `${base} (${mdl})`;
  return base || mdl;
}
