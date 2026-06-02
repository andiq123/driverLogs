"use client";

import { Loader2, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";

type FilePreviewModalProps = {
  title: string;
  fileName: string;
  load: () => Promise<Blob>;
  onClose: () => void;
};

export function FilePreviewModal({ title, fileName, load, onClose }: FilePreviewModalProps) {
  const loadRef = useRef(load);
  const [blob, setBlob] = useState<Blob>();
  const [url, setURL] = useState("");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Loading file...");
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
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid bg-[#151712]/72 p-0 backdrop-blur-sm">
      <section className="flex h-dvh w-dvw flex-col overflow-hidden bg-[#fbfcf8]">
        <div className="flex min-h-14 items-center justify-between gap-2 border-b border-black/[0.06] bg-[#fffffb]/96 px-3 py-2 shadow-[0_8px_24px_rgba(31,41,28,0.08)] sm:px-4">
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
            <button type="button" onClick={onClose} className="flex size-9 touch-manipulation items-center justify-center rounded-[13px] bg-[#151712] text-white" aria-label="Close preview">
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
          <div className="grid flex-1 overflow-auto bg-[#eef3e8] p-3 sm:p-5">
            {previewType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={fileName} style={{ width: `${100 * zoom}%`, maxWidth: "none" }} className="m-auto block origin-top rounded-[12px] bg-white shadow-[0_16px_48px_rgba(31,41,28,0.18)]" />
            ) : (
              <iframe src={url} title={title} style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%`, minHeight: "100%" }} className="origin-top-left bg-white shadow-[0_16px_48px_rgba(31,41,28,0.18)]" />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function filePreviewType(contentType = "", fileName = "") {
  const lowerName = fileName.toLowerCase();
  if (contentType.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(lowerName)) return "image";
  return "document";
}
