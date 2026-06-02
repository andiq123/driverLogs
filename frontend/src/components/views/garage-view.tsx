import { useState } from "react";
import { Car, FileText, Pencil, Trash2 } from "lucide-react";
import { deleteVehicleDocument, getVehicleDocumentPreview, getVehicleDocuments, uploadVehicleDocument } from "@/lib/api";
import type { Vehicle } from "@/lib/types";
import { palette } from "@/lib/theme";
import { km, vehicleName } from "@/lib/format";
import { DocumentManager } from "../document-manager";
import { EmptyState, IconButton, Panel } from "../ui";
import { VehicleForm } from "../forms";

export function GarageView({ token, vehicles, activeVehicleID, savingVehicle, deletingVehicle, onSelect, onDelete, onCreate, onUpdate }: { token: string; vehicles: Vehicle[]; activeVehicleID: string; savingVehicle?: boolean; deletingVehicle?: boolean; onSelect: (id: string) => void; onDelete: (id: string) => void; onCreate: (vehicle: Partial<Vehicle>) => void; onUpdate: (id: string, vehicle: Partial<Vehicle>) => void }) {
  const [editingVehicleID, setEditingVehicleID] = useState("");
  const editingVehicle = vehicles.find((vehicle) => vehicle.id === editingVehicleID);
  const documentVehicle = editingVehicle ?? vehicles.find((vehicle) => vehicle.id === activeVehicleID);

  function updateVehicle(id: string, vehicle: Partial<Vehicle>) {
    onUpdate(id, vehicle);
    setEditingVehicleID("");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Panel title="My Garage" eyebrow="Vehicles">
        {vehicles.length === 0 ? <EmptyState icon={Car} title="No vehicles yet" body="Create your first vehicle profile. The dashboard, timeline, analytics, and reports will use only your app data." /> : (
          <div className="grid gap-3">
            {vehicles.map((vehicle, index) => (
              <div key={vehicle.id} className={`grid min-w-0 grid-cols-[1fr_auto] items-center gap-2 rounded-[22px] border p-3 shadow-[0_7px_22px_rgba(31,41,28,0.045)] ring-1 ring-white/70 transition-[background-color,border-color,transform] duration-200 ${activeVehicleID === vehicle.id ? "border-[#a9c79a]/45 bg-[#eef6e9]" : "border-black/[0.045] bg-[#fffffb]/92 hover:bg-[#f8faf5]"}`}>
                <button onClick={() => onSelect(vehicle.id)} className="flex min-w-0 touch-manipulation items-center gap-3 text-left active:scale-[0.995]">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-[18px] text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                    <Car size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{vehicleName(vehicle)}</span>
                    <span className="block truncate text-xs text-[#6b7065]">{vehicle.plate_number} · {km(vehicle.odometer ?? 0)}</span>
                    {vehicle.latest_document ? <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#62685e]"><FileText size={12} /> Passport</span> : null}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton icon={Pencil} label="Edit vehicle" onClick={(event) => { event.stopPropagation(); setEditingVehicleID(vehicle.id); }} className="bg-white text-[#62685e] hover:text-[#151712]" />
                  <IconButton icon={Trash2} label="Delete vehicle" variant="danger" loading={deletingVehicle && activeVehicleID === vehicle.id} onClick={(event) => { event.stopPropagation(); onDelete(vehicle.id); }} className="bg-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div className="grid content-start gap-4">
        <VehicleForm key={editingVehicle?.id ?? "new"} vehicle={editingVehicle} saving={savingVehicle} onCancel={() => setEditingVehicleID("")} onCreate={onCreate} onUpdate={updateVehicle} />
        {documentVehicle ? (
          <DocumentManager
            key={`car-passport-${documentVehicle.id}`}
            title="Car passport"
            body={`Private document linked to ${vehicleName(documentVehicle)}.`}
            reloadKey={`vehicle-passport-${documentVehicle.id}`}
            initialDocuments={documentVehicle.latest_document ? [documentVehicle.latest_document] : []}
            load={() => getVehicleDocuments(token, documentVehicle.id, "car_passport")}
            upload={(file) => uploadVehicleDocument(token, documentVehicle.id, "car_passport", file)}
            preview={(documentID) => getVehicleDocumentPreview(token, documentVehicle.id, documentID)}
            remove={(documentID) => deleteVehicleDocument(token, documentVehicle.id, documentID)}
          />
        ) : null}
      </div>
    </div>
  );
}
