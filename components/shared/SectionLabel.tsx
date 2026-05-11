interface SectionLabelProps {
  children: React.ReactNode;
  count?: number;
  className?: string;
}

/**
 * Small structural section header used to divide content within a page
 * (e.g. "Tous les soldes", "Me concerne", "Entre les autres").
 * Lighter than a full section title — sits above cards without competing.
 */
export function SectionLabel({ children, count, className }: SectionLabelProps) {
  return (
    <div className={`flex items-baseline gap-2 px-1 mb-3 ${className ?? ""}`}>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {children}
      </h3>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold tabular-nums text-slate-500 bg-foreground/8 px-1.5 py-0.5 rounded-full leading-none">
          {count}
        </span>
      )}
    </div>
  );
}
