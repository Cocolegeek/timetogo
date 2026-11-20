import { cn } from "@/lib/utils";

const COVERS = [
  { bg: "#F6B84B" },
  { bg: "#CFE3F0" },
  { bg: "#167A4F" },
  { bg: "#E9D8F2" },
  { bg: "#D83B1E" },
] as const;

export function coverIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % COVERS.length;
}

/** Flat illustrated cover, picked deterministically from a seed (trip id). */
export function TripCover({ seed, className }: { seed: string; className?: string }) {
  const i = coverIndex(seed);
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: COVERS[i].bg }} aria-hidden="true">
      <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {i === 0 && (
          <>
            <circle cx="276" cy="62" r="44" fill="#D83B1E" />
            <rect x="18" y="104" width="46" height="96" rx="4" fill="#1A1A1A" />
            <rect x="72" y="126" width="54" height="74" rx="4" fill="#D83B1E" />
            <rect x="134" y="96" width="42" height="104" rx="4" fill="#FAF7F2" stroke="#1A1A1A" strokeWidth="3" />
            <rect x="184" y="132" width="62" height="68" rx="4" fill="#1A1A1A" />
            <rect x="254" y="112" width="46" height="88" rx="4" fill="#D83B1E" />
            <rect x="308" y="140" width="40" height="60" rx="4" fill="#FAF7F2" stroke="#1A1A1A" strokeWidth="3" />
          </>
        )}
        {i === 1 && (
          <>
            <circle cx="290" cy="50" r="26" fill="#F6B84B" />
            <path d="M-10 200L110 50L200 160L250 100L380 200Z" fill="#1E3A5F" />
            <path d="M110 50L136 92L110 82L84 92Z" fill="#fff" />
            <path d="M250 100L268 128L250 122L232 128Z" fill="#fff" />
          </>
        )}
        {i === 2 && (
          <>
            <circle cx="90" cy="64" r="34" fill="#F6B84B" />
            <path d="M0 150Q45 118 90 150T180 150 270 150 360 150V200H0Z" fill="#FAF7F2" />
            <path d="M0 176Q45 144 90 176T180 176 270 176 360 176V200H0Z" fill="#1A1A1A" />
          </>
        )}
        {i === 3 && (
          <>
            <path d="M0 200V150Q90 90 180 150T360 140V200Z" fill="#1A1A1A" />
            <circle cx="70" cy="70" r="30" fill="#F6B84B" />
            <circle cx="250" cy="84" r="16" fill="#D83B1E" />
            <path d="M0 200V176Q90 130 180 176T360 170V200Z" fill="#FAF7F2" />
          </>
        )}
        {i === 4 && (
          <>
            <circle cx="180" cy="200" r="120" fill="#F6B84B" />
            <circle cx="180" cy="200" r="78" fill="#FAF7F2" />
            <circle cx="180" cy="200" r="38" fill="#1A1A1A" />
          </>
        )}
      </svg>
    </div>
  );
}
