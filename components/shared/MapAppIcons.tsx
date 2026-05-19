interface IconProps {
  size?: number;
  className?: string;
}

function AppIcon({ src, alt, size, className }: IconProps & { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ objectFit: "contain", width: size, height: size }}
    />
  );
}

export function GoogleMapsIcon({ size = 32, className }: IconProps) {
  return <AppIcon src="/logo/logo_google_maps.svg" alt="Google Maps" size={size} className={className} />;
}

export function WazeIcon({ size = 32, className }: IconProps) {
  return <AppIcon src="/logo/logo_waze.svg" alt="Waze" size={size} className={className} />;
}

export function AppleMapsIcon({ size = 32, className }: IconProps) {
  return <AppIcon src="/logo/logo_apple_maps.svg" alt="Plans" size={size} className={className} />;
}

export function CityMapperIcon({ size = 32, className }: IconProps) {
  return <AppIcon src="/logo/logo_citymapper.png" alt="CityMapper" size={size} className={className} />;
}

export function GoogleFlightsIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#1a73e8" />
      {/* Plane body */}
      <path
        d="M38 18.5L32 24l-14-2-3 3 9 3-3 3-5-1-2 2 8 3c1 .3 2 0 2.7-.7L38 18.5z"
        fill="white"
      />
      {/* Wing */}
      <path
        d="M10 22l4-4 10 3-3 3-11-2z"
        fill="white"
        opacity="0.7"
      />
    </svg>
  );
}
