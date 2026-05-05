"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  onDelete: (id: string) => void;
  index: number;
}

const ACCENT_GRADIENTS = [
  "from-indigo-600/30 to-violet-600/20",
  "from-sky-600/30 to-indigo-600/20",
  "from-violet-600/30 to-pink-600/20",
  "from-emerald-600/20 to-sky-600/20",
  "from-amber-600/20 to-orange-600/20",
];

export function TripCard({ trip, onDelete, index }: TripCardProps) {
  const gradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length];
  const duration = Math.round(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group relative glass rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300"
    >
      {/* Gradient header */}
      <div className={cn("h-24 bg-gradient-to-br", gradient, "relative")}>
        <span className="absolute top-4 left-4 text-4xl">{trip.emoji}</span>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/30 hover:bg-red-500/30 text-white hover:text-red-300 rounded-xl"
            onClick={(e) => {
              e.preventDefault();
              onDelete(trip.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Link href={`/trips/${trip.id}`} className="block p-4 pt-3">
        <h3 className="font-semibold text-slate-100 text-base truncate">
          {trip.name}
        </h3>

        <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 text-xs">
          <MapPin size={12} />
          <span>{trip.destination}</span>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {duration} j
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {trip.participants.length} pers.
          </span>
          <span className="ml-auto font-medium text-slate-400">
            {trip.currency}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
