"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const APP_SCREENS = /^\/(trips|settings)(\/|$)/;

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // The SW serves saved screens instantly; when it finds a newer deployment:
    // reload right away if the user hasn't touched anything yet, otherwise
    // switch to a full page load on their next link tap.
    let touched = false;
    let stale = false;
    const markTouched = () => (touched = true);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "voyou:new-version") return;
      if (!touched) window.location.reload();
      else stale = true;
    };
    const onClick = (e: MouseEvent) => {
      if (!stale || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      window.location.assign(a.href);
    };
    window.addEventListener("pointerdown", markTouched, { once: true });
    window.addEventListener("keydown", markTouched, { once: true });
    document.addEventListener("click", onClick, true);
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("pointerdown", markTouched);
      window.removeEventListener("keydown", markTouched);
      document.removeEventListener("click", onClick, true);
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    // A saved screen can be shown before the server is asked: if the session is gone, go sign in.
    if (!APP_SCREENS.test(window.location.pathname)) return;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) {
          const back = window.location.pathname + window.location.search;
          window.location.replace(`/login?redirect_to=${encodeURIComponent(back)}`);
        }
      })
      .catch(() => null);
  }, []);

  return null;
}
