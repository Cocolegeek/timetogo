"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dices } from "lucide-react";
import {
  BACKGROUNDS,
  EYES,
  FACIAL,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MASKS,
  MOUTHS,
  SKINS,
  avatarDataUrl,
  parseAvatarConfig,
  randomConfig,
  DEFAULT_AVATAR,
  type AvatarConfig,
} from "@/lib/avatar-builder";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  value: string | null;
  onChange: (url: string) => void;
  /** Photo Google, proposée en plus du créateur quand elle existe. */
  googleUrl?: string | null;
  /** Attente avant d'enregistrer un choix (réglages : évite une écriture à chaque toucher). */
  debounceMs?: number;
}

type TabId = "look" | "hair" | "face" | "extras";

const TABS: { id: TabId; label: string }[] = [
  { id: "look", label: "Peau et fond" },
  { id: "hair", label: "Cheveux" },
  { id: "face", label: "Visage" },
  { id: "extras", label: "Accessoires" },
];

const LABELS: Record<string, string> = {
  chauve: "Chauve", court: "Courts", rase: "Rasés", raie: "Raie", long: "Longs", bob: "Carré", tresses: "Tresses",
  bun: "Chignon", ponytail: "Queue", boucles: "Bouclés", afro: "Afro", crete: "Crête",
  dots: "Rond", happy: "Content", wink: "Clin d'oeil", sleepy: "Zen", stars: "Étoiles",
  smile: "Sourire", grin: "Grand", tongue: "Langue", oh: "Oh", flat: "Neutre",
  none: "Aucun", beard: "Barbe", mustache: "Moustache",
  round: "Rondes", sun: "Soleil",
  beanie: "Bonnet", cap: "Casquette", bucket: "Bob", beret: "Béret", cowboy: "Cow-boy", crown: "Couronne",
  viking: "Viking", wizard: "Sorcier", chef: "Toque",
  justicier: "Justicier", diving: "Plongée",
};

const VIEWS = {
  hair: "16 12 96 96",
  beard: "32 54 64 64",
  eyes: "44 42 40 40",
  mouth: "44 54 40 40",
  glasses: "34 36 60 60",
  hat: "24 0 80 80",
  mask: "24 12 80 80",
} as const;

