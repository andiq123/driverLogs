"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { decodeVIN, getVehicleMakes, getVehicleModels } from "@/lib/api";
import { engineOptions, fuelTypes, normalizeFuelType, priceCurrencies } from "@/lib/car-options";
import type { Expense, ExpenseCategory, FuelPriceSuggestion, Vehicle, VinDecode } from "@/lib/types";
import { intValue, km, numberValue, vehicleName } from "@/lib/format";
import { Autocomplete } from "./autocomplete";
import { CalendarField } from "./calendar-field";
import { CustomSelect } from "./custom-select";
import { ExpenseCategoryPicker } from "./expense-category-picker";
import { FuelPriceSuggestions } from "./fuel-price-suggestions";
import { ActionButton, Input, Panel } from "./ui";
import { BadgeCheck, BadgeDollarSign, CalendarDays, CarFront, CircleGauge, Droplets, Fuel, Hash, Landmark, Milestone, ScanLine, Text, Wrench } from "lucide-react";
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
      purchase_price: intValue(form.get("purchase_price")),
      purchase_currency: String(form.get("purchase_currency") ?? "MDL"),
    };
    if (vehicle) onUpdate?.(vehicle.id, payload);
    else onCreate?.(payload);
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(128px,0.78fr)_96px]">
          <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" defaultValue={vehicle?.odometer || ""} />
          <Input name="purchase_price" label="Purchase price" icon={BadgeDollarSign} inputMode="decimal" defaultValue={vehicle?.purchase_price || ""} />
          <CustomSelect name="purchase_currency" label="Currency" icon={Landmark} options={priceCurrencies} value={purchaseCurrency} onChange={setPurchaseCurrency} />
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

export function ExpenseForm({ vehicle, token, baseCurrency, country, saving, expense, odometerSuggestion, onCreate, onUpdate, onCancel }: { vehicle: Vehicle; token: string; baseCurrency: string; country: string; saving?: boolean; expense?: Expense; odometerSuggestion?: number; onCreate?: (expense: Partial<Expense>) => void; onUpdate?: (id: string, expense: Partial<Expense>) => void; onCancel?: () => void }) {
  const isEditing = Boolean(expense);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Fuel");
  const [date, setDate] = useState(expense?.date ?? "");
  const [fuelType, setFuelType] = useState(() => normalizeFuelType(expense?.fuel_type || draftFuelTypeByVehicle.get(vehicle.id) || vehicle.preferred_fuel_type));
  const [fuelPriceCurrency, setFuelPriceCurrency] = useState(expense?.fuel_price_currency || baseCurrency);
  const [fuelPrice, setFuelPrice] = useState(expense?.fuel_price_per_liter_base ? String(expense.fuel_price_per_liter_base) : "");
  const [fuelPriceEdited, setFuelPriceEdited] = useState(false);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [odometerValue, setOdometerValue] = useState(expense?.odometer ? String(expense.odometer) : "");
  const fuelSuggestion = useFuelPriceSuggestions({ category, country, fuelType, token });

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
      amount_base: intValue(form.get("amount_base")),
      base_currency: String(form.get("base_currency") ?? baseCurrency),
      fuel_liters: numberValue(form.get("fuel_liters")),
      fuel_price_per_liter_base: numberValue(form.get("fuel_price_per_liter_base")),
      fuel_price_currency: String(form.get("fuel_price_currency") ?? baseCurrency),
      fuel_type: String(form.get("fuel_type") ?? "").trim(),
      odometer: intValue(form.get("odometer")),
      date: String(form.get("date") ?? ""),
      description: String(form.get("description") ?? "").trim(),
    };
    if (expense) onUpdate?.(expense.id, payload);
    else onCreate?.(payload);
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
    setOdometerValue("");
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
    if (nextCategory === "Maintenance" && !description.trim()) {
      setDescription("Oil change");
      return;
    }
    if (previousCategory === "Maintenance" && nextCategory !== "Maintenance" && isServicePreset(description)) {
      setDescription("");
    }
  }

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
                <FuelPriceSuggestions suggestions={fuelSuggestion.suggestions} status={fuelSuggestion.status} onSelect={applyFuelSuggestion} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="popLayout">
            {category === "Maintenance" ? (
              <motion.div key="maintenance-presets" initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(3px)" }} transition={{ duration: 0.32, ease: calmEase }}>
                <ServicePresets value={description} onChange={setDescription} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="grid gap-2">
            <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" required={category === "Maintenance"} value={odometerValue} onChange={(event) => setOdometerValue(event.currentTarget.value)} placeholder={category === "Maintenance" ? "Required odometer, km" : "Odometer, km"} />
            {category === "Fuel" && odometerSuggestion && !odometerValue ? (
              <button type="button" onClick={() => setOdometerValue(String(odometerSuggestion))} className="w-fit rounded-full bg-[#eef3e8] px-3 py-1.5 text-xs font-bold text-[#62685e] transition-colors hover:text-[#151712]">
                Use current estimate {km(odometerSuggestion)}
              </button>
            ) : null}
          </div>
          <CalendarField name="date" label="Date" value={date} placeholder="Choose date" onChange={setDate} />
          <Input name="description" label="Description" icon={Text} required value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder={descriptionPlaceholder(category)} />
        </motion.div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <ActionButton loading={saving} className="mt-2">{isEditing ? "Save changes" : "Save expense"}</ActionButton>
          {isEditing && onCancel ? <ActionButton type="button" variant="soft" onClick={onCancel} className="mt-2 px-5">Cancel</ActionButton> : null}
        </div>
      </form>
    </Panel>
  );
}

function ServicePresets({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = servicePresetOptions;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.toLowerCase().includes(option.toLowerCase());
        return (
          <button key={option} type="button" onClick={() => onChange(option)} className={`h-9 touch-manipulation rounded-full px-3 text-xs font-bold transition-[background-color,color,transform] duration-200 active:scale-[0.985] ${active ? "bg-[#151712] text-white" : "bg-[#eef3e8] text-[#62685e] hover:text-[#151712]"}`}>
            {option}
          </button>
        );
      })}
    </div>
  );
}

const servicePresetOptions = ["Oil change", "Regular service", "Filters", "Alignment"];

function isServicePreset(value: string) {
  const cleanValue = value.trim().toLowerCase();
  return servicePresetOptions.some((option) => option.toLowerCase() === cleanValue);
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
