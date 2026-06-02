import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Car, Loader2, type LucideIcon } from "lucide-react";
import { controls } from "@/lib/theme";

export function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_14px_48px_rgba(31,41,28,0.08)] transition-[box-shadow,transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70776a]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Car, title, body, dark = false }: { icon?: typeof Car; title: string; body: string; dark?: boolean }) {
  return (
    <div className={`flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed p-5 text-center sm:p-6 ${dark ? "border-white/18 bg-white/8" : "border-black/10 bg-[#f1f4ec]"}`}>
      <Icon size={34} className={dark ? "text-white" : "text-[#151712]"} />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className={`mt-2 max-w-sm text-sm leading-6 ${dark ? "text-white/64" : "text-[#62685e]"}`}>{body}</p>
    </div>
  );
}

export function ReportCard({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <section className="rounded-[26px] bg-[#dfe7d4] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#62685e]">{title}</p>
      <p className="mt-3 min-w-0 break-words text-2xl font-semibold leading-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-[#62685e]">{label}</p>
    </section>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: "dark" | "soft";
};

export function ActionButton({ loading = false, icon: Icon, children, variant = "dark", className = "", disabled, ...props }: ActionButtonProps) {
  const style = variant === "dark" ? "bg-[#151712] text-white" : "bg-[#dfe7d4] text-[#151712] hover:bg-[#cbd9bf]";
  return (
    <button disabled={disabled || loading} className={`flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] text-sm font-bold transition-[background-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70 ${style} ${className}`} {...props}>
      {loading ? <Loader2 size={17} className="animate-spin" /> : Icon ? <Icon size={17} /> : null}
      {children}
    </button>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  icon?: LucideIcon;
  isAutofilled?: boolean;
};

export function Input({ name, label, icon: Icon, type = "text", required = false, isAutofilled = false, placeholder, ...props }: InputProps) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        {Icon ? <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#62685e]" /> : null}
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder ?? label}
          {...props}
          className={`${controls.input} ${Icon ? "pl-10" : ""} ${isAutofilled ? "vin-autofill border-[#0f8f68]/30 bg-[#eef6e9] shadow-[0_0_0_4px_rgba(15,143,104,0.08)]" : ""}`}
        />
      </span>
    </label>
  );
}

export function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-[16px] bg-white/10 p-2 sm:rounded-[22px] sm:p-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 sm:text-[11px] sm:tracking-[0.14em]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold sm:mt-2 sm:text-base">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-white/52 sm:mt-1 sm:text-[11px]">{sub}</p>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs">{children}</span>;
}

export function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-[24px] bg-[#eef3e8]" />;
}

export function ViewSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid min-h-[calc(100dvh-7rem)] items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.78fr)] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="grid content-start gap-3 sm:gap-4">
        <div className="rounded-[24px] bg-[#151712] p-4 shadow-[0_22px_70px_rgba(31,41,28,0.18)] sm:min-h-[24rem] sm:rounded-[28px] sm:p-6 xl:min-h-[21rem]">
          <div className="flex gap-2">
            <SkeletonLine className="h-6 w-16 bg-white/12" />
            <SkeletonLine className="h-6 w-20 bg-white/12" />
            <SkeletonLine className="h-6 w-14 bg-white/12" />
          </div>
          <SkeletonLine className="mt-4 h-9 w-4/5 bg-white/12 sm:mt-8 sm:h-14" />
          <SkeletonLine className="mt-3 hidden h-4 w-2/3 bg-white/12 sm:block" />
          <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            {Array.from({ length: 3 }, (_, index) => <SkeletonLine key={index} className="h-[4.625rem] !rounded-[16px] bg-white/12 sm:h-20 sm:!rounded-[22px]" />)}
          </div>
        </div>
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible xl:grid-cols-5">
          {Array.from({ length: rows + 1 }, (_, index) => <SkeletonLine key={index} className="h-[7.35rem] w-28 shrink-0 snap-start !rounded-[20px] sm:h-32 sm:w-auto sm:!rounded-[24px]" />)}
        </div>
      </section>
      <section className="h-fit rounded-[24px] border border-black/[0.06] bg-[#fbfcf8] p-4 shadow-[0_14px_48px_rgba(31,41,28,0.08)] sm:rounded-[28px] sm:p-5">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="mt-3 h-7 w-40" />
        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:mt-6 sm:grid-cols-2 sm:gap-2">
          {Array.from({ length: 8 }, (_, index) => <SkeletonLine key={index} className="h-[3.9rem] w-full !rounded-[16px] sm:h-16 sm:!rounded-[18px]" />)}
        </div>
        <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
          {Array.from({ length: 5 }, (_, index) => <SkeletonLine key={index} className="h-12 w-full !rounded-[18px]" />)}
        </div>
      </section>
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#e6ecdf] ${className}`} />;
}
