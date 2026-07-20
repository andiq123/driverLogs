"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { attachmentAccept, fileSize, isAllowedAttachment } from "@/lib/attachments";
import { fuelTypes, gasStationBrands, normalizeFuelType, priceCurrencies } from "@/lib/car-options";
import {
  addYear,
  amountPlaceholder,
  descriptionPlaceholder,
  draftFuelTypeByVehicle,
  expenseDescription,
  fileKey,
  servicePresetOptions,
  serviceTypeKeys,
  toggleServiceTypeKey,
} from "@/lib/expense-form";
import { intValue, km, numberValue, todayDateValue, vehicleName } from "@/lib/format";
import { calmEase } from "@/lib/theme";
import type { Expense, ExpenseCategory, FuelPriceSuggestion, Vehicle } from "@/lib/types";
import { useFuelPriceSuggestions } from "@/lib/use-fuel-price-suggestions";
import { BadgeDollarSign, ChevronDown, CircleGauge, Droplets, FileText, Fuel, Landmark, MapPin, Milestone, Paperclip, Plus, Text, Trash2 } from "lucide-react";
import { Autocomplete } from "./autocomplete";
import { CalendarField } from "./calendar-field";
import { CustomSelect } from "./custom-select";
import { ExpenseCategoryPicker } from "./expense-category-picker";
import { FuelPriceSuggestions } from "./fuel-price-suggestions";
import { ActionButton, Input, Panel } from "./ui";

type ExpenseFormProps = {
  vehicle: Vehicle;
  token: string;
  baseCurrency: string;
  country: string;
  saving?: boolean;
  expense?: Expense;
  odometerSuggestion?: number;
  intentCategory?: ExpenseCategory;
  /** Mobile dashboard: start collapsed behind a single CTA. */
  collapsible?: boolean;
  onCreate?: (expense: Partial<Expense>, files?: File[]) => void;
  onUpdate?: (id: string, expense: Partial<Expense>, files?: File[]) => void;
  onCancel?: () => void;
};

