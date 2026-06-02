"use client";

import { useState, type FormEvent } from "react";
import { BadgeDollarSign, Car, Check, Copy, Fuel, Gauge, Globe2, Save, UserRound, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { deleteUserDocument, getUserDocumentPreview, getUserDocuments, uploadUserDocument } from "@/lib/api";
import { countries, userCurrencies } from "@/lib/theme";
import type { DocumentAttachment, UserSettings, Vehicle } from "@/lib/types";
import { fuelTypes, normalizeFuelType, oilIntervalForVehicle } from "@/lib/car-options";
import { vehicleName } from "@/lib/format";
import { DocumentManager } from "../document-manager";
import { CustomSelect } from "../custom-select";
import { ActionButton, Input, Panel } from "../ui";

export function SettingsView({ token, settings, loginID, vehicles, userDocuments, activeVehicleID, saving, onCopyLoginID, onOpenGarage, onSelectVehicle, onSave, onUpdateVehicle }: { token: string; settings: UserSettings; loginID: string; vehicles: Vehicle[]; userDocuments: DocumentAttachment[]; activeVehicleID: string; saving?: boolean; onCopyLoginID: () => void; onOpenGarage: () => void; onSelectVehicle: (id: string) => void; onSave: (settings: UserSettings) => Promise<void> | void; onUpdateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void> | void }) {
  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleID);
  const [currency, setCurrency] = useState(settings.default_currency);
  const [country, setCountry] = useState(settings.country);
  const [compareCountry, setCompareCountry] = useState(settings.compare_country || "RO");
  const [name, setName] = useState(settings.name ?? "");
  const [preferredFuelType, setPreferredFuelType] = useState(normalizeFuelType(activeVehicle?.preferred_fuel_type));
  const [oilIntervalKM, setOilIntervalKM] = useState(String(activeVehicle?.oil_interval_km || oilIntervalForVehicle(activeVehicle?.preferred_fuel_type, activeVehicle?.engine_type)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ name: name.trim(), default_currency: currency, country, compare_country: compareCountry });
    const nextOilIntervalKM = normalizeOilIntervalKM(oilIntervalKM);
    const currentOilIntervalKM = activeVehicle?.oil_interval_km || oilIntervalForVehicle(activeVehicle?.preferred_fuel_type, activeVehicle?.engine_type);
    if (activeVehicle && (preferredFuelType !== normalizeFuelType(activeVehicle.preferred_fuel_type) || nextOilIntervalKM !== currentOilIntervalKM)) {
      await onUpdateVehicle(activeVehicle.id, { ...activeVehicle, preferred_fuel_type: preferredFuelType, oil_interval_km: nextOilIntervalKM });
    }
  }

  return (
    <div className="max-w-2xl">
      <Panel title="Profile" eyebrow="Account">
        <form onSubmit={submit} className="grid gap-4">
          <Input name="name" label="Name" icon={UserRound} value={name} maxLength={80} showLabel onChange={(event) => setName(event.currentTarget.value)} />
          <div className="grid gap-1 text-sm font-semibold">
            <span className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#70776a]">Login ID</span>
            <div className="grid grid-cols-[1fr_48px] gap-2">
              <div className="relative flex h-12 min-w-0 items-center rounded-[18px] border border-black/[0.055] bg-[#fffffb]/92 py-0 pl-10 pr-4 font-mono text-sm tracking-wide text-[#30342e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" />
                <span className="truncate">{loginID}</span>
              </div>
              <button type="button" aria-label="Copy login ID" onClick={onCopyLoginID} className="flex size-12 touch-manipulation items-center justify-center rounded-[18px] bg-[#151712] text-white transition-[transform,opacity] duration-200 active:scale-[0.985]">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CustomSelect name="default_currency" label="Base currency" icon={BadgeDollarSign} options={userCurrencies} value={currency} showLabel onChange={setCurrency} />
            <CustomSelect name="country" label="Home country" icon={Globe2} options={countries} value={country} showLabel onChange={setCountry} />
          </div>
          <CustomSelect name="compare_country" label="Fuel compare country" icon={Globe2} options={countries} value={compareCountry} showLabel onChange={setCompareCountry} />
          {activeVehicle ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomSelect name="preferred_fuel_type" label="Car fuel" icon={Fuel} options={fuelTypes} value={preferredFuelType} showLabel onChange={setPreferredFuelType} />
              <Input name="oil_interval_km" label="Oil interval, km" icon={Gauge} inputMode="numeric" value={oilIntervalKM} showLabel onChange={(event) => setOilIntervalKM(event.currentTarget.value)} />
            </div>
          ) : null}
          <button type="button" onClick={onOpenGarage} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#eef3e8] text-sm font-bold text-[#151712] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#dfe7d4] active:scale-[0.985]">
            <Wrench size={17} />
            My Garage
          </button>
          {vehicles.length ? (
            <section className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70776a]">Active vehicle</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {vehicles.map((vehicle) => {
                  const active = vehicle.id === activeVehicleID;
                  return (
                    <button key={vehicle.id} type="button" onClick={() => onSelectVehicle(vehicle.id)} className={`relative flex min-w-0 touch-manipulation items-center gap-3 overflow-hidden rounded-[18px] border px-3 py-3 text-left shadow-[0_6px_18px_rgba(31,41,28,0.04)] ring-1 ring-white/70 transition-[border-color,color,transform,background-color] duration-200 active:scale-[0.985] ${active ? "border-[#a9c79a]/45 bg-[#eef6e9] text-[#151712]" : "border-black/[0.045] bg-[#fffffb]/92 text-[#62685e] hover:text-[#151712]"}`}>
                      {active ? <motion.span layoutId="settings-active-car" className="absolute inset-0 bg-[#e6f0df]" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-[16px] bg-white">
                        <Car size={18} />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{vehicleName(vehicle)}</span>
                        <span className="block truncate text-xs text-[#62685e]">{vehicle.plate_number}</span>
                      </span>
                      {active ? <Check size={16} className="relative shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
          <DocumentManager
            key={`driver-license-${loginID}`}
            title="Driver license"
            body="Private document linked to your profile."
            reloadKey={`user-driver-license-${loginID}`}
            initialDocuments={userDocuments.filter((document) => document.kind === "driver_license")}
            load={() => getUserDocuments(token, "driver_license")}
            upload={(file) => uploadUserDocument(token, "driver_license", file)}
            preview={(documentID) => getUserDocumentPreview(token, documentID)}
            remove={(documentID) => deleteUserDocument(token, documentID)}
          />
          <ActionButton icon={Save} loading={saving} className="mt-2">Save settings</ActionButton>
        </form>
      </Panel>
    </div>
  );
}

function normalizeOilIntervalKM(value: string) {
  const numeric = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return 10000;
  return Math.min(30000, Math.max(5000, numeric));
}
