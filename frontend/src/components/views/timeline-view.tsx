import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Activity, BarChart3, EyeOff, FileText, Pencil, ReceiptText, Trash2 } from "lucide-react";
import type { Expense, Vehicle } from "@/lib/types";
import { categoryIcon } from "@/lib/theme";
import { dateText, equivalents, km, money, vehicleName } from "@/lib/format";
import { EmptyState, IconButton, Panel } from "../ui";
import { ExpenseForm } from "../forms";
import { ExpenseAttachments } from "../expense-attachments";

export function TimelineView({ expenses, vehicle, token, baseCurrency, country, savingExpense, openExpenseFilesID, onOpenExpenseFiles, onDeleteExpense, onUpdateExpense, onToggleAnalytics }: { expenses: Expense[]; vehicle?: Vehicle; token: string; baseCurrency: string; country: string; savingExpense?: boolean; openExpenseFilesID?: string; onOpenExpenseFiles?: (id: string) => void; onDeleteExpense: (id: string) => void; onUpdateExpense: (id: string, expense: Partial<Expense>, files?: File[]) => void; onToggleAnalytics: (expense: Expense, excluded: boolean) => void }) {
  const [editingExpense, setEditingExpense] = useState<Expense>();
  const [localFilesExpenseID, setLocalFilesExpenseID] = useState("");
  const filesExpenseID = openExpenseFilesID ?? localFilesExpenseID;
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  function updateExpense(id: string, expense: Partial<Expense>, files?: File[]) {
    onUpdateExpense(id, expense, files);
    setEditingExpense(undefined);
  }
  if (vehicle && editingExpense) {
    return <ExpenseForm key={editingExpense.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} expense={editingExpense} onUpdate={updateExpense} onCancel={() => setEditingExpense(undefined)} />;
  }
  return (
    <Panel title="Timeline" eyebrow={vehicle ? vehicleName(vehicle) : "Selected vehicle"}>
      {!vehicle ? <EmptyState icon={Activity} title="No timeline yet" body="Add a vehicle and start logging costs." /> : sorted.length === 0 ? <EmptyState icon={ReceiptText} title="No expenses logged" body="This car's history will appear here as clean chronological records." /> : (
        <div className="grid gap-2.5 sm:gap-3">
          {sorted.map((expense, index) => {
            const Icon = categoryIcon(expense.category);
            return (
              <motion.div key={expense.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }} className="min-w-0 overflow-hidden rounded-[20px] border border-black/[0.045] bg-[#fffffb]/92 p-2.5 shadow-[0_7px_22px_rgba(31,41,28,0.05)] ring-1 ring-white/70 sm:rounded-[24px] sm:p-3">
                <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-2.5 sm:flex sm:items-center sm:gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white sm:size-11 sm:rounded-[16px]"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{expense.description || expense.category}</span>
                    <span className="text-xs text-[#6b7065]">{expense.category} · {dateText(expense.date)}</span>
                    {expense.category === "Fuel" && expense.fuel_type ? (
                      <span className="mt-1 block text-xs text-[#6b7065]">{expense.fuel_type} · {expense.fuel_liters || 0} L · {fuelPriceLabel(expense)}{expense.fuel_full_tank ? " · full tank" : ""}</span>
                    ) : null}
                    {serviceDetail(expense) ? <span className="mt-1 block text-xs text-[#6b7065]">{serviceDetail(expense)}</span> : null}
                    {expense.expires_date ? <span className="mt-1 block text-xs text-[#8a6a10]">Expires {dateText(expense.expires_date)}</span> : null}
                    {expense.odometer ? <span className="mt-1 block text-xs text-[#6b7065]">{km(expense.odometer)}</span> : null}
                    {expense.exclude_from_analytics ? <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[#fff8df] px-2 py-0.5 text-[11px] font-bold text-[#7b5a12]"><EyeOff size={12} /> Excluded</span> : null}
                  </span>
                  <span className="grid min-w-0 justify-items-end gap-1 text-right sm:ml-auto">
                    <span className="block max-w-[7.25rem] truncate text-sm font-bold sm:max-w-none">{money(expense.amount_mdl)}</span>
                    <span className="hidden max-w-[8rem] truncate text-xs text-[#6b7065] min-[430px]:block sm:max-w-none">{equivalents(expense.amount_eur, expense.amount_usd)}</span>
                    {expense.exchange_rate_source ? <span className="hidden truncate text-[11px] text-[#8a9085] sm:block">Rate {dateText(expense.exchange_rate_date)}</span> : null}
                    <div className="mt-1 grid grid-cols-2 justify-end gap-1.5 sm:flex sm:flex-wrap">
                      <IconButton type="button" icon={expense.exclude_from_analytics ? EyeOff : BarChart3} label={expense.exclude_from_analytics ? "Include in analytics" : "Exclude from analytics"} variant={expense.exclude_from_analytics ? "dark" : "soft"} onClick={() => onToggleAnalytics(expense, !expense.exclude_from_analytics)} className="size-8 rounded-[13px] sm:size-9 sm:rounded-[14px]" />
                      <IconButton type="button" icon={FileText} label="Files" variant={filesExpenseID === expense.id ? "dark" : "soft"} onClick={() => toggleFiles(expense.id, filesExpenseID, onOpenExpenseFiles, setLocalFilesExpenseID)} className="size-8 rounded-[13px] sm:size-9 sm:rounded-[14px]" />
                      <IconButton type="button" icon={Pencil} label="Edit" onClick={() => setEditingExpense(expense)} className="size-8 rounded-[13px] sm:size-9 sm:rounded-[14px]" />
                      <IconButton type="button" icon={Trash2} label="Remove" variant="danger" onClick={() => confirmDelete(expense, onDeleteExpense)} className="size-8 rounded-[13px] sm:size-9 sm:rounded-[14px]" />
                    </div>
                  </span>
                </div>
                <AnimatePresence>
                  {filesExpenseID === expense.id ? <ExpenseAttachments expenseID={expense.id} token={token} /> : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </Panel>
  );
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

function serviceTypeLabel(value: string) {
  const labels: Record<string, string> = {
    oil_change: "Oil change",
    regular_service: "Regular service",
    filters: "Filters",
    alignment: "Alignment",
  };
  return labels[value] ?? value;
}

function serviceDetail(expense: Expense) {
  if (!expense.service_type) return "";
  if (hasServicePresetText(expense.description)) return "";
  return serviceTypeLabel(expense.service_type);
}

function hasServicePresetText(value: string) {
  const text = value.toLowerCase();
  return ["oil change", "regular service", "filters", "alignment"].some((preset) => text.includes(preset));
}

function fuelPriceLabel(expense: Expense) {
  const base = expense.fuel_price_per_liter_base && expense.fuel_price_currency ? `${expense.fuel_price_per_liter_base} ${expense.fuel_price_currency}/L` : "";
  const mdl = expense.fuel_price_per_liter_mdl ? `${expense.fuel_price_per_liter_mdl} MDL/L` : "";
  if (base && mdl && expense.fuel_price_currency !== "MDL") return `${base} (${mdl})`;
  return base || mdl;
}
