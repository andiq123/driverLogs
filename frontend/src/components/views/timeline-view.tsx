import { motion } from "framer-motion";
import { useState } from "react";
import { Activity, Pencil, ReceiptText } from "lucide-react";
import type { Expense, Vehicle } from "@/lib/types";
import { categoryIcon } from "@/lib/theme";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { ActionButton, EmptyState, Panel } from "../ui";
import { ExpenseForm } from "../forms";

export function TimelineView({ expenses, vehicle, token, baseCurrency, country, savingExpense, onUpdateExpense }: { expenses: Expense[]; vehicle?: Vehicle; token: string; baseCurrency: string; country: string; savingExpense?: boolean; onUpdateExpense: (id: string, expense: Partial<Expense>) => void }) {
  const [editingExpense, setEditingExpense] = useState<Expense>();
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
        <div className="grid gap-3">
          {sorted.map((expense, index) => {
            const Icon = categoryIcon(expense.category);
            return (
              <motion.div key={expense.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.18 }} className="flex items-center gap-3 rounded-[24px] bg-[#f1f4ec] p-3">
                <span className="flex size-11 items-center justify-center rounded-[16px] bg-white"><Icon size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{expense.description}</span>
                  <span className="text-xs text-[#6b7065]">{expense.category} · {expense.date}</span>
                  {expense.category === "Fuel" && expense.fuel_type ? (
                    <span className="mt-1 block text-xs text-[#6b7065]">{expense.fuel_type} · {expense.fuel_liters || 0} L · {fuelPriceLabel(expense)}</span>
                  ) : null}
                  {expense.odometer ? <span className="mt-1 block text-xs text-[#6b7065]">{km(expense.odometer)}</span> : null}
                </span>
                <span className="grid justify-items-end gap-1 text-right">
                  <span className="block text-sm font-bold">{money(expense.amount_mdl)}</span>
                  <span className="text-xs text-[#6b7065]">{equivalents(expense.amount_eur, expense.amount_usd)}</span>
                  {expense.exchange_rate_source ? <span className="block text-[11px] text-[#8a9085]">{expense.exchange_rate_date}</span> : null}
                  <ActionButton type="button" icon={Pencil} variant="soft" onClick={() => setEditingExpense(expense)} className="mt-1 h-9 rounded-[14px] px-3 text-xs">Edit</ActionButton>
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function fuelPriceLabel(expense: Expense) {
  const base = expense.fuel_price_per_liter_base && expense.fuel_price_currency ? `${expense.fuel_price_per_liter_base} ${expense.fuel_price_currency}/L` : "";
  const mdl = expense.fuel_price_per_liter_mdl ? `${expense.fuel_price_per_liter_mdl} MDL/L` : "";
  if (base && mdl && expense.fuel_price_currency !== "MDL") return `${base} (${mdl})`;
  return base || mdl;
}
