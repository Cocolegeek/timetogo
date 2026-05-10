"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtShort(ymd: string) {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function daysBetween(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const ms = new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime();
  return Math.round(ms / 86400000) + 1;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date(startDate + "T12:00:00").getFullYear());
  const [calMonth, setCalMonth] = useState(new Date(startDate + "T12:00:00").getMonth());

  const { offset, daysInMonth } = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    return {
      offset: (firstDay + 6) % 7,
      daysInMonth: new Date(calYear, calMonth + 1, 0).getDate(),
    };
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const openCalendar = () => {
    const d = new Date(startDate + "T12:00:00");
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setPendingStart(null);
    setHoverDate(null);
    setOpen(true);
  };

  const close = () => { setOpen(false); setPendingStart(null); setHoverDate(null); };

  const handleDayClick = (ymd: string) => {
    if (!pendingStart) {
      setPendingStart(ymd);
    } else if (ymd >= pendingStart) {
      onChange(pendingStart, ymd);
      close();
    } else {
      setPendingStart(ymd);
    }
  };

  // What range to highlight during selection
  const rangeStart = pendingStart ?? startDate;
  const rangeEnd = pendingStart
    ? (hoverDate && hoverDate >= pendingStart ? hoverDate : pendingStart)
    : endDate;

  const duration = daysBetween(startDate, endDate);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={openCalendar}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-foreground/8 border border-foreground/10 hover:bg-foreground/12 active:bg-foreground/16 transition-all text-left"
      >
        <CalendarDays size={18} className="text-indigo-400 shrink-0" />

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Départ</p>
            <p className="text-sm font-semibold text-slate-100 truncate">{fmtShort(startDate)}</p>
          </div>
          <div className="w-px h-7 bg-foreground/10 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Retour</p>
            <p className="text-sm font-semibold text-slate-100 truncate">{fmtShort(endDate)}</p>
          </div>
        </div>

        {duration > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold tabular-nums shrink-0">
            {duration}j
          </span>
        )}
      </button>

      {/* Bottom-sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-sm glass-strong border border-foreground/10 rounded-t-2xl overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/8">
              <p className="text-sm font-semibold text-slate-200">
                {pendingStart
                  ? `Départ · ${fmtShort(pendingStart)} — Choisir le retour`
                  : "Choisir la date de départ"}
              </p>
              <button
                type="button"
                onClick={close}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-foreground/8 transition-colors"
              >
                Fermer
              </button>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-300 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-base font-semibold text-slate-100 capitalize">
                {MONTHS_FR[calMonth]} {calYear}
              </p>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-300 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-3">
              {DAYS_FR.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-slate-600 uppercase py-1.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 px-3 pb-5 gap-y-0.5">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`offset-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ymd = toYMD(calYear, calMonth, day);
                const isStart = ymd === rangeStart;
                const isEnd = ymd === rangeEnd && rangeEnd !== rangeStart;
                const isSingle = ymd === rangeStart && rangeStart === rangeEnd;
                const inRange = ymd > rangeStart && ymd < rangeEnd;
                const isToday = ymd === today;

                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => handleDayClick(ymd)}
                    onMouseEnter={() => pendingStart && setHoverDate(ymd)}
                    onMouseLeave={() => pendingStart && setHoverDate(null)}
                    className={cn(
                      "h-10 flex items-center justify-center text-sm font-medium transition-all relative select-none",
                      // Range fill (no border-radius on middle cells)
                      inRange && "bg-indigo-500/15 text-indigo-100",
                      // Start cap
                      isStart && "bg-indigo-500 text-white rounded-l-full shadow-sm",
                      // End cap
                      isEnd && "bg-indigo-500 text-white rounded-r-full shadow-sm",
                      // Single day (start = end)
                      isSingle && "bg-indigo-500 text-white rounded-full shadow-sm",
                      // Default
                      !isStart && !isEnd && !isSingle && !inRange && [
                        "rounded-full hover:bg-foreground/10",
                        isToday ? "text-indigo-300 font-bold" : "text-slate-300",
                      ]
                    )}
                  >
                    {day}
                    {isToday && !isStart && !isEnd && !isSingle && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
