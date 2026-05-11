"use client";

import { TripEditDialog } from "./TripEditDialog";
import { useTrip } from "@/hooks/useTrip";

interface TripEditWrapperProps {
  tripId: string;
  onClose: () => void;
}

/**
 * Convenience wrapper that fetches a trip's data via `useTrip`
 * and feeds it into `TripEditDialog`. Useful from list views
 * where the trip object is partially loaded or where you want
 * fresh participant data.
 */
export function TripEditWrapper({ tripId, onClose }: TripEditWrapperProps) {
  const {
    trip,
    updateTrip,
    addParticipant,
    updateParticipant,
    deleteParticipant,
  } = useTrip(tripId);

  if (!trip) return null;

  return (
    <TripEditDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      trip={trip}
      onSaveTrip={updateTrip}
      onSaveIcon={(iconUrl) => updateTrip({ iconUrl })}
      onAddParticipant={addParticipant}
      onUpdateParticipant={updateParticipant}
      onDeleteParticipant={deleteParticipant}
    />
  );
}
