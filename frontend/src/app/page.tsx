"use client";

import { LoginView } from "@/components/login-view";
import { ToastCenter } from "@/components/toast-center";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { ViewSkeleton } from "@/components/ui";
import { useDriverLogsApp } from "@/lib/use-driverlogs-app";

export default function HomePage() {
  const app = useDriverLogsApp();

  if (!app.isAuthReady) {
    return (
      <main className="min-h-dvh bg-[#f5f7f2] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-[#151712] sm:px-5">
        <div className="mx-auto w-full max-w-[96rem]">
          <header className="pb-3">
            <div className="h-3 w-36 animate-pulse rounded-full bg-[#dfe7d4]" />
            <div className="mt-3 h-9 w-48 animate-pulse rounded-full bg-[#dfe7d4]" />
          </header>
          <ViewSkeleton />
        </div>
        <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
      </main>
    );
  }

  if (!app.token) {
    return (
      <>
        <LoginView savedLoginID={app.loginID} status={app.authStatus} feedback={app.authFeedback} action={app.authAction} onClearStatus={app.clearAuthStatus} onCreate={app.createLogin} onDemo={app.startDemo} onLogin={app.signIn} />
        <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
      </>
    );
  }

  return (
    <>
      <AuthenticatedApp app={app} />
      <ToastCenter toasts={app.toasts} onDismiss={app.dismissToast} />
    </>
  );
}
