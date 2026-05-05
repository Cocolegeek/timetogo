"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plane, AlertCircle, Loader2 } from "lucide-react";
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
  const [isJoining, setIsJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!code) { setError("Lien invalide ou incomplet."); return; }

    const load = async () => {
      const supabase = createClient();

      const { data: trip } = await supabase
        .from("trips")
        .select("id, name, destination, emoji, currency, start_date, end_date, share_code")
        .eq("share_code", code)
        .single();

      if (!trip) { setError("Aucun voyage trouvé avec ce code."); return; }

      const { data: participants } = await supabase
        .from("participants")
        .select("id, name, color, avatar")
        .eq("trip_id", trip.id)
        .order("created_at");

      // Check if already a member
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("trip_members")
          .select("trip_id")
          .eq("trip_id", trip.id)
          .eq("user_id", user.id)
          .single();
        if (membership) { setAlreadyMember(true); router.replace(`/trips/${trip.id}`); return; }
      }

      setTripPreview({
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        emoji: trip.emoji,
        currency: trip.currency,
        startDate: trip.start_date,
        endDate: trip.end_date,
        shareCode: trip.share_code,
        participants: (participants ?? []).map((p) => ({
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
    if (!tripPreview || !selectedParticipantId) return;
    setIsJoining(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("trip_members").insert({
        trip_id: tripPreview.id,
        user_id: user.id,
        participant_id: selectedParticipantId,
        role: "contributor",
      });

      router.push(`/trips/${tripPreview.id}`);
    } catch {
      setError("Impossible de rejoindre le voyage. Réessaie.");
      setIsJoining(false);
    }
  };

  if (alreadyMember) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
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
          className="mt-2 bg-white/8 hover:bg-white/12 text-slate-300 border border-white/10"
        >
          Retour à l'accueil
        </Button>
      </GlassCard>
    );
  }

  if (!tripPreview) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
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
              <p className="text-slate-400 text-sm mt-0.5">
                {tripPreview.destination} · {duration} jours ·{" "}
                {tripPreview.participants.length} voyageur
                {tripPreview.participants.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(tripPreview.startDate).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}{" "}→{" "}
                {new Date(tripPreview.endDate).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
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
          <p className="text-xs text-slate-500 mb-3">
            Qui es-tu parmi les participants ?
          </p>
          <IdentityPicker
            participants={tripPreview.participants}
            selectedId={selectedParticipantId}
            onSelect={setSelectedParticipantId}
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
              <Plane size={18} />
              Rejoindre le voyage
            </>
          )}
        </Button>
        {!selectedParticipantId && (
          <p className="text-center text-xs text-slate-500 mt-2">
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
        <header className="glass-strong border-b border-white/8">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <h1 className="font-bold text-slate-100">Time to Go</h1>
              <p className="text-xs text-slate-500">Rejoindre un voyage</p>
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-indigo-400" />
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
