"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
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
FULLSCREEN_DIALOG,
} from "@/components/ui/dialog";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { cn } from "@/lib/utils";
import { ITINERARY_TYPES } from "@/lib/itinerary-types";
import type { ItineraryItem, ItineraryType, JourneyMode, Participant } from "@/types";

const TYPE_CONFIG: Partial<Record<ItineraryType, (typeof ITINERARY_TYPES)[ItineraryType]>> = {
  accommodation: ITINERARY_TYPES.accommodation,
  activity: ITINERARY_TYPES.activity,
  food: ITINERARY_TYPES.food,
  other: ITINERARY_TYPES.other,
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

type ItineraryNavTab = "Quand" | "Quoi" | "Qui";

export function ItineraryItemForm({
  open,
  onOpenChange,
  participants,
  defaultDate,
  initialValues,
  onSubmit,
}: ItineraryItemFormProps) {
  const isEdit = !!initialValues;

  const [activeTab, setActiveTab] = useState<ItineraryNavTab>("Quand");
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
    setActiveTab("Quand");
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
        className={FULLSCREEN_DIALOG}
      >
        {/* Top app bar */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-2 pb-2"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            <X size={22} />
          </button>
          <DialogTitle className="font-display text-[1.05rem] font-bold tracking-tight">
            {isEdit ? "Modifier l'étape" : "Nouvelle étape"}
          </DialogTitle>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!formValid || saving}
            className={cn(
              "h-10 rounded-full px-5 text-sm font-semibold transition-all",
              "bg-primary text-primary-foreground shadow-section",
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

        {/* Title — sticky, persistent across tabs */}
        <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'étape"
            className="w-full bg-transparent border-0 outline-none text-xl font-bold text-slate-100 placeholder:text-slate-600 placeholder:font-normal"
            autoFocus={!isEdit}
          />
        </div>

        {/* Tab navigation */}
        <div role="tablist" className="mx-4 my-3 flex h-11 shrink-0 gap-1 rounded-full bg-foreground/[0.06] p-1">
          {(["Quand", "Quoi", "Qui"] as ItineraryNavTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-full text-sm font-semibold transition-all",
                activeTab === tab
                  ? "bg-card text-foreground shadow-card dark:bg-foreground/[0.12]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "Qui" && selectedParticipantIds.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({selectedParticipantIds.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "Quand" && (
            <>
              <Row icon={<Calendar size={18} />}>
                <div className="grid grid-cols-2 gap-3">
                  <DateInput value={date} onChange={setDate} placeholder="Date" />
                  <TimeInput value={time} onChange={setTime} placeholder="Heure" />
                </div>
              </Row>

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
                            ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                            : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <NumberPill value={durationH} onChange={setDurationH} suffix="h" max={48} />
                  <NumberPill value={durationM} onChange={setDurationM} suffix="min" max={59} />
                  {totalMinutes > 0 && (
                    <button
                      type="button"
                      onClick={() => { setDurationH(""); setDurationM(""); }}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-foreground/8 transition-colors shrink-0"
                      aria-label="Effacer la durée"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </Row>
            </>
          )}

          {activeTab === "Quoi" && (
            <>
              <Row icon={<Tag size={18} />} label="Type">
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(TYPE_CONFIG) as [ItineraryType, NonNullable<typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]>][]).map(([t, cfg]) => {
                    const selected = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        aria-pressed={selected}
                        className={cn(
                          "pressable flex h-11 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold transition-colors",
                          selected
                            ? "bg-foreground text-background"
                            : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10"
                        )}
                      >
                        <cfg.icon size={17} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </Row>

              <Row icon={<MapPin size={18} />} label="Lieu">
                <LocationPickerSheet
                  value={location}
                  onChange={setLocation}
                  placeholder="Ajouter un lieu"
                  className="bg-foreground/5 border-foreground/10"
                />
              </Row>

              <Row icon={<AlignLeft size={18} />} label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajouter une description"
                  rows={3}
                  className="w-full border px-3 py-2 text-base resize-none border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
                />
              </Row>
            </>
          )}

          {activeTab === "Qui" && (
            participants.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Aucun participant — ajoute-en depuis l&apos;édition du voyage.
              </div>
            ) : (
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
                            ? "bg-primary/10 text-primary ring-1 ring-primary/40 border-transparent"
                            : "border-foreground/10 bg-foreground/5 text-slate-300 hover:bg-foreground/10"
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </Row>
            )
          )}

          {errorMsg && (
            <div className="px-5 py-4">
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            </div>
          )}

          <div aria-hidden style={{ height: "calc(env(safe-area-inset-bottom) + 1rem)" }} />
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
    <div className="flex items-start gap-4 px-5 py-3.5 border-t border-border">
      <div className="text-slate-400 mt-2 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 space-y-2">
        {label && (
          <p className="text-xs text-slate-500 font-medium">
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
      className="w-full border px-3 text-base border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
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
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-4 text-base border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
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
        className="w-full border px-3 text-base pr-12 border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
        {suffix}
      </span>
    </div>
  );
}
