"use client";

import { useEffect, useState } from "react";
import { BellRing, Send, Share, SquarePlus } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsRow, SettingsToggle } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { useToast } from "@/components/shared/Toaster";
import { useProfile } from "@/hooks/useProfile";
import { NOTIFICATION_KINDS, isKindEnabled } from "@/lib/notifications/events";
import { notify } from "@/lib/notifications/notify";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/notifications/push";
import type { NotificationKind } from "@/types";

const STATE_HINT: Record<PushState, string> = {
  on: "Cet appareil reçoit les notifications.",
  off: "Active-les pour être prévenu sans ouvrir l'app.",
  denied: "Bloquées par le navigateur : autorise Voyou dans ses réglages, puis reviens ici.",
  unsupported: "Ce navigateur ne gère pas les notifications push.",
  "needs-install": "Sur iPhone, les notifications marchent une fois Voyou installé sur l'écran d'accueil.",
};

export default function NotificationSettingsPage() {
  const { profile, updateProfile } = useProfile();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverReady, setServerReady] = useState(true);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
    fetch("/api/notify")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setServerReady(!!d.configured))
      .catch(() => null);
  }, []);

  const toggleDevice = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      if (on && next === "on") toast({ message: "Notifications activées", tone: "success" });
      if (on && next === "denied") toast({ message: "Autorisation refusée par le navigateur.", tone: "error" });
    } catch {
      toast({ message: "Impossible d'activer les notifications. Réessaie.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const prefs = profile?.notification_prefs ?? {};
  const setKind = (kind: NotificationKind, on: boolean) => updateProfile({ notification_prefs: { ...prefs, [kind]: on } });

  return (
    <SettingsShell title="Notifications" subtitle="Choisis ce qui mérite de te déranger. Le reste t'attend dans l'app.">
      <StaggerItem>
        <SettingsGroup footer={state ? STATE_HINT[state] : undefined}>
          {state === "needs-install" ? (
            <>
              <SettingsRow icon={Share} label="1. Touche Partager" hint="En bas de Safari" chevron={false} />
              <SettingsRow icon={SquarePlus} label="2. « Sur l'écran d'accueil »" hint="Puis ouvre Voyou depuis l'icône" chevron={false} />
            </>
          ) : (
            <SettingsToggle
              icon={BellRing}
              label="Sur cet appareil"
              checked={state === "on"}
              disabled={busy || state === null || state === "unsupported" || state === "denied"}
              onChange={toggleDevice}
            />
          )}
          {state === "on" && (
            <SettingsRow
              icon={Send}
              label="M'envoyer un test"
              chevron={false}
              onClick={() => {
                notify({ event: "test" });
                toast({ message: "Test envoyé, il arrive dans quelques secondes." });
              }}
            />
          )}
        </SettingsGroup>
        {!serverReady && (
          <p className="mt-3 rounded-[1.25rem] bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Les notifications ne sont pas encore actives. Tes choix sont gardés.
          </p>
        )}
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup title="Me prévenir pour" footer="Ces choix te suivent sur tous tes appareils.">
          {NOTIFICATION_KINDS.map(({ kind, label, hint }) => (
            <SettingsToggle
              key={kind}
              label={label}
              hint={hint}
              checked={isKindEnabled(prefs, kind)}
              onChange={(on) => void setKind(kind, on)}
            />
          ))}
        </SettingsGroup>
      </StaggerItem>
    </SettingsShell>
  );
}
