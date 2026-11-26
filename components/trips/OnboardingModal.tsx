"use client";

import { useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { Map, Wallet, UtensilsCrossed, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TripCover } from "@/components/trips/TripCover";
import { useProfile } from "@/hooks/useProfile";
import { defaultPreset } from "@/lib/avatars";
import { EASE_OUT, EASE_SHEET, fadeUp, stagger } from "@/lib/motion";

const STORAGE_KEY = "voyou-welcomed-v1";

const FEATURES = [
  { icon: Map, label: "Planifie l'itinéraire jour par jour", tile: "bg-sky-500/12 text-sky-400" },
  { icon: Wallet, label: "Partage les dépenses, sans prise de tête", tile: "bg-foreground/[0.07] text-foreground" },
  { icon: UtensilsCrossed, label: "Organise les repas et les courses", tile: "bg-emerald-500/12 text-emerald-400" },
];

function readWelcomed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return true;
  }
}

/**
 * First-run flow: a welcome screen (once per device), then "Ta tête dans la
 * bande" : name + avatar, shown until the user has picked an avatar. The
 * Google photo is pre-selected when available, otherwise a preset.
 */
export function OnboardingModal() {
  const { profile, updateProfile } = useProfile();
  const [welcomed, setWelcomed] = useState(readWelcomed);
  const [dismissed, setDismissed] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsProfile = !!profile && !profile.custom_avatar_url;
  const step = !profile || dismissed ? null : !welcomed ? "welcome" : needsProfile ? "profile" : null;

  const name = draftName ?? profile?.name?.split(" ")[0] ?? "";
  const avatar = draftAvatar ?? profile?.avatar_url ?? (profile ? defaultPreset(profile.id) : null);

  const finishWelcome = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage unavailable: the welcome may show again next time
    }
    setWelcomed(true);
  };

  const saveProfile = async () => {
    if (!avatar || !name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), custom_avatar_url: avatar });
      setDismissed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {step && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-end justify-end sm:items-center sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <div className="absolute inset-0 bg-black/45 dark:bg-black/65" aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-popover shadow-float sm:rounded-[1.75rem]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.3, ease: EASE_SHEET } }}
            transition={{ duration: 0.55, ease: EASE_SHEET }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {step === "welcome" ? (
                <motion.div key="welcome" exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
                  <TripCover seed="onboarding" variant={0} className="h-40" />
                  <div className="space-y-6 px-6 pt-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
                    <motion.div variants={fadeUp} initial="hidden" animate="show">
                      <h2 id="onboarding-title" className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight">
                        Bienvenue sur Voyou
                      </h2>
                      <p className="mt-1 text-[0.95rem] text-muted-foreground">Organise, partage, profite.</p>
                    </motion.div>
                    <motion.ul variants={stagger(0.07, 0.2)} initial="hidden" animate="show" className="space-y-3">
                      {FEATURES.map(({ icon: Icon, label, tile }) => (
                        <motion.li key={label} variants={fadeUp} className="flex items-center gap-3.5">
                          <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tile}`}>
                            <Icon size={20} />
                          </span>
                          <span className="text-[0.95rem] font-medium">{label}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                    <Button onClick={finishWelcome} size="lg" className="w-full shadow-section">
                      C&apos;est parti
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  className="flex min-h-0 flex-col"
                >
                  <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
                    <motion.div key={avatar} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                      <UserAvatar src={avatar} name={name} size={88} className="shadow-raised ring-4 ring-background" />
                    </motion.div>
                    <div>
                      <h2 id="onboarding-title" className="font-display text-[1.6rem] leading-tight font-extrabold tracking-tight">
                        Ta tête dans la bande
                      </h2>
                      <p className="mt-1 text-[0.95rem] text-muted-foreground">Tes potes te reconnaîtront dans les voyages.</p>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pt-5 pb-4">
                    <div className="space-y-2">
                      <label htmlFor="onboarding-name" className="px-1 text-sm font-semibold">
                        Ton prénom
                      </label>
                      <Input
                        id="onboarding-name"
                        value={name}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Comment on t'appelle ?"
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="px-1 text-sm font-semibold">Ton avatar</p>
                      <AvatarPicker value={avatar} onChange={setDraftAvatar} googleUrl={profile?.avatar_url} />
                    </div>
                  </div>

                  <div className="border-t border-border px-6 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
                    <Button onClick={saveProfile} size="lg" className="w-full shadow-section" disabled={saving || !name.trim() || !avatar}>
                      {saving ? <Loader2 size={18} className="animate-spin" /> : "C'est moi"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
