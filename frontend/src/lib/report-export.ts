import type { Expense, MoneyTotals, Trip, UserSettings, Vehicle } from "./types";

type VehicleReportSnapshotInput = {
  vehicle: Vehicle;
  settings: UserSettings;
  analytics: MoneyTotals | undefined;
  expenses: Expense[];
  trips: Trip[];
};

// This only serializes values already returned by the API. It deliberately does
// not calculate totals or currency conversions in the browser.
export function buildVehicleReportSnapshot({ vehicle, settings, analytics, expenses, trips }: VehicleReportSnapshotInput) {
  return {
    export_version: "1",
    generated_at: new Date().toISOString(),
    source: "driverlogs_app",
    scope: "selected_vehicle",
    export_mode: "client_snapshot",
    vehicle,
    settings,
    analytics,
    expenses,
    trips,
    documents: vehicle.latest_document ? [vehicle.latest_document] : [],
    expense_attachment_summary: expenses.flatMap((expense) => {
      if (!expense.attachment_count && !expense.latest_attachment) return [];
      return [{
        expense_id: expense.id,
        attachment_count: expense.attachment_count ?? 0,
        latest_attachment: expense.latest_attachment ?? null,
      }];
    }),
  };
}

export function reportSnapshotFilename(vehicleID: string) {
  return `driverlogs-${vehicleID}.json`;
}
