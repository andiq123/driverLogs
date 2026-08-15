import { ChevronRight, FileText, Car } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { getExpenseAttachmentPreview, getUserDocumentPreview, getVehicleDocumentPreview } from "@/lib/api";
import type { DocumentAttachment, Expense, ExpenseAttachment, ExpenseCategory, MoneyTotals, SmartAnomaly, SmartReminder, Trip, Vehicle } from "@/lib/types";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { Badge, EmptyState, Metric } from "../ui";
import { ExpenseForm } from "../expense-form";
import { SmartInsightsPanel } from "../smart-insights";
import { FilePreviewModal } from "../file-preview-modal";
import { TripCard } from "../trip-card";

export function DashboardView({ vehicle, expenses, trips, userDocuments, totals, token, baseCurrency, country, savingExpense, savingTrip, isDemo, onCreateExpense, onStartTrip, onEndTrip, onReviewUnusualRecords }: { vehicle?: Vehicle; expenses: Expense[]; trips: Trip[]; userDocuments: DocumentAttachment[]; totals: MoneyTotals; token: string; baseCurrency: string; country: string; savingExpense?: boolean; savingTrip?: boolean; isDemo?: boolean; onCreateExpense: (expense: Partial<Expense>, files?: File[]) => void; onStartTrip: (vehicleID: string, name?: string, startOdometer?: number) => void; onEndTrip: (tripID: string, endOdometer?: number) => void; onReviewUnusualRecords: (anomalies: SmartAnomaly[]) => void }) {
  const [expenseIntent, setExpenseIntent] = useState<{ category?: ExpenseCategory; key: number }>({ key: 0 });
  const [preview, setPreview] = useState<DocumentPreview>();
  if (!vehicle) {
    return <section className="rounded-[28px] bg-[#151712] p-6 text-white sm:p-8"><EmptyState icon={Car} title="Start with the garage" body="Add a vehicle before logging expenses or viewing dashboard metrics. Use the vehicle chip in the header." dark /></section>;
  }
  const activeTrip = trips.find((trip) => !trip.ended_at);
  const tripCard = <TripCard vehicle={vehicle} trips={trips} busy={savingTrip} isDemo={isDemo} onStart={onStartTrip} onEnd={onEndTrip} />;

  const widgets = (
    <>
      <SmartReminderBar reminders={totals.insights.reminders ?? []} onSelect={(category) => setExpenseIntent((intent) => ({ category, key: intent.key + 1 }))} />
      <DocumentShortcuts token={token} vehicle={vehicle} expenses={expenses} userDocuments={userDocuments} onOpen={setPreview} />
      <SmartInsightsPanel insights={totals.insights} onReviewAnomalies={onReviewUnusualRecords} />
    </>
  );

  return (
    <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid content-start gap-3 sm:gap-4">
        {activeTrip ? tripCard : null}
        <motion.section layout className={`relative overflow-hidden rounded-[24px] p-4 text-white shadow-[0_8px_24px_rgba(21,23,18,0.10)] transition-colors duration-500 sm:rounded-[28px] sm:p-6 ${activeTrip ? "bg-[#17251c] ring-1 ring-[#8fb488]/20" : "bg-[#151712]"}`}>
          <div className={`pointer-events-none absolute inset-0 ${activeTrip ? "bg-[radial-gradient(110%_130%_at_88%_-10%,rgba(164,209,151,0.16),transparent_58%)]" : "bg-[radial-gradient(120%_120%_at_88%_-10%,rgba(255,255,255,0.06),transparent_55%)]"}`} />
          <div className="relative flex flex-wrap gap-1.5 sm:gap-2">
            <Badge>{vehicle.plate_number}</Badge>
            {vehicle.engine_type ? <Badge>{vehicle.engine_type}</Badge> : null}
            {vehicle.year ? <Badge>{vehicle.year}</Badge> : null}
            {activeTrip ? <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#b9e2a9]/20 bg-[#b9e2a9]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#d4efca]"><motion.span className="size-1.5 rounded-full bg-[#b9e2a9]" animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 2, repeat: Infinity }} />Trip mode</motion.span> : null}
          </div>
          <h2 className="relative mt-4 text-[30px] font-semibold leading-none tracking-tight sm:mt-5 sm:text-4xl xl:text-5xl">{vehicleName(vehicle)}</h2>
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
            <Metric label="Lifetime" value={money(totals.total_expenses_mdl)} sub={equivalents(totals.total_expenses_eur, totals.total_expenses_usd)} />
            <Metric label="Odometer" value={km(vehicle.odometer ?? 0)} sub="Current reading" />
            <Metric label="Cost/km" value={totals.cost_per_km_mdl ? `${totals.cost_per_km_mdl} MDL` : "Learning"} sub={`${totals.expense_count} entries`} />
          </div>
        </motion.section>

        {!activeTrip ? tripCard : null}

        {/* Desktop: compact summaries between hero and the expense column */}
        <div className="hidden content-start gap-3 xl:grid sm:gap-4">{widgets}</div>
      </div>

      <div className="grid content-start gap-3 sm:gap-4">
        <ExpenseForm
          key={`${vehicle.id}-${expenseIntent.key}`}
          vehicle={vehicle}
          token={token}
          baseCurrency={baseCurrency}
          country={country}
          saving={savingExpense}
          odometerSuggestion={odometerSuggestion(vehicle, expenses)}
          intentCategory={expenseIntent.category}
          activeTrip={activeTrip}
          collapsible
          onCreate={onCreateExpense}
        />
        {/* Mobile: summaries after the log CTA so the first screen stays calm */}
        <div className="grid content-start gap-3 xl:hidden sm:gap-4">{widgets}</div>
      </div>

      {preview ? <FilePreviewModal title={preview.title} fileName={preview.fileName} load={preview.load} onClose={() => setPreview(undefined)} /> : null}
    </div>
  );
}

type DocumentPreview = {
  title: string;
  fileName: string;
  load: () => Promise<Blob>;
};

function DocumentShortcuts({ token, vehicle, expenses, userDocuments, onOpen }: { token: string; vehicle: Vehicle; expenses: Expense[]; userDocuments: DocumentAttachment[]; onOpen: (preview: DocumentPreview) => void }) {
  const insurance = latestCategoryExpense(expenses, "Insurance");
  const inspection = latestCategoryExpense(expenses, "Inspection");
  const driverLicense = userDocuments.find((document) => document.kind === "driver_license");
  const carPassport = vehicle.latest_document?.kind === "car_passport" ? vehicle.latest_document : undefined;
  const items = [
    insurance?.latest_attachment ? expenseDocumentShortcut(token, "Insurance file", insurance, insurance.latest_attachment) : undefined,
    inspection?.latest_attachment ? expenseDocumentShortcut(token, "ITP file", inspection, inspection.latest_attachment) : undefined,
    driverLicense ? { label: "Driver license", fileName: driverLicense.file_name, load: () => getUserDocumentPreview(token, driverLicense.id) } : undefined,
    vehicle.id && carPassport ? { label: "Car passport", fileName: carPassport.file_name, load: () => getVehicleDocumentPreview(token, vehicle.id, carPassport.id) } : undefined,
  ].filter(Boolean) as DocumentShortcut[];
  if (!items.length) return null;
  return (
    <section className="flex snap-x gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <button key={`${item.label}-${item.fileName}`} type="button" onClick={() => onOpen({ title: item.label, fileName: item.fileName, load: item.load })} className="flex min-w-40 snap-start items-center gap-2 rounded-[16px] border border-black/[0.055] bg-[#fffffb]/94 px-3 py-2 text-left shadow-[0_6px_18px_rgba(31,41,28,0.04)] ring-1 ring-white/70 transition-[background-color,transform] duration-300 active:scale-[0.985] hover:bg-[#f7faf3]">
          <span className="flex size-8 items-center justify-center rounded-[12px] bg-[#edf4e7]"><FileText size={15} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{item.label}</span>
            <span className="block truncate text-[11px] text-[#6b7065]">{item.fileName}</span>
          </span>
          <ChevronRight size={14} className="shrink-0 text-[#9aa193]" />
        </button>
      ))}
    </section>
  );
}

