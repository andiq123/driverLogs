"use client";

import { useCallback, useState } from "react";
import type { ToastKind, ToastMessage } from "./types";

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = Date.now();
    setToasts((current) => [...current.slice(-2), { id, kind, title, body }]);
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  return { dismissToast, showToast, toasts };
}

