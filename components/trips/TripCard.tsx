"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2, Calendar, Users, Wallet, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateRange, tripDuration, daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { isVoyage, TRIP_TYPE_LABELS } from "@/lib/trip-features";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onShare?: (trip: Trip) => void;
  index: number;
}

const ACCENT_GRADIENTS = [
  "from-indigo-500/30 to-violet-500/15",
  "from-sky-500/30 to-indigo-500/15",
  "from-violet-500/30 to-pink-500/15",
  "from-emerald-500/25 to-sky-500/15",
  "from-amber-500/25 to-orange-500/15",
];

export function TripCard({ trip, onEdit, onDelete, onShare, index }: TripCardProps) {
  const gradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length];

  // Status badge — only meaningful for voyages with dates.
  let badge: { label: string; className: string } | null = null;
  if (isVoyage(trip)) {
    const endDays = daysUntil(trip.endDate);
    const startDays = daysUntil(trip.startDate);
    if (endDays < 0) {
      badge = { label: "Passé", className: "bg-red-500/15 text-red-300 border border-red-500/20" };
    } else if (startDays > 0) {
      badge = { label: "Planifié", className: "bg-sky-500/15 text-sky-300 border border-sky-500/20" };
    } else {
      badge = { label: "En cours", className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" };
    }
  }

  const typeLabel = TRIP_TYPE_LABELS[trip.type];
  const typeBadgeClass = trip.type === "group"
    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
    : "bg-violet-500/15 text-violet-300 border border-violet-500/25";

  const href = trip.type === "group" ? `/trips/${trip.id}/budget` : `/trips/${trip.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative glass rounded-2xl overflow-hidden hover:border-foreground/15 transition-all duration-200 active:scale-[0.99]"
    >
      <Link href={href} className="block p-4">
        <div className="flex items-center gap-3 pr-12">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden",
              !trip.iconUrl && "bg-gradient-to-br",
              !trip.iconUrl && gradient
            )}
          >
            {trip.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trip.iconUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              trip.emoji
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-bold text-slate-100 text-xl truncate leading-tight">
              {trip.name}
            </h3>
            {isVoyage(trip) && trip.destination && (
              <p className="text-base text-slate-400 truncate">{trip.destination}</p>
            )}
          </div>
        </div>

        {/* Badges row — type + status (status only for voyages) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center text-sm px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider",
              typeBadgeClass
            )}
          >
            {typeLabel}
          </span>
          {badge && (
            <span
              className={cn(
                "inline-flex items-center text-sm px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider",
                badge.className
              )}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 text-base text-slate-500">
          {isVoyage(trip) ? (
            <>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {formatDateRange(trip.startDate, trip.endDate)}
              </span>
              <span className="text-slate-700">·</span>
              <span>{tripDuration(trip.startDate, trip.endDate)} j</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <Wallet size={13} />
              Budget partagé
            </span>
          )}
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1">
            <Users size={13} />
            {trip.participants.length}
          </span>
          <span className="ml-auto font-medium text-slate-400">
            {trip.currency}
          </span>
        </div>
      </Link>

      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all focus:outline-none"
            aria-label="Actions"
          >
            <MoreVertical size={18} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="glass-strong border-foreground/10 text-slate-200 min-w-44 bg-slate-900/95 backdrop-blur"
          >
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => onEdit(trip)}
            >
              <Pencil size={14} className="text-slate-400" />
              Modifier
            </DropdownMenuItem>
            {onShare && (
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => onShare(trip)}
              >
                <Share2 size={14} className="text-section" />
                Partager
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
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
