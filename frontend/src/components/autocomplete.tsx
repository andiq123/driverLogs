"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { controls, popoverMotion } from "@/lib/theme";

type AutocompleteProps = {
  label: string;
  name: string;
  options: string[];
  value: string;
  maxLength?: number;
  icon?: LucideIcon;
  isAutofilled?: boolean;
  onChange: (value: string) => void;
};

export function Autocomplete({ label, name, options, value, maxLength, icon: Icon, isAutofilled = false, onChange }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bounds, setBounds] = useState<DOMRect>();
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => filterOptions(options, value), [options, value]);
  const listID = `${name}-options`;

  useEffect(() => {
    if (!isOpen) return;
    const updateBounds = () => setBounds(inputRef.current?.getBoundingClientRect());
    updateBounds();
    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, true);
    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds, true);
    };
  }, [isOpen]);

  function choose(option: string) {
    onChange(option);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function change(nextValue: string) {
    onChange(nextValue);
    setIsOpen(true);
    setActiveIndex(0);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (!matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      choose(matches[activeIndex]);
    }
  }

  return (
    <label className="relative grid min-w-0 gap-1 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        {Icon ? <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#62685e]" /> : null}
        <input
          ref={inputRef}
          name={name}
          value={value}
          maxLength={maxLength}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listID}
          aria-autocomplete="list"
          onBlur={() => setIsOpen(false)}
          onChange={(event) => change(event.currentTarget.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={keyDown}
          placeholder={label}
          className={`${controls.input} ${Icon ? "pl-10" : ""} ${isAutofilled ? "border-[#0f8f68]/30 bg-[#eef6e9] shadow-[0_0_0_4px_rgba(15,143,104,0.08)]" : ""}`}
        />
      </span>
      <AnimatePresence>
        {isOpen && matches.length && bounds ? createPortal((
          <motion.div
            id={listID}
            role="listbox"
            style={{ left: bounds.left, top: bounds.bottom + 8, width: bounds.width }}
            className="fixed z-[1000] max-h-56 overflow-auto rounded-[22px] border border-black/[0.08] bg-[#fbfcf8] p-1 shadow-[0_18px_48px_rgba(31,41,28,0.16)]"
            {...popoverMotion}
          >
            {matches.map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${controls.menuItem} ${index === activeIndex ? "bg-[#e6f0df] text-[#151712]" : "text-[#30342e] hover:bg-[#f1f4ec]"}`}
              >
                {option}
              </button>
            ))}
          </motion.div>
        ), document.body) : null}
      </AnimatePresence>
    </label>
  );
}

function filterOptions(options: string[], value: string) {
  const query = value.trim().toLowerCase();
  const filtered = query ? options.filter((option) => option.toLowerCase().includes(query)) : options;
  return filtered.slice(0, 12);
}
