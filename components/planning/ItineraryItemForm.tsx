"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  Clock,
  Hourglass,
  Tag,
  MapPin,
  Users,
  AlignLeft,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, JourneyMode, Participant } from "@/types";

const TYPE_CONFIG: Partial<Record<
  ItineraryType,
  { label: string; emoji: string; color: string; bg: string }
>> = {
  accommodation: {
    label: "Hébergement",
    emoji: "🏨",
    color: "text-violet-300",
    bg: "bg-violet-500/15 ring-violet-500/40",
  },
  activity: {
    label: "Activité",
    emoji: "🎯",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15 ring-emerald-500/40",
  },
  food: {
    label: "Resto",
    emoji: "🍽️",
    color: "text-amber-300",
    bg: "bg-amber-500/15 ring-amber-500/40",
  },
  other: {
    label: "Autre",
    emoji: "📍",
    color: "text-slate-300",
    bg: "bg-slate-500/15 ring-slate-500/40",
  },
};

const QUICK_DURATIONS: { label: string; minutes: number }[] = [
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
  { label: "3 h", minutes: 180 },
  { label: "Journée", minutes: 480 },
];

export interface ItineraryFormValues {
  title: string;
  date: string;
  time?: string;
  location?: string;
  destination?: string;
  description?: string;
  type: ItineraryType;
  journeyMode?: JourneyMode;
  durationMinutes?: number;
  participantIds: string[];
}

interface ItineraryItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  defaultDate: string;
  /** Provide an item to enter edit mode. */
  initialValues?: ItineraryItem;
  onSubmit: (values: ItineraryFormValues) => Promise<void>;
}

