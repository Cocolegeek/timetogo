"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, Loader2, LogOut } from "lucide-react";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { GuestSignOutDialog } from "@/components/auth/GuestSignOutDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useUserId } from "@/hooks/useUserId";
import { profileAvatar } from "@/lib/avatars";
import { EASE_OUT } from "@/lib/motion";

const ICON_BTN =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-ring";

const normIban = (v: string) => v.trim().replace(/\s+/g, "").toUpperCase() || null;
const normPhone = (v: string) => v.trim() || null;

function SettingsPageContent() {
  const { profile, loading, updateProfile, signOut } = useProfile();
  const { preference, setPreference } = useTheme();
  const { isAnonymous } = useAuthUser();
  const userId = useUserId();
  const toast = useToast();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Follow the stored profile, but never overwrite a field the user is editing.
  const synced = useRef({ name: "", iban: "", phone: "" });
  useEffect(() => {
    if (!profile) return;
    const next = { name: profile.name ?? "", iban: profile.iban ?? "", phone: profile.phone ?? "" };
    const prev = synced.current;
    setName((cur) => (cur === prev.name ? next.name : cur));
    setIban((cur) => (cur === prev.iban ? next.iban : cur));
    setPhone((cur) => (cur === prev.phone ? next.phone : cur));
    synced.current = next;
  }, [profile]);

  const dirty =
    !!profile &&
    (name.trim() !== (profile.name ?? "") ||
      normIban(iban) !== normIban(profile.iban ?? "") ||
      normPhone(phone) !== normPhone(profile.phone ?? ""));

  const save = async () => {
    if (!name.trim()) {
      toast({ message: "Ton prénom ne peut pas être vide.", tone: "error" });
      return;
    }
    setSaving(true);
    await updateProfile({ name: name.trim(), iban: normIban(iban), phone: normPhone(phone) });
    setSaving(false);
    toast({ message: "Profil enregistré", tone: "success" });
  };

  const avatar = profileAvatar(profile);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-lg items-center px-2">
          <Link href="/trips" className={ICON_BTN} aria-label="Retour aux voyages">
            <ChevronLeft size={24} strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-5 pt-1"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${dirty ? "7rem" : "2.5rem"})` }}
      >
        {loading && !profile ? (
          <PageSkeleton />
        ) : (
          <Stagger step={0.05} className="space-y-9">
            <StaggerItem>
              <PageHeader title="Réglages" />
            </StaggerItem>

            {/* Identity: one place for photo, name and account. */}
            <StaggerItem>
              <section className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
                <div className="flex items-center gap-4 p-5">
                  <button
                    type="button"
                    onClick={() => setAvatarOpen(true)}
                    aria-label="Changer ma photo"
                    className="pressable relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserAvatar src={avatar} name={profile?.name} size={68} />
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-card">
                      <Camera size={14} />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[1.3rem] font-bold tracking-tight">
                      {profile?.name || (isAnonymous ? "Invité" : "Sans nom")}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {isAnonymous ? "Compte invité · sur cet appareil" : profile?.email}
                    </p>
                  </div>
                </div>
                <label className="block border-t border-border px-5 py-3">
                  <span className="text-xs font-medium text-muted-foreground">Nom affiché dans les voyages</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ton prénom"
                    autoComplete="given-name"
                    className="mt-0.5 block h-8 w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </section>
              {isAnonymous && <GuestUpgradeCard className="mt-3" />}
            </StaggerItem>

            <StaggerItem>
              <section>
                <SectionLabel>Pour te rembourser</SectionLabel>
                <div className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
                  <label className="block px-5 py-3">
                    <span className="text-xs font-medium text-muted-foreground">IBAN · virement</span>
                    <input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="tabular mt-0.5 block h-8 w-full bg-transparent text-[0.9rem] outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                  <label className="block border-t border-border px-5 py-3">
                    <span className="text-xs font-medium text-muted-foreground">Téléphone · Lydia, Wero</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="+33 6 12 34 56 78"
                      autoComplete="tel"
                      className="mt-0.5 block h-8 w-full bg-transparent text-base tabular outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                </div>
                <p className="mt-2.5 px-1 text-sm text-muted-foreground">
                  Visible uniquement par les membres qui te doivent de l&apos;argent.
                </p>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section>
                <SectionLabel>Apparence</SectionLabel>
                <SegmentedControl
                  id="theme"
                  value={preference}
                  onChange={setPreference}
                  options={[
                    { value: "system", label: "Auto" },
                    { value: "light", label: "Clair" },
                    { value: "dark", label: "Sombre" },
                  ]}
                />
                <p className="mt-2.5 px-1 text-sm text-muted-foreground">
                  {preference === "system" ? "Suit le réglage de ton téléphone." : preference === "dark" ? "Toujours sombre." : "Toujours clair."}
                </p>
              </section>
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
          </Stagger>
        )}
      </main>

      {/* One save action for every field, only when something changed. */}
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

      <Sheet open={avatarOpen} onOpenChange={setAvatarOpen}>
        <SheetContent side="bottom" className="flex flex-col overflow-hidden p-0" style={{ maxHeight: "88dvh" }}>
          <div className="flex shrink-0 flex-col items-center gap-2 px-5 pt-9 pb-1 text-center">
            <SheetTitle>Ta photo</SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <div className="flex flex-col items-center gap-1 pt-2 pb-6">
              {userId && (
                <AvatarUpload
                  bucket="profile-avatars"
                  path={`${userId}/avatar.webp`}
                  currentUrl={avatar}
                  size={96}
                  ringClass="ring-4 ring-popover shadow-raised"
                  dialogTitle="Recadrer la photo"
                  placeholder={
                    <div className="flex h-full w-full items-center justify-center bg-primary font-display text-3xl font-extrabold text-primary-foreground">
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
              <p className="text-sm text-muted-foreground">Touche pour importer une photo, ou choisis un avatar.</p>
            </div>
            <AvatarPicker
              value={avatar}
              googleUrl={profile?.avatar_url}
              onChange={(url) => updateProfile({ custom_avatar_url: url })}
            />
          </div>
        </SheetContent>
      </Sheet>

      <GuestSignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} onSignOut={signOut} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ClientOnly fallback={<div className="mx-auto max-w-lg px-5 pt-16"><PageSkeleton /></div>}>
      <SettingsPageContent />
    </ClientOnly>
  );
}
