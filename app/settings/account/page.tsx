"use client";

import { useState } from "react";
import { Eraser, LogOut, Mail } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { GuestSignOutDialog } from "@/components/auth/GuestSignOutDialog";
import { useToast } from "@/components/shared/Toaster";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { clearDataCache } from "@/lib/data/swr";

export default function AccountSettingsPage() {
  const { profile, signOut } = useProfile();
  const { isAnonymous } = useAuthUser();
  const toast = useToast();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <SettingsShell title="Compte et données">
      <StaggerItem>
        {isAnonymous ? (
          <GuestUpgradeCard />
        ) : (
          <SettingsGroup title="Connexion">
            <SettingsRow icon={GoogleIcon} label="Google" value="Connecté" chevron={false} />
            {profile?.email && <SettingsRow icon={Mail} label={profile.email} chevron={false} />}
          </SettingsGroup>
        )}
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup
          title="Données"
          footer="Voyou garde une copie de tes voyages sur ce téléphone pour s'ouvrir instantanément. La vider ne supprime rien en ligne."
        >
          <SettingsRow
            icon={Eraser}
            label="Vider le cache de l'appareil"
            chevron={false}
            onClick={() => {
              clearDataCache();
              toast({ message: "Cache vidé, tout se recharge.", tone: "success" });
              setTimeout(() => window.location.reload(), 600);
            }}
          />
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
