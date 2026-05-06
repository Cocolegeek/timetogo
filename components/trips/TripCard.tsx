"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2, Calendar, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateRange, tripDuration, daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  index: number;
}

const ACCENT_GRADIENTS = [
  "from-indigo-500/30 to-violet-500/15",
  "from-sky-500/30 to-indigo-500/15",
  "from-violet-500/30 to-pink-500/15",
  "from-emerald-500/25 to-sky-500/15",
  "from-amber-500/25 to-orange-500/15",
];

export function TripCard({ trip, onEdit, onDelete, index }: TripCardProps) {
  const gradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length];
  const duration = tripDuration(trip.startDate, trip.endDate);
  const days = daysUntil(trip.startDate);

  // Status badge
  let badge: { label: string; className: string } | null = null;
  if (days > 0 && days <= 30) {
    badge = {
      label: `Dans ${days} j`,
      className: "bg-indigo-500/15 text-indigo-300",
    };
  } else if (days <= 0 && daysUntil(trip.endDate) >= 0) {
    badge = { label: "En cours", className: "bg-emerald-500/15 text-emerald-300" };
  } else if (daysUntil(trip.endDate) < 0) {
    badge = { label: "Passé", className: "bg-white/5 text-slate-400" };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative glass rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-200 active:scale-[0.99]"
    >
      <Link href={`/trips/${trip.id}`} className="block p-4">
        <div className="flex items-center gap-3">
          {/* Emoji tile */}
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 bg-gradient-to-br",
              gradient
            )}
          >
            {trip.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-base truncate flex-1">
                {trip.name}
              </h3>
              {badge && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 truncate">{trip.destination}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} />
            {formatDateRange(trip.startDate, trip.endDate)}
          </span>
          <span className="text-slate-700">·</span>
          <span>
            {duration} j{duration !== 1 ? "" : ""}
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {trip.participants.length}
          </span>
          <span className="ml-auto font-medium text-slate-400">
            {trip.currency}
          </span>
        </div>
      </Link>

      {/* Action menu — absolute, outside the Link to prevent navigation */}
      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all focus:outline-none"
            aria-label="Actions"
          >
            <MoreVertical size={18} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="glass-strong border-white/10 text-slate-200 min-w-44 bg-slate-900/95 backdrop-blur"
          >
            {trip.isOwner && (
              <>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => onEdit(trip)}
                >
                  <Pencil size={14} className="text-slate-400" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(trip.id)}
              className="gap-2 cursor-pointer text-red-400"
              variant="destructive"
            >
              <Trash2 size={14} />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
