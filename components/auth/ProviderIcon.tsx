import { FacebookIcon } from "@/components/auth/FacebookIcon";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Mail } from "lucide-react";
import type { AccountMethod, AuthProvider } from "@/lib/auth/providers";

/** Composants stables (utilisables comme `icon` d'une rangée de réglages). */
export const PROVIDER_ICONS: Record<AuthProvider, React.ComponentType<{ size?: number }>> = {
  google: GoogleIcon,
  facebook: FacebookIcon,
};

/** Idem, pour tous les moyens de connexion d'un compte (e-mail compris). */
export const METHOD_ICONS: Record<AccountMethod, React.ComponentType<{ size?: number }>> = {
  ...PROVIDER_ICONS,
  email: Mail,
};

export function ProviderIcon({ provider, size = 20 }: { provider: AuthProvider; size?: number }) {
  const Icon = PROVIDER_ICONS[provider];
  return <Icon size={size} />;
}
