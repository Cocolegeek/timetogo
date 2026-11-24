"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Loader2, TrainFront, Share2, UserMinus, UsersRound } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsGroup } from "@/components/settings/SettingsList";
import { StaggerItem } from "@/components/motion/Stagger";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useToast } from "@/components/shared/Toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { friendInviteUrl, useFriends } from "@/hooks/useFriends";
import { haptic } from "@/lib/haptics";
import type { Friend } from "@/types";

function together(f: Friend): string {
  if (f.tripsInCommon === 0) return "Ajouté avec son lien";
  const n = `${f.tripsInCommon} voyage${f.tripsInCommon > 1 ? "s" : ""} ensemble`;
  return f.lastTripName ? `${n} · ${f.lastTripName}` : n;
}

export default function FriendsSettingsPage() {
  const { friends, loading, code, addByCode, remove } = useFriends();
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Friend | null>(null);

  const url = code ? friendInviteUrl(code) : "";

  const share = async () => {
    if (!url) return;
    haptic("light");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Rejoins ma bande sur Voyou", text: "Ajoute-moi sur Voyou pour organiser nos prochains voyages :", url });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url).catch(() => null);
    toast({ message: "Lien copié", tone: "success" });
  };

  const addTyped = async () => {
    if (!typed.trim()) return;
    setAdding(true);
    try {
      await addByCode(typed);
      setTyped("");
      toast({ message: "Ajouté à ta bande", tone: "success" });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "";
      toast({ message: msg.includes("own") ? "C'est ton propre code." : "Code introuvable.", tone: "error" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <SettingsShell
      title="Ta bande"
      subtitle="Tes potes de voyage, prêts à être embarqués dans le prochain en un geste."
    >
      <StaggerItem>
        <section className="rounded-[1.5rem] bg-card p-5 shadow-card">
          <p className="text-sm font-semibold text-muted-foreground">Ton code</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="tabular font-display text-[1.9rem] leading-none font-extrabold tracking-[0.12em]">
              {code ?? "········"}
            </p>
            <button
              type="button"
              disabled={!code}
              onClick={async () => {
                await navigator.clipboard.writeText(url).catch(() => null);
                toast({ message: "Lien copié", tone: "success" });
              }}
              aria-label="Copier mon lien"
              className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-foreground/[0.08]"
            >
              <Copy size={18} />
            </button>
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={share} disabled={!code}>
            <Share2 size={18} />
            Inviter dans ma bande
          </Button>
          <div className="mt-3 flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void addTyped()}
              placeholder="Code d'un pote"
              maxLength={8}
              autoCapitalize="characters"
              spellCheck={false}
              aria-label="Code d'un pote"
              className="tabular h-12 min-w-0 flex-1 rounded-full bg-secondary px-5 text-base tracking-[0.08em] outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <Button variant="secondary" size="lg" className="h-12 shrink-0 px-5" onClick={addTyped} disabled={adding || typed.trim().length < 4}>
              {adding ? <Loader2 size={18} className="animate-spin" /> : "Ajouter"}
            </Button>
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        {friends.length > 0 ? (
          <SettingsGroup title={`${friends.length} pote${friends.length > 1 ? "s" : ""}`}>
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOpen(f)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
              >
                <UserAvatar src={f.avatar} name={f.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.name ?? "Sans nom"}</span>
                  <span className="block truncate text-sm text-muted-foreground">{together(f)}</span>
                </span>
              </button>
            ))}
          </SettingsGroup>
        ) : (
          !loading && (
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-foreground/20 px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <UsersRound size={22} />
              </span>
              <p className="font-display text-lg font-bold tracking-tight">Ta bande est vide</p>
              <p className="text-sm text-muted-foreground">
                Les gens avec qui tu partages un voyage y apparaissent tout seuls. Tu peux aussi envoyer ton lien.
              </p>
            </div>
          )
        )}
      </StaggerItem>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className="p-0" style={{ maxHeight: "70dvh" }}>
          {open && (
            <div className="flex flex-col items-center px-5 pt-10 pb-6 text-center">
              <UserAvatar src={open.avatar} name={open.name} size={84} />
              <SheetTitle className="mt-4">{open.name ?? "Sans nom"}</SheetTitle>
              <p className="mt-1 text-sm text-muted-foreground">{together(open)}</p>
              <div className="mt-6 w-full space-y-2">
                <Link href={`/trips/new?with=${open.id}`} className={buttonVariants({ size: "lg", className: "w-full" })}>
                  <TrainFront size={18} />
                  Créer un voyage ensemble
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const f = open;
                    setOpen(null);
                    await remove(f.id);
                    toast({ message: `${f.name?.split(" ")[0] ?? "Ce pote"} n'est plus dans ta bande` });
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.95rem] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <UserMinus size={17} />
                  Retirer de ma bande
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SettingsShell>
  );
}
