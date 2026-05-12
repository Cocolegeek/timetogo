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
  title: "Voyou",
  description: "Ton complice de voyage — Budget, Planning, Menus",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Voyou",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
    shortcut: "/pwa-icon?size=192",
  },
  openGraph: {
    title: "Voyou",
    description: "Ton complice de voyage — Budget, Planning, Menus",
    url: siteUrl,
    siteName: "Voyou",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyou",
    description: "Ton complice de voyage — Budget, Planning, Menus",
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
