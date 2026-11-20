import { PageTransition } from "@/components/motion/PageTransition";

export default function TripSectionTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
