import { cn } from "@/lib/utils";

interface VoyouLogoProps {
  size?: number;
  wordmark?: boolean;
  /** Wordmark stays ink-coloured (both themes), for use over a light illustration. */
  fixed?: boolean;
}

export function VoyouLogo({ size = 36, wordmark = false, fixed = false }: VoyouLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", fixed && "text-[#1A1D24]")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon.png"
        alt={wordmark ? "" : "Voyou"}
        width={size}
        height={size}
        draggable={false}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      />
      {wordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight">Voyou</span>
      )}
    </span>
  );
}
