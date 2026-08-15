"use client";

import { useCallback, useEffect, useState } from "react";
import { downloadReportExport, errorMessage, healthCheck, isUnauthorizedError, logClientError } from "./api";
import { readToken } from "./auth-storage";
import { copyText } from "./clipboard";
import { demoToken, isLocalDemoEnabled } from "./demo-mode";
import { buildVehicleReportSnapshot, reportSnapshotFilename } from "./report-export";
import type { SmartAnomaly, View } from "./types";
import { useAppData } from "./use-app-data";
import { useAppMutations } from "./use-app-mutations";
import { useAuthSession } from "./use-auth-session";
import { useToasts } from "./use-toasts";

const healthToastKey = "api-health";
const pwaUpdateToastKey = "pwa-update";

export function useDriverLogsApp() {
  const [view, setRawView] = useState<View>("Dashboard");
  const [exportingReport, setExportingReport] = useState(false);
  const [reviewAnomalies, setReviewAnomalies] = useState<SmartAnomaly[]>([]);

  const changeView = useCallback((next: View) => {
    window.scrollTo({ top: 0 });
    if (next !== "Timeline") setReviewAnomalies([]);
    setRawView(next);
  }, []);

  const reviewUnusualRecords = useCallback((anomalies: SmartAnomaly[]) => {
    setReviewAnomalies(anomalies);
    window.scrollTo({ top: 0 });
    setRawView("Timeline");
  }, []);

  const clearUnusualRecordReview = useCallback(() => setReviewAnomalies([]), []);

  const auth = useAuthSession();
  const { authStatus, createLogin, loginID, logout, signIn, token } = auth;
  const toast = useToasts();
  const { dismissToast, showToast, toasts } = toast;

  const appData = useAppData({ token, logout, showToast, changeView });
  const startDemoData = appData.startDemo;
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
    if (appData.isDemo || readToken()) return;
    let cancelled = false;
    void healthCheck().catch((error) => {
      logClientError({ level: "warn", area: "app.health", message: "Health check failed", detail: errorMessage(error, "unknown error") });
      if (!cancelled) showToast("error", "Service is not available", "Please try again in a moment.", healthToastKey);
    });
    return () => {
      cancelled = true;
    };
  }, [appData.isDemo, showToast]);

  const startDemo = useCallback(async () => {
    const healthToast = toasts.find((toast) => toast.key === healthToastKey);
    if (healthToast) dismissToast(healthToast.id);
    await startDemoData?.();
  }, [dismissToast, startDemoData, toasts]);

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

  const exportReport = useCallback(async () => {
    const vehicle = appData.activeVehicle;
    if (!vehicle) return;
    setExportingReport(true);
    try {
      const snapshot = () => downloadJSON(buildVehicleReportSnapshot({
        vehicle,
        settings: appData.settings,
        analytics: appData.vehicleTotals,
        expenses: appData.activeExpenses,
        trips: appData.activeTrips,
      }), reportSnapshotFilename(vehicle.id));

      let usedSnapshot = appData.isDemo;
      if (usedSnapshot) {
        snapshot();
      } else {
        try {
          const exported = await downloadReportExport(token, vehicle.id);
          downloadBlob(exported.blob, exported.filename);
        } catch (error) {
          if (isUnauthorizedError(error)) throw error;
          logClientError({
            level: "warn",
            area: "report.export",
            message: "Server report export unavailable; downloaded app snapshot",
            detail: errorMessage(error, "unknown error"),
          });
          snapshot();
          usedSnapshot = true;
        }
      }
      showToast("success", "Report exported", usedSnapshot
        ? "Your current vehicle snapshot is ready."
        : "Your consolidated JSON report is ready.");
    } catch (error) {
      showToast("error", "Report was not exported", errorMessage(error, "Please try again."));
    } finally {
      setExportingReport(false);
    }
  }, [appData.activeExpenses, appData.activeTrips, appData.activeVehicle, appData.isDemo, appData.settings, appData.vehicleTotals, showToast, token]);

  return {
    activeExpenses: appData.activeExpenses,
    activeTrips: appData.activeTrips,
    activeVehicle: appData.activeVehicle,
    action: mutations.action,
    createLogin,
    startDemo: startDemoData ? startDemo : undefined,
    clearAuthStatus: auth.clearAuthStatus,
    closeLoginNotice: auth.closeLoginNotice,
    copyLoginID,
    expenses: appData.expenses,
    exportReport,
    exportingReport,
    loginID,
    loginNotice: auth.loginNotice,
    isAuthReady: auth.isAuthReady,
    isDemo: appData.isDemo,
    isLoadingData: appData.isLoadingData,
    logout: appData.logoutApp,
    mounted: appData.mounted,
    removeVehicle: mutations.removeVehicle,
    reviewAnomalies,
    reviewUnusualRecords,
    clearUnusualRecordReview,
    removeExpense: mutations.removeExpense,
    saveExpense: mutations.saveExpense,
    toggleExpenseAnalytics: mutations.toggleExpenseAnalytics,
    saveSettings: mutations.saveSettings,
    saveProfileName: mutations.saveProfileName,
    editVehicle: mutations.editVehicle,
    editExpense: mutations.editExpense,
    endVehicleTrip: mutations.endVehicleTrip,
    saveVehicle: mutations.saveVehicle,
    setActiveVehicleID: appData.selectVehicle,
    setView: changeView,
    signIn,
    authAction: auth.authAction,
    authFeedback: auth.authFeedback,
    authStatus,
    status: authStatus || appData.status,
    startVehicleTrip: mutations.startVehicleTrip,
    settings: appData.settings,
    token: appData.isDemo && isLocalDemoEnabled ? demoToken : token,
    toasts,
    userDocuments: appData.userDocuments,
    trips: appData.trips,
    openExpenseFilesID: mutations.openExpenseFilesID,
    setOpenExpenseFilesID: mutations.setOpenExpenseFilesID,
    dismissToast,
    vehicleTotals: appData.vehicleTotals,
    vehicles: appData.vehicles,
    view,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJSON(value: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), filename);
}

export type DriverLogsApp = ReturnType<typeof useDriverLogsApp>;
