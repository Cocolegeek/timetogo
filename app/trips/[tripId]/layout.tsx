import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripAppHeader } from "@/components/layout/TripAppHeader";
import { TripNav } from "@/components/layout/TripNav";
import { TripClientProviders } from "@/components/layout/TripClientProviders";
import { TripMain } from "@/components/layout/TripMain";
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
      <div className="flex min-h-screen flex-col lg:pl-64">
        <TripAppHeader tripId={tripId} />
        <TripMain tripId={tripId}>{children}</TripMain>
        <TripNav tripId={tripId} />
      </div>
      </ClientOnly>
    </TripClientProviders>
  );
}
