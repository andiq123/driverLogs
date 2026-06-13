"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { View } from "@/lib/types";
import { mobileNavItems, navItems } from "@/lib/theme";
import { BrandMark } from "./brand-mark";
import { UserCard } from "./user-card";

export function AppShell({ view, userName, onLogout, onViewChange, children }: { view: View; userName?: string; onLogout: () => void; onViewChange: (view: View) => void; children: ReactNode }) {
  const displayName = userName?.trim() || "User";
  const title = view === "Settings" ? "Profile" : view;
  const today = useTodayLabel();
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f5f7f2] text-[#151712] lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[118rem] gap-4 overflow-x-hidden px-2 pb-[calc(5.6rem+env(safe-area-inset-bottom))] pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 lg:h-dvh lg:px-6 lg:py-3 lg:pb-3 xl:gap-6">
        <aside className="hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 flex-col rounded-[28px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_18px_64px_rgba(31,41,28,0.10)] lg:flex">
          <Brand />
          <Nav view={view} onViewChange={onViewChange} />
          <div className="mt-auto">
            <UserCard userName={displayName} onOpenSettings={() => onViewChange("Settings")} onLogout={onLogout} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
          <header className="sticky top-0 z-20 -mx-2 border-b border-black/[0.06] bg-[#f5f7f2]/88 px-3 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-5 sm:px-5 sm:pb-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))] lg:relative lg:mx-0 lg:mt-4 lg:flex lg:h-16 lg:shrink-0 lg:items-center lg:border-none lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[30px] font-semibold leading-none tracking-tight sm:text-4xl">{title}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-[18px] border border-black/[0.055] bg-[#fffffb]/82 px-2.5 py-2 text-right shadow-[0_8px_24px_rgba(31,41,28,0.055)] ring-1 ring-white/70 sm:px-3">
                <CalendarDays size={17} className="text-[#62685e]" />
                <span className="grid leading-none">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#70776a] sm:text-[10px]">{today.weekday}</span>
                  <span className="mt-1 text-xs font-bold text-[#151712] sm:text-sm">{today.monthDay}</span>
                </span>
              </div>
            </div>
          </header>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-3">{children}</div>
        </section>
      </div>

      <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-[max(0.7rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:hidden">
        <div className="app-tab-bar pointer-events-auto flex w-full max-w-xs items-center gap-1 rounded-full border border-white/65 bg-[#fbfcf8]/74 p-1.5 shadow-[0_22px_56px_rgba(31,41,28,0.20),0_2px_10px_rgba(31,41,28,0.08)] ring-1 ring-black/[0.05] backdrop-blur-2xl backdrop-saturate-150">
          {mobileNavItems.map((item) => {
            const active = view === item.label;
            return (
              <motion.button key={item.label} aria-label={item.label} aria-current={active ? "page" : undefined} onClick={() => onViewChange(item.label)} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 480, damping: 32 }} className={`relative flex h-12 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#9db89a] ${active ? "text-[#1c3a26]" : "text-[#70776a]"}`}>
                {active ? <motion.span layoutId="mobile-nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-[#e6f0df] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_6px_rgba(31,41,28,0.08)]" /> : null}
                <item.icon size={21} className="relative shrink-0" />
                <span className="sr-only">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function useTodayLabel() {
  const [today, setToday] = useState(formatTodayLabel);

  useEffect(() => {
    const refresh = () => setToday(formatTodayLabel());
    refresh();
    const interval = window.setInterval(refresh, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return today;
}

function formatTodayLabel() {
  const now = new Date();
  return {
    weekday: new Intl.DateTimeFormat("en", { weekday: "long" }).format(now),
    monthDay: new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(now),
  };
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 px-2">
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
      {navItems.map((item) => {
        const active = view === item.label;
        return (
          <motion.button key={item.label} aria-current={active ? "page" : undefined} onClick={() => onViewChange(item.label)} whileTap={{ scale: 0.985 }} className={`relative flex h-12 items-center gap-3 rounded-[18px] px-3 text-sm font-medium transition-colors duration-300 ${active ? "text-[#151712]" : "text-[#62685e] hover:bg-black/[0.04]"}`}>
            {active ? <motion.span layoutId="side-nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-[18px] bg-[#e6f0df]" /> : null}
            <item.icon size={18} className="relative" />
            <span className="relative">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
