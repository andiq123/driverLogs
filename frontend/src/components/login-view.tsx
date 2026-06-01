import type { FormEvent } from "react";
import { AlertCircle, KeyRound, Loader2, Plus, ShieldCheck } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Input } from "./ui";

type LoginViewProps = {
  savedLoginID: string;
  status: string;
  feedback: "idle" | "error" | "success" | "loading";
  action: "login" | "register" | "";
  onClearStatus: () => void;
  onCreate: () => void;
  onLogin: (loginID: string) => void;
};

export function LoginView({ savedLoginID, status, feedback, action, onClearStatus, onCreate, onLogin }: LoginViewProps) {
  const isBusy = feedback === "loading";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onLogin(String(form.get("username") ?? form.get("login_id") ?? ""));
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f7f2] px-4 py-[max(1rem,env(safe-area-inset-top))] text-[#151712]">
      <section className="w-full max-w-md rounded-[30px] border border-black/[0.06] bg-[#fbfcf8] p-5 shadow-[0_22px_72px_rgba(31,41,28,0.14)] sm:p-6">
        <div className="flex items-center gap-3">
          <BrandMark size={48} />
          <div>
            <h1 className="text-2xl font-semibold">DriverLogs</h1>
            <p className="text-sm text-[#62685e]">Secure numeric login</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 grid gap-3" autoComplete="on">
          <Input id="username" name="username" label="Login ID" icon={KeyRound} defaultValue={savedLoginID} inputMode="numeric" pattern="[0-9]*" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required onChange={onClearStatus} />
          <input type="hidden" name="login_id" value={savedLoginID} autoComplete="off" />
          <button disabled={isBusy} className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#151712] text-sm font-bold text-white transition-[transform,opacity] duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70">
            {action === "login" ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            Sign in
          </button>
        </form>

        {status ? <AuthFeedback message={status} feedback={feedback} /> : null}
        <button disabled={isBusy} onClick={onCreate} className="mt-4 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#dfe7d4] text-sm font-bold transition-[background-color,transform,opacity] duration-200 hover:bg-[#cbd9bf] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70">
          {action === "register" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
          New login
        </button>
      </section>
    </main>
  );
}

function AuthFeedback({ message, feedback }: { message: string; feedback: LoginViewProps["feedback"] }) {
  const isError = feedback === "error";
  const Icon = isError ? AlertCircle : ShieldCheck;
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-[18px] px-3 py-2 text-sm ${isError ? "bg-[#ffe8e2] text-[#8b2d20]" : "bg-[#eef3e8] text-[#30342e]"}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
