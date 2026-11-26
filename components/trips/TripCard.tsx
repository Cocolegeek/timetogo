"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import { MoreHorizontal } from "lucide-react";
import { useMountOnce } from "@/hooks/useMountOnce";
import { formatDateRange, tripDuration, daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/shared/EmojiIcon";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { tripHref } from "@/lib/trip-features";
import { shortDestination } from "@/lib/place";
import { HoverActions } from "@/components/shared/HoverActions";
import type { Trip } from "@/types";

const TripActionsSheet = dynamic(() => import("@/components/trips/TripActionsSheet"), { ssr: false });

export type TripStatus =
  | { kind: "ongoing"; label: string }
  | { kind: "upcoming"; label: string }
  | { kind: "past"; label: string }
  | { kind: "permanent"; label: string };

export function tripStatus(trip: Trip): TripStatus {
  const start = trip.startDate;
  const end = trip.endDate ?? trip.startDate;
  if (!start || !end) return { kind: "permanent", label: "Sans date" };
  const startDays = daysUntil(start);
  const endDays = daysUntil(end);
  if (endDays < 0) return { kind: "past", label: "Terminé" };
  if (startDays > 0) {
    return { kind: "upcoming", label: startDays === 1 ? "Demain" : `Dans ${startDays} jours` };
  }
  const total = tripDuration(start, end) + 1;
  const day = Math.min(total, 1 - startDays);
  return { kind: "ongoing", label: `En cours · jour ${day}/${total}` };
}

function subtitle(trip: Trip): string {
  const dates = trip.startDate ? formatDateRange(trip.startDate, trip.endDate ?? trip.startDate) : "";
  const place = trip.destination ? shortDestination(trip.destination) : "";
  const parts = [dates, place].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  const n = trip.participants.length;
  return `${n} personne${n > 1 ? "s" : ""}`;
}

interface TripCardProps {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onShare?: (trip: Trip) => void;
  variant?: "featured" | "row";
}

function TripActions({
  trip,
  onEdit,
  onDelete,
  onShare,
  floating,
}: Omit<TripCardProps, "variant"> & { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const mounted = useMountOnce(open);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className={cn(
          "flex size-10 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          floating
            ? "bg-white/90 text-[#1A1D24] shadow-card backdrop-blur hover:bg-white"
            : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
        )}
        aria-label={`Actions pour ${trip.name}`}
      >
        <MoreHorizontal size={20} />
      </button>
      {mounted && (
        <TripActionsSheet trip={trip} open={open} onOpenChange={setOpen} onEdit={onEdit} onShare={onShare} onDelete={onDelete} />
      )}
    </>
  );
}

function TripEmoji({ emoji }: { emoji?: string | null }) {
  return emoji ? (
    <span aria-hidden="true" className="mr-1.5">
      <EmojiIcon emoji={emoji} />
    </span>
  ) : null;
}

function Cover({ trip, className }: { trip: Trip; className?: string }) {
  if (!trip.iconUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={trip.iconUrl} alt="" draggable={false} className={cn("object-cover", className)} />
  );
}

function StatusPill({ status, onImage }: { status: TripStatus; onImage?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold",
        onImage ? "absolute top-4 left-4 bg-white/90 text-[#1A1D24] shadow-card backdrop-blur" : "bg-secondary text-foreground"
      )}
    >
      {status.kind === "ongoing" && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {status.label}
    </span>
  );
}

export function TripCard({ trip, onEdit, onDelete, onShare, variant = "row" }: TripCardProps) {
  const href = tripHref(trip);
  const status = tripStatus(trip);

  if (variant === "featured") {
    return (
      <article className="group relative overflow-hidden rounded-[1.75rem] bg-card shadow-raised">
        <Link href={href} prefetch={false} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {trip.iconUrl && (
            <div className="relative h-52 overflow-hidden lg:h-64">
              <Cover
                trip={trip}
                className="h-full w-full transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
              />
              {status.kind !== "permanent" && <StatusPill status={status} onImage />}
            </div>
          )}
          <div className={cn("px-5 pb-5", trip.iconUrl ? "pt-4" : "pt-5 pr-24")}>
            {!trip.iconUrl && status.kind !== "permanent" && (
              <div className="mb-3">
                <StatusPill status={status} />
              </div>
            )}
            <h3 className="truncate font-display text-[1.5rem] leading-tight font-bold tracking-tight">
              <TripEmoji emoji={trip.emoji} />
              {trip.name}
            </h3>
            <p className="mt-1 truncate text-[0.95rem] text-muted-foreground">{subtitle(trip)}</p>
            <div className="mt-4 flex items-center justify-between">
              <ParticipantStack participants={trip.participants} size="md" max={4} />
            </div>
          </div>
        </Link>
        <div className="absolute top-3 right-3">
          <TripActions trip={trip} onEdit={onEdit} onDelete={onDelete} onShare={onShare} floating />
        </div>
        <HoverActions label={trip.name} onEdit={() => onEdit(trip)} className="absolute top-3 right-16" />
      </article>
    );
  }

  return (
    <article className="group relative flex items-center">
      <Link
        href={href}
        prefetch={false}
        className="pressable flex min-w-0 flex-1 items-center gap-4 rounded-[1.25rem] py-2.5 pr-12 pl-2.5 outline-none hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring"
      >
        {trip.iconUrl ? (
          <Cover trip={trip} className="size-16 shrink-0 overflow-hidden rounded-2xl" />
        ) : (
          <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[1.75rem]">
            {trip.emoji ? <EmojiIcon emoji={trip.emoji} /> : <span className="font-display text-[1.5rem] font-bold text-muted-foreground">{trip.name.slice(0, 1).toUpperCase()}</span>}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[1.1rem] leading-tight font-bold tracking-tight">
            <TripEmoji emoji={trip.emoji} />
            {trip.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle(trip)}</p>
          {status.kind !== "permanent" && (
            <p
              className={cn(
                "mt-1 text-[0.8125rem] font-semibold",
                status.kind === "ongoing"
                  ? "text-emerald-400"
                  : status.kind === "upcoming"
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {status.label}
            </p>
          )}
        </div>
      </Link>
      <div className="absolute right-1.5">
        <TripActions trip={trip} onEdit={onEdit} onDelete={onDelete} onShare={onShare} />
      </div>
      <HoverActions label={trip.name} onEdit={() => onEdit(trip)} className="absolute right-14" />
    </article>
  );
}
