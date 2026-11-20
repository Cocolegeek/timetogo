"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { VoyouLogo } from "@/components/layout/VoyouLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "app-install-dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|crios|fxios/i.test(ua);
}

export function AppInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    if (isIosSafari()) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setPlatform("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    deferredRef.current = null;
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 z-50 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
      <div role="dialog" aria-label="Installer Voyou" className="animate-fade-up mx-auto max-w-sm rounded-[1.5rem] bg-popover shadow-float">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <VoyouLogo size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.95rem] font-semibold text-foreground">Installer Voyou</p>
            {platform === "ios" ? (
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                Dans Safari, appuie sur{" "}
                <svg width="13" height="13" viewBox="0 0 50 50" fill="currentColor" className="mx-0.5 -mt-0.5 inline shrink-0 text-foreground">
                  <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/>
                  <path d="M24 7h2v21h-2z"/>
                  <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/>
                </svg>{" "}
                puis <span className="font-medium text-foreground">« Sur l&apos;écran d&apos;accueil »</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">Plus rapide, en plein écran.</p>
            )}
          </div>

          {platform === "android" && (
            <button
              type="button"
              onClick={install}
              className="pressable h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Installer
            </button>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
