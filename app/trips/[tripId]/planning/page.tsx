"use client";

import { use, useState } from "react";
import { Plus, Map, Clock, MapPin, X } from "lucide-react";
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

export default function PlanningPage({ params }: PlanningPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { items, addItem, deleteItem } = useItinerary(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<ItineraryType>("activity");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

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
    });
    setTitle(""); setTime(""); setLocation(""); setDescription("");
    setFormOpen(false);
    setSaving(false);
  };

  const openForm = () => {
    setDate(trip?.startDate ?? new Date().toISOString().split("T")[0]);
    setFormOpen(true);
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
          <h1 className="text-xl font-bold text-slate-100">Planning</h1>
          <p className="text-sm text-slate-400 mt-0.5">{trip?.name}</p>
        </div>
        <Button onClick={openForm} className="gradient-primary text-white border-0">
          <Plus size={16} />
          Étape
        </Button>
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
              <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">
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
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock size={10} />
                                    {item.time}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-slate-200 mt-1.5">
                                {item.title}
                              </p>
                              {item.location && (
                                <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                  <MapPin size={10} />
                                  {item.location}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                              onClick={() => deleteItem(item.id)}
                            >
                              <X size={13} />
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
        <DialogContent className="glass-strong border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Nouvelle étape</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Vol Paris → Rome"
                className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Heure</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Type</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(TYPE_CONFIG) as ItineraryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
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
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Lieu (optionnel)</Label>
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                placeholder="Aéroport CDG"
                className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !date || saving}
              className="w-full gradient-primary text-white border-0"
            >
              {saving ? "Ajout…" : "Ajouter l'étape"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
