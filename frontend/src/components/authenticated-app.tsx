"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { LoginIDModal } from "@/components/login-id-modal";
import { AnalyticsView } from "@/components/views/analytics-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { FuelInsightsView } from "@/components/views/fuel-insights-view";
import { GarageView } from "@/components/views/garage-view";
import { SettingsView } from "@/components/views/settings-view";
import { TimelineView } from "@/components/views/timeline-view";
import { ViewSkeleton } from "@/components/ui";
import type { DriverLogsApp } from "@/lib/use-driverlogs-app";

type AuthenticatedAppProps = {
  app: DriverLogsApp;
};

export function AuthenticatedApp({ app }: AuthenticatedAppProps) {
  const selectVehicleAndOpenDashboard = (id: string) => {
    app.setActiveVehicleID(id);
    app.setView("Dashboard");
  };

  return (
    <>
      <AppShell
        view={app.view}
        userName={app.settings.name}
        vehicle={app.activeVehicle}
        vehicles={app.vehicles}
        onLogout={app.logout}
        onViewChange={app.setView}
        onSelectVehicle={app.setActiveVehicleID}
      >
        <motion.div key={app.view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }} className="min-h-[calc(100dvh-9rem)] pt-3 sm:pt-4">
          {app.isLoadingData ? <ViewSkeleton /> : null}
          {!app.isLoadingData && app.view === "Garage" && <GarageView token={app.token} vehicles={app.vehicles} activeVehicleID={app.activeVehicle?.id ?? ""} savingVehicle={app.action === "vehicle"} deletingVehicle={app.action === "delete"} onSelect={selectVehicleAndOpenDashboard} onDelete={app.removeVehicle} onCreate={app.saveVehicle} onUpdate={app.editVehicle} />}
          {!app.isLoadingData && app.view === "Dashboard" && <DashboardView vehicle={app.activeVehicle} expenses={app.activeExpenses} userDocuments={app.userDocuments} totals={app.vehicleTotals} token={app.token} baseCurrency={app.settings.default_currency} country={app.settings.country} savingExpense={app.action === "expense"} onCreateExpense={app.saveExpense} />}
          {!app.isLoadingData && app.view === "Timeline" && <TimelineView expenses={app.activeExpenses} vehicle={app.activeVehicle} token={app.token} baseCurrency={app.settings.default_currency} country={app.settings.country} savingExpense={app.action === "expense" || app.action === "delete"} openExpenseFilesID={app.openExpenseFilesID} onOpenExpenseFiles={app.setOpenExpenseFilesID} onDeleteExpense={app.removeExpense} onUpdateExpense={app.editExpense} onToggleAnalytics={app.toggleExpenseAnalytics} />}
          {!app.isLoadingData && app.view === "Analytics" && <AnalyticsView mounted={app.mounted} vehicle={app.activeVehicle} totals={app.vehicleTotals} />}
          {!app.isLoadingData && app.view === "Fuel Prices" && <FuelInsightsView token={app.token} country={app.settings.country} compareCountry={app.settings.compare_country || "RO"} preferredFuelType={app.activeVehicle?.preferred_fuel_type || "Super 95"} />}
          {!app.isLoadingData && app.view === "Settings" && <SettingsView key={`${app.settings.name}-${app.settings.default_currency}-${app.settings.country}-${app.settings.compare_country}-${app.activeVehicle?.id ?? ""}-${app.activeVehicle?.preferred_fuel_type ?? ""}-${app.activeVehicle?.oil_interval_km ?? ""}`} token={app.token} settings={app.settings} loginID={app.loginID} vehicles={app.vehicles} userDocuments={app.userDocuments} activeVehicleID={app.activeVehicle?.id ?? ""} saving={app.action === "settings" || app.action === "vehicle"} onCopyLoginID={app.copyLoginID} onOpenGarage={() => app.setView("Garage")} onSelectVehicle={app.setActiveVehicleID} onSave={app.saveSettings} onUpdateVehicle={app.editVehicle} />}
        </motion.div>
      </AppShell>
      {app.loginNotice.isOpen ? <LoginIDModal loginID={app.loginNotice.loginID} needsName={app.loginNotice.needsName} onCopy={app.copyLoginID} onClose={app.closeLoginNotice} onSaveName={app.saveProfileName} /> : null}
    </>
  );
}
