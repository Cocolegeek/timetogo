"use client";

import Link from "next/link";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check, ChevronRight, ListChecks } from "lucide-react";
import { useChecklist } from "@/hooks/useChecklist";
import { haptic } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";

const MAX_ROWS = 3;

/** Dashboard nudge from Listes: what the bande counts on you for (tick it right here). */
export function MyListCard({ tripId, myId }: { tripId: string; myId: string | null }) {
  const { items, updateItem } = useChecklist(tripId);
  const open = items.filter((i) => !i.done);
  const mine = myId ? open.filter((i) => i.assigneeIds.includes(myId)) : [];
  const nobody = open.filter((i) => i.assigneeIds.length === 0).length;
  const href = `/trips/${tripId}/lists`;

  if (mine.length === 0) {
    if (nobody === 0) return null;
    return (
      <Link href={href} className="pressable flex items-center gap-4 rounded-[1.5rem] bg-card p-4 shadow-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
          <ListChecks size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {nobody} chose{nobody > 1 ? "s" : ""} sans personne
          </span>
          <span className="block text-sm text-muted-foreground">Dis ce que tu prends en charge</span>
        </span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>
    );
  }

  return (
    <section className="rounded-[1.75rem] bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[1.15rem] font-bold tracking-tight">On compte sur toi</h2>
        <Link href={href} className="-mr-2 flex h-9 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Listes
          <ChevronRight size={16} />
        </Link>
      </div>
      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {mine.slice(0, MAX_ROWS).map((item) => (
            <motion.li
              key={item.id}
              layout="position"
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex items-center gap-3"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Cocher ${item.title}`}
                onClick={() => {
                  haptic("success");
                  void updateItem(item.id, { done: true });
                }}
                className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full outline-none"
              >
                <span className="flex size-[26px] items-center justify-center rounded-full border-2 border-foreground/25 text-transparent transition-colors hover:border-emerald-500 hover:text-emerald-500">
                  <Check size={15} strokeWidth={3} />
                </span>
              </button>
              <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.list === "bring" ? "À apporter" : "À faire"}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {(mine.length > MAX_ROWS || nobody > 0) && (
        <p className="mt-2 text-sm text-muted-foreground">
          {[
            mine.length > MAX_ROWS ? `+ ${mine.length - MAX_ROWS} autre${mine.length - MAX_ROWS > 1 ? "s" : ""}` : null,
            nobody > 0 ? `${nobody} sans personne` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
