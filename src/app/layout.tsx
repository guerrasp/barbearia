import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Korta — Agendamento para barbearias",
  description: "Korta: seu horário na barbearia em poucos toques. Sem ligação, sem fila.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Korta",
  },
  openGraph: {
    title: "Korta — Agendamento para barbearias",
    description: "Seu horário na barbearia em poucos toques. Sem ligação, sem fila.",
    url: "https://korta.vercel.app",
    siteName: "Korta",
    images: [
      {
        url: "/og-image.png",
        width: 1500,
        height: 500,
        alt: "Korta — Agendamento para barbearias",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Korta — Agendamento para barbearias",
    description: "Seu horário na barbearia em poucos toques. Sem ligação, sem fila.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
