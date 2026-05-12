"use client";

import { useState } from "react";
import { Loader2, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") ?? "/trips";

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-section-soft flex items-center justify-center mx-auto">
            <Compass size={32} className="text-section" />
          </div>
          <div>
            <VoyouLogo />
            <p className="text-base text-slate-400 mt-1">
              Planifie, partage et gère tes voyages
            </p>
          </div>
        </div>

        <div className="border-t border-foreground/8" />

        {/* Sign in */}
        <div className="space-y-3">
          <p className="text-sm text-slate-500 text-center">
            Connecte-toi pour accéder à tes voyages
          </p>
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 border-0 font-medium gap-3 py-5"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continuer avec Google
          </Button>
        </div>

        <p className="text-sm text-slate-600 text-center leading-relaxed">
          En continuant, tu acceptes que tes données de voyage soient stockées
          de façon sécurisée.
        </p>
      </GlassCard>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
