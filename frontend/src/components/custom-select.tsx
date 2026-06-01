"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { controls, popoverMotion } from "@/lib/theme";

type CustomSelectProps = {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
  icon?: LucideIcon;
  onChange: (value: string) => void;
};

export function CustomSelect({ label, name, options, value, icon: Icon, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)));
  const [menuRect, setMenuRect] = useState<DOMRect>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function updateMenuRect() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setMenuRect(rect);
    }
    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [isOpen]);

  function choose(option: string) {
    onChange(option);
    setActiveIndex(Math.max(0, options.indexOf(option)));
    setIsOpen(false);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") setIsOpen(false);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) choose(options[activeIndex]);
      else {
        setActiveIndex(Math.max(0, options.indexOf(value)));
        setIsOpen(true);
      }
    }
  }

  return (
    <label className={`relative grid min-w-0 gap-1 text-sm font-semibold ${isOpen ? "z-50" : "z-0"}`}>
      <span className="sr-only">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={keyDown}
        className={`relative ${controls.trigger} ${Icon ? "pl-10" : ""}`}
      >
        {Icon ? <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" /> : null}
        <span className="truncate">{value}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#62685e] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" ? createPortal(
        <AnimatePresence>
          {isOpen && menuRect ? (
            <motion.div
              role="listbox"
              className="fixed z-[1000] max-h-56 overflow-auto rounded-[22px] border border-black/[0.08] bg-[#fbfcf8] p-1 shadow-[0_18px_48px_rgba(31,41,28,0.16)]"
              style={{ left: menuRect.left, top: menuRect.bottom + 8, width: menuRect.width }}
              {...popoverMotion}
            >
              {options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${controls.menuItem} ${index === activeIndex ? "bg-[#e6f0df] text-[#151712]" : "text-[#30342e] hover:bg-[#f1f4ec]"}`}
                >
                  <span className="truncate">{option}</span>
                  {option === value ? <Check size={14} /> : null}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </label>
  );
}
