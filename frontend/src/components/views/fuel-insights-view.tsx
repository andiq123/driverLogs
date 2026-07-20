"use client";

import { Fuel, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useBiggestMove, useComparisonByFuel, useFuelMarket, usePreferredFuelRow } from "@/lib/use-fuel-market";
import type { FuelComparisonResponse, FuelTrendChange, FuelTrendResponse } from "@/lib/types";
import { EmptyState, Panel, SkeletonLine } from "../ui";

export function FuelInsightsView({ token, country, compareCountry, preferredFuelType = "Super 95" }: { token: string; country: string; compareCountry: string; preferredFuelType?: string }) {
  const { isDemo, failed, revalidating, revalidate, cacheText, trends, comparison } = useFuelMarket(token, country, compareCountry);
  const biggestMove = useBiggestMove(trends);
  const preferredFuel = usePreferredFuelRow(preferredFuelType, trends);
  const comparisonByFuel = useComparisonByFuel(comparison);

  return (
    <div className="grid gap-3 sm:gap-4">
      <FuelHero trends={trends} preferredFuel={preferredFuel} biggestMove={biggestMove} cacheText={cacheText} isDemo={isDemo} revalidating={revalidating} onRevalidate={revalidate} />
      <FuelRows trends={trends} comparisonByFuel={comparisonByFuel} compareCountry={compareCountry} failed={failed} />
    </div>
  );
}

function FuelHero({ trends, preferredFuel, biggestMove, cacheText, isDemo, revalidating, onRevalidate }: { trends?: FuelTrendResponse; preferredFuel?: FuelTrendResponse["rows"][number]; biggestMove?: FuelTrendResponse["rows"][number]; cacheText: string; isDemo: boolean; revalidating: boolean; onRevalidate: () => Promise<void> }) {
  return (
    <section className="relative min-h-[216px] overflow-hidden rounded-[24px] bg-[#151712] p-4 text-white shadow-[0_8px_24px_rgba(21,23,18,0.10)] sm:min-h-[280px] sm:rounded-[28px] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Real gasoline data</p>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2 text-xs sm:mt-3 sm:text-sm">
          {trends ? (
            <>
              {preferredFuel ? <span className="rounded-[14px] bg-[#dfe7d4] px-3 py-1 font-bold text-[#151712]">{preferredFuel.fuel_type} {priceOnly(preferredFuel.now)} MDL</span> : null}
              {cacheText ? <span className="rounded-[14px] bg-white/10 px-3 py-1 font-semibold text-white/72">Cache {cacheText}</span> : null}
            </>
          ) : (
            <SkeletonLine className="h-7 w-32 bg-[#dfe7d4]/70" />
          )}
          {!isDemo ? (
            <button type="button" onClick={() => void onRevalidate()} disabled={revalidating} className="inline-flex items-center gap-1.5 rounded-[14px] bg-white/10 px-3 py-1 font-bold text-white/85 transition-[background-color,opacity,transform] duration-200 active:scale-[0.98] disabled:opacity-60 hover:bg-white/16">
              <RefreshCw size={13} className={revalidating ? "animate-spin" : ""} />
              Revalidate
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-1.5 sm:mt-8 sm:gap-3">
        {trends ? (
          <>
            <MarketTile title="Tracked fuels" value={String(trends.rows.length)} detail="National average rows" />
            <MarketTile title="Cheapest now" value={priceOnly(cheapest(trends).now)} detail={cheapest(trends).fuel_type} />
            <MarketTile title="Largest yearly move" value={changePercent(biggestMove?.year.percent ?? 0)} detail={biggestMove?.fuel_type ?? "No movement"} />
          </>
        ) : Array.from({ length: 3 }, (_, index) => <FuelTileSkeleton key={index} />)}
      </div>
    </section>
  );
}

function FuelRows({ trends, comparisonByFuel, compareCountry, failed }: { trends?: FuelTrendResponse; comparisonByFuel: Map<string, FuelComparisonResponse["rows"][number]>; compareCountry: string; failed: boolean }) {
  return (
    <Panel eyebrow="Now vs history" title="Moldova prices">
      <div className="grid gap-2 sm:gap-3">
        {failed ? <EmptyState icon={Fuel} title="Fuel prices are not available right now." body="Fresh Moldova gasoline data is loaded from Autotraveler when available." /> : null}
        {!failed && !trends ? Array.from({ length: 4 }, (_, index) => <FuelRowSkeleton key={index} />) : null}
        {!failed && trends ? trends.rows.map((row) => (
          <article key={row.fuel_type} className="rounded-[20px] border border-black/[0.04] bg-[#f8faf5] p-3 sm:rounded-[22px] sm:p-4">
            <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold sm:text-base">{row.fuel_type}</p>
                <p className="text-[11px] text-[#62685e] sm:text-xs">Moldova national reference</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-1 sm:grid sm:shrink-0 sm:justify-items-end">
                <p className="rounded-[14px] bg-white px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm">MDL {priceOnly(row.now)}</p>
                {comparisonByFuel.get(row.fuel_type) ? <p className="rounded-[14px] bg-[#151712] px-2.5 py-1 text-[10px] font-bold text-white sm:text-[11px]">{comparisonTag(comparisonByFuel.get(row.fuel_type)!, compareCountry)}</p> : null}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
              <ChangeCard label="Week" change={row.week} />
              <ChangeCard label="Month" change={row.month} />
              <ChangeCard label="Year" change={row.year} />
            </div>
          </article>
        )) : null}
      </div>
    </Panel>
  );
}

function MarketTile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-[16px] bg-white/10 p-2 sm:rounded-[22px] sm:p-4">
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-white/50 sm:text-[11px] sm:tracking-[0.12em]">{title}</p>
      <p className="mt-1.5 truncate text-sm font-bold sm:mt-2 sm:text-xl">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-white/55 sm:mt-1 sm:text-xs">{detail}</p>
    </div>
  );
}

