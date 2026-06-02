import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Activity, FileText, Pencil, ReceiptText, Trash2 } from "lucide-react";
import type { Expense, Vehicle } from "@/lib/types";
import { categoryIcon } from "@/lib/theme";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { ActionButton, EmptyState, Panel } from "../ui";
import { ExpenseForm } from "../forms";
import { ExpenseAttachments } from "../expense-attachments";

export function TimelineView({ expenses, vehicle, token, baseCurrency, country, savingExpense, onDeleteExpense, onUpdateExpense }: { expenses: Expense[]; vehicle?: Vehicle; token: string; baseCurrency: string; country: string; savingExpense?: boolean; onDeleteExpense: (id: string) => void; onUpdateExpense: (id: string, expense: Partial<Expense>) => void }) {
  const [editingExpense, setEditingExpense] = useState<Expense>();
  const [filesExpenseID, setFilesExpenseID] = useState("");
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  function updateExpense(id: string, expense: Partial<Expense>) {
    onUpdateExpense(id, expense);
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
              <motion.div key={expense.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }} className="rounded-[20px] border border-black/[0.045] bg-[#fffffb]/92 p-2.5 shadow-[0_7px_22px_rgba(31,41,28,0.05)] ring-1 ring-white/70 sm:rounded-[24px] sm:p-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex size-10 items-center justify-center rounded-[14px] bg-white sm:size-11 sm:rounded-[16px]"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{expense.description || expense.category}</span>
                    <span className="text-xs text-[#6b7065]">{expense.category} · {expense.date}</span>
                    {expense.category === "Fuel" && expense.fuel_type ? (
                      <span className="mt-1 block text-xs text-[#6b7065]">{expense.fuel_type} · {expense.fuel_liters || 0} L · {fuelPriceLabel(expense)}{expense.fuel_full_tank ? " · full tank" : ""}</span>
                    ) : null}
                    {expense.service_type ? <span className="mt-1 block text-xs text-[#6b7065]">{serviceTypeLabel(expense.service_type)}</span> : null}
                    {expense.expires_date ? <span className="mt-1 block text-xs text-[#8a6a10]">Expires {expense.expires_date}</span> : null}
                    {expense.odometer ? <span className="mt-1 block text-xs text-[#6b7065]">{km(expense.odometer)}</span> : null}
                  </span>
                  <span className="grid justify-items-end gap-1 text-right">
                    <span className="block text-sm font-bold">{money(expense.amount_mdl)}</span>
                    <span className="text-xs text-[#6b7065]">{equivalents(expense.amount_eur, expense.amount_usd)}</span>
                    {expense.exchange_rate_source ? <span className="block text-[11px] text-[#8a9085]">{expense.exchange_rate_date}</span> : null}
                    <div className="mt-1 flex justify-end gap-1.5">
                      <ActionButton type="button" icon={FileText} variant="soft" onClick={() => setFilesExpenseID((current) => current === expense.id ? "" : expense.id)} className="h-8 rounded-[13px] px-2.5 text-xs sm:h-9 sm:rounded-[14px] sm:px-3">PDFs</ActionButton>
                      <ActionButton type="button" icon={Pencil} variant="soft" onClick={() => setEditingExpense(expense)} className="h-8 rounded-[13px] px-2.5 text-xs sm:h-9 sm:rounded-[14px] sm:px-3">Edit</ActionButton>
                      <ActionButton type="button" icon={Trash2} variant="soft" onClick={() => confirmDelete(expense, onDeleteExpense)} className="h-8 rounded-[13px] bg-[#fff0ec] px-2.5 text-xs text-[#9b3226] hover:bg-[#ffdcd4] sm:h-9 sm:rounded-[14px] sm:px-3">Remove</ActionButton>
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

function fuelPriceLabel(expense: Expense) {
  const base = expense.fuel_price_per_liter_base && expense.fuel_price_currency ? `${expense.fuel_price_per_liter_base} ${expense.fuel_price_currency}/L` : "";
  const mdl = expense.fuel_price_per_liter_mdl ? `${expense.fuel_price_per_liter_mdl} MDL/L` : "";
  if (base && mdl && expense.fuel_price_currency !== "MDL") return `${base} (${mdl})`;
  return base || mdl;
}
