"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getFuelMarket } from "./api";
import { normalizeFuelType } from "./car-options";
import { demoToken, isLocalDemoEnabled } from "./demo-mode";
import type { FuelMarketResponse } from "./types";

const marketCache = new Map<string, FuelMarketResponse>();
const inFlightMarketRequests = new Map<string, Promise<FuelMarketResponse>>();

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

export function useFuelMarket(token: string, country: string, compareCountry: string) {
  const marketKey = `${country}:${compareCountry}`;
  const isDemo = isLocalDemoEnabled && token === demoToken;
  const [market, setMarket] = useState<FuelMarketResponse | undefined>(() => marketCache.get(marketKey));
  const [demoMarket, setDemoMarket] = useState<FuelMarketResponse>();
  const [failed, setFailed] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      void import("./demo-data").then(({ demoFuelMarket }) => {
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

  return {
    isDemo,
    market: activeMarket,
    failed: !isDemo && failed,
    revalidating,
    revalidate,
    cacheText: activeMarket?.cache ? cacheTimeLeft(activeMarket.cache.expires_in_seconds) : "",
    trends: activeMarket?.trends,
    comparison: activeMarket?.comparison,
  };
}

function cacheTimeLeft(expiresInSeconds: number | undefined) {
  const seconds = Math.max(0, expiresInSeconds ?? 0);
  if (!seconds) return "expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function usePreferredFuelRow(preferredFuelType: string, trends: FuelMarketResponse["trends"] | undefined) {
  return useMemo(() => trends?.rows.find((row) => row.fuel_type === preferredTrendFuel(preferredFuelType)), [preferredFuelType, trends]);
}

export function useBiggestMove(trends: FuelMarketResponse["trends"] | undefined) {
  return useMemo(() => trends?.rows.reduce((best, row) => (Math.abs(row.year.percent) > Math.abs(best.year.percent) ? row : best), trends.rows[0]), [trends]);
}

export function useComparisonByFuel(comparison: FuelMarketResponse["comparison"] | undefined) {
  return useMemo(() => new Map(comparison?.rows.map((row) => [row.fuel_type, row]) ?? []), [comparison]);
}

function preferredTrendFuel(value: string) {
  const fuelType = normalizeFuelType(value);
  if (fuelType === "Diesel" || fuelType === "LPG") return fuelType;
  return "Super 95";
}
