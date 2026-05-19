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
