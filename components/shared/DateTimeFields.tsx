"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const FIELD =
  "relative flex h-12 w-full min-w-0 items-center rounded-2xl border border-input bg-card px-4 text-base transition-shadow focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/12";
// The native input stays on top (transparent) so the OS picker opens on tap, keyboard works and
// screen readers get a real date/time control, while every browser shows the same label.
const NATIVE = "absolute inset-0 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full";

function openPicker(input: HTMLInputElement | null) {
  try {
    input?.showPicker?.();
  } catch {
    // showPicker throws outside a user gesture or in cross-origin frames: the native tap still works.
  }
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DateField({
  value,
  onChange,
  label = "Date",
  min,
  id,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  min?: string;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cn(FIELD, className)}>
      <span className={cn("truncate tabular", !value && "text-muted-foreground")}>{value ? formatDay(value) : label}</span>
      <input
        ref={ref}
        id={id}
        type="date"
        aria-label={label}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => openPicker(ref.current)}
        className={NATIVE}
      />
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  label = "Heure",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cn(FIELD, className)}>
      <span className={cn("truncate tabular", !value && "text-muted-foreground")}>{value ? value.slice(0, 5) : label}</span>
      <input
        ref={ref}
        type="time"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => openPicker(ref.current)}
        className={NATIVE}
      />
    </div>
  );
}
