import type { ReactNode } from "react";
import type { View } from "@/lib/types";
import { mobileNavItems, navItems } from "@/lib/theme";
import { BrandMark } from "./brand-mark";
import { UserCard } from "./user-card";

export function AppShell({ view, userName, onLogout, onViewChange, children }: { view: View; userName?: string; onLogout: () => void; onViewChange: (view: View) => void; children: ReactNode }) {
  const displayName = userName?.trim() || "User";
  const title = view === "Settings" ? "Profile" : view;
  return (
    <main className="min-h-dvh bg-[#f5f7f2] text-[#151712]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[96rem] gap-4 px-2 pb-[calc(4.35rem+env(safe-area-inset-bottom))] pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 lg:px-6 lg:py-3 xl:gap-6">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 flex-col rounded-[28px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_18px_64px_rgba(31,41,28,0.10)] lg:flex">
          <Brand />
          <Nav view={view} onViewChange={onViewChange} />
          <div className="mt-6 rounded-[24px] bg-[#eef3e8] p-4">
            <p className="text-sm font-semibold">Clean app data</p>
            <p className="mt-1 text-xs leading-5 text-[#62685e]">Only records created in DriverLogs are shown here.</p>
          </div>
          <UserCard userName={displayName} onOpenSettings={() => onViewChange("Settings")} onLogout={onLogout} />
        </aside>

        <section className="min-w-0 flex-1 lg:pb-3">
          <header className="sticky top-0 z-20 -mx-2 border-b border-black/[0.06] bg-[#f5f7f2]/88 px-3 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-5 sm:px-5 sm:pb-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))] lg:relative lg:mx-0 lg:border-none lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#70776a] sm:text-xs">Monday, June 1</p>
                <h1 className="mt-0.5 truncate text-[28px] font-semibold leading-none tracking-tight sm:mt-1 sm:text-4xl">{title}</h1>
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.08] bg-[#fbfcf8]/94 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNavItems.map((item) => (
            <button key={item.label} aria-label={item.label} onClick={() => onViewChange(item.label)} className={`flex h-11 touch-manipulation flex-col items-center justify-center gap-1 rounded-[16px] text-[11px] font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.985] ${view === item.label ? "bg-[#e6f0df] text-[#151712]" : "text-[#70776a]"}`}>
              <item.icon size={18} />
              <span className="sr-only">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <BrandMark />
      <div>
        <p className="text-lg font-semibold leading-tight">DriverLogs</p>
        <p className="text-xs text-[#6b7065]">Vehicle cost control</p>
      </div>
    </div>
  );
}

function Nav({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
  return (
    <nav className="mt-7 grid gap-1">
      {navItems.map((item) => (
        <button key={item.label} onClick={() => onViewChange(item.label)} className={`flex h-12 items-center gap-3 rounded-[18px] px-3 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.985] ${view === item.label ? "bg-[#e6f0df] text-[#151712]" : "text-[#62685e] hover:bg-black/[0.04]"}`}>
          <item.icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