function Thumb({ config, label, selected, onPick, view }: { config: AvatarConfig; label: string; selected: boolean; onPick: () => void; view: keyof typeof VIEWS }) {
  const src = useMemo(() => avatarDataUrl(config, VIEWS[view]), [config, view]);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onPick}
      className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1 outline-none"
    >
      <span
        className={cn(
          "block size-14 overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-shadow",
          selected ? "ring-[3px] ring-foreground" : "ring-1 ring-border"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="size-full object-cover" draggable={false} />
      </span>
      <span className={cn("max-w-full truncate text-[0.6875rem]", selected ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}

function Swatch({ color, label, selected, onPick }: { color: string; label: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onPick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "block size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow",
          selected ? "ring-[3px] ring-foreground" : "ring-1 ring-border"
        )}
        style={{ backgroundColor: color }}
      />
    </button>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-sm font-semibold">{title}</p>
      <div role="radiogroup" aria-label={title} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
        {children}
      </div>
    </div>
  );
}

/** Créateur d'avatar : aperçu en direct, choix par catégorie, photo Google en option. */
export function AvatarPicker({ value, onChange, googleUrl, debounceMs = 0 }: AvatarPickerProps) {
  const [config, setConfig] = useState<AvatarConfig>(() => parseAvatarConfig(value) ?? randomConfigStable(value));
  const [tab, setTab] = useState<TabId>("look");
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preview = useMemo(() => avatarDataUrl(config), [config]);
  const usingBuilt = parseAvatarConfig(value) !== null;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const apply = (next: AvatarConfig) => {
    setTouched(true);
    setConfig(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs <= 0) onChange(avatarDataUrl(next));
    else timer.current = setTimeout(() => onChange(avatarDataUrl(next)), debounceMs);
  };
  const set = <K extends keyof AvatarConfig>(key: K, v: AvatarConfig[K]) => {
    haptic("light");
    apply({ ...config, [key]: v });
  };
  const shuffle = () => {
    haptic("light");
    apply(randomConfig());
  };

  const showPhoto = !!googleUrl && value === googleUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="block size-24 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={showPhoto && googleUrl ? googleUrl : preview} alt="Aperçu de ton avatar" referrerPolicy="no-referrer" className="size-full object-cover" draggable={false} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={shuffle}
            className="pressable flex h-11 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold transition-colors hover:bg-foreground/[0.08]"
          >
            <Dices size={17} />
            Au hasard
          </button>
          {googleUrl && (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onChange(googleUrl);
              }}
              className={cn(
                "pressable h-11 rounded-full px-4 text-sm font-semibold transition-colors",
                showPhoto ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-foreground/[0.08]"
              )}
            >
              Ma photo Google
            </button>
          )}
          {!usingBuilt && !showPhoto && !touched && value && (
            <p className="text-xs text-muted-foreground">Touche un réglage pour créer ton avatar.</p>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Catégories" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "look" && (
        <div className="space-y-3">
          <Row title="Peau">
            {SKINS.map((c, i) => (
              <Swatch key={c} color={c} label={`Peau ${i + 1}`} selected={config.skin === i} onPick={() => set("skin", i)} />
            ))}
          </Row>
          <Row title="Fond">
            {BACKGROUNDS.map((c, i) => (
              <Swatch key={c} color={c} label={`Fond ${i + 1}`} selected={config.bg === i} onPick={() => set("bg", i)} />
            ))}
          </Row>
        </div>
      )}

      {tab === "hair" && (
        <div className="space-y-3">
          <Row title="Coupe">
            {HAIR_STYLES.map((h) => (
              <Thumb view="hair" key={h} config={{ ...config, hair: h }} label={LABELS[h]} selected={config.hair === h} onPick={() => set("hair", h)} />
            ))}
          </Row>
          <Row title="Couleur">
            {HAIR_COLORS.map((c, i) => (
              <Swatch key={c} color={c} label={`Cheveux ${i + 1}`} selected={config.hairColor === i} onPick={() => set("hairColor", i)} />
            ))}
          </Row>
          <Row title="Barbe">
            {FACIAL.map((f) => (
              <Thumb view="beard" key={f} config={{ ...config, facial: f }} label={LABELS[f]} selected={config.facial === f} onPick={() => set("facial", f)} />
            ))}
          </Row>
        </div>
      )}

      {tab === "face" && (
        <div className="space-y-3">
          <Row title="Yeux">
            {EYES.map((e) => (
              <Thumb view="eyes" key={e} config={{ ...config, eyes: e }} label={LABELS[e]} selected={config.eyes === e} onPick={() => set("eyes", e)} />
            ))}
          </Row>
          <Row title="Bouche">
            {MOUTHS.map((m) => (
              <Thumb view="mouth" key={m} config={{ ...config, mouth: m }} label={LABELS[m]} selected={config.mouth === m} onPick={() => set("mouth", m)} />
            ))}
          </Row>
        </div>
      )}

      {tab === "extras" && (
        <div className="space-y-3">
          <Row title="Lunettes">
            {GLASSES.map((g) => (
              <Thumb view="glasses" key={g} config={{ ...config, glasses: g }} label={LABELS[g]} selected={config.glasses === g} onPick={() => set("glasses", g)} />
            ))}
          </Row>
          <Row title="Chapeau">
            {HATS.map((h) => (
              <Thumb view="hat" key={h} config={{ ...config, hat: h }} label={LABELS[h]} selected={config.hat === h} onPick={() => set("hat", h)} />
            ))}
          </Row>
          <Row title="Masque">
            {MASKS.map((m) => (
              <Thumb view="mask" key={m} config={{ ...config, mask: m }} label={LABELS[m]} selected={config.mask === m} onPick={() => set("mask", m)} />
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}

function randomConfigStable(seedSource: string | null): AvatarConfig {
  return seedSource ? randomConfig(seedSource.slice(-24)) : DEFAULT_AVATAR;
}
