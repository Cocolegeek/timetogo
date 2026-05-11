"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4">
      <div
        className="mb-4 mx-auto max-w-sm rounded-2xl border border-foreground/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
        style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100">Installer Time to Go</p>
            {platform === "ios" ? (
              <p className="text-sm text-slate-400 mt-0.5 leading-snug">
                Dans Safari, appuie sur{" "}
                <svg width="13" height="13" viewBox="0 0 50 50" fill="currentColor" className="inline mx-0.5 -mt-0.5 text-slate-200 shrink-0">
                  <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/>
                  <path d="M24 7h2v21h-2z"/>
                  <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/>
                </svg>{" "}
                puis <span className="text-slate-200 font-medium">"Sur l'écran d'accueil"</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-0.5">
                Meilleure expérience en version app
              </p>
            )}
          </div>

          {platform === "android" && (
            <button
              type="button"
              onClick={install}
              className="px-3.5 py-2 rounded-xl bg-section-soft text-section-soft border border-section text-sm font-semibold hover:bg-section-medium active:scale-95 transition-all shrink-0"
            >
              Installer
            </button>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 shrink-0"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
