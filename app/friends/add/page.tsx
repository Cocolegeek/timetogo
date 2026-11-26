"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { m as motion } from "framer-motion";
import { Check, Loader2, TrainFront, TriangleAlert } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { previewFriend, useFriends, type FriendPreview } from "@/hooks/useFriends";
import { EASE_OUT } from "@/lib/motion";

function AddFriend() {
  const code = useSearchParams().get("code") ?? "";
  const { addByCode } = useFriends();
  const [preview, setPreview] = useState<FriendPreview | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "adding" | "done" | "error">("idle");

  useEffect(() => {
    let alive = true;
    previewFriend(code)
      .then((p) => alive && setPreview(p))
      .catch(() => alive && setPreview(null));
    return () => {
      alive = false;
    };
  }, [code]);

  if (preview === undefined) return <div className="px-6 pt-16"><PageSkeleton /></div>;

  const first = preview?.name?.split(" ")[0] ?? "Ce pote";
  const done = state === "done" || !!preview?.already;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-6 text-center"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 5rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
    >
      {!preview || preview.is_me ? (
        <>
          <span className="flex size-16 items-center justify-center rounded-[1.25rem] bg-foreground/[0.06] text-foreground">
            <TriangleAlert size={28} />
          </span>
          <h1 className="mt-6 font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
            {preview?.is_me ? "C'est ton propre lien" : "Lien introuvable"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {preview?.is_me ? "Envoie-le à tes potes pour qu'ils t'ajoutent." : "Demande à ton pote de te renvoyer son lien depuis Réglages › Ta bande."}
          </p>
          <Link href="/trips" className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-auto w-full" })}>
            Retour à mes voyages
          </Link>
        </>
      ) : (
        <>
          <div className="relative">
            <UserAvatar src={preview.avatar} name={preview.name} size={112} />
            {done && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="absolute -right-1 -bottom-1 flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-background"
              >
                <Check size={20} strokeWidth={3} />
              </motion.span>
            )}
          </div>
          <h1 className="mt-6 font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
            {done ? `${first} est dans ta bande` : `${first} t'invite dans sa bande`}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {done
              ? "Au prochain voyage, ajoute-le en un geste : le voyage apparaîtra directement chez lui."
              : "Vous vous retrouverez facilement pour vos prochains voyages et budgets partagés."}
          </p>
          <div className="mt-auto w-full space-y-2 pt-10">
            {done ? (
              <>
                <Link href={`/trips/new?with=${preview.id}`} className={buttonVariants({ size: "lg", className: "w-full" })}>
                  <TrainFront size={18} />
                  Créer un voyage ensemble
                </Link>
                <Link href="/settings/friends" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
                  Voir ma bande
                </Link>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={state === "adding"}
                  onClick={async () => {
                    setState("adding");
                    try {
                      await addByCode(code);
                      setState("done");
                    } catch {
                      setState("error");
                    }
                  }}
                >
                  {state === "adding" ? <Loader2 size={18} className="animate-spin" /> : "Ajouter à ma bande"}
                </Button>
                {state === "error" && <p className="text-sm text-red-400">Ça n&apos;a pas marché, réessaie.</p>}
                <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
                  Plus tard
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function AddFriendPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense fallback={<div className="px-6 pt-16"><PageSkeleton /></div>}>
        <AddFriend />
      </Suspense>
    </div>
  );
}
