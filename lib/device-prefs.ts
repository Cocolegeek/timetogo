"use client";

import { useSyncExternalStore } from "react";

/** Per-device comfort settings (not synced: they depend on the phone, not the person). */
export type DevicePref = "motion" | "haptics";

const KEYS: Record<DevicePref, string> = { motion: "voyou-motion", haptics: "voyou-haptics" };
const DEFAULTS: Record<DevicePref, string> = { motion: "auto", haptics: "on" };
const EVENT = "voyou:device-pref";

export function readDevicePref(pref: DevicePref): string {
  try {
    return localStorage.getItem(KEYS[pref]) ?? DEFAULTS[pref];
  } catch {
    return DEFAULTS[pref];
  }
}

export function writeDevicePref(pref: DevicePref, value: string) {
  try {
    if (value === DEFAULTS[pref]) localStorage.removeItem(KEYS[pref]);
    else localStorage.setItem(KEYS[pref], value);
  } catch {
    // storage unavailable: applies to this page only
  }
  if (pref === "motion") document.documentElement.classList.toggle("reduce-motion", value === "reduced");
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDevicePref(pref: DevicePref): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readDevicePref(pref),
    () => DEFAULTS[pref]
  );
  return [value, (v: string) => writeDevicePref(pref, v)];
}
