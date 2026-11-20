import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripAppHeader } from "@/components/layout/TripAppHeader";
import { TripNav } from "@/components/layout/TripNav";
import { TripClientProviders } from "@/components/layout/TripClientProviders";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { PageSkeleton } from "@/components/shared/Skeleton";

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { tripId } = await params;

  return (
    <TripClientProviders>
      <MeshGradientBackground />
      <ClientOnly fallback={<div className="mx-auto w-full max-w-3xl px-4 pt-16"><PageSkeleton /></div>}>
      <div className="min-h-screen flex flex-col">
        <TripAppHeader tripId={tripId} />
        <main
          className="flex-1 max-w-3xl w-full mx-auto px-4"
          style={{
            paddingTop: "0.25rem",
            paddingBottom: "calc(var(--bottom-nav-top) + 2rem)",
          }}
        >
          {children}
        </main>
        <TripNav tripId={tripId} />
      </div>
      </ClientOnly>
    </TripClientProviders>
  );
}
