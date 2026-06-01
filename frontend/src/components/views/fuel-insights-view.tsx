"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Fuel, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { getFuelComparison, getFuelTrends } from "@/lib/api";
import { normalizeFuelType } from "@/lib/car-options";
import type { FuelComparisonResponse, FuelTrendChange, FuelTrendResponse } from "@/lib/types";
import { EmptyState, Panel, SkeletonLine } from "../ui";

const trendCache = new Map<string, FuelTrendResponse>();
const failedTrendCountries = new Set<string>();
const inFlightTrendRequests = new Map<string, Promise<FuelTrendResponse>>();
const comparisonCache = new Map<string, FuelComparisonResponse>();
const failedComparisonKeys = new Set<string>();
const inFlightComparisonRequests = new Map<string, Promise<FuelComparisonResponse>>();

export function FuelInsightsView({ token, country, compareCountry, preferredFuelType = "Super 95" }: { token: string; country: string; compareCountry: string; preferredFuelType?: string }) {
  const [trends, setTrends] = useState<FuelTrendResponse | undefined>(() => trendCache.get(country));
  const [failed, setFailed] = useState(() => failedTrendCountries.has(country));
  const comparisonKey = `${country}:${compareCountry}`;
  const [comparison, setComparison] = useState<FuelComparisonResponse | undefined>(() => comparisonCache.get(comparisonKey));
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const cached = trendCache.get(country);
    if (cached || failedTrendCountries.has(country)) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setTrends(cached);
        setFailed(!cached);
      });
      return () => {
        cancelled = true;
      };
    }

    let request = inFlightTrendRequests.get(country);
    if (!request) {
      request = getFuelTrends(tokenRef.current, country);
      inFlightTrendRequests.set(country, request);
    }
    void request
      .then((response) => {
        trendCache.set(country, response);
        failedTrendCountries.delete(country);
        if (!cancelled) {
          setTrends(response);
          setFailed(false);
        }
      })
      .catch(() => {
        failedTrendCountries.add(country);
        if (!cancelled) {
          setTrends(undefined);
          setFailed(true);
        }
      })
      .finally(() => {
        if (inFlightTrendRequests.get(country) === request) {
          inFlightTrendRequests.delete(country);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${country}:${compareCountry}`;
    const cached = comparisonCache.get(cacheKey);
    if (cached || failedComparisonKeys.has(cacheKey)) {
      void Promise.resolve().then(() => {
        if (!cancelled) setComparison(cached);
      });
      return () => {
        cancelled = true;
      };
    }
    let request = inFlightComparisonRequests.get(cacheKey);
    if (!request) {
      request = getFuelComparison(tokenRef.current, country, compareCountry);
      inFlightComparisonRequests.set(cacheKey, request);
    }
    void request
      .then((response) => {
        comparisonCache.set(cacheKey, response);
        failedComparisonKeys.delete(cacheKey);
        if (!cancelled) setComparison(response);
      })
      .catch(() => {
        failedComparisonKeys.add(cacheKey);
        if (!cancelled) setComparison(undefined);
      })
      .finally(() => {
        if (inFlightComparisonRequests.get(cacheKey) === request) inFlightComparisonRequests.delete(cacheKey);
      });
    return () => {
      cancelled = true;
    };
  }, [compareCountry, country]);

  const biggestMove = useMemo(() => trends?.rows.reduce((best, row) => Math.abs(row.year.percent) > Math.abs(best.year.percent) ? row : best, trends.rows[0]), [trends]);
  const preferredFuel = useMemo(() => trends?.rows.find((row) => row.fuel_type === preferredTrendFuel(preferredFuelType)), [preferredFuelType, trends]);
  const comparisonByFuel = useMemo(() => new Map(comparison?.rows.map((row) => [row.fuel_type, row]) ?? []), [comparison]);

  if (!trends) {
    if (failed) {
      return (
        <Panel title="Fuel prices" eyebrow="Real gasoline data">
          <EmptyState icon={Fuel} title="Fuel prices are not available right now." body="Fresh Moldova gasoline data is loaded from Autotraveler when available." />
        </Panel>
      );
    }
    return <FuelPricesLoading />;
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <section className="relative overflow-hidden rounded-[24px] bg-[#151712] p-4 text-white shadow-[0_22px_72px_rgba(21,23,18,0.22)] sm:rounded-[28px] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="relative">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Real gasoline data</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:mt-2 sm:text-5xl">Fuel prices</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:mt-3 sm:text-sm">
              {preferredFuel ? <span className="rounded-full bg-[#dfe7d4] px-3 py-1 font-bold text-[#151712]">{preferredFuel.fuel_type} {priceOnly(preferredFuel.now)}</span> : null}
            </div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-1.5 sm:mt-8 sm:gap-3">
          <MarketTile title="Tracked fuels" value={String(trends.rows.length)} detail="National average rows" />
          <MarketTile title="Cheapest now" value={priceOnly(cheapest(trends).now)} detail={cheapest(trends).fuel_type} />
          <MarketTile title="Largest yearly move" value={changePercent(biggestMove?.year.percent ?? 0)} detail={biggestMove?.fuel_type ?? "No movement"} />
        </div>
      </section>

      <Panel title="Moldova prices" eyebrow="Now vs history">
        <div className="grid gap-2 sm:gap-3">
          {trends.rows.map((row) => (
            <article key={row.fuel_type} className="rounded-[18px] bg-[#eef3e8] p-2.5 sm:rounded-[24px] sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold sm:text-base">{row.fuel_type}</p>
                  <p className="text-[11px] text-[#62685e] sm:text-xs">Moldova national reference</p>
                </div>
                <div className="grid shrink-0 justify-items-end gap-1">
                  <p className="rounded-full bg-white px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm">MDL {priceOnly(row.now)}</p>
                  {comparisonByFuel.get(row.fuel_type) ? <p className="rounded-full bg-[#151712] px-2.5 py-1 text-[10px] font-bold text-white sm:text-[11px]">{comparisonTag(comparisonByFuel.get(row.fuel_type)!, compareCountry)}</p> : null}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
                <ChangeCard label="Week" change={row.week} />
                <ChangeCard label="Month" change={row.month} />
                <ChangeCard label="Year" change={row.year} />
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
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

function FuelPricesLoading() {
  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-[28px] bg-[#151712] p-5 text-white shadow-[0_22px_72px_rgba(21,23,18,0.22)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="relative">
          <SkeletonLine className="h-3 w-36 bg-white/12" />
          <SkeletonLine className="mt-4 h-12 w-56 bg-white/12" />
          <SkeletonLine className="mt-4 h-4 w-72 max-w-full bg-white/10" />
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => <SkeletonLine key={index} className="h-24 rounded-[22px] bg-white/10" />)}
          </div>
        </div>
      </section>
      <Panel title="National currency table" eyebrow="Loading real data">
        <div className="grid gap-3">
          {Array.from({ length: 5 }, (_, index) => <SkeletonLine key={index} className="h-24 rounded-[24px]" />)}
        </div>
      </Panel>
    </div>
  );
}

function ChangeCard({ label, change }: { label: string; change: FuelTrendChange }) {
  const positive = change.amount > 0;
  const negative = change.amount < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : RefreshCw;
  return (
    <div className="grid min-w-0 gap-1 rounded-[14px] bg-white/70 px-2 py-2 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-[18px] sm:px-3">
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#62685e] sm:text-xs">{label}</span>
        <span className="text-xs font-bold sm:text-sm">{changeAmount(change.amount)}</span>
      </span>
      <span className={`flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:py-1 sm:text-xs ${positive ? "bg-[#e5f3dc] text-[#0f6b3d]" : negative ? "bg-[#ffe8e2] text-[#8b2d20]" : "bg-[#eef3e8] text-[#62685e]"}`}>
        <Icon size={13} />
        {changePercent(change.percent)}
      </span>
    </div>
  );
}

function cheapest(trends: FuelTrendResponse) {
  return trends.rows.reduce((best, row) => row.now < best.now ? row : best, trends.rows[0]);
}

function priceOnly(value: number) {
  return value.toFixed(2);
}

function comparisonTag(row: FuelComparisonResponse["rows"][number], country: string) {
  return `${country} ${priceOnly(row.compare_price)} ${row.compare_currency} · MDL ${priceOnly(row.compare_price_mdl)}`;
}

function currencyName(country: string) {
  if (country === "RO") return "RON";
  return country;
}

function changeAmount(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(2)} MDL`;
}

function changePercent(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(2)}%`;
}

function preferredTrendFuel(value: string) {
  const fuelType = normalizeFuelType(value);
  if (fuelType === "Diesel" || fuelType === "LPG") return fuelType;
  return "Super 95";
}
