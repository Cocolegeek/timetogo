import type { Trip, TripType, VoyageTrip, GroupTrip } from "@/types";

/**
 * Single source of truth for which features each trip type supports.
 * Add a new type? Update this map and TypeScript will guide you everywhere it matters.
 */
export interface TripFeatures {
  hasPlanning: boolean;
  hasMenus: boolean;
  hasDates: boolean;
  hasDestination: boolean;
  hasTotalBudget: boolean;
}

const FEATURES_BY_TYPE: Record<TripType, TripFeatures> = {
  trip: {
    hasPlanning: true,
    hasMenus: true,
    hasDates: true,
    hasDestination: true,
    hasTotalBudget: true,
  },
  group: {
    hasPlanning: false,
    hasMenus: false,
    hasDates: false,
    hasDestination: false,
    hasTotalBudget: true,
  },
};

export function tripFeatures(trip: Pick<Trip, "type">): TripFeatures {
  return FEATURES_BY_TYPE[trip.type];
}

export function featuresForType(type: TripType): TripFeatures {
  return FEATURES_BY_TYPE[type];
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isVoyage(trip: Trip): trip is VoyageTrip {
  return trip.type === "trip";
}

export function isGroup(trip: Trip): trip is GroupTrip {
  return trip.type === "group";
}

// ─── UI labels ───────────────────────────────────────────────────────────────

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  trip: "Voyage",
  group: "Budget",
};
