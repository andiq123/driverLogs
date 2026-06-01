"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createExpense, createVehicle, deleteVehicle, getAnalytics, getExpenses, getUserSettings, getVehicles, healthCheck, updateExpense, updateUserSettings, updateVehicle } from "./api";
import { copyText } from "./clipboard";
import { emptyTotals } from "./theme";
import type { Expense, UserSettings, Vehicle, View } from "./types";
import { useAuthSession } from "./use-auth-session";
import { useToasts } from "./use-toasts";

const selectedVehicleStorageKey = "driverlogs:selected-vehicle-id";
const healthToastKey = "api-health";

export function useDriverLogsApp() {
  const [view, setView] = useState<View>("Dashboard");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeVehicleID, setActiveVehicleID] = useState("");
  const [vehicleTotals, setVehicleTotals] = useState(emptyTotals);
  const [settings, setSettings] = useState<UserSettings>({ name: "", default_currency: "MDL", country: "MD", compare_country: "RO" });
  const [status, setStatus] = useState("Loading app data...");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [action, setAction] = useState<"vehicle" | "expense" | "settings" | "delete" | "profile" | "">("");
  const [mounted, setMounted] = useState(false);
  const auth = useAuthSession();
  const { authStatus, createLogin, loginID, logout, signIn, token } = auth;
  const toast = useToasts();
  const { dismissToast, showToast, toasts } = toast;

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleID) ?? vehicles[0];
  const activeExpenses = useMemo(() => activeVehicle ? expenses.filter((expense) => expense.vehicle_id === activeVehicle.id) : [], [activeVehicle, expenses]);

  const loadData = useCallback(async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setIsLoadingData(true);
    setStatus("Loading app data...");
    try {
      const [nextVehicles, nextExpenses, nextSettings] = await Promise.all([getVehicles(token), getExpenses(token), getUserSettings(token)]);
      setVehicles(nextVehicles);
      setExpenses(nextExpenses);
      setSettings(nextSettings);
      setActiveVehicleID((current) => {
        const saved = typeof window === "undefined" ? "" : localStorage.getItem(selectedVehicleStorageKey) ?? "";
        const preferred = current || saved;
        return nextVehicles.some((vehicle) => vehicle.id === preferred) ? preferred : nextVehicles[0]?.id || "";
      });
      setStatus(nextVehicles.length ? "Ready" : "Add your first vehicle to start tracking ownership costs.");
    } catch {
      setStatus("Session expired or backend is not reachable.");
      logout();
    } finally {
      if (showLoading) setIsLoadingData(false);
    }
  }, [logout, token]);

  useEffect(() => {
    let cancelled = false;
    void healthCheck().catch(() => {
      if (!cancelled) showToast("error", "Service is not available", "Please try again in a moment.", healthToastKey);
    });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!token) return;
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      void loadData();
    });
    return () => cancelAnimationFrame(frame);
  }, [loadData, token]);

  useEffect(() => {
    if (!activeVehicle?.id) {
      const frame = requestAnimationFrame(() => setVehicleTotals(emptyTotals));
      return () => cancelAnimationFrame(frame);
    }
    if (!token) return;
    let cancelled = false;
    void getAnalytics(token, activeVehicle.id)
      .then((totals) => {
        if (!cancelled) setVehicleTotals(totals);
      })
      .catch(() => {
        if (!cancelled) setVehicleTotals(emptyTotals);
      });
    return () => {
      cancelled = true;
    };
  }, [activeVehicle?.id, token]);

  async function saveVehicle(vehicle: Partial<Vehicle>) {
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await createVehicle(token, vehicle);
      await loadData(false);
      setActiveVehicleID(saved.id);
      localStorage.setItem(selectedVehicleStorageKey, saved.id);
      setView("Dashboard");
      showToast("success", "Vehicle saved", "Your garage was updated.");
    } catch {
      setStatus("Vehicle could not be saved. Each user can have up to 4 vehicles.");
      showToast("error", "Vehicle was not saved", "Each user can have up to 4 vehicles.");
    } finally {
      setAction("");
    }
  }

  async function editVehicle(id: string, vehicle: Partial<Vehicle>) {
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await updateVehicle(token, id, vehicle);
      await loadData(false);
      setActiveVehicleID(saved.id);
      localStorage.setItem(selectedVehicleStorageKey, saved.id);
      showToast("success", "Vehicle updated", "Your car details were saved.");
    } catch {
      setStatus("Vehicle could not be updated.");
      showToast("error", "Vehicle was not updated", "Check required fields and backend availability.");
    } finally {
      setAction("");
    }
  }

  async function saveExpense(expense: Partial<Expense>) {
    setAction("expense");
    setStatus("Saving expense...");
    try {
      await createExpense(token, expense);
      await loadData(false);
      setView("Timeline");
      showToast("success", "Expense saved", "The conversion was stamped for that date.");
    } catch {
      setStatus("Expense could not be saved. Check the required fields.");
      showToast("error", "Expense was not saved", "Check required fields and backend availability.");
    } finally {
      setAction("");
    }
  }

  async function editExpense(id: string, expense: Partial<Expense>) {
    setAction("expense");
    setStatus("Saving expense...");
    try {
      await updateExpense(token, id, expense);
      await loadData(false);
      showToast("success", "Expense updated", "The conversion was refreshed for that date.");
    } catch {
      setStatus("Expense could not be updated.");
      showToast("error", "Expense was not updated", "Check required fields and backend availability.");
    } finally {
      setAction("");
    }
  }

  async function saveSettings(nextSettings: UserSettings) {
    setAction("settings");
    setStatus("Saving settings...");
    try {
      const saved = await updateUserSettings(token, nextSettings);
      setSettings(saved);
      setStatus("Settings saved.");
      showToast("success", "Settings saved");
    } catch {
      setStatus("Settings could not be saved.");
      showToast("error", "Settings were not saved");
    } finally {
      setAction("");
    }
  }

  async function saveProfileName(name: string) {
    setAction("profile");
    await saveSettings({ ...settings, name });
    auth.closeLoginNotice();
    setAction("");
  }

  async function removeVehicle(id: string) {
    setAction("delete");
    setStatus("Removing vehicle...");
    try {
      await deleteVehicle(token, id);
      setActiveVehicleID("");
      localStorage.removeItem(selectedVehicleStorageKey);
      await loadData(false);
      showToast("success", "Vehicle removed");
    } catch {
      setStatus("Vehicle could not be removed.");
      showToast("error", "Vehicle was not removed");
    } finally {
      setAction("");
    }
  }

  function logoutApp() {
    logout();
    setVehicles([]);
    setExpenses([]);
    setVehicleTotals(emptyTotals);
    setView("Dashboard");
  }

  function selectVehicle(id: string) {
    setActiveVehicleID(id);
    localStorage.setItem(selectedVehicleStorageKey, id);
  }

  async function copyLoginID() {
    if (!loginID) return;
    await copyText(loginID);
    showToast("success", "Login ID copied");
  }

  return {
    activeExpenses,
    activeVehicle,
    action,
    createLogin,
    clearAuthStatus: auth.clearAuthStatus,
    closeLoginNotice: auth.closeLoginNotice,
    copyLoginID,
    expenses,
    loginID,
    loginNotice: auth.loginNotice,
    isLoadingData,
    logout: logoutApp,
    mounted,
    removeVehicle,
    saveExpense,
    saveSettings,
    saveProfileName,
    editVehicle,
    editExpense,
    saveVehicle,
    setActiveVehicleID: selectVehicle,
    setView,
    signIn,
    authAction: auth.authAction,
    authFeedback: auth.authFeedback,
    authStatus,
    status: authStatus || status,
    settings,
    token,
    toasts,
    dismissToast,
    vehicleTotals,
    vehicles,
    view,
  };
}
