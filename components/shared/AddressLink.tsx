"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable address row that exposes one-tap navigation shortcuts to
 * Google Maps / Waze / Citymapper / Apple Maps. The address text itself
 * remains independently clickable (e.g. to open an edit dialog) — clicks
 * on the GPS icons stop propagation so they never trigger the parent.
 */
interface AddressLinkProps {
  address: string;
  /** Called when the address text is clicked — leave undefined to make it inert. */
  onTextClick?: () => void;
  /** Hide the leading map pin icon. */
  hideIcon?: boolean;
  /** Smaller variant (icons + text). */
  compact?: boolean;
  className?: string;
}

interface NavApp {
  label: string;
  /** Initial letter shown on the round button. */
  initial: string;
  /** Background colour (CSS) for the round button. */
  bg: string;
  /** Text colour for the initial. */
  fg: string;
  url: (encoded: string) => string;
  iosOnly?: boolean;
}

/** All addresses are passed url-encoded — works equally well with text or "lat,lon" */
const NAV_APPS: NavApp[] = [
  {
    label: "Google Maps",
    initial: "G",
    bg: "#1A73E8",
    fg: "#fff",
    url: (q) => `https://www.google.com/maps/search/?api=1&query=${q}`,
  },
  {
    label: "Waze",
    initial: "W",
    bg: "#33CCFF",
    fg: "#fff",
    url: (q) => `https://waze.com/ul?q=${q}&navigate=yes`,
  },
  {
    label: "Citymapper",
    initial: "C",
    bg: "#10B981",
    fg: "#fff",
    url: (q) => `https://citymapper.com/directions?endaddress=${q}`,
  },
  {
    label: "Apple Maps",
    initial: "",
    bg: "#0F172A",
    fg: "#fff",
    url: (q) => `https://maps.apple.com/?q=${q}`,
    iosOnly: true,
  },
];

export function AddressLink({
  address,
  onTextClick,
  hideIcon = false,
  compact = false,
  className,
}: AddressLinkProps) {
  const [isIOS, setIsIOS] = useState(false);

  // Detect iOS client-side to optionally surface Apple Maps
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document));
  }, []);

  if (!address?.trim()) return null;

  const encoded = encodeURIComponent(address.trim());
  const apps = NAV_APPS.filter((a) => !a.iosOnly || isIOS);

  const buttonSize = compact ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-[11px]";
  const textSize = compact ? "text-xs" : "text-sm";
  const iconSize = compact ? 11 : 12;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap min-w-0", className)}>
      {/* Address text — propagates onTextClick if provided */}
      <button
        type="button"
        onClick={(e) => {
          if (onTextClick) {
            e.stopPropagation();
            onTextClick();
          }
        }}
        className={cn(
          "flex items-center gap-1.5 min-w-0 max-w-full",
          textSize,
          "text-slate-400",
          onTextClick && "hover:text-slate-200 transition-colors cursor-pointer",
          !onTextClick && "cursor-default"
        )}
      >
        {!hideIcon && (
          <MapPin
            size={iconSize}
            className="text-slate-500 shrink-0"
            aria-hidden
          />
        )}
        <span className="truncate text-left">{address}</span>
      </button>

      {/* GPS shortcuts — clicks never bubble up to parent handlers */}
      <div className="flex items-center gap-1.5 shrink-0">
        {apps.map((app) => (
          <a
            key={app.label}
            href={app.url(encoded)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Ouvrir « ${address} » dans ${app.label}`}
            aria-label={`Ouvrir dans ${app.label}`}
            className={cn(
              "rounded-full flex items-center justify-center font-bold shadow-sm ring-1 ring-white/10",
              "hover:scale-110 active:scale-95 transition-transform",
              buttonSize
            )}
            style={{ backgroundColor: app.bg, color: app.fg }}
          >
            {app.initial}
          </a>
        ))}
      </div>
    </div>
  );
}
