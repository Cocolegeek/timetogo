import { cn } from "@/lib/utils";
import type { Participant } from "@/types";

interface ParticipantAvatarProps {
  participant: Participant;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

export function ParticipantAvatar({
  participant,
  size = "md",
  className,
}: ParticipantAvatarProps) {
  const initials = participant.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0 ring-2 ring-white/10",
        SIZES[size],
        className
      )}
      style={{ backgroundColor: participant.color }}
      title={participant.name}
    >
      {participant.avatar ?? initials}
    </div>
  );
}
