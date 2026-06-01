"use client";

import { motion } from "framer-motion";
import { categories, categoryIcon, softSpring } from "@/lib/theme";
import type { ExpenseCategory } from "@/lib/types";

type ExpenseCategoryPickerProps = {
  name: string;
  value: ExpenseCategory;
  onChange: (value: ExpenseCategory) => void;
};

export function ExpenseCategoryPicker({ name, value, onChange }: ExpenseCategoryPickerProps) {
  return (
    <section className="grid gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {categories.map((category) => {
          const Icon = categoryIcon(category);
          const active = category === value;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(category)}
              className={`relative flex h-16 touch-manipulation flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border px-2 text-xs font-bold transition-[border-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] ${
                active ? "border-[#151712]/10 text-[#151712]" : "border-black/[0.06] text-[#62685e] hover:text-[#151712]"
              }`}
            >
              {active ? <motion.span layoutId="expense-category-active" className="absolute inset-0 bg-[#e6f0df]" transition={softSpring} /> : null}
              <motion.span animate={{ scale: active ? 1.06 : 1 }} transition={softSpring} className="relative flex size-7 items-center justify-center rounded-full bg-white/70">
                <Icon size={15} />
              </motion.span>
              <span className="relative max-w-full truncate">{categoryLabel(category)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function categoryLabel(category: ExpenseCategory) {
  if (category === "Maintenance") return "Service";
  if (category === "Inspection") return "ITP";
  if (category === "Miscellaneous") return "Other";
  return category;
}
