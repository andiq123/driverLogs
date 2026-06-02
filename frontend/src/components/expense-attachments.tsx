"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, deleteExpenseAttachment, errorMessage, getExpenseAttachmentPreview, getExpenseAttachments, uploadExpenseAttachment } from "@/lib/api";
import type { ExpenseAttachment } from "@/lib/types";
import { FilePreviewModal } from "./file-preview-modal";
import { ActionButton } from "./ui";

export function ExpenseAttachments({ expenseID, token }: { expenseID: string; token: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"upload" | "preview" | "delete" | undefined>();
  const [message, setMessage] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<ExpenseAttachment>();

  useEffect(() => {
    let active = true;
    getExpenseAttachments(token, expenseID)
      .then((files) => {
        if (active) setAttachments(files);
      })
      .catch((error) => {
        if (active) setMessage(errorMessage(error, "Could not load files."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [expenseID, token]);

  async function upload(file?: File | null) {
    if (!file) return;
    if (!isAllowedAttachment(file)) {
      setMessage("Only PDF or image files are supported.");
      return;
    }
    setAction("upload");
    setMessage("");
    try {
      const saved = await uploadExpenseAttachment(token, expenseID, file);
      setAttachments((current) => [saved, ...current]);
    } catch (error) {
      const fallback = error instanceof ApiError && error.status === 503 ? "File storage is not configured." : "Could not upload file.";
      setMessage(errorMessage(error, fallback));
    } finally {
      setAction(undefined);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function preview(attachment: ExpenseAttachment) {
    setAction("preview");
    setMessage("");
    setPreviewAttachment(attachment);
    setAction(undefined);
  }

  async function remove(attachment: ExpenseAttachment) {
    if (!window.confirm(`Remove ${attachment.file_name}?`)) return;
    setAction("delete");
    setMessage("");
    try {
      await deleteExpenseAttachment(token, expenseID, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      if (previewAttachment?.id === attachment.id) setPreviewAttachment(undefined);
    } catch (error) {
      setMessage(errorMessage(error, "Could not remove file."));
    } finally {
      setAction(undefined);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
      <div className="mt-2 rounded-[20px] border border-black/[0.055] bg-[#f7faf3] p-2.5 sm:rounded-[22px] sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Files</p>
            <p className="text-xs text-[#6b7065]">Private receipt or document attachments.</p>
          </div>
          <input ref={inputRef} className="hidden" type="file" accept={attachmentAccept} onChange={(event) => void upload(event.target.files?.[0])} />
          <ActionButton type="button" icon={Paperclip} loading={action === "upload"} variant="soft" onClick={() => inputRef.current?.click()} className="h-9 rounded-[14px] px-3 text-xs">Attach</ActionButton>
        </div>
        {message ? <p className="mt-2 rounded-[14px] bg-[#fff0ec] px-3 py-2 text-xs font-semibold text-[#9b3226]">{message}</p> : null}
        {loading ? (
          <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-xs font-semibold text-[#6b7065]"><Loader2 size={15} className="animate-spin" />Loading files</div>
        ) : attachments.length === 0 ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-left text-xs font-semibold text-[#6b7065] ring-1 ring-black/[0.04] transition-colors hover:text-[#151712]">
            <FileText size={16} />
            No files yet. Attach a receipt, insurance policy, or inspection paper.
          </button>
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
          {previewAttachment ? (
            <FilePreviewModal title="File preview" fileName={previewAttachment.file_name} load={() => getExpenseAttachmentPreview(token, expenseID, previewAttachment.id)} onClose={() => setPreviewAttachment(undefined)} />
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const attachmentAccept = "application/pdf,image/jpeg,image/png,image/webp";

function isAllowedAttachment(file: File) {
  return !file.type || attachmentAccept.split(",").includes(file.type);
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
