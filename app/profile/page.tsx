"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2, User, Mail, Camera } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { profile, loading, updateProfile, signOut } = useProfile();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Init name from profile once loaded
  if (profile && name === "" && profile.name) {
    setName(profile.name);
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateProfile({ name: name.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen">
        {/* Header */}
        <header className="glass-strong border-b border-white/8 sticky top-0 z-40">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <Link
              href="/trips"
              className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-slate-200 transition-all"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-lg font-bold text-slate-100">Mon profil</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Avatar */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 py-4"
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
                <p className="text-xs text-slate-600">
                  Photo synchronisée depuis Google
                </p>
              </motion.div>

              {/* Info form */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <GlassCard className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs flex items-center gap-1.5">
                      <User size={12} />
                      Nom affiché
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ton prénom"
                      className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
                    />
                    <p className="text-xs text-slate-600">
                      Utilisé pour t'identifier dans les voyages.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs flex items-center gap-1.5">
                      <Mail size={12} />
                      Email
                    </Label>
                    <Input
                      value={profile?.email ?? ""}
                      disabled
                      className="bg-white/4 border-white/8 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-600">
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
              </motion.div>

              {/* Account actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="space-y-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Compte
                  </p>
                  <div className="flex items-center gap-3 p-3 glass-subtle rounded-xl">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <User size={14} className="text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">
                        {profile?.name ?? "Utilisateur"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {profile?.email}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Google
                    </span>
                  </div>

                  <Button
                    onClick={signOut}
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                  >
                    Se déconnecter
                  </Button>
                </GlassCard>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
