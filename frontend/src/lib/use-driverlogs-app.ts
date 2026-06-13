"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseHost, createExpense, createVehicle, deleteExpense, deleteVehicle, errorMessage, getAppData, healthCheck, isUnauthorizedError, logClientError, updateExpense, updateExpenseAnalytics, updateUserSettings, updateVehicle, uploadExpenseAttachment } from "./api";
import { readToken } from "./auth-storage";
import { copyText } from "./clipboard";
import { demoToken, isLocalDemoEnabled } from "./demo-mode";
import { emptyTotals } from "./theme";
import type { DocumentAttachment, Expense, UserSettings, Vehicle, View } from "./types";
import { useAuthSession } from "./use-auth-session";
import { useToasts } from "./use-toasts";

const selectedVehicleStorageKey = "driverlogs:selected-vehicle-id";
const healthToastKey = "api-health";
const pwaUpdateToastKey = "pwa-update";

export function useDriverLogsApp() {
  const [view, setRawView] = useState<View>("Dashboard");

  const changeView = useCallback((next: View) => {
    window.scrollTo({ top: 0 });
    setRawView(next);
  }, []);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userDocuments, setUserDocuments] = useState<DocumentAttachment[]>([]);
  const [activeVehicleID, setActiveVehicleID] = useState("");
  const [vehicleTotalsByID, setVehicleTotalsByID] = useState<Record<string, typeof emptyTotals>>({});
  const [settings, setSettings] = useState<UserSettings>({ name: "", default_currency: "MDL", country: "MD", compare_country: "RO" });
  const [status, setStatus] = useState("Loading app data...");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [action, setAction] = useState<"vehicle" | "expense" | "settings" | "delete" | "profile" | "">("");
  const [openExpenseFilesID, setOpenExpenseFilesID] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const activeVehicleIDRef = useRef("");
  const tokenRef = useRef("");
  const appDataLoadedRef = useRef(false);
  const auth = useAuthSession();
  const { authStatus, createLogin, loginID, logout, signIn, token } = auth;
  const toast = useToasts();
  const { dismissToast, showToast, toasts } = toast;

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleID) ?? vehicles[0];
  const activeExpenses = useMemo(() => activeVehicle ? expenses.filter((expense) => expense.vehicle_id === activeVehicle.id) : [], [activeVehicle, expenses]);
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
    if (readToken()) return;
    let cancelled = false;
    void healthCheck().catch((error) => {
      logClientError({ level: "warn", area: "app.health", message: "Health check failed", detail: errorMessage(error, "unknown error") });
      if (!cancelled) showToast("error", "Service is not available", "Please try again in a moment.", healthToastKey);
    });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    const showUpdateToast = () => {
      logClientError({ level: "warn", area: "pwa.update", message: "PWA update event received" });
      showToast("info", "Updating app", "A fresh version is being installed.", pwaUpdateToastKey);
    };
    window.addEventListener("driverlogs:pwa-update", showUpdateToast);
    return () => window.removeEventListener("driverlogs:pwa-update", showUpdateToast);
  }, [showToast]);

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

  async function startDemo() {
    if (!isLocalDemoEnabled) {
      showToast("error", "Demo unavailable", "Demo mode is only available locally.");
      return;
    }
    const { demoAppData } = await import("./demo-data");
    setIsDemo(true);
    setMounted(true);
    setIsLoadingData(false);
    setVehicles(demoAppData.vehicles);
    setExpenses(demoAppData.expenses);
    setUserDocuments([]);
    setSettings(demoAppData.settings);
    setVehicleTotalsByID(demoAppData.vehicle_totals);
    setActiveVehicleID(demoAppData.vehicles[0]?.id ?? "");
    activeVehicleIDRef.current = demoAppData.vehicles[0]?.id ?? "";
    setStatus("Demo data loaded.");
    changeView("Dashboard");
    showToast("success", "Demo started", "Explore the dashboard, timeline, analytics, fuel prices, and settings.");
  }

  async function saveVehicle(vehicle: Partial<Vehicle>) {
    if (isDemo) {
      showToast("info", "Demo mode", "Demo data is read-only. Register to save your own car.");
      return;
    }
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await createVehicle(token, vehicle);
      await loadData(false);
      setActiveVehicleID(saved.id);
      activeVehicleIDRef.current = saved.id;
      localStorage.setItem(selectedVehicleStorageKey, saved.id);
      changeView("Dashboard");
      showToast("success", "Vehicle saved", "Your garage was updated.");
    } catch {
      setStatus("Vehicle could not be saved. Each user can have up to 4 vehicles.");
      showToast("error", "Vehicle was not saved", "Each user can have up to 4 vehicles.");
    } finally {
      setAction("");
    }
  }

  async function editVehicle(id: string, vehicle: Partial<Vehicle>) {
    if (isDemo) {
      showToast("info", "Demo mode", "Register to edit real vehicle records.");
      return;
    }
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await updateVehicle(token, id, vehicle);
      await loadData(false);
      setActiveVehicleID(saved.id);
      activeVehicleIDRef.current = saved.id;
      localStorage.setItem(selectedVehicleStorageKey, saved.id);
      showToast("success", "Vehicle updated", "Your car details were saved.");
    } catch (error) {
      setStatus("Vehicle could not be updated.");
      showToast("error", "Vehicle was not updated", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }

  async function saveExpense(expense: Partial<Expense>, files: File[] = []) {
    if (isDemo) {
      showToast("info", "Demo mode", "Register to save real expenses.");
      return;
    }
    setAction("expense");
    setStatus("Saving expense...");
    try {
      const saved = await createExpense(token, expense);
      const uploadError = await uploadExpenseFiles(saved.id, files);
      await loadData(false);
      setOpenExpenseFilesID(saved.id);
      changeView("Timeline");
      showToast("success", "Expense saved", files.length && !uploadError ? `${files.length} file${files.length === 1 ? "" : "s"} attached.` : "You can attach files from the timeline.");
      if (uploadError) showToast("error", "File upload failed", errorMessage(uploadError, "The expense was saved, but one or more files were not attached."));
    } catch (error) {
      setStatus("Expense could not be saved. Check the required fields.");
      showToast("error", "Expense was not saved", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }

  async function editExpense(id: string, expense: Partial<Expense>, files: File[] = []) {
    if (isDemo) {
      showToast("info", "Demo mode", "Register to edit real expenses.");
      return;
    }
    setAction("expense");
    setStatus("Saving expense...");
    try {
      await updateExpense(token, id, expense);
      const uploadError = await uploadExpenseFiles(id, files);
      await loadData(false);
      setOpenExpenseFilesID(id);
      showToast("success", "Expense updated", files.length && !uploadError ? `${files.length} file${files.length === 1 ? "" : "s"} attached.` : "The conversion was refreshed for that date.");
      if (uploadError) showToast("error", "File upload failed", errorMessage(uploadError, "The expense was saved, but one or more files were not attached."));
    } catch (error) {
      setStatus("Expense could not be updated.");
      showToast("error", "Expense was not updated", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }

  async function toggleExpenseAnalytics(expense: Expense, excluded: boolean) {
    const previousExpenses = expenses;
    setExpenses((current) => current.map((item) => item.id === expense.id ? { ...item, exclude_from_analytics: excluded } : item));
    if (isDemo) {
      showToast("info", "Demo mode", excluded ? "This expense is hidden from demo analytics locally." : "This expense is included in demo analytics locally.");
      return;
    }
    setAction("expense");
    try {
      await updateExpenseAnalytics(token, expense.id, excluded);
      await loadData(false);
      showToast("success", excluded ? "Hidden from analytics" : "Included in analytics", "Totals were recalculated.");
    } catch (error) {
      setExpenses(previousExpenses);
      showToast("error", "Analytics setting was not saved", errorMessage(error, "Check backend availability."));
    } finally {
      setAction("");
    }
  }

  async function uploadExpenseFiles(expenseID: string, files: File[]) {
    for (const file of files) {
      try {
        await uploadExpenseAttachment(token, expenseID, file);
      } catch (error) {
        return error;
      }
    }
    return undefined;
  }

  async function removeExpense(id: string) {
    if (isDemo) {
      showToast("info", "Demo mode", "Register to delete real expenses.");
      return;
    }
    setAction("delete");
    setStatus("Removing expense...");
    try {
      await deleteExpense(token, id);
      await loadData(false);
      showToast("success", "Expense removed");
    } catch (error) {
      setStatus("Expense could not be removed.");
      showToast("error", "Expense was not removed", errorMessage(error, "Check backend availability."));
    } finally {
      setAction("");
    }
  }

  async function saveSettings(nextSettings: UserSettings) {
    if (isDemo) {
      setSettings(nextSettings);
      showToast("info", "Demo mode", "Settings changes are local in demo mode.");
      return;
    }
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
    if (isDemo) {
      showToast("info", "Demo mode", "Demo vehicle cannot be removed.");
      return;
    }
    setAction("delete");
    setStatus("Removing vehicle...");
    try {
      await deleteVehicle(token, id);
    setActiveVehicleID("");
    activeVehicleIDRef.current = "";
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
    setIsDemo(false);
    logout();
    setVehicles([]);
    setExpenses([]);
    setUserDocuments([]);
    setVehicleTotalsByID({});
    changeView("Dashboard");
  }

  function selectVehicle(id: string) {
    setActiveVehicleID(id);
    activeVehicleIDRef.current = id;
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
    startDemo: isLocalDemoEnabled ? startDemo : undefined,
    clearAuthStatus: auth.clearAuthStatus,
    closeLoginNotice: auth.closeLoginNotice,
    copyLoginID,
    expenses,
    loginID,
    loginNotice: auth.loginNotice,
    isAuthReady: auth.isAuthReady,
    isLoadingData,
    logout: logoutApp,
    mounted,
    removeVehicle,
    removeExpense,
    saveExpense,
    toggleExpenseAnalytics,
    saveSettings,
    saveProfileName,
    editVehicle,
    editExpense,
    saveVehicle,
    setActiveVehicleID: selectVehicle,
    setView: changeView,
    signIn,
    authAction: auth.authAction,
    authFeedback: auth.authFeedback,
    authStatus,
    status: authStatus || status,
    settings,
    token: isDemo && isLocalDemoEnabled ? demoToken : token,
    toasts,
    userDocuments,
    openExpenseFilesID,
    setOpenExpenseFilesID,
    dismissToast,
    vehicleTotals,
    vehicles,
    view,
  };
}
