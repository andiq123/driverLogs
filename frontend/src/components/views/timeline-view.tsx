import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, EyeOff, FileText, ListFilter, Pencil, ReceiptText, Route, Trash2, TrendingUp, X } from "lucide-react";
import type { Expense, ExpenseCategory, SmartAnomaly, Trip, Vehicle } from "@/lib/types";
import { categories, categoryIcon } from "@/lib/theme";
import { anomalyBaseline, anomalyDifference, anomalyHistory, anomalyLocation, anomalyObserved, anomalyReason } from "@/lib/anomalies";
import { dateText, equivalents, km, money, vehicleName } from "@/lib/format";
import { newestFirst } from "@/lib/order";
import { serviceDetail } from "@/lib/car-options";
import { EmptyState, IconButton } from "../ui";
import { ExpenseForm } from "../expense-form";
import { ExpenseAttachments } from "../expense-attachments";
import { CustomSelect } from "../custom-select";
import { FuelFillupWin } from "../fuel-fillup-win";

const allCategoriesFilter = "All";
type TimelineFilter = typeof allCategoriesFilter | ExpenseCategory;

export function TimelineView({ expenses, trips = [], vehicle, token, baseCurrency, country, savingExpense, openExpenseFilesID, onOpenExpenseFiles, onDeleteExpense, onUpdateExpense, onToggleAnalytics, reviewAnomalies = [], onClearUnusualRecordReview }: { expenses: Expense[]; trips?: Trip[]; vehicle?: Vehicle; token: string; baseCurrency: string; country: string; savingExpense?: boolean; openExpenseFilesID?: string; onOpenExpenseFiles?: (id: string) => void; onDeleteExpense: (id: string) => void; onUpdateExpense: (id: string, expense: Partial<Expense>, files?: File[]) => void; onToggleAnalytics: (expense: Expense, excluded: boolean) => void; reviewAnomalies?: SmartAnomaly[]; onClearUnusualRecordReview?: () => void }) {
  const [editingExpense, setEditingExpense] = useState<Expense>();
  const [localFilesExpenseID, setLocalFilesExpenseID] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TimelineFilter>(allCategoriesFilter);
  const filesExpenseID = openExpenseFilesID ?? localFilesExpenseID;
  const presentCategories = useMemo(() => categoryOptions(expenses), [expenses]);
  const odometerGains = useMemo(() => odometerGainsByID(expenses), [expenses]);
  const tripNames = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip.name])), [trips]);
  const anomaliesByExpenseID = useMemo(() => anomaliesByExpense(expenses, reviewAnomalies), [expenses, reviewAnomalies]);
  const activeFilter = categoryFilter === allCategoriesFilter || presentCategories.includes(categoryFilter) ? categoryFilter : allCategoriesFilter;
  const filteredExpenses = reviewAnomalies.length
    ? expenses.filter((expense) => anomaliesByExpenseID[expense.id]?.length)
    : activeFilter === allCategoriesFilter ? expenses : expenses.filter((expense) => expense.category === activeFilter);
  const sorted = newestFirst(filteredExpenses, (expense) => expense.date);

  function updateExpense(id: string, expense: Partial<Expense>, files?: File[]) {
    onUpdateExpense(id, expense, files);
    setEditingExpense(undefined);
  }
  if (vehicle && editingExpense) {
    return <ExpenseForm key={editingExpense.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} expense={editingExpense} onUpdate={updateExpense} onCancel={() => setEditingExpense(undefined)} />;
  }
  const showFilter = Boolean(vehicle) && expenses.length > 0 && presentCategories.length > 1 && !reviewAnomalies.length;
  return (
    <div className="grid gap-3">
      {reviewAnomalies.length ? (
        <section className="flex items-start gap-3 rounded-[20px] border border-[#efd282] bg-[#fff8df] p-3 text-[#765811] shadow-[0_8px_24px_rgba(117,88,17,0.07)] sm:rounded-[24px] sm:p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-white/75"><AlertTriangle size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Review unusual records</span>
            <span className="mt-0.5 block text-xs leading-5 text-[#80661f]">{reviewAnomalies.length} check{reviewAnomalies.length === 1 ? "" : "s"} across {sorted.length} record{sorted.length === 1 ? "" : "s"}. Each card explains what triggered it and which history was used.</span>
          </span>
          {onClearUnusualRecordReview ? <button type="button" onClick={onClearUnusualRecordReview} className="flex size-8 shrink-0 items-center justify-center rounded-[12px] bg-white/75 transition-colors hover:bg-white" aria-label="Show all timeline records"><X size={16} /></button> : null}
        </section>
      ) : null}
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
            const recordAnomalies = anomaliesByExpenseID[expense.id] ?? [];
            return (
              <div key={expense.id}>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }} className={`min-w-0 p-3 sm:p-3.5 ${index > 0 ? "border-t border-black/[0.05]" : ""} ${recordAnomalies.length ? "bg-[#fffaf0]" : ""}`}>
                  <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-2.5 sm:flex sm:items-center sm:gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#edf4e7] sm:size-11 sm:rounded-[16px]"><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{expense.description || expense.category}</span>
                      <span className="text-xs text-[#6b7065]">{expense.category} · {dateText(expense.date)}</span>
                      {expense.category === "Fuel" && expense.fuel_type ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#6b7065]"><span>{expense.fuel_type} · {expense.fuel_liters || 0} L · {fuelPriceLabel(expense)}</span>{expense.fuel_full_tank ? <span className="rounded-full bg-[#e7f1e2] px-2 py-0.5 text-[10px] font-bold text-[#376247]">Full tank</span> : null}</span>
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
                  {recordAnomalies.length ? (
                    <div className="mt-3 grid gap-2 sm:ml-[3.25rem]">
                      {recordAnomalies.map((anomaly, anomalyIndex) => <AnomalyReviewCard key={`${anomaly.kind}-${anomaly.date}-${anomalyIndex}`} anomaly={anomaly} />)}
                    </div>
                  ) : null}
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

function anomaliesByExpense(expenses: Expense[], anomalies: SmartAnomaly[]) {
  const matches: Record<string, SmartAnomaly[]> = {};
  for (const anomaly of anomalies) {
    const category = anomaly.category ?? (anomaly.kind === "fuel_price" ? "Fuel" : anomaly.kind === "service_cost" ? "Maintenance" : undefined);
    for (const expense of expenses) {
      if (anomaly.expense_ids?.length && !anomaly.expense_ids.includes(expense.id)) continue;
      if (category && expense.category !== category) continue;
      if (anomaly.date && expense.date !== anomaly.date) continue;
      if (!anomaly.expense_ids?.length && anomaly.value !== undefined) {
        const recordValue = anomaly.kind === "fuel_price" ? expense.fuel_price_per_liter_mdl ?? 0 : expense.amount_mdl;
        if (Math.abs(recordValue - anomaly.value) > 0.01) continue;
      }
      matches[expense.id] = [...(matches[expense.id] ?? []), anomaly];
    }
  }
  return matches;
}

function AnomalyReviewCard({ anomaly }: { anomaly: SmartAnomaly }) {
  const observed = anomalyObserved(anomaly);
  const baseline = anomalyBaseline(anomaly);
  const difference = anomalyDifference(anomaly);
  const history = anomalyHistory(anomaly);
  return (
    <section className="rounded-[18px] border border-[#e8c86f]/70 bg-[#fff6d9] p-3 text-[#654b0d] shadow-[0_5px_16px_rgba(101,75,13,0.06)]">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[12px] bg-white/80"><AlertTriangle size={15} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#5f4509]">{anomaly.title}</span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#89691d]">{anomalyLocation(anomaly) || "This record"}</span>
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#765b18]">{anomalyReason(anomaly)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {observed ? <ReviewMetric label="Detected" value={observed} /> : null}
        {baseline ? <ReviewMetric label="Earlier average" value={baseline} /> : null}
        {difference ? <ReviewMetric label="Difference" value={difference} /> : null}
        {history ? <ReviewMetric label={anomaly.kind === "duplicate" ? "Match" : "History used"} value={history} /> : null}
      </dl>
    </section>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[13px] bg-white/70 px-2.5 py-2">
      <dt className="text-[9px] font-bold uppercase tracking-[0.11em] text-[#947529]">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-bold text-[#5f4509]">{value}</dd>
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
