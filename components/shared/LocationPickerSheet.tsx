"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
}

export interface LocationCoord {
  lat: number;
  lon: number;
}

interface LocationPickerSheetProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with coordinates whenever the user selects a suggestion */
  onChangeCoord?: (coord: LocationCoord | null) => void;
  placeholder?: string;
  className?: string;
  limit?: number;
  lang?: string;
}

function splitDisplayName(displayName: string): { main: string; subtitle: string } {
  const parts = displayName.split(", ");
  return {
    main: parts[0] ?? displayName,
    subtitle: parts.slice(1).join(", "),
  };
}

export function LocationPickerSheet({
  value,
  onChange,
  onChangeCoord,
  placeholder = "Rechercher un lieu",
  className,
  limit = 7,
  lang = "fr",
}: LocationPickerSheetProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when sheet opens
  useEffect(() => {
    if (pickerOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  }, [pickerOpen]);

  // Debounced search
  useEffect(() => {
    if (!pickerOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=${limit}&accept-language=${lang}&addressdetails=0`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) { setSuggestions([]); return; }
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, pickerOpen, limit, lang]);

  const openPicker = () => {
    setQuery(value);
    setSuggestions([]);
    setLoading(false);
    setPickerOpen(true);
  };

  const selectSuggestion = (s: NominatimResult) => {
    onChange(s.display_name);
    onChangeCoord?.({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
    setPickerOpen(false);
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    onChangeCoord?.(null);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length >= 2) setLoading(true);
    else setLoading(false);
  };

  return (
    <>
      {/* Trigger — looks like an input, acts as a button */}
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "w-full flex items-center gap-2.5 text-left h-10 rounded-lg px-3 border transition-colors",
          "hover:brightness-[1.15] active:brightness-90",
          className ?? "bg-foreground/8 border-foreground/10"
        )}
      >
        <MapPin
          size={15}
          className={cn("shrink-0", value ? "text-section" : "text-slate-500")}
        />
        <span
          className={cn(
            "flex-1 truncate text-sm",
            value ? "text-slate-100" : "text-slate-500"
          )}
        >
          {value || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={clearValue}
            className="p-0.5 text-slate-500 hover:text-slate-300 shrink-0 rounded"
          >
            <X size={13} />
          </span>
        ) : (
          <Search size={13} className="text-slate-600 shrink-0" />
        )}
      </button>

      {/* Full-screen picker sheet */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong border-foreground/10 rounded-t-2xl p-0 flex flex-col overflow-hidden"
          style={{ height: "88dvh" }}
        >
          <SheetTitle className="sr-only">Rechercher un lieu</SheetTitle>

          {/* Search header */}
          <div className="px-4 pt-4 pb-3 border-b border-foreground/8 shrink-0 pr-16">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full bg-foreground/8 border border-foreground/10 rounded-xl pl-10 pr-10 h-12 text-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-section"
              />
              {loading ? (
                <Loader2
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
                />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSuggestions([]); setLoading(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 rounded"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {suggestions.length > 0 ? (
              <div>
                {suggestions.map((s) => {
                  const { main, subtitle } = splitDisplayName(s.display_name);
                  return (
                    <button
                      key={s.place_id}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-4 px-5 py-4 border-b border-foreground/6 hover:bg-foreground/5 active:bg-foreground/8 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-foreground/8 flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-slate-100 truncate leading-snug">
                          {main}
                        </p>
                        {subtitle && (
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : query.trim().length >= 2 && !loading ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-foreground/8 flex items-center justify-center mb-4">
                  <MapPin size={22} className="text-slate-500" />
                </div>
                <p className="text-slate-300 font-semibold text-lg">Aucun résultat</p>
                <p className="text-sm text-slate-500 mt-1">
                  Essaie un autre nom ou une adresse complète
                </p>
              </div>
            ) : query.trim().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-foreground/8 flex items-center justify-center mb-4">
                  <Search size={22} className="text-slate-500" />
                </div>
                <p className="text-slate-300 font-semibold">Où veux-tu aller ?</p>
                <p className="text-sm text-slate-500 mt-1">
                  Tape le nom d'un lieu, d'une ville ou d'une adresse
                </p>
              </div>
            ) : null}
          </div>

          <div aria-hidden style={{ height: "calc(env(safe-area-inset-bottom) + 0.5rem)" }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
