"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { useAuthUser } from "@/hooks/useAuthUser";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { profileAvatar } from "@/lib/avatars";

/** Header avatar: one tap to Réglages (profile, payment info, theme, sign-out live there). */
export function UserMenu() {
  const { profile } = useProfile();
  const { isAnonymous } = useAuthUser();

  return (
    <Link
      href="/settings"
      prefetch
      aria-label={isAnonymous ? "Réglages (compte invité)" : "Réglages"}
      className="pressable relative size-10 rounded-full ring-1 ring-border transition-shadow outline-none hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserAvatar src={profileAvatar(profile)} name={profile?.name} size={40} />
      {isAnonymous && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-amber-400 ring-2 ring-background" aria-hidden="true" />
      )}
    </Link>
  );
}
