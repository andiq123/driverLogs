import { MapPin } from "lucide-react";
import type { FuelPriceSuggestion } from "@/lib/types";

export function FuelPriceSuggestions({ suggestions, status, onSelect }: { suggestions: FuelPriceSuggestion[]; status: string; onSelect: (suggestion: FuelPriceSuggestion) => void }) {
  if (status) {
    return <p className="rounded-[18px] border border-black/[0.04] bg-[#f8faf5] px-3 py-2 text-xs font-semibold text-[#62685e]">{status}</p>;
  }
  if (!suggestions.length) return null;
  return (
    <div className="grid gap-2">
      {suggestions.slice(0, 3).map((suggestion) => (
        <button key={suggestionKey(suggestion)} type="button" onClick={() => onSelect(suggestion)} className="grid touch-manipulation grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] border border-black/[0.045] bg-[#fffffb]/92 px-3 py-2 text-left shadow-[0_6px_18px_rgba(31,41,28,0.045)] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f8faf5] active:scale-[0.985]">
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-bold">
              <MapPin size={15} />
              <span className="truncate">{suggestionName(suggestion)}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#62685e]">{suggestionScope(suggestion)} · {suggestion.source}</span>
          </span>
          <span className="grid justify-items-end gap-0.5">
            <span className="rounded-xl bg-white px-3 py-1 text-sm font-bold">{suggestion.price} {suggestion.currency}/L</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#55745b]">Use reference</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function suggestionKey(suggestion: FuelPriceSuggestion) {
  return `${suggestion.source}-${suggestion.brand}-${suggestion.city}-${suggestion.fuel_type}-${suggestion.price}`;
}

function suggestionName(suggestion: FuelPriceSuggestion) {
  return suggestion.station_name || suggestion.brand || `${suggestion.country} ${suggestion.fuel_type}`;
}

function suggestionScope(suggestion: FuelPriceSuggestion) {
  if (!suggestion.station_level) return "National reference";
  return [suggestion.city, suggestion.region].filter(Boolean).join(", ");
}
