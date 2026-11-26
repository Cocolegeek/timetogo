"use client";

import { useState } from "react";
import { Download, Eraser, Mail, Trash2 } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { METHOD_ICONS } from "@/components/auth/ProviderIcon";
import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { useToast } from "@/components/shared/Toaster";
import { useAuthUser } from "@/hooks/useAuthUser";
import { linkedMethods, METHOD_LABELS } from "@/lib/auth/providers";
import { useProfile } from "@/hooks/useProfile";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { clearDataCache } from "@/lib/data/swr";
import { collectMyData } from "@/lib/export/my-data";
import { downloadFile } from "@/lib/export/download";

export default function AccountSettingsPage() {
  const { profile } = useProfile();
  const { user, isAnonymous } = useAuthUser();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await collectMyData();
      downloadFile("voyou-mes-donnees.json", "application/json", JSON.stringify(data, null, 2));
      toast({ message: "Tes données sont téléchargées", tone: "success" });
    } catch {
      toast({ message: "Export impossible pour le moment", tone: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsShell title="Compte et données">
      <StaggerItem>
        {isAnonymous ? (
          <GuestUpgradeCard />
        ) : (
          <SettingsGroup title="Connexion">
            {linkedMethods(user).map((method) => (
              <SettingsRow
                key={method}
                icon={METHOD_ICONS[method]}
                label={METHOD_LABELS[method]}
                value="Connecté"
                chevron={false}
              />
            ))}
            {profile?.email && <SettingsRow icon={Mail} label={profile.email} chevron={false} />}
          </SettingsGroup>
        )}
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup
          title="Données"
          footer="Voyou garde une copie de tes groupes sur ce téléphone pour s'ouvrir instantanément. La vider ne supprime rien en ligne."
        >
          <SettingsRow
            icon={Download}
            label={exporting ? "Préparation…" : "Télécharger mes données"}
            hint="Profil, groupes, dépenses, listes (JSON)"
            chevron={false}
            onClick={exporting ? undefined : exportData}
          />
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
        <SettingsGroup footer="Supprime ton compte et tes données personnelles. Action irréversible.">
          <SettingsRow icon={Trash2} label="Supprimer mon compte" tone="danger" chevron={false} onClick={() => setConfirmDelete(true)} />
        </SettingsGroup>
      </StaggerItem>

      <DeleteAccountDialog open={confirmDelete} onOpenChange={setConfirmDelete} />
    </SettingsShell>
  );
}
