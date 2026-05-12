interface VoyouLogoProps {
  size?: number;
}

export function VoyouLogo({ size = 36 }: VoyouLogoProps) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-section"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon.png"
        alt="Voyou"
        width={size}
        height={size}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </span>
  );
}
