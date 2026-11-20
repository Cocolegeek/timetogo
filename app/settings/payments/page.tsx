"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { EASE_OUT } from "@/lib/motion";

const normIban = (v: string) => v.trim().replace(/\s+/g, "").toUpperCase() || null;
const normPhone = (v: string) => v.trim() || null;

export default function PaymentSettingsPage() {
  const { profile, updateProfile } = useProfile();
  const toast = useToast();
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const synced = useRef({ iban: "", phone: "" });
  useEffect(() => {
    if (!profile) return;
    const next = { iban: profile.iban ?? "", phone: profile.phone ?? "" };
    const prev = synced.current;
    setIban((cur) => (cur === prev.iban ? next.iban : cur));
    setPhone((cur) => (cur === prev.phone ? next.phone : cur));
    synced.current = next;
  }, [profile]);

  const dirty =
    !!profile && (normIban(iban) !== normIban(profile.iban ?? "") || normPhone(phone) !== normPhone(profile.phone ?? ""));

  const save = async () => {
    setSaving(true);
    await updateProfile({ iban: normIban(iban), phone: normPhone(phone) });
    setSaving(false);
    toast({ message: "Infos de remboursement enregistrées", tone: "success" });
  };

  return (
    <SettingsShell
      title="Remboursements"
      subtitle="Pour qu'on te rembourse en deux gestes : tes potes copient ton IBAN ou ouvrent Lydia / Wero."
      bottomSpace={dirty ? "7rem" : "2.5rem"}
    >
      <StaggerItem>
        <SettingsGroup footer="Visible uniquement par les membres d'un voyage qui te doivent de l'argent.">
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
          <label className="block px-5 py-3">
            <span className="text-xs font-medium text-muted-foreground">Téléphone · Lydia, Wero</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="+33 6 12 34 56 78"
              autoComplete="tel"
              className="tabular mt-0.5 block h-8 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
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
