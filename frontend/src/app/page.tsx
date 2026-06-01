"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { LoginIDModal } from "@/components/login-id-modal";
import { LoginView } from "@/components/login-view";
import { GarageView } from "@/components/views/garage-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { TimelineView } from "@/components/views/timeline-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { FuelInsightsView } from "@/components/views/fuel-insights-view";
import { ReportsView } from "@/components/views/reports-view";
import { SettingsView } from "@/components/views/settings-view";
import { useDriverLogsApp } from "@/lib/use-driverlogs-app";
import { ViewSkeleton } from "@/components/ui";
import { ToastCenter } from "@/components/toast-center";
import { softReveal } from "@/lib/theme";

export default function HomePage() {
  const app = useDriverLogsApp();
  const selectVehicleAndOpenDashboard = (id: string) => {
    app.setActiveVehicleID(id);
    app.setView("Dashboard");
  };

  if (!app.isAuthReady) {
    return (
      <>
        <ViewSkeleton />
        <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
      </>
    );
  }

  if (!app.token) {
    return (
      <>
        <LoginView savedLoginID={app.loginID} status={app.authStatus} feedback={app.authFeedback} action={app.authAction} onClearStatus={app.clearAuthStatus} onCreate={app.createLogin} onLogin={app.signIn} />
        <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
      </>
    );
  }

  return (
    <>
      <AppShell view={app.view} userName={app.settings.name} onLogout={app.logout} onViewChange={app.setView}>
        <AnimatePresence mode="wait">
          <motion.div key={app.view} {...softReveal} className="pt-4">
            {app.isLoadingData ? <ViewSkeleton /> : null}
            {!app.isLoadingData && app.view === "Garage" && <GarageView vehicles={app.vehicles} activeVehicleID={app.activeVehicle?.id ?? ""} savingVehicle={app.action === "vehicle"} deletingVehicle={app.action === "delete"} onSelect={selectVehicleAndOpenDashboard} onDelete={app.removeVehicle} onCreate={app.saveVehicle} onUpdate={app.editVehicle} />}
            {!app.isLoadingData && app.view === "Dashboard" && <DashboardView vehicle={app.activeVehicle} expenses={app.activeExpenses} totals={app.vehicleTotals} token={app.token} baseCurrency={app.settings.default_currency} country={app.settings.country} savingExpense={app.action === "expense"} onCreateExpense={app.saveExpense} />}
            {!app.isLoadingData && app.view === "Timeline" && <TimelineView expenses={app.activeExpenses} vehicle={app.activeVehicle} token={app.token} baseCurrency={app.settings.default_currency} country={app.settings.country} savingExpense={app.action === "expense"} onUpdateExpense={app.editExpense} />}
            {!app.isLoadingData && app.view === "Analytics" && <AnalyticsView mounted={app.mounted} vehicle={app.activeVehicle} totals={app.vehicleTotals} />}
            {!app.isLoadingData && app.view === "Fuel Prices" && <FuelInsightsView token={app.token} country={app.settings.country} compareCountry={app.settings.compare_country || "RO"} preferredFuelType={app.activeVehicle?.preferred_fuel_type || "Super 95"} />}
            {!app.isLoadingData && app.view === "Reports" && <ReportsView vehicle={app.activeVehicle} expenses={app.activeExpenses} totals={app.vehicleTotals} />}
            {!app.isLoadingData && app.view === "Settings" && <SettingsView key={`${app.settings.name}-${app.settings.default_currency}-${app.settings.country}-${app.settings.compare_country}-${app.activeVehicle?.id ?? ""}-${app.activeVehicle?.preferred_fuel_type ?? ""}`} settings={app.settings} loginID={app.loginID} vehicles={app.vehicles} activeVehicleID={app.activeVehicle?.id ?? ""} saving={app.action === "settings" || app.action === "vehicle"} onCopyLoginID={app.copyLoginID} onOpenGarage={() => app.setView("Garage")} onSelectVehicle={app.setActiveVehicleID} onSave={app.saveSettings} onUpdateVehicle={app.editVehicle} />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
      {app.loginNotice.isOpen ? <LoginIDModal loginID={app.loginNotice.loginID} needsName={app.loginNotice.needsName} onCopy={app.copyLoginID} onClose={app.closeLoginNotice} onSaveName={app.saveProfileName} /> : null}
    </>
  );
}
