import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaRegister } from "./pwa-register";
import { LazyInstallBanner } from "@/components/shared/LazyInstallBanner";
import { SectionThemeController } from "@/components/layout/SectionThemeController";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { OfflineSync } from "@/components/shared/OfflineSync";
import { ToastProvider } from "@/components/shared/Toaster";
import { DataProvider } from "@/lib/data/swr";
import "./globals.css";

// Polices hébergées dans le projet (app/fonts) : la compilation ne dépend plus d'un téléchargement chez Google.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const bricolage = localFont({
  src: "./fonts/bricolage-latin.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

// Only used to display an IBAN: not worth a preload on every launch.
const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voyou.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Voyou · Ton complice de voyage",
    template: "%s · Voyou",
  },
  description: "Budget partagé, planning et menus pour des voyages entre potes sans embrouilles.",
  manifest: "/manifest.json",
  applicationName: "Voyou",
  appleWebApp: {
    capable: true,
    title: "Voyou",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/icons/favicon-32.png",
  },
  openGraph: {
    type: "website",
    siteName: "Voyou",
    title: "Voyou · Rejoins la bande",
    description: "Budget, planning, menus : voyages entre potes sans embrouilles.",
    locale: "fr_FR",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyou · Rejoins la bande",
    description: "Budget, planning, menus : voyages entre potes sans embrouilles.",
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
      try { if (localStorage.getItem('voyou-motion') === 'reduced') document.documentElement.classList.add('reduce-motion'); } catch (e) {}
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
        <LazyInstallBanner />
        <MotionProvider>
          <DataProvider>
            <ToastProvider>
              {children}
              <OfflineSync />
            </ToastProvider>
          </DataProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
