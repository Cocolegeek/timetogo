"use client";

import { useState } from "react";

/**
 * Stays true once `when` has been true: lets a lazily loaded sheet or dialog
 * mount on first open (its code isn't part of the launch) and stay mounted
 * afterwards so its closing animation still plays.
 */
export function useMountOnce(when: boolean): boolean {
  const [mounted, setMounted] = useState(when);
  if (when && !mounted) setMounted(true);
  return mounted || when;
}
