import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import { Playfair_Display, Inter } from "next/font/google";

// Bootstrap CSS for react-bootstrap Modal, Accordion, etc.
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hearthvale",
  description: "A relaxing pixel-art farming game on the Hive blockchain.",
};

export const viewport: Viewport = {
  themeColor: "#63c74d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Hint to browsers that this app prefers landscape orientation.
  // Combined with the LandscapeGate component which enforces this on mobile.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart.variable} ${playfair.variable} ${inter.variable} bg-background`}>
      <body className="min-h-screen font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
