import { PageTransition } from "@/components/motion/PageTransition";

export default function TripsTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
