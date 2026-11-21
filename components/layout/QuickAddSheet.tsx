"use client";

import { m as motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { QuickAddKind } from "@/hooks/useQuickAdd";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface QuickAddAction {
  kind: QuickAddKind;
  label: string;
  hint: string;
  icon: LucideIcon;
  tile: string;
  href: string;
}

/** The « + » sheet, loaded on first tap (not part of the launch). */
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 p-0">
        <div className="px-6 pt-8 pr-16 pb-4">
          <SheetTitle>Ajouter</SheetTitle>
          <SheetDescription className="mt-1 text-[0.95rem]">Que veux-tu ajouter au voyage ?</SheetDescription>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
          {actions.map((a, i) => (
            <motion.button
              key={a.kind}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 + i * 0.04 }}
              onClick={() => onPick(a.kind, a.href)}
              className="pressable flex flex-col items-start gap-4 rounded-[1.5rem] bg-secondary p-4 text-left transition-colors hover:bg-foreground/[0.08]"
            >
              <span className={cn("flex size-12 items-center justify-center rounded-2xl shadow-card", a.tile)}>
                <a.icon size={22} />
              </span>
              <span>
                <span className="block text-[1.05rem] font-semibold">{a.label}</span>
                <span className="block text-sm text-muted-foreground">{a.hint}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
