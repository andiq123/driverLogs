import { Car, ReceiptText } from "lucide-react";
import type { Expense, MoneyTotals, Vehicle } from "@/lib/types";
import { equivalents, money, vehicleName } from "@/lib/format";
import { EmptyState, ReportCard } from "../ui";

export function ReportsView({ vehicle, expenses, totals }: { vehicle?: Vehicle; expenses: Expense[]; totals: MoneyTotals }) {
  if (!vehicle) {
    return <EmptyState icon={Car} title="No car report yet" body="Add a vehicle to generate focused reports." />;
  }

  return (
    <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
      <ReportCard title="Vehicle" value={vehicleName(vehicle)} label={vehicle.plate_number} />
      <ReportCard title="Expenses" value={String(expenses.length)} label="records" />
      <ReportCard title="Ownership cost" value={money(totals.total_expenses_mdl)} label={equivalents(totals.total_expenses_eur, totals.total_expenses_usd)} />
      <section className="rounded-[24px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_14px_48px_rgba(31,41,28,0.08)] sm:rounded-[28px] sm:p-5 xl:col-span-3">
        {expenses.length === 0 ? <EmptyState icon={ReceiptText} title="No report entries yet" body="Add expenses and this report will summarize only the selected car." /> : (
          <>
            <h2 className="text-xl font-semibold">Selected car report</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62685e]">Generated from current DriverLogs records for {vehicleName(vehicle)} only.</p>
          </>
        )}
      </section>
    </div>
  );
}
