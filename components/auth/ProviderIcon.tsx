import { FacebookIcon } from "@/components/auth/FacebookIcon";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import type { AuthProvider } from "@/lib/auth/providers";

/** Composants stables (utilisables comme `icon` d'une rangée de réglages). */
export const PROVIDER_ICONS: Record<AuthProvider, React.ComponentType<{ size?: number }>> = {
  google: GoogleIcon,
  facebook: FacebookIcon,
};

export function ProviderIcon({ provider, size = 20 }: { provider: AuthProvider; size?: number }) {
  const Icon = PROVIDER_ICONS[provider];
  return <Icon size={size} />;
}
