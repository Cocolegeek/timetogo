"use client";

import { useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/motion";

const BUILDINGS = [
  { x: 26, y: 214, w: 54, h: 150, fill: "#1C1840" },
  { x: 88, y: 250, w: 62, h: 114, fill: "#DCD9FF" },
  { x: 158, y: 196, w: 50, h: 168, fill: "#FFFFFF" },
  { x: 216, y: 238, w: 70, h: 126, fill: "#1C1840" },
  { x: 294, y: 222, w: 52, h: 142, fill: "#DCD9FF" },
];

function LoginIllustration() {
  return (
    <div className="relative h-[46dvh] min-h-72 overflow-hidden bg-primary">
      <svg viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <motion.circle
          cx="292"
          r="66"
          fill="#FFC94D"
          initial={{ cy: 230 }}
          animate={{ cy: 136 }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        />
        {BUILDINGS.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x}
            width={b.w}
            height={b.h}
            rx="8"
            fill={b.fill}
            initial={{ y: 420 }}
            animate={{ y: b.y }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.07 }}
          />
        ))}
        <path
          d="M0 420V352Q70 322 140 352T280 352 390 340V420Z"
          style={{ fill: "var(--background)" }}
        />
      </svg>
      <div className="absolute left-6" style={{ top: "calc(env(safe-area-inset-top) + 1.75rem)" }}>
        <VoyouLogo size={40} wordmark fixed />
      </div>
    </div>
  );
}

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
    <div className="flex min-h-dvh flex-col bg-background">
      <LoginIllustration />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.35 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <h1 className="font-display text-[2.4rem] leading-[1.02] font-extrabold tracking-[-0.035em]">
          Les voyages entre potes, sans embrouilles.
        </h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
          Budget partagé, planning et menus au même endroit.
        </p>

        <div className="mt-auto pt-8">
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="ink"
            size="lg"
            className="w-full shadow-raised"
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
          <p className="mt-4 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
            En continuant, tu acceptes que tes données de voyage soient stockées de façon sécurisée.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
