"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IdentityPicker } from "@/components/trips/IdentityPicker";
import { useTrip } from "@/hooks/useTrip";
import { useUserId } from "@/hooks/useUserId";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";

/** « Qui es-tu ? » — loaded on first open, not with the dashboard. */
export default function IdentityDialog({
  tripId,
  open,
  onOpenChange,
}: {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { trip, claims, setMyParticipant, addParticipant } = useTrip(tripId);
  const userId = useUserId();
  if (!trip) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-sm flex-col">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>Qui es-tu ?</DialogTitle>
          <DialogDescription>
            Choisis ton nom parmi les participants pour que tes dépenses soient bien attribuées.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <IdentityPicker
            participants={trip.participants}
            selectedId={trip.myParticipantId}
            claims={claims}
            currentUserId={userId}
            onSelect={async (id) => {
              await setMyParticipant(id);
              onOpenChange(false);
            }}
            onCreate={async (name) => {
              const color = PARTICIPANT_COLORS[trip.participants.length % PARTICIPANT_COLORS.length];
              return await addParticipant({ name, color });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
