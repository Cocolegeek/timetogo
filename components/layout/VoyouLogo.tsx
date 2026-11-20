import { cn } from "@/lib/utils";

interface VoyouLogoProps {
  size?: number;
  wordmark?: boolean;
  /** Wordmark stays ink-coloured (both themes), for use over a light illustration. */
  fixed?: boolean;
  className?: string;
}

/** The "oyo" face: two o's for eyes, the y as nose + cheeky smile. Inline SVG = no request, always crisp. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={cn("shrink-0", className)} role="img" aria-label="Voyou">
      <rect width="512" height="512" rx="150" fill="#FFC83D" />
      <g fill="none" stroke="#15171C" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="174" cy="214" r="54" strokeWidth="36" />
        <circle cx="338" cy="214" r="54" strokeWidth="36" />
        <circle cx="190" cy="212" r="17" fill="#15171C" stroke="none" />
        <circle cx="354" cy="212" r="17" fill="#15171C" stroke="none" />
        <path d="M228 270 L256 314 L284 270 M256 314 C254 366 308 394 364 366" strokeWidth="34" />
      </g>
    </svg>
  );
}

export function VoyouLogo({ size = 36, wordmark = false, fixed = false, className }: VoyouLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", fixed && "text-[#15171C]", className)}>
      <LogoMark size={size} />
      {wordmark && <span className="font-display text-xl font-extrabold tracking-tight">Voyou</span>}
    </span>
  );
}