export function ExpenseForm({ vehicle, token, baseCurrency, country, saving, expense, odometerSuggestion, intentCategory, collapsible = false, onCreate, onUpdate, onCancel }: ExpenseFormProps) {
  const isEditing = Boolean(expense);
  const isDesktop = useMinWidth("(min-width: 1280px)");
  const canCollapse = collapsible && !isDesktop && !isEditing;
  const [open, setOpen] = useState(!collapsible || isEditing);
  const [showDetails, setShowDetails] = useState(isEditing);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Fuel");
  const [date, setDate] = useState(expense?.date ?? (isEditing ? "" : todayDateValue()));
  const [fuelType, setFuelType] = useState(() => normalizeFuelType(expense?.fuel_type || draftFuelTypeByVehicle.get(vehicle.id) || vehicle.preferred_fuel_type));
  const [fuelPriceCurrency, setFuelPriceCurrency] = useState(expense?.fuel_price_currency || baseCurrency);
  const [fuelPrice, setFuelPrice] = useState(expense?.fuel_price_per_liter_base ? String(expense.fuel_price_per_liter_base) : "");
  const [fuelPriceEdited, setFuelPriceEdited] = useState(false);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [gasStation, setGasStation] = useState(expense?.category === "Fuel" ? expense.description : "");
  const [serviceType, setServiceType] = useState(expense?.service_type ?? "");
  const [expiresDate, setExpiresDate] = useState(expense?.expires_date ?? "");
  const [odometerValue, setOdometerValue] = useState(() => {
    if (expense?.odometer) return String(expense.odometer);
    if (!isEditing && odometerSuggestion) return String(odometerSuggestion);
    return "";
  });
  const [files, setFiles] = useState<File[]>([]);
  const [fileMessage, setFileMessage] = useState("");
  const fuelSuggestion = useFuelPriceSuggestions({ category, country, fuelType, token });
  const needsOdometer = category === "Maintenance";
  const showFuelTypeInEssentials = !vehicle.preferred_fuel_type || isEditing;

  useEffect(() => {
    if (!intentCategory || isEditing) return;
    setCategory(intentCategory);
    if (collapsible) setOpen(true);
  }, [intentCategory, isEditing, collapsible]);

  useEffect(() => {
    if (isDesktop && collapsible) setOpen(true);
  }, [isDesktop, collapsible]);

  useEffect(() => {
    if (category !== "Fuel" || fuelPriceEdited) return;
    if (fuelSuggestion.fuelType !== normalizeFuelType(fuelType)) return;
    const reference = fuelSuggestion.suggestions.find((suggestion) => suggestion.fuel_type === fuelType);
    if (!reference) return;
    setFuelPriceCurrency(reference.currency);
    setFuelPrice(String(reference.price));
  }, [category, fuelPriceEdited, fuelSuggestion.fuelType, fuelSuggestion.suggestions, fuelType]);

  useEffect(() => {
    if ((category === "Insurance" || category === "Inspection") && date && !expiresDate) {
      setExpiresDate(addYear(date));
    }
  }, [category, date, expiresDate]);

  function resetCreateForm() {
    setCategory("Fuel");
    setDate(todayDateValue());
    const defaultFuelType = normalizeFuelType(vehicle.preferred_fuel_type);
    draftFuelTypeByVehicle.set(vehicle.id, defaultFuelType);
    setFuelType(defaultFuelType);
    setFuelPriceCurrency(baseCurrency);
    setFuelPrice("");
    setFuelPriceEdited(false);
    setDescription("");
    setGasStation("");
    setServiceType("");
    setExpiresDate("");
    setOdometerValue(odometerSuggestion ? String(odometerSuggestion) : "");
    setFiles([]);
    setFileMessage("");
    setShowDetails(false);
    if (canCollapse) setOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      vehicle_id: vehicle.id,
      category: String(form.get("category")) as ExpenseCategory,
      amount_base: numberValue(form.get("amount_base")),
      base_currency: String(form.get("base_currency") ?? baseCurrency),
      fuel_liters: numberValue(form.get("fuel_liters")),
      fuel_price_per_liter_base: numberValue(form.get("fuel_price_per_liter_base")),
      fuel_price_currency: String(form.get("fuel_price_currency") ?? baseCurrency),
      fuel_type: String(form.get("fuel_type") ?? fuelType).trim(),
      odometer: intValue(form.get("odometer")),
      service_type: String(form.get("service_type") ?? "").trim(),
      expires_date: String(form.get("expires_date") ?? "").trim(),
      date: String(form.get("date") ?? date),
      description: expenseDescription(category, String(form.get("description") ?? ""), gasStation),
      exclude_from_analytics: expense?.exclude_from_analytics ?? false,
    };
    if (expense) onUpdate?.(expense.id, payload, files);
    else onCreate?.(payload, files);
    if (expense) return;
    event.currentTarget.reset();
    resetCreateForm();
  }

  function applyFuelSuggestion(suggestion: FuelPriceSuggestion) {
    setFuelPriceCurrency(suggestion.currency);
    setFuelPrice(String(suggestion.price));
    setFuelPriceEdited(false);
  }

  function changeFuelType(nextFuelType: string) {
    const normalizedFuelType = normalizeFuelType(nextFuelType);
    draftFuelTypeByVehicle.set(vehicle.id, normalizedFuelType);
    setFuelType(normalizedFuelType);
    setFuelPrice("");
    setFuelPriceCurrency(baseCurrency);
    setFuelPriceEdited(false);
  }

  function changeCategory(nextCategory: ExpenseCategory) {
    setCategory(nextCategory);
    if (nextCategory !== "Maintenance") setServiceType("");
    if (nextCategory === "Fuel" && !odometerValue && odometerSuggestion) {
      setOdometerValue(String(odometerSuggestion));
    }
  }

  if (canCollapse && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-[22px] bg-[#151712] text-sm font-bold text-white shadow-[0_12px_30px_rgba(21,23,18,0.16)] transition-[transform,opacity] duration-300 active:scale-[0.985]"
      >
        <Plus size={18} />
        Log expense
      </button>
    );
  }

  return (
    <Panel
      title={isEditing ? "Edit expense" : "Log expense"}
      eyebrow={vehicleName(vehicle)}
      action={
        canCollapse ? (
          <button type="button" aria-label="Collapse form" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-[14px] bg-[#eef3e8] text-[#62685e] transition-colors hover:text-[#151712]">
            <ChevronDown size={18} className="rotate-180" />
          </button>
        ) : undefined
      }
    >
      <form onSubmit={submit} className="grid gap-3">
        <ExpenseCategoryPicker name="category" value={category} onChange={changeCategory} />
        <Input name="amount_base" label={`Amount ${baseCurrency}`} icon={BadgeDollarSign} inputMode="decimal" defaultValue={expense?.amount_base || ""} placeholder={amountPlaceholder(category, baseCurrency)} required />
        <input type="hidden" name="base_currency" value={expense?.base_currency || baseCurrency} />
        <input type="hidden" name="fuel_type" value={fuelType} />

        <AnimatePresence initial={false} mode="popLayout">
          {category === "Fuel" ? (
            <motion.div key="fuel-fields" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: calmEase }} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input name="fuel_liters" label="Liters" icon={Droplets} inputMode="decimal" defaultValue={expense?.fuel_liters || ""} placeholder="Liters" />
                <Input name="fuel_price_per_liter_base" label="Price / L" icon={CircleGauge} inputMode="decimal" value={fuelPrice} onChange={(event) => { setFuelPrice(event.currentTarget.value); setFuelPriceEdited(true); }} placeholder="Price / L" />
              </div>
              {showFuelTypeInEssentials ? (
                <CustomSelect name="fuel_type_visible" label="Fuel type" icon={Fuel} options={fuelTypes} value={fuelType} onChange={changeFuelType} />
              ) : (
                <p className="px-1 text-xs font-semibold text-[#62685e]">{fuelType} · autofilled from this car</p>
              )}
              <FuelPriceSuggestions suggestions={fuelSuggestion.suggestions} status={fuelSuggestion.status} onSelect={applyFuelSuggestion} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {category === "Maintenance" ? (
            <motion.div key="maintenance-presets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: calmEase }} className="grid gap-3">
              <input type="hidden" name="service_type" value={serviceType} />
              <ServicePresets value={serviceType} onChange={setServiceType} />
              <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" min={vehicle.odometer || undefined} required value={odometerValue} onChange={(event) => setOdometerValue(event.currentTarget.value)} placeholder={`Minimum ${vehicle.odometer || 0} km`} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {(category === "Insurance" || category === "Inspection") ? (
            <motion.div key="expiry-field" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: calmEase }}>
              <CalendarField name="expires_date" label="Expires" value={expiresDate} placeholder="Expiry date" onChange={setExpiresDate} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <CalendarField name="date" label="Date" value={date} placeholder="Choose date" onChange={setDate} />

        {!needsOdometer && !showDetails ? <input type="hidden" name="odometer" value={odometerValue} /> : null}
        {!showDetails || category !== "Fuel" ? <input type="hidden" name="fuel_price_currency" value={fuelPriceCurrency} /> : null}

        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="flex h-10 items-center justify-between rounded-[16px] bg-[#f1f4ec] px-3 text-xs font-bold text-[#62685e] transition-colors hover:text-[#151712]"
        >
          <span>{showDetails ? "Hide optional details" : "Note, receipt, station…"}</span>
          <ChevronDown size={16} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {showDetails ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: calmEase }}
              className="grid gap-3 overflow-hidden"
            >
              {category === "Fuel" ? (
                <>
                  {!showFuelTypeInEssentials ? <CustomSelect name="fuel_type_detail" label="Fuel type" icon={Fuel} options={fuelTypes} value={fuelType} onChange={changeFuelType} /> : null}
                  <CustomSelect name="fuel_price_currency" label="Currency" icon={Landmark} options={priceCurrencies} value={fuelPriceCurrency} onChange={setFuelPriceCurrency} />
                  <Autocomplete name="gas_station" label="Gas station" icon={MapPin} options={gasStationBrands} value={gasStation} onChange={setGasStation} />
                </>
              ) : null}
              {!needsOdometer ? (
                <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" value={odometerValue} onChange={(event) => setOdometerValue(event.currentTarget.value)} placeholder="Odometer, km" />
              ) : null}
              <Input name="description" label="Description" icon={Text} value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder={descriptionPlaceholder(category)} />
              <ExpenseFilePicker files={files} message={fileMessage} onFilesChange={(nextFiles, nextMessage) => { setFiles(nextFiles); setFileMessage(nextMessage); }} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <ActionButton loading={saving} className="mt-1">{isEditing ? "Save changes" : "Save expense"}</ActionButton>
          {isEditing && onCancel ? <ActionButton type="button" variant="soft" onClick={onCancel} className="mt-1 px-5">Cancel</ActionButton> : null}
        </div>
      </form>
    </Panel>
  );
}

