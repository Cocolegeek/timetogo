"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { profile, signOut } = useProfile();
  const router = useRouter();

  const initials = profile?.name
    ? profile.name.slice(0, 2).toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full w-9 h-9 p-0 overflow-hidden border border-foreground/10 hover:border-foreground/20 transition-colors focus:outline-none"
        aria-label="Menu utilisateur"
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.name ?? "avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-slate-300 bg-indigo-500/20 w-full h-full flex items-center justify-center">
            {initials}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="glass-strong border-foreground/10 text-slate-200 min-w-48 bg-slate-900/95 backdrop-blur"
      >
        {profile && (
          <>
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-100 truncate">
                {profile.name ?? "Utilisateur"}
              </p>
              <p className="text-xs text-slate-500 truncate">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          <Settings size={14} className="text-slate-400" />
          Paramètres
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={signOut}
          className="gap-2 cursor-pointer text-red-400"
          variant="destructive"
        >
          <LogOut size={14} />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
