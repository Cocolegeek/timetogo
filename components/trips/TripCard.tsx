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
import { TripCover } from "@/components/trips/TripCover";
import { isVoyage, TRIP_TYPE_LABELS } from "@/lib/trip-features";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onShare?: (trip: Trip) => void;
  index: number;
}

export function TripCard({ trip, onEdit, onDelete, onShare, index }: TripCardProps) {

  // Status badge — voyages always have dates; groups only when a date was set.
  let badge: { label: string; className: string } | null = null;
  const badgeStart = isVoyage(trip) ? trip.startDate : trip.startDate;
  const badgeEnd = isVoyage(trip) ? trip.endDate : (trip.endDate ?? trip.startDate);
  if (badgeStart) {
    const endDays = daysUntil(badgeEnd!);
    const startDays = daysUntil(badgeStart);
    if (endDays < 0) {
      badge = { label: "Passé", className: "bg-secondary text-slate-400" };
    } else if (startDays > 0) {
      badge = { label: "Planifié", className: "bg-secondary text-slate-200" };
    } else {
      badge = { label: "En cours", className: "bg-emerald-500/15 text-emerald-300" };
    }
  }

  const typeLabel = TRIP_TYPE_LABELS[trip.type];
  const typeBadgeClass = trip.type === "group"
    ? "bg-secondary text-slate-200"
    : "bg-secondary text-slate-200";

  const href = trip.type === "group" ? `/trips/${trip.id}/budget` : `/trips/${trip.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative glass rounded-[1.375rem] overflow-hidden hover:border-foreground/20 transition-all duration-200 active:scale-[0.99]"
    >
      <Link href={href} className="block p-4">
        <div className="flex items-center gap-3 pr-12">
          {trip.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.iconUrl}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover shrink-0"
              draggable={false}
            />
          ) : (
            <TripCover seed={trip.id} className="w-16 h-16 rounded-2xl shrink-0" />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-display font-bold text-slate-100 text-xl truncate leading-tight">
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
              "inline-flex items-center text-[13px] px-3 py-1.5 rounded-full font-semibold",
              typeBadgeClass
            )}
          >
            {typeLabel}
          </span>
          {badge && (
            <span
              className={cn(
                "inline-flex items-center text-[13px] px-3 py-1.5 rounded-full font-semibold",
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
          ) : trip.startDate ? (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {trip.endDate && trip.endDate !== trip.startDate
                ? formatDateRange(trip.startDate, trip.endDate)
                : formatDateRange(trip.startDate, trip.startDate)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Wallet size={13} />
              Budget permanent
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
            className="size-11 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all focus:outline-none"
            aria-label="Actions"
          >
            <MoreVertical size={18} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="min-w-44"
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
              className="gap-2 cursor-pointer text-destructive"
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
