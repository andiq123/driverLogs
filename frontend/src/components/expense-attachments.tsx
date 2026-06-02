"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, deleteExpenseAttachment, errorMessage, getExpenseAttachmentPreview, getExpenseAttachments, uploadExpenseAttachment } from "@/lib/api";
import type { ExpenseAttachment } from "@/lib/types";
import { ActionButton, EmptyState } from "./ui";

export function ExpenseAttachments({ expenseID, token }: { expenseID: string; token: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"upload" | "preview" | "delete" | undefined>();
  const [message, setMessage] = useState("");
  const [previewURL, setPreviewURL] = useState("");

  useEffect(() => {
    let active = true;
    getExpenseAttachments(token, expenseID)
      .then((files) => {
        if (active) setAttachments(files);
      })
      .catch((error) => {
        if (active) setMessage(errorMessage(error, "Could not load PDFs."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [expenseID, token]);

  useEffect(() => () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
  }, [previewURL]);

  async function upload(file?: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setMessage("Only PDF files are supported.");
      return;
    }
    setAction("upload");
    setMessage("");
    try {
      const saved = await uploadExpenseAttachment(token, expenseID, file);
      setAttachments((current) => [saved, ...current]);
    } catch (error) {
      const fallback = error instanceof ApiError && error.status === 503 ? "File storage is not configured." : "Could not upload PDF.";
      setMessage(errorMessage(error, fallback));
    } finally {
      setAction(undefined);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function preview(attachment: ExpenseAttachment) {
    setAction("preview");
    setMessage("");
    try {
      const blob = await getExpenseAttachmentPreview(token, expenseID, attachment.id);
      if (previewURL) URL.revokeObjectURL(previewURL);
      setPreviewURL(URL.createObjectURL(blob));
    } catch (error) {
      setMessage(errorMessage(error, "Could not open PDF."));
    } finally {
      setAction(undefined);
    }
  }

  async function remove(attachment: ExpenseAttachment) {
    if (!window.confirm(`Remove ${attachment.file_name}?`)) return;
    setAction("delete");
    setMessage("");
    try {
      await deleteExpenseAttachment(token, expenseID, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
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
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
      <div className="mt-2 rounded-[20px] border border-black/[0.055] bg-[#f7faf3] p-2.5 sm:rounded-[22px] sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">PDF files</p>
            <p className="text-xs text-[#6b7065]">Private receipt or document attachments.</p>
          </div>
          <input ref={inputRef} className="hidden" type="file" accept="application/pdf" onChange={(event) => void upload(event.target.files?.[0])} />
          <ActionButton type="button" icon={Paperclip} loading={action === "upload"} variant="soft" onClick={() => inputRef.current?.click()} className="h-9 rounded-[14px] px-3 text-xs">Attach</ActionButton>
        </div>
        {message ? <p className="mt-2 rounded-[14px] bg-[#fff0ec] px-3 py-2 text-xs font-semibold text-[#9b3226]">{message}</p> : null}
        {loading ? (
          <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-xs font-semibold text-[#6b7065]"><Loader2 size={15} className="animate-spin" />Loading PDFs</div>
        ) : attachments.length === 0 ? (
          <div className="mt-3"><EmptyState icon={FileText} title="No PDFs attached" body="Attach receipts, insurance policies, or inspection papers to this expense." /></div>
        ) : (
          <div className="mt-3 grid gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 rounded-[16px] bg-white p-2 ring-1 ring-black/[0.04]">
                <span className="flex size-9 items-center justify-center rounded-[13px] bg-[#edf4e7]"><FileText size={16} /></span>
                <button type="button" onClick={() => void preview(attachment)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold">{attachment.file_name}</span>
                  <span className="text-xs text-[#6b7065]">{fileSize(attachment.size_bytes)}</span>
                </button>
                <button type="button" onClick={() => void remove(attachment)} className="flex size-9 items-center justify-center rounded-[13px] text-[#9b3226] transition-colors hover:bg-[#fff0ec]" aria-label={`Remove ${attachment.file_name}`}>
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
              <iframe src={previewURL} title="PDF preview" className="h-[65dvh] w-full bg-white" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