function FuelTileSkeleton() {
  return (
    <div className="min-w-0 rounded-[16px] bg-white/10 p-2 sm:rounded-[22px] sm:p-4">
      <SkeletonLine className="h-2.5 w-16 bg-white/12 sm:h-3 sm:w-24" />
      <SkeletonLine className="mt-1.5 h-4 w-12 bg-white/12 sm:mt-2 sm:h-6 sm:w-16" />
      <SkeletonLine className="mt-1 h-3 w-20 bg-white/10 sm:w-28" />
    </div>
  );
}

function FuelRowSkeleton() {
  return (
    <article className="rounded-[20px] border border-black/[0.04] bg-[#f8faf5] p-3 sm:rounded-[22px] sm:p-4">
      <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <SkeletonLine className="h-4 w-24 bg-white/70 sm:h-5" />
          <SkeletonLine className="mt-1 h-3 w-36 bg-white/60" />
        </div>
        <div className="flex min-w-0 flex-wrap gap-1 sm:grid sm:shrink-0 sm:justify-items-end">
          <SkeletonLine className="h-7 w-20 bg-white" />
          <SkeletonLine className="h-6 w-28 bg-[#151712]/12" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-[14px] bg-white/80 px-2 py-2 sm:rounded-[16px] sm:px-3">
            <SkeletonLine className="h-3 w-12 bg-[#dfe7d4]" />
            <SkeletonLine className="mt-2 h-4 w-14 bg-[#dfe7d4]" />
          </div>
        ))}
      </div>
    </article>
  );
}

function ChangeCard({ label, change }: { label: string; change: FuelTrendChange }) {
  const positive = change.amount > 0;
  const negative = change.amount < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : RefreshCw;
  return (
    <div className="grid min-w-0 gap-1 rounded-[14px] bg-white/80 px-2 py-2 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-[16px] sm:px-3">
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#62685e] sm:text-xs">{label}</span>
        <span className="text-xs font-bold sm:text-sm">{changeAmount(change.amount)}</span>
      </span>
      <span className={`flex w-fit items-center gap-1 rounded-[10px] px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:py-1 sm:text-xs ${positive ? "bg-[#e5f3dc] text-[#0f6b3d]" : negative ? "bg-[#ffe8e2] text-[#8b2d20]" : "bg-[#eef3e8] text-[#62685e]"}`}>
        <Icon size={13} />
        {changePercent(change.percent)}
      </span>
    </div>
  );
}

function cheapest(trends: FuelTrendResponse) {
  return trends.rows.reduce((best, row) => (row.now < best.now ? row : best), trends.rows[0]);
}

function priceOnly(value: number) {
  return value.toFixed(2);
}

function comparisonTag(row: FuelComparisonResponse["rows"][number], country: string) {
  return `${country} ${priceOnly(row.compare_price)} ${row.compare_currency} · MDL ${priceOnly(row.compare_price_mdl)}`;
}

function changeAmount(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(2)} MDL`;
}

function changePercent(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(2)}%`;
}
