import { LogOut, UserRound } from "lucide-react";

export function UserCard({ userName, onOpenSettings, onLogout }: { userName: string; onOpenSettings: () => void; onLogout: () => void }) {
  return (
    <section className="mt-auto rounded-[24px] bg-[#eef3e8] p-3">
      <div className="grid grid-cols-[1fr_48px] gap-2">
        <button onClick={onOpenSettings} className="flex min-w-0 touch-manipulation items-center gap-3 rounded-[18px] px-2 py-2 text-left transition-[background-color,transform] duration-200 hover:bg-white/45 active:scale-[0.985]">
          <div className="flex size-11 items-center justify-center rounded-[16px] bg-white">
            <UserRound size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-[#62685e]">Profile settings</p>
          </div>
        </button>
        <button aria-label="Logout" onClick={onLogout} className="flex size-12 touch-manipulation items-center justify-center rounded-[18px] bg-[#151712] text-xs font-bold text-white transition-[transform,opacity] duration-200 active:scale-[0.985]">
          <LogOut size={14} />
        </button>
      </div>
    </section>
  );
}
