"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/api";

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logClientError({
        area: "window.error",
        message: event.message || "Unhandled browser error",
        detail: event.error instanceof Error ? event.error.stack || event.error.message : "",
        context: { source: event.filename ? new URL(event.filename, window.location.href).pathname : "", line: event.lineno },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "unknown rejection");
      logClientError({ area: "window.unhandledrejection", message: "Unhandled promise rejection", detail: reason });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
