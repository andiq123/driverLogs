import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Car, Loader2, type LucideIcon } from "lucide-react";
import { controls } from "@/lib/theme";

export function Panel({ title, eyebrow, action, children }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode }) {
  const showHeader = Boolean(title || eyebrow || action);
  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-black/[0.055] bg-[#fffffb]/96 p-3.5 shadow-[0_8px_28px_rgba(31,41,28,0.06)] ring-1 ring-white/70 transition-[box-shadow,transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-[28px] sm:p-5">
      {showHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70776a] sm:text-xs sm:tracking-[0.16em]">{eyebrow}</p> : null}
            {title ? <h2 className={`text-lg font-semibold sm:text-xl ${eyebrow ? "mt-0.5 sm:mt-1" : ""}`}>{title}</h2> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={showHeader ? "mt-3.5 sm:mt-5" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon = Car, title, body, dark = false }: { icon?: typeof Car; title: string; body: string; dark?: boolean }) {
  return (
    <div className={`flex min-h-44 flex-col items-center justify-center rounded-[22px] border border-dashed p-4 text-center sm:min-h-64 sm:rounded-[26px] sm:p-6 ${dark ? "border-white/18 bg-white/8" : "border-black/[0.08] bg-[#f7faf3]"}`}>
      <Icon size={28} className={dark ? "text-white" : "text-[#151712]"} />
      <h3 className="mt-3 text-base font-semibold sm:mt-4 sm:text-lg">{title}</h3>
      <p className={`mt-1.5 max-w-sm text-xs leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${dark ? "text-white/64" : "text-[#62685e]"}`}>{body}</p>
    </div>
  );
}

export function ReportCard({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <section className="rounded-[20px] border border-black/[0.055] bg-[#fffffb]/94 p-3.5 shadow-[0_8px_26px_rgba(31,41,28,0.055)] ring-1 ring-white/70 sm:rounded-[26px] sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62685e] sm:text-xs sm:tracking-[0.16em]">{title}</p>
      <p className="mt-2 min-w-0 break-words text-xl font-semibold leading-tight sm:mt-3 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[#62685e] sm:text-sm">{label}</p>
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

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  variant?: "dark" | "soft" | "danger";
};

export function IconButton({ icon: Icon, label, loading = false, variant = "soft", className = "", disabled, ...props }: IconButtonProps) {
  const styles = {
    dark: "bg-[#151712] text-white hover:bg-[#20241d]",
    soft: "bg-[#dfe7d4] text-[#151712] hover:bg-[#cbd9bf]",
    danger: "bg-[#fff0ec] text-[#9b3226] hover:bg-[#ffdcd4]",
  };
  return (
    <button
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      className={`flex size-11 touch-manipulation items-center justify-center rounded-[15px] transition-[background-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70 sm:size-9 sm:rounded-[14px] ${styles[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
    </button>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  icon?: LucideIcon;
  isAutofilled?: boolean;
  showLabel?: boolean;
};

export function Input({ name, label, icon: Icon, type = "text", required = false, isAutofilled = false, showLabel = false, placeholder, ...props }: InputProps) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      <span className={showLabel ? "px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#70776a]" : "sr-only"}>{label}</span>
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
    <div className="min-w-0 rounded-[16px] border border-white/10 bg-white/[0.115] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[22px] sm:p-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 sm:text-[11px] sm:tracking-[0.14em]">{label}</p>
      <p className="mt-1 break-words text-[13px] font-bold leading-tight sm:mt-2 sm:text-base">{value}</p>
      <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-white/55 sm:mt-1 sm:text-[11px]">{sub}</p>
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
