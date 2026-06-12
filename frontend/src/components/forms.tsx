"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { decodeVIN, getVehicleMakes, getVehicleModels } from "@/lib/api";
import { engineOptions, fuelTypes, gasStationBrands, normalizeFuelType, oilIntervalForVehicle, priceCurrencies } from "@/lib/car-options";
import { attachmentAccept, fileSize, isAllowedAttachment } from "@/lib/attachments";
import type { Expense, ExpenseCategory, FuelPriceSuggestion, Vehicle, VinDecode } from "@/lib/types";
import { intValue, km, numberValue, vehicleName } from "@/lib/format";
import { Autocomplete } from "./autocomplete";
import { CalendarField } from "./calendar-field";
import { CustomSelect } from "./custom-select";
import { ExpenseCategoryPicker } from "./expense-category-picker";
import { FuelPriceSuggestions } from "./fuel-price-suggestions";
import { ActionButton, Input, Panel } from "./ui";
import { BadgeCheck, BadgeDollarSign, CalendarDays, CarFront, CircleGauge, Droplets, FileText, Fuel, Hash, Landmark, MapPin, Milestone, Paperclip, ScanLine, Text, Trash2, Wrench } from "lucide-react";
import { useFuelPriceSuggestions } from "@/lib/use-fuel-price-suggestions";
import { calmEase } from "@/lib/theme";

