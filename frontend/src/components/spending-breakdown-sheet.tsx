"use client";

import { createElement } from "react";
import { motion } from "framer-motion";
import type { ExpenseCategory, SpendingCategory, SpendingInsight } from "@/lib/types";
import { money } from "@/lib/format";
import { categoryIcon, palette } from "@/lib/theme";
import { BreakdownSheet, SheetStat, sheetSpring, trendIcon } from "./bottom-sheet";

export function SpendingBreakdownSheet({ spending, onClose }: { spending?: SpendingInsight; onClose: () => void }) {
  const open = Boolean(spending && spending.categories.length > 0);
  const categories = spending?.categories ?? [];
  const top = categories[0];

  return (
    <BreakdownSheet
      open={open}
      onClose={onClose}
      label="Spending breakdown"
      eyebrow="Spending this month"
      title={money(spending?.this_month_mdl ?? 0)}
      rowsLabel="Where it went"
      explanation="Totals use the stored MDL value stamped on each expense when it was created."
      stats={
        <div className="grid grid-cols-2 gap-2">
          <SheetStat label="vs last month" value={spending ? trendText(spending) : "—"} icon={spending ? trendIcon(spending.trend) : undefined} />
          <SheetStat label="Biggest cost" value={top ? top.name : "—"} />
        </div>
      }
    >
      {categories.map((category, index) => (
        <CategoryRow key={category.name} category={category} index={index} />
      ))}
    </BreakdownSheet>
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
      <p className="mt-0.5 text-[11px] text-[#62685e]">{category.count} {entryNoun(category.name)}{category.count === 1 ? "" : "s"}{category.count > 1 ? ` · avg ${money(category.average_mdl)}` : ""}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
          <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(4, Math.round(category.share))}%` }} transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.2 + index * 0.05 }} className="block h-full rounded-full" style={{ backgroundColor: color }} />
        </span>
        <span className="w-10 shrink-0 text-right text-xs font-bold text-[#62685e]">{Math.round(category.share)}%</span>
      </div>
    </motion.div>
  );
}

// Per-category noun, all pluralize with a trailing "s".
function entryNoun(category: string) {
  const nouns: Record<string, string> = { Fuel: "fill-up", Maintenance: "service", Insurance: "payment", Inspection: "check", Tires: "purchase", Parking: "payment", Upgrades: "upgrade" };
  return nouns[category] ?? "expense";
}

function trendText(spending: SpendingInsight) {
  if (spending.trend === "first") return "First month";
  if (spending.trend === "flat") return "Same";
  return `${money(Math.abs(spending.delta_mdl))} ${spending.trend === "up" ? "more" : "less"}`;
}
