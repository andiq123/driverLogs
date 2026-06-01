"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let registration: ServiceWorkerRegistration | undefined;
    let updateTimer: number | undefined;

    const notifyUpdate = () => {
      window.dispatchEvent(new CustomEvent("driverlogs:pwa-update"));
    };

    const activateWaitingWorker = () => {
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    };

    const checkForUpdate = () => {
      if (document.visibilityState !== "visible") return;
      void registration?.update();
    };

    const reloadOnActivation = () => {
      if (refreshing) return;
      refreshing = true;
      notifyUpdate();
      window.setTimeout(() => window.location.reload(), 350);
    };

    const notifyFromWorker = (event: MessageEvent) => {
      if (event.data?.type === "APP_UPDATED") notifyUpdate();
    };

    const register = async () => {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      activateWaitingWorker();
      registration.addEventListener("updatefound", () => {
        const worker = registration?.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            notifyUpdate();
            activateWaitingWorker();
          }
        });
      });
      checkForUpdate();
      updateTimer = window.setInterval(checkForUpdate, 30 * 60 * 1000);
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnActivation);
    navigator.serviceWorker.addEventListener("message", notifyFromWorker);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }

    return () => {
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnActivation);
      navigator.serviceWorker.removeEventListener("message", notifyFromWorker);
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  return null;
}
