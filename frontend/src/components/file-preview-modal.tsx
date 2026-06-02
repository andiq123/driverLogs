"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { errorMessage } from "@/lib/api";
import { calmEase, modalBackdropMotion, modalPanelMotion } from "@/lib/theme";

type FilePreviewModalProps = {
  title: string;
  fileName: string;
  load: () => Promise<Blob>;
  onClose: () => void;
};

export function FilePreviewModal({ title, fileName, load, onClose }: FilePreviewModalProps) {
  const loadRef = useRef(load);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [blob, setBlob] = useState<Blob>();
  const [url, setURL] = useState("");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Loading file...");
  const [isClosing, setIsClosing] = useState(false);
  const previewType = useMemo(() => filePreviewType(blob?.type, fileName), [blob?.type, fileName]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    let active = true;
    let objectURL = "";
    void loadRef.current()
      .then((loadedBlob) => {
        if (!active) return;
        objectURL = URL.createObjectURL(loadedBlob);
        setBlob(loadedBlob);
        setURL(objectURL);
        setStatus("");
      })
      .catch((error) => setStatus(errorMessage(error, "Could not open file.")));
    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  function close() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 260);
  }

  const modal = (
    <AnimatePresence>
      {!isClosing ? (
        <motion.div className="fixed inset-0 z-[2000] grid bg-[#151712]/76 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={title} {...modalBackdropMotion}>
      <button type="button" aria-label="Close preview backdrop" onClick={close} className="absolute inset-0 cursor-default" />
      <motion.section className="relative z-[1] flex h-dvh w-dvw flex-col overflow-hidden bg-[#fbfcf8] shadow-[0_28px_96px_rgba(0,0,0,0.28)] sm:m-auto sm:h-[min(92dvh,56rem)] sm:w-[min(94dvw,72rem)] sm:rounded-[28px]" {...modalPanelMotion}>
        <div className="flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 border-b border-black/[0.06] bg-[#fffffb]/96 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shadow-[0_8px_24px_rgba(31,41,28,0.08)] sm:min-h-14 sm:px-4 sm:pt-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{title}</p>
            <p className="truncate text-xs text-[#6b7065]">{fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.7, Number((value - 0.1).toFixed(2))))} className="flex size-9 touch-manipulation items-center justify-center rounded-[13px] bg-[#edf4e7]" aria-label="Zoom out">
              <Minus size={16} />
            </button>
            <span className="min-w-12 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.1).toFixed(2))))} className="flex size-9 touch-manipulation items-center justify-center rounded-[13px] bg-[#edf4e7]" aria-label="Zoom in">
              <Plus size={16} />
            </button>
            <button type="button" onClick={() => setZoom(1)} className="hidden size-9 touch-manipulation items-center justify-center rounded-[13px] bg-[#edf4e7] sm:flex" aria-label="Reset zoom">
              <RotateCcw size={16} />
            </button>
            <button type="button" onClick={close} className="flex size-9 touch-manipulation items-center justify-center rounded-[13px] bg-[#151712] text-white transition-transform duration-200 active:scale-[0.985]" aria-label="Close preview">
              <X size={16} />
            </button>
          </div>
        </div>
        {status ? (
          <div className="grid flex-1 place-items-center text-sm font-semibold text-[#6b7065]">
            {status === "Loading file..." ? <span className="flex items-center gap-2"><Loader2 size={17} className="animate-spin" />{status}</span> : status}
          </div>
        ) : null}
        {url ? (
          <div className="file-preview-scroll flex flex-1 overflow-auto bg-[#eef3e8] p-3 sm:p-5">
            {previewType === "image" ? (
              <div className="m-auto min-h-full min-w-full touch-pan-x touch-pan-y select-none p-2">
                <motion.img src={url} alt={fileName} draggable={false} onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)} style={{ width: `${100 * zoom}%`, maxWidth: "none" }} initial={{ opacity: 0, scale: 0.985, filter: "blur(5px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.34, ease: calmEase }} className="mx-auto block max-h-none origin-center rounded-[12px] bg-white shadow-[0_16px_48px_rgba(31,41,28,0.18)] transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]" />
              </div>
            ) : (
              <motion.iframe src={url} title={title} style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%`, minHeight: "100%" }} initial={{ opacity: 0, scale: 0.992 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: calmEase }} className="origin-top-left bg-white shadow-[0_16px_48px_rgba(31,41,28,0.18)]" />
            )}
          </div>
        ) : null}
      </motion.section>
    </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document === "undefined" ? null : createPortal(modal, document.body);
}

function filePreviewType(contentType = "", fileName = "") {
  const lowerName = fileName.toLowerCase();
  if (contentType.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(lowerName)) return "image";
  return "document";
}
