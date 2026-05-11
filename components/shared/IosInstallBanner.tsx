"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "ios-install-dismissed";

function isIosSafari() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && isSafari && !isStandalone;
}

export function IosInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div
        className="mb-4 mx-auto max-w-sm rounded-2xl border border-foreground/10 bg-slate-900/95 backdrop-blur-xl px-4 py-3.5 shadow-2xl"
        style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100">
              Installer Time to Go
            </p>
            <p className="text-sm text-slate-400 mt-0.5 leading-snug">
              Appuie sur{" "}
              <span className="inline-flex items-center gap-0.5 text-slate-200 font-medium">
                {/* Safari share icon */}
                <svg width="14" height="14" viewBox="0 0 50 50" fill="currentColor" className="inline shrink-0">
                  <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/>
                  <path d="M24 7h2v21h-2z"/>
                  <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/>
                </svg>
              </span>{" "}
              dans Safari puis{" "}
              <span className="text-slate-200 font-medium">"Sur l'écran d'accueil"</span>
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 -mr-1 rounded-lg text-slate-500 hover:text-slate-300 shrink-0"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