export function ItineraryItemForm({
  open,
  onOpenChange,
  participants,
  defaultDate,
  initialValues,
  onSubmit,
}: ItineraryItemFormProps) {
  const isEdit = !!initialValues;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItineraryType>("activity");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate when opened
  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setTitle(initialValues.title);
      setDate(initialValues.date);
      setTime(initialValues.time ?? "");
      setLocation(initialValues.location ?? "");
      setDescription(initialValues.description ?? "");
      setType(initialValues.type);
      const dh = initialValues.durationMinutes
        ? Math.floor(initialValues.durationMinutes / 60)
        : 0;
      const dm = initialValues.durationMinutes
        ? initialValues.durationMinutes % 60
        : 0;
      setDurationH(dh ? String(dh) : "");
      setDurationM(dm ? String(dm) : "");
      setSelectedParticipantIds(initialValues.participantIds ?? []);
    } else {
      setTitle("");
      setDate(defaultDate);
      setTime("");
      setLocation("");
      setDescription("");
      setType("activity");
      setDurationH("");
      setDurationM("");
      setSelectedParticipantIds([]);
    }
    setErrorMsg(null);
  }, [open, initialValues, defaultDate]);

  const totalMinutes =
    (Number(durationH) || 0) * 60 + (Number(durationM) || 0);

  const setQuickDuration = (mins: number) => {
    setDurationH(String(Math.floor(mins / 60)));
    setDurationM(String(mins % 60));
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allSelected =
    participants.length > 0 &&
    selectedParticipantIds.length === participants.length;
  const toggleAll = () =>
    setSelectedParticipantIds(
      allSelected ? [] : participants.map((p) => p.id)
    );

  const formValid = title.trim().length > 0 && !!date;

  const handleSubmit = async () => {
    if (!formValid) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        title: title.trim(),
        date,
        time: time || undefined,
        location: location || undefined,
        description: description || undefined,
        type,
        durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        participantIds: selectedParticipantIds,
      });
      onOpenChange(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Erreur";
      const friendly =
        /column.*does not exist/i.test(raw) ||
        /schema cache/i.test(raw)
          ? "Colonne manquante en base. Exécute la dernière migration SQL Supabase."
          : raw;
      setErrorMsg(friendly);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: full-screen sheet
          "!fixed !top-0 !left-0 !translate-x-0 !translate-y-0",
          "!w-full !max-w-full !h-[100dvh]",
          "!rounded-none !p-0 !gap-0 !border-0",
          // Desktop: centered modal
          "sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2",
          "sm:!max-w-md sm:!h-auto sm:!max-h-[92vh]",
          "sm:!rounded-2xl sm:!border sm:!border-foreground/10",
          // Glass background
          "glass-strong flex flex-col overflow-hidden"
        )}
      >
        {/* Top app bar */}
        <div
          className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-foreground/8"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="p-2 -ml-1 rounded-xl text-slate-300 hover:bg-foreground/8 active:bg-foreground/12 transition-all"
          >
            <X size={22} />
          </button>
          <DialogTitle className="text-base font-semibold text-slate-100">
            {isEdit ? "Modifier l'étape" : "Nouvelle étape"}
          </DialogTitle>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!formValid || saving}
            className={cn(
              "px-4 h-10 rounded-full text-sm font-semibold transition-all",
              "gradient-primary text-white",
              "disabled:opacity-40 disabled:pointer-events-none",
              "active:scale-95"
            )}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEdit ? (
              "OK"
            ) : (
              "Ajouter"
            )}
          </button>
        </div>

        {/* Body — sectioned like Google Calendar */}
        <div className="flex-1 overflow-y-auto">
          {/* Title — big, no label */}
          <div className="px-5 pt-5 pb-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ajouter un titre"
              className="w-full bg-transparent border-0 outline-none text-2xl font-bold text-slate-100 placeholder:text-slate-600 placeholder:font-normal"
              autoFocus={!isEdit}
            />
          </div>

          {/* Date + time */}
          <Row icon={<Calendar size={18} />}>
            <div className="grid grid-cols-2 gap-3">
              <DateInput
                value={date}
                onChange={setDate}
                placeholder="Date"
              />
              <TimeInput
                value={time}
                onChange={setTime}
                placeholder="Heure"
              />
            </div>
          </Row>

          {/* Duration */}
          <Row icon={<Hourglass size={18} />} label="Durée (optionnelle)">
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_DURATIONS.map((d) => {
                const selected = totalMinutes === d.minutes;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setQuickDuration(d.minutes)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95",
                      selected
                        ? "bg-section-soft text-section-soft ring-1 ring-section"
                        : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <NumberPill
                value={durationH}
                onChange={setDurationH}
                suffix="h"
                max={48}
              />
              <NumberPill
                value={durationM}
                onChange={setDurationM}
                suffix="min"
                max={59}
              />
              {totalMinutes > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDurationH("");
                    setDurationM("");
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-foreground/8 transition-colors shrink-0"
                  aria-label="Effacer la durée"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </Row>

          {/* Type */}
          <Row icon={<Tag size={18} />}>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(TYPE_CONFIG) as [ItineraryType, NonNullable<typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]>][]).map(([t, cfg]) => {
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95",
                      selected
                        ? cn(cfg.bg, cfg.color, "ring-1")
                        : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                    )}
                  >
                    <span>{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* Location */}
          <Row icon={<MapPin size={18} />}>
            <LocationPickerSheet
              value={location}
              onChange={setLocation}
              placeholder="Ajouter un lieu"
              className="bg-foreground/5 border-foreground/10"
            />
          </Row>

          {/* Participants */}
          {participants.length > 0 && (
            <Row icon={<Users size={18} />} label="Participants">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={toggleAll}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                    allSelected
                      ? "bg-section-soft text-section-soft border-section"
                      : "bg-foreground/5 text-slate-400 border-foreground/10 hover:bg-foreground/10"
                  )}
                >
                  Tout le monde
                </button>
                {participants.map((p) => {
                  const sel = selectedParticipantIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-95",
                        sel
                          ? "border-section bg-section-soft text-section-soft"
                          : "border-foreground/10 bg-foreground/5 text-slate-300 hover:bg-foreground/10"
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Row>
          )}

          {/* Description */}
          <Row icon={<AlignLeft size={18} />}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajouter une description"
              rows={2}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-3 focus:ring-section resize-none"
            />
          </Row>

          {/* Error */}
          {errorMsg && (
            <div className="px-5 pb-4">
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            </div>
          )}

          <div
            aria-hidden
            style={{ height: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A Google-Calendar-style row: leading icon + content */
function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5 border-t border-foreground/8">
      <div className="text-slate-400 mt-2 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 space-y-2">
        {label && (
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            {label}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 h-10 text-base text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-3 focus:ring-section tabular-nums"
    />
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Clock
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-9 pr-3 h-10 text-base text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-3 focus:ring-section tabular-nums"
      />
    </div>
  );
}

function NumberPill({
  value,
  onChange,
  suffix,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  max: number;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="0"
        className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 h-10 text-base text-slate-100 placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-3 focus:ring-section pr-12"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
        {suffix}
      </span>
    </div>
  );
}
