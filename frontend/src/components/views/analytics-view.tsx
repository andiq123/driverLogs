"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, Gauge, TrendingUp, type LucideIcon } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum, MoneyTotals, TrendDatum, Vehicle } from "@/lib/types";
import { money, monthLabel, vehicleName } from "@/lib/format";
import { palette } from "@/lib/theme";
import { ChartSkeleton, EmptyState, Panel } from "../ui";

const tooltipStyle = {
  cursor: { fill: "rgba(31,41,28,0.05)" },
  contentStyle: { borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 12px 34px rgba(31,41,28,0.12)", padding: "8px 12px", background: "#fffefb" },
  labelStyle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#62685e", marginBottom: 2 },
  itemStyle: { fontSize: 13, fontWeight: 700, color: "#151712", padding: 0 },
} as const;

export function AnalyticsView({ mounted, vehicle, totals }: { mounted: boolean; vehicle?: Vehicle; totals: MoneyTotals }) {
  const showCharts = useMinWidth("(min-width: 640px)");

  if (!vehicle) {
    return <EmptyState icon={Gauge} title="No vehicle selected" body="Add a car first. Analytics will focus on the active vehicle only." />;
  }

  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Cost split" eyebrow={vehicleName(vehicle)}>
        {totals.category_totals.length === 0 ? <EmptyState icon={BarChart3} title="No analytics yet" body="Charts become available after you add expenses." /> : (
          <>
            <MobileCategoryList rows={totals.category_totals} total={totals.total_expenses_mdl} />
            {showCharts ? (
              <ChartSurface mounted={mounted}>
                {({ width, height }) => <PieChart width={width} height={height}><Pie data={totals.category_totals} innerRadius={64} outerRadius={96} paddingAngle={4} dataKey="amount_mdl">{totals.category_totals.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip {...tooltipStyle} formatter={(value, name) => [money(Number(value)), String(name)]} /></PieChart>}
              </ChartSurface>
            ) : null}
          </>
        )}
      </Panel>
      <Panel title="Monthly trend" eyebrow={`${money(totals.total_expenses_mdl)} total`}>
        {totals.expense_count === 0 ? <EmptyState icon={Gauge} title="No costs logged" body="Add fuel, service, upgrades, or other expenses to build this car's analytics." /> : (
          <>
            <MobileTrendList rows={totals.trends} />
            {showCharts ? (
              <ChartSurface mounted={mounted}>
                {({ width, height }) => <AreaChart width={width} height={height} data={totals.trends}><XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip {...tooltipStyle} labelFormatter={(label) => typeof label === "string" ? monthLabel(label) : label} formatter={(value) => [money(Number(value)), "Spent"]} /><Area type="monotone" dataKey="amount_mdl" stroke="#0f8f68" fill="#dfe7d4" strokeWidth={3} /></AreaChart>}
              </ChartSurface>
            ) : null}
          </>
        )}
      </Panel>
      <OutlookStrip totals={totals} />
    </div>
  );
}

function OutlookStrip({ totals }: { totals: MoneyTotals }) {
  if (totals.expense_count === 0) return null;
  const anomalies = totals.insights.anomalies ?? [];
  return (
    <section className="min-w-0 rounded-[24px] border border-black/[0.055] bg-[#fffffb]/96 p-3.5 shadow-[0_8px_28px_rgba(31,41,28,0.06)] ring-1 ring-white/70 sm:rounded-[28px] sm:p-5 xl:col-span-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70776a] sm:text-xs sm:tracking-[0.16em]">Outlook</p>
      <h2 className="mt-0.5 text-lg font-semibold sm:mt-1 sm:text-xl">Forecast &amp; checks</h2>
      <div className="mt-3.5 grid gap-2 sm:mt-5 sm:grid-cols-3">
        <MiniInsight icon={TrendingUp} title="30 days" value={money(totals.insights.forecast?.next_30_days_mdl ?? 0)} />
        <MiniInsight icon={CalendarClock} title="90 days" value={money(totals.insights.forecast?.next_90_days_mdl ?? 0)} />
        <MiniInsight icon={AlertTriangle} title="Checks" value={`${anomalies.length} found`} />
      </div>
      {anomalies.length ? (
        <div className="mt-3 grid gap-2">
          {anomalies.slice(0, 4).map((item, index) => (
            <div key={`${item.kind}-${index}`} className="rounded-[18px] bg-[#fff8df] px-3 py-2 text-sm text-[#7b5a12]">
              <span className="font-bold">{item.title}</span>
              {item.date ? <span className="ml-2 text-xs opacity-75">{item.date}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
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

function ChartSurface({ children, mounted }: { children: (size: { width: number; height: number }) => ReactNode; mounted: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ width: Math.max(0, element.clientWidth), height: Math.max(0, element.clientHeight) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="h-72">{mounted && size.width > 1 && size.height > 1 ? children(size) : <ChartSkeleton />}</div>;
}

function useMinWidth(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function MobileCategoryList({ rows, total }: { rows: ChartDatum[]; total: number }) {
  return (
    <div className="grid gap-2 sm:hidden">
      {rows.slice(0, 5).map((row, index) => {
        const percent = total ? Math.round((row.amount_mdl / total) * 100) : 0;
        return (
          <div key={row.name} className="grid gap-1.5 rounded-[18px] border border-black/[0.045] bg-[#fffffb]/92 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-bold">{row.name}</span>
              <span className="shrink-0 text-sm font-bold">{money(row.amount_mdl)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full" style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: palette[index % palette.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileTrendList({ rows }: { rows: TrendDatum[] }) {
  const latest = rows.slice(-4);
  if (latest.length === 0) return <EmptyState icon={Gauge} title="No monthly trend yet" body="Add expenses on different dates to see the trend." />;
  const max = Math.max(...latest.map((row) => row.amount_mdl), 1);
  return (
    <div className="grid gap-2 sm:hidden">
      {latest.map((row) => (
        <div key={row.month} className="grid grid-cols-[5.75rem_1fr_auto] items-center gap-2 rounded-[18px] border border-black/[0.045] bg-[#fffffb]/92 p-3">
          <span className="truncate text-xs font-bold text-[#62685e]">{monthLabel(row.month)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full bg-[#0f8f68]" style={{ width: `${Math.max((row.amount_mdl / max) * 100, 5)}%` }} />
          </span>
          <span className="text-sm font-bold">{money(row.amount_mdl)}</span>
        </div>
      ))}
    </div>
  );
}
