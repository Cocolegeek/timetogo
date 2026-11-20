"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, MoreHorizontal, Pencil, Settings, Share } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTrip } from "@/hooks/useTrip";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TripEditDialog = dynamic(
  () => import("@/components/trips/TripEditDialog").then((m) => ({ default: m.TripEditDialog })),
  { ssr: false }
);
const ShareModal = dynamic(
  () => import("@/components/trips/ShareModal").then((m) => ({ default: m.ShareModal })),
  { ssr: false }
);

const ICON_BTN =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] active:bg-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TripAppHeader({ tripId }: { tripId: string }) {
  const { trip, updateTrip, addParticipant, updateParticipant, deleteParticipant } =
    useTrip(tripId);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const scrolled = useScrolled(4);
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-background"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        <Link href="/trips" aria-label="Tous les voyages" className={ICON_BTN}>
          <ChevronLeft size={24} strokeWidth={2.2} />
        </Link>

        <p
          className={cn(
            "min-w-0 flex-1 truncate font-display text-[1.05rem] font-bold tracking-tight transition-opacity duration-300",
            scrolled ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={!scrolled}
        >
          {trip?.name}
        </p>

        {trip && (
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => setShareOpen(true)} className={ICON_BTN} aria-label="Partager le voyage">
              <Share size={19} strokeWidth={2} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className={ICON_BTN} aria-label="Plus d'actions">
                <MoreHorizontal size={21} strokeWidth={2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Modifier {trip.type === "group" ? "le groupe" : "le voyage"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings />
                  Paramètres
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {trip && (
        <>
          <TripEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            trip={trip}
            onSaveTrip={async (data) => { await updateTrip(data); }}
            onSaveIcon={(iconUrl) => updateTrip({ iconUrl })}
            onAddParticipant={addParticipant}
            onUpdateParticipant={updateParticipant}
            onDeleteParticipant={deleteParticipant}
          />
          <ShareModal open={shareOpen} onOpenChange={setShareOpen} trip={trip} />
        </>
      )}
    </header>
  );
}
