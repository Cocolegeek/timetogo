import { cn } from "@/lib/utils";

interface DayHeaderProps {
  date: string;
  isToday: boolean;
  isPast: boolean;
}

export function DayHeader({ date, isToday, isPast }: DayHeaderProps) {
  const label = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <h2
        className={cn(
          "font-display text-[1.15rem] font-bold tracking-tight first-letter:uppercase",
          isPast && !isToday ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {label}
      </h2>
      {isToday && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Aujourd&apos;hui
        </span>
      )}
    </div>
  );
}
