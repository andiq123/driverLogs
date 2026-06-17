"use client";

import { createElement } from "react";
import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ExpenseCategory, SpendingCategory, SpendingInsight } from "@/lib/types";
import { money } from "@/lib/format";
import { categoryIcon, palette } from "@/lib/theme";
import { BottomSheet, SheetHeader, sheetSpring } from "./bottom-sheet";

export function SpendingBreakdownSheet({ spending, onClose }: { spending?: SpendingInsight; onClose: () => void }) {
  const open = Boolean(spending && spending.categories.length > 0);
  const categories = spending?.categories ?? [];
  const top = categories[0];

  return (
    <BottomSheet open={open} onClose={onClose} label="Spending breakdown">
      {spending ? (
        <>
          <SheetHeader eyebrow="Spending this month" title={money(spending.this_month_mdl)} onClose={onClose} />

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetSpring, delay: 0.08 }} className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="vs last month" value={trendText(spending)} icon={trendIcon(spending.trend)} />
            <Stat label="Biggest cost" value={top ? top.name : "—"} />
          </motion.div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">Where it went</p>
          <div className="mt-2 grid gap-2">
            {categories.map((category, index) => (
              <CategoryRow key={category.name} category={category} index={index} />
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-[#6b7065]">Totals use the stored MDL value stamped on each expense when it was created.</p>
        </>
      ) : null}
    </BottomSheet>
  );
}

function CategoryRow({ category, index }: { category: SpendingCategory; index: number }) {
  const color = palette[index % palette.length];
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...sheetSpring, delay: 0.12 + index * 0.05 }} className="rounded-[20px] border border-black/[0.045] bg-white/92 p-3 shadow-[0_6px_20px_rgba(31,41,28,0.045)]">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex min-w-0 items-center gap-2 font-bold">{createElement(categoryIcon(category.name as ExpenseCategory), { size: 15, className: "shrink-0 text-[#62685e]" })}<span className="truncate">{category.name}</span></span>
        <span className="shrink-0 font-bold">{money(category.mdl)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
          <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(4, Math.round(category.share))}%` }} transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.2 + index * 0.05 }} className="block h-full rounded-full" style={{ backgroundColor: color }} />
        </span>
        <span className="w-10 shrink-0 text-right text-xs font-bold text-[#62685e]">{Math.round(category.share)}%</span>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof TrendingUp }) {
  return (
    <div className="rounded-[18px] bg-[#eef3e8]/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 truncate text-sm font-bold text-[#30342e]">{Icon ? <Icon size={14} className="shrink-0" /> : null}{value}</p>
    </div>
  );
}

function trendText(spending: SpendingInsight) {
  if (spending.trend === "first") return "First month";
  if (spending.trend === "flat") return "Same";
  return `${money(Math.abs(spending.delta_mdl))} ${spending.trend === "up" ? "more" : "less"}`;
}

function trendIcon(trend: SpendingInsight["trend"]) {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;
  return Minus;
}
