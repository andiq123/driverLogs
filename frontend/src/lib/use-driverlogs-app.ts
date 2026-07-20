"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, healthCheck, logClientError } from "./api";
import { readToken } from "./auth-storage";
import { copyText } from "./clipboard";
import { demoToken, isLocalDemoEnabled } from "./demo-mode";
import type { View } from "./types";
import { useAppData } from "./use-app-data";
import { useAppMutations } from "./use-app-mutations";
import { useAuthSession } from "./use-auth-session";
import { useToasts } from "./use-toasts";

const healthToastKey = "api-health";
const pwaUpdateToastKey = "pwa-update";

export function useDriverLogsApp() {
  const [view, setRawView] = useState<View>("Dashboard");

  const changeView = useCallback((next: View) => {
    window.scrollTo({ top: 0 });
    setRawView(next);
  }, []);

  const auth = useAuthSession();
  const { authStatus, createLogin, loginID, logout, signIn, token } = auth;
  const toast = useToasts();
  const { dismissToast, showToast, toasts } = toast;

  const appData = useAppData({ token, logout, showToast, changeView });
  const mutations = useAppMutations({
    token,
    isDemo: appData.isDemo,
    loadData: appData.loadData,
    settings: appData.settings,
    setSettings: appData.setSettings,
    setExpenses: appData.setExpenses,
    setStatus: appData.setStatus,
    selectVehicle: appData.selectVehicle,
    clearSelectedVehicle: appData.clearSelectedVehicle,
    changeView,
    showToast,
    closeLoginNotice: auth.closeLoginNotice,
    expenses: appData.expenses,
  });

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

  async function copyLoginID() {
    if (!loginID) return;
    await copyText(loginID);
    showToast("success", "Login ID copied");
  }

  return {
    activeExpenses: appData.activeExpenses,
    activeVehicle: appData.activeVehicle,
    action: mutations.action,
    createLogin,
    startDemo: appData.startDemo,
    clearAuthStatus: auth.clearAuthStatus,
    closeLoginNotice: auth.closeLoginNotice,
    copyLoginID,
    expenses: appData.expenses,
    loginID,
    loginNotice: auth.loginNotice,
    isAuthReady: auth.isAuthReady,
    isLoadingData: appData.isLoadingData,
    logout: appData.logoutApp,
    mounted: appData.mounted,
    removeVehicle: mutations.removeVehicle,
    removeExpense: mutations.removeExpense,
    saveExpense: mutations.saveExpense,
    toggleExpenseAnalytics: mutations.toggleExpenseAnalytics,
    saveSettings: mutations.saveSettings,
    saveProfileName: mutations.saveProfileName,
    editVehicle: mutations.editVehicle,
    editExpense: mutations.editExpense,
    saveVehicle: mutations.saveVehicle,
    setActiveVehicleID: appData.selectVehicle,
    setView: changeView,
    signIn,
    authAction: auth.authAction,
    authFeedback: auth.authFeedback,
    authStatus,
    status: authStatus || appData.status,
    settings: appData.settings,
    token: appData.isDemo && isLocalDemoEnabled ? demoToken : token,
    toasts,
    userDocuments: appData.userDocuments,
    openExpenseFilesID: mutations.openExpenseFilesID,
    setOpenExpenseFilesID: mutations.setOpenExpenseFilesID,
    dismissToast,
    vehicleTotals: appData.vehicleTotals,
    vehicles: appData.vehicles,
    view,
  };
}

export type DriverLogsApp = ReturnType<typeof useDriverLogsApp>;
