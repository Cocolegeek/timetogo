"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSWRConfig } from "swr";
import { CloudOff, RefreshCw } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { flushOutbox, getOutbox, getServerOutbox, subscribeOutbox } from "@/lib/offline/outbox";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const getOnline = () => navigator.onLine;
const getServerOnline = () => true;

/** Rejoue les modifications faites hors ligne et affiche l'état du réseau (rien tant que tout va bien). */
export function OfflineSync() {
  const online = useSyncExternalStore(subscribeOnline, getOnline, getServerOnline);
  const queue = useSyncExternalStore(subscribeOutbox, getOutbox, getServerOutbox);
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const waiting = queue.length;

  useEffect(() => {
    if (!online || waiting === 0) return;
    let cancelled = false;
    const run = async () => {
      const res = await flushOutbox();
      if (cancelled || res.sent + res.dropped === 0) return;
      await Promise.all([...new Set(res.cacheKeys)].map((k) => mutate(k)));
      if (res.sent > 0) {
        toast({ message: res.sent === 1 ? "Modification envoyée" : `${res.sent} modifications envoyées`, tone: "success" });
      }
      if (res.dropped > 0) {
        toast({ message: "Une modification n'a pas pu être enregistrée", tone: "error" });
      }
    };
    void run();
    const retry = setInterval(run, 20_000);
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [online, waiting, mutate, toast]);

  if (online && waiting === 0) return null;

  const Icon = online ? RefreshCw : CloudOff;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <span className="animate-pop pointer-events-auto flex min-h-9 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-float">
        <Icon size={15} className={online ? "animate-spin" : undefined} />
        {online
          ? `Envoi de ${waiting} modification${waiting > 1 ? "s" : ""}…`
          : waiting > 0
            ? `Hors ligne · ${waiting} en attente`
            : "Hors ligne"}
      </span>
    </div>
  );
}
