"use client";

import { cn } from "@/lib/utils";
import type { Participant } from "@/types";

interface ParticipantStackProps {
  /** Participants in display order (first ones shown). */
  participants: Participant[];
  /** Whether the involved set covers everyone (drives the trailing label). */
  everyone?: boolean;
  /** Max avatars to render before showing a "+N" bubble. Default 4. */
  max?: number;
  /** Avatar size variant. */
  size?: "sm" | "md";
  /** Color of the ring around each avatar (so they pop on the card). */
  ringColor?: string;
  className?: string;
}

const SIZES = {
  sm: { box: "w-6 h-6", text: "text-[10px]", overlap: "-space-x-1.5" },
  md: { box: "w-7 h-7", text: "text-[11px]", overlap: "-space-x-2" },
};

export function ParticipantStack({
  participants,
  everyone = false,
  max = 4,
  size = "sm",
  ringColor = "ring-slate-900",
  className,
}: ParticipantStackProps) {
  if (participants.length === 0) return null;

  const cfg = SIZES[size];
  const visible = participants.slice(0, max);
  const overflow = Math.max(participants.length - max, 0);

  let label: string;
  if (everyone) label = "Tout le monde";
  else if (participants.length === 1) label = participants[0].name;
  else
    label = `${participants.length} voyageur${participants.length !== 1 ? "s" : ""}`;

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div className={cn("flex shrink-0", cfg.overlap)}>
        {visible.map((p) => (
          <span
            key={p.id}
            title={p.name}
            className={cn(
              "rounded-full flex items-center justify-center font-bold text-white ring-2",
              cfg.box,
              cfg.text,
              ringColor
            )}
            style={{ backgroundColor: p.color }}
          >
            {p.name.charAt(0).toUpperCase()}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              "rounded-full flex items-center justify-center font-bold text-slate-200 bg-slate-700 ring-2",
              cfg.box,
              cfg.text,
              ringColor
            )}
          >
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-400 truncate">{label}</span>
    </div>
  );
}
