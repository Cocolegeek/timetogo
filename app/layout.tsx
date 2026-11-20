import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Geist_Mono } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import { AppInstallBanner } from "@/components/shared/IosInstallBanner";
import { SectionThemeController } from "@/components/layout/SectionThemeController";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { ToastProvider } from "@/components/shared/Toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voyou.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Voyou — Ton complice de voyage",
    template: "%s · Voyou",
  },
  description: "Budget partagé, planning et menus — pour des voyages entre potes sans embrouilles.",
  manifest: "/manifest.json",
  applicationName: "Voyou",
  appleWebApp: {
    capable: true,
    title: "Voyou",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon.png",
    apple: [{ url: "/icons/icon.png", sizes: "512x512" }],
    shortcut: "/icons/icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Voyou",
    title: "Voyou — Rejoins la bande",
    description: "Budget, planning, menus — voyages entre potes sans embrouilles.",
    locale: "fr_FR",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyou — Rejoins la bande",
    description: "Budget, planning, menus — voyages entre potes sans embrouilles.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#141318" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

const themeScript = `
  (function() {
    try {
      var t = null;
      try { t = localStorage.getItem('voyou-theme'); } catch (e) {}
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var apply = function () {
        var dark = t === 'dark' || (t !== 'light' && mq.matches);
        document.documentElement.classList.toggle('dark', dark);
      };
      apply();
      if (t !== 'light' && t !== 'dark') mq.addEventListener('change', apply);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${bricolage.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SectionThemeController />
        <PwaRegister />
        <AppInstallBanner />
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
