import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Boom Miner",
    template: "%s — Boom Miner",
  },
  description: "Boom Miner — auto-battler where heroes plant bombs to mine $BMCOIN.",
  openGraph: {
    title: "Boom Miner",
    description: "Auto-battler where heroes plant bombs to mine $BMCOIN.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@BoomMiner",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body>{children}</body>
    </html>
  );
}
