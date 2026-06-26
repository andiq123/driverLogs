"use client";

import { useEffect, useState } from "react";
import { getFuelPrices } from "./api";
import { normalizeFuelType } from "./car-options";
import { demoToken, isLocalDemoEnabled } from "./demo-mode";
import type { FuelPriceSuggestion } from "./types";

type FuelSuggestionState = {
  fuelType: string;
  suggestions: FuelPriceSuggestion[];
  status: string;
};

const suggestionCache = new Map<string, FuelSuggestionState>();
const failedSuggestionKeys = new Set<string>();
const inFlightSuggestionRequests = new Map<string, Promise<FuelSuggestionState>>();

export function useFuelPriceSuggestions({ category, country, fuelType, token }: { category: string; country: string; fuelType: string; token: string }) {
  const [state, setState] = useState<FuelSuggestionState>(() => ({ fuelType: normalizeFuelType(fuelType), suggestions: [], status: "" }));
  const isDemo = isLocalDemoEnabled && token === demoToken;

  useEffect(() => {
    if (category !== "Fuel") return;
    const requestedFuelType = normalizeFuelType(fuelType);
    if (isDemo) {
      let cancelled = false;
      void import("./demo-data").then(({ demoFuelSuggestions }) => {
        if (!cancelled) setState({ fuelType: requestedFuelType, suggestions: demoFuelSuggestions(requestedFuelType), status: "" });
      });
      return () => { cancelled = true; };
    }
    let cancelled = false;
    const cacheKey = fuelSuggestionKey(country, requestedFuelType);
    const cached = suggestionCache.get(cacheKey);
    if (cached || failedSuggestionKeys.has(cacheKey)) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setState(cached ?? { fuelType: requestedFuelType, suggestions: [], status: "Fuel prices unavailable." });
      });
      return () => {
        cancelled = true;
      };
    }

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setState({ fuelType: requestedFuelType, suggestions: [], status: "Loading fuel reference..." });
    });

    let request = inFlightSuggestionRequests.get(cacheKey);
    if (!request) {
      request = getFuelPrices(token, country, requestedFuelType).then((result) => ({
        fuelType: requestedFuelType,
        suggestions: result.suggestions,
        status: result.suggestions.length ? "" : "No fuel prices found for this fuel.",
      }));
      inFlightSuggestionRequests.set(cacheKey, request);
    }

    void request
      .then((result) => {
        suggestionCache.set(cacheKey, result);
        failedSuggestionKeys.delete(cacheKey);
        if (cancelled) return;
        setState(result);
      })
      .catch(() => {
        failedSuggestionKeys.add(cacheKey);
        if (!cancelled) {
          setState({ fuelType: requestedFuelType, suggestions: [], status: "Fuel prices unavailable." });
        }
      })
      .finally(() => {
        if (inFlightSuggestionRequests.get(cacheKey) === request) {
          inFlightSuggestionRequests.delete(cacheKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, country, fuelType, isDemo, token]);

  if (category !== "Fuel") {
    return { fuelType: normalizeFuelType(fuelType), suggestions: [], status: "" };
  }
  const loadingStatus = isDemo ? "" : "Loading fuel reference...";
  return state.fuelType === normalizeFuelType(fuelType) ? state : { fuelType: normalizeFuelType(fuelType), suggestions: [], status: loadingStatus };
}

function fuelSuggestionKey(country: string, fuelType: string) {
  return `${country.trim().toUpperCase()}:${normalizeFuelType(fuelType).toLowerCase()}`;
}