function ExpenseFilePicker({ files, message, onFilesChange }: { files: File[]; message: string; onFilesChange: (files: File[], message: string) => void }) {
  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const accepted = Array.from(fileList).filter(isAllowedAttachment);
    const rejected = fileList.length - accepted.length;
    const unique = [...files, ...accepted].filter((file, index, all) => all.findIndex((item) => fileKey(item) === fileKey(file)) === index);
    onFilesChange(unique, rejected ? "Only PDF or image files are supported." : "");
  }

  function removeFile(file: File) {
    onFilesChange(files.filter((item) => fileKey(item) !== fileKey(file)), "");
  }

  return (
    <section className="rounded-[18px] border border-black/[0.055] bg-[#f7faf3] p-2.5">
      <label className="flex min-h-12 cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-[16px] bg-white px-3 text-sm font-bold text-[#151712] ring-1 ring-black/[0.04] transition-[background-color,transform] duration-300 active:scale-[0.985] hover:bg-[#fffffb]">
        <span className="flex min-w-0 items-center gap-2 truncate"><Paperclip size={17} className="shrink-0" />Attach receipt</span>
        <span className="text-xs text-[#62685e]">{files.length ? `${files.length}` : "Optional"}</span>
        <input className="hidden" type="file" multiple accept={attachmentAccept} onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
      {message ? <p className="mt-2 rounded-[14px] bg-[#fff0ec] px-3 py-2 text-xs font-semibold text-[#9b3226]">{message}</p> : null}
      {files.length ? (
        <div className="mt-2 grid gap-1.5">
          {files.map((file) => (
            <div key={fileKey(file)} className="flex min-w-0 items-center gap-2 rounded-[14px] bg-white px-2 py-2 ring-1 ring-black/[0.04]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[12px] bg-[#edf4e7]"><FileText size={15} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{file.name}</span>
                <span className="block text-[11px] text-[#6b7065]">{fileSize(file.size)}</span>
              </span>
              <button type="button" onClick={() => removeFile(file)} className="flex size-8 shrink-0 items-center justify-center rounded-[12px] text-[#9b3226] transition-colors hover:bg-[#fff0ec]" aria-label={`Remove ${file.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ServicePresets({ value, onChange }: { value: string; onChange: (serviceType: string) => void }) {
  const selected = serviceTypeKeys(value);
  return (
    <div className="flex flex-wrap gap-2">
      {servicePresetOptions.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button key={option.value} type="button" aria-pressed={active} onClick={() => onChange(toggleServiceTypeKey(value, option.value))} className={`h-9 touch-manipulation rounded-full px-3 text-xs font-bold transition-[background-color,color,transform] duration-200 active:scale-[0.985] ${active ? "bg-[#151712] text-white" : "bg-[#eef3e8] text-[#62685e] hover:text-[#151712]"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function useMinWidth(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
