"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useFriends } from "@/hooks/useFriends";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Friend } from "@/types";

interface FriendPickerProps {
  selected: string[];
  onToggle: (friend: Friend) => void;
  /** Friends already in the trip (user ids): not offered again. */
  exclude?: string[];
  className?: string;
}

/**
 * One-tap row of « Ta bande ». A picked friend joins the trip as a linked
 * member: the trip appears in their list, no share code needed.
 */
export function FriendPicker({ selected, onToggle, exclude = [], className }: FriendPickerProps) {
  const { friends } = useFriends();
  const offered = friends.filter((f) => !exclude.includes(f.id));
  if (offered.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-sm font-semibold">Ta bande</h3>
        <span className="text-xs text-muted-foreground">Le voyage apparaîtra chez eux</span>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pt-1 pb-1">
        {offered.map((f) => {
          const on = selected.includes(f.id);
          const first = f.name?.split(" ")[0] ?? "Pote";
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              aria-label={on ? `Retirer ${first}` : `Ajouter ${first}`}
              onClick={() => {
                haptic("light");
                onToggle(f);
              }}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5 outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-ring"
            >
              <span className={cn("relative rounded-full transition-shadow", on && "ring-[3px] ring-foreground ring-offset-2 ring-offset-background")}>
                <motion.span animate={{ scale: on ? 0.92 : 1 }} transition={spring} className="block">
                  <UserAvatar src={f.avatar} name={f.name} size={56} />
                </motion.span>
                {on && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring}
                    className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background"
                  >
                    <Check size={13} strokeWidth={3} />
                  </motion.span>
                )}
              </span>
              <span className={cn("w-full truncate text-center text-xs", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{first}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
