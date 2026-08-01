"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createElement, useState } from "react";
import { primaryCategories, secondaryCategories, categoryIcon, softSpring } from "@/lib/theme";
import type { ExpenseCategory } from "@/lib/types";

type ExpenseCategoryPickerProps = {
  name: string;
  value: ExpenseCategory;
  onChange: (value: ExpenseCategory) => void;
};

export function ExpenseCategoryPicker({ name, value, onChange }: ExpenseCategoryPickerProps) {
  const valueIsSecondary = secondaryCategories.includes(value);
  const [showMore, setShowMore] = useState(valueIsSecondary);

  return (
    <section className="grid gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-4 gap-1.5">
        {primaryCategories.map((category) => (
          <CategoryChip key={category} category={category} active={category === value} onChange={onChange} />
        ))}
      </div>
      <AnimatePresence initial={false}>
        {showMore ? (
          <motion.div
            key="more-categories"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={softSpring}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {secondaryCategories.map((category) => (
                <CategoryChip key={category} category={category} active={category === value} onChange={onChange} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setShowMore((open) => !open)}
        className="justify-self-start text-xs font-bold text-[#62685e] transition-colors hover:text-[#151712]"
      >
        {showMore ? "Fewer categories" : "More categories"}
      </button>
    </section>
  );
}

function CategoryChip({ category, active, onChange }: { category: ExpenseCategory; active: boolean; onChange: (value: ExpenseCategory) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(category)}
      className={`relative flex h-[3.6rem] touch-manipulation flex-col items-center justify-center gap-1 overflow-hidden rounded-[16px] border px-1 text-[11px] font-bold transition-[border-color,color,transform] duration-300 active:scale-[0.985] ${
        active ? "border-[#151712]/10 text-[#151712]" : "border-black/[0.06] text-[#62685e] hover:text-[#151712]"
      }`}
    >
      {active ? <motion.span layoutId="expense-category-active" className="absolute inset-0 bg-[#e6f0df]" transition={softSpring} /> : null}
      <span className="relative flex size-6 items-center justify-center rounded-full bg-white/70">
        {createElement(categoryIcon(category), { size: 14 })}
      </span>
      <span className="relative max-w-full truncate">{categoryLabel(category)}</span>
    </button>
  );
}

function categoryLabel(category: ExpenseCategory) {
  if (category === "Maintenance") return "Service";
  if (category === "Insurance") return "Insure";
  if (category === "Inspection") return "ITP";
  if (category === "Upgrades") return "Upgrade";
  if (category === "Miscellaneous") return "Other";
  return category;
}
