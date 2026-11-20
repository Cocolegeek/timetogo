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

  const initials = profile?.name ? profile.name.charAt(0).toUpperCase() : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-10 overflow-hidden rounded-full p-0 ring-1 ring-border transition-shadow outline-none hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Menu utilisateur"
      >
        {profile?.custom_avatar_url || profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.custom_avatar_url ?? profile.avatar_url ?? ""}
            alt={profile.name ?? "avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-foreground font-display text-sm font-bold text-background">
            {initials}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-56"
      >
        {profile && (
          <>
            <div className="px-3 py-2.5">
              <p className="truncate font-semibold text-foreground">
                {profile.name ?? "Utilisateur"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings />
          Paramètres
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={signOut} variant="destructive">
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
