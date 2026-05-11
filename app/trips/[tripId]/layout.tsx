import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripNav } from "@/components/layout/TripNav";
import { createClient } from "@/lib/supabase/server";
import type { TripType } from "@/types";

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("trips").select("type").eq("id", tripId).single();
  const tripType: TripType = (data?.type as TripType | undefined) ?? "trip";

  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen flex flex-col">
        <main
          className="flex-1 max-w-3xl w-full mx-auto px-4"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
          }}
        >
          {children}
        </main>
        <TripNav tripId={tripId} tripType={tripType} />
      </div>
    </>
  );
}
