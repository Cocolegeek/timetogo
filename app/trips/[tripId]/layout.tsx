import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripNav } from "@/components/layout/TripNav";
import { TripSwipeContainer } from "@/components/layout/TripSwipeContainer";

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
        <TripSwipeContainer
          tripId={tripId}
          className="flex-1 max-w-3xl w-full mx-auto px-4"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
          }}
        >
          {children}
        </TripSwipeContainer>
        <TripNav tripId={tripId} />
      </div>
    </>
  );
}
