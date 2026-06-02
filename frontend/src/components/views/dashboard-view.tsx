import { Car } from "lucide-react";
import type { Expense, MoneyTotals, Vehicle } from "@/lib/types";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { Badge, EmptyState, Metric } from "../ui";
import { ExpenseForm } from "../forms";
import { SmartInsightsPanel } from "../smart-insights";

export function DashboardView({ vehicle, expenses, totals, token, baseCurrency, country, savingExpense, onCreateExpense }: { vehicle?: Vehicle; expenses: Expense[]; totals: MoneyTotals; token: string; baseCurrency: string; country: string; savingExpense?: boolean; onCreateExpense: (expense: Partial<Expense>) => void }) {
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
            <Metric label="Entries" value={String(totals.expense_count)} sub="Logged expenses" />
          </div>
        </section>
        <SmartInsightsPanel insights={totals.insights} />
      </div>
      <ExpenseForm key={vehicle.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} odometerSuggestion={odometerSuggestion(vehicle, expenses)} onCreate={onCreateExpense} />
    </div>
  );
}

function odometerSuggestion(vehicle: Vehicle, expenses: Expense[]) {
  const readings = expenses.map((expense) => expense.odometer || 0).filter(Boolean);
  return Math.max(vehicle.odometer || 0, ...readings);
}
