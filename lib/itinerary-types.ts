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
  /** Tinted tile: background + icon colour. */
  tile: string;
}

export const ITINERARY_TYPES: Record<ItineraryType, ItineraryTypeConfig> = {
  accommodation: { label: "Hébergement", icon: Bed, tile: "bg-violet-500/12 text-violet-400" },
  activity: { label: "Activité", icon: Sparkles, tile: "bg-emerald-500/12 text-emerald-400" },
  food: { label: "Resto", icon: UtensilsCrossed, tile: "bg-rose-500/12 text-rose-400" },
  other: { label: "Autre", icon: MapPin, tile: "bg-foreground/[0.07] text-muted-foreground" },
  transport: { label: "Transport", icon: TrainFront, tile: "bg-sky-500/12 text-sky-400" },
  journey: { label: "Trajet", icon: Route, tile: "bg-sky-500/12 text-sky-400" },
};

export const JOURNEY_MODES: Record<JourneyMode, { label: string; icon: LucideIcon }> = {
  car: { label: "Voiture", icon: Car },
  foot: { label: "À pied", icon: PersonStanding },
  bike: { label: "Vélo", icon: Bike },
  transit: { label: "Transports", icon: Bus },
  plane: { label: "Avion", icon: Plane },
};
