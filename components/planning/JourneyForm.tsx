"use client";

import { useEffect, useRef, useState } from "react";
import { X, Calendar, Clock, Car, PersonStanding, Bike, Bus, Plane, Navigation, Loader2, Users, TriangleAlert, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, FULLSCREEN_DIALOG } from "@/components/ui/dialog";
import { PropertyChips, type PropertyChipItem } from "@/components/forms/PropertyChips";
import { FormFooter } from "@/components/forms/FormFooter";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import type { LocationCoord } from "@/components/shared/LocationPickerSheet";
import { GoogleMapsIcon, WazeIcon, CityMapperIcon, GoogleFlightsIcon } from "@/components/shared/MapAppIcons";
import { shortPlace } from "@/lib/itinerary-types";
import { cn, firstName } from "@/lib/utils";
import { friendlyDay, formatDuration } from "@/lib/format-date";
import { haptic } from "@/lib/haptics";
import { ParticipantPicker } from "@/components/shared/ParticipantPicker";
import { DateField, TimeField } from "@/components/shared/DateTimeFields";
import type { ItineraryItem, JourneyMode, Participant } from "@/types";
import type { ItineraryFormValues } from "./ItineraryItemForm";

const MODES: {
  id: JourneyMode;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  autoRoute: boolean;
}[] = [
  { id: "car",     label: "Voiture",     Icon: Car,            color: "text-sky-300",    bg: "bg-sky-500/15 ring-sky-500/40",    autoRoute: true  },
  { id: "foot",    label: "À pied",      Icon: PersonStanding, color: "text-emerald-300",bg: "bg-emerald-500/15 ring-emerald-500/40", autoRoute: true  },
  { id: "bike",    label: "Vélo",        Icon: Bike,           color: "text-lime-300",   bg: "bg-lime-500/15 ring-lime-500/40",  autoRoute: true  },
  { id: "transit", label: "Transport",   Icon: Bus,            color: "text-violet-300", bg: "bg-violet-500/15 ring-violet-500/40", autoRoute: false },
  { id: "plane",   label: "Avion",       Icon: Plane,          color: "text-amber-300",  bg: "bg-amber-500/15 ring-amber-500/40", autoRoute: false },
];

interface JourneyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  defaultDate: string;
  initialValues?: ItineraryItem;
  onSubmit: (values: ItineraryFormValues) => Promise<void>;
  /** Edit mode only: deletes the item (with the page's undo toast). */
  onDelete?: () => void;
}

