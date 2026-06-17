import { motion } from "framer-motion";
import { Minus, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { calmEase } from "@/lib/theme";
import { money } from "@/lib/format";
import type { Expense } from "@/lib/types";

// Price per liter is the only fair way to compare two fill-ups — it works
// whether or not the tank was filled, and ignores how many liters went in. We
// surface it whenever there is a previous priced fill, framed by what changed:
// a new low, cheaper than last, below average, pricier, or steady.
const PRICE_EPSILON = 0.01;

type Tone = "good" | "warn" | "neutral";

const tones: Record<Tone, { container: string; eyebrow: string; accent: string; bar: string; track: string; chip: string }> = {
  good: { container: "border-[#bdd7c0]/80 bg-[#f1f8ed] shadow-[0_12px_34px_rgba(54,94,58,0.10)]", eyebrow: "text-[#456148]", accent: "text-[#24603c]", bar: "bg-[#0f8f68]", track: "bg-[#e3ecdc]", chip: "bg-white/76" },
  warn: { container: "border-[#efd282]/80 bg-[#fff8df] shadow-[0_12px_34px_rgba(173,128,17,0.10)]", eyebrow: "text-[#7b5a12]", accent: "text-[#8a6200]", bar: "bg-[#d9a514]", track: "bg-[#f3e6b8]", chip: "bg-white/72" },
  neutral: { container: "border-black/[0.06] bg-[#f6f7f3] shadow-[0_12px_34px_rgba(31,41,28,0.06)]", eyebrow: "text-[#62685e]", accent: "text-[#4b5147]", bar: "bg-[#a8b0a0]", track: "bg-[#e7e9e2]", chip: "bg-white/72" },
};

export function FuelFillupWin({ current, history }: { current: Expense; history: Expense[] }) {
  const currentPrice = current.fuel_price_per_liter_mdl || 0;
  const priced = history.filter((entry) => (entry.fuel_price_per_liter_mdl || 0) > 0);
  if (currentPrice <= 0 || priced.length === 0) return null;

  const previousPrice = priced[0].fuel_price_per_liter_mdl || 0;
  const priceDelta = round2(previousPrice - currentPrice); // positive = cheaper now
  const prices = priced.map((entry) => entry.fuel_price_per_liter_mdl || 0);
  const averagePrice = round2(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const lowestBefore = Math.min(...prices);
  const isNewLow = prices.length >= 2 && currentPrice <= lowestBefore - PRICE_EPSILON;
  const belowAverage = currentPrice < averagePrice - PRICE_EPSILON;
  const liters = current.fuel_liters || 0;
  const savedOnTank = priceDelta > 0 && liters > 0 ? round2(priceDelta * liters) : 0;

  const view = buildView({ priceDelta, isNewLow, belowAverage, comparedCount: prices.length + 1, averagePrice, savedOnTank });
  const tone = tones[view.tone];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.985, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.42, ease: calmEase }}
      className={`relative mx-1 overflow-hidden rounded-[22px] border p-3 ring-1 ring-white/80 sm:mx-8 sm:rounded-[24px] sm:p-4 ${tone.container}`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,0.82fr)_minmax(240px,1fr)] sm:items-center">
        <div className="min-w-0">
          <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] ${tone.eyebrow}`}>
            <view.icon size={14} />
            {view.eyebrow}
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-base font-bold text-[#142016] sm:text-lg">
            {view.title}
            {view.celebrate ? (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                animate={{ opacity: [0, 1, 0.82], scale: [0.5, 1.08, 1], rotate: [-12, 8, 0] }}
                transition={{ duration: 0.8, ease: calmEase }}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/82 text-[#0f8f68] shadow-[0_8px_18px_rgba(54,94,58,0.12)]"
              >
                <Sparkles size={14} />
              </motion.span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#556a54]">{view.note}</p>
          {view.highlight ? <p className={`mt-1 text-xs font-bold ${tone.accent}`}>{view.highlight}</p> : null}
        </div>
        <div className="grid gap-2">
          <ComparisonBar label="Price / L" previous={previousPrice} current={currentPrice} unit="MDL/L" tone={tone} lowerIsBetter />
          <div className={`flex items-center justify-between rounded-[16px] px-3 py-2 text-xs font-bold text-[#30342e] ${tone.chip}`}>
            <span>{formatNumber(liters)} L filled</span>
            <span>{money(current.amount_mdl)}</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

type View = { tone: Tone; icon: LucideIcon; eyebrow: string; title: string; note: string; highlight?: string; celebrate?: boolean };

function buildView({ priceDelta, isNewLow, belowAverage, comparedCount, averagePrice, savedOnTank }: { priceDelta: number; isNewLow: boolean; belowAverage: boolean; comparedCount: number; averagePrice: number; savedOnTank: number }): View {
  const savedNote = savedOnTank > 0 ? `≈ ${money(savedOnTank)} saved on this tank vs the last price.` : undefined;
  if (isNewLow) {
    return { tone: "good", icon: TrendingDown, eyebrow: "Best price", title: "Cheapest fill yet", note: `Lowest price per liter in your last ${comparedCount} fill-ups.`, highlight: savedNote, celebrate: true };
  }
  if (priceDelta > PRICE_EPSILON) {
    const belowText = belowAverage ? ` · under your ${formatPrice(averagePrice)} average` : "";
    return { tone: "good", icon: TrendingDown, eyebrow: "Cheaper fuel", title: "Lower price per liter", note: `${formatPrice(priceDelta)} MDL/L less than your last fill${belowText}.`, highlight: savedNote, celebrate: belowAverage };
  }
  if (priceDelta < -PRICE_EPSILON) {
    return { tone: "warn", icon: TrendingUp, eyebrow: "Pricier fuel", title: "Higher price per liter", note: `${formatPrice(Math.abs(priceDelta))} MDL/L more than your last fill.` };
  }
  return { tone: "neutral", icon: Minus, eyebrow: "Steady price", title: "Same price per liter", note: "Same price per liter as your last fill." };
}

function ComparisonBar({ label, previous, current, unit, tone, lowerIsBetter = false }: { label: string; previous: number; current: number; unit: string; tone: (typeof tones)[Tone]; lowerIsBetter?: boolean }) {
  const max = Math.max(previous, current, 0.0001);
  const previousWidth = `${Math.max(8, (previous / max) * 100)}%`;
  const currentWidth = `${Math.max(8, (current / max) * 100)}%`;
  const currentWins = lowerIsBetter ? current < previous : current > previous;

  return (
    <div className={`rounded-[18px] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ${tone.chip}`}>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[#30342e]">
        <span>{label}</span>
        <span className={`shrink-0 text-right ${currentWins ? tone.accent : "text-[#62685e]"}`}>{formatPrice(current)} {unit}</span>
      </div>
      <div className="grid gap-1.5">
        <BarRow label="Before" width={previousWidth} value={`${formatPrice(previous)} ${unit}`} track={tone.track} muted />
        <BarRow label="Now" width={currentWidth} value={`${formatPrice(current)} ${unit}`} track={tone.track} bar={tone.bar} highlighted={currentWins} />
      </div>
    </div>
  );
}

function BarRow({ label, width, value, track, bar, highlighted = false, muted = false }: { label: string; width: string; value: string; track: string; bar?: string; highlighted?: boolean; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[3.6rem_minmax(2rem,1fr)_minmax(6.5rem,auto)] items-center gap-2 text-[11px]">
      <span className={muted ? "text-[#8a9085]" : "font-bold text-[#456148]"}>{label}</span>
      <span className={`h-2 overflow-hidden rounded-full ${track}`}>
        <motion.span
          initial={{ width: "8%" }}
          animate={{ width }}
          transition={{ duration: 0.65, ease: calmEase }}
          className={`block h-full rounded-full ${highlighted && bar ? bar : "bg-[#b6c8aa]"}`}
        />
      </span>
      <span className="whitespace-nowrap text-right font-bold text-[#30342e]">{value}</span>
    </div>
  );
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
