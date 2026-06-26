"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { calmEase, controls, popoverMotion } from "@/lib/theme";
import { useAnchorRect } from "@/lib/use-anchor-rect";

type CustomSelectProps = {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
  icon?: LucideIcon;
  showLabel?: boolean;
  onChange: (value: string) => void;
};

export function CustomSelect({ label, name, options, value, icon: Icon, showLabel = false, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rect = useAnchorRect(buttonRef, isOpen);

  function choose(option: string) {
    onChange(option);
    setActiveIndex(Math.max(0, options.indexOf(option)));
    setIsOpen(false);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") setIsOpen(false);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) choose(options[activeIndex]);
      else { setActiveIndex(Math.max(0, options.indexOf(value))); setIsOpen(true); }
    }
  }

  return (
    <label className={`relative grid min-w-0 gap-1 text-sm font-semibold ${isOpen ? "z-50" : "z-0"}`}>
      <span className={showLabel ? "px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#70776a]" : "sr-only"}>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button ref={buttonRef} type="button" aria-haspopup="listbox" aria-expanded={isOpen} aria-label={label} onBlur={() => setIsOpen(false)} onClick={() => setIsOpen((open) => !open)} onKeyDown={keyDown} className={`${controls.trigger} ${Icon ? "pl-10" : ""}`}>
        {Icon ? <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" /> : null}
        <span className="truncate">{value}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#62685e] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {typeof document === "undefined" ? null : createPortal(
        <AnimatePresence>
          {isOpen && rect ? (
            <motion.ul role="listbox" {...popoverMotion} style={{ left: rect.left, top: rect.bottom + 8, width: rect.width }} className="fixed z-[1000] max-h-60 origin-top overflow-auto rounded-[20px] border border-black/[0.06] bg-[#fbfcf8]/95 p-1.5 shadow-[0_20px_56px_rgba(31,41,28,0.18)] ring-1 ring-white/70 backdrop-blur-xl">
              {options.map((option, index) => (
                <motion.li key={option} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: calmEase, delay: 0.03 + index * 0.022 }}>
                  <button type="button" role="option" aria-selected={option === value} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className={`flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2.5 text-left text-sm ${controls.menuItem} ${index === activeIndex ? "bg-[#e6f0df] text-[#151712]" : "text-[#30342e] hover:bg-[#f1f4ec]"}`}>
                    <span className="truncate">{option}</span>
                    {option === value ? <Check size={14} className="shrink-0 text-[#24603c]" /> : null}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </label>
  );
}
