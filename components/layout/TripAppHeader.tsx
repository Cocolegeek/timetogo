"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTrip } from "@/hooks/useTrip";

const TripEditDialog = dynamic(
  () => import("@/components/trips/TripEditDialog").then((m) => ({ default: m.TripEditDialog })),
  { ssr: false }
);
const ShareModal = dynamic(
  () => import("@/components/trips/ShareModal").then((m) => ({ default: m.ShareModal })),
  { ssr: false }
);

export function TripAppHeader({ tripId }: { tripId: string }) {
  const { trip, updateTrip, addParticipant, updateParticipant, deleteParticipant } =
    useTrip(tripId);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 glass-strong border-b border-foreground/8"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2">
        {/* Logo */}
        <Link href="/trips" aria-label="Accueil" className="shrink-0">
          <VoyouLogo />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {trip && (
            <>
              <button
                onClick={() => setEditOpen(true)}
                className="p-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-500 hover:text-slate-200 transition-all"
                aria-label="Modifier"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="p-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-500 hover:text-section-soft transition-all"
                aria-label="Partager"
              >
                <Share2 size={15} />
              </button>
            </>
          )}
          <UserMenu />
        </div>
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
