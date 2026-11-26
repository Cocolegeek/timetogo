"use client";

import { useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type PropertyChipItem =
  | { id: string; node: React.ReactNode }
  | {
      id: string;
      icon: LucideIcon;
      /** La valeur choisie, ou le nom du réglage tant qu'il est vide : la rangée se lit comme un résumé. */
      label: string;
      /** Vrai quand la valeur diffère du défaut : la puce s'affirme. */
      filled?: boolean;
      /** Point d'alerte : quelque chose reste à compléter dans ce réglage. */
      issue?: boolean;
      /** Se déroule sous la rangée quand on touche la puce. */
      panel: React.ReactNode;
    };

/** Réglages d'un formulaire en puces : chaque puce affiche sa valeur et ouvre son choix juste en dessous. */
export function PropertyChips({
  items,
  className,
}: {
  items: PropertyChipItem[];
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((i): i is Extract<PropertyChipItem, { panel: React.ReactNode }> => "panel" in i && i.id === openId);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Réglages">
        {items.map((item) => {
          if ("node" in item) return <div key={item.id}>{item.node}</div>;
          const Icon = item.icon;
          const isOpen = openId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                haptic("light");
                setOpenId(isOpen ? null : item.id);
              }}
              className={cn(
                "pressable relative inline-flex h-11 max-w-full items-center gap-2 rounded-full px-4 text-[0.95rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                item.filled ? "bg-foreground/[0.1] font-semibold text-foreground" : "bg-foreground/[0.05] font-medium text-muted-foreground",
                isOpen && "ring-2 ring-foreground/60 ring-inset"
              )}
            >
              <Icon size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
              {item.issue && <span className="size-1.5 shrink-0 rounded-full bg-amber-400" aria-label="à compléter" />}
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.div
            key={open.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-[1.25rem] bg-secondary p-3">{open.panel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
