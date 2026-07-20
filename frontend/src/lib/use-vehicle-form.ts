"use client";

import { useEffect, useState } from "react";
import { decodeVIN, getVehicleMakes, getVehicleModels } from "./api";
import { normalizeFuelType } from "./car-options";
import type { Vehicle, VinDecode } from "./types";

function engineFromVIN(decoded: VinDecode) {
  const parts = [
    decoded.displacement_l ? `${decoded.displacement_l}L` : "",
    decoded.engine_cylinders ? `${decoded.engine_cylinders} cyl` : "",
    decoded.fuel_type_primary ?? "",
  ].filter(Boolean);
  return parts.join(" ");
}

export function useVehicleForm(vehicle?: Vehicle) {
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

  function resetForm() {
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

  return {
    isEditing: Boolean(vehicle),
    vinValue,
    setVinValue,
    makeValue,
    setMakeValue,
    modelValue,
    setModelValue,
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
  };
}
