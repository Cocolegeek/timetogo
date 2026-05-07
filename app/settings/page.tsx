"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Mail,
  Camera,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { profile, loading, updateProfile, signOut } = useProfile();
  const { theme, toggle } = useTheme();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync name once profile loads
  useEffect(() => {
    if (profile?.name && !name) setName(profile.name);
  }, [profile, name]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateProfile({ name: name.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDark = theme === "dark";

  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen">
        {/* Header */}
        <header className="glass-strong border-b border-white/8 sticky top-0 z-40">
          <div
            className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
          >
            <Link
              href="/trips"
              className="p-2 -ml-1 rounded-xl hover:bg-white/8 active:bg-white/12 text-slate-400 hover:text-slate-200 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-100">Paramètres</h1>
          </div>
        </header>

        <main
          className="max-w-lg mx-auto px-4 py-5 space-y-7"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* ─── Section Profil ──────────────────────────────────── */}
              <Section label="Profil">
                {/* Avatar */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  <div className="relative">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={profile.name ?? "avatar"}
                        className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center">
                        <User size={32} className="text-indigo-400" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                      <Camera size={12} className="text-slate-400" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Photo synchronisée depuis Google
                  </p>
                </motion.div>

                {/* Form */}
                <GlassCard className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                      <User size={14} />
                      Nom affiché
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ton prénom"
                      className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
                    />
                    <p className="text-sm text-slate-500">
                      Utilisé pour t'identifier dans les voyages.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                      <Mail size={14} />
                      Email
                    </Label>
                    <Input
                      value={profile?.email ?? ""}
                      disabled
                      className="bg-white/4 border-white/8 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-sm text-slate-500">
                      Géré par ton compte Google.
                    </p>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : saved ? (
                      "✓ Sauvegardé"
                    ) : (
                      <>
                        <Save size={15} />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </GlassCard>
              </Section>

              {/* ─── Section Apparence ───────────────────────────────── */}
              <Section label="Apparence">
                <GlassCard padding={false}>
                  <button
                    type="button"
                    onClick={toggle}
                    className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/4 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                      {isDark ? (
                        <Moon size={18} className="text-indigo-300" />
                      ) : (
                        <Sun size={18} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-base font-semibold text-slate-100">
                        Mode sombre
                      </p>
                      <p className="text-sm text-slate-500">
                        {isDark ? "Activé" : "Désactivé"}
                      </p>
                    </div>
                    <Switch checked={isDark} />
                  </button>
                </GlassCard>
              </Section>

              {/* ─── Section Compte ──────────────────────────────────── */}
              <Section label="Compte">
                <GlassCard padding={false}>
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-white/8">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <User size={16} className="text-indigo-400" />
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
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      Google
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-4 text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                      <LogOut size={18} />
                    </div>
                    <span className="text-base font-semibold">
                      Se déconnecter
                    </span>
                  </button>
                </GlassCard>
              </Section>
            </>
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
    <section className="space-y-2">
      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider px-1">
        {label}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Switch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0",
        checked ? "bg-indigo-500" : "bg-white/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </span>
  );
}
