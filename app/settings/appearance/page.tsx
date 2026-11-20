"use client";

import { Sparkles, Vibrate } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup, SettingsToggle } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import { useDevicePref } from "@/lib/device-prefs";

export default function AppearanceSettingsPage() {
  const { preference, setPreference } = useTheme();
  const [motion, setMotion] = useDevicePref("motion");
  const [haptics, setHaptics] = useDevicePref("haptics");

  return (
    <SettingsShell title="Apparence et confort">
      <StaggerItem>
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Thème</h2>
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
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            {preference === "system" ? "Suit le réglage de ton téléphone." : preference === "dark" ? "Toujours sombre." : "Toujours clair."}
          </p>
        </section>
      </StaggerItem>

      <StaggerItem>
        <SettingsGroup title="Sur cet appareil">
          <SettingsToggle
            icon={Sparkles}
            label="Animations"
            hint={motion === "reduced" ? "Réduites au minimum" : "Transitions et effets fluides"}
            checked={motion !== "reduced"}
            onChange={(on) => setMotion(on ? "auto" : "reduced")}
          />
          <SettingsToggle
            icon={Vibrate}
            label="Vibrations"
            hint="Petit retour au toucher (Android)"
            checked={haptics !== "off"}
            onChange={(on) => setHaptics(on ? "on" : "off")}
          />
        </SettingsGroup>
      </StaggerItem>
    </SettingsShell>
  );
}
