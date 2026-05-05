import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripWizard } from "@/components/trips/TripWizard";

export default function NewTripPage() {
  return (
    <>
      <MeshGradientBackground />

      <div className="min-h-screen">
        <header className="glass-strong border-b border-white/8 sticky top-0 z-40">
          <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link
              href="/trips"
              className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-slate-200 transition-all"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-semibold text-slate-100">Nouveau voyage</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-6">
          <TripWizard />
        </main>
      </div>
    </>
  );
}
