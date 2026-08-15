"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { modalBackdropMotion } from "@/lib/theme";

// Shared iOS-style bottom sheet: dimmed backdrop, grab handle, drag-to-dismiss,
// Escape to close, scroll lock. Content sheets (fuel, driving, …) only supply
// their body so the shell behaviour lives in one place.
export const sheetSpring = { type: "spring", stiffness: 320, damping: 33 } as const;

export function BottomSheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("[data-sheet-close]")?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  const node = (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" {...modalBackdropMotion} />
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.03, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className="relative z-[1] w-full max-w-lg touch-none rounded-t-[32px] bg-[#fbfcf8] shadow-[0_-18px_64px_rgba(21,23,18,0.24)] ring-1 ring-white/70"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-black/[0.14]" />
            <div className="max-h-[82dvh] touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              {children}
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document === "undefined" ? null : createPortal(node, document.body);
}

export function SheetHeader({ eyebrow, title, unit, onClose }: { eyebrow: string; title: string; unit?: string; onClose: () => void }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{eyebrow}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{title} {unit ? <span className="text-base font-bold text-[#62685e]">{unit}</span> : null}</p>
      </div>
      <button type="button" data-sheet-close onClick={onClose} aria-label="Close details" className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/[0.05] text-[#62685e] outline-none transition-[background-color,transform] duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#9db89a] hover:bg-black/[0.08]">
        <X size={16} />
      </button>
    </header>
  );
}

// Shared chrome for the breakdown sheets: header, a stats block, a labelled row
// list, and an explanation. Only the row bodies differ, so each sheet just maps
// its rows into `children` and supplies the surrounding pieces.
export function BreakdownSheet({ open, onClose, label, eyebrow, title, unit, stats, rowsLabel, explanation, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  eyebrow: string;
  title: string;
  unit?: string;
  stats: ReactNode;
  rowsLabel: ReactNode;
  explanation: ReactNode;
  children: ReactNode;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label={label}>
      <SheetHeader eyebrow={eyebrow} title={title} unit={unit} onClose={onClose} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sheetSpring, delay: 0.08 }} className="mt-4">
        {stats}
      </motion.div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{rowsLabel}</p>
      {/* grid-cols-1 = minmax(0,1fr): a wide row can't stretch the column and push the list off-screen */}
      <div className="mt-2 grid grid-cols-1 gap-2">{children}</div>
      <p className="mt-4 text-xs leading-5 text-[#6b7065]">{explanation}</p>
    </BottomSheet>
  );
}

// Small stat badge + trend arrow shared by the breakdown sheets.
export function SheetStat({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon?: typeof TrendingUp; tone?: "good" | "warn" | "neutral" }) {
  const color = tone === "good" ? "text-[#24603c]" : tone === "warn" ? "text-[#8a6200]" : "text-[#30342e]";
  return (
    <div className="rounded-[18px] bg-[#eef3e8]/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#62685e]">{label}</p>
      <p className={`mt-1 inline-flex items-center gap-1.5 truncate text-sm font-bold ${color}`}>{Icon ? <Icon size={14} className="shrink-0" /> : null}{value}</p>
    </div>
  );
}

export function trendIcon(trend: "up" | "down" | "flat" | "first") {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;
  return Minus;
}

export function formatSheetDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
