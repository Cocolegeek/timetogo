"use client";

import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import type { Participant } from "@/types";

const CHIP =
  "pressable flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ON = "bg-primary text-primary-foreground";
const OFF = "bg-secondary text-foreground hover:bg-foreground/[0.08]";

interface ParticipantPickerProps {
  participants: Participant[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Shows a leading « Tout le monde » chip that selects / clears everyone. */
  onToggleAll?: () => void;
  className?: string;
}

/** The one participant multi-select used by every form (payers, étapes, trajets, repas). */
export function ParticipantPicker({ participants, selected, onToggle, onToggleAll, className }: ParticipantPickerProps) {
  const all = participants.length > 0 && participants.every((p) => selected.includes(p.id));
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {onToggleAll && (
        <button
          type="button"
          aria-pressed={all}
          onClick={() => {
            haptic("light");
            onToggleAll();
          }}
          className={cn(CHIP, all ? ON : OFF)}
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full",
              all ? "bg-primary-foreground/15" : "bg-foreground/[0.07]"
            )}
          >
            {all ? <Check size={15} strokeWidth={2.6} /> : <Users size={15} />}
          </span>
          Tout le monde
        </button>
      )}
      {participants.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              haptic("light");
              onToggle(p.id);
            }}
            className={cn(CHIP, on ? ON : OFF)}
          >
            <ParticipantAvatar participant={p} size="sm" className={on ? "ring-primary" : "ring-secondary"} />
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
