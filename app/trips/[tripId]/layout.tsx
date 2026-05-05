import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripNav } from "@/components/layout/TripNav";

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { tripId } = await params;

  return (
    <>
      <MeshGradientBackground />
      <div className="min-h-screen flex flex-col">
        <main
          className="flex-1 max-w-3xl w-full mx-auto px-4 pt-5 pb-28"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
        >
          {children}
        </main>
        <TripNav tripId={tripId} />
      </div>
    </>
  );
}
