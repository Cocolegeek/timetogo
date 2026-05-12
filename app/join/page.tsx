"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  Home,
} from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { GlassCard } from "@/components/layout/GlassCard";
import { IdentityPicker } from "@/components/trips/IdentityPicker";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Participant } from "@/types";

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
      router.push(`/trips/${tripPreview.id}`);
    } catch {
      setError("Impossible de rejoindre l'aventure. Réessaie.");
      setIsJoining(false);
    }
  };

  const stashNewParticipant = async (name: string) => {
    const FALLBACK_COLORS = [
      "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
      "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
    ];
    const color =
      FALLBACK_COLORS[(tripPreview?.participants.length ?? 0) % FALLBACK_COLORS.length];
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
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-section" />
      </div>
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="text-center space-y-4 py-8">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-100">Oups, lien cassé</h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            {message}
          </p>
        </div>
        <Button
          onClick={onHome}
          className="mt-2 bg-foreground/8 hover:bg-foreground/12 text-slate-200 border border-foreground/10"
        >
          <Home size={15} />
          Retour à l&apos;accueil
        </Button>
      </GlassCard>
    </motion.div>
  );
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
  const entityLabel = trip.type === "group" ? "ce budget" : "ce voyage";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div
        className="relative overflow-hidden rounded-3xl p-6 shadow-section-strong"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
        }}
      >
        {/* Glossy top */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
          }}
        />
        {/* Orb */}
        <div
          className="absolute -top-16 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, oklch(1 0 0 / 24%), transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        <div className="relative text-center space-y-4">
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm"
          >
            <CheckCircle2 size={32} className="text-white" />
          </motion.div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">
              T&apos;es déjà dans la bande
            </p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              Hey toi ! 🎒
            </h2>
            <p className="text-base text-white/85 leading-snug max-w-xs mx-auto">
              Tu fais déjà partie de {entityLabel}.<br />
              Pas la peine de re-rejoindre, voyou 😎
            </p>
          </div>

          {/* Trip card */}
          <div className="bg-white/15 border border-white/20 rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
            <span className="text-3xl shrink-0">{trip.emoji}</span>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-white truncate">{trip.name}</p>
              {trip.type === "trip" && trip.destination && (
                <p className="text-sm text-white/70 truncate flex items-center gap-1">
                  <MapPin size={11} />
                  {trip.destination}
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={onAccess}
              className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold py-5 shadow-lg"
            >
              Accéder à l&apos;aventure
              <ArrowRight size={16} strokeWidth={2.5} />
            </Button>
            <button
              onClick={onHome}
              className="w-full text-sm text-white/70 hover:text-white py-2 transition-colors"
            >
              Plus tard, retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    </motion.div>
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
  const [showPicker, setShowPicker] = useState(false);
  const entityLabel = trip.type === "group" ? "budget" : "voyage";
  const duration =
    trip.startDate && trip.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : null;

  return (
    <div className="space-y-5">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-6 shadow-section-strong"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
          }}
        />
        <div
          className="absolute -top-16 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, oklch(1 0 0 / 24%), transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        <div className="relative space-y-4">
          <motion.div
            initial={{ scale: 0.5, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="flex items-center gap-2"
          >
            <Sparkles size={18} className="text-amber-200" />
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">
              Une invitation, voyou
            </p>
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Bienvenue dans
              <br />
              {trip.name} {trip.emoji}
            </h1>
            <p className="text-base text-white/85 leading-snug">
              On t&apos;attendait pour {trip.type === "group" ? "régler les comptes" : "partir à l'aventure"} ! 🎒
            </p>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {trip.type === "trip" && trip.destination && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-sm text-white">
                <MapPin size={11} />
                {trip.destination}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-sm text-white">
                <Calendar size={11} />
                {duration} jour{duration !== 1 ? "s" : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-sm text-white">
              <Users size={11} />
              {trip.participants.length}{" "}
              {trip.type === "group" ? "participant" : "voyageur"}
              {trip.participants.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Auth required */}
      {!isAuthed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Pour rejoindre {entityLabel === "voyage" ? "ce voyage" : "ce budget"},
              connecte-toi avec ton compte Google. Ça prend 3 secondes.
            </p>
            <Button
              onClick={onJoin}
              className="w-full gradient-primary text-white border-0 py-5 font-semibold"
            >
              <Compass size={16} />
              Me connecter pour rejoindre
            </Button>
          </GlassCard>
        </motion.div>
      )}

      {/* Identity picker (authed) */}
      {isAuthed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard>
            <AnimatePresence mode="wait">
              {!showPicker ? (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-base text-slate-200 font-semibold">
                    Prêt à rejoindre ? 👀
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Choisis qui tu es parmi les {trip.participants.length}{" "}
                    {trip.type === "group" ? "participant" : "voyageur"}
                    {trip.participants.length !== 1 ? "s" : ""} — ou ajoute-toi
                    si tu n&apos;es pas encore dans la liste.
                  </p>
                  <Button
                    onClick={() => setShowPicker(true)}
                    className="w-full gradient-primary text-white border-0 py-5 font-semibold"
                  >
                    Choisir mon identité
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="picker"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-base text-slate-200 font-semibold">
                    Qui es-tu, voyou ? 😎
                  </p>
                  <IdentityPicker
                    participants={trip.participants}
                    selectedId={selectedParticipantId}
                    onSelect={onSelect}
                    onCreate={onCreate}
                  />
                  <Button
                    onClick={onJoin}
                    disabled={(!selectedParticipantId && !pendingNewName) || isJoining}
                    className="w-full gradient-primary text-white border-0 py-5 font-semibold disabled:opacity-40"
                  >
                    {isJoining ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Compass size={16} />
                        Rejoindre l&apos;aventure
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen">
        <header className="glass-strong border-b border-foreground/8 sticky top-0 z-40">
          <div
            className="max-w-md mx-auto px-4 py-4 flex items-center gap-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
          >
            <h1 className="text-xl font-bold gradient-text leading-none">Voyou</h1>
            <p className="text-sm text-slate-500 ml-auto">Rejoindre une aventure</p>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-section" />
              </div>
            }
          >
            <JoinContent />
          </Suspense>
        </main>
      </div>
    </>
  );
}
