"use client";

import { useState } from "react";
import { History, Pencil, Share, Trash2 } from "lucide-react";
import { ActivityList } from "@/components/budget/ActivityList";
import { useActivity } from "@/hooks/useActivity";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

/** Bottom action sheet of a trip card, loaded on first tap. */
export default function TripActionsSheet({
  trip,
  open,
  onOpenChange,
  onEdit,
  onShare,
  onDelete,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (trip: Trip) => void;
  onShare?: (trip: Trip) => void;
  onDelete: (id: string) => void;
}) {
  const [journal, setJournal] = useState(false);
  const { entries } = useActivity(trip.id, journal);
  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const rows = [
    { label: "Modifier", icon: Pencil, action: () => onEdit(trip) },
    ...(onShare ? [{ label: "Partager", icon: Share, action: () => onShare(trip) }] : []),
    { label: "Journal d'activité", icon: History, action: () => setJournal(true), keepOpen: true },
    { label: "Supprimer", icon: Trash2, action: () => onDelete(trip.id), danger: true },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 p-0">
        <div className="px-6 pt-8 pr-16 pb-3">
          <SheetTitle className="truncate">{trip.name}</SheetTitle>
        </div>
        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-[1.5rem] bg-secondary [&>*+*]:border-t [&>*+*]:border-border">
            {rows.map(({ label, icon: Icon, action, danger, keepOpen }) => (
              <button
                key={label}
                type="button"
                onClick={() => (keepOpen ? action() : run(action))}
                className={cn(
                  "flex h-14 w-full items-center gap-3 px-4 text-left text-[0.98rem] font-medium transition-colors hover:bg-foreground/[0.04]",
                  danger && "text-red-400"
                )}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div aria-hidden style={{ height: "env(safe-area-inset-bottom)" }} />
      </SheetContent>
      <Sheet open={journal} onOpenChange={setJournal}>
        <SheetContent side="bottom" className="gap-0 p-0" style={{ maxHeight: "88dvh" }}>
          <div className="px-6 pt-8 pr-16 pb-3">
            <SheetTitle>Journal d&apos;activité</SheetTitle>
          </div>
          <div className="overflow-y-auto px-4 pb-6">
            <ActivityList entries={entries} currency={trip.currency} />
          </div>
        </SheetContent>
      </Sheet>
    </Sheet>
  );
}
