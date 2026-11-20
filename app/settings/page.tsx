"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  User,
  Mail,
  Moon,
  Sun,
  LogOut,
  CreditCard,
  Phone,
  Check,
  SunMoon,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Spinner } from "@/components/shared/Spinner";
import { GlassCard } from "@/components/layout/GlassCard";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useUserId } from "@/hooks/useUserId";

export default function SettingsPage() {
  const { profile, loading, updateProfile, signOut } = useProfile();
  const { preference, setPreference } = useTheme();
  const userId = useUserId();

  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savedPayment, setSavedPayment] = useState(false);

  // Sync fields once profile loads
  useEffect(() => {
    if (!profile) return;
    if (profile.name && !name) setName(profile.name);
    if (profile.iban && !iban) setIban(profile.iban);
    if (profile.phone && !phone) setPhone(profile.phone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateProfile({ name: name.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePayment = async () => {
    setSavingPayment(true);
    await updateProfile({
      iban: iban.trim() ? iban.trim().replace(/\s+/g, "").toUpperCase() : null,
      phone: phone.trim() || null,
    });
    setSavingPayment(false);
    setSavedPayment(true);
    setTimeout(() => setSavedPayment(false), 2000);
  };

  const paymentDirty =
    (iban.trim().replace(/\s+/g, "").toUpperCase() || null) !== (profile?.iban ?? null) ||
    (phone.trim() || null) !== (profile?.phone ?? null);


  return (
    <>
      <div className="min-h-dvh bg-background">
        <AppHeader />

        <main
          className="mx-auto max-w-lg space-y-8 px-5 pt-2"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          }}
        >
          {loading ? (
            <Spinner />
          ) : (
            <Stagger step={0.06} className="space-y-8">
              <StaggerItem>
                <PageHeader title="Réglages" />
              </StaggerItem>
              {/* ─── Section Profil ──────────────────────────────────── */}
              <Section label="Profil">
                {/* Avatar */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  {userId ? (
                    <AvatarUpload
                      bucket="profile-avatars"
                      path={`${userId}/avatar.webp`}
                      currentUrl={profile?.custom_avatar_url ?? profile?.avatar_url ?? null}
                      size={88}
                      ringClass="ring-4 ring-card shadow-raised"
                      dialogTitle="Recadrer la photo"
                      placeholder={
                        <div className="flex h-full w-full items-center justify-center bg-primary font-display text-3xl font-extrabold text-primary-foreground">
                          {(profile?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                      }
                      onUploaded={async (url) => {
                        await updateProfile({ custom_avatar_url: url });
                      }}
                      onRemoved={
                        profile?.custom_avatar_url
                          ? async () => {
                              await updateProfile({ custom_avatar_url: null });
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-[88px] h-[88px] rounded-full bg-foreground/8" />
                  )}
                  <p className="text-sm text-slate-500">
                    {profile?.custom_avatar_url
                      ? "Photo personnalisée"
                      : "Photo synchronisée depuis Google"}
                  </p>
                </motion.div>

                {/* Form */}
                <GlassCard className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                      <User size={14} />
                      Nom affiché
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ton prénom"
                      
                    />
                    <p className="px-1 text-sm text-muted-foreground">
                      Utilisé pour t&apos;identifier dans les voyages.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                      <Mail size={14} />
                      Email
                    </Label>
                    <Input
                      value={profile?.email ?? ""}
                      disabled
                      className="cursor-not-allowed"
                    />
                    <p className="text-sm text-slate-500">
                      Géré par ton compte Google.
                    </p>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    size="lg" className="w-full"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : saved ? (
                      <><Check size={16} /> Sauvegardé</>
                    ) : (
                      <>
                        <Save size={15} />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </GlassCard>
              </Section>

              {/* ─── Section Paiement ────────────────────────────────── */}
              <Section label="Remboursements">
                <GlassCard className="space-y-4">
                  <p className="text-sm text-slate-400 -mt-1">
                    Tes infos seront visibles par les autres membres d&apos;un voyage
                    quand ils auront un solde à te rembourser. Elles ne sont
                    jamais exposées ailleurs.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                      <CreditCard size={14} />
                      IBAN
                    </Label>
                    <Input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="font-mono text-sm tracking-wide"
                    />
                    <p className="text-sm text-slate-500">
                      Pour les virements classiques.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                      <Phone size={14} />
                      Numéro de téléphone
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="+33 6 12 34 56 78"
                      autoComplete="tel"
                      
                    />
                    <p className="px-1 text-sm text-muted-foreground">
                      Utilisé pour générer des liens Lydia / Wero.
                    </p>
                  </div>

                  <Button
                    onClick={handleSavePayment}
                    disabled={savingPayment || !paymentDirty}
                    size="lg" className="w-full"
                  >
                    {savingPayment ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : savedPayment ? (
                      <><Check size={16} /> Enregistré</>
                    ) : (
                      <>
                        <Save size={15} />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </GlassCard>
              </Section>

              {/* ─── Section Apparence ───────────────────────────────── */}
              <Section label="Apparence">
                <GlassCard className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {preference === "dark" ? <Moon size={18} /> : preference === "light" ? <Sun size={18} /> : <SunMoon size={18} />}
                    </span>
                    <div>
                      <p className="font-semibold">Thème</p>
                      <p className="text-sm text-muted-foreground">
                        {preference === "system" ? "Suit le réglage de ton téléphone" : preference === "dark" ? "Toujours sombre" : "Toujours clair"}
                      </p>
                    </div>
                  </div>
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
                </GlassCard>
              </Section>

              {/* ─── Section Compte ──────────────────────────────────── */}
              <Section label="Compte">
                <GlassCard padding={false}>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                    {profile?.custom_avatar_url || profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.custom_avatar_url ?? profile.avatar_url ?? ""}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                        {(profile?.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-slate-100 font-semibold truncate">
                        {profile?.name ?? "Utilisateur"}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {profile?.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      Google
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-red-400 transition-colors hover:bg-red-500/[0.06] active:bg-red-500/10"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/12">
                      <LogOut size={18} />
                    </div>
                    <span className="text-base font-semibold">
                      Se déconnecter
                    </span>
                  </button>
                </GlassCard>
              </Section>
            </Stagger>
          )}
        </main>
      </div>
    </>
  );
}

// ── Settings list helpers ────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <StaggerItem>
      <section>
        <SectionLabel>{label}</SectionLabel>
        <div className="space-y-3">{children}</div>
      </section>
    </StaggerItem>
  );
}
