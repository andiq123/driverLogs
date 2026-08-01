"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseHost, errorMessage, getAppData, isUnauthorizedError, logClientError } from "./api";
import { readToken } from "./auth-storage";
import { isLocalDemoEnabled } from "./demo-mode";
import { emptyTotals } from "./theme";
import type { DocumentAttachment, Expense, ToastKind, Trip, UserSettings, Vehicle, View } from "./types";

export const selectedVehicleStorageKey = "driverlogs:selected-vehicle-id";
const healthToastKey = "api-health";

type UseAppDataDeps = {
  token: string;
  logout: (message?: string) => void;
  showToast: (type: ToastKind, title: string, message?: string, key?: string) => void;
  changeView: (view: View) => void;
};

export function useAppData({ token, logout, showToast, changeView }: UseAppDataDeps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [userDocuments, setUserDocuments] = useState<DocumentAttachment[]>([]);
  const [activeVehicleID, setActiveVehicleID] = useState("");
  const [vehicleTotalsByID, setVehicleTotalsByID] = useState<Record<string, typeof emptyTotals>>({});
  const [settings, setSettings] = useState<UserSettings>({ name: "", default_currency: "MDL", country: "MD", compare_country: "RO" });
  const [status, setStatus] = useState("Loading app data...");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const activeVehicleIDRef = useRef("");
  const tokenRef = useRef("");
  const appDataLoadedRef = useRef(false);

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleID) ?? vehicles[0];
  const activeExpenses = useMemo(() => activeVehicle ? expenses.filter((expense) => expense.vehicle_id === activeVehicle.id) : [], [activeVehicle, expenses]);
  const activeTrips = useMemo(() => activeVehicle ? trips.filter((trip) => trip.vehicle_id === activeVehicle.id) : [], [activeVehicle, trips]);
  const vehicleTotals = activeVehicle?.id ? vehicleTotalsByID[activeVehicle.id] ?? emptyTotals : emptyTotals;

  useEffect(() => {
    tokenRef.current = token;
    if (!token) {
      appDataLoadedRef.current = false;
    }
  }, [token]);

  const loadData = useCallback(async (showLoading = true) => {
    const activeToken = tokenRef.current;
    if (!activeToken || isDemo) return;
    const requestToken = readToken() || activeToken;
    if (showLoading) setIsLoadingData(true);
    setStatus("Loading app data...");
    try {
      const data = await getAppData(requestToken);
      setVehicles(data.vehicles);
      setExpenses(data.expenses);
      setTrips(data.trips ?? []);
      setUserDocuments(data.user_documents ?? []);
      setSettings(data.settings);
      setVehicleTotalsByID(data.vehicle_totals);
      const nextActiveID = (() => {
        const saved = typeof window === "undefined" ? "" : localStorage.getItem(selectedVehicleStorageKey) ?? "";
        const preferred = activeVehicleIDRef.current || saved;
        return data.vehicles.some((vehicle) => vehicle.id === preferred) ? preferred : data.vehicles[0]?.id || "";
      })();
      setActiveVehicleID(nextActiveID);
      activeVehicleIDRef.current = nextActiveID;
      setStatus(data.vehicles.length ? "Ready" : "Add your first vehicle to start tracking ownership costs.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        const detail = errorMessage(error, "unauthorized");
        logClientError({ level: "warn", area: "app.load", message: "Authenticated data load returned unauthorized", detail, context: { state_token_length: activeToken.length, stored_token_length: requestToken.length, api_host: apiBaseHost() } });
        setStatus("Session expired. Please sign in again.");
        logout("Session expired. Please sign in again.");
        return;
      }
      logClientError({ level: "error", area: "app.load", message: "Authenticated data load failed", detail: errorMessage(error, "unknown error") });
      setStatus("Service is not available. Your login is still saved.");
      showToast("error", "Service is not available", "Please try again in a moment.", healthToastKey);
    } finally {
      if (showLoading) setIsLoadingData(false);
    }
  }, [isDemo, logout, showToast]);

  useEffect(() => {
    if (!token || isDemo) return;
    if (appDataLoadedRef.current) return;
    appDataLoadedRef.current = true;
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      void loadData();
    });
    return () => cancelAnimationFrame(frame);
  }, [isDemo, loadData, token]);

  useEffect(() => {
    if (!token || isDemo) return;
    const reloadDocuments = () => void loadData(false);
    window.addEventListener("driverlogs:documents-updated", reloadDocuments);
    return () => window.removeEventListener("driverlogs:documents-updated", reloadDocuments);
  }, [isDemo, loadData, token]);

  const resetAppData = useCallback(() => {
    setIsDemo(false);
    setVehicles([]);
    setExpenses([]);
    setTrips([]);
    setUserDocuments([]);
    setVehicleTotalsByID({});
    setActiveVehicleID("");
    activeVehicleIDRef.current = "";
  }, []);

  const logoutApp = useCallback(() => {
    resetAppData();
    logout();
    changeView("Dashboard");
  }, [changeView, logout, resetAppData]);

  const selectVehicle = useCallback((id: string) => {
    setActiveVehicleID(id);
    activeVehicleIDRef.current = id;
    localStorage.setItem(selectedVehicleStorageKey, id);
  }, []);

  const clearSelectedVehicle = useCallback(() => {
    setActiveVehicleID("");
    activeVehicleIDRef.current = "";
    localStorage.removeItem(selectedVehicleStorageKey);
  }, []);

  const startDemo = useCallback(async () => {
    if (!isLocalDemoEnabled) return;
    const { demoAppData } = await import("./demo-data");
    setIsDemo(true);
    setMounted(true);
    setIsLoadingData(false);
    setVehicles(demoAppData.vehicles);
    setExpenses(demoAppData.expenses);
    setTrips(demoAppData.trips ?? []);
    setUserDocuments(demoAppData.user_documents ?? []);
    setSettings(demoAppData.settings);
    setVehicleTotalsByID(demoAppData.vehicle_totals);
    setActiveVehicleID(demoAppData.vehicles[0]?.id ?? "");
    activeVehicleIDRef.current = demoAppData.vehicles[0]?.id ?? "";
    setStatus("Demo data loaded.");
    changeView("Dashboard");
    showToast("success", "Demo started", "Read-only sample data. Explore every view.");
  }, [changeView, showToast]);

  return {
    activeExpenses,
    activeTrips,
    activeVehicle,
    activeVehicleIDRef,
    expenses,
    isDemo,
    isLoadingData,
    loadData,
    logoutApp,
    mounted,
    resetAppData,
    clearSelectedVehicle,
    selectVehicle,
    setExpenses,
    setIsDemo,
    setSettings,
    setStatus,
    settings,
    startDemo: isLocalDemoEnabled ? startDemo : undefined,
    status,
    trips,
    userDocuments,
    vehicleTotals,
    vehicleTotalsByID,
    vehicles,
  };
}
