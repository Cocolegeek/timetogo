"use client";

import { m as motion } from "framer-motion";
import { Check } from "lucide-react";
import { AVATAR_PRESETS, presetUrl } from "@/lib/avatars";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  value: string | null;
  onChange: (url: string) => void;
  /** Google profile photo, offered first when available. */
  googleUrl?: string | null;
}

/** Grid: Google photo (if any) + the preset library. */
export function AvatarPicker({ value, onChange, googleUrl }: AvatarPickerProps) {
  const options = [
    ...(googleUrl ? [{ url: googleUrl, label: "Ma photo Google" }] : []),
    ...AVATAR_PRESETS.map((p) => ({ url: presetUrl(p.id), label: p.label })),
  ];
  return (
    <div role="radiogroup" aria-label="Choisis ton avatar" className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {options.map((opt) => {
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
              <img src={opt.url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" draggable={false} />
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
  );
}
