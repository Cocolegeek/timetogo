"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
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
    <div className="flex min-h-dvh flex-col">
      <div className="relative h-[42dvh] min-h-64 bg-[#F6B84B]">
        <svg
          viewBox="0 0 390 420"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle cx="290" cy="130" r="74" fill="#D83B1E" />
          <path d="M0 420V300Q60 260 120 300T240 300 390 280V420Z" fill="#1A1A1A" />
          <rect x="36" y="200" width="56" height="130" rx="4" fill="#1A1A1A" />
          <rect x="100" y="236" width="64" height="94" rx="4" fill="#D83B1E" />
          <rect x="172" y="184" width="50" height="146" rx="4" fill="#FAF7F2" stroke="#1A1A1A" strokeWidth="3" />
          <path d="M0 420V350Q70 320 140 350T280 350 390 336V420Z" style={{ fill: "var(--background)" }} />
        </svg>
        <div
          className="absolute left-6"
          style={{ top: "calc(env(safe-area-inset-top) + 2rem)" }}
        >
          <VoyouLogo size={40} wordmark fixed />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-7"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">
          Les voyages entre potes, sans embrouilles.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          Budget partagé, planning et menus au même endroit.
        </p>

        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          variant="ink"
          size="lg"
          className="mt-auto w-full"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continuer avec Google
        </Button>
        <p className="mt-4 text-center text-[13px] leading-relaxed text-slate-500">
          En continuant, tu acceptes que tes données de voyage soient stockées
          de façon sécurisée.
        </p>
      </motion.div>
    </div>
  );
}

function LoginFallback() {
  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
