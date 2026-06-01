import { BarChart3, Gauge } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MoneyTotals, Vehicle } from "@/lib/types";
import { money, vehicleName } from "@/lib/format";
import { palette } from "@/lib/theme";
import { ChartSkeleton, EmptyState, Panel } from "../ui";
import { SmartInsightsPanel } from "../smart-insights";

export function AnalyticsView({ mounted, vehicle, totals }: { mounted: boolean; vehicle?: Vehicle; totals: MoneyTotals }) {
  if (!vehicle) {
    return <Panel title="Analytics" eyebrow="Selected vehicle"><EmptyState icon={Gauge} title="No vehicle selected" body="Add a car first. Analytics will focus on the active vehicle only." /></Panel>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Cost split" eyebrow={vehicleName(vehicle)}>
        {totals.category_totals.length === 0 ? <EmptyState icon={BarChart3} title="No analytics yet" body="Charts become available after you add expenses." /> : (
          <div className="h-72">
            {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><PieChart><Pie data={totals.category_totals} innerRadius={64} outerRadius={96} paddingAngle={4} dataKey="amount_mdl">{totals.category_totals.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <ChartSkeleton />}
          </div>
        )}
      </Panel>
      <Panel title="Monthly trend" eyebrow={`${money(totals.total_expenses_mdl)} total`}>
        {totals.expense_count === 0 ? <EmptyState icon={Gauge} title="No costs logged" body="Add fuel, service, upgrades, or other expenses to build this car's analytics." /> : (
          <div className="h-72">
            {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><AreaChart data={totals.trends}><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="amount_mdl" stroke="#0f8f68" fill="#dfe7d4" strokeWidth={3} /></AreaChart></ResponsiveContainer> : <ChartSkeleton />}
          </div>
        )}
      </Panel>
      <section className="xl:col-span-2">
        <SmartInsightsPanel insights={totals.insights} />
      </section>
    </div>
  );
}
