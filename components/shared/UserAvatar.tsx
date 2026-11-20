import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src: string | null | undefined;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Profile picture (Google photo or preset) with an initial as fallback. */
export function UserAvatar({ src, name, size = 40, className }: UserAvatarProps) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground font-display font-bold text-background", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" draggable={false} />
      ) : (
        initial
      )}
    </span>
  );
}
