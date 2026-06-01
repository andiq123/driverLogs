"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastMessage } from "@/lib/types";
import { calmEase } from "@/lib/theme";

export function ToastCenter({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] mx-auto grid w-full max-w-md gap-2 px-3 sm:right-4 sm:left-auto sm:mx-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertCircle : Info;
          return (
            <motion.section
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.97, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.34, ease: calmEase }}
              className={`pointer-events-auto flex items-start gap-3 rounded-[24px] border p-3 shadow-[0_18px_60px_rgba(31,41,28,0.16)] ${toast.kind === "error" ? "border-[#ffd5cb] bg-[#fff1ed]" : toast.kind === "success" ? "border-[#d7e4cb] bg-[#eef3e8]" : "border-black/[0.06] bg-[#fbfcf8]"}`}
            >
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-[14px] ${toast.kind === "error" ? "bg-[#ffe0d8] text-[#8b2d20]" : "bg-[#dfe7d4] text-[#151712]"}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{toast.title}</p>
                {toast.body ? <p className="mt-0.5 text-xs leading-5 text-[#62685e]">{toast.body}</p> : null}
              </div>
              <button aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-[#62685e] transition-[background-color,transform] duration-200 hover:bg-black/5 active:scale-[0.985]">
                <X size={15} />
              </button>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
