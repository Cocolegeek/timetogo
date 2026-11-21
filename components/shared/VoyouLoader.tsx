import { cn } from "@/lib/utils";

const INK = "#15171C";

/** Default lines while the app gets ready: a nod to what Voyou does for the bande. */
export const LOADER_LINES = [
  "On boucle les valises…",
  "On réveille la bande…",
  "On fait les comptes…",
  "On cherche le tire-bouchon…",
  "On vérifie la météo…",
];

interface VoyouLoaderProps {
  /** One fixed line, or the rotating default lines (5) when omitted. */
  label?: string;
  /** Wait before showing up (ms): quick loads never see it flash. */
  delay?: number;
  /** Size of the face, in px. */
  size?: number;
  className?: string;
}

/**
 * The « oyo » face hops (squash & stretch), looks up at the top of each jump,
 * glances around and blinks while lines about the trip roll below.
 * Pure CSS + SVG: rendered by the server, no JS, respects reduced motion.
 */
export function VoyouLoader({ label, delay = 0, size = 84, className }: VoyouLoaderProps) {
  const lines = label ? [label] : LOADER_LINES;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("vl", className)}
      style={{ "--vl-delay": `${delay}ms`, "--vl-size": `${size}px` } as React.CSSProperties}
    >
      <div className="vl-stage" aria-hidden="true">
        <span className="vl-shadow" />
        <svg viewBox="0 0 512 512" width={size} height={size} className="vl-hop">
          <rect width="512" height="512" rx="150" fill="#FFC83D" />
          <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
            <g className="vl-eyes">
              <circle cx="174" cy="214" r="54" strokeWidth="36" />
              <circle cx="338" cy="214" r="54" strokeWidth="36" />
              <g className="vl-look-x">
                <g className="vl-look-y">
                  <circle cx="190" cy="212" r="17" fill={INK} stroke="none" />
                  <circle cx="354" cy="212" r="17" fill={INK} stroke="none" />
                </g>
              </g>
            </g>
            <path d="M228 270 L256 314 L284 270 M256 314 C254 366 308 394 364 366" strokeWidth="34" />
          </g>
        </svg>
      </div>
      <p className="vl-msgs">
        {lines.map((line, i) => (
          <span key={line} style={{ "--i": i } as React.CSSProperties}>
            {line}
          </span>
        ))}
      </p>
      <span className="sr-only">Chargement</span>
    </div>
  );
}
