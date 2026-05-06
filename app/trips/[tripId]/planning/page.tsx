"use client";

import { use, useState } from "react";
import { Plus, Map, Clock, MapPin, X, Hourglass, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrip } from "@/hooks/useTrip";
import { useItinerary } from "@/hooks/useItinerary";
import { LocationAutocomplete } from "@/components/shared/LocationAutocomplete";
import { formatDuration } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ItineraryType } from "@/types";

interface PlanningPageProps {
  params: Promise<{ tripId: string }>;
}

const TYPE_CONFIG: Record<
  ItineraryType,
  { label: string; color: string; bg: string }
> = {
  transport:     { label: "Transport",   color: "text-sky-400",    bg: "bg-sky-400/10"    },
  accommodation: { label: "Hébergement", color: "text-violet-400", bg: "bg-violet-400/10" },
  activity:      { label: "Activité",    color: "text-emerald-400",bg: "bg-emerald-400/10"},
  food:          { label: "Resto",       color: "text-amber-400",  bg: "bg-amber-400/10"  },
  other:         { label: "Autre",       color: "text-slate-400",  bg: "bg-slate-400/10"  },
};

const QUICK_DURATIONS: { label: string; minutes: number }[] = [
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
  { label: "3 h", minutes: 180 },
  { label: "Journée", minutes: 480 },
];

export default function PlanningPage({ params }: PlanningPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { items, addItem, deleteItem, refetch } = useItinerary(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<ItineraryType>("activity");
  const [description, setDescription] = useState("");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totalMinutes =
    (Number(durationH) || 0) * 60 + (Number(durationM) || 0);

  const resetForm = () => {
    setTitle("");
    setTime("");
    setLocation("");
    setDescription("");
    setDurationH("");
    setDurationM("");
  };

  const handleAdd = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    await addItem({
      title: title.trim(),
      date,
      time: time || undefined,
      location: location || undefined,
      description: description || undefined,
      type,
      durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
    });
    resetForm();
    setFormOpen(false);
    setSaving(false);
  };

  const openForm = () => {
    resetForm();
    setDate(trip?.startDate ?? new Date().toISOString().split("T")[0]);
    setFormOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const setQuickDuration = (mins: number) => {
    setDurationH(String(Math.floor(mins / 60)));
    setDurationM(String(mins % 60));
  };

  const byDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Planning</h1>
          <p className="text-sm text-slate-500 mt-0.5">{trip?.name}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Itinéraire vide"
          description="Ajoute des étapes pour construire ton planning de voyage."
          action={
            <Button onClick={openForm} className="gradient-primary text-white border-0">
              <Plus size={16} />
              Ajouter une étape
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([d, dayItems]) => (
            <div key={d}>
              <p className="text-sm text-slate-400 font-semibold mb-3 uppercase tracking-wider">
                {new Date(d).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="relative pl-4 border-l border-white/8 space-y-3">
                <AnimatePresence>
                  {dayItems.map((item) => {
                    const cfg = TYPE_CONFIG[item.type];
                    const durationLabel = formatDuration(item.durationMinutes);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <GlassCard padding={false} className="group">
                          <div className="p-3.5 flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    cfg.bg, cfg.color
                                  )}
                                >
                                  {cfg.label}
                                </span>
                                {item.time && (
                                  <span className="flex items-center gap-1 text-sm text-slate-400">
                                    <Clock size={12} />
                                    {item.time}
                                  </span>
                                )}
                                {durationLabel && (
                                  <span className="flex items-center gap-1 text-sm text-slate-400">
                                    <Hourglass size={12} />
                                    {durationLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-base font-semibold text-slate-100 mt-1.5">
                                {item.title}
                              </p>
                              {item.location && (
                                <p className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                                  <MapPin size={12} />
                                  {item.location}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-sm text-slate-500 mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-400"
                              onClick={() => deleteItem(item.id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="glass-strong border-white/10 max-w-md p-0 max-h-[92vh] overflow-hidden flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
            <DialogTitle className="text-slate-100 text-xl">
              Nouvelle étape
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Vol Paris → Rome"
                className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">
                  Heure
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Type</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(TYPE_CONFIG) as ItineraryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                      type === t
                        ? cn(TYPE_CONFIG[t].bg, TYPE_CONFIG[t].color, "ring-1 ring-current")
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration — quick chips + custom h/min inputs */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">
                Durée <span className="text-slate-500 font-normal">(optionnelle)</span>
              </Label>
              <div className="flex gap-2 flex-wrap">
                {QUICK_DURATIONS.map((d) => {
                  const selected = totalMinutes === d.minutes;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setQuickDuration(d.minutes)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                        selected
                          ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="48"
                    value={durationH}
                    onChange={(e) => setDurationH(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pr-10 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                    h
                  </span>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="59"
                    value={durationM}
                    onChange={(e) => setDurationM(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pr-12 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                    min
                  </span>
                </div>
                {totalMinutes > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDurationH("");
                      setDurationM("");
                    }}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors shrink-0"
                    title="Effacer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">
                Lieu <span className="text-slate-500 font-normal">(optionnel)</span>
              </Label>
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                placeholder="Aéroport CDG"
                className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div
            className="px-5 py-3 border-t border-white/8 bg-slate-900/50"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
          >
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setFormOpen(false)}
                className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/8"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!title.trim() || !date || saving}
                className="flex-1 gradient-primary text-white border-0 disabled:opacity-40"
              >
                {saving ? "…" : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <button
        onClick={openForm}
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        aria-label="Nouvelle étape"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