type DocumentShortcut = {
  label: string;
  fileName: string;
  load: () => Promise<Blob>;
};

function expenseDocumentShortcut(token: string, label: string, expense: Expense, attachment: ExpenseAttachment): DocumentShortcut {
  return {
    label,
    fileName: attachment.file_name,
    load: () => getExpenseAttachmentPreview(token, expense.id, attachment.id),
  };
}

function latestCategoryExpense(expenses: Expense[], category: ExpenseCategory) {
  return expenses.filter((expense) => expense.category === category && expense.latest_attachment).sort((a, b) => {
    const aDate = a.expires_date || a.date;
    const bDate = b.expires_date || b.date;
    return bDate.localeCompare(aDate);
  })[0];
}

function SmartReminderBar({ reminders, onSelect }: { reminders: SmartReminder[]; onSelect: (category: ExpenseCategory) => void }) {
  if (!reminders.length) return null;
  const orderedReminders = [...reminders].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "expired" ? -1 : 1;
    if (left.date || right.date) return (left.date ?? "9999-12-31").localeCompare(right.date ?? "9999-12-31");
    return (left.odometer ?? Number.MAX_SAFE_INTEGER) - (right.odometer ?? Number.MAX_SAFE_INTEGER);
  });
  return (
    <section className="flex snap-x gap-2 overflow-x-auto pb-1">
      {orderedReminders.slice(0, 4).map((reminder, index) => (
        <button key={`${reminder.title}-${index}`} type="button" onClick={() => onSelect(reminder.category)} className={`min-w-44 snap-start rounded-[16px] border px-3 py-2 text-left transition-transform active:scale-[0.985] ${reminder.kind === "expired" ? "border-[#f0b2a8] bg-[#fff0ec] text-[#8b2d20]" : "border-[#efd282] bg-[#fff8df] text-[#7b5a12]"}`}>
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em]">{reminder.kind === "expired" ? "Due now" : "Upcoming"}</span>
          <span className="mt-0.5 block text-sm font-bold">{reminder.title}</span>
          <span className="mt-0.5 block text-xs opacity-75">{reminder.date ?? (reminder.odometer ? km(reminder.odometer) : "Tap to log")}</span>
        </button>
      ))}
    </section>
  );
}

function odometerSuggestion(vehicle: Vehicle, expenses: Expense[]) {
  const readings = expenses.map((expense) => expense.odometer || 0).filter(Boolean);
  return Math.max(vehicle.odometer || 0, ...readings);
}
