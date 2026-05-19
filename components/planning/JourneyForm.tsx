"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  Clock,
  Car,
  PersonStanding,
  Bike,
  Bus,
  Plane,
  Navigation,
  ArrowDown,
  Loader2,
  Users,
  TriangleAlert,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LocationAutocomplete } from "@/components/shared/LocationAutocomplete";
import { GoogleMapsIcon, CityMapperIcon } from "@/components/shared/MapAppIcons";
import { cn } from "@/lib/utils";
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
}

export function JourneyForm({
  open,
  onOpenChange,
  participants,
  defaultDate,
  initialValues,
  onSubmit,
}: JourneyFormProps) {
  const isEdit = !!initialValues;

  const [date, setDate]     = useState("");
  const [time, setTime]     = useState("");
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [mode, setMode]     = useState<JourneyMode>("car");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult]   = useState<{ durationMinutes: number; distanceKm: number } | null>(null);
  const [routeError, setRouteError]     = useState<string | null>(null);

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

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allSelected = participants.length > 0 && selectedParticipantIds.length === participants.length;
  const toggleAll = () => setSelectedParticipantIds(allSelected ? [] : participants.map((p) => p.id));

  const formValid = from.trim().length > 0 && to.trim().length > 0 && !!date;

  const handleSubmit = async () => {
    if (!formValid) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        title: `${from.trim()} → ${to.trim()}`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "!fixed !top-0 !left-0 !translate-x-0 !translate-y-0",
          "!w-full !max-w-full !h-[100dvh]",
          "!rounded-none !p-0 !gap-0 !border-0",
          "sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2",
          "sm:!max-w-md sm:!h-auto sm:!max-h-[92vh]",
          "sm:!rounded-2xl sm:!border sm:!border-foreground/10",
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
            {isEdit ? "Modifier le trajet" : "Nouveau trajet"}
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
            {saving ? <Loader2 size={16} className="animate-spin" /> : isEdit ? "OK" : "Ajouter"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Date + time */}
          <Row icon={<Calendar size={18} />}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 h-10 text-base text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-3 focus:ring-section tabular-nums"
              />
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-9 pr-3 h-10 text-base text-slate-100 [color-scheme:dark] focus:outline-none focus:ring-3 focus:ring-section tabular-nums"
                />
              </div>
            </div>
          </Row>

          {/* From → To */}
          <Row icon={<Navigation size={18} />} label="Itinéraire">
            <div className="space-y-2">
              <LocationAutocomplete
                value={from}
                onChange={setFrom}
                placeholder="Départ"
                className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
              />
              <div className="flex items-center gap-2 px-1">
                <ArrowDown size={14} className="text-slate-600" />
                <div className="flex-1 h-px bg-foreground/8" />
              </div>
              <LocationAutocomplete
                value={to}
                onChange={setTo}
                placeholder="Arrivée"
                className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </Row>

          {/* Mode de transport */}
          <Row icon={<currentMode.Icon size={18} />} label="Mode de transport">
            <div className="flex gap-1.5 flex-wrap">
              {MODES.map(({ id, label, Icon, color, bg }) => {
                const selected = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95",
                      selected
                        ? cn(bg, color, "ring-1")
                        : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* CO2 warning for plane */}
          {mode === "plane" && (
            <div className="mx-5 mb-1 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
              <TriangleAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 leading-relaxed">
                L&apos;avion est le mode de transport le plus émetteur de CO₂ — jusqu&apos;à 50× plus que le train. À considérer si une alternative existe.
              </p>
            </div>
          )}

          {/* Durée */}
          <Row icon={<Clock size={18} />} label="Durée du trajet">
            {currentMode.autoRoute ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={calculateRoute}
                    disabled={!canAutoRoute || routeLoading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95",
                      canAutoRoute
                        ? "gradient-primary text-white"
                        : "bg-foreground/5 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {routeLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Navigation size={14} />
                    )}
                    {routeLoading ? "Calcul en cours…" : "Calculer le trajet"}
                  </button>
                  {canAutoRoute && mode === "car" && (
                    <a
                      href={`https://waze.com/ul?navigate=yes&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-foreground/8 text-amber-400 hover:bg-foreground/12 active:scale-95 transition-all"
                    >
                      <Car size={14} />
                      Waze
                    </a>
                  )}
                </div>

                {routeError && (
                  <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {routeError}
                  </p>
                )}

                {routeResult && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-section/10 border border-section/30">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-100">
                        {formatDuration(routeResult.durationMinutes)}
                      </p>
                      <p className="text-xs text-slate-400">{routeResult.distanceKm} km</p>
                    </div>
                  </div>
                )}

                <ManualDuration durationH={durationH} durationM={durationM} setDurationH={setDurationH} setDurationM={setDurationM} />
              </div>
            ) : (
              <div className="space-y-3">
                {from.trim().length > 2 && to.trim().length > 2 && (
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={buildGoogleMapsUrl(from, to, mode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-foreground/8 text-slate-200 hover:bg-foreground/12 active:scale-95 transition-all"
                    >
                      <GoogleMapsIcon size={18} />
                      Google Maps
                    </a>
                    <a
                      href={`https://citymapper.com/directions?startaddress=${encodeURIComponent(from)}&endaddress=${encodeURIComponent(to)}&startname=${encodeURIComponent(from)}&endname=${encodeURIComponent(to)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-foreground/8 text-slate-200 hover:bg-foreground/12 active:scale-95 transition-all"
                    >
                      <CityMapperIcon size={18} />
                      CityMapper
                    </a>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Consulte l'itinéraire puis renseigne la durée ci-dessous.
                </p>
                <ManualDuration durationH={durationH} durationM={durationM} setDurationH={setDurationH} setDurationM={setDurationM} />
              </div>
            )}
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
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Row>
          )}

          {errorMsg && (
            <div className="px-5 pb-4">
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

function buildGoogleMapsUrl(from: string, to: string, mode: JourneyMode): string {
  const f = encodeURIComponent(from);
  const t = encodeURIComponent(to);
  const travelmode = mode === "plane" ? "driving" : "transit";
  return `https://www.google.com/maps/dir/?api=1&origin=${f}&destination=${t}&travelmode=${travelmode}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
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
          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 h-10 text-base text-slate-100 placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-3 focus:ring-section pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">h</span>
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
          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 h-10 text-base text-slate-100 placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-3 focus:ring-section pr-12"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">min</span>
      </div>
    </div>
  );
}

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
        {label && <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>}
        {children}
      </div>
    </div>
  );
}
