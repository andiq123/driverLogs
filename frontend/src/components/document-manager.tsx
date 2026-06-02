"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import type { DocumentAttachment } from "@/lib/types";
import { ActionButton } from "./ui";

type DocumentManagerProps = {
  title: string;
  body: string;
  reloadKey: string;
  initialDocuments?: DocumentAttachment[];
  load: () => Promise<DocumentAttachment[]>;
  upload: (file: File) => Promise<DocumentAttachment>;
  preview: (documentID: string) => Promise<Blob>;
  remove: (documentID: string) => Promise<void>;
};

export function DocumentManager({ title, body, reloadKey, initialDocuments = [], load, upload, preview, remove }: DocumentManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef(load);
  const uploadRef = useRef(upload);
  const previewRef = useRef(preview);
  const removeRef = useRef(remove);
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(!initialDocuments.length);
  const [action, setAction] = useState<"upload" | "preview" | "delete" | undefined>();
  const [message, setMessage] = useState("");
  const [previewURL, setPreviewURL] = useState("");

  useEffect(() => {
    loadRef.current = load;
    uploadRef.current = upload;
    previewRef.current = preview;
    removeRef.current = remove;
  }, [load, upload, preview, remove]);

  useEffect(() => {
    let active = true;
    loadRef.current()
      .then((items) => {
        if (active) setDocuments(items);
      })
      .catch((error) => {
        if (active) setMessage(errorMessage(error, "Could not load documents."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
  }, [previewURL]);

  async function uploadPDF(file?: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setMessage("Only PDF files are supported.");
      return;
    }
    setAction("upload");
    setMessage("");
    try {
      const saved = await uploadRef.current(file);
      setDocuments((current) => [saved, ...current]);
      window.dispatchEvent(new Event("driverlogs:documents-updated"));
    } catch (error) {
      const fallback = error instanceof ApiError && error.status === 503 ? "File storage is not configured." : "Could not upload PDF.";
      setMessage(errorMessage(error, fallback));
    } finally {
      setAction(undefined);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openPDF(document: DocumentAttachment) {
    setAction("preview");
    setMessage("");
    try {
      const blob = await previewRef.current(document.id);
      if (previewURL) URL.revokeObjectURL(previewURL);
      setPreviewURL(URL.createObjectURL(blob));
    } catch (error) {
      setMessage(errorMessage(error, "Could not open PDF."));
    } finally {
      setAction(undefined);
    }
  }

  async function removePDF(document: DocumentAttachment) {
    if (!window.confirm(`Remove ${document.file_name}?`)) return;
    setAction("delete");
    setMessage("");
    try {
      await removeRef.current(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      window.dispatchEvent(new Event("driverlogs:documents-updated"));
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
        setPreviewURL("");
      }
    } catch (error) {
      setMessage(errorMessage(error, "Could not remove PDF."));
    } finally {
      setAction(undefined);
    }
  }

  return (
    <section className="rounded-[20px] border border-black/[0.055] bg-[#f7faf3] p-3 ring-1 ring-white/70 sm:rounded-[22px]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs leading-5 text-[#6b7065]">{body}</p>
        </div>
        <input ref={inputRef} className="hidden" type="file" accept="application/pdf" onChange={(event) => void uploadPDF(event.target.files?.[0])} />
        <ActionButton type="button" icon={Paperclip} loading={action === "upload"} variant="soft" onClick={() => inputRef.current?.click()} className="h-9 shrink-0 rounded-[14px] px-3 text-xs">Attach</ActionButton>
      </div>
      {message ? <p className="mt-2 rounded-[14px] bg-[#fff0ec] px-3 py-2 text-xs font-semibold text-[#9b3226]">{message}</p> : null}
      {loading ? (
        <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-xs font-semibold text-[#6b7065]"><Loader2 size={15} className="animate-spin" />Loading documents</div>
      ) : documents.length === 0 ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-left text-xs font-semibold text-[#6b7065] ring-1 ring-black/[0.04] transition-colors hover:text-[#151712]">
          <FileText size={16} />
          No PDF attached.
        </button>
      ) : (
        <div className="mt-3 grid gap-2">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-2 rounded-[16px] bg-white p-2 ring-1 ring-black/[0.04]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[13px] bg-[#edf4e7]"><FileText size={16} /></span>
              <button type="button" onClick={() => void openPDF(document)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{document.file_name}</span>
                <span className="text-xs text-[#6b7065]">{fileSize(document.size_bytes)}</span>
              </button>
              <button type="button" onClick={() => void removePDF(document)} className="flex size-9 shrink-0 items-center justify-center rounded-[13px] text-[#9b3226] transition-colors hover:bg-[#fff0ec]" aria-label={`Remove ${document.file_name}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {previewURL ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-3 overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold">Preview</p>
              <button type="button" onClick={() => setPreviewURL("")} className="flex size-8 items-center justify-center rounded-full bg-[#edf4e7]" aria-label="Close preview"><X size={16} /></button>
            </div>
            <iframe src={previewURL} title={`${title} PDF preview`} className="h-[65dvh] w-full bg-white" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
