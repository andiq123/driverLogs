import { Car } from "lucide-react";
import { useState } from "react";
import type { Expense, ExpenseCategory, MoneyTotals, SmartReminder, Vehicle } from "@/lib/types";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { Badge, EmptyState, Metric } from "../ui";
import { ExpenseForm } from "../forms";
import { SmartInsightsPanel } from "../smart-insights";

export function DashboardView({ vehicle, expenses, totals, token, baseCurrency, country, savingExpense, onCreateExpense }: { vehicle?: Vehicle; expenses: Expense[]; totals: MoneyTotals; token: string; baseCurrency: string; country: string; savingExpense?: boolean; onCreateExpense: (expense: Partial<Expense>) => void }) {
  const [intentCategory, setIntentCategory] = useState<ExpenseCategory>();
  if (!vehicle) {
    return <section className="rounded-[28px] bg-[#151712] p-6 text-white sm:p-8"><EmptyState icon={Car} title="Start with the garage" body="Add a vehicle before logging expenses or viewing dashboard metrics." dark /></section>;
  }

  return (
    <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.78fr)] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid content-start gap-3 sm:gap-4">
        <section className="relative overflow-hidden rounded-[24px] bg-[#151712] p-4 text-white shadow-[0_22px_72px_rgba(21,23,18,0.22)] sm:min-h-[24rem] sm:rounded-[28px] sm:p-6 xl:min-h-[21rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-[#dfe7d4]/12 blur-2xl" />
          <div className="relative flex flex-wrap gap-1.5 sm:gap-2">
            <Badge>{vehicle.plate_number}</Badge>
            {vehicle.engine_type ? <Badge>{vehicle.engine_type}</Badge> : null}
            {vehicle.year ? <Badge>{vehicle.year}</Badge> : null}
          </div>
          <h2 className="relative mt-4 text-[30px] font-semibold leading-none tracking-tight sm:mt-6 sm:text-5xl">{vehicleName(vehicle)}</h2>
          <p className="relative mt-2 hidden max-w-xl text-sm leading-6 text-white/68 sm:block">Smart estimates use only records created for this car.</p>
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3 xl:max-w-3xl">
            <Metric label="Lifetime" value={money(totals.total_expenses_mdl)} sub={equivalents(totals.total_expenses_eur, totals.total_expenses_usd)} />
            <Metric label="Odometer" value={km(vehicle.odometer ?? 0)} sub="Current reading" />
            <Metric label="Cost/km" value={totals.cost_per_km_mdl ? `${totals.cost_per_km_mdl} MDL` : "Learning"} sub={`${totals.expense_count} entries`} />
          </div>
        </section>
        <SmartReminderBar reminders={totals.insights.reminders ?? []} onSelect={setIntentCategory} />
        <SmartInsightsPanel insights={totals.insights} />
      </div>
      <ExpenseForm key={vehicle.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} odometerSuggestion={odometerSuggestion(vehicle, expenses)} intentCategory={intentCategory} onCreate={onCreateExpense} />
    </div>
  );
}

function SmartReminderBar({ reminders, onSelect }: { reminders: SmartReminder[]; onSelect: (category: ExpenseCategory) => void }) {
  if (!reminders.length) return null;
  return (
    <section className="flex snap-x gap-2 overflow-x-auto pb-1">
      {reminders.map((reminder, index) => (
        <button key={`${reminder.title}-${index}`} type="button" onClick={() => onSelect(reminder.category)} className={`min-w-48 snap-start rounded-[18px] border px-3 py-2 text-left shadow-[0_8px_24px_rgba(31,41,28,0.06)] transition-transform active:scale-[0.985] ${reminder.kind === "expired" ? "border-[#f0b2a8] bg-[#fff0ec] text-[#8b2d20]" : "border-[#efd282] bg-[#fff8df] text-[#7b5a12]"}`}>
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em]">{reminder.kind === "expired" ? "Due now" : "Upcoming"}</span>
          <span className="mt-0.5 block text-sm font-bold">{reminder.title}</span>
          <span className="mt-0.5 block text-xs opacity-75">{reminder.date ?? (reminder.odometer ? km(reminder.odometer) : "Tap to log")}</span>
        </button>
      ))}
    </section>
  );
}

function odometerSuggestion(vehicle: Vehicle, expenses: Expense[]) {
  const readings = expenses.map((expense) => expense.odometer || 0).filter(Boolean);
  return Math.max(vehicle.odometer || 0, ...readings);
}
