import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripAppHeader } from "@/components/layout/TripAppHeader";
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
        <TripAppHeader tripId={tripId} />
        <main
          className="flex-1 max-w-3xl w-full mx-auto px-4"
          style={{
            paddingTop: "1.25rem",
            paddingBottom: "calc(var(--bottom-nav-top) + 1.5rem)",
          }}
        >
          {children}
        </main>
        <TripNav tripId={tripId} tripType={tripType} />
      </div>
    </>
  );
}
