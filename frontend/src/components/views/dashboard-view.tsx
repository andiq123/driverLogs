import { FileText, Car, Loader2, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage, getExpenseAttachmentPreview, getUserDocumentPreview, getVehicleDocumentPreview } from "@/lib/api";
import type { DocumentAttachment, Expense, ExpenseAttachment, ExpenseCategory, MoneyTotals, SmartReminder, Vehicle } from "@/lib/types";
import { equivalents, km, money, vehicleName } from "@/lib/format";
import { Badge, EmptyState, Metric } from "../ui";
import { ExpenseForm } from "../forms";
import { SmartInsightsPanel } from "../smart-insights";

export function DashboardView({ vehicle, expenses, userDocuments, totals, token, baseCurrency, country, savingExpense, onCreateExpense }: { vehicle?: Vehicle; expenses: Expense[]; userDocuments: DocumentAttachment[]; totals: MoneyTotals; token: string; baseCurrency: string; country: string; savingExpense?: boolean; onCreateExpense: (expense: Partial<Expense>) => void }) {
  const [intentCategory, setIntentCategory] = useState<ExpenseCategory>();
  const [preview, setPreview] = useState<DocumentPreview>();
  if (!vehicle) {
    return <section className="rounded-[28px] bg-[#151712] p-6 text-white sm:p-8"><EmptyState icon={Car} title="Start with the garage" body="Add a vehicle before logging expenses or viewing dashboard metrics." dark /></section>;
  }

  return (
    <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.78fr)] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid content-start gap-3 sm:gap-4">
        <section className="relative overflow-hidden rounded-[24px] bg-[#151712] p-4 text-white shadow-[0_22px_72px_rgba(21,23,18,0.22)] sm:min-h-[24rem] sm:rounded-[28px] sm:p-6 xl:min-h-[21rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(223,231,212,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-[#dfe7d4]/12 blur-2xl" />
          <div className="relative flex flex-wrap gap-1.5 sm:gap-2">
            <Badge>{vehicle.plate_number}</Badge>
            {vehicle.engine_type ? <Badge>{vehicle.engine_type}</Badge> : null}
            {vehicle.year ? <Badge>{vehicle.year}</Badge> : null}
          </div>
          <h2 className="relative mt-4 text-[30px] font-semibold leading-none tracking-tight sm:mt-6 sm:text-5xl">{vehicleName(vehicle)}</h2>
          <p className="relative mt-2 hidden max-w-xl text-sm leading-6 text-white/68 sm:block">Smart estimates use only records created for this car.</p>
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3 xl:max-w-3xl">
            <Metric label="Lifetime" value={money(totals.total_expenses_mdl)} sub={equivalents(totals.total_expenses_eur, totals.total_expenses_usd)} />
            <Metric label="Odometer" value={km(vehicle.odometer ?? 0)} sub="Current reading" />
            <Metric label="Cost/km" value={totals.cost_per_km_mdl ? `${totals.cost_per_km_mdl} MDL` : "Learning"} sub={`${totals.expense_count} entries`} />
          </div>
        </section>
        <SmartReminderBar reminders={totals.insights.reminders ?? []} onSelect={setIntentCategory} />
        <DocumentShortcuts token={token} vehicle={vehicle} expenses={expenses} userDocuments={userDocuments} onOpen={setPreview} />
        <SmartInsightsPanel insights={totals.insights} />
      </div>
      <ExpenseForm key={vehicle.id} vehicle={vehicle} token={token} baseCurrency={baseCurrency} country={country} saving={savingExpense} odometerSuggestion={odometerSuggestion(vehicle, expenses)} intentCategory={intentCategory} onCreate={onCreateExpense} />
      {preview ? <DocumentPreviewModal preview={preview} onClose={() => setPreview(undefined)} /> : null}
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
    insurance?.latest_attachment ? expenseDocumentShortcut(token, "Insurance PDF", insurance, insurance.latest_attachment) : undefined,
    inspection?.latest_attachment ? expenseDocumentShortcut(token, "ITP PDF", inspection, inspection.latest_attachment) : undefined,
    driverLicense ? { label: "Driver license", fileName: driverLicense.file_name, load: () => getUserDocumentPreview(token, driverLicense.id) } : undefined,
    vehicle.id && carPassport ? { label: "Car passport", fileName: carPassport.file_name, load: () => getVehicleDocumentPreview(token, vehicle.id, carPassport.id) } : undefined,
  ].filter(Boolean) as DocumentShortcut[];
  if (!items.length) return null;
  return (
    <section className="flex snap-x gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <button key={`${item.label}-${item.fileName}`} type="button" onClick={() => onOpen({ title: item.label, fileName: item.fileName, load: item.load })} className="flex min-w-44 snap-start items-center gap-2 rounded-[18px] border border-black/[0.055] bg-[#fffffb]/94 px-3 py-2 text-left shadow-[0_8px_24px_rgba(31,41,28,0.055)] ring-1 ring-white/70 transition-[background-color,transform] duration-300 active:scale-[0.985] hover:bg-[#f7faf3]">
          <span className="flex size-9 items-center justify-center rounded-[14px] bg-[#edf4e7]"><FileText size={16} /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{item.label}</span>
            <span className="block truncate text-xs text-[#6b7065]">{item.fileName}</span>
          </span>
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

function DocumentPreviewModal({ preview, onClose }: { preview: DocumentPreview; onClose: () => void }) {
  const [url, setURL] = useState("");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Loading PDF...");

  useEffect(() => {
    let active = true;
    let objectURL = "";
    void preview.load()
      .then((blob) => {
        if (!active) return;
        objectURL = URL.createObjectURL(blob);
        setURL(objectURL);
        setStatus("");
      })
      .catch((error) => setStatus(errorMessage(error, "Could not open PDF.")));
    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [preview]);

  return (
    <div className="fixed inset-0 z-50 grid bg-[#151712]/45 p-2 backdrop-blur-sm sm:p-5">
      <section className="m-auto flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#fbfcf8] shadow-[0_28px_90px_rgba(21,23,18,0.28)] ring-1 ring-black/10">
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{preview.title}</p>
            <p className="truncate text-xs text-[#6b7065]">{preview.fileName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))} className="flex size-9 items-center justify-center rounded-[13px] bg-[#edf4e7]" aria-label="Zoom out"><Minus size={16} /></button>
            <span className="min-w-12 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(2))))} className="flex size-9 items-center justify-center rounded-[13px] bg-[#edf4e7]" aria-label="Zoom in"><Plus size={16} /></button>
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-[13px] bg-[#151712] text-white" aria-label="Close preview"><X size={16} /></button>
          </div>
        </div>
        {status ? <div className="grid flex-1 place-items-center text-sm font-semibold text-[#6b7065]">{status === "Loading PDF..." ? <span className="flex items-center gap-2"><Loader2 size={17} className="animate-spin" />{status}</span> : status}</div> : null}
        {url ? (
          <div className="flex-1 overflow-auto bg-[#eef3e8]">
            <iframe src={url} title={preview.title} style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%`, minHeight: "100%" }} className="origin-top-left bg-white" />
          </div>
        ) : null}
      </section>
    </div>
  );
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
  return (
    <section className="flex snap-x gap-2 overflow-x-auto pb-1">
      {reminders.map((reminder, index) => (
        <button key={`${reminder.title}-${index}`} type="button" onClick={() => onSelect(reminder.category)} className={`min-w-48 snap-start rounded-[18px] border px-3 py-2 text-left shadow-[0_8px_24px_rgba(31,41,28,0.06)] transition-transform active:scale-[0.985] ${reminder.kind === "expired" ? "border-[#f0b2a8] bg-[#fff0ec] text-[#8b2d20]" : "border-[#efd282] bg-[#fff8df] text-[#7b5a12]"}`}>
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em]">{reminder.kind === "expired" ? "Due now" : "Upcoming"}</span>
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
