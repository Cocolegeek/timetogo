import { cn } from "@/lib/utils";

/* Palette tied to the logo: brand blurple, night indigo, lilac, sun, white. */
const B = "#635BFF";
const N = "#1C1840";
const L = "#DCD9FF";
const S = "#FFC94D";
const W = "#FFFFFF";
const D = "#4B43E6";

const BG = [L, B, N, S, B] as const;
export const COVER_COUNT = BG.length;

export function coverIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % COVER_COUNT;
}

function Scene({ i }: { i: number }) {
  switch (i) {
    case 0:
      return (
        <>
          <circle cx="272" cy="62" r="40" fill={S} />
          <rect x="22" y="104" width="44" height="96" rx="6" fill={N} />
          <rect x="74" y="128" width="52" height="72" rx="6" fill={B} />
          <rect x="134" y="94" width="40" height="106" rx="6" fill={W} />
          <rect x="182" y="132" width="60" height="68" rx="6" fill={N} />
          <rect x="250" y="112" width="44" height="88" rx="6" fill={B} />
          <rect x="302" y="140" width="40" height="60" rx="6" fill={W} />
          <rect x="146" y="110" width="8" height="10" rx="2" fill={B} />
          <rect x="160" y="110" width="8" height="10" rx="2" fill={B} />
          <rect x="146" y="128" width="8" height="10" rx="2" fill={B} />
          <rect x="160" y="128" width="8" height="10" rx="2" fill={B} />
        </>
      );
    case 1:
      return (
        <>
          <circle cx="290" cy="52" r="24" fill={S} />
          <path d="M-10 200L110 48L200 160L250 98L380 200Z" fill={N} />
          <path d="M150 200L250 98L380 200Z" fill={D} />
          <path d="M110 48L137 82L122 78L110 90L98 78L83 82Z" fill={W} />
          <path d="M250 98L268 121L258 118L250 126L242 118L232 121Z" fill={W} />
        </>
      );
    case 2:
      return (
        <>
          <circle cx="92" cy="66" r="32" fill={S} />
          <circle cx="250" cy="40" r="3" fill={W} />
          <circle cx="300" cy="74" r="2" fill={W} />
          <circle cx="210" cy="86" r="2" fill={W} />
          <path d="M0 140Q45 112 90 140T180 140 270 140 360 140V200H0Z" fill={L} />
          <path d="M0 168Q45 140 90 168T180 168 270 168 360 168V200H0Z" fill={B} />
        </>
      );
    case 3:
      return (
        <>
          <circle cx="272" cy="64" r="26" fill={W} />
          <path d="M0 200V140Q90 80 180 140T360 128V200Z" fill={B} />
          <path d="M0 200V172Q90 124 180 172T360 164V200Z" fill={N} />
        </>
      );
    default:
      return (
        <>
          <circle cx="180" cy="200" r="128" fill={L} />
          <circle cx="180" cy="200" r="86" fill={W} />
          <circle cx="180" cy="200" r="44" fill={N} />
          <circle cx="62" cy="54" r="14" fill={S} />
        </>
      );
  }
}

/** Flat illustrated cover, picked deterministically from a seed (trip id). */
export function TripCover({
  seed,
  variant,
  className,
  children,
}: {
  seed: string;
  variant?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const i = variant ?? coverIndex(seed);
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: BG[i] }}>
      <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <Scene i={i} />
      </svg>
      {children}
    </div>
  );
}
