"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, CreditCard, LogOut, Palette, ShieldCheck, UsersRound } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { GuestSignOutDialog } from "@/components/auth/GuestSignOutDialog";
import { useAuthUser } from "@/hooks/useAuthUser";
import { linkedMethods, methodsLabel } from "@/lib/auth/providers";
import { useFriends } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { profileAvatar } from "@/lib/avatars";
import { getPushState, type PushState } from "@/lib/notifications/push";

const THEME_LABEL = { system: "Auto", light: "Clair", dark: "Sombre" } as const;
const PUSH_LABEL: Record<PushState, string> = {
  on: "Activées",
  off: "Désactivées",
  denied: "Désactivées",
  unsupported: "Indisponibles",
  "needs-install": "À installer",
};

export default function SettingsPage() {
  const { profile, signOut } = useProfile();
  const { user, isAnonymous } = useAuthUser();
  const { friends } = useFriends();
  const { preference } = useTheme();
  const [push, setPush] = useState<PushState | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    getPushState().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  const paymentsSet = !!(profile?.iban || profile?.phone);

  return (
    <SettingsShell title="Réglages" back="/trips" backLabel="Retour aux voyages">
      <StaggerItem>
        <Link
          href="/settings/profile"
          prefetch
          className="pressable flex items-center gap-4 rounded-[1.5rem] bg-card p-5 shadow-card"
        >
          <UserAvatar src={profileAvatar(profile)} name={profile?.name} size={64} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[1.3rem] font-bold tracking-tight">
              {profile?.name || (isAnonymous ? "Invité" : "Ton profil")}
            </span>
            <span className="block truncate text-sm text-muted-foreground">Photo, nom affiché</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground/70" />
        </Link>
        {isAnonymous && <GuestUpgradeCard className="mt-3" compact />}
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup>
          <SettingsRow
            href="/settings/friends"
            icon={UsersRound}
            label="Ta bande"
            value={friends.length ? `${friends.length} pote${friends.length > 1 ? "s" : ""}` : "Ajouter"}
          />
          <SettingsRow
            href="/settings/payments"
            icon={CreditCard}
            label="Où te rembourser"
            value={paymentsSet ? "Renseigné" : "À compléter"}
          />
        </SettingsGroup>
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup>
          <SettingsRow href="/settings/notifications" icon={Bell} label="Notifications" value={push ? PUSH_LABEL[push] : ""} />
          <SettingsRow href="/settings/appearance" icon={Palette} label="Apparence et confort" value={THEME_LABEL[preference]} />
          <SettingsRow href="/settings/account" icon={ShieldCheck} label="Compte et données" value={isAnonymous ? "Invité" : methodsLabel(linkedMethods(user)) || "Connecté"} />
        </SettingsGroup>
      </StaggerItem>

      <StaggerItem>
        <button
          type="button"
          onClick={() => (isAnonymous ? setConfirmSignOut(true) : signOut())}
          className="pressable flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-card text-base font-semibold text-red-400 shadow-card transition-colors hover:bg-red-500/[0.06]"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </StaggerItem>

      <GuestSignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} onSignOut={signOut} />
    </SettingsShell>
  );
}
