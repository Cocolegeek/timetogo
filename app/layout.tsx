import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import { AppInstallBanner } from "@/components/shared/IosInstallBanner";
import { SectionThemeController } from "@/components/layout/SectionThemeController";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    title: "Voyou — Ton complice de voyage",
    description: "Budget partagé, planning et menus — pour des voyages entre potes sans embrouilles.",
    locale: "fr_FR",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyou — Ton complice de voyage",
    description: "Budget partagé, planning et menus — pour des voyages entre potes sans embrouilles.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
};

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('voyou-theme') || localStorage.getItem('time-to-go-theme');
      if (t === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SectionThemeController />
        <PwaRegister />
        <AppInstallBanner />
        {children}
      </body>
    </html>
  );
}
