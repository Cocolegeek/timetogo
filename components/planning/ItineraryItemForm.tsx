"use client";

import { useEffect, useRef, useState } from "react";
import { X, Calendar, Users, Trash2, NotebookPen } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, FULLSCREEN_DIALOG } from "@/components/ui/dialog";
import { HeroInput } from "@/components/forms/HeroInput";
import { PropertyChips, type PropertyChipItem } from "@/components/forms/PropertyChips";
import { FormFooter } from "@/components/forms/FormFooter";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { cn, firstName } from "@/lib/utils";
import { handleEnter } from "@/lib/forms/enter-next";
import { haptic } from "@/lib/haptics";
import { friendlyDay, formatDuration } from "@/lib/format-date";
import { ParticipantPicker } from "@/components/shared/ParticipantPicker";
import { DateField, TimeField } from "@/components/shared/DateTimeFields";
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
  /** Edit mode only: deletes the item (with the page's undo toast). */
  onDelete?: () => void;
}

export function ItineraryItemForm({
  open,
  onOpenChange,
  participants,
  defaultDate,
  initialValues,
  onDelete,
  onSubmit,
}: ItineraryItemFormProps) {
  const isEdit = !!initialValues;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [type, setType] = useState<ItineraryType>("activity");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  // Hydrate when opened
  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setTitle(initialValues.title);
      setDate(initialValues.date);
      setTime(initialValues.time ?? "");
      setLocation(initialValues.location ?? "");
      setDescription(initialValues.description ?? "");
      setDescriptionOpen(!!initialValues.description);
      setType(initialValues.type);
      const dh = initialValues.durationMinutes ? Math.floor(initialValues.durationMinutes / 60) : 0;
      const dm = initialValues.durationMinutes ? initialValues.durationMinutes % 60 : 0;
      setDurationH(dh ? String(dh) : "");
      setDurationM(dm ? String(dm) : "");
      setSelectedParticipantIds(initialValues.participantIds ?? []);
    } else {
      setTitle("");
      setDate(defaultDate);
      setTime("");
      setLocation("");
      setDescription("");
      setDescriptionOpen(false);
      setType("activity");
      setDurationH("");
      setDurationM("");
      setSelectedParticipantIds([]);
    }
    setErrorMsg(null);
    setIssue(null);
  }, [open, initialValues, defaultDate]);

  const totalMinutes = (Number(durationH) || 0) * 60 + (Number(durationM) || 0);

  const setQuickDuration = (mins: number) => {
    setDurationH(String(Math.floor(mins / 60)));
    setDurationM(String(mins % 60));
  };

  const toggleParticipant = (id: string) =>
    setSelectedParticipantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = participants.length > 0 && selectedParticipantIds.length === participants.length;
  const toggleAll = () => setSelectedParticipantIds(allSelected ? [] : participants.map((p) => p.id));

  const handleSubmit = async () => {
    if (!title.trim()) {
      setIssue("Donne un titre à l'étape.");
      setShake((n) => n + 1);
      haptic("warning");
      titleRef.current?.focus();
      return;
    }
    if (!date) {
      setIssue("Choisis le jour de l'étape.");
      setShake((n) => n + 1);
      haptic("warning");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setIssue(null);
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
        /column.*does not exist/i.test(raw) || /schema cache/i.test(raw)
          ? "Colonne manquante en base. Exécute la dernière migration SQL Supabase."
          : raw;
      setErrorMsg(friendly);
    } finally {
      setSaving(false);
    }
  };

  const whenLabel = [friendlyDay(date) || "Quand", time ? time.slice(0, 5) : "", totalMinutes > 0 ? formatDuration(totalMinutes) : ""]
    .filter(Boolean)
    .join(" · ");
  const typeCfg = TYPE_CONFIG[type] ?? ITINERARY_TYPES.activity;
  const whoNames = selectedParticipantIds
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p)
    .map((p) => firstName(p.name));

  const chips: PropertyChipItem[] = [
    {
      id: "when",
      icon: Calendar,
      label: whenLabel,
      filled: !!time || totalMinutes > 0 || date !== defaultDate,
      panel: (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2.5">
            <DateField value={date} onChange={setDate} />
            <TimeField value={time} onChange={setTime} />
          </div>
          <div>
            <p className="mb-2 px-1 text-sm font-medium text-muted-foreground">Durée</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DURATIONS.map((d) => {
                const selected = totalMinutes === d.minutes;
                return (
                  <button
                    key={d.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => (selected ? (setDurationH(""), setDurationM("")) : setQuickDuration(d.minutes))}
                    className={cn(
                      "pressable h-10 rounded-full px-3.5 text-sm font-semibold transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-foreground/[0.06]"
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
                  onClick={() => {
                    setDurationH("");
                    setDurationM("");
                  }}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground/85"
                  aria-label="Effacer la durée"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "place",
      node: <LocationPickerSheet compact value={location} onChange={setLocation} placeholder="Lieu" />,
    },
    {
      id: "type",
      icon: typeCfg.icon,
      label: typeCfg.label,
      filled: type !== "activity",
      panel: (
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(TYPE_CONFIG) as [ItineraryType, NonNullable<(typeof TYPE_CONFIG)[keyof typeof TYPE_CONFIG]>][]).map(([t, cfg]) => {
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={selected}
                className={cn(
                  "pressable flex h-11 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-foreground/[0.06]"
                )}
              >
                <cfg.icon size={17} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      ),
    },
    ...(participants.length > 0
      ? ([
          {
            id: "who",
            icon: Users,
            label: selectedParticipantIds.length === 0 || allSelected ? "Tout le monde" : whoNames.length > 2 ? `${whoNames.slice(0, 2).join(", ")} +${whoNames.length - 2}` : whoNames.join(", "),
            filled: selectedParticipantIds.length > 0 && !allSelected,
            panel: <ParticipantPicker participants={participants} selected={selectedParticipantIds} onToggle={toggleParticipant} onToggleAll={toggleAll} />,
          },
        ] satisfies PropertyChipItem[])
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={FULLSCREEN_DIALOG}>
        <div className="flex shrink-0 items-center gap-3 px-2 pb-1" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            <X size={22} />
          </button>
          <DialogTitle className="font-display text-[1.05rem] font-bold tracking-tight">{isEdit ? "Modifier l'étape" : "Nouvelle étape"}</DialogTitle>
        </div>

        <div data-enter-chain className="flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-6">
          <HeroInput
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIssue(null);
            }}
            placeholder="Quelle étape ?"
            aria-label="Titre de l'étape"
            enterKeyHint={descriptionOpen ? "next" : "done"}
            autoFocus={!isEdit}
            onKeyDown={(e) => handleEnter(e, () => void handleSubmit())}
          />

          <PropertyChips items={chips} />

          {descriptionOpen ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Une précision…"
              aria-label="Description"
              rows={3}
              className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12"
            />
          ) : (
            <button
              type="button"
              onClick={() => setDescriptionOpen(true)}
              className="pressable flex h-11 items-center gap-2 rounded-full px-1 text-[0.95rem] font-medium text-muted-foreground hover:text-foreground"
            >
              <NotebookPen size={16} aria-hidden="true" />
              Ajouter une description
            </button>
          )}

          {errorMsg && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMsg}</p>}

          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
              className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500/10 text-[0.95rem] font-semibold text-red-400 transition-colors hover:bg-red-500/15"
            >
              <Trash2 size={17} />
              Supprimer l&apos;étape
            </button>
          )}
        </div>

        <FormFooter label={isEdit ? "Enregistrer" : "Ajouter l'étape"} onClick={handleSubmit} loading={saving} message={issue} shakeKey={shake} />
      </DialogContent>
    </Dialog>
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
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        {suffix}
      </span>
    </div>
  );
}
