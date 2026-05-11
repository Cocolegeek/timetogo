"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Limit results to this many entries (default: 5) */
  limit?: number;
  /** Optional language for results (default: "fr") */
  lang?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  limit = 5,
  lang = "fr",
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Skip if value matches a suggestion just selected
    if (trimmed === lastQueryRef.current) return;

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmed
        )}&format=json&limit=${limit}&accept-language=${lang}&addressdetails=0`;
        const res = await fetch(url, {
          headers: { "Accept": "application/json" },
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
        setHighlightIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, limit, lang]);

  const selectSuggestion = (s: NominatimResult) => {
    lastQueryRef.current = s.display_name;
    onChange(s.display_name);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightIdx >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            lastQueryRef.current = "";
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn("pr-9", className)}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-slate-500" />
          ) : (
            <MapPin size={14} className="text-slate-500" />
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 rounded-xl border border-foreground/10 bg-slate-900/95 backdrop-blur shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              type="button"
              onMouseEnter={() => setHighlightIdx(i)}
              onClick={() => selectSuggestion(s)}
              className={cn(
                "w-full text-left px-3 py-2 flex items-start gap-2 transition-colors",
                highlightIdx === i
                  ? "bg-section-soft text-slate-100"
                  : "text-slate-300 hover:bg-foreground/8"
              )}
            >
              <MapPin size={13} className="text-slate-500 mt-0.5 shrink-0" />
              <span className="text-sm leading-tight">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600 mt-1">
        Suggestions OpenStreetMap
      </p>
    </div>
  );
}
