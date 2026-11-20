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
          "flex h-12 w-full items-center gap-3 rounded-2xl border border-input bg-card px-4 text-left transition-colors",
          "hover:border-foreground/25 active:bg-secondary",
          className
        )}
      >
        <MapPin
          size={17}
          className={cn("shrink-0", value ? "text-primary" : "text-muted-foreground")}
        />
        <span
          className={cn(
            "flex-1 truncate text-base",
            value ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {value || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={clearValue}
            aria-label="Effacer le lieu"
            className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X size={15} />
          </span>
        ) : (
          <Search size={15} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Full-screen picker sheet */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="p-0 flex flex-col overflow-hidden"
          style={{ height: "88dvh" }}
        >
          <SheetTitle className="sr-only">Rechercher un lieu</SheetTitle>

          {/* Search header */}
          <div className="shrink-0 border-b border-border px-4 pt-10 pr-16 pb-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full border pl-10 pr-10 h-12 text-lg border-input bg-card rounded-2xl outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
              />
              {loading ? (
                <Loader2
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSuggestions([]); setLoading(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground/85 rounded"
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
                      className="flex w-full items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors hover:bg-foreground/[0.03] active:bg-secondary"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <MapPin size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate leading-snug">
                          {main}
                        </p>
                        {subtitle && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
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
                <div className="w-14 h-14 rounded-full bg-foreground/[0.06] flex items-center justify-center mb-4">
                  <MapPin size={22} className="text-muted-foreground" />
                </div>
                <p className="text-foreground/85 font-semibold text-lg">Aucun résultat</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Essaie un autre nom ou une adresse complète
                </p>
              </div>
            ) : query.trim().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-foreground/[0.06] flex items-center justify-center mb-4">
                  <Search size={22} className="text-muted-foreground" />
                </div>
                <p className="text-foreground/85 font-semibold">Où veux-tu aller ?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tape le nom d&apos;un lieu, d&apos;une ville ou d&apos;une adresse
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
