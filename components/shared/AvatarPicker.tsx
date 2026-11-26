"use client";

import { useMemo, useState } from "react";
import { m as motion } from "framer-motion";
import { Check, Shuffle } from "lucide-react";
import { AVATAR_PRESETS, presetUrl } from "@/lib/avatars";
import { AVATAR_STYLES, dicebearUrl, type AvatarStyleId } from "@/lib/avatar-styles";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  value: string | null;
  onChange: (url: string) => void;
  /** Google profile photo, offered first when available. */
  googleUrl?: string | null;
}

type CollectionId = "voyou" | AvatarStyleId;

const COLLECTIONS: { id: CollectionId; label: string }[] = [
  { id: "voyou", label: "Voyou" },
  ...AVATAR_STYLES.map((s) => ({ id: s.id, label: s.label })),
];

const PER_PAGE = 24;

function collectionOf(value: string | null): CollectionId {
  const match = value?.match(/^\/api\/avatar\?style=([A-Za-z]+)&/);
  const style = AVATAR_STYLES.find((s) => s.id === match?.[1]);
  return style ? style.id : "voyou";
}

/** Choix d'avatar : photo Google en option, puis des collections (celles de Voyou, et des collections libres). */
export function AvatarPicker({ value, onChange, googleUrl }: AvatarPickerProps) {
  const [collection, setCollection] = useState<CollectionId>(() => collectionOf(value));
  const [page, setPage] = useState(0);

  const options = useMemo(() => {
    if (collection === "voyou") return AVATAR_PRESETS.map((p) => ({ url: presetUrl(p.id), label: p.label }));
    return Array.from({ length: PER_PAGE }, (_, i) => {
      const seed = `v${page}-${i + 1}`;
      return { url: dicebearUrl(collection, seed), label: `Avatar ${i + 1}` };
    });
  }, [collection, page]);

  const all = [...(googleUrl ? [{ url: googleUrl, label: "Ma photo" }] : []), ...options];
  // Un avatar déjà choisi dans cette collection reste visible en tête, même après « Autres ».
  const pinned = value && collection !== "voyou" && collectionOf(value) === collection && !all.some((o) => o.url === value);
  const shown = pinned ? [{ url: value as string, label: "Ton avatar" }, ...all] : all;

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Collections d'avatars" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={collection === c.id}
            onClick={() => {
              setCollection(c.id);
              setPage(0);
            }}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              collection === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Choisis ton avatar" className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {shown.map((opt) => {
          const selected = value === opt.url;
          return (
            <button
              key={opt.url}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => {
                haptic("light");
                onChange(opt.url);
              }}
              className="relative aspect-square rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <motion.span
                animate={{ scale: selected ? 1 : 0.9 }}
                transition={spring}
                className={cn(
                  "block h-full w-full overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-shadow",
                  selected ? "ring-[3px] ring-foreground" : "ring-0"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={opt.url} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" draggable={false} />
              </motion.span>
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring}
                  className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background"
                >
                  <Check size={14} strokeWidth={3} />
                </motion.span>
              )}
              {opt.url === googleUrl && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5 text-[0.625rem] font-bold shadow-card">G</span>
              )}
            </button>
          );
        })}
      </div>

      {collection !== "voyou" && (
        <button
          type="button"
          onClick={() => {
            haptic("light");
            setPage((p) => p + 1);
          }}
          className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold transition-colors hover:bg-foreground/[0.08]"
        >
          <Shuffle size={16} />
          Voir d&apos;autres
        </button>
      )}
    </div>
  );
}
