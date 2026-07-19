import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hearthvale — Phaser Engine (Dev)",
  description: "Standalone Phaser engine prototype with 3×3 proximity interactions.",
};

export default function PhaserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
