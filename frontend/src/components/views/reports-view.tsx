import { AlertTriangle, CalendarClock, Car, ReceiptText, TrendingUp, type LucideIcon } from "lucide-react";
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
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniInsight icon={TrendingUp} title="30 days" value={money(totals.insights.forecast?.next_30_days_mdl ?? 0)} />
              <MiniInsight icon={CalendarClock} title="90 days" value={money(totals.insights.forecast?.next_90_days_mdl ?? 0)} />
              <MiniInsight icon={AlertTriangle} title="Checks" value={`${totals.insights.anomalies?.length ?? 0} found`} />
            </div>
            {totals.insights.anomalies?.length ? (
              <div className="mt-3 grid gap-2">
                {totals.insights.anomalies.slice(0, 4).map((item, index) => (
                  <div key={`${item.kind}-${index}`} className="rounded-[18px] bg-[#fff8df] px-3 py-2 text-sm text-[#7b5a12]">
                    <span className="font-bold">{item.title}</span>
                    {item.date ? <span className="ml-2 text-xs opacity-75">{item.date}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function MiniInsight({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#eef3e8] p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#62685e]"><Icon size={14} />{title}</div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
