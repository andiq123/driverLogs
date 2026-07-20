import type { FormEvent } from "react";
import { KeyRound, Loader2, PlayCircle, ShieldCheck, UserRound } from "lucide-react";
import { authTheme } from "@/lib/theme";
import { BrandMark } from "./brand-mark";
import { Input } from "./ui";

type LoginViewProps = {
  savedLoginID: string;
  status: string;
  feedback: "idle" | "error" | "success" | "loading";
  action: "login" | "register" | "";
  onClearStatus: () => void;
  onCreate: () => void;
  onDemo?: () => void;
  onLogin: (loginID: string) => void;
};

export function LoginView({ savedLoginID, status, feedback, action, onClearStatus, onCreate, onDemo, onLogin }: LoginViewProps) {
  const isBusy = feedback === "loading";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onLogin(String(form.get("username") ?? ""));
  }

  return (
    <main className={authTheme.page}>
      <div className={authTheme.glow} />
      <div className="relative w-full max-w-md">
        <section className={authTheme.card}>
          <div className={authTheme.cardHeader}>
            <div className="flex items-center gap-3">
              <BrandMark size={56} />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-none tracking-tight">DriverLogs</h1>
                <p className="mt-2 text-sm text-[#62685e]">Vehicle cost control</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#62685e]">Sign in with your numeric login ID to open your garage and track ownership costs.</p>
          </div>

          <form onSubmit={submit} className="grid gap-3 p-5 sm:p-6" autoComplete="on">
            <Input id="username" name="username" label="Login ID" icon={KeyRound} defaultValue={savedLoginID} inputMode="numeric" pattern="[0-9]*" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required onChange={onClearStatus} />
            <button type="submit" disabled={isBusy} className={authTheme.submitButton}>
              {action === "login" ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              Sign in
            </button>
            <button type="button" disabled={isBusy} onClick={onCreate} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] border border-black/[0.055] bg-[#fffffb]/92 text-sm font-bold text-[#151712] shadow-[0_8px_24px_rgba(31,41,28,0.06)] transition-[background-color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f8faf5] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70">
              {action === "register" ? <Loader2 size={17} className="animate-spin" /> : <UserRound size={17} />}
              Create login ID
            </button>
            {onDemo ? (
              <button type="button" disabled={isBusy} onClick={onDemo} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#eef3e8] text-sm font-bold text-[#151712] transition-[background-color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#dfe7d4] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70">
                <PlayCircle size={17} />
                Start demo
              </button>
            ) : null}
            {status ? <AuthFeedback message={status} feedback={feedback} /> : null}
          </form>
        </section>
      </div>
    </main>
  );
}

function AuthFeedback({ message, feedback }: { message: string; feedback: LoginViewProps["feedback"] }) {
  const isError = feedback === "error";
  return (
    <div className={`rounded-[18px] px-3 py-2 text-sm ${isError ? "bg-[#ffe8e2] text-[#8b2d20]" : "bg-[#eef3e8] text-[#30342e]"}`}>
      {message}
    </div>
  );
}
