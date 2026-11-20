"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, LogOut, Settings } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuthUser } from "@/hooks/useAuthUser";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { GuestSignOutDialog } from "@/components/auth/GuestSignOutDialog";
import { profileAvatar } from "@/lib/avatars";
import { startGoogleUpgrade } from "@/lib/auth/guest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { profile, signOut } = useProfile();
  const { isAnonymous } = useAuthUser();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="relative size-10 rounded-full p-0 ring-1 ring-border transition-shadow outline-none hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu utilisateur"
        >
          <UserAvatar src={profileAvatar(profile)} name={profile?.name} size={40} />
          {isAnonymous && (
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-amber-400 ring-2 ring-background" aria-hidden="true" />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-60">
          {profile && (
            <>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar src={profileAvatar(profile)} name={profile.name} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{profile.name ?? (isAnonymous ? "Invité" : "Utilisateur")}</p>
                  <p className="truncate text-sm text-muted-foreground">{isAnonymous ? "Compte invité" : profile.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {isAnonymous && (
            <DropdownMenuItem onClick={() => void startGoogleUpgrade()}>
              <CloudUpload />
              Sauvegarder avec Google
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings />
            Paramètres
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => (isAnonymous ? setConfirmOpen(true) : signOut())} variant="destructive">
            <LogOut />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GuestSignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} onSignOut={signOut} />
    </>
  );
}
