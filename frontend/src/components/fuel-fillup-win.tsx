import { motion } from "framer-motion";
import { Fuel, Sparkles, TrendingDown } from "lucide-react";
import { calmEase } from "@/lib/theme";
import type { Expense } from "@/lib/types";

type FuelFillupWinProps = {
  current: Expense;
  previous: Expense;
};

export function FuelFillupWin({ current, previous }: FuelFillupWinProps) {
  const currentLiters = current.fuel_liters || 0;
  const previousLiters = previous.fuel_liters || 0;
  const savedMDL = previous.amount_mdl - current.amount_mdl;
  const extraLiters = currentLiters - previousLiters;
  const priceDrop = (previous.fuel_price_per_liter_mdl || 0) - (current.fuel_price_per_liter_mdl || 0);

  if (extraLiters <= 0 || savedMDL <= 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.985, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.42, ease: calmEase }}
      className="relative mx-1 overflow-hidden rounded-[22px] border border-[#bdd7c0]/80 bg-[#f1f8ed] p-3 shadow-[0_12px_34px_rgba(54,94,58,0.10)] ring-1 ring-white/80 sm:mx-8 sm:rounded-[24px] sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,0.82fr)_minmax(260px,1fr)] sm:items-center">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#456148]">
            <TrendingDown size={14} />
            Better fill-up
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-base font-bold text-[#142016] sm:text-lg">
            More liters, less money
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
              animate={{ opacity: [0, 1, 0.82], scale: [0.5, 1.08, 1], rotate: [-12, 8, 0] }}
              transition={{ duration: 0.8, ease: calmEase }}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/82 text-[#0f8f68] shadow-[0_8px_18px_rgba(54,94,58,0.12)]"
            >
              <Sparkles size={14} />
            </motion.span>
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#556a54]">
            {formatDelta(extraLiters)} L more and {formatMDL(savedMDL)} saved versus the previous fill-up.
          </p>
          {priceDrop > 0 ? <p className="mt-1 text-xs font-bold text-[#24603c]">{formatPrice(priceDrop)} MDL/L lower price</p> : null}
        </div>
        <div className="grid gap-2">
          <ComparisonBar icon={Fuel} label="Liters" previous={previousLiters} current={currentLiters} unit="L" higherIsBetter />
          <ComparisonBar icon={TrendingDown} label="Cost" previous={previous.amount_mdl} current={current.amount_mdl} unit="MDL" />
        </div>
      </div>
    </motion.section>
  );
}

function ComparisonBar({ icon: Icon, label, previous, current, unit, higherIsBetter = false }: { icon: typeof Fuel; label: string; previous: number; current: number; unit: string; higherIsBetter?: boolean }) {
  const max = Math.max(previous, current, 1);
  const previousWidth = `${Math.max(8, (previous / max) * 100)}%`;
  const currentWidth = `${Math.max(8, (current / max) * 100)}%`;
  const currentWins = higherIsBetter ? current > previous : current < previous;

  return (
    <div className="rounded-[18px] bg-white/76 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[#30342e]">
        <span className="flex items-center gap-1.5"><Icon size={14} />{label}</span>
        <span className={`shrink-0 text-right ${currentWins ? "text-[#0f8f68]" : "text-[#62685e]"}`}>{formatMeasure(current, unit)}</span>
      </div>
      <div className="grid gap-1.5">
        <BarRow label="Before" width={previousWidth} value={formatMeasure(previous, unit)} muted />
        <BarRow label="Now" width={currentWidth} value={formatMeasure(current, unit)} highlighted={currentWins} />
      </div>
    </div>
  );
}

function BarRow({ label, width, value, highlighted = false, muted = false }: { label: string; width: string; value: string; highlighted?: boolean; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[3.6rem_minmax(2rem,1fr)_minmax(5.5rem,auto)] items-center gap-2 text-[11px]">
      <span className={muted ? "text-[#8a9085]" : "font-bold text-[#456148]"}>{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[#e3ecdc]">
        <motion.span
          initial={{ width: "8%" }}
          animate={{ width }}
          transition={{ duration: 0.65, ease: calmEase }}
          className={`block h-full rounded-full ${highlighted ? "bg-[#0f8f68]" : "bg-[#b6c8aa]"}`}
        />
      </span>
      <span className="whitespace-nowrap text-right font-bold text-[#30342e]">{value}</span>
    </div>
  );
}

function formatMeasure(value: number, unit: string) {
  return `${formatNumber(value)} ${unit}`;
}

function formatDelta(value: number) {
  return new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 2 }).format(value);
}

function formatMDL(value: number) {
  return `${formatNumber(value)} MDL`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-MD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ro-MD", {
    minimumFractionDigits: Math.abs(value % 1) > Number.EPSILON ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}
