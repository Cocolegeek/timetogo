import { cn } from "@/lib/utils";

interface VoyouLogoProps {
  size?: number;
  wordmark?: boolean;
  /** Always ink-on-paper, for use over a coloured cover. */
  fixed?: boolean;
}

export function VoyouLogo({ size = 36, wordmark = false, fixed = false }: VoyouLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", fixed && "text-[#1A1A1A]")}>
      <span
        role="img"
        aria-label="Voyou"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold",
          fixed ? "bg-[#1A1A1A] text-[#FAF7F2]" : "bg-foreground text-background"
        )}
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        V
      </span>
      {wordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight">Voyou</span>
      )}
    </span>
  );
}
