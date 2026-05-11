"use client";

import { motion } from "framer-motion";
import { UserCheck } from "lucide-react";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types";

interface IdentityPickerProps {
  participants: Participant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Mode compact : inline dans le dashboard vs plein écran au join */
  compact?: boolean;
}

export function IdentityPicker({
  participants,
  selectedId,
  onSelect,
  compact = false,
}: IdentityPickerProps) {
  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-3 pb-1">
          <div className="w-9 h-9 rounded-xl bg-section-soft flex items-center justify-center shrink-0">
            <UserCheck size={20} className="text-section" />
          </div>
          <p className="text-lg font-semibold text-slate-100 leading-snug">
            Qui es-tu parmi les voyageurs ?
          </p>
        </div>
      )}

      <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {participants.map((p, i) => {
          const isSelected = selectedId === p.id;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              type="button"
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                isSelected
                  ? "border-section-strong bg-section-tint ring-1 ring-section"
                  : "border-foreground/8 bg-foreground/4 hover:border-foreground/15 hover:bg-foreground/8"
              )}
            >
              <ParticipantAvatar participant={p} size={compact ? "sm" : "md"} />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-base truncate",
                    isSelected ? "text-section-soft" : "text-slate-200"
                  )}
                >
                  {p.name}
                </p>
                {isSelected && (
                  <p className="text-sm text-section">C&apos;est moi</p>
                )}
              </div>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-section shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
