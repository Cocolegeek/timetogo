"use client";

import { m as motion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { QuickAddKind } from "@/hooks/useQuickAdd";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface QuickAddAction {
  kind: QuickAddKind;
  label: string;
  icon: LucideIcon;
  tile: string;
  href: string;
}

/**
 * The « + » sheet, loaded on first tap (not part of the launch).
 * `actions` arrive ordered: the first one is the most likely (current screen, else expense) and gets the big row.
 */
export default function QuickAddSheet({
  open,
  onOpenChange,
  actions,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: QuickAddAction[];
  onPick: (kind: QuickAddKind, href: string) => void;
}) {
  const [lead, ...others] = actions;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 p-0">
        <div className="px-6 pt-8 pr-16 pb-4">
          <SheetTitle>Ajouter</SheetTitle>
          <SheetDescription className="sr-only">Choisis ce que tu veux ajouter au voyage.</SheetDescription>
        </div>
        <div className="space-y-3 px-5 pb-6">
          {lead && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.04 }}
              onClick={() => onPick(lead.kind, lead.href)}
              className="pressable flex min-h-[4.5rem] w-full items-center gap-4 rounded-[1.5rem] bg-primary px-5 text-left text-primary-foreground shadow-section"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/15">
                <lead.icon size={24} />
              </span>
              <span className="flex-1 font-display text-[1.25rem] font-bold tracking-tight">{lead.label}</span>
              <ChevronRight size={20} aria-hidden="true" className="opacity-60" />
            </motion.button>
          )}

          {others.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.09 }}
              className="overflow-hidden rounded-[1.5rem] bg-secondary [&>li+li]:border-t [&>li+li]:border-border"
            >
              {others.map((a) => (
                <li key={a.kind}>
                  <button
                    type="button"
                    onClick={() => onPick(a.kind, a.href)}
                    className="pressable flex min-h-16 w-full items-center gap-4 px-4 text-left transition-colors hover:bg-foreground/[0.06]"
                  >
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-card", a.tile)}>
                      <a.icon size={20} />
                    </span>
                    <span className="flex-1 text-[1.05rem] font-semibold">{a.label}</span>
                    <ChevronRight size={18} aria-hidden="true" className="text-muted-foreground" />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
