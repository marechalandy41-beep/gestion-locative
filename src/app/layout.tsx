import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import OneSignalInit from "./components/OneSignalInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Google Ads - suivi des conversions */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-18366116287" strategy="afterInteractive" />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18366116287');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "Ma Gestion-Locative — Logiciel de gestion locative en ligne",
  description: "Gérez vos biens locatifs en toute simplicité. Baux conformes ALUR, quittances automatiques, états des lieux, connexion bancaire. Déductible de vos revenus fonciers.",
  keywords: "gestion locative, logiciel gestion locative, quittance de loyer, bail location, état des lieux, propriétaire bailleur, quittance automatique",
  manifest: '/manifest.json',
  openGraph: {
    title: "Ma Gestion-Locative — Logiciel de gestion locative en ligne",
    description: "Gérez vos biens locatifs en toute simplicité. Baux conformes ALUR, quittances automatiques, états des lieux, connexion bancaire.",
    url: "https://www.magestion-locative.fr",
    siteName: "Ma Gestion-Locative",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ma Gestion-Locative — Logiciel de gestion locative en ligne",
    description: "Gérez vos biens locatifs en toute simplicité. Baux conformes ALUR, quittances automatiques, états des lieux, connexion bancaire.",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
};