"use client";

export const authDebugEventName = "driverlogs:auth-debug";

export type AuthDebugEvent = {
  title: string;
  body?: string;
  kind?: "info" | "success" | "error";
};

export function emitAuthDebug(event: AuthDebugEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthDebugEvent>(authDebugEventName, { detail: event }));
}
