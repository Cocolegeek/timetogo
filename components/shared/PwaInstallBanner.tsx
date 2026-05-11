"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "android" | "ios";

const DISMISSED_KEY = "pwa-install-dismissed";

export function PwaInstallBanner() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone
    ) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) setMode("ios");

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setMode("hidden");
    setPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <div className="mx-auto max-w-3xl px-4 mb-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-section bg-section-tint backdrop-blur-sm">
        <div className="w-9 h-9 rounded-xl bg-section-soft flex items-center justify-center shrink-0">
          <Download size={18} className="text-section" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 leading-snug">
            Meilleure expérience sur l&apos;app
          </p>
          <p className="text-xs text-slate-400 leading-snug mt-0.5">
            {mode === "ios"
              ? "Appuie sur le bouton partage puis « Sur l'écran d'accueil »"
              : "Installe l'app pour accéder sans navigateur"}
          </p>
        </div>

        {mode === "android" && (
          <button
            onClick={handleInstall}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-section text-white text-xs font-semibold active:scale-95 transition-all"
          >
            Installer
          </button>
        )}

        {mode === "ios" && (
          <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-section-soft text-section-soft text-xs font-medium">
            <Share size={13} />
            <span>Partager</span>
          </div>
        )}

        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 active:scale-95 transition-all"
          aria-label="Ignorer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
