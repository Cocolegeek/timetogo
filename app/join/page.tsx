"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { m as motion } from "framer-motion";
import { AlertCircle, Loader2, ArrowRight, Home } from "lucide-react";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { TripCover } from "@/components/trips/TripCover";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { formatDateRange } from "@/lib/format-date";
import { EASE_OUT } from "@/lib/motion";
import { IdentityPicker } from "@/components/trips/IdentityPicker";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { syncMyParticipantAvatars } from "@/lib/avatar-sync";
import type { Participant } from "@/types";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";
import { notify } from "@/lib/notifications/notify";
import { bootInitial } from "@/lib/boot";

interface TripPreview {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  currency: string;
  startDate: string;
  endDate: string;
  shareCode: string;
  type: "trip" | "group";
  participants: Participant[];
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code")?.toUpperCase();

  const [tripPreview, setTripPreview] = useState<TripPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [pendingNewName, setPendingNewName] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Lien invalide ou incomplet.");
      setAuthChecked(true);
      return;
    }

    const load = async () => {
      const supabase = createClient();

      const { data: preview, error: rpcError } = await supabase
        .rpc("get_join_preview", { p_code: code });

      if (rpcError || !preview) {
        setError("Aucun voyage trouvé avec ce code.");
        setAuthChecked(true);
        return;
      }

      const trip = preview as {
        id: string;
        name: string;
        destination: string | null;
        emoji: string;
        currency: string;
        start_date: string | null;
        end_date: string | null;
        share_code: string;
        type: "trip" | "group";
        participants: { id: string; name: string; color: string; avatar: string | null }[];
      };

      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthed(!!user);

      if (user) {
        const { data: membership } = await supabase
          .from("trip_members")
          .select("trip_id")
          .eq("trip_id", trip.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          setTripPreview({
            id: trip.id,
            name: trip.name,
            destination: trip.destination ?? "",
            emoji: trip.emoji,
            currency: trip.currency,
            startDate: trip.start_date ?? "",
            endDate: trip.end_date ?? "",
            shareCode: trip.share_code,
            type: trip.type,
            participants: [],
          });
          setAlreadyMember(true);
          setAuthChecked(true);
          return;
        }
      }

      setTripPreview({
        id: trip.id,
        name: trip.name,
        destination: trip.destination ?? "",
        emoji: trip.emoji,
        currency: trip.currency,
        startDate: trip.start_date ?? "",
        endDate: trip.end_date ?? "",
        shareCode: trip.share_code,
        type: trip.type,
        participants: (trip.participants ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          avatar: p.avatar ?? undefined,
        })),
      });
      setAuthChecked(true);
    };

    load().catch(() => {
      setError("Erreur lors du chargement du voyage.");
      setAuthChecked(true);
    });
  }, [code]);

  const handleJoin = async () => {
    if (!tripPreview || !code) return;
    if (!isAuthed) {
      router.push(`/login?redirect_to=${encodeURIComponent(`/join?code=${code}`)}`);
      return;
    }
    if (!selectedParticipantId && !pendingNewName) return;
    setIsJoining(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("join_trip", {
        p_code: code,
        p_participant_id: pendingNewName ? null : selectedParticipantId,
        p_new_participant_name: pendingNewName,
        p_new_participant_color: null,
      });
      if (rpcError) throw rpcError;
      await syncMyParticipantAvatars();
      notify({ event: "trip_joined", tripId: tripPreview.id });
      router.push(`/trips/${tripPreview.id}`);
    } catch {
      setError("Impossible de rejoindre l'aventure. Réessaie.");
      setIsJoining(false);
    }
  };

  const stashNewParticipant = async (name: string) => {
    const color =
      PARTICIPANT_COLORS[(tripPreview?.participants.length ?? 0) % PARTICIPANT_COLORS.length];
    const synthetic: Participant = { id: `__pending__${Date.now()}`, name, color };
    setPendingNewName(name);
    if (tripPreview) {
      setTripPreview({
        ...tripPreview,
        participants: [...tripPreview.participants, synthetic],
      });
    }
    return synthetic;
  };

  // ─── Loading ──────────────────────────────────────────────
  if (!authChecked) {
    return (
      <PageSkeleton />
    );
  }

  // ─── Error: invalid link ──────────────────────────────────
  if (error) {
    return <InvalidLinkCard message={error} onHome={() => router.push("/trips")} />;
  }

  if (!tripPreview) return null;

  // ─── Already a member: friendly modal ─────────────────────
  if (alreadyMember) {
    return (
      <AlreadyMemberCard
        trip={tripPreview}
        onAccess={() =>
          router.push(
            tripPreview.type === "group"
              ? `/trips/${tripPreview.id}/budget`
              : `/trips/${tripPreview.id}`,
          )
        }
        onHome={() => router.push("/trips")}
      />
    );
  }

  // ─── New member: welcome flow ─────────────────────────────
  return (
    <WelcomeFlow
      trip={tripPreview}
      isAuthed={isAuthed}
      selectedParticipantId={selectedParticipantId}
      pendingNewName={pendingNewName}
      isJoining={isJoining}
      onSelect={(id) => {
        setSelectedParticipantId(id);
        if (!id.startsWith("__pending__")) setPendingNewName(null);
      }}
      onCreate={stashNewParticipant}
      onJoin={handleJoin}
    />
  );
}

