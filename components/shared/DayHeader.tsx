import { cn } from "@/lib/utils";

interface DayHeaderProps {
  date: string;
  isToday: boolean;
  isPast: boolean;
}

export function DayHeader({ date, isToday, isPast }: DayHeaderProps) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <p
        className={cn(
          "text-base font-semibold uppercase tracking-wider",
          isToday ? "text-indigo-300" : isPast ? "text-slate-500" : "text-slate-300"
        )}
      >
        {new Date(date).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      {isToday && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold tracking-normal">
          AUJ.
        </span>
      )}
    </div>
  );
}
