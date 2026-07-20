"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, UserRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "./brand-mark";
import { controls, modalBackdropMotion, modalPanelMotion, popoverMotion } from "@/lib/theme";

export function LoginIDModal({ loginID, needsName, onCopy, onClose, onSaveName }: { loginID: string; needsName?: boolean; onCopy: () => void; onClose: () => void; onSaveName: (name: string) => void }) {
  const [step, setStep] = useState<"login" | "name">("login");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loginID) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [loginID, onClose]);

  if (!loginID || typeof document === "undefined") return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaveName(name.trim());
  }

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Save your login ID"
      className="fixed inset-0 z-50 grid place-items-center bg-[#151712]/45 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      {...modalBackdropMotion}
    >
      <motion.section className="w-full max-w-md rounded-[30px] bg-[#fbfcf8] p-5 shadow-[0_30px_100px_rgba(21,23,18,0.28)]" {...modalPanelMotion}>
        <AnimatePresence mode="wait">
          {step === "login" ? (
            <motion.div key="login" {...popoverMotion}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={48} />
                  <div>
                    <h2 className="text-xl font-semibold">Save your login ID</h2>
                    <p className="text-sm text-[#62685e]">This is the only ID you need to sign in.</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} className="flex size-10 touch-manipulation items-center justify-center rounded-[16px] bg-[#eef3e8] transition-[background-color,transform] duration-200 hover:bg-[#dfe7d4] active:scale-[0.985]">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 rounded-[24px] bg-[#eef3e8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#62685e]">Login ID</p>
                <p className="mt-2 select-all text-3xl font-semibold tracking-[0.08em]">{loginID}</p>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <button type="button" onClick={onCopy} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#151712] text-sm font-bold text-white transition-[transform,opacity] duration-200 active:scale-[0.985]">
                  <Copy size={17} />
                  Copy
                </button>
                <button type="button" onClick={() => (needsName ? setStep("name") : onClose())} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#dfe7d4] px-4 text-sm font-bold transition-[background-color,transform] duration-200 hover:bg-[#cbd9bf] active:scale-[0.985]">
                  <Check size={17} />
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form key="name" onSubmit={submit} {...popoverMotion}>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-[18px] bg-[#151712] text-white">
                  <UserRound size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">What should we call you?</h2>
                  <p className="text-sm text-[#62685e]">Your name stays in DriverLogs settings.</p>
                </div>
              </div>
              <label className="mt-5 grid gap-1 text-sm font-semibold">
                Name
                <input value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={80} autoFocus className={controls.input} />
              </label>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <button type="submit" className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#151712] text-sm font-bold text-white transition-[transform,opacity] duration-200 active:scale-[0.985]">
                  <Check size={17} />
                  Save
                </button>
                <button type="button" onClick={onClose} className="h-12 touch-manipulation rounded-[18px] bg-[#dfe7d4] px-4 text-sm font-bold transition-[background-color,transform] duration-200 hover:bg-[#cbd9bf] active:scale-[0.985]">Skip</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
