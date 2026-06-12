"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Fuel, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { getFuelMarket } from "@/lib/api";
import { normalizeFuelType } from "@/lib/car-options";
import { demoToken, isLocalDemoEnabled } from "@/lib/demo-mode";
import type { FuelComparisonResponse, FuelMarketResponse, FuelTrendChange, FuelTrendResponse } from "@/lib/types";
import { EmptyState, SkeletonLine } from "../ui";

const marketCache = new Map<string, FuelMarketResponse>();
const inFlightMarketRequests = new Map<string, Promise<FuelMarketResponse>>();

// Stale-while-revalidate: cached data renders instantly, a fresh request always
// runs in the background. refresh=true also busts the backend market cache.
function fetchMarket(token: string, country: string, compareCountry: string, refresh = false) {
  const cacheKey = `${country}:${compareCountry}`;
  if (!refresh) {
    const inFlight = inFlightMarketRequests.get(cacheKey);
    if (inFlight) return inFlight;
  }
  const request = getFuelMarket(token, country, compareCountry, refresh)
    .then((response) => {
      marketCache.set(cacheKey, response);
      return response;
    })
    .finally(() => {
      if (inFlightMarketRequests.get(cacheKey) === request) inFlightMarketRequests.delete(cacheKey);
    });
  inFlightMarketRequests.set(cacheKey, request);
  return request;
}

export function FuelInsightsView({ token, country, compareCountry, preferredFuelType = "Super 95" }: { token: string; country: string; compareCountry: string; preferredFuelType?: string }) {
  const marketKey = `${country}:${compareCountry}`;
  const isDemo = isLocalDemoEnabled && token === demoToken;
  const [market, setMarket] = useState<FuelMarketResponse | undefined>(() => marketCache.get(marketKey));
  const [demoMarket, setDemoMarket] = useState<FuelMarketResponse>();
  const [failed, setFailed] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      void import("@/lib/demo-data").then(({ demoFuelMarket }) => {
        if (!cancelled) setDemoMarket(demoFuelMarket);
      });
      return () => {
        cancelled = true;
      };
    }
    const [nextCountry, nextCompare] = marketKey.split(":");
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setMarket(marketCache.get(marketKey));
      setRevalidating(true);
    });
    fetchMarket(tokenRef.current, nextCountry, nextCompare)
      .then((response) => {
        if (cancelled) return;
        setMarket(response);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(!marketCache.has(marketKey));
      })
      .finally(() => {
        if (!cancelled) setRevalidating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo, marketKey]);

  async function revalidate() {
    if (isDemo || revalidating) return;
    setRevalidating(true);
    setFailed(false);
    try {
      const response = await fetchMarket(tokenRef.current, country, compareCountry, true);
      setMarket(response);
    } catch {
      setFailed(!marketCache.has(marketKey));
    } finally {
      setRevalidating(false);
    }
  }

  const activeMarket = isDemo ? demoMarket : market;
  const trends = activeMarket?.trends;
  const comparison = activeMarket?.comparison;
  const cacheText = activeMarket?.cache ? cacheTimeLeft(activeMarket.cache.expires_at, activeMarket.cache.expires_in_seconds, now) : "";
  const biggestMove = useMemo(() => trends?.rows.reduce((best, row) => Math.abs(row.year.percent) > Math.abs(best.year.percent) ? row : best, trends.rows[0]), [trends]);
  const preferredFuel = useMemo(() => trends?.rows.find((row) => row.fuel_type === preferredTrendFuel(preferredFuelType)), [preferredFuelType, trends]);
  const comparisonByFuel = useMemo(() => new Map(comparison?.rows.map((row) => [row.fuel_type, row]) ?? []), [comparison]);

  return (
    <div className="grid gap-3 sm:gap-4">
      <FuelHero trends={trends} preferredFuel={preferredFuel} biggestMove={biggestMove} cacheText={cacheText} isDemo={isDemo} revalidating={revalidating} onRevalidate={revalidate} />
      <FuelRows trends={trends} comparisonByFuel={comparisonByFuel} compareCountry={compareCountry} failed={!isDemo && failed} />
    </div>
  );
}

function FuelHero({ trends, preferredFuel, biggestMove, cacheText, isDemo, revalidating, onRevalidate }: { trends?: FuelTrendResponse; preferredFuel?: FuelTrendResponse["rows"][number]; biggestMove?: FuelTrendResponse["rows"][number]; cacheText: string; isDemo: boolean; revalidating: boolean; onRevalidate: () => Promise<void> }) {
  return (
    <section className="relative min-h-[216px] overflow-hidden rounded-[24px] bg-[#151712] p-4 text-white shadow-[0_22px_72px_rgba(21,23,18,0.22)] sm:min-h-[300px] sm:rounded-[28px] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Real gasoline data</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:mt-2 sm:text-5xl">Fuel prices</h2>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2 text-xs sm:mt-3 sm:text-sm">
          {trends ? (
            <>
              {preferredFuel ? <span className="rounded-full bg-[#dfe7d4] px-3 py-1 font-bold text-[#151712]">{preferredFuel.fuel_type} {priceOnly(preferredFuel.now)} MDL</span> : null}
              {cacheText ? <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white/72">Cache {cacheText}</span> : null}
            </>
          ) : (
            <SkeletonLine className="h-7 w-32 bg-[#dfe7d4]/70" />
          )}
          {!isDemo ? (
            <button type="button" onClick={() => void onRevalidate()} disabled={revalidating} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold text-white/85 transition-[background-color,opacity,transform] duration-200 active:scale-[0.98] disabled:opacity-60 hover:bg-white/16">
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
    <section className="rounded-[28px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_14px_48px_rgba(31,41,28,0.08)] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70776a]">Now vs history</p>
      <h2 className="mt-1 text-xl font-semibold">Moldova prices</h2>
      <div className="mt-5 grid gap-2 sm:gap-3">
        {failed ? <EmptyState icon={Fuel} title="Fuel prices are not available right now." body="Fresh Moldova gasoline data is loaded from Autotraveler when available." /> : null}
        {!failed && !trends ? Array.from({ length: 4 }, (_, index) => <FuelRowSkeleton key={index} />) : null}
        {!failed && trends ? trends.rows.map((row) => (
          <article key={row.fuel_type} className="rounded-[20px] border border-black/[0.045] bg-[#fffffb]/92 p-3 shadow-[0_8px_24px_rgba(31,41,28,0.055)] ring-1 ring-white/70 sm:rounded-[24px] sm:p-4">
            <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold sm:text-base">{row.fuel_type}</p>
                <p className="text-[11px] text-[#62685e] sm:text-xs">Moldova national reference</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-1 sm:grid sm:shrink-0 sm:justify-items-end">
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
        )) : null}
      </div>
    </section>
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
    <article className="rounded-[20px] border border-black/[0.045] bg-[#fffffb]/92 p-3 shadow-[0_8px_24px_rgba(31,41,28,0.055)] ring-1 ring-white/70 sm:rounded-[24px] sm:p-4">
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
          <div key={index} className="rounded-[14px] bg-[#f5f8f1] px-2 py-2 sm:rounded-[18px] sm:px-3">
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
    <div className="grid min-w-0 gap-1 rounded-[14px] border border-black/[0.035] bg-[#f8faf5] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-[18px] sm:px-3">
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

function cacheTimeLeft(expiresAt: string | undefined, expiresInSeconds: number | undefined, now: number) {
  const seconds = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000)) : Math.max(0, expiresInSeconds ?? 0);
  if (!seconds) return "expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
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