// ─── Invalid link card ──────────────────────────────────────
function InvalidLinkCard({ message, onHome }: { message: string; onHome: () => void }) {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-4 px-4 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-[1.25rem] bg-red-500/12 text-red-400">
        <AlertCircle size={28} />
      </span>
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Oups, lien cassé</h1>
        <p className="mx-auto max-w-xs text-[0.95rem] leading-relaxed text-muted-foreground">{message}</p>
      </div>
      <Button variant="secondary" size="lg" onClick={onHome} className="mt-2">
        <Home size={17} />
        Retour à l&apos;accueil
      </Button>
    </div>
  );
}

function TripHero({ trip, badge }: { trip: TripPreview; badge: string }) {
  return (
    <motion.div
      initial={bootInitial({ opacity: 0, y: 16, scale: 0.98 })}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="relative overflow-hidden rounded-[1.75rem] shadow-raised"
    >
      <TripCover seed={trip.id} className="h-44" />
      <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[0.8125rem] font-semibold text-[#1A1D24] shadow-card backdrop-blur">
        {badge}
      </span>
    </motion.div>
  );
}

function tripMeta(trip: TripPreview): string {
  const n = trip.participants.length;
  const people = `${n} ${trip.type === "group" ? "participant" : "voyageur"}${n !== 1 ? "s" : ""}`;
  if (trip.startDate && trip.endDate) return `${formatDateRange(trip.startDate, trip.endDate)} · ${people}`;
  return people;
}

// ─── Already member card ───────────────────────────────────
function AlreadyMemberCard({
  trip,
  onAccess,
  onHome,
}: {
  trip: TripPreview;
  onAccess: () => void;
  onHome: () => void;
}) {
  const entityLabel = trip.type === "group" ? "ce groupe" : "ce voyage";
  return (
    <div className="space-y-6">
      <TripHero trip={trip} badge="Déjà dans la bande" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.12 }}
        className="space-y-5 px-1"
      >
        <div>
          <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">{trip.name}</h1>
          <p className="mt-1.5 text-[0.95rem] text-muted-foreground">
            Tu fais déjà partie de {entityLabel}, pas besoin de le rejoindre à nouveau.
          </p>
        </div>
        <div className="space-y-2">
          <Button size="lg" onClick={onAccess} className="w-full shadow-section">
            Ouvrir {entityLabel}
            <ArrowRight size={18} />
          </Button>
          <Button variant="ghost" size="lg" onClick={onHome} className="w-full text-muted-foreground">
            Retour à l&apos;accueil
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Welcome flow (new member) ─────────────────────────────
function WelcomeFlow({
  trip,
  isAuthed,
  selectedParticipantId,
  pendingNewName,
  isJoining,
  onSelect,
  onCreate,
  onJoin,
}: {
  trip: TripPreview;
  isAuthed: boolean;
  selectedParticipantId: string | null;
  pendingNewName: string | null;
  isJoining: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<Participant>;
  onJoin: () => void;
}) {
  const entityLabel = trip.type === "group" ? "ce groupe" : "ce voyage";

  return (
    <div className="space-y-6">
      <TripHero trip={trip} badge="Tu es invité" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.12 }}
        className="px-1"
      >
        <p className="text-sm font-medium text-muted-foreground">Bienvenue dans</p>
        <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">{trip.name}</h1>
        <p className="mt-1.5 text-[0.95rem] text-muted-foreground">{tripMeta(trip)}</p>
        {trip.participants.length > 0 && (
          <ParticipantStack participants={trip.participants} size="md" max={6} showLabel={false} className="mt-4" />
        )}
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.22 }}
        className="rounded-[1.75rem] bg-card p-5 shadow-card"
      >
        {!isAuthed ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Connecte-toi pour rejoindre</h2>
              <p className="mt-1 text-[0.95rem] text-muted-foreground">
                Avec ton compte Google, en quelques secondes. Tu retrouveras ensuite {entityLabel} dans tes voyages.
              </p>
            </div>
            <Button size="lg" onClick={onJoin} className="w-full shadow-section">
              Continuer avec Google
              <ArrowRight size={18} />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Qui es-tu dans la bande ?</h2>
              <p className="mt-1 text-[0.95rem] text-muted-foreground">
                Choisis ton nom, ou ajoute-toi si tu n&apos;es pas encore dans la liste.
              </p>
            </div>
            <IdentityPicker
              participants={trip.participants}
              selectedId={selectedParticipantId}
              onSelect={onSelect}
              onCreate={onCreate}
            />
            <Button
              size="lg"
              onClick={onJoin}
              disabled={(!selectedParticipantId && !pendingNewName) || isJoining}
              className="w-full shadow-section disabled:shadow-none"
            >
              {isJoining ? <Loader2 size={18} className="animate-spin" /> : <>Rejoindre {entityLabel}</>}
            </Button>
          </div>
        )}
      </motion.section>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-md items-center px-5">
          <VoyouLogo size={32} wordmark />
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 pt-2 pb-10">
        <Suspense fallback={<PageSkeleton />}>
          <JoinContent />
        </Suspense>
      </main>
    </div>
  );
}
