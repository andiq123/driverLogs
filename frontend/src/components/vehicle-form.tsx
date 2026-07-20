"use client";

import type { FormEvent } from "react";
import { BadgeCheck, BadgeDollarSign, CalendarDays, CarFront, Fuel, Hash, Landmark, Milestone, ScanLine, Text, Wrench } from "lucide-react";
import { engineOptions, fuelTypes, oilIntervalForVehicle, priceCurrencies } from "@/lib/car-options";
import { intValue, numberValue } from "@/lib/format";
import type { Vehicle, VinDecode } from "@/lib/types";
import { useVehicleForm } from "@/lib/use-vehicle-form";
import { Autocomplete } from "./autocomplete";
import { CustomSelect } from "./custom-select";
import { ActionButton, Input, Panel } from "./ui";

export function VehicleForm({ vehicle, saving, onCancel, onCreate, onUpdate }: { vehicle?: Vehicle; saving?: boolean; onCancel?: () => void; onCreate?: (vehicle: Partial<Vehicle>) => void; onUpdate?: (id: string, vehicle: Partial<Vehicle>) => void }) {
  const {
    isEditing,
    vinValue,
    setVinValue,
    makeValue,
    setModelValue,
    modelValue,
    yearValue,
    setYearValue,
    engineValue,
    setEngineValue,
    purchaseCurrency,
    setPurchaseCurrency,
    preferredFuelType,
    setPreferredFuelType,
    makeOptions,
    modelOptions,
    vinDecode,
    vinStatus,
    setVinStatus,
    decodingVIN,
    autofilled,
    changeMake,
    clearAutofill,
    lookupVIN,
    resetForm,
  } = useVehicleForm(vehicle);

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
    resetForm();
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
        <Input name="odometer" label="Odometer" icon={Milestone} inputMode="numeric" defaultValue={vehicle?.odometer || ""} placeholder="Odometer, km" />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.42fr)]">
          <Input name="purchase_price" label="Purchase price" icon={BadgeDollarSign} inputMode="decimal" defaultValue={vehicle?.purchase_price || ""} />
          <CustomSelect name="purchase_currency" label="Price currency" icon={Landmark} options={priceCurrencies} value={purchaseCurrency} onChange={setPurchaseCurrency} />
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