export function JourneyForm({ open, onOpenChange, participants, defaultDate, initialValues, onDelete, onSubmit }: JourneyFormProps) {
  const isEdit = !!initialValues;

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<JourneyMode>("car");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<{ durationMinutes: number; distanceKm: number } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const autoRouted = useRef<string>("");

  const [coords, setCoords] = useState<{ from: LocationCoord | null; to: LocationCoord | null }>({ from: null, to: null });

  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setDate(initialValues.date);
      setTime(initialValues.time ?? "");
      setFrom(initialValues.location ?? "");
      setTo(initialValues.destination ?? "");
      setMode(initialValues.journeyMode ?? "car");
      const dh = initialValues.durationMinutes ? Math.floor(initialValues.durationMinutes / 60) : 0;
      const dm = initialValues.durationMinutes ? initialValues.durationMinutes % 60 : 0;
      setDurationH(dh ? String(dh) : "");
      setDurationM(dm ? String(dm) : "");
      setSelectedParticipantIds(initialValues.participantIds ?? []);
    } else {
      setDate(defaultDate);
      setTime("");
      setFrom("");
      setTo("");
      setMode("car");
      setDurationH("");
      setDurationM("");
      setSelectedParticipantIds([]);
    }
    setRouteResult(null);
    setRouteError(null);
    setErrorMsg(null);
    setIssue(null);
    autoRouted.current = "";
  }, [open, initialValues, defaultDate]);

  // Reset route result when mode changes
  useEffect(() => {
    setRouteResult(null);
    setRouteError(null);
  }, [mode]);

  const totalMinutes = (Number(durationH) || 0) * 60 + (Number(durationM) || 0);
  const currentMode = MODES.find((m) => m.id === mode)!;
  const canAutoRoute = currentMode.autoRoute && from.trim().length > 2 && to.trim().length > 2;

  const calculateRoute = async () => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    try {
      const params = new URLSearchParams({ from: from.trim(), to: to.trim(), mode });
      const res = await fetch(`/api/routing?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setRouteError(data.error ?? "Erreur de calcul");
        return;
      }
      setRouteResult(data);
      const h = Math.floor(data.durationMinutes / 60);
      const m = data.durationMinutes % 60;
      setDurationH(h ? String(h) : "");
      setDurationM(m ? String(m) : "0");
    } catch {
      setRouteError("Impossible de contacter le service de routing");
    } finally {
      setRouteLoading(false);
    }
  };

  // Départ et arrivée choisis, mode calculable, durée encore vide : on calcule seul, sans clic.
  useEffect(() => {
    if (!open || !canAutoRoute || totalMinutes > 0 || routeLoading) return;
    const key = `${from.trim()}|${to.trim()}|${mode}`;
    if (autoRouted.current === key) return;
    autoRouted.current = key;
    void calculateRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canAutoRoute, from, to, mode, totalMinutes]);

  const toggleParticipant = (id: string) =>
    setSelectedParticipantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = participants.length > 0 && selectedParticipantIds.length === participants.length;
  const toggleAll = () => setSelectedParticipantIds(allSelected ? [] : participants.map((p) => p.id));

  const handleSubmit = async () => {
    if (!from.trim() || !to.trim()) {
      setIssue(!from.trim() ? "Choisis le point de départ." : "Choisis l'arrivée.");
      setShake((n) => n + 1);
      haptic("warning");
      return;
    }
    if (!date) {
      setIssue("Choisis le jour du trajet.");
      setShake((n) => n + 1);
      haptic("warning");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setIssue(null);
    try {
      await onSubmit({
        title: `${shortPlace(from)} → ${shortPlace(to)}`,
        date,
        time: time || undefined,
        location: from.trim(),
        destination: to.trim(),
        type: "journey",
        journeyMode: mode,
        durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        participantIds: selectedParticipantIds,
      });
      onOpenChange(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const whoNames = selectedParticipantIds
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p)
    .map((p) => firstName(p.name));
  const whenLabel = [friendlyDay(date) || "Quand", time ? time.slice(0, 5) : ""].filter(Boolean).join(" · ");
  const durationLabel = routeLoading
    ? "Calcul…"
    : totalMinutes > 0
      ? [formatDuration(totalMinutes), routeResult ? `${routeResult.distanceKm} km` : ""].filter(Boolean).join(" · ")
      : "Durée";
  const linkClass =
    "inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-all hover:bg-foreground/[0.06] active:scale-95";

  const chips: PropertyChipItem[] = [
    {
      id: "when",
      icon: Calendar,
      label: whenLabel,
      filled: !!time || date !== defaultDate,
      panel: (
        <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2.5">
          <DateField value={date} onChange={setDate} />
          <TimeField value={time} onChange={setTime} />
        </div>
      ),
    },
    {
      id: "duration",
      icon: Clock,
      label: durationLabel,
      filled: totalMinutes > 0,
      panel: (
        <div className="space-y-3">
          {currentMode.autoRoute ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={calculateRoute}
                  disabled={!canAutoRoute || routeLoading}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95",
                    canAutoRoute ? "bg-primary text-primary-foreground" : "cursor-not-allowed bg-card text-muted-foreground"
                  )}
                >
                  {routeLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  {routeLoading ? "Calcul en cours…" : totalMinutes > 0 ? "Recalculer" : "Calculer le trajet"}
                </button>
                {canAutoRoute && mode === "car" && (
                  <a href={buildWazeUrl(to, coords.to)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    <AppIconBadge>
                      <WazeIcon size={20} />
                    </AppIconBadge>
                    Waze
                  </a>
                )}
              </div>
              {routeError && <p className="rounded-2xl bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">{routeError}</p>}
            </>
          ) : (
            from.trim().length > 2 &&
            to.trim().length > 2 && (
              <div className="flex flex-wrap gap-2">
                {mode === "plane" ? (
                  <a
                    href={`https://www.google.com/travel/flights?hl=fr&q=${encodeURIComponent(`vols ${from} ${to}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    <AppIconBadge>
                      <GoogleFlightsIcon size={20} />
                    </AppIconBadge>
                    Google Flights
                  </a>
                ) : (
                  <>
                    <a href={buildGoogleMapsUrl(from, to, coords.from, coords.to)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      <AppIconBadge>
                        <GoogleMapsIcon size={20} />
                      </AppIconBadge>
                      Google Maps
                    </a>
                    <a href={buildCityMapperUrl(from, to, coords.from, coords.to)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      <AppIconBadge>
                        <CityMapperIcon size={20} />
                      </AppIconBadge>
                      CityMapper
                    </a>
                  </>
                )}
              </div>
            )
          )}
          <ManualDuration durationH={durationH} durationM={durationM} setDurationH={setDurationH} setDurationM={setDurationM} />
        </div>
      ),
    },
    ...(participants.length > 0
      ? ([
          {
            id: "who",
            icon: Users,
            label:
              selectedParticipantIds.length === 0 || allSelected
                ? "Tout le monde"
                : whoNames.length > 2
                  ? `${whoNames.slice(0, 2).join(", ")} +${whoNames.length - 2}`
                  : whoNames.join(", "),
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
          <DialogTitle className="font-display text-[1.05rem] font-bold tracking-tight">{isEdit ? "Modifier le trajet" : "Nouveau trajet"}</DialogTitle>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-6">
          {/* Départ → Arrivée : le cœur du trajet */}
          <div className="space-y-2">
            <LocationPickerSheet
              value={from}
              onChange={(v) => {
                setFrom(v);
                setIssue(null);
                setCoords((c) => ({ ...c, from: null }));
              }}
              onChangeCoord={(coord) => setCoords((c) => ({ ...c, from: coord }))}
              placeholder="D'où ?"
              className="h-14 bg-secondary border-transparent"
            />
            <LocationPickerSheet
              value={to}
              onChange={(v) => {
                setTo(v);
                setIssue(null);
                setCoords((c) => ({ ...c, to: null }));
              }}
              onChangeCoord={(coord) => setCoords((c) => ({ ...c, to: coord }))}
              placeholder="Vers où ?"
              className="h-14 bg-secondary border-transparent"
            />
          </div>

          {/* Mode de transport */}
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Mode de transport">
            {MODES.map(({ id, label, Icon }) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    haptic("light");
                    setMode(id);
                  }}
                  className={cn(
                    "pressable flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]"
                  )}
                >
                  <Icon size={17} />
                  {label}
                </button>
              );
            })}
          </div>

          {mode === "plane" && (
            <div className="flex items-start gap-2.5 rounded-[1.25rem] bg-secondary px-3.5 py-3">
              <TriangleAlert size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                L&apos;avion émet jusqu&apos;à 50 fois plus de CO₂ que le train.
              </p>
            </div>
          )}

          <PropertyChips items={chips} />

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
              Supprimer le trajet
            </button>
          )}
        </div>

        <FormFooter label={isEdit ? "Enregistrer" : "Ajouter le trajet"} onClick={handleSubmit} loading={saving} message={issue} shakeKey={shake} />
      </DialogContent>
    </Dialog>
  );
}

function AppIconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
      {children}
    </span>
  );
}

function buildGoogleMapsUrl(
  from: string, to: string,
  fromCoord: LocationCoord | null, toCoord: LocationCoord | null,
): string {
  const travelmode = "transit";
  if (fromCoord && toCoord) {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromCoord.lat},${fromCoord.lon}&destination=${toCoord.lat},${toCoord.lon}&travelmode=${travelmode}`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${travelmode}`;
}

function buildWazeUrl(to: string, toCoord: LocationCoord | null): string {
  // Waze routes from GPS position: only destination can be specified via URL
  if (toCoord) return `https://waze.com/ul?ll=${toCoord.lat},${toCoord.lon}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(to)}&navigate=yes`;
}

function buildCityMapperUrl(
  fromName: string, toName: string,
  fromCoord: LocationCoord | null, toCoord: LocationCoord | null,
): string {
  const base = "https://citymapper.com/directions";
  const startname = encodeURIComponent(fromName);
  const endname = encodeURIComponent(toName);
  if (fromCoord && toCoord) {
    return `${base}?startcoord=${fromCoord.lat},${fromCoord.lon}&endcoord=${toCoord.lat},${toCoord.lon}&startname=${startname}&endname=${endname}`;
  }
  return `${base}?startaddress=${encodeURIComponent(fromName)}&endaddress=${encodeURIComponent(toName)}&startname=${startname}&endname=${endname}`;
}

function ManualDuration({
  durationH,
  durationM,
  setDurationH,
  setDurationM,
}: {
  durationH: string;
  durationM: string;
  setDurationH: (v: string) => void;
  setDurationM: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="48"
          value={durationH}
          onChange={(e) => setDurationH(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="0"
          className="w-full border px-3 text-base pr-8 border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">h</span>
      </div>
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="59"
          value={durationM}
          onChange={(e) => setDurationM(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="0"
          className="w-full border px-3 text-base pr-12 border-input bg-card rounded-2xl h-12 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">min</span>
      </div>
    </div>
  );
}

