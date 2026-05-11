"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, AlertCircle, Loader2 } from "lucide-react";
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
  participants: Participant[];
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code")?.toUpperCase();

  const [tripPreview, setTripPreview] = useState<TripPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  /**
   * Local-only marker: when the user creates a brand-new participant via
   * the picker's "Je ne suis pas dans la liste" flow, we keep their name
   * here so the actual creation happens atomically inside join_trip RPC
   * (the user isn't a member yet, so direct INSERT on participants is RLS-blocked).
   */
  const [pendingNewName, setPendingNewName] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!code) { setError("Lien invalide ou incomplet."); return; }

    const load = async () => {
      const supabase = createClient();

      // Single RPC: returns trip + participants only for matching share_code.
      // Backed by SECURITY DEFINER function (see migration 011) so we don't
      // need broad SELECT policies on trips/participants.
      const { data: preview, error: rpcError } = await supabase
        .rpc("get_join_preview", { p_code: code });

      if (rpcError || !preview) {
        setError("Aucun voyage trouvé avec ce code.");
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

      // Check if already a member (RLS on trip_members handles auth)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("trip_members")
          .select("trip_id")
          .eq("trip_id", trip.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) { setAlreadyMember(true); router.replace(`/trips/${trip.id}`); return; }
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
        participants: (trip.participants ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          avatar: p.avatar ?? undefined,
        })),
      });
    };

    load().catch(() => setError("Erreur lors du chargement du voyage."));
  }, [code, router]);

  const handleJoin = async () => {
    if (!tripPreview || !code) return;
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
      setError("Impossible de rejoindre le voyage. Réessaie.");
      setIsJoining(false);
    }
  };

  /**
   * Called when the user opts to create a new participant from the picker.
   * Since they're not a member yet, we can't INSERT directly — RLS would block.
   * Instead we stash the name locally; the join_trip RPC will create the
   * participant atomically when the user confirms.
   *
   * We return a synthetic Participant so the picker can immediately show it
   * as selected. The synthetic id is replaced server-side when join_trip runs.
   */
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

  if (alreadyMember) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-section" />
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <p className="text-slate-200 font-medium">Lien invalide</p>
        <p className="text-sm text-slate-500">{error}</p>
        <Button
          onClick={() => router.push("/trips")}
          className="mt-2 bg-foreground/8 hover:bg-foreground/12 text-slate-300 border border-foreground/10"
        >
          Retour à l'accueil
        </Button>
      </GlassCard>
    );
  }

  if (!tripPreview) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-section" />
      </div>
    );
  }

  const duration = Math.round(
    (new Date(tripPreview.endDate).getTime() - new Date(tripPreview.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Trip preview */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard>
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0">{tripPreview.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{tripPreview.name}</h2>
              <p className="text-slate-400 text-base mt-1">
                {tripPreview.destination}
              </p>
              <p className="text-base text-slate-500 mt-1.5">
                {new Date(tripPreview.startDate).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long",
                })}{" "}→{" "}
                {new Date(tripPreview.endDate).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}{" "}
                · {duration} jours · {tripPreview.participants.length} voyageur
                {tripPreview.participants.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Identity picker */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard>
          <p className="text-base text-slate-300 font-semibold mb-3">
            Qui es-tu parmi les participants ?
          </p>
          <IdentityPicker
            participants={tripPreview.participants}
            selectedId={selectedParticipantId}
            onSelect={(id) => {
              setSelectedParticipantId(id);
              // If user picks one of the existing (non-pending) participants,
              // clear any pending creation.
              if (!id.startsWith("__pending__")) setPendingNewName(null);
            }}
            onCreate={stashNewParticipant}
          />
        </GlassCard>
      </motion.div>

      {/* Join button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Button
          onClick={handleJoin}
          disabled={!selectedParticipantId || isJoining}
          className="w-full gradient-primary text-white border-0 py-6 text-base font-semibold disabled:opacity-40"
        >
          {isJoining ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Compass size={18} />
              Rejoindre le voyage
            </>
          )}
        </Button>
        {!selectedParticipantId && (
          <p className="text-center text-sm text-slate-500 mt-2">
            Sélectionne ton identité pour continuer
          </p>
        )}
      </motion.div>
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
            <span className="text-2xl">✈️</span>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Time to Go</h1>
              <p className="text-sm text-slate-500">Rejoindre un voyage</p>
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8">
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