export function VehicleForm({ vehicle, saving, onCancel, onCreate, onUpdate }: { vehicle?: Vehicle; saving?: boolean; onCancel?: () => void; onCreate?: (vehicle: Partial<Vehicle>) => void; onUpdate?: (id: string, vehicle: Partial<Vehicle>) => void }) {
  const [vinValue, setVinValue] = useState(vehicle?.vin ?? "");
  const [makeValue, setMakeValue] = useState(vehicle?.make ?? "");
  const [modelValue, setModelValue] = useState(vehicle?.model ?? "");
  const [yearValue, setYearValue] = useState(vehicle?.year ? String(vehicle.year) : "");
  const [engineValue, setEngineValue] = useState(vehicle?.engine_type ?? "");
  const [purchaseCurrency, setPurchaseCurrency] = useState(vehicle?.purchase_currency || "MDL");
  const [preferredFuelType, setPreferredFuelType] = useState(normalizeFuelType(vehicle?.preferred_fuel_type));
  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [vinDecode, setVinDecode] = useState<VinDecode>();
  const [vinStatus, setVinStatus] = useState("");
  const [decodingVIN, setDecodingVIN] = useState(false);
  const [autofilled, setAutofilled] = useState<Record<string, boolean>>({});
  const isEditing = Boolean(vehicle);

  useEffect(() => {
    let cancelled = false;
    void getVehicleMakes()
      .then((makes) => {
        if (!cancelled) setMakeOptions(makes);
      })
      .catch(() => {
        if (!cancelled) setMakeOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const make = makeValue.trim();
    if (make.length < 2) {
      return;
    }
    let cancelled = false;
    void getVehicleModels(make)
      .then((models) => {
        if (!cancelled) setModelOptions(models);
      })
      .catch(() => {
        if (!cancelled) setModelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [makeValue]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      plate_number: String(form.get("plate_number") ?? "").trim(),
      nickname: String(form.get("nickname") ?? "").trim(),
      vin: String(form.get("vin") ?? "").trim().toUpperCase(),
      preferred_fuel_type: String(form.get("preferred_fuel_type") ?? "Super 95"),
      make: String(form.get("make") ?? "").trim(),
      model: String(form.get("model") ?? "").trim(),
      year: intValue(form.get("year")),
      engine_type: String(form.get("engine_type") ?? "").trim(),
      odometer: intValue(form.get("odometer")),
      purchase_price: numberValue(form.get("purchase_price")),
      purchase_currency: String(form.get("purchase_currency") ?? "MDL"),
    };
    const payloadWithInterval = {
      ...payload,
      oil_interval_km: vehicle?.oil_interval_km || oilIntervalForVehicle(payload.preferred_fuel_type, payload.engine_type),
    };
    if (vehicle) onUpdate?.(vehicle.id, payloadWithInterval);
    else onCreate?.(payloadWithInterval);
    if (vehicle) return;
    event.currentTarget.reset();
    setMakeValue("");
    setModelValue("");
    setYearValue("");
    setEngineValue("");
    setVinValue("");
    setVinDecode(undefined);
    setVinStatus("");
    setAutofilled({});
    setPurchaseCurrency("MDL");
    setPreferredFuelType("Super 95");
    setModelOptions([]);
  }

  function changeMake(value: string) {
    clearAutofill("make");
    setMakeValue(value);
    setModelValue("");
    clearAutofill("model");
    if (value.trim().length < 2) {
      setModelOptions([]);
    }
  }

  function clearAutofill(field: string) {
    setAutofilled((current) => ({ ...current, [field]: false }));
  }

  async function lookupVIN() {
    const vin = vinValue.trim().toUpperCase();
    if (vin.length !== 17) {
      setVinStatus("VIN must be 17 characters.");
      return;
    }
    setDecodingVIN(true);
    setVinStatus("Decoding VIN...");
    try {
      const decoded = await decodeVIN(vin);
      setVinDecode(decoded);
      setMakeValue(decoded.make ?? "");
      setModelValue(decoded.model ?? "");
      setYearValue(decoded.model_year ? String(decoded.model_year) : "");
      setEngineValue(engineFromVIN(decoded));
      setVinValue(decoded.vin || vin);
      setAutofilled({
        vin: Boolean(decoded.vin),
        make: Boolean(decoded.make),
        model: Boolean(decoded.model),
        year: Boolean(decoded.model_year),
        engine: Boolean(engineFromVIN(decoded)),
      });
      setVinStatus(decoded.decoded_clean ? "VIN decoded. Review before saving." : "VIN decoded with warnings. Review before saving.");
    } catch {
      setVinStatus("VIN could not be decoded right now.");
    } finally {
      setDecodingVIN(false);
    }
  }

  return (
    <Panel title={isEditing ? "Edit vehicle" : "Add vehicle"} eyebrow="Required: plate">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px]">
          <Input name="vin" label="VIN" icon={ScanLine} value={vinValue} maxLength={17} isAutofilled={autofilled.vin} onChange={(event) => { clearAutofill("vin"); setVinValue(event.currentTarget.value.toUpperCase()); setVinStatus(""); }} />
          <ActionButton type="button" icon={ScanLine} loading={decodingVIN} onClick={lookupVIN} className="self-end" variant="soft">Decode</ActionButton>
        </div>
        {vinStatus ? <p className="rounded-[18px] bg-[#eef3e8] px-3 py-2 text-xs font-semibold text-[#62685e]">{vinStatus}</p> : null}
        {vinDecode ? <VinDecodeSummary decoded={vinDecode} /> : null}
        <Input name="plate_number" label="License plate" icon={Hash} required defaultValue={vehicle?.plate_number ?? ""} />
        <Input name="nickname" label="Nickname" icon={Text} defaultValue={vehicle?.nickname ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Autocomplete name="make" label="Make" icon={CarFront} options={makeOptions} value={makeValue} isAutofilled={autofilled.make} onChange={changeMake} />
          <Autocomplete name="model" label="Model" icon={CarFront} options={modelOptions} value={modelValue} isAutofilled={autofilled.model} onChange={(value) => { clearAutofill("model"); setModelValue(value); }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="year" label="Year" icon={CalendarDays} inputMode="numeric" value={yearValue} isAutofilled={autofilled.year} onChange={(event) => { clearAutofill("year"); setYearValue(event.currentTarget.value); }} />
          <Autocomplete name="engine_type" label="Engine" icon={Wrench} options={engineOptions} value={engineValue} maxLength={1600} isAutofilled={autofilled.engine} onChange={(value) => { clearAutofill("engine"); setEngineValue(value); }} />
        </div>
        <CustomSelect name="preferred_fuel_type" label="Preferred fuel" icon={Fuel} options={fuelTypes} value={preferredFuelType} onChange={setPreferredFuelType} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)_minmax(118px,0.36fr)]">
          <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" defaultValue={vehicle?.odometer || ""} />
          <Input name="purchase_price" label="Purchase price" icon={BadgeDollarSign} inputMode="decimal" defaultValue={vehicle?.purchase_price || ""} />
          <CustomSelect name="purchase_currency" label="Price currency" icon={Landmark} options={priceCurrencies} value={purchaseCurrency} showLabel onChange={setPurchaseCurrency} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <ActionButton loading={saving} className="mt-2">{isEditing ? "Save changes" : "Save vehicle"}</ActionButton>
          {isEditing && onCancel ? <ActionButton type="button" variant="soft" onClick={onCancel} className="mt-2 px-5">Cancel</ActionButton> : null}
        </div>
      </form>
    </Panel>
  );
}

function VinDecodeSummary({ decoded }: { decoded: VinDecode }) {
  const facts = [
    decoded.vehicle_type,
    decoded.body_class,
    decoded.fuel_type_primary,
    decoded.plant_country,
    decoded.manufacturer,
  ].filter(Boolean);
  return (
    <section className="rounded-[24px] border border-black/[0.06] bg-[#eef3e8] p-3">
      <div className="flex items-center gap-2 text-sm font-bold">
        <BadgeCheck size={17} />
        {decoded.source} decoded data
      </div>
      <p className="mt-2 text-sm font-semibold">{[decoded.model_year, decoded.make, decoded.model].filter(Boolean).join(" ") || decoded.vin}</p>
      {facts.length ? <p className="mt-1 text-xs leading-5 text-[#62685e]">{facts.join(" · ")}</p> : null}
      {decoded.error_text && !decoded.decoded_clean ? <p className="mt-2 text-[11px] leading-5 text-[#8b2d20]">{decoded.error_text}</p> : null}
      <p className="mt-2 text-[11px] leading-5 text-[#62685e]">Review before saving. VIN data can be incomplete and does not include history, mileage, accidents, stolen status, service records, or value.</p>
    </section>
  );
}

function engineFromVIN(decoded: VinDecode) {
  const parts = [
    decoded.displacement_l ? `${decoded.displacement_l}L` : "",
    decoded.engine_cylinders ? `${decoded.engine_cylinders} cyl` : "",
    decoded.fuel_type_primary ?? "",
  ].filter(Boolean);
  return parts.join(" ");
}

const draftFuelTypeByVehicle = new Map<string, string>();

export function ExpenseForm({ vehicle, token, baseCurrency, country, saving, expense, odometerSuggestion, intentCategory, onCreate, onUpdate, onCancel }: { vehicle: Vehicle; token: string; baseCurrency: string; country: string; saving?: boolean; expense?: Expense; odometerSuggestion?: number; intentCategory?: ExpenseCategory; onCreate?: (expense: Partial<Expense>, files?: File[]) => void; onUpdate?: (id: string, expense: Partial<Expense>, files?: File[]) => void; onCancel?: () => void }) {
  const isEditing = Boolean(expense);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Fuel");
  const [date, setDate] = useState(expense?.date ?? "");
  const [fuelType, setFuelType] = useState(() => normalizeFuelType(expense?.fuel_type || draftFuelTypeByVehicle.get(vehicle.id) || vehicle.preferred_fuel_type));
  const [fuelPriceCurrency, setFuelPriceCurrency] = useState(expense?.fuel_price_currency || baseCurrency);
  const [fuelPrice, setFuelPrice] = useState(expense?.fuel_price_per_liter_base ? String(expense.fuel_price_per_liter_base) : "");
  const [fuelPriceEdited, setFuelPriceEdited] = useState(false);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [gasStation, setGasStation] = useState(expense?.category === "Fuel" ? expense.description : "");
  const [serviceType, setServiceType] = useState(expense?.service_type ?? "");
  const [expiresDate, setExpiresDate] = useState(expense?.expires_date ?? "");
  const [odometerValue, setOdometerValue] = useState(expense?.odometer ? String(expense.odometer) : "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileMessage, setFileMessage] = useState("");
  const fuelSuggestion = useFuelPriceSuggestions({ category, country, fuelType, token });

  useEffect(() => {
    if (!intentCategory || isEditing) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setCategory(intentCategory);
    });
    return () => {
      cancelled = true;
    };
  }, [intentCategory, isEditing]);

  useEffect(() => {
    if (category !== "Fuel" || fuelPriceEdited) return;
    if (fuelSuggestion.fuelType !== normalizeFuelType(fuelType)) return;
    const reference = fuelSuggestion.suggestions.find((suggestion) => suggestion.fuel_type === fuelType);
    if (!reference) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setFuelPriceCurrency(reference.currency);
      setFuelPrice(String(reference.price));
    });
    return () => {
      cancelled = true;
    };
  }, [category, fuelPriceEdited, fuelSuggestion.fuelType, fuelSuggestion.suggestions, fuelType]);

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
      fuel_type: String(form.get("fuel_type") ?? "").trim(),
      odometer: intValue(form.get("odometer")),
      service_type: String(form.get("service_type") ?? "").trim(),
      expires_date: String(form.get("expires_date") ?? "").trim(),
      date: String(form.get("date") ?? ""),
      description: expenseDescription(category, String(form.get("description") ?? ""), gasStation),
      exclude_from_analytics: expense?.exclude_from_analytics ?? false,
    };
    if (expense) onUpdate?.(expense.id, payload, files);
    else onCreate?.(payload, files);
    if (expense) return;
    event.currentTarget.reset();
    setCategory("Fuel");
    setDate("");
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
    setOdometerValue("");
    setFiles([]);
    setFileMessage("");
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
    const previousCategory = category;
    setCategory(nextCategory);
    if (previousCategory === "Maintenance" && nextCategory !== "Maintenance" && isServicePreset(description)) {
      setDescription("");
      setServiceType("");
    }
  }

  useEffect(() => {
    if ((category === "Insurance" || category === "Inspection") && date && !expiresDate) {
      let cancelled = false;
      void Promise.resolve().then(() => {
        if (!cancelled) setExpiresDate(addYear(date));
      });
      return () => {
        cancelled = true;
      };
    }
  }, [category, date, expiresDate]);

  return (
    <Panel title="Add expense" eyebrow={vehicleName(vehicle)}>
      <form onSubmit={submit} className="grid gap-3">
        <ExpenseCategoryPicker name="category" value={category} onChange={changeCategory} />
        <motion.div className="grid gap-3">
          <Input name="amount_base" label={`Amount ${baseCurrency}`} icon={BadgeDollarSign} inputMode="decimal" defaultValue={expense?.amount_base || ""} placeholder={amountPlaceholder(category, baseCurrency)} />
          <input type="hidden" name="base_currency" value={expense?.base_currency || baseCurrency} />
          <AnimatePresence initial={false} mode="popLayout">
            {category === "Fuel" ? (
              <motion.div key="fuel-fields" initial={{ opacity: 0, y: 14, scale: 0.985, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, scale: 0.99, filter: "blur(4px)" }} transition={{ duration: 0.34, ease: calmEase }} className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="fuel_liters" label="Liters" icon={Droplets} inputMode="decimal" defaultValue={expense?.fuel_liters || ""} placeholder="Liters" />
                  <Input name="fuel_price_per_liter_base" label="Price / liter" icon={CircleGauge} inputMode="decimal" value={fuelPrice} onChange={(event) => { setFuelPrice(event.currentTarget.value); setFuelPriceEdited(true); }} placeholder="Price / L" />
                  <CustomSelect name="fuel_price_currency" label="Currency" icon={Landmark} options={priceCurrencies} value={fuelPriceCurrency} onChange={setFuelPriceCurrency} />
                  <CustomSelect name="fuel_type" label="Fuel type" icon={Fuel} options={fuelTypes} value={fuelType} onChange={changeFuelType} />
                </div>
                <Autocomplete name="gas_station" label="Gas station" icon={MapPin} options={gasStationBrands} value={gasStation} onChange={setGasStation} />
                <FuelPriceSuggestions suggestions={fuelSuggestion.suggestions} status={fuelSuggestion.status} onSelect={applyFuelSuggestion} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="popLayout">
            {category === "Maintenance" ? (
              <motion.div key="maintenance-presets" initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(3px)" }} transition={{ duration: 0.32, ease: calmEase }}>
                <input type="hidden" name="service_type" value={serviceType} />
                <ServicePresets value={description} serviceType={serviceType} onChange={(nextDescription, nextType) => { setDescription(nextDescription); setServiceType(nextType); }} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="popLayout">
            {(category === "Insurance" || category === "Inspection") ? (
              <motion.div key="expiry-field" initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(3px)" }} transition={{ duration: 0.32, ease: calmEase }}>
                <CalendarField name="expires_date" label="Expires" value={expiresDate} placeholder="Expiry date" onChange={setExpiresDate} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="grid gap-2">
            <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" min={vehicle.odometer || undefined} required={category === "Maintenance"} value={odometerValue} onChange={(event) => setOdometerValue(event.currentTarget.value)} placeholder={category === "Maintenance" ? `Minimum ${vehicle.odometer || 0} km` : "Odometer, km"} />
            {category === "Fuel" && odometerSuggestion && !odometerValue ? (
              <button type="button" onClick={() => setOdometerValue(String(odometerSuggestion))} className="w-fit rounded-full bg-[#eef3e8] px-3 py-1.5 text-xs font-bold text-[#62685e] transition-colors hover:text-[#151712]">
                Use current estimate {km(odometerSuggestion)}
              </button>
            ) : null}
          </div>
          <CalendarField name="date" label="Date" value={date} placeholder="Choose date" onChange={setDate} />
          <Input name="description" label="Description" icon={Text} value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder={descriptionPlaceholder(category)} />
          <ExpenseFilePicker files={files} message={fileMessage} onFilesChange={(nextFiles, nextMessage) => { setFiles(nextFiles); setFileMessage(nextMessage); }} />
        </motion.div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <ActionButton loading={saving} className="mt-2">{isEditing ? "Save changes" : "Save expense"}</ActionButton>
          {isEditing && onCancel ? <ActionButton type="button" variant="soft" onClick={onCancel} className="mt-2 px-5">Cancel</ActionButton> : null}
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
        <span className="flex min-w-0 items-center gap-2 truncate"><Paperclip size={17} className="shrink-0" />Attach receipt or photo</span>
        <span className="text-xs text-[#62685e]">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "Optional"}</span>
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

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function ServicePresets({ value, serviceType, onChange }: { value: string; serviceType: string; onChange: (description: string, serviceType: string) => void }) {
  const options = servicePresetOptions;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selectedServicePresets(value).includes(option.label);
        return (
          <button key={option.label} type="button" onClick={() => onChange(toggleServicePreset(value, option.label), active && serviceType === option.value ? "" : option.value)} className={`h-9 touch-manipulation rounded-full px-3 text-xs font-bold transition-[background-color,color,transform] duration-200 active:scale-[0.985] ${active ? "bg-[#151712] text-white" : "bg-[#eef3e8] text-[#62685e] hover:text-[#151712]"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const servicePresetOptions = [
  { label: "Oil change", value: "oil_change" },
  { label: "Regular service", value: "regular_service" },
  { label: "Filters", value: "filters" },
  { label: "Alignment", value: "alignment" },
];

function isServicePreset(value: string) {
  const selected = selectedServicePresets(value);
  return selected.length > 0 && selected.length === splitServiceDescription(value).length;
}

function toggleServicePreset(value: string, option: string) {
  const parts = splitServiceDescription(value);
  const exists = parts.some((part) => samePreset(part, option));
  const next = exists ? parts.filter((part) => !samePreset(part, option)) : [...parts, option];
  return next.join(" · ");
}

function selectedServicePresets(value: string) {
  return splitServiceDescription(value).filter((part) => servicePresetOptions.some((option) => samePreset(part, option.label)));
}

function splitServiceDescription(value: string) {
  return value.split(/[,·]/).map((part) => part.trim()).filter(Boolean);
}

function samePreset(value: string, option: string) {
  return value.toLowerCase() === option.toLowerCase();
}

function amountPlaceholder(category: ExpenseCategory, currency: string) {
  if (category === "Fuel") return `Total or auto from liters, ${currency}`;
  return `Amount ${currency}`;
}

function descriptionPlaceholder(category: ExpenseCategory) {
  const placeholders: Record<ExpenseCategory, string> = {
    Fuel: "Station, route, or receipt note",
    Maintenance: "Oil service, filters, alignment",
    Repairs: "Service work or workshop note",
    Insurance: "Policy, provider, or coverage",
    Tires: "Tire set, mounting, balancing",
    "Road Tax": "Tax period or document note",
    Inspection: "Inspection station or result",
    Parking: "Location or subscription",
    "Car Wash": "Wash type or detailing note",
    Parts: "Part name or supplier",
    Upgrades: "Speakers, subwoofer, CarPlay, tune",
    Miscellaneous: "Any other ownership cost",
  };
  return placeholders[category];
}

function expenseDescription(category: ExpenseCategory, description: string, gasStation: string) {
  const cleanDescription = description.trim();
  const cleanStation = gasStation.trim();
  if (category !== "Fuel" || !cleanStation) return cleanDescription;
  if (!cleanDescription || cleanDescription === cleanStation) return cleanStation;
  return `${cleanStation} · ${cleanDescription}`;
}

function addYear(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return "";
  const next = new Date(year + 1, month - 1, day);
  const nextYear = String(next.getFullYear()).padStart(4, "0");
  const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
