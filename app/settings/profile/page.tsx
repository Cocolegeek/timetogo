"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useUserId } from "@/hooks/useUserId";
import { profileAvatar } from "@/lib/avatars";
import { EASE_OUT } from "@/lib/motion";

export default function ProfileSettingsPage() {
  const { profile, updateProfile } = useProfile();
  const { isAnonymous } = useAuthUser();
  const userId = useUserId();
  const toast = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Follow the stored name unless the user is typing a new one.
  const synced = useRef("");
  useEffect(() => {
    if (!profile) return;
    const next = profile.name ?? "";
    const prev = synced.current;
    setName((cur) => (cur === prev ? next : cur));
    synced.current = next;
  }, [profile]);

  const dirty = !!profile && name.trim() !== (profile.name ?? "");
  const avatar = profileAvatar(profile);

  const save = async () => {
    if (!name.trim()) {
      toast({ message: "Ton nom ne peut pas être vide.", tone: "error" });
      return;
    }
    setSaving(true);
    await updateProfile({ name: name.trim() });
    setSaving(false);
    toast({ message: "Nom enregistré", tone: "success" });
  };

  return (
    <SettingsShell title="Profil" bottomSpace={dirty ? "7rem" : "2.5rem"}>
      <StaggerItem>
        <div className="flex flex-col items-center gap-2">
          {userId && (
            <AvatarUpload
              bucket="profile-avatars"
              path={`${userId}/avatar.webp`}
              currentUrl={avatar}
              size={104}
              ringClass="ring-4 ring-card shadow-raised"
              dialogTitle="Recadrer la photo"
              placeholder={
                <div className="flex h-full w-full items-center justify-center bg-primary font-display text-4xl font-extrabold text-primary-foreground">
                  {(profile?.name ?? "?").charAt(0).toUpperCase()}
                </div>
              }
              onUploaded={async (url) => {
                await updateProfile({ custom_avatar_url: url });
                toast({ message: "Photo mise à jour", tone: "success" });
              }}
              onRemoved={profile?.custom_avatar_url ? async () => updateProfile({ custom_avatar_url: null }) : undefined}
            />
          )}
          <p className="text-sm text-muted-foreground">Touche ta photo pour en importer une.</p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup title="Ou choisis un avatar">
          <div className="p-4">
            <AvatarPicker value={avatar} googleUrl={profile?.avatar_url} onChange={(url) => updateProfile({ custom_avatar_url: url })} />
          </div>
        </SettingsGroup>
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup footer="C'est ce nom que tes potes voient dans les voyages et dans leur bande.">
          <label className="block px-5 py-3">
            <span className="text-xs font-medium text-muted-foreground">Nom affiché</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAnonymous ? "Ton prénom" : "Ton nom"}
              autoComplete="name"
              className="mt-0.5 block h-8 w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>
          {!isAnonymous && profile?.email && (
            <div className="px-5 py-3">
              <span className="text-xs font-medium text-muted-foreground">Email Google</span>
              <p className="mt-0.5 truncate text-base text-muted-foreground">{profile.email}</p>
            </div>
          )}
        </SettingsGroup>
      </StaggerItem>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <Button size="lg" className="w-full shadow-float" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsShell>
  );
}
