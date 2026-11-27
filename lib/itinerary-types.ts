import {
  Bed,
  Bike,
  Bus,
  Car,
  MapPin,
  PersonStanding,
  Plane,
  Route,
  Sparkles,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ItineraryType, JourneyMode } from "@/types";

export interface ItineraryTypeConfig {
  label: string;
  icon: LucideIcon;
  /** Neutral tile: background + icon colour. */
  tile: string;
}

export const ITINERARY_TYPES: Record<ItineraryType, ItineraryTypeConfig> = {
  accommodation: { label: "Hébergement", icon: Bed, tile: "bg-secondary text-foreground" },
  activity: { label: "Activité", icon: Sparkles, tile: "bg-secondary text-foreground" },
  food: { label: "Resto", icon: UtensilsCrossed, tile: "bg-secondary text-foreground" },
  other: { label: "Autre", icon: MapPin, tile: "bg-secondary text-foreground" },
  transport: { label: "Transport", icon: TrainFront, tile: "bg-secondary text-foreground" },
  journey: { label: "Trajet", icon: Route, tile: "bg-secondary text-foreground" },
};

export const JOURNEY_MODES: Record<JourneyMode, { label: string; icon: LucideIcon }> = {
  car: { label: "Voiture", icon: Car },
  foot: { label: "À pied", icon: PersonStanding },
  bike: { label: "Vélo", icon: Bike },
  transit: { label: "Transports", icon: Bus },
  plane: { label: "Avion", icon: Plane },
};

/** « Paris, Île-de-France, France » → « Paris » */
export function shortPlace(place: string): string {
  return place.split(",")[0].trim();
}

/** Titre d'affichage : un trajet est toujours « Ville → Ville », même si son titre stocké est l'adresse complète. */
export function itemTitle(item: { type: ItineraryType; title: string; location?: string; destination?: string }): string {
  if (item.type === "journey" && item.location && item.destination) {
    return `${shortPlace(item.location)} → ${shortPlace(item.destination)}`;
  }
  return item.title;
}
